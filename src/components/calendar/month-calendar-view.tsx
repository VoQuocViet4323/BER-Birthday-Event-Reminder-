"use client";

import { useState } from "react";
import { EventWithMeta } from "@/types/events";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MonthCalendarViewProps {
  events: EventWithMeta[];
  onOpenCreateModal: () => void;
  onEditEvent: (event: EventWithMeta) => void;
}

export function MonthCalendarView({
  events,
  onOpenCreateModal,
  onEditEvent,
}: MonthCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    date: Date;
    events: EventWithMeta[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 - 11

  // Tính số ngày trong tháng và ngày bắt đầu của tuần
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Chuyển thứ 2 thành ngày đầu tuần (0: T2 ... 6: CN)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Map sự kiện vào từng ngày trong tháng hiện tại
  const eventsByDay = new Map<number, EventWithMeta[]>();
  for (const ev of events) {
    const occ = ev.nextOccurrence;
    if (occ.getFullYear() === year && occ.getMonth() === month) {
      const day = occ.getDate();
      const list = eventsByDay.get(day) || [];
      list.push(ev);
      eventsByDay.set(day, list);
    }
  }

  const groupColors: Record<string, string> = {
    "Gia đình": "bg-rose-500",
    "Bạn bè": "bg-amber-500",
    "Đồng nghiệp": "bg-indigo-500",
    Khác: "bg-emerald-500",
  };

  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card rounded-3xl p-5 border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              Tháng {month + 1}, {year}
            </h2>
            <p className="text-xs text-muted-foreground">
              Bấm vào ngày bất kỳ để xem chi tiết
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3.5 py-1.5 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-foreground transition-colors"
          >
            Hôm nay
          </button>
          <div className="flex items-center gap-1 border border-border rounded-xl p-0.5 bg-secondary/30">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-3xl border border-border p-4 sm:p-6 shadow-card overflow-hidden">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
          {dayNames.map((name, i) => (
            <div
              key={name}
              className={cn(
                "py-2 text-xs font-bold",
                i >= 5 ? "text-rose-500/80" : "text-muted-foreground"
              )}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty cells for start offset */}
          {Array.from({ length: startOffset }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="min-h-[70px] sm:min-h-[90px] rounded-2xl bg-secondary/20 opacity-30 pointer-events-none"
            />
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNumber = idx + 1;
            const dayEvents = eventsByDay.get(dayNumber) || [];
            const isToday =
              today.getDate() === dayNumber &&
              today.getMonth() === month &&
              today.getFullYear() === year;

            return (
              <motion.button
                key={dayNumber}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (dayEvents.length > 0) {
                    setSelectedDayEvents({
                      date: new Date(year, month, dayNumber),
                      events: dayEvents,
                    });
                  }
                }}
                className={cn(
                  "min-h-[70px] sm:min-h-[90px] p-2 rounded-2xl border transition-all text-left flex flex-col justify-between relative group",
                  isToday
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border/60 hover:border-primary/50 hover:bg-muted/50",
                  dayEvents.length > 0 && "cursor-pointer"
                )}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={cn(
                      "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center",
                      isToday
                        ? "gradient-brand text-white shadow-xs"
                        : "text-foreground group-hover:text-primary"
                    )}
                  >
                    {dayNumber}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold text-primary sm:hidden">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event Dot Indicators & Names on desktop */}
                <div className="w-full space-y-1">
                  {/* Chấm màu tròn trên mobile */}
                  <div className="flex items-center gap-1 sm:hidden flex-wrap">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          groupColors[ev.group_name] || "bg-primary"
                        )}
                      />
                    ))}
                  </div>

                  {/* Nhãn sự kiện trên desktop */}
                  <div className="hidden sm:block space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="truncate text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary/80 text-foreground flex items-center gap-1"
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            groupColors[ev.group_name] || "bg-primary"
                          )}
                        />
                        <span className="truncate">{ev.name}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] font-bold text-muted-foreground px-1">
                        +{dayEvents.length - 2} sự kiện khác
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Legend Bảng chú giải màu sắc */}
      <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Gia đình
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Bạn bè
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Đồng nghiệp
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Khác
        </span>
      </div>

      {/* Detail Bottom Sheet / Dialog khi bấm vào ngày */}
      <AnimatePresence>
        {selectedDayEvents && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Sự kiện ngày {selectedDayEvents.date.getDate()} tháng{" "}
                    {selectedDayEvents.date.getMonth() + 1}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Có {selectedDayEvents.events.length} sự kiện trong ngày này
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 my-4 max-h-72 overflow-y-auto">
                {selectedDayEvents.events.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedDayEvents(null);
                      onEditEvent(ev);
                    }}
                    className="p-3.5 rounded-2xl bg-secondary/50 border border-border hover:border-primary cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                        {ev.avatar_url ? (
                          <img src={ev.avatar_url} alt={ev.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full gradient-brand text-white flex items-center justify-center font-bold text-sm">
                            {ev.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{ev.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ev.group_name} {ev.upcomingAge ? `• ${ev.upcomingAge} tuổi` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      {ev.daysRemaining === 0 ? "Hôm nay" : `Còn ${ev.daysRemaining} ngày`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border flex justify-end">
                <button
                  onClick={() => {
                    setSelectedDayEvents(null);
                    onOpenCreateModal();
                  }}
                  className="w-full py-2.5 rounded-xl gradient-brand text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-soft"
                >
                  <Plus className="w-4 h-4" />
                  Thêm sự kiện khác vào ngày này
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
