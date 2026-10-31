import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Building2, CalendarDays, Clock3, Eye, GraduationCap, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { eventDate, eventResourcesQuery } from "@/lib/event-resources";

export function EventResources() {
  const { data: events = [], isPending, isError, refetch } = useQuery(eventResourcesQuery);
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (events.length < 2 || menuOpen) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex(current => (current + 1) % events.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [events.length, menuOpen]);
  const event = events[index % Math.max(events.length, 1)];

  return (
    <section aria-labelledby="resources-title" className="border-t border-border bg-muted px-6 py-8 sm:px-12 lg:px-20 lg:py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase text-secondary">Approved university events</p><h2 id="resources-title" className="heritage-heading text-2xl sm:text-3xl">Event Resources</h2></div>
        {events.length > 0 && <span className="text-sm text-muted-foreground">{(index % events.length) + 1} / {events.length}</span>}
      </div>
      {isPending ? <p role="status" className="py-8 text-muted-foreground">Loading event resources…</p> : isError ? <div className="py-6"><p className="mb-4 text-muted-foreground">Event resources are temporarily unavailable.</p><Button variant="outline" onClick={() => void refetch()}>Try again</Button></div> : !event ? <p className="border-t border-border py-8 text-muted-foreground">No approved events available yet.</p> : (
        <div aria-roledescription="carousel" aria-label="Approved event resources">
          <article key={event.id} className="heritage-resource event-slide relative min-h-56 bg-background p-5 sm:p-6" aria-roledescription="slide">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase text-secondary">{event.event_type || "University event"} · {event.status === "COMPLETED" ? "Completed" : "Approved"}</span>
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Event menu" title="Event menu"><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/event-resources/$eventId" params={{ eventId: event.id }}><Eye />View event</Link></DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Link to="/event-resources/$eventId" params={{ eventId: event.id }} className="group inline-flex max-w-full items-start gap-3 text-primary hover:underline"><h3 className="break-words text-xl leading-snug sm:text-2xl">{event.title}</h3><ArrowUpRight className="mt-0.5 size-5 shrink-0" /></Link>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[{ label: "Department", value: event.department, icon: GraduationCap }, { label: "College", value: event.college, icon: Building2 }, { label: "Date", value: eventDate(event.event_date), icon: CalendarDays }, { label: "Time", value: event.event_time || "Time to be announced", icon: Clock3 }].map(({ label, value, icon: Icon }) => <div key={label} className="min-w-0"><dt className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground"><Icon className="size-3.5 text-secondary" />{label}</dt><dd className="break-words text-sm text-foreground">{value}</dd></div>)}
            </dl>
            <Button asChild variant="outline" className="mt-4 h-8 rounded-sm border-primary px-3 text-xs text-primary"><Link to="/event-resources/$eventId" params={{ eventId: event.id }}><Eye />View event</Link></Button>
          </article>
          <div className="mt-4 flex gap-2" aria-hidden="true">{events.map((item, i) => <span key={item.id} className={`h-1 flex-1 ${i === index % events.length ? "bg-accent" : "bg-border"}`} />)}</div>
        </div>
      )}
    </section>
  );
}