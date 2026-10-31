export const REMINDER_START_DATE = "2026-10-27";
export const REMINDER_SCHEDULE = "47 3 * * *"; // 09:17 Asia/Kolkata, once daily.
export const REPORT_TIME_ZONE = "Asia/Kolkata";

export type ReportCycle = "weekly" | "monthly" | "yearly";
export type ReportHeading = { id: string; name: string };
export type ReportItem = {
  collection: string;
  id: string;
  college_id: string | null;
  dept_id: string | null;
  data: unknown;
};
export type MissingPeriod = { period: string; headings: string[] };
export type MissingEvent = { id: string; title: string; date: string };

export function objectData(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function localReportDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Keep the legacy Jan-1/week convention; using ISO weeks would mismatch saved reports. */
export function reportPeriod(day: string, cycle: ReportCycle): string {
  if (cycle === "yearly") return day.slice(0, 4);
  if (cycle === "monthly") return day.slice(0, 7);
  const date = new Date(`${day}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function configuredHeadings(value: unknown): ReportHeading[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "string" ? [{ id: entry[0], name: entry[1] }] : []);
}

export function missingReportTasks(input: {
  collegeId: string; departmentId: string; startDate: string; today: string;
  cycle: ReportCycle; headings: ReportHeading[]; items: ReportItem[]; workflowEnabled: boolean;
}): { periods: MissingPeriod[]; events: MissingEvent[] } {
  const scoped = input.items.filter(row => row.college_id === input.collegeId && row.dept_id === input.departmentId);
  const completed = new Set(scoped.filter(row => ["recs", "zeros"].includes(row.collection)).flatMap(row => {
    const data = objectData(row.data);
    // Hidden workflow records are not evidence of ordinary reporting completion.
    if (data['evId'] && !input.workflowEnabled) return [];
    return data['dept'] === input.departmentId && typeof data['month'] === "string" && typeof data['head'] === "string" ? [`${data['month']}|${data['head']}`] : [];
  }));
  const periods = new Set<string>();
  const end = new Date(`${input.today}T00:00:00Z`).getTime();
  for (let day = new Date(`${input.startDate}T00:00:00Z`).getTime(); day <= end; day += 86400000) {
    periods.add(reportPeriod(new Date(day).toISOString().slice(0, 10), input.cycle));
  }
  const missing = [...periods].flatMap(period => {
    const headings = input.headings.filter(head => !completed.has(`${period}|${head.id}`)).map(head => head.name);
    return headings.length ? [{ period, headings }] : [];
  });
  const events = input.workflowEnabled ? scoped.filter(row => row.collection === "events").flatMap(row => {
    const data = objectData(row.data);
    const date = typeof data['dateTo'] === "string" && data['dateTo'] ? data['dateTo'] : data['date'];
    // A submission awaiting review is already uploaded. Only approval/correction needs an upload.
    if (data['dept'] !== input.departmentId || !["APPROVED", "CRETURNED"].includes(String(data['status'])) || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= input.today) return [];
    return [{ id: row.id, title: typeof data['title'] === "string" ? data['title'] : "Events Organized report", date }];
  }) : [];
  return { periods: missing, events };
}

export function reminderIdempotencyKey(departmentId: string, userId: string, day: string): string {
  return `report-reminder:${departmentId}:${userId}:${day}`;
}