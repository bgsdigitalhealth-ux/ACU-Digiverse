export function canAccessEventWorkflowRecord(enabled: boolean, collection: string, data: { head?: unknown; evId?: unknown }) {
  return enabled || !isEventWorkflowRecord(collection, data);
}
export function isEventWorkflowRecord(collection: string, data: { head?: unknown; evId?: unknown }) {
  return collection === "events" || (["recs", "zeros"].includes(collection) && (data.head === "evo" || Boolean(data.evId)));
}