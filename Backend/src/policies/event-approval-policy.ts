// Approval order for university events. Kept browser-safe and free of imports so the
// legacy workspace script, the tests and the database trigger all agree on one rule set:
// a college Dean decides first, only a University Admin may give the final approval,
// and nobody may skip the Dean stage.

export type ApprovalUser = {
  role: string;
  college: string | null;
  dept: string | null;
};

export type ApprovalEvent = {
  college?: string | null;
  dept?: string | null;
  status?: string;
};

export type ApprovalDecision = "DAPPROVED" | "APPROVED" | "RETURNED" | "REJECTED";

/** Statuses an event row may hold, in workflow order. */
export const EVENT_STATUSES = [
  "PENDING",
  "DAPPROVED",
  "RETURNED",
  "REJECTED",
  "APPROVED",
  "SUBMITTED",
  "CRETURNED",
  "COMPLETED",
] as const;

/** A Super Admin, or any account with no college/department scope (e.g. University Admin). */
export const isGlobalAdmin = (u: ApprovalUser) =>
  u.role === "su" || (!!u.role && u.role !== "NONE" && !u.college && !u.dept);

/** A Dean / Principal attached to the college that owns the event. */
export const isCollegeDean = (u: ApprovalUser, e: ApprovalEvent) =>
  u.role === "dean" && !!e.college && u.college === e.college;

/** Which approval stage a status is waiting at, or null when no approval decision applies. */
export const approvalStage = (status?: string): "dean" | "university" | null =>
  status === "PENDING" ? "dean" : status === "DAPPROVED" ? "university" : null;

/** Who may take which decision, given the stage the event is currently waiting at. */
export const canDecideEvent = (u: ApprovalUser, e: ApprovalEvent, decision: ApprovalDecision) => {
  const stage = approvalStage(e.status);
  if (!stage) return false;
  if (decision === "APPROVED") return stage === "university" && isGlobalAdmin(u);
  const deanStage = stage === "dean";
  if (decision === "DAPPROVED") return deanStage && (isCollegeDean(u, e) || u.role === "su");
  if (decision === "RETURNED" || decision === "REJECTED")
    return deanStage ? isCollegeDean(u, e) || u.role === "su" : isGlobalAdmin(u);
  return false;
};

/** Verification after the completion report: college-level staff of that college or the university, never the department itself. */
export const canVerifyEvent = (u: ApprovalUser, e: ApprovalEvent) =>
  e.status === "SUBMITTED" &&
  (isGlobalAdmin(u) || (!!e.college && u.college === e.college && !u.dept && u.role !== "dept"));
