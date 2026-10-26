// Lucian UX/UI Prompt #074 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#074
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useNotifications, AppNotification } from "@/hooks/use-notifications";

interface NotificationBellDropdownProps {
  onCountChange?: (count: number) => void;
}

export function NotificationBellDropdown({ onCountChange }: NotificationBellDropdownProps) {
  const {
    notifications,
    unreadCount,
    shouldRing,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());

  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  // Báo số lượng unread ra component cha nếu cần
  useEffect(() => {
    onCountChange?.(unreadCount);
  }, [unreadCount, onCountChange]);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        bellRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Hiệu ứng "Đánh dấu tất cả đã đọc" xoá từng chấm một so le theo chuẩn Prompt #074
  const handleMarkAllRead = () => {
    const unreadList = notifications.filter((n) => !n.isRead);
    if (unreadList.length === 0) return;

    unreadList.forEach((item, index) => {
      setTimeout(() => {
        setClearingIds((prev) => new Set(prev).add(item.id));
      }, index * 110);
    });

    setTimeout(() => {
      markAllAsRead();
      setClearingIds(new Set());
    }, unreadList.length * 110 + 200);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.isRead;
    return true;
  });

  return (
    <div
      ref={rootRef}
      className={`u074 ${isOpen ? "" : "is-closed"}`}
    >
      <style jsx>{`
        .u074 {
          --ux-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
          --ux-spring: cubic-bezier(0.34, 1.45, 0.64, 1);

          /* Token Light Mode */
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
          --ux-shadow-strong: rgba(40, 30, 80, 0.22);

          position: relative;
          display: inline-flex;
          align-items: center;
          font-family: inherit;
        }

        :global(.dark) .u074 {
          /* Token Dark Mode */
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
          --ux-shadow-strong: rgba(0, 0, 0, 0.65);
        }

        /* Nút Chuông Thông Báo */
        .u074-bell {
          position: relative;
          width: 40px;
          height: 40px;
          border: 0;
          padding: 0;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: var(--ux-surface-2);
          color: var(--ux-ink);
          box-shadow: 0 0 0 1px var(--ux-line);
          transition: transform 0.3s var(--ux-spring), background-color 0.2s;
          cursor: pointer;
        }

        .u074-bell:hover {
          background: hsl(var(--secondary) / 0.9);
          color: var(--ux-accent);
        }

        .u074-bell:active {
          transform: scale(0.92);
        }

        .u074-bell:focus-visible {
          outline: 2px solid var(--ux-accent);
          outline-offset: 2px;
        }

        .u074-bell svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          transform-origin: 50% 15%;
        }

        /* Hiệu ứng rung chuông khi có thông báo mới (Prompt #074) */
        .u074-bell.ring svg {
          animation: u074-ring 0.9s var(--ux-ease);
        }

        @keyframes u074-ring {
          10% { transform: rotate(18deg); }
          25% { transform: rotate(-16deg); }
          40% { transform: rotate(12deg); }
          55% { transform: rotate(-8deg); }
          70% { transform: rotate(4deg); }
        }

        /* Huy hiệu số lượng màu đỏ nổi bật */
        .u074-badge {
          position: absolute;
          right: -4px;
          top: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 4.5px;
          border-radius: 9px;
          background: #ff5a6e;
          color: #ffffff;
          font-size: 10px;
          font-weight: 850;
          line-height: 18px;
          text-align: center;
          box-shadow: 0 0 0 2px var(--ux-surface);
          font-variant-numeric: tabular-nums;
          transition: transform 0.4s var(--ux-spring);
        }

        .u074-badge.zero {
          transform: scale(0);
        }

        /* Menu Dropdown bung mở từ vị trí nút chuông */
        .u074-pan {
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          background: var(--ux-surface);
          box-shadow: 0 0 0 1px var(--ux-line), 0 30px 60px -20px var(--ux-shadow-strong);
          transition: transform 0.45s var(--ux-spring), opacity 0.25s;
          z-index: 100;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* Mobile màn hình hẹp: căn giữa cân đối, trỏ mũi tên chuẩn vào nút chuông */
        @media (max-width: 640px) {
          .u074-pan {
            position: fixed;
            top: 60px;
            left: 14px;
            right: 14px;
            width: auto;
            max-width: calc(100vw - 28px);
            max-height: calc(100vh - 130px);
            transform-origin: calc(100% - 88px) -10px;
          }

          .u074-pan::before {
            content: "";
            position: absolute;
            right: 88px;
            top: -6px;
            width: 12px;
            height: 12px;
            border-radius: 2px;
            background: var(--ux-surface);
            transform: rotate(45deg);
            box-shadow: -1px -1px 0 0 var(--ux-line);
            z-index: 1;
          }
        }

        /* Desktop: định vị dưới nút chuông góc phải */
        @media (min-width: 641px) {
          .u074-pan {
            position: absolute;
            right: -6px;
            top: calc(100% + 12px);
            width: 360px;
            max-height: 520px;
            transform-origin: calc(100% - 22px) -10px;
          }

          .u074-pan::before {
            content: "";
            position: absolute;
            right: 20px;
            top: -6px;
            width: 12px;
            height: 12px;
            border-radius: 2px;
            background: var(--ux-surface);
            transform: rotate(45deg);
            box-shadow: -1px -1px 0 0 var(--ux-line);
            z-index: 1;
          }
        }

        .u074.is-closed .u074-pan {
          transform: scale(0.4);
          opacity: 0;
          pointer-events: none;
          transition: transform 0.3s var(--ux-ease), opacity 0.2s;
        }

        /* Thanh Tab và nút hành động trong Dropdown */
        .u074-ph {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 14px 14px 10px;
          border-bottom: 1px solid var(--ux-line);
          background: var(--ux-surface);
        }

        .u074-tab {
          height: 30px;
          padding: 0 11px;
          border: 0;
          border-radius: 999px;
          background: none;
          font-size: 12px;
          font-weight: 750;
          color: var(--ux-ink-3);
          transition: background-color 0.2s, color 0.2s;
          cursor: pointer;
        }

        .u074-tab[aria-selected="true"] {
          background: var(--ux-ink);
          color: var(--ux-page);
        }

        .u074-all {
          margin-left: auto;
          border: 0;
          padding: 4px 6px;
          background: none;
          font-size: 11.5px;
          font-weight: 750;
          color: var(--ux-accent);
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .u074-all:disabled {
          color: var(--ux-ink-3);
          opacity: 0.5;
          cursor: default;
        }

        /* Danh sách thông báo */
        .u074-list {
          position: relative;
          margin: 0;
          padding: 8px;
          list-style: none;
          max-height: 320px;
          overflow-y: auto;
        }

        .u074-row {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          padding: 10px 24px 10px 10px;
          border: 0;
          border-radius: 16px;
          background: none;
          text-align: left;
          transition: background-color 0.2s;
          cursor: pointer;
        }

        .u074-row:hover {
          background: var(--ux-surface-2);
        }

        .u074-av {
          position: relative;
          width: 40px;
          height: 40px;
          flex: none;
          border-radius: 50%;
          background: var(--ux-surface-2);
          display: block;
        }

        .u074-av-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          box-shadow: 0 0 0 1px var(--ux-line);
          background: var(--ux-surface-3);
        }

        .u074-av em {
          position: absolute;
          right: -2px;
          bottom: -2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: var(--ux-surface);
          font-style: normal;
          font-size: 10px;
          box-shadow: 0 0 0 1.5px var(--ux-surface), 0 2px 5px rgba(0, 0, 0, 0.15);
        }

        .u074-tx {
          flex: 1;
          min-width: 0;
          font-size: 12.5px;
          line-height: 1.4;
          color: var(--ux-ink-2);
        }

        .u074-tx b {
          display: block;
          color: var(--ux-ink);
          font-weight: 750;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .u074-tx span {
          display: block;
          margin-top: 1px;
          font-size: 11.5px;
          color: var(--ux-ink-2);
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .u074-tx small {
          display: block;
          margin-top: 3px;
          font-size: 10.5px;
          font-weight: 650;
          color: var(--ux-ink-3);
        }

        /* Chấm xanh unread biến mất xoay tròn khi đọc */
        .u074-dot {
          position: absolute;
          right: 10px;
          top: 16px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--ux-accent);
          transition: transform 0.35s var(--ux-spring), opacity 0.25s;
        }

        .u074-row.read .u074-dot {
          transform: scale(0);
          opacity: 0;
        }

        .u074-row.read .u074-tx b {
          font-weight: 600;
          color: var(--ux-ink-2);
        }

        /* Chân dropdown */
        .u074-foot {
          padding: 10px 14px;
          border-top: 1px solid var(--ux-line);
          background: var(--ux-surface);
          text-align: center;
        }

        .u074-foot a {
          font-size: 11.5px;
          font-weight: 750;
          color: var(--ux-accent);
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .u074-foot a:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        .u074-empty {
          padding: 32px 16px;
          text-align: center;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ux-ink-3);
        }

        @media (prefers-reduced-motion: reduce) {
          .u074,
          .u074 :global(*),
          .u074 :global(*::before) {
            animation-duration: 0.001ms !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>

      {/* Nút Chuông Thông Báo */}
      <button
        ref={bellRef}
        type="button"
        className={`u074-bell ${shouldRing ? "ring" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Thông báo, ${unreadCount} thông báo mới`}
        title="Xem thông báo hệ thống"
      >
        <svg viewBox="0 0 22 22" aria-hidden="true">
          <path d="M5.5 15V10a5.5 5.5 0 0 1 11 0v5l1.5 1.5h-14zM9 18.5a2 2 0 0 0 4 0" />
        </svg>

        {/* Huy hiệu số lượng */}
        <span
          ref={badgeRef}
          className={`u074-badge ${unreadCount === 0 ? "zero" : ""}`}
          aria-hidden="true"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      </button>

      {/* Dropdown Panel bung mở chuẩn Prompt #074 */}
      <div className="u074-pan" role="region" aria-label="Danh sách thông báo">
        {/* Header Tabs */}
        <div className="u074-ph" role="tablist">
          <button
            type="button"
            className="u074-tab"
            role="tab"
            aria-selected={activeTab === "all"}
            onClick={() => setActiveTab("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            className="u074-tab"
            role="tab"
            aria-selected={activeTab === "unread"}
            onClick={() => setActiveTab("unread")}
          >
            Chưa đọc ({unreadCount})
          </button>
          <button
            type="button"
            className="u074-all"
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
          >
            Đọc tất cả
          </button>
        </div>

        {/* Danh sách thông báo */}
        <ul className="u074-list" aria-live="polite">
          {filteredNotifications.length === 0 ? (
            <li className="u074-empty">
              {activeTab === "unread"
                ? "Không còn thông báo chưa đọc nào 🎉"
                : "Chưa có thông báo nào được ghi nhận"}
            </li>
          ) : (
            filteredNotifications.map((n) => {
              const isRead = n.isRead || clearingIds.has(n.id);

              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`u074-row ${isRead ? "read" : ""}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <span className="u074-av" aria-hidden="true">
                      <img
                        src={
                          n.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            n.eventName || "BER"
                          )}`
                        }
                        alt={n.eventName || "Avatar"}
                        className="u074-av-img"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            n.eventName || "User"
                          )}`;
                        }}
                      />
                      <em>{n.emoji}</em>
                    </span>

                    <span className="u074-tx">
                      <b>{n.title}</b>
                      <span>{n.message}</span>
                      <small>{n.timeAgo}</small>
                    </span>

                    <span className="u074-dot" aria-hidden="true" />
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Chân trang liên kết đến lịch sử đầy đủ */}
        <div className="u074-foot">
          <Link
            href="/history"
            onClick={() => setIsOpen(false)}
          >
            Xem toàn bộ lịch sử thông báo →
          </Link>
        </div>
      </div>
    </div>
  );
}
