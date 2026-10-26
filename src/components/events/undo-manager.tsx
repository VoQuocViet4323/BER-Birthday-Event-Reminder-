// Lucian UX/UI Prompt #071 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#071
"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";

export interface PendingDelete {
  id: string;
  name: string;
  restore: () => void;
  commit: () => void;
}

type Listener = (batch: PendingDelete[]) => void;

class UndoManager {
  private batch: PendingDelete[] = [];
  private listeners: Set<Listener> = new Set();
  private timerRaf: number = 0;
  private lastTime: number = 0;
  private remainingMs: number = 0;
  private isPaused: boolean = false;
  private readonly DURATION = 5000; // 5 giây countdown

  // Callbacks cập nhật tiến độ cho component giao diện
  private progressListeners: Set<(ratio: number) => void> = new Set();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener([...this.batch]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeProgress(listener: (ratio: number) => void) {
    this.progressListeners.add(listener);
    listener(this.batch.length > 0 ? Math.max(0, this.remainingMs / this.DURATION) : 1);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn([...this.batch]));
  }

  private notifyProgress(ratio: number) {
    this.progressListeners.forEach((fn) => fn(ratio));
  }

  scheduleDelete(item: PendingDelete) {
    // Nếu item đã có trong batch, bỏ qua
    if (this.batch.some((b) => b.id === item.id)) return;

    this.batch.push(item);
    this.remainingMs = this.DURATION;
    this.lastTime = performance.now();
    this.isPaused = false;
    this.notify();
    this.notifyProgress(1);

    cancelAnimationFrame(this.timerRaf);
    this.startTick();
  }

  private startTick() {
    const tick = (now: number) => {
      if (this.batch.length === 0) return;

      if (!this.isPaused) {
        this.remainingMs -= now - this.lastTime;
      }
      this.lastTime = now;

      const ratio = Math.max(0, this.remainingMs / this.DURATION);
      this.notifyProgress(ratio);

      if (this.remainingMs <= 0) {
        this.commitAll();
        return;
      }

      this.timerRaf = requestAnimationFrame(tick);
    };

    this.timerRaf = requestAnimationFrame(tick);
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
    if (!paused) {
      this.lastTime = performance.now();
    }
  }

  undoAll() {
    cancelAnimationFrame(this.timerRaf);
    const toRestore = [...this.batch];
    this.batch = [];
    this.remainingMs = 0;
    this.notify();
    this.notifyProgress(0);

    // Khôi phục tất cả sự kiện về lại danh sách
    toRestore.forEach((item, index) => {
      setTimeout(() => {
        item.restore();
      }, index * 40);
    });
  }

  commitAll() {
    cancelAnimationFrame(this.timerRaf);
    const toCommit = [...this.batch];
    this.batch = [];
    this.remainingMs = 0;
    this.notify();
    this.notifyProgress(0);

    // Thực thi xóa vĩnh viễn trên cơ sở dữ liệu
    toCommit.forEach((item) => {
      item.commit();
    });
  }
}

export const undoManager = new UndoManager();

/**
 * Global Snackbar hiển thị đếm ngược và nút Hoàn tác theo Prompt #071
 * Đặt vị trí nổi cao hơn thanh Mobile Bottom Navigation (bottom-24 / 96px) để không bị che
 */
export function UndoSnackbarPortal() {
  const [batch, setBatch] = useState<PendingDelete[]>([]);
  const [progress, setProgress] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubBatch = undoManager.subscribe(setBatch);
    const unsubProgress = undoManager.subscribeProgress(setProgress);
    return () => {
      unsubBatch();
      unsubProgress();
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const isOpen = batch.length > 0;
  const message =
    batch.length === 1
      ? `Đã xóa "${batch[0].name}"`
      : `${batch.length} sự kiện đã xóa`;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-x-0 bottom-24 md:bottom-7 z-50 flex justify-center px-4 pointer-events-none select-none">
          <motion.div
            initial={{ y: 36, opacity: 0, scale: 0.94 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              transition: { duration: 0.45, ease: [0.34, 1.45, 0.64, 1] },
            }}
            exit={{
              y: 36,
              opacity: 0,
              scale: 0.94,
              transition: { duration: 0.25, ease: "easeIn" },
            }}
            onPointerEnter={() => undoManager.setPaused(true)}
            onPointerLeave={() => undoManager.setPaused(false)}
            onFocus={() => undoManager.setPaused(true)}
            onBlur={() => undoManager.setPaused(false)}
            className="pointer-events-auto flex items-center justify-between gap-3 w-full max-w-sm sm:max-w-md h-14 pl-4 pr-2 rounded-2xl bg-zinc-900/95 dark:bg-zinc-800/95 text-zinc-100 shadow-2xl border border-white/10 backdrop-blur-xl"
            role="status"
            aria-live="polite"
          >
            {/* Thông báo sự kiện đã xóa */}
            <p className="text-xs sm:text-sm font-bold text-zinc-100 truncate flex-1 tracking-tight mr-1">
              {message}
            </p>

            {/* Nút Hoàn tác kèm vòng tròn SVG đếm ngược 5 giây */}
            <button
              type="button"
              onClick={() => undoManager.undoAll()}
              className="h-10 px-3.5 rounded-xl inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 text-sky-400 hover:text-sky-300 font-extrabold text-xs sm:text-sm transition-all cursor-pointer shrink-0"
              title="Khôi phục lại sự kiện đã xóa"
            >
              {/* SVG Ring Countdown 5s */}
              <svg className="w-5 h-5 -rotate-90 shrink-0" viewBox="0 0 22 22" aria-hidden="true">
                <circle
                  cx="11"
                  cy="11"
                  r="8.5"
                  className="stroke-white/20"
                  strokeWidth="2.6"
                  fill="none"
                />
                <circle
                  cx="11"
                  cy="11"
                  r="8.5"
                  className="stroke-sky-400"
                  strokeWidth="2.6"
                  fill="none"
                  strokeDasharray="100"
                  strokeDashoffset={100 - progress * 100}
                  strokeLinecap="round"
                />
              </svg>
              <span>Hoàn tác</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
