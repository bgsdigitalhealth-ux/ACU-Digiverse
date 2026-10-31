import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { ArrowUpRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { eventDate, eventResourcesQuery, type EventResource } from "@/lib/event-resources";
import { visibleCalendarEvents } from "@/lib/calendar-events";

function parseDate(value: string) {
  const date = parseISO(value.slice(0, 10));
  return isValid(date) ? date : undefined;
}

function eventState(event: EventResource) {
  const start = parseDate(event.event_date);
  const end = parseDate(event.end_date) ?? start;
  const today = startOfDay(new Date());
  if (event.status === "COMPLETED" || (end && end < today)) return "Event finished";
  if (start && start > today) return "Coming soon";
  if (start && end && start <= today && end >= today) return "Happening now";
  return "Date to be announced";
}

function coversDate(event: EventResource, date: Date) {
  const start = parseDate(event.event_date);
  const end = parseDate(event.end_date) ?? start;
  return Boolean(start && end && date >= start && date <= end);
}

export function EventCalendar({ eventsEnabled = true }: { eventsEnabled?: boolean }) {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>();
  const { data: availableEvents = [], isPending: queryPending, isError: queryError, refetch } = useQuery({ ...eventResourcesQuery, enabled: eventsEnabled });
  const events = visibleCalendarEvents(availableEvents, eventsEnabled);
  const isPending = eventsEnabled && queryPending;
  const isError = eventsEnabled && queryError;
  const visible = useMemo(() => events.filter(event => {
    if (selected) return coversDate(event, selected);
    const start = parseDate(event.event_date);
    const end = parseDate(event.end_date) ?? start;
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return Boolean(start && end && start <= last && end >= first);
  }).sort((a, b) => a.event_date.localeCompare(b.event_date)), [events, month, selected]);

  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
      <div className="min-w-0">
        <Calendar mode="single" month={month} onMonthChange={value => { setMonth(value); setSelected(undefined); }} selected={selected} onSelect={setSelected}
          className="event-month-calendar pointer-events-auto mx-auto w-full rounded-md border border-border [--cell-size:2.25rem]"
          modifiers={{ event: date => events.some(event => coversDate(event, date)) }}
          modifiersClassNames={{ event: "event-calendar-day" }} />
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => { setMonth(new Date()); setSelected(startOfDay(new Date())); }}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(undefined)}>All month</Button>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-accent" aria-hidden="true" />Scheduled events</p>
      </div>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <h3 className="text-lg text-foreground">{format(selected ?? month, selected ? "d MMMM yyyy" : "MMMM yyyy")}</h3>
          {!isPending && !isError && <span className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? "event" : "events"}</span>}
        </div>
        {isPending ? <p role="status" className="py-8 text-sm text-muted-foreground">Loading events…</p> : isError ? <div role="alert"><p className="mb-4 text-sm text-muted-foreground">Events are temporarily unavailable.</p><Button variant="outline" onClick={() => void refetch()}>Try again</Button></div> : visible.length === 0 ? <p className="py-8 text-sm text-muted-foreground">{selected ? "No events scheduled for this date." : "No events scheduled for this month."}</p> : (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {visible.map(event => {
              const state = eventState(event);
              return <article key={event.id} className="min-w-0 rounded-md border border-border bg-card p-4 text-card-foreground">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${state === "Coming soon" ? "text-primary" : state === "Happening now" ? "text-secondary" : "text-muted-foreground"}`}><span className={`size-1.5 rounded-full ${state === "Happening now" ? "bg-accent" : "bg-current"}`} aria-hidden="true" />{state}</span>
                <Link to="/event-resources/$eventId" params={{ eventId: event.id }} className="mt-2 flex items-start justify-between gap-2 text-primary hover:underline"><h4 className="break-words text-base font-semibold leading-snug">{event.title}</h4><ArrowUpRight className="size-4 shrink-0" /></Link>
                <p className="mt-2 break-words text-sm text-foreground">{event.department || "Department to be announced"}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{event.college || "College to be announced"}</p>
                <dl className="mt-3 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2"><dt><CalendarDays className="size-3.5" aria-label="Date" /></dt><dd>{eventDate(event.event_date)}{event.end_date && event.end_date !== event.event_date ? ` – ${eventDate(event.end_date)}` : ""}</dd></div>
                  <div className="flex items-start gap-2"><dt><Clock3 className="size-3.5" aria-label="Time" /></dt><dd>{event.event_time || "Time to be announced"}</dd></div>
                  <div className="flex items-start gap-2"><dt><MapPin className="size-3.5" aria-label="Venue" /></dt><dd className="break-words">{event.venue || "Venue to be announced"}</dd></div>
                </dl>
              </article>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}