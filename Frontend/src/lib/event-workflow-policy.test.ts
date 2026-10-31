import { describe, expect, it } from "vitest";
import { canAccessEventWorkflowRecord, isEventWorkflowRecord } from "./event-workflow-policy";
describe("Event workflow records", () => {
  it("ON exposes controlled records and OFF hides them without affecting other records", () => {
    expect(canAccessEventWorkflowRecord(true, "events", {})).toBe(true);
    expect(canAccessEventWorkflowRecord(false, "events", {})).toBe(false);
    expect(canAccessEventWorkflowRecord(false, "recs", { head: "evo" })).toBe(false);
    expect(canAccessEventWorkflowRecord(false, "recs", { head: "pub" })).toBe(true);
  });
  it("classifies all event workflow records while preserving other report heads", () => {
    expect(isEventWorkflowRecord("events", {})).toBe(true);
    expect(isEventWorkflowRecord("recs", { head: "evo" })).toBe(true);
    expect(isEventWorkflowRecord("zeros", { head: "evo" })).toBe(true);
    expect(isEventWorkflowRecord("recs", { evId: "approved-event" })).toBe(true);
    expect(isEventWorkflowRecord("recs", { head: "pub" })).toBe(false);
    expect(isEventWorkflowRecord("depts", {})).toBe(false);
  });
});