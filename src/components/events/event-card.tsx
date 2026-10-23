"use client";

import { useState } from "react";
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
import { motion, useMotionValue, useTransform } from "framer-motion";
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
  const remainingInfo = formatDaysRemainingText(event.daysRemaining);

  // Group styling badges
  const groupStyles: Record<string, string> = {
    "Gia đình": "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60",
    "Bạn bè": "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60",
    "Đồng nghiệp": "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/60",
    Khác: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60",
  };

  const typeLabels: Record<string, string> = {
    birthday: "🎂 Sinh nhật",
    anniversary: "💍 Kỷ niệm",
    memorial: "🕯️ Ngày giỗ",
    other: "🌟 Sự kiện",
  };

  // Motion swipe coordinates for mobile gestures
  const x = useMotionValue(0);
  const backgroundOpacity = useTransform(x, [-100, 0, 100], [1, 0, 1]);

  return (
    <div className="relative overflow-hidden rounded-3xl group">
      {/* Background Action Reveal for Mobile Swipe */}
      <motion.div
        style={{ opacity: backgroundOpacity }}
        className="absolute inset-0 flex items-center justify-between px-6 rounded-3xl pointer-events-none"
      >
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
          <Edit2 className="w-4 h-4" />
          <span>Sửa</span>
        </div>
        <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
          <Trash2 className="w-4 h-4" />
          <span>Xóa</span>
        </div>
      </motion.div>

      {/* Main Interactive Card */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={(_e, info) => {
          if (info.offset.x > 80) {
            onEdit(event);
          } else if (info.offset.x < -80) {
            onDelete(event.id);
          }
        }}
        className={cn(
          "relative bg-card rounded-3xl border border-border/80 p-4 sm:p-5 shadow-card hover:shadow-soft-hover transition-all duration-200",
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
                  {typeLabels[event.event_type] || "Sự kiện"}
                </span>
                {event.is_lunar && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50">
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

                {event.upcomingAge && (
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
                  {event.group_name}
                </span>
              </div>
            </div>
          </div>

          {/* Right badge & Desktop Hover Action Bar */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-full border shadow-2xs",
                remainingInfo.badgeClass
              )}
            >
              {remainingInfo.text}
            </span>

            {/* Desktop Action Buttons (Visible on hover) */}
            <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onToggleEnabled(event.id, !event.enabled)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title={event.enabled ? "Tắt nhắc nhở" : "Bật nhắc nhở"}
              >
                {event.enabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button
                onClick={() => onEdit(event)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Chỉnh sửa"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(event.id)}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
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
              onClick={() => setShowDetails(!showDetails)}
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
    </div>
  );
}
