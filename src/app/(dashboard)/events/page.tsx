"use client";

import { useEvents } from "@/hooks/use-events";
import { EventListGrouped } from "@/components/events/event-list-grouped";
import { useState, Suspense } from "react";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { EventWithMeta, EventFormValues } from "@/types/events";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Tất cả sự kiện ({events.length})
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tìm kiếm, lọc theo nhóm và sắp xếp theo nhu cầu
          </p>
        </div>

        <button
          onClick={() => {
            setEditingEvent(null);
            setIsDrawerOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm sự kiện</span>
        </button>
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
