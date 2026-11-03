import { describe, expect, it } from "vitest";
import {
  approvalStage,
  canDecideEvent,
  canVerifyEvent,
  isCollegeDean,
  isGlobalAdmin,
  isHodOf,
  type ApprovalUser,
} from "./event-approval-policy";

const hodOfA: ApprovalUser = { role: "hod", college: "colA", dept: "deptA" };
const hodOfB: ApprovalUser = { role: "hod", college: "colA", dept: "deptB" };
const deanOfA: ApprovalUser = { role: "dean", college: "colA", dept: null };
const deanOfB: ApprovalUser = { role: "dean", college: "colB", dept: null };
const iqacUser: ApprovalUser = { role: "iqac", college: null, dept: null };
const deanResearchUser: ApprovalUser = { role: "dean_research", college: null, dept: null };
const docOfficerUser: ApprovalUser = { role: "doc_officer", college: null, dept: null };
const univAdmin: ApprovalUser = { role: "su", college: null, dept: null };
const deptUser: ApprovalUser = { role: "dept", college: "colA", dept: "deptA" };

const pendingEvent = { college: "colA", dept: "deptA", status: "PENDING", isPart: false };
const pendingPart = { college: "colA", dept: "deptA", status: "PENDING", isPart: true };
const hodApprovedEvent = { college: "colA", dept: "deptA", status: "HOD_APPROVED", isPart: false };
const hodApprovedPart = { college: "colA", dept: "deptA", status: "HOD_APPROVED", isPart: true };
const deanApprovedEvent = { college: "colA", dept: "deptA", status: "DAPPROVED", isPart: false };
const deanApprovedPart = { college: "colA", dept: "deptA", status: "DAPPROVED", isPart: true };
const fullyApproved = { college: "colA", dept: "deptA", status: "APPROVED", isPart: false };
const submittedEvent = { college: "colA", dept: "deptA", status: "SUBMITTED", isPart: false };

describe("event and participation approval order", () => {
  it("progresses sequentially: HOD stage -> Dean stage -> University stage", () => {
    expect(approvalStage("PENDING")).toBe("hod");
    expect(approvalStage("HOD_APPROVED")).toBe("dean");
    expect(approvalStage("DAPPROVED")).toBe("university");
    expect(approvalStage("APPROVED")).toBeNull();
    expect(approvalStage("COMPLETED")).toBeNull();
  });

  it("Stage 1: Department HOD reviews PENDING proposals and forwards to Dean", () => {
    expect(isHodOf(hodOfA, pendingEvent)).toBe(true);
    expect(canDecideEvent(hodOfA, pendingEvent, "HOD_APPROVED")).toBe(true);
    expect(canDecideEvent(hodOfA, pendingEvent, "RETURNED")).toBe(true);
    expect(canDecideEvent(hodOfA, pendingEvent, "REJECTED")).toBe(true);
    // HOD of another dept cannot decide
    expect(canDecideEvent(hodOfB, pendingEvent, "HOD_APPROVED")).toBe(false);
    // Dean cannot decide before HOD review
    expect(canDecideEvent(deanOfA, pendingEvent, "DAPPROVED")).toBe(false);
  });

  it("Stage 2: College Dean reviews HOD_APPROVED proposals and forwards to University", () => {
    expect(isCollegeDean(deanOfA, hodApprovedEvent)).toBe(true);
    expect(canDecideEvent(deanOfA, hodApprovedEvent, "DAPPROVED")).toBe(true);
    expect(canDecideEvent(deanOfA, hodApprovedEvent, "RETURNED")).toBe(true);
    // Dean of another college cannot decide
    expect(canDecideEvent(deanOfB, hodApprovedEvent, "DAPPROVED")).toBe(false);
    // University cannot decide before Dean review
    expect(canDecideEvent(iqacUser, hodApprovedEvent, "APPROVED")).toBe(false);
  });

  it("Stage 3 (Event Organize): Central IQAC gives final authorisation", () => {
    expect(canDecideEvent(iqacUser, deanApprovedEvent, "APPROVED")).toBe(true);
    expect(canDecideEvent(iqacUser, deanApprovedEvent, "RETURNED")).toBe(true);
    // Dean Research does not authorise Event Organize
    expect(canDecideEvent(deanResearchUser, deanApprovedEvent, "APPROVED")).toBe(false);
    // Dean cannot give final university approval
    expect(canDecideEvent(deanOfA, deanApprovedEvent, "APPROVED")).toBe(false);
  });

  it("Stage 3 (Academic Participation): Dean Research, ACU gives final authorisation", () => {
    expect(canDecideEvent(deanResearchUser, deanApprovedPart, "APPROVED")).toBe(true);
    expect(canDecideEvent(deanResearchUser, deanApprovedPart, "RETURNED")).toBe(true);
    // Central IQAC does not authorise Academic Participation
    expect(canDecideEvent(iqacUser, deanApprovedPart, "APPROVED")).toBe(false);
  });

  it("Super Admin / Global Admin has override access across all stages", () => {
    expect(isGlobalAdmin(univAdmin)).toBe(true);
    expect(canDecideEvent(univAdmin, pendingEvent, "HOD_APPROVED")).toBe(true);
    expect(canDecideEvent(univAdmin, hodApprovedEvent, "DAPPROVED")).toBe(true);
    expect(canDecideEvent(univAdmin, deanApprovedEvent, "APPROVED")).toBe(true);
    expect(canDecideEvent(univAdmin, deanApprovedPart, "APPROVED")).toBe(true);
  });

  it("Verification: Documentation Officer, IQAC, Dean, or HOD can verify completion report", () => {
    expect(canVerifyEvent(docOfficerUser, submittedEvent)).toBe(true);
    expect(canVerifyEvent(iqacUser, submittedEvent)).toBe(true);
    expect(canVerifyEvent(deanOfA, submittedEvent)).toBe(true);
    expect(canVerifyEvent(hodOfA, submittedEvent)).toBe(true);
    expect(canVerifyEvent(deanOfB, submittedEvent)).toBe(false);
    expect(canVerifyEvent(deptUser, submittedEvent)).toBe(false);
  });
});
