"use client";

import { useState } from "react";
import { useEvents } from "@/hooks/use-events";
import { TodayHighlightCard } from "@/components/events/today-highlight-card";
import { UpcomingCarousel } from "@/components/events/upcoming-carousel";
import { EventCard } from "@/components/events/event-card";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { EventWithMeta, EventFormValues } from "@/types/events";
import { Users, Calendar as CalendarIcon, Clock, Sparkles, Plus } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { initialMockEvents } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

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
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const { toast } = useToast();

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

  // Nạp 6 sự kiện mẫu vào tài khoản của người dùng
  const handleLoadDemoData = async () => {
    setIsLoadingDemo(true);
    try {
      for (const ev of initialMockEvents) {
        await addEvent({
          name: ev.name,
          event_type: ev.event_type,
          event_day: ev.event_day,
          event_month: ev.event_month,
          event_year: ev.event_year,
          is_lunar: ev.is_lunar,
          group_name: ev.group_name,
          note: ev.note,
          gift_idea: ev.gift_idea,
          avatar_url: ev.avatar_url,
          repeat_yearly: ev.repeat_yearly,
          remind_days: ev.remind_days || [7, 3, 1, 0],
          remind_time: ev.remind_time || "08:00",
          custom_type: ev.custom_type || null,
          custom_group: ev.custom_group || null,
          enabled: ev.enabled,
        });
      }
      toast({
        title: "Đã nạp 6 sự kiện mẫu thành công! 🎉",
        description: "Khám phá ngay thẻ Hôm Nay, Confetti và lời chúc nhé!",
        variant: "success",
      });
    } catch (e) {
      console.error("Lỗi nạp dữ liệu mẫu:", e);
      toast({
        title: "Có lỗi khi nạp dữ liệu mẫu",
        description: "Vui lòng thử lại sau.",
        variant: "error",
      });
    } finally {
      setIsLoadingDemo(false);
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
      <div className="space-y-8 animate-pulse">
        {/* Skeleton Highlight Banner */}
        <div className="rounded-3xl bg-card border border-border/80 p-6 sm:p-8 space-y-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary/80 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-secondary/90 rounded-lg w-48" />
              <div className="h-3.5 bg-secondary/60 rounded-md w-32" />
            </div>
          </div>
          <div className="h-14 bg-secondary/40 rounded-2xl w-full" />
        </div>

        {/* Skeleton 3 Mini Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-3xl bg-card border border-border/80 p-4 space-y-3 shadow-card"
            >
              <div className="w-8 h-8 rounded-xl bg-secondary/80" />
              <div className="space-y-1.5">
                <div className="h-6 bg-secondary/90 rounded-md w-12" />
                <div className="h-3 bg-secondary/50 rounded-md w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Upcoming Section */}
        <div className="space-y-3">
          <div className="h-5 bg-secondary/80 rounded-md w-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-3xl bg-card border border-border/80 space-y-3 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-secondary/80 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-secondary/80 rounded-md w-3/4" />
                    <div className="h-3 bg-secondary/50 rounded-md w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Thẻ Hôm Nay (Nổi bật nhất nếu có sự kiện hôm nay) */}
      <TodayHighlightCard events={todayEvents} onSelectEvent={handleEdit} />

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

        {events.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border/80 p-8 sm:p-12 text-center shadow-card space-y-4">
            <div className="w-16 h-16 rounded-3xl gradient-brand flex items-center justify-center text-3xl mx-auto shadow-soft">
              🎂
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="font-extrabold text-base sm:text-lg text-foreground">
                Chưa có sự kiện nào được ghi nhận
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Tài khoản của bạn hiện chưa có ngày sinh nhật hay kỷ niệm nào. Bạn có thể tạo sự kiện mới hoặc nạp dữ liệu mẫu để trải nghiệm đầy đủ tính năng!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setIsDrawerOpen(true);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-full gradient-brand text-white font-bold text-xs shadow-soft hover:shadow-soft-hover hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm sự kiện đầu tiên</span>
              </button>
              <button
                type="button"
                disabled={isLoadingDemo}
                onClick={handleLoadDemoData}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{isLoadingDemo ? "Đang nạp 6 sự kiện..." : "Nạp 6 sự kiện mẫu trải nghiệm"}</span>
              </button>
            </div>
          </div>
        ) : (
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
        )}
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
