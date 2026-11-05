// Approval order for university events and academic participation. Kept browser-safe and free of imports so the
// legacy workspace script, the tests and the database trigger all agree on one rule set:
// 1. Event Organized: Department User -> Department HOD -> Dean / Principal -> Central IQAC -> Event Conducted -> Report Submission -> Evidence Verification
// 2. Academic Participation: Department User -> Department HOD -> Dean / Principal -> Dean Research, ACU -> Central IQAC -> Participation -> Report Submission -> Evidence Verification

export type ApprovalUser = {
  role: string;
  college: string | null;
  dept: string | null;
};

export type ApprovalEvent = {
  college?: string | null;
  dept?: string | null;
  status?: string;
  isPart?: boolean;
  hodApproved?: boolean;
  deanApproved?: boolean;
  researchApproved?: boolean;
};

export type ApprovalDecision =
  | "HOD_APPROVED"
  | "DAPPROVED"
  | "RESEARCH_APPROVED"
  | "APPROVED"
  | "RETURNED"
  | "REJECTED";

/** Statuses an event row may hold, in workflow order. */
export const EVENT_STATUSES = [
  "PENDING",
  "HOD_APPROVED",
  "DAPPROVED",
  "RESEARCH_APPROVED",
  "RETURNED",
  "REJECTED",
  "APPROVED",
  "SUBMITTED",
  "CRETURNED",
  "COMPLETED",
] as const;

/** A Super Admin, or any account with no college/department scope (e.g. University Admin), excluding specialized university officers. */
export const isGlobalAdmin = (u: ApprovalUser) =>
  u.role === "su" ||
  (!!u.role &&
    !["NONE", "dept", "hod", "ca", "dean", "iqac", "dean_research", "doc_officer"].includes(u.role) &&
    !u.college &&
    !u.dept);

/** A Dean / Principal attached to the college that owns the event. */
export const isCollegeDean = (u: ApprovalUser, e: ApprovalEvent) =>
  u.role === "dean" && !!e.college && u.college === e.college;

/** A Head of Department attached to the department that owns the event. */
export const isHodOf = (u: ApprovalUser, e: ApprovalEvent) =>
  u.role === "hod" && !!e.dept && u.dept === e.dept;

/** Central IQAC role. */
export const isIQACUser = (u: ApprovalUser) => u.role === "iqac";

/** Dean Research, ACU role. */
export const isDeanResearchUser = (u: ApprovalUser) => u.role === "dean_research";

/** Institutional Reporting / Documentation Officer role. */
export const isDocOfficerUser = (u: ApprovalUser) => u.role === "doc_officer";

/**
 * Which approval stage an event is currently waiting at:
 * - "hod": Department HOD
 * - "dean": College Dean / Principal
 * - "dean_research": Dean Research, ACU (for Academic Participation only)
 * - "iqac": Central IQAC (final university approval for both Event Organized and Academic Participation)
 * - null: Not waiting for approval (e.g. APPROVED, SUBMITTED, COMPLETED, RETURNED, REJECTED)
 */
export const approvalStage = (
  eOrStatus?: ApprovalEvent | string,
  isPartParam?: boolean
): "hod" | "dean" | "dean_research" | "iqac" | null => {
  if (!eOrStatus) return null;
  const status = typeof eOrStatus === "string" ? eOrStatus : eOrStatus.status;
  const isPart = typeof eOrStatus === "string" ? Boolean(isPartParam) : Boolean(eOrStatus.isPart);
  const researchApproved = typeof eOrStatus === "string" ? false : Boolean(eOrStatus.researchApproved);

  if (status === "PENDING") return "hod";
  if (status === "HOD_APPROVED") return "dean";
  if (status === "DAPPROVED") {
    // For Academic Participation: Dean / Principal -> Dean Research -> Central IQAC
    if (isPart && !researchApproved) return "dean_research";
    // For Event Organized: Dean / Principal -> Central IQAC
    return "iqac";
  }
  if (status === "RESEARCH_APPROVED") return "iqac";
  return null;
};

/** Who may take which decision, given the stage the event is currently waiting at. */
export const canDecideEvent = (u: ApprovalUser, e: ApprovalEvent, decision: ApprovalDecision) => {
  const stage = approvalStage(e);
  if (!stage) return false;

  // Stage 1: Department HOD Review (PENDING -> HOD_APPROVED)
  if (stage === "hod") {
    const isHod = isHodOf(u, e) || u.role === "su";
    if (!isHod) return false;
    if (decision === "HOD_APPROVED" || decision === "DAPPROVED") return true;
    if (decision === "RETURNED" || decision === "REJECTED") return true;
    return false;
  }

  // Stage 2: College Dean / Principal Review (HOD_APPROVED -> DAPPROVED)
  if (stage === "dean") {
    const isDean = isCollegeDean(u, e) || u.role === "su";
    if (!isDean) return false;
    if (decision === "DAPPROVED") return true;
    if (decision === "RETURNED" || decision === "REJECTED") return true;
    return false;
  }

  // Stage 3 (Academic Participation only): Dean Research, ACU Review (DAPPROVED -> RESEARCH_APPROVED)
  if (stage === "dean_research") {
    const canResearch = isDeanResearchUser(u) || u.role === "su" || isGlobalAdmin(u);
    if (!canResearch) return false;
    if (decision === "RESEARCH_APPROVED" || decision === "APPROVED") return true;
    if (decision === "RETURNED" || decision === "REJECTED") return true;
    return false;
  }

  // Stage 4 (Final University Authorisation): Central IQAC (DAPPROVED/RESEARCH_APPROVED -> APPROVED)
  if (stage === "iqac") {
    const canIQAC = isIQACUser(u) || u.role === "su" || isGlobalAdmin(u);
    if (!canIQAC) return false;
    if (decision === "APPROVED") return true;
    if (decision === "RETURNED" || decision === "REJECTED") return true;
    return false;
  }

  return false;
};

/** Verification after the completion report: Documentation Officer, IQAC, Dean Research, Dean, or HOD. */
export const canVerifyEvent = (u: ApprovalUser, e: ApprovalEvent) =>
  e.status === "SUBMITTED" &&
  (isGlobalAdmin(u) ||
    isDocOfficerUser(u) ||
    isIQACUser(u) ||
    (e.isPart && isDeanResearchUser(u)) ||
    (!!e.college && u.college === e.college && (!u.dept || isHodOf(u, e)) && u.role !== "dept"));
