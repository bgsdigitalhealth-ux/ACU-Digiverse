import { describe, expect, it } from "vitest";
import { visibleCalendarEvents } from "./calendar-events";

describe("homepage calendar event visibility", () => {
  const approved = [{ id: "approved-event", title: "University seminar", status: "APPROVED" }];
  it("hides cached events while the workflow is OFF", () => {
    expect(visibleCalendarEvents(approved, false)).toEqual([]);
  });
  it("retains allowlisted events while the workflow is ON", () => {
    expect(visibleCalendarEvents(approved, true)).toEqual(approved);
  });
});