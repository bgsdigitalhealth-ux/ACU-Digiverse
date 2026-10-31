import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACCOUNT_EMAIL_SENDER, canManageAccountEmails, validateAccountEmailRedirect } from "./account-email-policy";
import { departmentHasUserSlot, type DepartmentAccount } from "./department-user-policy";

const roleKey = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const idStr = z.string().trim().max(64).nullable().optional();

const syncSchema = z.object({
  redirectTo: z.string().url(),
  creates: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(255),
        role: roleKey,
        college: idStr,
        dept: idStr,
        deptName: z.string().trim().max(120).optional().nullable(),
      }),
    )
    .max(50),
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(120),
        role: roleKey,
        college: idStr,
        dept: idStr,
        deptName: z.string().trim().max(120).optional().nullable(),
      }),
    )
    .max(200),
  deletes: z.array(z.string().uuid()).max(50),
});

type Caller = {
  id: string;
  role: string;
  college: string | null;
  dept: string | null;
  global: boolean;
  perms: string[];
};

/**
 * Create, change and remove staff accounts. Every change is checked against the
 * caller's own role and college before anything is written.
 */
export const syncUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => syncSchema.parse(d))
  .handler(async ({ data, context }) => {
    const redirectTo = validateAccountEmailRedirect(data.redirectTo);
    const { supabase, userId } = context;
    const [{ data: prof }, { data: roles }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("college_id, dept_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("app_settings").select("data").eq("id", 1).maybeSingle(),
    ]);
    const role = roles?.[0]?.role ?? "NONE";
    const custom = ((settings?.data as Record<string, unknown> | null)?.["customRoles"] ?? {}) as Record<
      string,
      { perms?: Record<string, string[]> }
    >;
    const caller: Caller = {
      id: userId,
      role,
      college: prof?.college_id ?? null,
      dept: prof?.dept_id ?? null,
      global: role === "su" || (!["NONE", "dept", "ca", "dean"].includes(role) && !prof?.college_id && !prof?.dept_id),
      perms: custom[role]?.perms?.["users"] ?? [],
    };
    const isSU = caller.role === "su";

    const can = (action: "create" | "edit" | "delete", target: { role: string; college?: string | null }) => {
      if (isSU) return true;
      if (target.role === "su") return false;
      if (caller.global) return true;
      const allowed = caller.role === "ca" || caller.perms.includes(action === "edit" ? "create" : action);
      if (!allowed) return false;
      if (["ca", "dean"].includes(target.role)) return false;
      return !!caller.college && target.college === caller.college;
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const errors: string[] = [];
    const invitations: { name: string; email: string }[] = [];
    const notices: string[] = [];

    const resolveDepartmentAndCollege = async (college: string | null, dept: string | null, deptName?: string | null) => {
      if (!college && !dept && !deptName) return { collegeId: null, deptId: null };

      const [{ data: colleges }, { data: depts }] = await Promise.all([
        supabaseAdmin.from("app_items").select("id, data").eq("collection", "colleges"),
        supabaseAdmin.from("app_items").select("id, college_id, data").eq("collection", "depts"),
      ]);

      const allColleges = colleges || [];
      const allDepts = depts || [];

      // 1. Resolve college ID (by ID, code, or name)
      const matchedCollege = allColleges.find(
        (c) =>
          c.id === college ||
          (c.data as Record<string, unknown> | null)?.["code"]?.toString().toLowerCase() === college?.toLowerCase() ||
          (c.data as Record<string, unknown> | null)?.["name"]?.toString().toLowerCase() === college?.toLowerCase()
      );

      const targetCollegeId = matchedCollege ? matchedCollege.id : college;
      const targetCollegeCode = (matchedCollege?.data as Record<string, unknown> | null)?.["code"]?.toString();
      const targetCollegeName = (matchedCollege?.data as Record<string, unknown> | null)?.["name"]?.toString();

      const collegeMatches = (cId: string | null | undefined) => {
        if (!cId) return false;
        const low = cId.toLowerCase();
        if (targetCollegeId && targetCollegeId.toLowerCase() === low) return true;
        if (targetCollegeCode && targetCollegeCode.toLowerCase() === low) return true;
        if (targetCollegeName && targetCollegeName.toLowerCase() === low) return true;
        if (college && college.toLowerCase() === low) return true;
        return false;
      };

      // 2. Resolve department ID
      // First, exact match on id and college_id
      let matchedDept = allDepts.find((d) => d.id === dept && (!targetCollegeId || collegeMatches(d.college_id)));

      // Second, match by ID across all depts
      if (!matchedDept && dept) {
        matchedDept = allDepts.find((d) => d.id === dept);
      }

      // Third, match by department name or code
      const queryName = (deptName || dept || "").toLowerCase();
      if (!matchedDept && queryName) {
        matchedDept = allDepts.find(
          (d) =>
            (!targetCollegeId || collegeMatches(d.college_id)) &&
            ((d.data as Record<string, unknown> | null)?.["name"]?.toString().toLowerCase() === queryName ||
             (d.data as Record<string, unknown> | null)?.["code"]?.toString().toLowerCase() === queryName)
        );
      }

      // Fourth, if target college has only one department and a stale dept ID was passed
      if (!matchedDept && targetCollegeId) {
        const collegeDepts = allDepts.filter((d) => collegeMatches(d.college_id));
        if (collegeDepts.length === 1) {
          matchedDept = collegeDepts[0];
        }
      }

      if (matchedDept) {
        const isBelonging = collegeMatches(matchedDept.college_id) || collegeMatches((matchedDept.data as Record<string, unknown> | null)?.["college"]?.toString());

        if (isBelonging) {
          return {
            collegeId: matchedDept.college_id || targetCollegeId,
            deptId: matchedDept.id,
          };
        }

        // If a college was requested that conflicts with the department's actual college:
        if (targetCollegeId && matchedDept.college_id) {
          return {
            collegeId: targetCollegeId,
            deptId: matchedDept.id,
          };
        }
        return {
          collegeId: matchedDept.college_id || targetCollegeId,
          deptId: matchedDept.id,
        };
      }

      return {
        collegeId: targetCollegeId,
        deptId: dept,
      };
    };

    const validateDepartment = async (role: string, college: string | null, dept: string | null, excludeId?: string) => {
      if (role !== "dept" || (!college && !dept)) return;
      if (!college || !dept) throw new Error("Select both the college and department for this Department User.");
      let { data: department, error } = await supabaseAdmin.from("app_items").select("id, college_id").eq("collection", "depts").eq("id", dept).eq("college_id", college).maybeSingle();
      if (!department) {
        const { data: deptItem } = await supabaseAdmin.from("app_items").select("id, college_id, data").eq("collection", "depts").eq("id", dept).maybeSingle();
        if (deptItem) {
          const { data: colItem } = await supabaseAdmin.from("app_items").select("id, data").eq("collection", "colleges").eq("id", deptItem.college_id).maybeSingle();
          const colCode = (colItem?.data as Record<string, unknown> | null)?.["code"]?.toString().toLowerCase();
          const colName = (colItem?.data as Record<string, unknown> | null)?.["name"]?.toString().toLowerCase();
          if (deptItem.college_id === college || colCode === college?.toLowerCase() || colName === college?.toLowerCase()) {
            department = deptItem;
            college = deptItem.college_id;
          }
        }
      }
      if (error || !department) throw new Error("The department does not belong to the selected college.");
      const [{ data: profiles, error: profileError }, { data: departmentRoles, error: rolesError }] = await Promise.all([
        supabaseAdmin.from("profiles").select("id, college_id, dept_id").eq("college_id", college).eq("dept_id", dept),
        supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "dept"),
      ]);
      if (profileError || rolesError) throw new Error("Could not check department users.");
      const accounts: DepartmentAccount[] = (profiles || []).map(p => ({ id: p.id, college: p.college_id, dept: p.dept_id, role: departmentRoles?.some(r => r.user_id === p.id) ? "dept" : "NONE" }));
      if (!departmentHasUserSlot(accounts, college, dept, excludeId)) throw new Error("This department already has two Department Users. Reassign an existing user first.");
    };

    const keepReminderAssignee = async (college: string, dept: string, userId: string) => {
      const { data: department } = await supabaseAdmin.from("app_items").select("data").eq("collection", "depts").eq("id", dept).eq("college_id", college).maybeSingle();
      const departmentData = department?.data as Record<string, unknown> | undefined;
      if (!departmentData || departmentData['reminderUserId']) return;
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id").eq("college_id", college).eq("dept_id", dept);
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "dept");
      const others = (profiles || []).filter(p => p.id !== userId && roles?.some(r => r.user_id === p.id));
      // Preserve the explicitly assigned existing recipient when adding the
      // second account; otherwise the first new account owns daily reminders.
      const reminderUserId = others.length === 1 ? others[0]?.id : userId;
      if (!reminderUserId) return;
      await supabaseAdmin.from("app_items").update({ data: { ...departmentData, reminderUserId } }).eq("collection", "depts").eq("id", dept).eq("college_id", college);
    };

    const loadTarget = async (id: string) => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabaseAdmin.from("profiles").select("name, email, college_id, dept_id").eq("id", id).maybeSingle(),
        supabaseAdmin.from("user_roles").select("role").eq("user_id", id),
      ]);
      return p ? { college: p.college_id, dept: p.dept_id, name: p.name, email: p.email, role: r?.[0]?.role ?? "NONE" } : null;
    };

    for (const c of data.creates) {
      let college = c.role === "su" ? null : (c.college || null);
      let dept = c.dept || null;
      if (c.role === "dept") {
        const resolved = await resolveDepartmentAndCollege(college, dept, c.deptName);
        college = resolved.collegeId;
        dept = resolved.deptId;
      }
      if (!can("create", { role: c.role, college })) {
        errors.push(`Not allowed to create ${c.email}.`);
        continue;
      }
      try { await validateDepartment(c.role, college, dept) } catch (error) { errors.push(`${c.email}: ${(error as Error).message}`); continue }
      // Persist the assignment BEFORE sending the invitation, so its template
      // and the user's first visit both see the correct role and department.
      const { data: inv, error } = await supabaseAdmin.auth.admin.createUser({ email: c.email.toLowerCase(), email_confirm: false, user_metadata: { name: c.name } });
      let userId = inv?.user?.id;
      let isExistingAuthUser = false;
      if (error || !userId) {
        if (error?.message && (error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("registered") || error.message.toLowerCase().includes("exists"))) {
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const existing = userList?.users?.find((u) => u.email?.toLowerCase() === c.email.toLowerCase());
          if (existing) {
            userId = existing.id;
            isExistingAuthUser = true;
          }
        }
        if (!userId) {
          errors.push(`${c.email}: ${error?.message ?? "could not create"}`);
          continue;
        }
      }
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: userId,
        name: c.name,
        email: c.email.toLowerCase(),
        college_id: college,
        dept_id: c.role === "su" ? null : dept,
      });
      const { error: removeRoleError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: c.role });
      if (profileError || removeRoleError || roleError) {
        if (!isExistingAuthUser) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
        errors.push(`${c.email}: account assignment could not be saved. Please check the user's role and department before resending.`);
        continue;
      }
      if (c.role === "dept" && college && dept) await keepReminderAssignee(college, dept, userId);

      let sentCustomEmail = false;
      let confirmationUrl = redirectTo;
      try {
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
          type: "invite",
          email: c.email.toLowerCase(),
          options: { redirectTo },
        });
        const tokenHash = linkData?.properties?.hashed_token;
        if (tokenHash) {
          confirmationUrl = `${redirectTo}?token_hash=${tokenHash}&type=invite`;
        }
        if (process.env.RESEND_API_KEY) {
          const { sendTemplateEmail } = await import("./email-templates/send-email");
          const dMatch = deptsList.find((d: any) => d.id === dept);
          const colMatch = (colleges || []).find((col: any) => col.id === college);
          const emailRes = await sendTemplateEmail("invite", c.email.toLowerCase(), {
            templateData: {
              siteName: "ACU DigiVerse",
              siteUrl: redirectTo.replace(/\/reset-password.*$/, ""),
              confirmationUrl,
              name: c.name,
              role: c.role === "dept" ? "Department User" : c.role,
              college: (colMatch?.data as any)?.name || college || undefined,
              department: dMatch?.name || (dMatch?.data as any)?.name || c.deptName || dept || undefined,
            },
          });
          if (emailRes.sent) sentCustomEmail = true;
        }
      } catch (linkErr) {
        console.warn("[Invitation Link Generation]", linkErr);
      }

      if (!sentCustomEmail) {
        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(c.email, { redirectTo, data: { name: c.name } });
        if (inviteError) { errors.push(`${c.email}: account saved, but its invitation could not be sent: ${inviteError.message}. Use Resend invite.`); continue }
      }
      invitations.push({ name: c.name, email: c.email.toLowerCase() });
    }

    for (const u of data.updates) {
      const t = await loadTarget(u.id);
      if (!t) continue;
      let college = u.role === "su" ? null : (u.college || null);
      let dept = u.dept || null;
      if (u.role === "dept") {
        const resolved = await resolveDepartmentAndCollege(college, dept, u.deptName);
        college = resolved.collegeId;
        dept = resolved.deptId;
      }
      if (!can("edit", t) || !can("edit", { role: u.role, college })) {
        errors.push(`Not allowed to change ${u.name}.`);
        continue;
      }
      if (u.id === caller.id && isSU && u.role !== "su") {
        errors.push("You cannot remove your own Super Admin role.");
        continue;
      }
      try { await validateDepartment(u.role, college, dept, u.id) } catch (error) { errors.push(`${u.name}: ${(error as Error).message}`); continue }
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ name: u.name, college_id: college, dept_id: u.role === "su" ? null : dept })
        .eq("id", u.id);
      if (updateError) { errors.push(`${u.name}: assignment could not be saved.`); continue }
      const { error: removeError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", u.id);
      const { error: roleError } = removeError ? { error: removeError } : await supabaseAdmin.from("user_roles").insert({ user_id: u.id, role: u.role });
      if (roleError) {
        await supabaseAdmin.from("profiles").update({ name: t.name, college_id: t.college, dept_id: t.dept }).eq("id", u.id);
        if (!removeError) await supabaseAdmin.from("user_roles").insert({ user_id: u.id, role: t.role });
        errors.push(`${u.name}: role update failed; previous assignment restored.`); continue;
      }
      if (u.role === "dept" && college && dept && (t.role !== u.role || t.college !== college || t.dept !== dept)) {
        await keepReminderAssignee(college, dept, u.id);
        try {
          const { data: account } = await supabaseAdmin.auth.admin.getUserById(u.id);
          if (!account.user?.email) throw new Error("Account email unavailable.");
          if (!account.user.last_sign_in_at) {
            const { error: emailError } = account.user.email_confirmed_at
              ? await supabaseAdmin.auth.resetPasswordForEmail(account.user.email, { redirectTo })
              : await supabaseAdmin.auth.admin.inviteUserByEmail(account.user.email, { redirectTo });
            if (emailError) throw emailError;
          } else {
            const { accountAssignment } = await import("./account-assignment.server");
            const { sendTemplateEmail } = await import("./email-templates/send-email");
            const sent = await sendTemplateEmail("department-assigned", account.user.email, {
              idempotencyKey: `department-assigned:${u.id}:${college}:${u.dept}:${account.user.updated_at || "current"}`,
              templateData: await accountAssignment(supabaseAdmin, account.user.email),
            });
            if (!sent.sent) notices.push(`${u.name}: assignment saved; account notification was suppressed.`);
          }
        } catch { notices.push(`${u.name}: assignment saved, but the access email could not be sent. Use Resend invite or password reset.`) }
      }
    }

    for (const id of data.deletes) {
      if (id === caller.id) {
        errors.push("You cannot delete your own account.");
        continue;
      }
      const t = await loadTarget(id);
      if (!t) continue;
      if (!can("delete", t)) {
        errors.push("Not allowed to delete that user.");
        continue;
      }
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (deleteError) { errors.push("Account could not be deleted; its assignment has been retained."); continue }
      // Explicit cleanup also handles older profiles without an Auth cascade.
      await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
      await supabaseAdmin.from("profiles").delete().eq("id", id);
    }

    return { errors, invitations, notices };
  });

