/** The date calendar stays available; disabled workflow events never leak from cache. */
export function visibleCalendarEvents<T>(events: T[], workflowEnabled: boolean): T[] {
  return workflowEnabled ? events : [];
}