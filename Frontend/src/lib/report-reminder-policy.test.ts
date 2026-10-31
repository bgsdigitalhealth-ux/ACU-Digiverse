import { describe, expect, it } from "vitest";
import { localReportDate, missingReportTasks, reminderIdempotencyKey, REMINDER_SCHEDULE, reportPeriod, type ReportItem } from "./report-reminder-policy";

const base = { collegeId: "college-a", departmentId: "dept-a", startDate: "2026-10-27", today: "2026-10-27", cycle: "weekly" as const, headings: [{ id: "pub", name: "Research Publications" }, { id: "evo", name: "Events Organized" }], items: [] as ReportItem[], workflowEnabled: false };
const row = (collection: string, data: Record<string, unknown>): ReportItem => ({ collection, id: "record-a", college_id: "college-a", dept_id: "dept-a", data: { dept: "dept-a", month: "2026-W44", ...data } });

describe("Daily pending reports", () => {
  it("runs once daily, at 09:17 India time", () => expect(REMINDER_SCHEDULE).toBe("47 3 * * *"));
  it("includes both normal weekly heads and Events Organized", () => expect(missingReportTasks(base).periods).toEqual([{ period: "2026-W44", headings: ["Research Publications", "Events Organized"] }]));
  it("stops a heading after its saved upload", () => expect(missingReportTasks({ ...base, items: [row("recs", { head: "evo" })] }).periods[0]?.headings).toEqual(["Research Publications"]));
  it("stops a zero-activity heading", () => expect(missingReportTasks({ ...base, items: [row("zeros", { head: "evo" })] }).periods[0]?.headings).toEqual(["Research Publications"]));
  it("sends nothing once both reports are submitted", () => expect(missingReportTasks({ ...base, items: [row("recs", { head: "evo" }), row("zeros", { head: "pub" })] })).toEqual({ periods: [], events: [] }));
  it("cannot treat another department's uploads as completion", () => expect(missingReportTasks({ ...base, items: [{ ...row("recs", { head: "evo" }), dept_id: "dept-b" }] }).periods[0]?.headings).toHaveLength(2));
  it("cannot treat another college's uploads as completion", () => expect(missingReportTasks({ ...base, items: [{ ...row("recs", { head: "evo" }), college_id: "college-b" }] }).periods[0]?.headings).toHaveLength(2));
  it("continues missing reports across the next week instead of forgetting them", () => expect(missingReportTasks({ ...base, today: "2026-11-01" }).periods.map(p => p.period)).toEqual(["2026-W44", "2026-W45"]));
  it("does not invent historic missing weeks before activation", () => expect(missingReportTasks(base).periods.map(p => p.period)).toEqual(["2026-W44"]));
  it("uses saved legacy week numbers", () => expect(reportPeriod("2026-10-27", "weekly")).toBe("2026-W44"));
  it("respects the actual monthly reporting setting", () => expect(missingReportTasks({ ...base, cycle: "monthly" }).periods[0]?.period).toBe("2026-10"));
  it("deduplicates retry sends on the same day", () => {
    expect(reminderIdempotencyKey("dept-a", "user-a", "2026-10-27")).toBe("report-reminder:dept-a:user-a:2026-10-27");
    expect(reminderIdempotencyKey("dept-a", "user-a", "2026-10-28")).not.toBe(reminderIdempotencyKey("dept-a", "user-a", "2026-10-27"));
  });
  it("uses the recipient's India calendar day", () => expect(localReportDate(new Date("2026-10-27T20:00:00Z"))).toBe("2026-10-28"));
  it("does not remind about hidden approval-workflow events", () => expect(missingReportTasks({ ...base, items: [row("events", { title: "Event", status: "APPROVED", date: "2026-10-26" })] }).events).toEqual([]));
  it("reminds for a past approved event needing its report", () => expect(missingReportTasks({ ...base, workflowEnabled: true, items: [row("events", { title: "Event", status: "APPROVED", date: "2026-10-26" })] }).events).toEqual([{ id: "record-a", title: "Event", date: "2026-10-26" }]));
  it.each(["SUBMITTED", "COMPLETED"])("stops event reminders on %s, not on later reviewer approval", status => expect(missingReportTasks({ ...base, workflowEnabled: true, items: [row("events", { status, date: "2026-10-26" })] }).events).toEqual([]));
  it("does not request completion uploads for a future event", () => expect(missingReportTasks({ ...base, workflowEnabled: true, items: [row("events", { status: "APPROVED", date: "2026-10-28" })] }).events).toEqual([]));
});