/**
 * One-time creation of the first Super Admin. Refuses to run once any
 * Super Admin exists, so it can never be used to take over the system.
 */
export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(255),
        redirectTo: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "su");
    if ((count ?? 0) > 0) throw new Error("A Super Admin already exists.");
    const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
      data: { name: data.name },
    });
    if (error || !inv.user) throw new Error(error?.message ?? "Could not invite");
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: inv.user.id, name: data.name, email: data.email.toLowerCase(), college_id: null, dept_id: null });
    await supabaseAdmin.from("user_roles").insert({ user_id: inv.user.id, role: "su" });
    return { ok: true };
  });

/** Activation status for every account the caller is allowed to see. */
export const getUserStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: visible } = await context.supabase.from("profiles").select("id");
    const ids = new Set((visible || []).map((p) => p.id));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: Record<string, { active: boolean; invitedAt: string | null; createdAt: string | null; lastLogin: string | null; disabled: boolean }> = {};
    for (let page = 1; page < 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      for (const u of data.users) {
        if (!ids.has(u.id)) continue;
        const banned = (u as { banned_until?: string | null }).banned_until;
        out[u.id] = {
          active: !!u.last_sign_in_at,
          invitedAt: u.invited_at ?? u.created_at ?? null,
          createdAt: u.created_at ?? null,
          lastLogin: u.last_sign_in_at ?? null,
          disabled: !!banned && new Date(banned).getTime() > Date.now(),
        };
      }
      if (data.users.length < 1000) break;
    }
    return out;
  });

