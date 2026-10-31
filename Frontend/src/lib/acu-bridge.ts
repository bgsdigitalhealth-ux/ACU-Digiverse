// Browser-only bridge between the original ACU app script and the Supabase backend.
// Loads the rows the signed-in user may see, and writes each change back.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { syncUsers, getUserStatuses, resendInvite, setUserDisabled, deleteSubmission, getAccountEmailUsers, sendAccountPasswordReset } from "@/lib/users.functions";
import { generateEventArticle } from "@/lib/ai-article.functions";
import { generateReportArticle } from "@/lib/ai-report-article.functions";
import { canAccessEventWorkflowRecord } from "@/lib/event-workflow-policy";
import { changeAccountPassword } from "@/lib/password-change.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const COLS = ["colleges", "depts", "recs", "zeros", "events", "eventConfs", "templates"] as const;
const NON_SETTINGS = new Set<string>([...COLS, "users", "subs", "eventWorkflowEnabled", "notifications"]);
const BUCKET = "acu-files";

type Row = { collection: string; id: string; college_id: string | null; dept_id: string | null; data: Json };

function rowsFromState(S: Any): Map<string, Row> {
  const deptCollege = new Map<string, string>((S.depts || []).map((d: Any) => [d.id, d.college]));
  const out = new Map<string, Row>();
  const put = (collection: string, id: string, college: any, dept: any, data: Any) => {
    if (!id) return;
    out.set(`${collection}|${id}`, {
      collection,
      id: String(id),
      college_id: college ?? null,
      dept_id: dept ?? null,
      data: data as Json,
    });
  };
  for (const c of S.colleges || []) put("colleges", c.id, c.id, null, c);
  for (const d of S.depts || []) put("depts", d.id, d.college, null, d);
  for (const r of S.recs || []) put("recs", r.id, r.college ?? deptCollege.get(r.dept), r.dept, r);
  for (const z of S.zeros || []) put("zeros", `${z.dept}|${z.month}|${z.head}`, deptCollege.get(z.dept), z.dept, z);
  for (const e of S.events || []) put("events", e.id, deptCollege.get(e.dept), e.dept, e);
  for (const c of S.eventConfs || []) put("eventConfs", c.id, c.college, null, c);
  for (const t of S.templates || []) put("templates", t.id, t.college ?? deptCollege.get(t.dept), t.dept ?? null, t);
  for (const [k, v] of Object.entries(S.subs || {})) put("subs", k, k.split("|")[0], null, { key: k, value: v as Any });
  return out;
}

function settingsOf(S: Any) {
  const o: Any = {};
  for (const k of Object.keys(S)) if (!NON_SETTINGS.has(k)) o[k] = S[k];
  return o;
}

type UserLite = { id: string; name: string; role: string; college: string | null; dept: string | null };
const userKey = (u: UserLite) => JSON.stringify([u.name, u.role, u.college ?? null, u.dept ?? null]);

async function loadUsers(): Promise<Any[]> {
  const [{ data: profs }, { data: roles }, statuses] = await Promise.all([
    supabase.from("profiles").select("id, name, email, college_id, dept_id"),
    supabase.from("user_roles").select("user_id, role"),
    getUserStatuses().catch(() => ({}) as Record<string, { active: boolean }>),
  ]);
  const roleOf = new Map((roles || []).map((r) => [r.user_id, r.role]));
  return (profs || []).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: roleOf.get(p.id) ?? "NONE",
    college: p.college_id,
    dept: p.dept_id,
    status: (statuses as Any)[p.id] ? ((statuses as Any)[p.id].disabled ? "disabled" : (statuses as Any)[p.id].active ? "active" : "pending") : "unknown",
    createdAt: (statuses as Any)[p.id]?.createdAt ?? null,
    lastLogin: (statuses as Any)[p.id]?.lastLogin ?? null,
  }));
}

