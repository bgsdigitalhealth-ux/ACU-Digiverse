import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EventCalendar } from "./EventCalendar";

const CalendarScene = lazy(() => import("./HomeCalendarScene"));

export function HomeCalendar({ eventsEnabled = true }: { eventsEnabled?: boolean }) {
  const [date, setDate] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setDate(new Date());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="home-calendar rounded-md p-0 hover:bg-transparent" aria-label="Open event calendar" title="Open event calendar">
          <span className="pointer-events-none block h-full w-full" aria-hidden="true">{date && <Suspense fallback={null}><CalendarScene date={date} /></Suspense>}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-[820px] overflow-y-auto text-foreground">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-2xl tracking-normal">ACU Event Calendar</DialogTitle>
          <DialogDescription>Upcoming and finished university events</DialogDescription>
        </DialogHeader>
        <EventCalendar eventsEnabled={eventsEnabled} />
      </DialogContent>
    </Dialog>
  );
}