/** Re-send the activation email to a user who has not activated yet. */
export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), redirectTo: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const redirectTo = validateAccountEmailRedirect(data.redirectTo);
    const { supabase, userId } = context;
    const [{ data: target }, { data: myRoles }, { data: myProf }] = await Promise.all([
      supabase.from("profiles").select("id, email, college_id").eq("id", data.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("college_id, dept_id").eq("id", userId).maybeSingle(),
    ]);
    if (!target) throw new Error("User not found.");
    const role = myRoles?.[0]?.role ?? "NONE";
    const global = role === "su" || (!['NONE', 'ca', 'dean', 'dept'].includes(role) && !myProf?.college_id && !myProf?.dept_id);
    if (!global && !(role === "ca" && myProf?.college_id && target.college_id === myProf.college_id))
      throw new Error("Not allowed.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: targetRoles } = await supabase.from("user_roles").select("role").eq("user_id", data.id);
    if (targetRoles?.some((r) => r.role === "su") && role !== "su") throw new Error("Only a Super Admin can manage this account.");
    const { data: au, error: accountError } = await supabaseAdmin.auth.admin.getUserById(data.id);
    if (accountError || !au.user) throw new Error("User not found.");
    if (au?.user?.last_sign_in_at) throw new Error("This account is already active.");
    const email = au?.user?.email || target.email;
    let sentCustomEmail = false;
    let confirmationUrl = redirectTo;
    try {
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: au.user.email_confirmed_at ? "recovery" : "invite",
        email,
        options: { redirectTo },
      });
      const tokenHash = linkData?.properties?.hashed_token;
      if (tokenHash) {
        confirmationUrl = `${redirectTo}?token_hash=${tokenHash}&type=${au.user.email_confirmed_at ? "recovery" : "invite"}`;
      }
      if (process.env.RESEND_API_KEY) {
        const { sendTemplateEmail } = await import("./email-templates/send-email");
        const emailRes = await sendTemplateEmail("invite", email, {
          templateData: {
            siteName: "ACU DigiVerse",
            siteUrl: redirectTo.replace(/\/reset-password.*$/, ""),
            confirmationUrl,
            name: target.name || "Colleague",
            role: "Staff",
          },
        });
        if (emailRes.sent) sentCustomEmail = true;
      }
    } catch (linkErr) {
      console.warn("[Resend Invite Link Generation]", linkErr);
    }

    if (!sentCustomEmail) {
      const { error } = au.user.email_confirmed_at
        ? await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo })
        : await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (error) throw new Error(error.message);
    }
    return { ok: true, email };
  });

