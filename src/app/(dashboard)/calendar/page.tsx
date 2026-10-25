"use client";

import { useEvents } from "@/hooks/use-events";
import { MonthCalendarView } from "@/components/calendar/month-calendar-view";

export default function CalendarPage() {
  const {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 rounded-3xl bg-card border border-border" />
        <div className="h-96 rounded-3xl bg-card border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MonthCalendarView
        events={events}
        onAddEvent={addEvent}
        onUpdateEvent={(id, values) => updateEvent({ id, values })}
        onDeleteEvent={deleteEvent}
      />
    </div>
  );
}
