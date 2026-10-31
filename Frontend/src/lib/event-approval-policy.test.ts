import { describe, expect, it } from "vitest";
import {
  approvalStage,
  canDecideEvent,
  canVerifyEvent,
  isCollegeDean,
  isGlobalAdmin,
  type ApprovalUser,
} from "./event-approval-policy";

const deanOfA: ApprovalUser = { role: "dean", college: "colA", dept: null };
const deanOfB: ApprovalUser = { role: "dean", college: "colB", dept: null };
const univAdmin: ApprovalUser = { role: "r_vrjstnum", college: null, dept: null };
const superAdmin: ApprovalUser = { role: "su", college: null, dept: null };
const deptUser: ApprovalUser = { role: "dept", college: "colA", dept: "deptA" };
const collegeAdmin: ApprovalUser = { role: "ca", college: "colA", dept: null };

const pending = { college: "colA", dept: "deptA", status: "PENDING" };
const deanApproved = { college: "colA", dept: "deptA", status: "DAPPROVED" };

describe("event approval order", () => {
  it("waits at the college Dean stage first, then the University Admin stage", () => {
    expect(approvalStage("PENDING")).toBe("dean");
    expect(approvalStage("DAPPROVED")).toBe("university");
    expect(approvalStage("APPROVED")).toBeNull();
    expect(approvalStage("COMPLETED")).toBeNull();
  });

  it("lets the originating college Dean send the event to the University Admin", () => {
    expect(canDecideEvent(deanOfA, pending, "DAPPROVED")).toBe(true);
    expect(canDecideEvent(deanOfA, pending, "RETURNED")).toBe(true);
    expect(canDecideEvent(deanOfA, pending, "REJECTED")).toBe(true);
  });

  it("keeps a Dean out of every other college's events", () => {
    expect(isCollegeDean(deanOfB, pending)).toBe(false);
    expect(canDecideEvent(deanOfB, pending, "DAPPROVED")).toBe(false);
    expect(canDecideEvent(deanOfB, pending, "REJECTED")).toBe(false);
  });

  it("never lets anyone grant the final approval before the Dean has decided", () => {
    for (const u of [superAdmin, univAdmin, deanOfA, collegeAdmin, deptUser]) {
      expect(canDecideEvent(u, pending, "APPROVED")).toBe(false);
    }
  });

  it("grants the final approval only to a University Admin once the Dean has approved", () => {
    expect(isGlobalAdmin(univAdmin)).toBe(true);
    expect(canDecideEvent(univAdmin, deanApproved, "APPROVED")).toBe(true);
    expect(canDecideEvent(univAdmin, deanApproved, "RETURNED")).toBe(true);
    expect(canDecideEvent(univAdmin, deanApproved, "REJECTED")).toBe(true);
    expect(canDecideEvent(deanOfA, deanApproved, "APPROVED")).toBe(false);
    expect(canDecideEvent(deanOfA, deanApproved, "RETURNED")).toBe(false);
    expect(canDecideEvent(deptUser, deanApproved, "APPROVED")).toBe(false);
    expect(canDecideEvent(collegeAdmin, deanApproved, "APPROVED")).toBe(false);
  });

  it("keeps department users and college admins out of both approval stages", () => {
    expect(canDecideEvent(deptUser, pending, "DAPPROVED")).toBe(false);
    expect(canDecideEvent(deptUser, deanApproved, "RETURNED")).toBe(false);
    expect(canDecideEvent(collegeAdmin, pending, "DAPPROVED")).toBe(false);
    expect(canDecideEvent(collegeAdmin, deanApproved, "RETURNED")).toBe(false);
  });

  it("allows a Super Admin to act at either stage without skipping the Dean", () => {
    expect(canDecideEvent(superAdmin, pending, "DAPPROVED")).toBe(true);
    expect(canDecideEvent(superAdmin, deanApproved, "APPROVED")).toBe(true);
    expect(canDecideEvent(superAdmin, pending, "APPROVED")).toBe(false);
  });

  it("opens verification only after the completion report is filed", () => {
    expect(canVerifyEvent(univAdmin, deanApproved)).toBe(false);
    expect(canVerifyEvent(univAdmin, { college: "colA", status: "SUBMITTED" })).toBe(true);
    expect(canVerifyEvent(deanOfA, { college: "colA", status: "SUBMITTED" })).toBe(true);
    expect(canVerifyEvent(deanOfB, { college: "colA", status: "SUBMITTED" })).toBe(false);
    expect(canVerifyEvent(deptUser, { college: "colA", status: "SUBMITTED" })).toBe(false);
  });
});