/** Email-management listing is available only to the real authenticated Super Admin. */
export const getAccountEmailUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (roleError || !roles?.some((r) => canManageAccountEmails(r.role))) throw new Error("Only Super Admin can manage account emails.");
    const { data: profiles, error } = await context.supabase.from("profiles").select("id, name, email, college_id, dept_id").order("name");
    if (error) throw new Error(error.message);
    const { data: allRoles } = await context.supabase.from("user_roles").select("user_id, role");
    const statuses = await getUserStatuses();
    return { sender: ACCOUNT_EMAIL_SENDER, users: (profiles || []).map((p) => ({
      id: p.id, name: p.name, email: p.email, role: allRoles?.find((r) => r.user_id === p.id)?.role ?? "NONE",
      college: p.college_id, dept: p.dept_id, status: statuses[p.id]?.disabled ? "disabled" : statuses[p.id]?.active ? "active" : statuses[p.id] ? "pending" : "unknown",
      lastLogin: statuses[p.id]?.lastLogin ?? null,
    })) };
  });

/** Send an existing account a recovery link without viewing or changing its password. */
export const sendAccountPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), redirectTo: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const redirectTo = validateAccountEmailRedirect(data.redirectTo);
    const { data: roles, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (roleError || !roles?.some((r) => canManageAccountEmails(r.role))) throw new Error("Only Super Admin can manage account emails.");
    const { data: target, error } = await context.supabase.from("profiles").select("email").eq("id", data.id).maybeSingle();
    if (error || !target?.email) throw new Error("User not found.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: sendError } = await supabaseAdmin.auth.resetPasswordForEmail(target.email, { redirectTo });
    if (sendError) throw new Error(sendError.message);
    return { ok: true };
  });

