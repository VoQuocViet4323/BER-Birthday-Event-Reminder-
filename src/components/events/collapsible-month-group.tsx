// Lucian UX/UI Prompt #037 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#037
"use client";

import { useRef, useEffect } from "react";
import { EventWithMeta } from "@/types/events";
import { EventCard } from "./event-card";

interface CollapsibleMonthGroupProps {
  monthNum: number;
  monthTitle: string;
  monthEvents: EventWithMeta[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (event: EventWithMeta) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
}

// Bảng màu gradient rực rỡ riêng biệt cho 12 tháng theo tinh thần #037
const MONTH_GRADIENTS: Record<number, string> = {
  1: "linear-gradient(140deg,#8B6CFF,#5B8CFF)",
  2: "linear-gradient(140deg,#EC4899,#F43F5E)",
  3: "linear-gradient(140deg,#10B981,#059669)",
  4: "linear-gradient(140deg,#F59E0B,#D97706)",
  5: "linear-gradient(140deg,#6366F1,#8B5CF6)",
  6: "linear-gradient(140deg,#06B6D4,#0284C7)",
  7: "linear-gradient(140deg,#F43F5E,#E11D48)",
  8: "linear-gradient(140deg,#84CC16,#65A30D)",
  9: "linear-gradient(140deg,#3B82F6,#2563EB)",
  10: "linear-gradient(140deg,#A855F7,#EC4899)",
  11: "linear-gradient(140deg,#14B8A6,#0D9488)",
  12: "linear-gradient(140deg,#F97316,#EA580C)",
};

export function CollapsibleMonthGroup({
  monthNum,
  monthTitle,
  monthEvents,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleEnabled,
}: CollapsibleMonthGroupProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const hlBarRef = useRef<HTMLLIElement>(null);

  const gradient = MONTH_GRADIENTS[monthNum] || "linear-gradient(140deg,#8B6CFF,#5B8CFF)";

  // Quản lý thanh highlight bar theo vị trí chuột theo chuẩn #037
  const handleItemPointerEnter = (e: React.PointerEvent<HTMLLIElement>) => {
    const list = listRef.current;
    const bar = hlBarRef.current;
    if (!list || !bar) return;

    const item = e.currentTarget;
    bar.style.setProperty("--y", `${item.offsetTop}px`);
    bar.style.setProperty("--h", `${item.offsetHeight}px`);
    list.classList.add("is-hl");
  };

  const handleListPointerLeave = () => {
    if (listRef.current) {
      listRef.current.classList.remove("is-hl");
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    } else if (e.key === "Escape" && isExpanded) {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      ref={rootRef}
      className={`u037 ${isExpanded ? "is-open" : ""}`}
      onKeyDown={handleKeyDown}
    >
      <style jsx>{`
        .u037 {
          --ux-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
          --ux-spring: cubic-bezier(0.34, 1.45, 0.64, 1);

          /* Ánh xạ token màu Light Mode */
          --ux-page: hsl(var(--background));
          --ux-surface: hsl(var(--card));
          --ux-surface-2: hsl(var(--secondary));
          --ux-surface-3: hsl(var(--muted));
          --ux-ink: hsl(var(--foreground));
          --ux-ink-2: hsl(var(--muted-foreground));
          --ux-ink-3: hsl(var(--muted-foreground) / 0.7);
          --ux-line: hsl(var(--border) / 0.85);
          --ux-line-2: hsl(var(--border));
          --ux-accent: hsl(var(--primary));
          --ux-accent-soft: hsl(var(--primary) / 0.12);
          --ux-shadow: rgba(40, 30, 80, 0.08);
          --ux-shadow-strong: rgba(40, 30, 80, 0.18);

          position: relative;
          width: 100%;
          font-family: inherit;
          box-sizing: border-box;
        }

        :global(.dark) .u037 {
          /* Ánh xạ token màu Dark Mode */
          --ux-page: hsl(var(--background));
          --ux-surface: hsl(var(--card));
          --ux-surface-2: hsl(var(--secondary) / 0.8);
          --ux-surface-3: hsl(var(--muted));
          --ux-ink: hsl(var(--foreground));
          --ux-ink-2: hsl(var(--muted-foreground));
          --ux-ink-3: hsl(var(--muted-foreground) / 0.7);
          --ux-line: hsl(var(--border));
          --ux-line-2: hsl(var(--border) / 0.9);
          --ux-accent: hsl(var(--primary));
          --ux-accent-soft: hsl(var(--primary) / 0.18);
          --ux-shadow: rgba(0, 0, 0, 0.35);
          --ux-shadow-strong: rgba(0, 0, 0, 0.65);
        }

        /* Nút Chip trigger ở đầu nhóm */
        .u037-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 60px;
          padding: 0 14px 0 12px;
          border: 0;
          border-radius: 22px;
          background: var(--ux-surface);
          color: var(--ux-ink);
          text-align: left;
          box-shadow: 0 0 0 1px var(--ux-line), 0 12px 24px -18px var(--ux-shadow-strong);
          transition: transform 0.4s var(--ux-spring), box-shadow 0.3s;
          cursor: pointer;
          user-select: none;
        }

        .u037-chip:hover {
          box-shadow: 0 0 0 1px var(--ux-line-2), 0 16px 30px -18px var(--ux-shadow-strong);
        }

        .u037-chip:active {
          transform: scale(0.985);
        }

        .u037-chip:focus-visible {
          outline: 2px solid var(--ux-accent);
          outline-offset: 3px;
        }

        /* Badge hình vuông bo tròn chứa chữ số tháng */
        .u037-ws {
          width: 38px;
          height: 38px;
          flex: none;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 800;
          color: #ffffff;
          background: var(--c);
          box-shadow: 0 4px 12px -3px rgba(0, 0, 0, 0.25);
          transition: transform 0.45s var(--ux-spring);
        }

        .u037.is-open .u037-ws {
          transform: scale(1.04);
        }

        .u037-text {
          flex: 1;
          min-width: 0;
        }

        .u037-text b {
          display: block;
          font-size: 15px;
          font-weight: 800;
          color: var(--ux-ink);
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .u037-text small {
          display: block;
          margin-top: 1px;
          font-size: 12px;
          font-weight: 600;
          color: var(--ux-ink-3);
        }

        /* Mũi tên Caret xoay mượt với spring */
        .u037-car {
          margin-left: auto;
          width: 20px;
          height: 20px;
          fill: none;
          stroke: var(--ux-ink-2);
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          transition: transform 0.45s var(--ux-spring), stroke 0.2s;
        }

        .u037.is-open .u037-car {
          transform: rotate(180deg);
          stroke: var(--ux-accent);
        }

        /* Container Menu xổ ra phía dưới */
        .u037-menu {
          position: relative;
          margin-top: 8px;
          padding: 8px;
          border-radius: 22px;
          background: var(--ux-surface);
          box-shadow: 0 0 0 1px var(--ux-line), 0 20px 48px -20px var(--ux-shadow-strong);
          transform-origin: 30px 0%;
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          pointer-events: none;
          transform: translateY(-8px) scale(0.98);
          visibility: hidden;
          transition: opacity 0.2s var(--ux-ease), transform 0.45s var(--ux-spring),
            max-height 0.45s var(--ux-spring), visibility 0s 0.45s;
        }

        .u037.is-open .u037-menu {
          opacity: 1;
          max-height: 2500px;
          overflow: visible;
          pointer-events: auto;
          transform: none;
          visibility: visible;
          transition: opacity 0.2s var(--ux-ease), transform 0.5s var(--ux-spring),
            max-height 0.5s var(--ux-spring);
        }

        /* Tiêu đề mục */
        .u037-sec {
          margin: 6px 10px 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ux-ink-3);
        }

        /* Danh sách sự kiện */
        .u037-list {
          position: relative;
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        @media (min-width: 768px) {
          .u037-list {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Highlight bar chạy theo con trỏ */
        .u037-hl {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: var(--h, 60px);
          border-radius: 16px;
          background: var(--ux-surface-2);
          transform: translateY(var(--y, 0));
          opacity: 0;
          transition: transform 0.3s var(--ux-spring), height 0.3s var(--ux-spring),
            opacity 0.2s;
          pointer-events: none;
          z-index: 0;
        }

        .u037-list.is-hl .u037-hl {
          opacity: 0.6;
        }

        /* Từng item thẻ sự kiện bay vào so le (Stagger float in) */
        .u037-it {
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.25s var(--ux-ease), transform 0.45s var(--ux-spring);
        }

        .u037.is-open .u037-it {
          opacity: 1;
          transform: none;
          transition-delay: calc(var(--i) * 32ms);
        }

        /* Tối ưu khi người dùng kích hoạt prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .u037,
          .u037 :global(*),
          .u037 :global(*::before),
          .u037 :global(*::after) {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* Chip Trigger bo tròn kiểu Prompt #037 */}
      <button
        type="button"
        className="u037-chip"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-haspopup="true"
        aria-label={`Tháng ${monthNum}: ${monthEvents.length} sự kiện. Nhấn để ${
          isExpanded ? "thu gọn" : "mở rộng"
        }`}
      >
        <span
          className="u037-ws"
          style={{ "--c": gradient } as React.CSSProperties}
          aria-hidden="true"
        >
          {monthNum}
        </span>
        <span className="u037-text">
          <b>{monthTitle}</b>
          <small>{monthEvents.length} sự kiện · Nhấn để {isExpanded ? "thu gọn" : "xổ ra"}</small>
        </span>
        <svg className="u037-car" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M6 12l4-4 4 4" />
        </svg>
      </button>

      {/* Menu / Container bung xuống chứa danh sách sự kiện */}
      <div className="u037-menu" role="region" aria-label={`Sự kiện ${monthTitle}`}>
        <p className="u037-sec">Sự kiện trong tháng ({monthEvents.length})</p>

        <ul
          ref={listRef}
          className="u037-list"
          onPointerLeave={handleListPointerLeave}
        >
          <li ref={hlBarRef} className="u037-hl" role="presentation" />

          {monthEvents.map((ev, index) => (
            <li
              key={ev.id}
              className="u037-it"
              style={{ "--i": index } as React.CSSProperties}
              onPointerEnter={handleItemPointerEnter}
            >
              <EventCard
                event={ev}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleEnabled={onToggleEnabled}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