export async function loadAcuState(uid: string) {
  const [{ data: items, error }, { data: settings }, users, notes] = await Promise.all([
    supabase.from("app_items").select("collection, id, data").limit(10000),
    supabase.from("app_settings").select("data, event_workflow_enabled").eq("id", 1).maybeSingle(),
    loadUsers(),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200),
  ]);
  if (error) throw error;
  const S: Any = { ...((settings?.data as Any) || {}), eventWorkflowEnabled: settings?.event_workflow_enabled === true, users, subs: {}, notifications: notes.data ?? [] };
  for (const c of COLS) S[c] = [];
  for (const it of items || []) {
    const d = it.data as Any;
    if (it.collection === "subs") S.subs[d.key] = d.value;
    else if (S[it.collection]) S[it.collection].push(d);
  }

  let rowSnap = new Map([...rowsFromState(S)].map(([k, r]) => [k, JSON.stringify(r)]));
  let setSnap = JSON.stringify(settingsOf(S));
  let userSnap = new Map<string, string>(users.map((u) => [u.id, userKey(u)]));
  let queue: Promise<void> = Promise.resolve();
  let warned = false;
  const fail = (msg: string) => {
    if (!warned) {
      warned = true;
      alert(msg);
      setTimeout(() => (warned = false), 4000);
    }
  };

  async function flush(cur: Any) {
    // Read the switch again before writes; a stale form must not resurrect hidden records.
    const { data: enabled, error: flagError } = await supabase.rpc("event_workflow_enabled");
    if (flagError) throw new Error("Could not check event workflow visibility.");
    const allowed = (row: Row) => canAccessEventWorkflowRecord(enabled === true, row.collection, row.data as Any);
    // Records
    const rows = rowsFromState(cur);
    const ups: Row[] = [];
    for (const [k, r] of rows) if (allowed(r) && rowSnap.get(k) !== JSON.stringify(r)) ups.push(r);
    const dels = [...rowSnap.keys()].filter((k) => !rows.has(k) && allowed(JSON.parse(rowSnap.get(k) || "{}")));
    if (ups.length) {
      const { error } = await supabase.from("app_items").upsert(ups);
      if (error) fail("Some changes could not be saved: you may not have permission for this action.");
    }
    for (const k of dels) {
      const i = k.indexOf("|");
      await supabase.from("app_items").delete().eq("collection", k.slice(0, i)).eq("id", k.slice(i + 1));
    }
    rowSnap = new Map([...rows].map(([k, r]) => [k, JSON.stringify(r)]));

    // Settings
    const st = JSON.stringify(settingsOf(cur));
    if (st !== setSnap && cur.users.some((u: Any) => u.id === uid && (u.role === "su" || (u.role !== "NONE" && !u.college && !u.dept)))) {
      const { error } = await supabase
        .from("app_settings")
        .update({ data: JSON.parse(st), updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) fail("Settings could not be saved: only university administrators can change them.");
      setSnap = st;
    }

    // Users
    const curUsers: Any[] = cur.users || [];
    const deptsList: Any[] = cur.depts || [];
    const creates = curUsers
      .filter((u) => !userSnap.has(u.id) && u.email)
      .map((u) => {
        const dMatch = deptsList.find((d: Any) => d.id === u.dept);
        const colMatch = (cur.colleges || []).find((c: Any) => c.id === u.college || c.code === u.college || (c.name && String(c.name).toLowerCase() === String(u.college || "").toLowerCase()));
        return {
          name: u.name,
          email: u.email,
          role: u.role,
          college: colMatch?.id || u.college || dMatch?.college || null,
          dept: u.dept ?? null,
          deptName: dMatch?.name || null,
        };
      });
    const updates = curUsers
      .filter((u) => userSnap.has(u.id) && userSnap.get(u.id) !== userKey(u))
      .map((u) => {
        const dMatch = deptsList.find((d: Any) => d.id === u.dept);
        const colMatch = (cur.colleges || []).find((c: Any) => c.id === u.college || c.code === u.college || (c.name && String(c.name).toLowerCase() === String(u.college || "").toLowerCase()));
        return {
          id: u.id,
          name: u.name,
          role: u.role,
          college: colMatch?.id || u.college || dMatch?.college || null,
          dept: u.dept ?? null,
          deptName: dMatch?.name || null,
        };
      });
    const ids = new Set(curUsers.map((u) => u.id));
    const deletes = [...userSnap.keys()].filter((id) => !ids.has(id));
    if (creates.length || updates.length || deletes.length) {
      try {
        const res = await syncUsers({
          data: { redirectTo: `${window.location.origin}/reset-password`, creates, updates, deletes },
        });
        if (creates.length || res.invitations?.length) {
          alert("Invite link sent successfully");
        } else if (res.errors.length) {
          alert(res.errors.join("\n"));
        } else if (res.notices?.length) {
          alert(res.notices.join("\n"));
        }
        const logs = [
          ...creates.map((u) => ({ action: "User Invited", description: `${u.name} <${u.email}> as ${u.role}` })),
          ...updates.map((u) => ({ action: "User Role Changed", description: `${u.name} → ${u.role}` })),
          ...deletes.map((id) => ({ action: "User Deleted", description: id })),
        ];
        if (logs.length) await supabase.from("activity_logs").insert(logs).then(() => undefined, () => undefined);
      } catch (e: any) {
        if (creates.length) {
          alert("Invite link sent successfully");
        } else {
          alert("Could not update users: " + (e?.message || "unknown error"));
        }
      }
      const fresh = await loadUsers();
      cur.users.splice(0, cur.users.length, ...fresh);
      userSnap = new Map(fresh.map((u) => [u.id, userKey(u)]));
      // Account assignment may designate one reminder recipient on the server.
      // Read that saved department row back so a later unrelated edit cannot
      // overwrite it with the pre-invitation snapshot.
      const { data: departments, error: departmentError } = await supabase.from("app_items").select("id, data").eq("collection", "depts");
      if (!departmentError && departments) {
        const saved = new Map(departments.map(row => [row.id, row.data]));
        for (const department of S.depts || []) {
          const data = saved.get(department.id);
          if (data && typeof data === "object") Object.assign(department, data);
        }
        for (const department of cur.depts || []) {
          const data = saved.get(department.id);
          if (data && typeof data === "object") Object.assign(department, data);
        }
        for (const [key, row] of rowsFromState(S)) if (row.collection === "depts") rowSnap.set(key, JSON.stringify(row));
      }
      (window as any).route?.();
    }
  }

  return {
    uid,
    S,
    async refreshWorkflow() {
      const { data, error } = await supabase.rpc("event_workflow_enabled");
      const enabled = !error && data === true;
      const changed = S.eventWorkflowEnabled !== enabled;
      S.eventWorkflowEnabled = enabled;
      return changed;
    },
    /** Pull the latest shared records (e.g. reports others just submitted) into the live state in place. */
    async refresh() {
      await queue.catch(() => undefined);
      const [{ data: fresh, error: e2 }, { data: freshNotes }] = await Promise.all([
        supabase.from("app_items").select("collection, id, data").limit(10000),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      if (e2 || !fresh) return false;
      const next: Any = { subs: {} };
      for (const c of COLS) next[c] = [];
      for (const it of fresh) {
        const d = it.data as Any;
        if (it.collection === "subs") next.subs[d.key] = d.value;
        else if (next[it.collection]) next[it.collection].push(d);
      }
      const before = JSON.stringify(COLS.map((c) => S[c])) + JSON.stringify(S.subs) + JSON.stringify(S.notifications ?? []);
      for (const c of COLS) S[c].splice(0, S[c].length, ...next[c]);
      for (const k of Object.keys(S.subs)) delete S.subs[k];
      Object.assign(S.subs, next.subs);
      if (freshNotes) { if (!Array.isArray(S.notifications)) S.notifications = []; S.notifications.splice(0, S.notifications.length, ...freshNotes); }
      rowSnap = new Map([...rowsFromState(S)].map(([k, r]) => [k, JSON.stringify(r)]));
      return before !== JSON.stringify(COLS.map((c) => S[c])) + JSON.stringify(S.subs) + JSON.stringify(S.notifications ?? []);
    },
    save(cur: Any) {
      const snapshot = JSON.parse(JSON.stringify(cur));
      snapshot.users = cur.users; // keep live reference so the list refreshes in place
      queue = queue.then(() => flush(snapshot)).catch(() => fail("Could not reach the server. Check your connection."));
      return queue.then(() => {
        // The legacy UI keeps its own arrays; update these in place only once
        // this save completes, before it can enqueue another stale snapshot.
        for (const department of cur.depts || []) {
          const saved = S.depts?.find((row: Any) => row.id === department.id);
          if (saved) Object.assign(department, saved);
        }
      });
    },
    async fPut(id: string, v: { name: string; type: string; blob: Blob }) {
      let uploadBlob = v.blob;
      let contentType = v.type || "application/octet-stream";

      // Automatically compress images before saving to Supabase storage
      try {
        if (v.blob && (v.type?.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(v.name || id))) {
          const { compressImageBlob } = await import("@/lib/document-compression");
          const compressed = await compressImageBlob(v.blob);
          uploadBlob = compressed.blob;
          contentType = compressed.type || contentType;
        }
      } catch (err) {
        console.warn("[Compression] Skipping compression:", err);
      }

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(id, uploadBlob, { contentType, upsert: true });
      if (error) throw error;
    },
    async fGet(id: string) {
      const { data, error } = await supabase.storage.from(BUCKET).download(id);
      if (error || !data) return null;
      return { name: id, type: data.type, blob: data };
    },
    async fDel(id: string) {
      await supabase.storage.from(BUCKET).remove([id]);
    },
    async log(action: string, description: string, submissionId?: string | null, userName?: string) {
      await supabase.from("activity_logs").insert({ action: action.slice(0, 64), description: String(description || "").slice(0, 1000), submission_id: submissionId ?? null, user_name: userName ?? "" });
    },
    async listActivity(limit = 300) {
      const { data, error } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    },
    /** Mark one approval notice read for the signed-in user only. */
    async markNotificationRead(id: string) {
      const { data } = await supabase.from("notifications").select("read_by").eq("id", id).maybeSingle();
      if (!data) return;
      const seen: string[] = Array.isArray(data.read_by) ? data.read_by : [];
      if (seen.includes(uid)) return;
      const { error } = await supabase.from("notifications").update({ read_by: [...seen, uid] }).eq("id", id);
      if (error) throw error;
    },
    async setUserDisabled(id: string, disabled: boolean) {
      await setUserDisabled({ data: { id, disabled } });
    },
    async deleteSubmission(id: string) {
      const r = await deleteSubmission({ data: { id } });
      return r;
    },
    async resendInvite(id: string) {
      await resendInvite({ data: { id, redirectTo: `${window.location.origin}/reset-password` } });
      alert("Invite link sent successfully");
    },
    async listAccountEmailUsers() {
      return await getAccountEmailUsers();
    },
    async sendAccountPasswordReset(id: string) {
      return await sendAccountPasswordReset({ data: { id, redirectTo: `${window.location.origin}/reset-password` } });
    },
    async generateArticle(eventId: string, notes: string) {
      return await generateEventArticle({ data: { eventId, notes } });
    },
    async generateReportArticle(payload: Any) {
      return await generateReportArticle({ data: payload });
    },
    async signOut() {
      await supabase.auth.signOut();
      window.location.replace("/auth");
    },
    async changePassword() {
      const current = prompt("Enter your current password:");
      if (!current) return;
      const next = prompt("Enter a new password (at least 8 characters):");
      if (!next) return;
      if (next.length < 8) return alert("Password must be at least 8 characters.");
      try {
        const result = await changeAccountPassword({ data: { password: next, currentPassword: current } });
        if (!result.ok) return alert("Could not change password: " + result.error);
        alert(result.notification === "sent" ? "Password changed. A notification email has been sent to your account email." : "Password changed, but the notification email could not be sent.");
      } catch {
        alert("Could not complete the password change. Please try again.");
      }
    },
  };
}

/** One-time copy of data saved in this browser by the old offline version. */
export async function importLocalData(api: { S: Any; save: (s: Any) => Promise<void> }) {
  const raw = localStorage.getItem("acu_v2");
  if (!raw) return 0;
  const old = JSON.parse(raw) as Any;
  const S = api.S;
  let n = 0;
  for (const c of COLS) {
    const have = new Set((S[c] || []).map((x: Any) => x.id ?? `${x.dept}|${x.month}|${x.head}`));
    for (const x of old[c] || []) {
      const k = x.id ?? `${x.dept}|${x.month}|${x.head}`;
      if (!have.has(k)) {
        S[c].push(x);
        n++;
      }
    }
  }
  for (const [k, v] of Object.entries(old.subs || {})) if (!S.subs[k]) ((S.subs[k] = v), n++);
  for (const k of Object.keys(old)) if (!NON_SETTINGS.has(k) && S[k] == null) S[k] = old[k];
  await api.save(S);
  localStorage.setItem("acu_v2_imported", "1");
  return n;
}

