"use client";

import { useState, useRef } from "react";
import { EventWithMeta } from "@/types/events";
import { formatDaysRemainingText } from "@/lib/utils";
import {
  Edit2,
  Trash2,
  Bell,
  BellOff,
  Calendar,
  Gift,
  FileText,
  Moon,
} from "lucide-react";
import { motion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: EventWithMeta;
  onEdit: (event: EventWithMeta) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
}

export function EventCard({
  event,
  onEdit,
  onDelete,
  onToggleEnabled,
}: EventCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDraggingRef = useRef(false);
  const controls = useAnimationControls();

  const remainingInfo = formatDaysRemainingText(event.daysRemaining);

  // Group styling badges
  const groupStyles: Record<string, string> = {
    "Gia đình": "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40",
    "Bạn bè": "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
    "Đồng nghiệp": "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40",
    Khác: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40",
  };

  const typeLabels: Record<string, string> = {
    birthday: "🎂 Sinh nhật",
    anniversary: "💍 Kỷ niệm",
    memorial: "🕯️ Ngày giỗ",
    other: "🌟 Sự kiện",
  };

  // Xử lý xác nhận xóa (chạy animation mượt mà trước khi kích hoạt onDelete)
  const executeDelete = async () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
    setIsDeleting(true);
    await controls.start({
      x: -420,
      opacity: 0,
      transition: { duration: 0.22, ease: "easeOut" },
    });
    onDelete(event.id);
  };

  // Xử lý kết thúc thao tác vuốt (iOS Swipe Physics)
  const handleDragEnd = async (_e: any, info: any) => {
    // Đặt độ trễ nhỏ để tránh bắt nhầm click sau khi drag
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);

    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    // 1. VUỐT MẠNH HOẶC VUỐT DÀI SANG TRÁI -> XÓA LUÔN TỨC THÌ (iOS Full Swipe)
    if (offsetX < -150 || velocityX < -450) {
      await executeDelete();
      return;
    }

    // 2. VUỐT NHẸ SANG TRÁI -> KHỰNG LẠI 1 NHỊP Ở -82px (iOS Action Reveal)
    if (offsetX < -35 || (isOpen && offsetX < 20)) {
      setIsOpen(true);
      controls.start({
        x: -82,
        transition: { type: "spring", stiffness: 450, damping: 35 },
      });
      return;
    }

    // 3. VUỐT NGƯỢC LẠI HOẶC VUỐT CHƯA ĐỦ LỰC -> HỒI VỊ TỰ NHIÊN VỀ 0
    setIsOpen(false);
    controls.start({
      x: 0,
      transition: { type: "spring", stiffness: 450, damping: 35 },
    });
  };

  // Nhấp vào thẻ (Nếu đang hé mở nút xóa thì đóng lại, nếu không thì mở form sửa)
  const handleCardClick = () => {
    if (isDraggingRef.current) return;
    if (isOpen) {
      setIsOpen(false);
      controls.start({
        x: 0,
        transition: { type: "spring", stiffness: 450, damping: 35 },
      });
      return;
    }
    onEdit(event);
  };

  return (
    <motion.div
      animate={isDeleting ? { height: 0, opacity: 0, marginBottom: 0 } : { height: "auto", opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative overflow-hidden rounded-3xl group select-none"
    >
      {/* Background Action Button (Nút "Xóa" màu đỏ kiểu Apple iOS) */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 z-0 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            executeDelete();
          }}
          className="h-[calc(100%-14px)] w-[72px] rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex flex-col items-center justify-center gap-1 font-bold text-xs shadow-md transition-all duration-150 active:bg-rose-700"
          title="Xóa sự kiện"
        >
          <Trash2 className="w-4 h-4 stroke-[2.5]" />
          <span>Xóa</span>
        </button>
      </div>

      {/* Main Interactive Card (Khóa cứng trục cuộn, mượt 120fps trên mobile) */}
      <motion.div
        animate={controls}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -320, right: 0 }}
        dragElastic={{ left: 0.15, right: 0.04 }}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        style={{
          touchAction: "pan-y",
          willChange: "transform",
        }}
        className={cn(
          "relative bg-card rounded-3xl border border-border/80 p-4 sm:p-5 shadow-card hover:shadow-soft-hover transition-colors duration-150 cursor-pointer active:scale-[0.99] z-10",
          !event.enabled && "opacity-60 grayscale-[40%]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Avatar and Event Basic Info */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/10 border border-border shrink-0 shadow-sm">
              {event.avatar_url ? (
                <img src={event.avatar_url} alt={event.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-brand text-white flex items-center justify-center font-bold text-lg">
                  {event.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  {event.event_type === "other" && (event as any).custom_type
                    ? `🌟 ${(event as any).custom_type}`
                    : (typeLabels[event.event_type] || "Sự kiện")}
                </span>
                {event.is_lunar && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                    <Moon className="w-2.5 h-2.5" /> Âm lịch
                  </span>
                )}
              </div>

              <h3 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                {event.name}
              </h3>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-primary/70" />
                  {event.displayDate}
                </span>

                {Boolean(event.upcomingAge && event.upcomingAge > 0) && (
                  <span className="text-primary font-bold">
                    • {event.upcomingAge} tuổi
                  </span>
                )}

                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    groupStyles[event.group_name] || groupStyles["Khác"]
                  )}
                >
                  {(event as any).custom_group || event.group_name}
                </span>
              </div>
            </div>
          </div>

          {/* Right badge & Desktop Hover Action Bar */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-full border shadow-xs transition-colors",
                remainingInfo.badgeClass
              )}
            >
              {remainingInfo.text}
            </span>

            {/* Desktop Action Buttons (Visible on hover) */}
            <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEnabled(event.id, !event.enabled);
                }}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title={event.enabled ? "Tắt nhắc nhở" : "Bật nhắc nhở"}
              >
                {event.enabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(event);
                }}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Chỉnh sửa"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeDelete();
                }}
                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                title="Xóa sự kiện"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Notes / Gift section */}
        {(event.note || event.gift_idea) && (
          <div className="mt-3 pt-2.5 border-t border-border/50">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              {showDetails ? "Ẩn ghi chú & quà tặng" : "Xem ghi chú & gợi ý quà tặng"}
            </button>

            {showDetails && (
              <div className="mt-2 p-3 rounded-2xl bg-secondary/50 text-xs space-y-1.5 border border-border/50">
                {event.note && (
                  <p className="flex items-start gap-1.5 text-foreground/80">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span><strong>Ghi chú:</strong> {event.note}</span>
                  </p>
                )}
                {event.gift_idea && (
                  <p className="flex items-start gap-1.5 text-foreground/80">
                    <Gift className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span><strong>Gợi ý quà:</strong> {event.gift_idea}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
