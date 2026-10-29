"use client";

import { useEvents } from "@/hooks/use-events";
import { EventListGrouped } from "@/components/events/event-list-grouped";
import { useState, Suspense } from "react";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { EventWithMeta, EventFormValues } from "@/types/events";
import { useSearchParams } from "next/navigation";

function EventsContent() {
  const {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleEventEnabled,
    isAdding,
    isUpdating,
  } = useEvents();

  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

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
        <div className="h-12 rounded-2xl bg-card border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-28 rounded-3xl bg-card border border-border" />
          <div className="h-28 rounded-3xl bg-card border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Tất cả sự kiện
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {events.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tìm kiếm, lọc theo nhóm và quản lý các ngày quan trọng
          </p>
        </div>
      </div>

      <EventListGrouped
        events={events}
        onEdit={handleEdit}
        onDelete={deleteEvent}
        onToggleEnabled={toggleEventEnabled}
        onOpenCreateModal={() => {
          setEditingEvent(null);
          setIsDrawerOpen(true);
        }}
        initialSearch={initialSearch}
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

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-12 rounded-2xl bg-card border border-border" />
          <div className="h-32 rounded-3xl bg-card border border-border" />
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
