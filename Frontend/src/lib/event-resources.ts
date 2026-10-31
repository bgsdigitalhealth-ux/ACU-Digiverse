import { queryOptions } from "@tanstack/react-query";
import { listEventResources } from "@/lib/event-resources.functions";

export const eventResourcesQuery = queryOptions({
  queryKey: ["public-event-resources"],
  queryFn: () => listEventResources(),
  staleTime: 30_000,
  refetchInterval: 10_000,
});

export type EventResource = Awaited<ReturnType<typeof listEventResources>>[number];

export function eventDate(value: string) {
  if (!value) return "Date to be announced";
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}