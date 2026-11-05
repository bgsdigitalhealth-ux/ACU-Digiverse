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
const deanApprovedPart = { college: "colA", dept: "deptA", status: "DAPPROVED", isPart: true, researchApproved: false };
const researchApprovedPart = { college: "colA", dept: "deptA", status: "RESEARCH_APPROVED", isPart: true, researchApproved: true };
const researchApprovedPartDapproved = { college: "colA", dept: "deptA", status: "DAPPROVED", isPart: true, researchApproved: true };
const fullyApproved = { college: "colA", dept: "deptA", status: "APPROVED", isPart: false };
const submittedEvent = { college: "colA", dept: "deptA", status: "SUBMITTED", isPart: false };

describe("event and participation approval order", () => {
  it("Event Organized follows: Department user > HOD > Dean / Principal > Central IQAC", () => {
    // 1. Department user submits -> PENDING
    expect(approvalStage(pendingEvent)).toBe("hod");
    expect(canDecideEvent(hodOfA, pendingEvent, "HOD_APPROVED")).toBe(true);

    // 2. HOD approves -> HOD_APPROVED
    expect(approvalStage(hodApprovedEvent)).toBe("dean");
    expect(canDecideEvent(deanOfA, hodApprovedEvent, "DAPPROVED")).toBe(true);

    // 3. Dean approves -> DAPPROVED (waiting for Central IQAC)
    expect(approvalStage(deanApprovedEvent)).toBe("iqac");
    expect(canDecideEvent(iqacUser, deanApprovedEvent, "APPROVED")).toBe(true);
    // Dean Research does NOT decide Event Organized
    expect(canDecideEvent(deanResearchUser, deanApprovedEvent, "APPROVED")).toBe(false);
  });

  it("Academic Participation follows: Department user > HOD > Dean / Principal > Dean Research > Central IQAC", () => {
    // 1. Department user submits -> PENDING
    expect(approvalStage(pendingPart)).toBe("hod");
    expect(canDecideEvent(hodOfA, pendingPart, "HOD_APPROVED")).toBe(true);

    // 2. HOD approves -> HOD_APPROVED
    expect(approvalStage(hodApprovedPart)).toBe("dean");
    expect(canDecideEvent(deanOfA, hodApprovedPart, "DAPPROVED")).toBe(true);

    // 3. Dean approves -> DAPPROVED (waiting for Dean Research)
    expect(approvalStage(deanApprovedPart)).toBe("dean_research");
    expect(canDecideEvent(deanResearchUser, deanApprovedPart, "RESEARCH_APPROVED")).toBe(true);
    // Central IQAC cannot approve before Dean Research
    expect(canDecideEvent(iqacUser, deanApprovedPart, "APPROVED")).toBe(false);

    // 4. Dean Research approves -> RESEARCH_APPROVED (waiting for Central IQAC)
    expect(approvalStage(researchApprovedPart)).toBe("iqac");
    expect(approvalStage(researchApprovedPartDapproved)).toBe("iqac");
    // Central IQAC gives final university approval
    expect(canDecideEvent(iqacUser, researchApprovedPart, "APPROVED")).toBe(true);
    expect(canDecideEvent(iqacUser, researchApprovedPartDapproved, "APPROVED")).toBe(true);
  });

  it("Stage 1 boundaries: HOD of another dept or Dean cannot decide PENDING proposal", () => {
    expect(isHodOf(hodOfA, pendingEvent)).toBe(true);
    expect(canDecideEvent(hodOfB, pendingEvent, "HOD_APPROVED")).toBe(false);
    expect(canDecideEvent(deanOfA, pendingEvent, "DAPPROVED")).toBe(false);
  });

  it("Stage 2 boundaries: Dean of another college cannot decide HOD_APPROVED proposal", () => {
    expect(isCollegeDean(deanOfA, hodApprovedEvent)).toBe(true);
    expect(canDecideEvent(deanOfB, hodApprovedEvent, "DAPPROVED")).toBe(false);
    expect(canDecideEvent(iqacUser, hodApprovedEvent, "APPROVED")).toBe(false);
  });

  it("Super Admin / Global Admin has override access across all stages", () => {
    expect(isGlobalAdmin(univAdmin)).toBe(true);
    expect(canDecideEvent(univAdmin, pendingEvent, "HOD_APPROVED")).toBe(true);
    expect(canDecideEvent(univAdmin, hodApprovedEvent, "DAPPROVED")).toBe(true);
    expect(canDecideEvent(univAdmin, deanApprovedEvent, "APPROVED")).toBe(true);
    expect(canDecideEvent(univAdmin, deanApprovedPart, "RESEARCH_APPROVED")).toBe(true);
    expect(canDecideEvent(univAdmin, researchApprovedPart, "APPROVED")).toBe(true);
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
