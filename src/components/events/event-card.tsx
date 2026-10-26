// Lucian UX/UI Prompt #071 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#071
"use client";

import { useState, useRef, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { undoManager } from "./undo-manager";

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
  const [isGone, setIsGone] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Tham chiếu trạng thái cử chỉ
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const deltaXRef = useRef(0);

  const isPointerDownRef = useRef(false);
  const isSwipingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const remainingInfo = formatDaysRemainingText(event.daysRemaining);

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

  // Khôi phục hàng khi người dùng bấm "Hoàn tác"
  const restoreRow = () => {
    setIsGone(false);
    const row = rowRef.current;
    const bg = bgRef.current;
    if (row) {
      row.style.setProperty("--x", "0px");
    }
    if (bg) {
      bg.style.setProperty("--k", "0.6");
    }
  };

  // Kích hoạt xóa sự kiện với thanh thông báo Hoàn tác (Prompt #071)
  const triggerDeleteWithUndo = () => {
    const row = rowRef.current;
    if (!row) return;

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    // Bắn hàng sang trái -110%
    row.style.setProperty("--x", "-110%");

    // Thu gọn chiều cao dòng sau khi trượt
    const rm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => {
      setIsGone(true);
    }, rm ? 0 : 160);

    // Đưa vào danh sách chờ xóa với bộ đếm 5s
    undoManager.scheduleDelete({
      id: event.id,
      name: event.name,
      restore: restoreRow,
      commit: () => onDelete(event.id),
    });
  };

  // Xử lý sự kiện bắt đầu chạm / click
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a") || e.button !== 0) return;

    isPointerDownRef.current = true;
    isSwipingRef.current = false;
    suppressClickRef.current = false;

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    deltaXRef.current = 0;
    pointerIdRef.current = e.pointerId;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;

    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    // Nếu chưa vào chế độ vuốt ngang
    if (!isSwipingRef.current) {
      // Nếu di chuyển dọc ưu thế -> Đây là cuộn trang (Native Scroll), bỏ qua vuốt ngang
      if (absY > absX && absY > 6) {
        return;
      }

      // Nếu kéo sang trái vượt ngưỡng 12px và ưu thế ngang -> Bắt đầu VUỐT XÓA (Swipe-to-delete)
      if (diffX < -12 && absX > absY * 1.2) {
        isSwipingRef.current = true;
        suppressClickRef.current = true; // Chặn click khi buông tay

        const row = rowRef.current;
        if (row) {
          try {
            row.setPointerCapture(e.pointerId);
          } catch {}
          row.classList.add("drag");
        }
      } else {
        return;
      }
    }

    // Đang trong trạng thái vuốt xóa ngang (Prompt #071)
    if (isSwipingRef.current) {
      const row = rowRef.current;
      const bg = bgRef.current;
      if (!row || !bg) return;

      deltaXRef.current = diffX;
      const dx = Math.min(0, diffX);
      const finalX = dx < -100 ? -100 + (dx + 100) * 0.6 : dx;
      row.style.setProperty("--x", `${finalX}px`);

      const k = Math.min(1.25, 0.6 + -dx / 160).toFixed(2);
      bg.style.setProperty("--k", k);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const wasSwiping = isSwipingRef.current;

    isPointerDownRef.current = false;
    isSwipingRef.current = false;

    const row = rowRef.current;
    const bg = bgRef.current;
    if (row) {
      row.classList.remove("drag");
      try {
        if (pointerIdRef.current !== null && row.hasPointerCapture(pointerIdRef.current)) {
          row.releasePointerCapture(pointerIdRef.current);
        }
      } catch {}
    }

    // Nếu vừa thực hiện thao tác vuốt xóa
    if (wasSwiping) {
      const dx = deltaXRef.current;
      if (dx < -100) {
        triggerDeleteWithUndo();
      } else {
        if (row) row.style.setProperty("--x", "0px");
        if (bg) bg.style.setProperty("--k", "0.6");
      }
      // Khóa click trong 200ms để không bị nhảy vào modal sau khi thả vuốt
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 200);
    } else {
      suppressClickRef.current = false;
      if (row) row.style.setProperty("--x", "0px");
      if (bg) bg.style.setProperty("--k", "0.6");
    }
  };

  // Xử lý khi cử chỉ bị hủy bởi hệ thống (ví dụ: trình duyệt tiếp quản scroll dọc pan-y)
  const handlePointerCancel = () => {
    isPointerDownRef.current = false;
    isSwipingRef.current = false;
    suppressClickRef.current = false;

    const row = rowRef.current;
    const bg = bgRef.current;
    if (row) {
      row.classList.remove("drag");
      row.style.setProperty("--x", "0px");
      try {
        if (pointerIdRef.current !== null && row.hasPointerCapture(pointerIdRef.current)) {
          row.releasePointerCapture(pointerIdRef.current);
        }
      } catch {}
    }
    if (bg) {
      bg.style.setProperty("--k", "0.6");
    }
  };

  // Xử lý mở xem chi tiết sự kiện qua click chuẩn của HTML (tương thích 100% PC & Mobile)
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Không mở nếu bấm vào các nút hành động con
    if ((e.target as HTMLElement).closest("button, a")) return;

    // Không mở nếu vừa thực hiện thao tác vuốt xóa
    if (suppressClickRef.current) return;

    onEdit(event);
  };

  // Hỗ trợ xóa bằng phím Delete / Backspace
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      triggerDeleteWithUndo();
    }
  };

  return (
    <div className={`u071-it ${isGone ? "gone" : ""}`}>
      <style jsx>{`
        .u071-it {
          --ux-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
          --ux-spring: cubic-bezier(0.34, 1.45, 0.64, 1);
          --ux-surface: hsl(var(--card));
          --ux-surface-2: hsl(var(--secondary));
          --ux-ink: hsl(var(--foreground));
          --ux-ink-2: hsl(var(--muted-foreground));
          --ux-ink-3: hsl(var(--muted-foreground) / 0.7);
          --ux-line: hsl(var(--border) / 0.85);
          --ux-accent: hsl(var(--primary));
          --ux-danger: #e11d48;
          --ux-shadow-strong: rgba(0, 0, 0, 0.18);

          display: grid;
          grid-template-rows: 1fr;
          transition: grid-template-rows 0.4s var(--ux-ease), opacity 0.3s;
          box-sizing: border-box;
          width: 100%;
        }

        :global(.dark) .u071-it {
          --ux-surface: hsl(var(--card));
          --ux-surface-2: hsl(var(--secondary) / 0.8);
          --ux-ink: hsl(var(--foreground));
          --ux-ink-2: hsl(var(--muted-foreground));
          --ux-ink-3: hsl(var(--muted-foreground) / 0.7);
          --ux-line: hsl(var(--border));
          --ux-accent: hsl(var(--primary));
          --ux-danger: #f43f5e;
          --ux-shadow-strong: rgba(0, 0, 0, 0.65);
        }

        .u071-it.gone {
          grid-template-rows: 0fr;
          opacity: 0;
          pointer-events: none;
        }

        .u071-wrap {
          position: relative;
          min-height: 0;
          overflow: hidden;
          border-radius: 24px;
        }

        /* Lớp nền màu đỏ xuất hiện khi vuốt sang trái */
        .u071-bg {
          position: absolute;
          inset: 2px;
          border-radius: 24px;
          background: var(--ux-danger);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 28px;
          color: #ffffff;
          z-index: 0;
          user-select: none;
        }

        .u071-bg svg {
          width: 26px;
          height: 26px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          transform: scale(var(--k, 0.6));
          transition: transform 0.2s var(--ux-spring);
        }

        /* Thẻ chính trượt theo tọa độ con trỏ */
        .u071-row {
          position: relative;
          z-index: 1;
          border-radius: 24px;
          background: var(--ux-surface);
          border: 1px solid var(--ux-line);
          transform: translateX(var(--x, 0px));
          transition: transform 0.45s var(--ux-spring), background-color 0.2s;
          touch-action: pan-y;
          user-select: none;
          -webkit-user-select: none;
          cursor: pointer;
          outline: none;
        }

        .u071-row.drag {
          transition: none;
        }

        .u071-row:focus-visible {
          box-shadow: inset 0 0 0 2px var(--ux-accent);
        }

        /* Nút xóa icon thùng rác trên Desktop khi hover */
        .u071-del {
          width: 32px;
          height: 32px;
          border: 0;
          padding: 0;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: var(--ux-surface-2);
          color: var(--ux-danger);
          box-shadow: 0 0 0 1px var(--ux-line);
          opacity: 0;
          transform: scale(0.85);
          transition: opacity 0.2s, transform 0.3s var(--ux-spring), background 0.15s;
          cursor: pointer;
        }

        .u071-row:hover .u071-del,
        .u071-row:focus-within .u071-del {
          opacity: 1;
          transform: none;
        }

        .u071-del:hover {
          background: var(--ux-danger);
          color: #ffffff;
        }

        .u071-del svg {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        @media (hover: none) {
          .u071-del {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .u071-it,
          .u071-row,
          .u071-bg svg,
          .u071-del {
            transition: none !important;
          }
        }
      `}</style>

      <div className="u071-wrap">
        {/* Lớp nền đỏ đằng sau với icon thùng rác phóng to theo độ vuốt */}
        <div ref={bgRef} className="u071-bg" aria-hidden="true">
          <svg viewBox="0 0 22 22">
            <path d="M4 6.5h14M9 6.5V4.5h4v2M6 6.5l1 11a1.5 1.5 0 0 0 1.5 1.4h5a1.5 1.5 0 0 0 1.5-1.4l1-11" />
          </svg>
        </div>

        {/* Thẻ sự kiện tương tác trượt ngang */}
        <div
          ref={rowRef}
          className={cn(
            "u071-row p-4 sm:p-5 shadow-card hover:shadow-soft-hover",
            !event.enabled && "opacity-60 grayscale-[40%]"
          )}
          tabIndex={0}
          role="button"
          aria-label={`${event.name}, ${remainingInfo.text}. Kéo sang trái hoặc nhấn Delete để xóa`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Avatar & Thông tin cơ bản */}
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/10 border border-border shrink-0 shadow-sm">
                {event.avatar_url ? (
                  <img
                    src={event.avatar_url}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
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
                      : typeLabels[event.event_type] || "Sự kiện"}
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

            {/* Huy hiệu đếm ngày & Thanh hành động desktop khi hover */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span
                className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-full border shadow-xs transition-colors",
                  remainingInfo.badgeClass
                )}
              >
                {remainingInfo.text}
              </span>

              {/* Action Buttons trên Desktop */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEnabled(event.id, !event.enabled);
                  }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title={event.enabled ? "Tắt nhắc nhở" : "Bật nhắc nhở"}
                >
                  {event.enabled ? (
                    <Bell className="w-4 h-4 text-primary" />
                  ) : (
                    <BellOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(event);
                  }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Chỉnh sửa sự kiện"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerDeleteWithUndo();
                  }}
                  className="u071-del"
                  title="Xóa sự kiện (hỗ trợ Hoàn tác)"
                  aria-label={`Xóa sự kiện ${event.name}`}
                >
                  <svg viewBox="0 0 22 22">
                    <path d="M4 6.5h14M9 6.5V4.5h4v2M6 6.5l1 11a1.5 1.5 0 0 0 1.5 1.4h5a1.5 1.5 0 0 0 1.5-1.4l1-11" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Ghi chú & Quà tặng mở rộng */}
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
        </div>
      </div>
    </div>
  );
}
