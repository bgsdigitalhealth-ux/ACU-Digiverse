import { describe, expect, it } from "vitest";
import { departmentHasUserSlot, type DepartmentAccount } from "./department-user-policy";

const first: DepartmentAccount = { id: "one", role: "dept", college: "college-a", dept: "dept-a" };
describe("two department users", () => {
  it("allows a second Department User for the same department", () => {
    expect(departmentHasUserSlot([first], "college-a", "dept-a")).toBe(true);
  });
  it("blocks a third Department User for the same department", () => {
    expect(departmentHasUserSlot([first, { ...first, id: "two" }], "college-a", "dept-a")).toBe(false);
  });
  it("does not count the current user when editing an existing assignment", () => {
    expect(departmentHasUserSlot([first, { ...first, id: "two" }], "college-a", "dept-a", "one")).toBe(true);
  });
  it("does not count another college or non-Department User account", () => {
    expect(departmentHasUserSlot([first, { ...first, id: "other", college: "college-b" }, { ...first, id: "dean", role: "dean" }], "college-a", "dept-a")).toBe(true);
  });
});