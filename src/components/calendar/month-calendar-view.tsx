"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { EventWithMeta, EventFormValues } from "@/types/events";
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
  Trash2,
  Edit2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useDiaries, normalizeDateKey } from "@/hooks/use-diaries";
import { DiaryEntry } from "@/types/diary";
import { DiaryDrawer } from "./diary-drawer";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { useEvents } from "@/hooks/use-events";

interface MonthCalendarViewProps {
  events?: EventWithMeta[];
  onAddEvent?: (values: EventFormValues) => Promise<any>;
  onUpdateEvent?: (id: string, values: EventFormValues) => Promise<any>;
  onDeleteEvent?: (id: string) => Promise<any>;
}

export function MonthCalendarView({
  events: propEvents,
  onAddEvent: propOnAddEvent,
  onUpdateEvent: propOnUpdateEvent,
  onDeleteEvent: propOnDeleteEvent,
}: MonthCalendarViewProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Hook sự kiện để xử lý dữ liệu và đồng bộ TanStack Query
  const eventsHook = useEvents();
  const events = propEvents ?? eventsHook.events;
  const addEvent = propOnAddEvent ?? eventsHook.addEvent;
  const updateEvent = propOnUpdateEvent ?? ((id, values) => eventsHook.updateEvent({ id, values }));
  const deleteEvent = propOnDeleteEvent ?? eventsHook.deleteEvent;
  const isEventSubmitting = eventsHook.isAdding || eventsHook.isUpdating;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(null);
  const [isSendingEventTest, setIsSendingEventTest] = useState(false);

  // Quản lý Drawer Thêm / Sửa sự kiện trực tiếp từ Lịch
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithMeta | null>(null);
  const [eventInitialDate, setEventInitialDate] = useState<{ day: number; month: number; year: number } | null>(null);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

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
  const [viewingDiary, setViewingDiary] = useState<DiaryEntry | null>(null);
  const [confirmDeleteDiaryId, setConfirmDeleteDiaryId] = useState<string | null>(null);
  const [isDeletingDiaryModal, setIsDeletingDiaryModal] = useState(false);

  // Xóa nhật ký thực tế khỏi DB từ modal / danh sách
  const handleDeleteDiaryEntry = async (id: string) => {
    try {
      setIsDeletingDiaryModal(true);
      await deleteDiary(id);
      setConfirmDeleteDiaryId(null);
      setViewingDiary(null);
    } catch (err: any) {
      console.error("Lỗi xóa nhật ký:", err);
    } finally {
      setIsDeletingDiaryModal(false);
    }
  };

  // Mở Drawer sửa nhật ký từ modal xem
  const handleEditDiaryFromView = (diary: DiaryEntry) => {
    setViewingDiary(null);
    setEditingDiary(diary);
    setIsDiaryOpen(true);
  };

  const getMoodInfo = (mood?: string | null) => {
    switch (mood) {
      case "happy":
        return { emoji: "😊", label: "Vui vẻ", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
      case "calm":
        return { emoji: "🌿", label: "Bình yên", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
      case "excited":
        return { emoji: "🔥", label: "Hào hứng", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
      case "sad":
        return { emoji: "🥺", label: "Trầm lắng", color: "text-sky-500 bg-sky-500/10 border-sky-500/20" };
      case "grateful":
        return { emoji: "🙏", label: "Biết ơn", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" };
      default:
        return { emoji: "📖", label: "Ghi chép", color: "text-primary bg-primary/10 border-primary/20" };
    }
  };

  const formatDiaryDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return `Ngày ${parts[2]} tháng ${parts[1]}, ${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Mở form thêm sự kiện mới với ngày đã chọn sẵn trên Lịch
  const handleAddNewEvent = () => {
    setEditingEvent(null);
    setEventInitialDate({
      day: selectedDate.getDate(),
      month: selectedDate.getMonth() + 1,
      year: selectedDate.getFullYear(),
    });
    setIsEventDrawerOpen(true);
  };

  // Mở form chỉnh sửa sự kiện
  const handleEditEvent = (ev: EventWithMeta) => {
    setEditingEvent(ev);
    setViewingEvent(null);
    setEventInitialDate(null);
    setIsEventDrawerOpen(true);
  };

  // Xóa sự kiện thực tế khỏi DB
  const handleDeleteEvent = async (id: string) => {
    try {
      setIsDeletingEvent(true);
      await deleteEvent(id);
      setConfirmDeleteEventId(null);
      setViewingEvent(null);
      toast({
        title: "Đã xóa sự kiện",
        description: "Sự kiện đã được xóa hoàn toàn khỏi cơ sở dữ liệu.",
        variant: "default",
      });
    } catch (err: any) {
      console.error("Lỗi xóa sự kiện:", err);
      toast({
        title: "Lỗi xóa sự kiện",
        description: err?.message || "Không thể xóa sự kiện lúc này.",
        variant: "error",
      });
    } finally {
      setIsDeletingEvent(false);
    }
  };

  // Lưu sự kiện (Thêm mới hoặc Cập nhật)
  const handleEventFormSubmit = async (values: EventFormValues) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, values);
    } else {
      await addEvent(values);
    }
    setIsEventDrawerOpen(false);
    setEditingEvent(null);
    setEventInitialDate(null);
  };

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

  // Kiểm tra ngày đang chọn có phải là ngày trong tương lai không (chỉ được viết nhật ký hôm nay và trước đó)
  const isDateInFuture = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return target.getTime() > today.getTime();
  };

  const isFutureDate = isDateInFuture(selectedDate);

  const handleAddNewDiary = () => {
    if (isFutureDate) {
      toast({
        title: "Không thể viết nhật ký",
        description: "Bạn chỉ có thể viết nhật ký cho ngày hôm nay hoặc các ngày trong quá khứ.",
        variant: "error",
      });
      return;
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-border/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full gradient-brand" />
            <h3 className="font-extrabold text-sm text-foreground">
              Chi tiết ngày {selectedDate.getDate()} tháng {selectedDate.getMonth() + 1}, {selectedDate.getFullYear()}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Nút 1: Thêm sự kiện mới vào ngày đang chọn */}
            <button
              type="button"
              id="btn-add-event-for-date"
              onClick={handleAddNewEvent}
              className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-soft cursor-pointer gradient-brand text-white hover:opacity-95 active:scale-95 touch-manipulation"
              title={`Thêm sự kiện mới cho ngày ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Thêm sự kiện</span>
            </button>

            {/* Nút 2: Viết thêm nhật ký (Chỉ hiện khi ngày đang chọn là hôm nay hoặc trong quá khứ) */}
            {!isFutureDate && (
              <button
                type="button"
                id="btn-add-diary-for-date"
                onClick={handleAddNewDiary}
                className="px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all bg-secondary/80 hover:bg-secondary border border-border/80 text-foreground cursor-pointer active:scale-95 touch-manipulation"
                title={`Viết nhật ký cho ngày ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`}
              >
                <PenLine className="w-3.5 h-3.5 text-primary" />
                <span>Viết thêm nhật ký</span>
              </button>
            )}
          </div>
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
            </div>

            {selectedDayDiaries.length > 0 ? (
              <div className="space-y-2">
                {selectedDayDiaries.map((diary) => {
                  const moodInfo = getMoodInfo(diary.mood);
                  return (
                    <div
                      key={diary.id}
                      onClick={() => {
                        setViewingDiary(diary);
                        setConfirmDeleteDiaryId(null);
                      }}
                      className="p-3 rounded-2xl bg-secondary/40 border border-border hover:border-primary cursor-pointer transition-colors flex items-center justify-between gap-3 group relative"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center text-primary border border-primary/20">
                          {diary.mood ? (
                            <span className="text-base select-none">{moodInfo.emoji}</span>
                          ) : (
                            <BookOpen className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-foreground truncate">
                            {diary.title || "Nhật ký không tiêu đề"}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                            {diary.created_at && (
                              <span className="flex items-center gap-1 shrink-0 font-medium">
                                <Clock className="w-3 h-3 text-primary/70" />
                                {new Date(diary.created_at).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                            {diary.created_at && <span className="text-muted-foreground/40">•</span>}
                            <span className="truncate">{diary.content}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {diary.mood ? (
                          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", moodInfo.color)}>
                            {moodInfo.emoji} {moodInfo.label}
                          </span>
                        ) : diary.created_at ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {new Date(diary.created_at).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : null}
                        {/* Nút xóa nhanh nhật ký */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingDiary(diary);
                            setConfirmDeleteDiaryId(diary.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-100"
                          title="Xóa nhật ký này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : isFutureDate ? (
              <div className="p-6 rounded-2xl border border-dashed border-border/60 flex items-center justify-center gap-2 text-muted-foreground/60 text-xs font-medium select-none">
                <BookOpen className="w-4 h-4 text-muted-foreground/40" />
                <span>Chưa thể viết nhật ký cho ngày trong tương lai</span>
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

          {/* Cột Sự kiện: Hiển thị danh sách tất cả các sự kiện trong ngày */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4" />
                Sự kiện trong ngày ({selectedDayEvents.length})
              </span>
            </div>

            {selectedDayEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setViewingEvent(ev)}
                    className="p-3 rounded-2xl bg-secondary/40 border border-border hover:border-primary cursor-pointer transition-colors flex items-center justify-between gap-3 group relative"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                        {ev.avatar_url ? (
                          <img src={ev.avatar_url} alt={ev.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full gradient-brand text-white flex items-center justify-center font-bold text-xs">
                            {ev.name?.charAt(0) || "S"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-foreground truncate">{ev.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {(ev as any).custom_group || ev.group_name} {Boolean(ev.upcomingAge && ev.upcomingAge > 0) ? `• ${ev.upcomingAge} tuổi` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {ev.daysRemaining === 0 ? "Hôm nay" : `Còn ${ev.daysRemaining} ngày`}
                      </span>
                      {/* Nút xóa nhanh sự kiện */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingEvent(ev);
                          setConfirmDeleteEventId(ev.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-100"
                        title="Xóa sự kiện này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={handleAddNewEvent}
                className="p-6 rounded-2xl border border-dashed border-border/80 hover:border-primary/60 transition-colors flex items-center justify-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground text-xs font-semibold group"
                title="Bấm để thêm sự kiện mới vào ngày này"
              >
                <Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span>Chưa có sự kiện nào cho ngày này. Bấm để thêm!</span>
              </div>
            )}
          </div>
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
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Cụm nút Thao tác bên trái: Xóa sự kiện & Sửa sự kiện */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {confirmDeleteEventId === viewingEvent.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="btn-confirm-delete-calendar-event"
                      onClick={() => handleDeleteEvent(viewingEvent.id)}
                      disabled={isDeletingEvent}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isDeletingEvent ? "Đang xóa..." : "Xác nhận xóa"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteEventId(null)}
                      className="px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-xs font-semibold hover:text-foreground cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="btn-delete-calendar-event"
                    onClick={() => setConfirmDeleteEventId(viewingEvent.id)}
                    className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa sự kiện</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleEditEvent(viewingEvent)}
                  className="px-3 py-2 rounded-xl text-primary hover:bg-primary/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa</span>
                </button>
              </div>

              {/* Cụm nút bên phải: Gửi thử email & Đóng */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSendingEventTest}
                  onClick={() => handleSendEventTestEmail(viewingEvent)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl gradient-brand text-white font-bold text-xs shadow-soft hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  title="Gửi ngay một email thông báo nhắc sự kiện này tới hộp thư của bạn"
                >
                  {isSendingEventTest ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi thử email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewingEvent(null);
                    setConfirmDeleteEventId(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal Xem Chi Tiết Nhật Ký (Chỉ Xem, Có Nút Sửa & Xóa) */}
      {viewingDiary && (
        <motion.div
          key="viewing-diary-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingDiary(null);
              setConfirmDeleteDiaryId(null);
            }
          }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[3px] p-0 sm:p-4 touch-none"
        >
          <motion.div
            key="viewing-diary-sheet"
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
                setViewingDiary(null);
                setConfirmDeleteDiaryId(null);
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
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/10 shrink-0 border border-primary/20 flex items-center justify-center text-2xl shadow-sm">
                  {getMoodInfo(viewingDiary.mood).emoji}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground tracking-tight">
                    {viewingDiary.title || "Nhật ký không tiêu đề"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Nhật ký trong ngày
                    </span>
                    {viewingDiary.mood && (
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", getMoodInfo(viewingDiary.mood).color)}>
                        {getMoodInfo(viewingDiary.mood).emoji} {getMoodInfo(viewingDiary.mood).label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingDiary(null);
                  setConfirmDeleteDiaryId(null);
                }}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content (Chỉ xem - hoàn toàn không thể sửa trực tiếp tại đây) */}
            <div className="space-y-4 my-4 overflow-y-auto pr-1">
              {/* Hộp thông tin ngày & giờ tạo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                    Ngày ghi nhật ký
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {formatDiaryDate(viewingDiary.entry_date)}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Thời gian tạo
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {viewingDiary.created_at
                      ? new Date(viewingDiary.created_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "Trong ngày"}
                  </p>
                </div>
              </div>

              {/* Nội dung bài viết nhật ký (Thuần chỉ đọc) */}
              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Nội dung nhật ký
                </span>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed select-text font-normal">
                  {viewingDiary.content}
                </p>
              </div>

              {/* Danh sách Tags nếu có */}
              {viewingDiary.tags && viewingDiary.tags.length > 0 && (
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 space-y-2">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Chủ đề & Thẻ
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingDiary.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-xl bg-card border border-border text-xs font-semibold text-primary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal: Xóa nhật ký / Chỉnh sửa / Đóng */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Cụm nút thao tác bên trái: Xóa & Sửa */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {confirmDeleteDiaryId === viewingDiary.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="btn-confirm-delete-calendar-diary"
                      onClick={() => handleDeleteDiaryEntry(viewingDiary.id)}
                      disabled={isDeletingDiaryModal}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isDeletingDiaryModal ? "Đang xóa..." : "Xác nhận xóa"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteDiaryId(null)}
                      className="px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-xs font-semibold hover:text-foreground cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="btn-delete-calendar-diary"
                    onClick={() => setConfirmDeleteDiaryId(viewingDiary.id)}
                    className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa nhật ký</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleEditDiaryFromView(viewingDiary)}
                  className="px-3 py-2 rounded-xl text-primary hover:bg-primary/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa</span>
                </button>
              </div>

              {/* Nút Đóng bên phải */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewingDiary(null);
                    setConfirmDeleteDiaryId(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
        document.body
      )}

      {/* Drawer Thêm / Sửa sự kiện trực tiếp từ Lịch */}
      <EventFormDrawer
        isOpen={isEventDrawerOpen}
        onClose={() => {
          setIsEventDrawerOpen(false);
          setEditingEvent(null);
          setEventInitialDate(null);
        }}
        onSubmit={handleEventFormSubmit}
        initialData={editingEvent}
        initialDate={eventInitialDate}
        isSubmitting={isEventSubmitting}
      />
    </div>
  );
}
