"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Inbox, X, Calendar, Mail, Clock, ShieldCheck, AlertCircle } from "lucide-react";
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
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [mounted, setMounted] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Khóa cuộn trang và chặn tương tác phía sau khi mở Bảng thông báo hoặc Modal chi tiết
  useEffect(() => {
    if (isOpen || selectedNotification) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen, selectedNotification]);

  // Báo số lượng unread ra component cha nếu cần
  useEffect(() => {
    onCountChange?.(unreadCount);
  }, [unreadCount, onCountChange]);

  // Đóng bảng thông báo hoặc modal khi bấm Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedNotification) {
          setSelectedNotification(null);
        } else if (isOpen) {
          setIsOpen(false);
          bellRef.current?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedNotification]);

  // Hiệu ứng "Đánh dấu tất cả đã đọc" xoá từng chấm một so le theo chuẩn Prompt #074
  const handleMarkAllRead = () => {
    const unreadList = notifications.filter((n) => !n.isRead);
    if (unreadList.length === 0) return;

    unreadList.forEach((item, index) => {
      setTimeout(() => {
        setClearingIds((prev) => new Set(prev).add(item.id));
      }, index * 90);
    });

    setTimeout(() => {
      markAllAsRead();
      setClearingIds(new Set());
    }, unreadList.length * 90 + 150);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.isRead;
    return true;
  });

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      {/* Nút Chuông Thông Báo */}
      <button
        ref={bellRef}
        type="button"
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center bg-secondary/80 hover:bg-secondary text-foreground hover:text-primary transition-all active:scale-95 border border-border/70 focus-visible:outline-2 focus-visible:outline-primary cursor-pointer shadow-xs"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-label={`Thông báo, ${unreadCount} thông báo mới`}
        title="Xem thông báo hệ thống"
      >
        <motion.div
          animate={
            shouldRing
              ? {
                  rotate: [0, 18, -16, 12, -8, 4, 0],
                  transition: { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] },
                }
              : {}
          }
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-foreground/80 hover:text-primary transition-colors" />
        </motion.div>

        {/* Huy hiệu số lượng */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm border-2 border-background tabular-nums"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Panel + Backdrop làm mờ toàn màn hình và khóa cuộn đằng sau */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[100] select-none" role="dialog" aria-modal="true">
              {/* Lớp phủ Backdrop làm mờ toàn bộ nền phía sau và chặn mọi tương tác click/lăn cuộn */}
              <motion.div
                key="dropdown-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
                style={{
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
                aria-label="Đóng bảng thông báo"
              />

              {/* Bảng Dropdown nổi bật trên nền mờ */}
              <motion.div
                key="dropdown-panel"
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="fixed top-16 right-3 sm:right-6 w-[calc(100vw-24px)] sm:w-[420px] h-[68vh] sm:h-[620px] max-h-[85vh] rounded-3xl bg-card border border-border/80 shadow-2xl z-[101] flex flex-col overflow-hidden"
                role="region"
                aria-label="Danh sách thông báo"
              >
              {/* Header Tabs */}
              <div className="flex items-center gap-2 p-3 pb-2.5 border-b border-border/70 bg-card/95 shrink-0">
                <div className="flex items-center gap-1.5 p-0.5 rounded-full bg-secondary/80">
                  <button
                    type="button"
                    className={`h-7 px-3 rounded-full text-xs font-bold transition-all ${
                      activeTab === "all"
                        ? "bg-foreground text-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    role="tab"
                    aria-selected={activeTab === "all"}
                    onClick={() => setActiveTab("all")}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    className={`h-7 px-3 rounded-full text-xs font-bold transition-all ${
                      activeTab === "unread"
                        ? "bg-foreground text-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    role="tab"
                    aria-selected={activeTab === "unread"}
                    onClick={() => setActiveTab("unread")}
                  >
                    Chưa đọc ({unreadCount})
                  </button>
                </div>

                <button
                  type="button"
                  className="ml-auto text-xs font-bold text-primary hover:opacity-80 disabled:opacity-40 disabled:hover:opacity-40 transition-opacity flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  disabled={unreadCount === 0}
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Đọc tất cả</span>
                </button>

                {/* Nút đóng bảng thông báo */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1 cursor-pointer"
                  title="Đóng bảng thông báo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Danh sách thông báo - kéo dài tự động chiếm trọn chiều cao 68vh */}
              <ul className="m-0 p-2.5 list-none flex-1 min-h-0 overflow-y-auto space-y-1 divide-y divide-border/30">
                {filteredNotifications.length === 0 ? (
                  <li className="py-20 px-4 text-center flex flex-col items-center justify-center h-full">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                      <Inbox className="w-6 h-6 opacity-60" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {activeTab === "unread"
                        ? "Không còn thông báo chưa đọc nào 🎉"
                        : "Chưa có thông báo nào được ghi nhận"}
                    </p>
                  </li>
                ) : (
                  filteredNotifications.map((n) => {
                    const isRead = n.isRead || clearingIds.has(n.id);

                    return (
                      <li key={n.id} className="pt-1 first:pt-0">
                        <button
                          type="button"
                          className={`relative w-full flex items-start gap-3 p-2.5 rounded-2xl text-left transition-colors cursor-pointer group ${
                            isRead
                              ? "hover:bg-secondary/50 opacity-80"
                              : "bg-primary/5 hover:bg-primary/10"
                          }`}
                          onClick={() => {
                            markAsRead(n.id);
                            setSelectedNotification(n);
                            setIsOpen(false);
                          }}
                        >
                          {/* Avatar */}
                          <div className="relative w-9 h-9 shrink-0 rounded-full bg-secondary overflow-visible">
                            <img
                              src={
                                n.avatarUrl ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                  n.eventName || "BER"
                                )}`
                              }
                              alt={n.eventName || "Avatar"}
                              className="w-full h-full rounded-full object-cover border border-border/60 bg-secondary/80"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null;
                                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                  n.eventName || "User"
                                )}`
                              }}
                            />
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-card border border-border text-[9px] flex items-center justify-center shadow-xs">
                              {n.emoji}
                            </span>
                          </div>

                          {/* Content text */}
                          <div className="flex-1 min-w-0 pr-3">
                            <p
                              className={`text-xs truncate ${
                                isRead
                                  ? "font-semibold text-muted-foreground"
                                  : "font-extrabold text-foreground"
                              }`}
                            >
                              {n.title}
                            </p>
                            <p className="text-[11.5px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                              {n.message}
                            </p>
                            <p className="text-[10px] font-semibold text-muted-foreground/70 mt-1">
                              {n.timeAgo}
                            </p>
                          </div>

                          {/* Chấm tròn chưa đọc */}
                          {!isRead && (
                            <span
                              className="w-2 h-2 rounded-full bg-primary shrink-0 self-center shadow-xs"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              {/* Chân trang liên kết đến lịch sử đầy đủ */}
              <div className="p-3 border-t border-border/70 bg-card text-center shrink-0">
                <Link
                  href="/history"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 transition-opacity"
                >
                  <span>Xem toàn bộ lịch sử thông báo</span>
                  <span>→</span>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* MODAL CHI TIẾT THÔNG BÁO VỚI LỚP PHỦ LÀM MỜ VÀ KHÓA CUỘN PHÍA SAU */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedNotification && (
            <motion.div
              key="detail-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNotification(null);
              }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md text-foreground select-none overflow-y-auto cursor-pointer"
              style={{
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
              aria-modal="true"
              role="dialog"
            >
              <motion.div
                key="detail-modal-card"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl p-6 sm:p-7 relative overflow-hidden space-y-5 my-auto cursor-default"
              >
                {/* Header Modal */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/70">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-12 h-12 rounded-2xl bg-secondary shrink-0 overflow-visible">
                      <img
                        src={
                          selectedNotification.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            selectedNotification.eventName || "BER"
                          )}`
                        }
                        alt={selectedNotification.eventName || "Avatar"}
                        className="w-full h-full rounded-2xl object-cover border border-border/80 shadow-soft"
                      />
                      <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-card border border-border text-[11px] flex items-center justify-center shadow-xs">
                        {selectedNotification.emoji}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            selectedNotification.status === "sent"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                              : selectedNotification.status === "failed"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                          }`}
                        >
                          {selectedNotification.status === "sent" ? (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>Đã gửi thành công</span>
                            </>
                          ) : selectedNotification.status === "failed" ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>Gửi thất bại</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Đang tiến hành gửi</span>
                            </>
                          )}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-70" />
                          <span>{selectedNotification.timeAgo}</span>
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base sm:text-lg text-foreground tracking-tight leading-snug">
                        {selectedNotification.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                    aria-label="Đóng chi tiết"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Thông tin Meta: Kênh gửi, Sự kiện, Thời gian chính xác */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-secondary/40 border border-border/60 text-xs">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Sự kiện liên quan:</span>
                    </p>
                    <p className="font-bold text-foreground truncate">
                      {selectedNotification.eventName || "Sự kiện BER"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span>Kênh phát thông báo:</span>
                    </p>
                    <p className="font-bold text-foreground uppercase tracking-wider">
                      {selectedNotification.channel || "EMAIL"}
                    </p>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-border/40 space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground">Thời điểm ghi nhận:</p>
                    <p className="font-semibold text-foreground text-xs">
                      {new Date(selectedNotification.timestamp).toLocaleString("vi-VN", {
                        dateStyle: "full",
                        timeStyle: "medium",
                      })}
                    </p>
                  </div>
                </div>

                {/* Nội dung thông báo chi tiết */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Nội dung chi tiết thông báo
                  </p>
                  <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {selectedNotification.message}
                  </div>
                </div>

                {/* Hộp báo lỗi nếu gửi thất bại */}
                {selectedNotification.error && (
                  <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Chi tiết nguyên nhân:</span>
                    </p>
                    <p className="leading-relaxed opacity-90">{selectedNotification.error}</p>
                  </div>
                )}

                {/* Footer hành động */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
                  <Link
                    href="/history"
                    onClick={() => setSelectedNotification(null)}
                    className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs transition-colors"
                  >
                    Xem toàn bộ lịch sử
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="px-6 py-2.5 rounded-xl gradient-brand text-white font-bold text-xs shadow-soft hover:shadow-soft-hover hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    Đã hiểu & Đóng
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
