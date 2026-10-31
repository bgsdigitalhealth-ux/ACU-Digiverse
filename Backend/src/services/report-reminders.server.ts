import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { configuredHeadings, localReportDate, missingReportTasks, objectData, reminderIdempotencyKey, type ReportCycle, type REMINDER_START_DATE } from "./report-reminder-policy";
import { sendTemplateEmail } from "./email-templates/send-email";

export type ReminderTarget = { collegeId: string; departmentId: string; startDate: typeof REMINDER_START_DATE };

/** One department task callback, one verified recipient, at most one email. */
export async function sendDepartmentReportReminder(admin: SupabaseClient<Database>, target: ReminderTarget, now = new Date()) {
  const [{ data: department, error: departmentError }, { data: college, error: collegeError }, { data: profiles, error: profileError }, { data: settings, error: settingsError }] = await Promise.all([
    admin.from("app_items").select("data, college_id").eq("collection", "depts").eq("id", target.departmentId).eq("college_id", target.collegeId).maybeSingle(),
    admin.from("app_items").select("id").eq("collection", "colleges").eq("id", target.collegeId).maybeSingle(),
    admin.from("profiles").select("id, name, email").eq("dept_id", target.departmentId).eq("college_id", target.collegeId).limit(2),
    admin.from("app_settings").select("data, event_workflow_enabled").eq("id", 1).maybeSingle(),
  ]);
  if (departmentError || collegeError || profileError || settingsError) throw new Error("Could not verify report assignment.");
  if (!department || !college) return { outcome: "department_unavailable" };
  if (objectData(department.data)['college'] !== target.collegeId) return { outcome: "department_unavailable" };
  if (!profiles?.length) return { outcome: "unassigned" };
  // Two accounts may share reporting access, but this department's schedule
  // still targets one explicit recipient, never a list of email addresses.
  const designated = objectData(department.data)['reminderUserId'];
  if (profiles.length !== 1 && typeof designated !== "string") return { outcome: "ambiguous_assignment" };
  const profile = typeof designated === "string" ? profiles.find(p => p.id === designated) : profiles[0];
  if (!profile) return { outcome: "unassigned" };
  const [{ data: roles, error: roleError }, { data: account, error: accountError }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", profile.id),
    admin.auth.admin.getUserById(profile.id),
  ]);
  if (roleError || accountError) throw new Error("Could not verify assigned account.");
  if (roles?.length !== 1 || roles[0]?.role !== "dept") return { outcome: "not_department_user" };
  const user = account.user;
  const banned = user && "banned_until" in user && typeof user.banned_until === "string" ? Date.parse(user.banned_until) : 0;
  if (!user?.email_confirmed_at || !user.last_sign_in_at || !user.email || banned > now.getTime()) return { outcome: "account_inactive" };
  if (user.email.toLowerCase() !== profile.email.toLowerCase()) return { outcome: "account_mismatch" };
  if (!settings) throw new Error("Reporting settings unavailable.");
  const config = objectData(settings.data);
  const cycle = config['reportCycle'] ?? "monthly";
  if (!["weekly", "monthly", "yearly"].includes(String(cycle))) throw new Error("Unknown reporting cycle.");
  const headings = configuredHeadings(config['headings']);
  if (!headings.length) throw new Error("Report headings unavailable.");
  const today = localReportDate(now);
  if (today < target.startDate) return { outcome: "not_started" };
  const { data: items, error, count } = await admin.from("app_items")
    .select("collection, id, college_id, dept_id, data", { count: "exact" })
    .eq("college_id", target.collegeId).eq("dept_id", target.departmentId)
    .in("collection", ["recs", "zeros", "events"]).limit(10000);
  if (error || !items || (count ?? 0) > items.length) throw new Error("Could not read all scoped report submissions.");
  const tasks = missingReportTasks({ ...target, today, cycle: cycle as ReportCycle, headings, items, workflowEnabled: settings.event_workflow_enabled === true });
  if (!tasks.periods.length && !tasks.events.length) return { outcome: "complete" };
  const result = await sendTemplateEmail("report-reminder", user.email, {
    idempotencyKey: reminderIdempotencyKey(target.departmentId, profile.id, today),
    templateData: { name: profile.name, department: objectData(department.data)['name'], periods: tasks.periods, events: tasks.events },
  });
  return { outcome: result.sent ? "sent" : "recipient_suppressed" };
}