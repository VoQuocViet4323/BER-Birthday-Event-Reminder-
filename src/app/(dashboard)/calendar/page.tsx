"use client";

import { useEvents } from "@/hooks/use-events";
import { MonthCalendarView } from "@/components/calendar/month-calendar-view";
import { useState } from "react";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { EventWithMeta, EventFormValues } from "@/types/events";

export default function CalendarPage() {
  const { events, isLoading, addEvent, updateEvent, isAdding, isUpdating } = useEvents();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithMeta | null>(null);

  const handleEdit = (event: EventWithMeta) => {
    setEditingEvent(event);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (values: EventFormValues) => {
    if (editingEvent) {
      await updateEvent({ id: editingEvent.id, values });
    } else {
      await addEvent(values);
    }
  };

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
        onOpenCreateModal={() => {
          setEditingEvent(null);
          setIsDrawerOpen(true);
        }}
        onEditEvent={handleEdit}
      />

      <EventFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingEvent}
        isSubmitting={isAdding || isUpdating}
      />
    </div>
  );
}
