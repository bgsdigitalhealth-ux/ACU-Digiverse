import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventDate, eventResourcesQuery, type EventResource } from "@/lib/event-resources";

export const Route = createFileRoute("/event-resources/$eventId")({
  loader: async ({ context, params }) => {
    const events = await context.queryClient.ensureQueryData(eventResourcesQuery);
    const event = events.find(item => item.id === params.eventId);
    if (!event) throw notFound();
    return event;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — ACU DigiVerse Event Resources` : "Event unavailable — ACU DigiVerse";
    const description = loaderData ? `${loaderData.department}, ${loaderData.college}. ${eventDate(loaderData.event_date)}. Approved event details from ACU DigiVerse.` : "This event is not available for public viewing.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }], links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Libre+Baskerville:wght@400;700&display=swap" }] };
  },
  component: EventResourceView,
  errorComponent: () => <Unavailable message="Event resources are temporarily unavailable. Please try again later." />,
  notFoundComponent: () => <Unavailable message="This event is not available for public viewing." />,
});

function Unavailable({ message }: { message: string }) {
  return <main className="min-h-screen bg-background p-8 text-foreground"><h1 className="mb-4 text-3xl text-primary">Event unavailable</h1><p className="mb-6">{message}</p><Button asChild variant="outline"><Link to="/"><ArrowLeft />Back to DigiVerse</Link></Button></main>;
}

function EventResourceView() {
  const { eventId } = Route.useParams();
  const { data: events } = useSuspenseQuery(eventResourcesQuery);
  const event = events.find(item => item.id === eventId);
  if (!event) return <Unavailable message="This event is not available for public viewing." />;
  return <main className="digiverse-home min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-6 py-6 sm:px-12 lg:px-20"><Button asChild variant="ghost"><Link to="/"><ArrowLeft />ACU DigiVerse</Link></Button></header>
    <section className="border-b-4 border-accent bg-primary px-6 py-12 text-primary-foreground sm:px-12 lg:px-20 lg:py-16"><p className="mb-5 text-sm uppercase">Event Resources · {event.status === "COMPLETED" ? "Completed" : "Approved"}</p><h1 className="max-w-5xl break-words text-3xl leading-tight sm:text-5xl">{event.title}</h1><p className="mt-6 flex items-center gap-3"><CalendarDays className="size-5" />{eventDate(event.event_date)}</p></section>
    <section className="px-6 py-12 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-4xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-primary px-5 py-5 sm:px-8">
          <div><p className="text-xs font-semibold uppercase text-secondary">ACU DigiVerse</p><h2 className="mt-1 text-xl text-primary sm:text-2xl">Event Information Form</h2></div>
          <div className="flex items-center gap-3"><span className="border border-accent px-3 py-1 text-xs font-semibold uppercase">{event.status === "COMPLETED" ? "Completed" : "Approved"}</span><Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}><Printer />Print</Button></div>
        </div>
        {formSections(event).map(section => <fieldset key={section.title} className="border-b border-border px-5 py-6 last:border-b-0 sm:px-8">
          <legend className="sr-only">{section.title}</legend>
          <h3 className="mb-4 text-sm font-semibold uppercase text-primary">{section.title}</h3>
          <div className="grid gap-4 sm:grid-cols-2">{section.fields.map(field => <div key={field.label} className={field.wide ? "min-w-0 sm:col-span-2" : "min-w-0"}>
            <p id={`f-${field.n}`} className="mb-1.5 text-xs font-medium text-muted-foreground">{field.n}. {field.label}</p>
            <p aria-labelledby={`f-${field.n}`} className="min-h-10 w-full break-words rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground">{field.value}</p>
          </div>)}</div>
        </fieldset>)}
      </div>
    </section>
  </main>;
}

function formSections(event: EventResource) {
  let n = 0;
  const f = (label: string, value: string, wide = false) => ({ n: ++n, label, value, wide });
  return [
    { title: "Organizing unit", fields: [f("College name", event.college), f("Department name", event.department)] },
    { title: "Event", fields: [f("Title of the event", event.title, true), f("Event type", event.event_type || "Not specified"), f("Mode of the event", event.mode || "Not specified")] },
    { title: "Schedule & venue", fields: [f("Date: from", eventDate(event.event_date)), f("Date: to", event.end_date ? eventDate(event.end_date) : "Not specified"), f("Time", event.event_time || "Time to be announced"), f("Venue / platform / location", event.venue || "Venue to be announced")] },
  ];
}
