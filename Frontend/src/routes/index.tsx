import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, Building2, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventResources } from "@/components/EventResources";
import { HomeCalendar } from "@/components/HomeCalendar";
import { useSuspenseQuery } from "@tanstack/react-query";
import { publicEventWorkflowQuery } from "@/lib/event-workflow";
import academicScene from "@/assets/digiverse-academic-scene.jpg";

const TITLE = "ACU DigiVerse — Adichunchanagiri University";
const DESC = "Welcome to ACU DigiVerse, Adichunchanagiri University's unified digital ecosystem for events and reporting.";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicEventWorkflowQuery),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: eventWorkflowEnabled } = useSuspenseQuery(publicEventWorkflowQuery);
  return (
    <main className="digiverse-home min-h-screen w-full bg-background text-foreground">
      <div className="w-full">
        <section className="grandeur-welcome relative overflow-hidden text-primary-foreground" aria-labelledby="welcome-title">
          <img src={academicScene} alt="An open book in a maroon and gold academic setting" width={1920} height={1024} fetchPriority="high" className="digiverse-cover" />
          <header className="digiverse-masthead relative flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3 text-primary-foreground" aria-label="ACU DigiVerse home"><span className="digiverse-mark"><GraduationCap className="size-6" strokeWidth={1.5} /></span><span className="text-sm font-semibold">ACU <span className="font-normal">DigiVerse</span></span></Link>
            <Button asChild variant="ghost" className="digiverse-signin rounded-sm text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/auth">Staff sign in <ArrowUpRight className="size-4" /></Link></Button>
          </header>
          <HomeCalendar eventsEnabled={eventWorkflowEnabled} />
          <div className="heritage-welcome-content relative">
            <p className="welcome-university-label mb-7 inline-block border-l-2 border-accent pl-3 text-xs font-semibold uppercase text-primary-foreground">Adichunchanagiri University</p>
            <h1 id="welcome-title" className="heritage-brand mb-5 text-5xl leading-tight sm:text-6xl lg:text-7xl">ACU<br /><span className="text-primary-foreground">DigiVerse</span></h1>
            <p className="mb-4 text-base font-semibold text-primary-foreground sm:text-lg">Unified Digital Ecosystem</p>
            <p className="welcome-description mb-8 text-sm leading-relaxed text-primary-foreground sm:text-base">
              A unified digital ecosystem engineered for academic excellence, collaborative research, and institutional intelligence.
            </p>
            <div className="flex flex-wrap items-center gap-8">
              <p className="text-sm italic leading-relaxed text-primary-foreground">One University.<br />Many Initiatives.<br />Greater Impact.</p>
            </div>
          </div>
          <div className="digiverse-hero-foot relative flex items-center justify-between gap-6 border-t border-primary-foreground/20 text-primary-foreground"><span className="text-xs">Knowledge. Collaboration. Progress.</span><span className="hidden text-xs sm:block">Adichunchanagiri University <span className="ml-3 text-accent">ACU</span></span></div>
        </section>

        {eventWorkflowEnabled && <EventResources />}

        <section className="digiverse-ecosystem border-t border-accent/20 bg-background px-6 py-10 sm:px-12 sm:py-14 lg:px-20 lg:py-14" aria-labelledby="ecosystem-title">
          <div className="flex flex-col gap-12 lg:flex-row">
            <div className="lg:w-1/3">
              <p className="mb-4 text-xs font-bold uppercase text-secondary">Structural Framework</p>
              <h2 id="ecosystem-title" className="heritage-heading text-3xl leading-tight sm:text-4xl">Our Digital<br />Ecosystem</h2>
              <div aria-hidden="true" className="mt-8 h-1 w-20 bg-accent" />
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:w-2/3">
              {[
                { number: "01.", title: "Colleges & Departments", text: "Access the specialized academic nodes that form the core of our educational community.", icon: Building2 },
                { number: "02.", title: "University Events", text: "Engage with knowledge sharing sessions, collaborative seminars, and impactful milestones.", icon: GraduationCap },
                { number: "03.", title: "Reports & Articles", text: "Explore the authoritative record of institutional progress and academic research initiatives.", icon: BookOpen },
              ].map(({ number, title, text, icon: Icon }) => (
                <div key={number} className="heritage-pillar min-w-0">
                  <div className="mb-6 flex items-center justify-between"><span className="grandeur-number block text-3xl text-secondary">{number}</span><Icon className="size-6 text-primary" strokeWidth={1.25} /></div>
                  <h3 className="grandeur-pillar-title mb-2 text-lg font-semibold leading-snug text-foreground">{title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="heritage-footer flex flex-col items-start justify-between gap-6 border-t border-border px-6 py-8 sm:px-12 md:flex-row md:items-center lg:px-20 lg:py-10">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground"><ShieldCheck className="size-6" strokeWidth={1.5} /></span>
            <div>
              <p className="text-sm font-semibold text-primary">Adichunchanagiri University</p>
              <p className="mt-1 text-xs text-muted-foreground">ACU DigiVerse</p>
            </div>
          </div>
          <p className="text-xs font-medium leading-relaxed text-muted-foreground">ACU DigiVerse · <span className="text-secondary">Unified Digital Ecosystem</span></p>
        </footer>
      </div>
    </main>
  );
}
