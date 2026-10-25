"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { EventWithMeta } from "@/types/events";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Clock,
  Bell,
  FileText,
  Gift,
  BookOpen,
  PenLine,
  Sparkles,
  Plus,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useDiaries, normalizeDateKey } from "@/hooks/use-diaries";
import { DiaryEntry } from "@/types/diary";
import { DiaryDrawer } from "./diary-drawer";

interface MonthCalendarViewProps {
  events: EventWithMeta[];
}

export function MonthCalendarView({ events }: MonthCalendarViewProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(null);
  const [isSendingEventTest, setIsSendingEventTest] = useState(false);

  const {
    diaries,
    getDiariesForDate,
    getDiaryForDate,
    saveDiary,
    deleteDiary,
    isSaving,
    isDeleting,
  } = useDiaries();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [viewingEvent, setViewingEvent] = useState<EventWithMeta | null>(null);

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
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Map sự kiện vào từng ngày trong tháng hiện tại
  const eventsByDay = new Map<number, EventWithMeta[]>();
  for (const ev of events) {
    const occ = ev.nextOccurrence;
    if (occ && occ.getFullYear() === year && occ.getMonth() === month) {
      const day = occ.getDate();
      const list = eventsByDay.get(day) || [];
      list.push(ev);
      eventsByDay.set(day, list);
    }
  }

  // Map danh sách nhật ký theo ngày (key: YYYY-MM-DD chuẩn hóa -> DiaryEntry[])
  const diariesByDay = new Map<string, DiaryEntry[]>();
  for (const d of diaries) {
    const k = normalizeDateKey(d.entry_date);
    const list = diariesByDay.get(k) || [];
    list.push(d);
    diariesByDay.set(k, list);
  }

  const selectedDateKey = normalizeDateKey(selectedDate);
  const selectedDayDiaries = getDiariesForDate(selectedDateKey);
  const selectedDayDiary = selectedDayDiaries[0] || null;
  const selectedDayEvents =
    selectedDate.getFullYear() === year && selectedDate.getMonth() === month
      ? eventsByDay.get(selectedDate.getDate()) || []
      : [];

  const handleAddNewDiary = () => {
    setEditingDiary(null);
    setIsDiaryOpen(true);
  };

  const handleEditDiary = (diary: DiaryEntry) => {
    setEditingDiary(diary);
    setIsDiaryOpen(true);
  };

  const handleSendEventTestEmail = async (ev: EventWithMeta) => {
    setIsSendingEventTest(true);
    try {
      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ singleEventId: ev.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: "Không thể gửi email",
          description: data.error || "Có lỗi xảy ra khi gửi email nhắc nhở.",
          variant: "error",
          duration: 6000,
        });
      } else {
        toast({
          title: "Đã gửi email nhắc nhở thành công!",
          description: data.message || `Đã gửi thông báo nhắc sự kiện "${ev.name}" đến email của bạn!`,
          variant: "success",
          duration: 6000,
        });
      }
    } catch (err: any) {
      toast({
        title: "Lỗi kết nối",
        description: err.message || "Không thể kết nối đến máy chủ gửi email.",
        variant: "error",
      });
    } finally {
      setIsSendingEventTest(false);
    }
  };

  const groupColors: Record<string, string> = {
    "Gia đình": "bg-rose-500",
    "Bạn bè": "bg-amber-500",
    "Đồng nghiệp": "bg-indigo-500",
    Khác: "bg-emerald-500",
  };

  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const today = new Date();

  const remindDaysList = viewingEvent
    ? Array.isArray(viewingEvent.remind_days)
      ? viewingEvent.remind_days
      : []
    : [];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card rounded-3xl p-5 border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              Tháng {month + 1}, {year}
            </h2>
            <p className="text-xs text-muted-foreground">
              Đang chọn: Ngày {selectedDate.getDate()} tháng {selectedDate.getMonth() + 1}
              {selectedDayEvents.length > 0 ? ` • ${selectedDayEvents.length} sự kiện` : ""}
              {selectedDayDiaries.length > 0
                ? ` • ${selectedDayDiaries.length} bài nhật ký 📖`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Nút thêm nhật ký ở góc trên bên phải */}
          <button
            type="button"
            id="btn-diary-action"
            onClick={handleAddNewDiary}
            className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-soft cursor-pointer gradient-brand text-white hover:opacity-95"
            title="Thêm bài nhật ký mới cho ngày này"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>
              {selectedDayDiaries.length > 0 ? "Viết thêm nhật ký" : "Thêm nhật ký"}
            </span>
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="px-3.5 py-1.5 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            Hôm nay
          </button>

          <div className="flex items-center gap-1 border border-border rounded-xl p-0.5 bg-secondary/30">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-3xl border border-border p-2.5 sm:p-6 shadow-card overflow-hidden">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
          {dayNames.map((name, i) => (
            <div
              key={name}
              className={cn(
                "py-1.5 sm:py-2 text-xs font-bold",
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
              className="min-h-[66px] sm:min-h-[90px] rounded-xl sm:rounded-2xl bg-secondary/20 opacity-30 pointer-events-none"
            />
          ))}

          {/* Days of current month - BỎ FIX CỨNG: BẤM VÀO ĐƯỢC MỌI NGÀY */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNumber = idx + 1;
            const dayEvents = eventsByDay.get(dayNumber) || [];
            const hasEvents = dayEvents.length > 0;
            const currentCellDate = new Date(year, month, dayNumber);
            const cellDateKey = normalizeDateKey(currentCellDate);
            const cellDiaries = diariesByDay.get(cellDateKey) || [];
            const hasDiary = cellDiaries.length > 0;

            const isToday =
              today.getDate() === dayNumber &&
              today.getMonth() === month &&
              today.getFullYear() === year;

            const isSelected =
              selectedDate.getDate() === dayNumber &&
              selectedDate.getMonth() === month &&
              selectedDate.getFullYear() === year;

            return (
              <button
                key={dayNumber}
                type="button"
                onClick={() => {
                  setSelectedDate(new Date(year, month, dayNumber));
                }}
                className={cn(
                  "min-h-[66px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all text-left flex flex-col justify-between relative cursor-pointer group active:scale-95 overflow-hidden",
                  isSelected
                    ? "ring-2 ring-primary border-primary bg-primary/10 shadow-sm"
                    : isToday
                    ? "border-primary/80 bg-primary/5 ring-1 ring-primary/40"
                    : hasEvents
                    ? "border-border/80 bg-card hover:border-primary/50 hover:bg-muted/40"
                    : "border-border/40 bg-card/40 hover:border-border hover:bg-muted/20"
                )}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={cn(
                      "text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-colors shrink-0",
                      isToday
                        ? "gradient-brand text-white shadow-xs"
                        : isSelected
                        ? "bg-primary text-white font-extrabold shadow-xs"
                        : hasEvents
                        ? "text-foreground group-hover:text-primary font-bold"
                        : "text-muted-foreground"
                    )}
                  >
                    {dayNumber}
                  </span>

                  {/* Chỉ hiển thị badge chi tiết ở góc trên khi ở màn hình máy tính (sm:) */}
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    {/* Biểu tượng nhật ký */}
                    {hasDiary && (
                      <span
                        className="text-[11px] font-bold text-primary flex items-center"
                        title={`${cellDiaries.length} bài nhật ký`}
                      >
                        📖
                        {cellDiaries.length > 1 && (
                          <span className="text-[9px] font-extrabold text-foreground bg-primary/20 rounded-full px-1 ml-0.5">
                            {cellDiaries.length}
                          </span>
                        )}
                      </span>
                    )}

                    {/* Số lượng sự kiện */}
                    {hasEvents && (
                      <span className="text-[10px] font-bold text-primary">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Indicators & Event details */}
                <div className="w-full mt-auto">
                  {/* Mobile: Chấm tròn sự kiện và Icon nhật ký nằm gọn gàng bên dưới */}
                  <div className="flex sm:hidden flex-col items-center justify-end w-full gap-0.5">
                    {/* Chấm tròn sự kiện */}
                    {hasEvents && (
                      <div className="flex items-center justify-center gap-1 max-w-full">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shadow-xs shrink-0",
                              groupColors[ev.group_name] || "bg-primary"
                            )}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] font-bold text-muted-foreground leading-none">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Icon nhật ký trên mobile */}
                    {hasDiary && (
                      <div
                        className="flex items-center justify-center text-[10px] leading-none text-primary"
                        title={`${cellDiaries.length} bài nhật ký`}
                      >
                        <span>📖</span>
                        {cellDiaries.length > 1 && (
                          <span className="text-[8px] font-bold text-primary ml-0.5">
                            {cellDiaries.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desktop: Danh sách nhãn sự kiện */}
                  <div className="hidden sm:block space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(new Date(year, month, dayNumber));
                          setViewingEvent(ev);
                        }}
                        className="truncate text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary/80 text-foreground flex items-center gap-1 hover:bg-secondary"
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
              </button>
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
        <span className="flex items-center gap-1.5">
          <span>📖</span> Có nhật ký
        </span>
      </div>

      {/* Khối xem nhanh Sự kiện & Nhật ký của Ngày Đang Chọn */}
      <div className="bg-card rounded-3xl border border-border p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full gradient-brand" />
            <h3 className="font-extrabold text-sm text-foreground">
              Chi tiết ngày {selectedDate.getDate()} tháng {selectedDate.getMonth() + 1}, {selectedDate.getFullYear()}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleAddNewDiary}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Viết thêm nhật ký</span>
          </button>
        </div>

        {/* Nội dung ngày được chọn */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Cột Nhật ký: Hiển thị danh sách tất cả các bài nhật ký trong ngày */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Nhật ký trong ngày ({selectedDayDiaries.length})
              </span>
              {selectedDayDiaries.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddNewDiary}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Viết thêm</span>
                </button>
              )}
            </div>

            {selectedDayDiaries.length > 0 ? (
              <div className="space-y-2">
                {selectedDayDiaries.map((diary) => (
                  <div
                    key={diary.id}
                    onClick={() => handleEditDiary(diary)}
                    className="p-3.5 rounded-2xl bg-secondary/40 border border-primary/20 hover:border-primary/50 transition-all cursor-pointer space-y-1.5 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {diary.created_at && (
                          <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-primary/70" />
                            {new Date(diary.created_at).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        <p className="font-bold text-xs text-foreground truncate">
                          {diary.title || "Nhật ký không tiêu đề"}
                        </p>
                      </div>

                      {diary.mood && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-card border border-border shrink-0">
                          {diary.mood === "happy"
                            ? "😊 Vui vẻ"
                            : diary.mood === "calm"
                            ? "🌿 Bình yên"
                            : diary.mood === "excited"
                            ? "🔥 Hào hứng"
                            : diary.mood === "sad"
                            ? "🥺 Trầm lắng"
                            : "🙏 Biết ơn"}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {diary.content}
                    </p>

                    {diary.tags && diary.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {diary.tags.map((t: string) => (
                          <span
                            key={t}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-card text-muted-foreground border border-border/60"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Nút thêm nhanh một bài nhật ký khác */}
                <button
                  type="button"
                  onClick={handleAddNewDiary}
                  className="w-full py-2.5 rounded-2xl border border-dashed border-border/80 hover:border-primary/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>+ Viết thêm một nhật ký khác trong ngày</span>
                </button>
              </div>
            ) : (
              <div
                onClick={handleAddNewDiary}
                className="p-6 rounded-2xl border border-dashed border-border/80 hover:border-primary/60 transition-colors flex items-center justify-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground text-xs font-semibold"
              >
                <PenLine className="w-4 h-4 text-primary" />
                <span>Chưa có nhật ký cho ngày này. Bấm để viết!</span>
              </div>
            )}
          </div>

          {/* Danh sách sự kiện nếu có */}
          {selectedDayEvents.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Sự kiện trong ngày ({selectedDayEvents.length})
              </span>
              {selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setViewingEvent(ev)}
                  className="p-3 rounded-2xl bg-secondary/40 border border-border hover:border-primary cursor-pointer transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                      {ev.avatar_url ? (
                        <img src={ev.avatar_url} alt={ev.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full gradient-brand text-white flex items-center justify-center font-bold text-xs">
                          {ev.name?.charAt(0) || "S"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">{ev.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(ev as any).custom_group || ev.group_name} {Boolean(ev.upcomingAge && ev.upcomingAge > 0) ? `• ${ev.upcomingAge} tuổi` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {ev.daysRemaining === 0 ? "Hôm nay" : `Còn ${ev.daysRemaining} ngày`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Sự kiện trong ngày (0)
              </span>
              <div className="p-4 rounded-2xl border border-dashed border-border/80 flex items-center justify-center text-muted-foreground text-xs py-6">
                Không có sinh nhật hay sự kiện nào trong ngày này.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer Nhập / Xem / Sửa / Xóa Nhật Ký */}
      <DiaryDrawer
        isOpen={isDiaryOpen}
        onClose={() => {
          setIsDiaryOpen(false);
          setEditingDiary(null);
        }}
        selectedDate={selectedDate}
        initialData={editingDiary}
        onSave={saveDiary}
        onDelete={deleteDiary}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />

      {/* Modal Xem Chi Tiết Sự Kiện (Chỉ Xem) */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence mode="wait">
          {viewingEvent && (
            <motion.div
              key="viewing-event-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setViewingEvent(null);
              }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[3px] p-0 sm:p-4 touch-none"
            >
              <motion.div
                key="viewing-event-sheet"
                initial={{ y: "100%", opacity: 0.95 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0.95 }}
                transition={{
                  type: "spring",
                  damping: 30,
                  stiffness: 340,
                  mass: 0.8,
                }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={{ top: 0, bottom: 0.4 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 450) {
                    setViewingEvent(null);
                  }
                }}
                className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl p-6 overflow-hidden flex flex-col max-h-[92vh] will-change-transform transform-gpu"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mobile Drag Indicator Handle */}
                <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto -mt-2 mb-3 sm:hidden shrink-0 cursor-grab active:cursor-grabbing" />
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/10 shrink-0 border border-primary/20">
                  {viewingEvent.avatar_url ? (
                    <img src={viewingEvent.avatar_url} alt={viewingEvent.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full gradient-brand text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {viewingEvent.name?.charAt(0) || "S"}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground tracking-tight">
                    {viewingEvent.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {viewingEvent.event_type === "birthday"
                        ? "Sinh nhật"
                        : viewingEvent.event_type === "anniversary"
                        ? "Kỷ niệm"
                        : viewingEvent.event_type === "memorial"
                        ? "Ngày lễ"
                        : viewingEvent.custom_type || "Khác"}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1">
                      <span className={cn("w-2 h-2 rounded-full", groupColors[viewingEvent.group_name] || "bg-primary")} />
                      {(viewingEvent as any).custom_group || viewingEvent.group_name}
                    </span>
                    {viewingEvent.is_lunar && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Âm lịch 🌙
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingEvent(null)}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-4 my-4 overflow-y-auto pr-1">
              {/* Banner đếm ngược */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    {viewingEvent.daysRemaining === 0 ? "🎉 Diễn ra hôm nay" : "Sắp tới"}
                  </p>
                  <p className="text-base font-extrabold text-foreground mt-0.5">
                    {viewingEvent.daysRemaining === 0
                      ? "Hôm nay chính là ngày đặc biệt!"
                      : `Còn ${viewingEvent.daysRemaining} ngày nữa`}
                  </p>
                  {Boolean(viewingEvent.upcomingAge && viewingEvent.upcomingAge > 0) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bước sang tuổi {viewingEvent.upcomingAge}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary">
                    {viewingEvent.daysRemaining === 0 ? "0" : viewingEvent.daysRemaining}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground block">ngày</span>
                </div>
              </div>

              {/* Chi tiết thông tin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                    Ngày diễn ra
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {viewingEvent.displayDate || `${viewingEvent.event_day} tháng ${viewingEvent.event_month}`}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Giờ thông báo email
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {viewingEvent.remind_time || "08:00"}
                  </p>
                </div>
              </div>

              {/* Mốc nhắc nhở */}
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                  Mốc nhắc nhở trước
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {remindDaysList.length > 0 ? (
                    remindDaysList
                      .slice()
                      .sort((a, b) => a - b)
                      .map((d) => (
                        <span
                          key={d}
                          className="px-2.5 py-1 rounded-xl bg-card border border-border text-xs font-semibold text-foreground"
                        >
                          {d === 0 ? "Đúng ngày" : `Trước ${d} ngày`}
                        </span>
                      ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Nhắc đúng ngày diễn ra</span>
                  )}
                </div>
              </div>

              {/* Ghi chú nếu có */}
              {viewingEvent.note && (
                <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Ghi chú
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {viewingEvent.note}
                  </p>
                </div>
              )}

              {/* Gợi ý quà tặng nếu có */}
              {viewingEvent.gift_idea && (
                <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-amber-500" />
                    Gợi ý quà tặng
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {viewingEvent.gift_idea}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => setViewingEvent(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Đóng
              </button>

              <button
                type="button"
                disabled={isSendingEventTest}
                onClick={() => handleSendEventTestEmail(viewingEvent)}
                className="flex-1 py-2.5 rounded-xl gradient-brand text-white font-bold text-xs shadow-soft hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                title="Gửi ngay một email thông báo nhắc sự kiện này tới hộp thư của bạn"
              >
                {isSendingEventTest ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi thử email nhắc ngay</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
