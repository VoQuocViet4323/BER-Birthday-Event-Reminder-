"use client";

import { useEvents } from "@/hooks/use-events";
import { EventListGrouped } from "@/components/events/event-list-grouped";
import { useState, useMemo, Suspense } from "react";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { EventWithMeta, EventFormValues } from "@/types/events";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, List } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const filter = searchParams.get("filter") || "";
  const isUpcoming7 = filter === "upcoming7";

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithMeta | null>(null);

  // Danh sách sự kiện sắp tới trong vòng 7 ngày (0 <= daysRemaining <= 7)
  const upcomingEvents = useMemo(
    () => events.filter((e) => e.daysRemaining >= 0 && e.daysRemaining <= 7),
    [events]
  );

  const displayedEvents = useMemo(() => {
    if (isUpcoming7) {
      return upcomingEvents;
    }
    return events;
  }, [events, upcomingEvents, isUpcoming7]);

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
      {/* Page Header với Tab Pills chuyển đổi 2 chế độ rõ ràng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {isUpcoming7 ? "Sự kiện sắp tới (7 ngày)" : "Tất cả sự kiện"}
            </h1>
            <span
              className={cn(
                "text-xs font-bold px-2.5 py-0.5 rounded-full border",
                isUpcoming7
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  : "bg-primary/10 text-primary border-primary/20"
              )}
            >
              {displayedEvents.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isUpcoming7
              ? "Các sự kiện, sinh nhật và ngày kỷ niệm sẽ diễn ra trong vòng 7 ngày tới"
              : "Tìm kiếm, lọc theo nhóm và quản lý các ngày quan trọng"}
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-secondary/60 border border-border/60 self-start sm:self-auto shrink-0">
          <Link
            href="/events"
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              !isUpcoming7
                ? "bg-primary text-white shadow-soft"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <List className="w-3.5 h-3.5" />
            <span>Tất cả ({events.length})</span>
          </Link>
          <Link
            href="/events?filter=upcoming7"
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              isUpcoming7
                ? "bg-rose-500 text-white shadow-soft"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Sắp tới 7 ngày ({upcomingEvents.length})</span>
          </Link>
        </div>
      </div>

      {isUpcoming7 && displayedEvents.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-card/60 border border-border/80 backdrop-blur-xs">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Không có sự kiện nào trong 7 ngày tới</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
            Tuyệt vời! Bạn không có ngày sinh nhật hay sự kiện gấp nào trong 7 ngày này.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-secondary hover:bg-secondary/80 font-bold text-xs text-foreground transition-all border border-border"
          >
            <List className="w-4 h-4 text-primary" />
            <span>Xem tất cả sự kiện ({events.length})</span>
          </Link>
        </div>
      ) : (
        <EventListGrouped
          key={isUpcoming7 ? "upcoming7" : "all"}
          events={displayedEvents}
          onEdit={handleEdit}
          onDelete={deleteEvent}
          onToggleEnabled={toggleEventEnabled}
          onOpenCreateModal={() => {
            setEditingEvent(null);
            setIsDrawerOpen(true);
          }}
          initialSearch={initialSearch}
          defaultExpandAll={isUpcoming7}
        />
      )}

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
