"use client";

import { useState } from "react";
import { useEvents } from "@/hooks/use-events";
import { TodayHighlightCard } from "@/components/events/today-highlight-card";
import { UpcomingCarousel } from "@/components/events/upcoming-carousel";
import { EventCard } from "@/components/events/event-card";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { EventWithMeta, EventFormValues } from "@/types/events";
import { Users, Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DashboardPage() {
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

  // Sự kiện hôm nay
  const todayEvents = events.filter((e) => e.daysRemaining === 0);

  // Thống kê nhanh
  const totalEvents = events.length;
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthEvents = events.filter(
    (e) => e.nextOccurrence.getMonth() + 1 === currentMonth
  ).length;
  const upcoming7Days = events.filter(
    (e) => e.daysRemaining >= 0 && e.daysRemaining <= 7
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-card border border-border" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 rounded-2xl bg-card border border-border" />
          <div className="h-20 rounded-2xl bg-card border border-border" />
          <div className="h-20 rounded-2xl bg-card border border-border" />
        </div>
        <div className="h-32 rounded-3xl bg-card border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Thẻ Hôm Nay (Nổi bật nhất nếu có sự kiện hôm nay) */}
      <TodayHighlightCard events={todayEvents} />

      {/* 2. Thống kê nhỏ (Mini Stats Cards) */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-3xl bg-card border border-border/80 p-4 shadow-card flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {totalEvents}
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground mt-0.5">
              Tổng người / Sự kiện
            </p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-3xl bg-card border border-border/80 p-4 shadow-card flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center mb-2">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {thisMonthEvents}
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground mt-0.5">
              Trong tháng {currentMonth}
            </p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="rounded-3xl bg-card border border-border/80 p-4 shadow-card flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {upcoming7Days}
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground mt-0.5">
              Sắp tới 7 ngày
            </p>
          </div>
        </motion.div>
      </div>

      {/* 3. Dải cuộn ngang "Sắp tới" */}
      <UpcomingCarousel events={events} onSelectEvent={handleEdit} />

      {/* 4. Danh sách sự kiện gần đây */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Sự kiện gần bạn nhất</h2>
            <p className="text-xs text-muted-foreground">
              Theo thứ tự thời gian sắp diễn ra
            </p>
          </div>
          <Link
            href="/events"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Xem tất cả ({events.length}) →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {events
            .filter((e) => e.daysRemaining >= 0)
            .sort((a, b) => a.daysRemaining - b.daysRemaining)
            .slice(0, 6)
            .map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onEdit={handleEdit}
                onDelete={deleteEvent}
                onToggleEnabled={toggleEventEnabled}
              />
            ))}
        </div>
      </section>

      {/* Drawer xem & chỉnh sửa sự kiện khi bấm vào card trên Dashboard */}
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