/** Disable or re-enable an account. Global admins only; Super Admin accounts need a Super Admin. */
export const setUserDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), disabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id === userId) throw new Error("You cannot disable your own account.");
    const [{ data: myRoles }, { data: myProf }, { data: targetRoles }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("college_id, dept_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", data.id),
    ]);
    const role = myRoles?.[0]?.role ?? "NONE";
    const global = role === "su" || (!["NONE", "ca", "dean", "dept"].includes(role) && !myProf?.college_id && !myProf?.dept_id);
    if (!global) throw new Error("Not allowed.");
    if (targetRoles?.some((r) => r.role === "su") && role !== "su") throw new Error("Only a Super Admin can change a Super Admin account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: data.disabled ? "876000h" : "none" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Permanently delete an event submission and its report. Super Admin only. */
export const deleteSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().trim().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!roles?.some((r) => r.role === "su")) throw new Error("Only a Super Admin can delete submissions.");
    const { data: ev } = await supabase.from("app_items").select("data").eq("collection", "events").eq("id", data.id).maybeSingle();
    if (!ev) throw new Error("Submission not found.");
    const recId = (ev.data as Record<string, unknown>)?.["recId"];
    if (typeof recId === "string" && recId) await supabase.from("app_items").delete().eq("collection", "recs").eq("id", recId);
    const { error } = await supabase.from("app_items").delete().eq("collection", "events").eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, recId: typeof recId === "string" ? recId : null };
  });

