"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Calendar as CalendarIcon, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface IosDatePickerProps {
  day: number; // 1 - 31
  month: number; // 1 - 12
  year?: number | null; // e.g. 2026
  isLunar?: boolean;
  onChange: (date: { day: number; month: number; year: number }) => void;
  className?: string;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
}

const ITEM_HEIGHT = 42; // Chiều cao mỗi dòng theo chuẩn Apple iOS Wheels (42px)
const RADIUS = 105; // Bán kính hình trụ 3D (Cylinder Radius) chuẩn iOS UIKit
const MIN_YEAR = 1920;
const MAX_YEAR = 2050;
const YEARS_COUNT = MAX_YEAR - MIN_YEAR + 1;

/**
 * Trình quản lý âm thanh cơ học Taptic Engine và phản hồi rung xúc giác chuẩn Apple iOS
 */
class CupertinoHaptics {
  private static audioCtx: AudioContext | null = null;
  private static lastTickTime = 0;

  static playTick() {
    try {
      if (typeof window === "undefined") return;
      const now = performance.now();
      if (now - this.lastTickTime < 32) return;
      this.lastTickTime = now;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(760, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.012);

      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.013);
    } catch {
      // Ignore audio errors
    }
  }

  static trigger() {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(8);
      } catch {}
    }
    this.playTick();
  }
}

/**
 * Cột con lăn 3D Apple Drum Wheel (UIDatePickerStyle.wheels)
 */
interface WheelColumnProps {
  itemsCount: number;
  value: number; // 0 to itemsCount - 1
  onChange: (index: number) => void;
  formatItem: (index: number) => string;
  label: string;
  loop?: boolean;
}

function WheelColumn({ itemsCount, value, onChange, formatItem, label, loop = true }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<number>(value);
  const offsetRef = useRef<number>(value);
  offsetRef.current = offset;

  const lastHapticRef = useRef<number>(value);
  const animFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(value);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  // Đồng bộ khi prop `value` thay đổi từ bên ngoài (khi không kéo & không đang chạy animation nội bộ)
  useEffect(() => {
    if (!isDraggingRef.current && !isAnimatingRef.current) {
      if (loop) {
        const currentNorm = ((Math.round(offsetRef.current) % itemsCount) + itemsCount) % itemsCount;
        if (currentNorm !== value) {
          let diff = value - currentNorm;
          if (diff > itemsCount / 2) diff -= itemsCount;
          if (diff < -itemsCount / 2) diff += itemsCount;
          const target = Math.round(offsetRef.current) + diff;
          setOffset(target);
          lastHapticRef.current = target;
        }
      } else {
        const currentVal = Math.round(offsetRef.current);
        if (currentVal !== value) {
          setOffset(value);
          lastHapticRef.current = value;
        }
      }
    }
  }, [value, itemsCount, loop]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const animateTo = useCallback(
    (targetIndex: number) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      let target = targetIndex;
      if (!loop) {
        target = Math.max(0, Math.min(itemsCount - 1, target));
      }

      isAnimatingRef.current = true;
      let current = offsetRef.current;
      let velocity = 0;

      const step = () => {
        const force = (target - current) * 0.28;
        velocity = (velocity + force) * 0.72;
        current += velocity;

        setOffset(current);

        const rounded = Math.round(current);
        if (rounded !== lastHapticRef.current) {
          lastHapticRef.current = rounded;
          CupertinoHaptics.trigger();
        }

        // Dừng chính xác khi sai số dưới 0.004 item (~0.16px)
        if (Math.abs(velocity) < 0.003 && Math.abs(target - current) < 0.003) {
          setOffset(target);
          const normalized = loop ? (((target % itemsCount) + itemsCount) % itemsCount) : target;
          onChange(normalized);
          isAnimatingRef.current = false;
          animFrameRef.current = null;
          return;
        }

        animFrameRef.current = requestAnimationFrame(step);
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [itemsCount, onChange, loop]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startYRef.current = e.clientY;
    startOffsetRef.current = offsetRef.current;
    lastYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
      isAnimatingRef.current = false;
    }

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const now = performance.now();
    const dy = e.clientY - startYRef.current;
    if (Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }

    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      const instantV = (e.clientY - lastYRef.current) / dt;
      // Bộ lọc low-pass mượt mà vận tốc
      velocityRef.current = velocityRef.current * 0.35 + instantV * 0.65;
      lastYRef.current = e.clientY;
      lastTimeRef.current = now;
    }

    let newOffset = startOffsetRef.current - dy / ITEM_HEIGHT;

    // Giảm độ trượt đàn hồi (Rubber-band) nếu không lặp vô tận
    if (!loop) {
      if (newOffset < 0) {
        newOffset = newOffset * 0.25;
      } else if (newOffset > itemsCount - 1) {
        newOffset = itemsCount - 1 + (newOffset - (itemsCount - 1)) * 0.25;
      }
    }

    setOffset(newOffset);

    const rounded = Math.round(newOffset);
    if (rounded !== lastHapticRef.current) {
      lastHapticRef.current = rounded;
      CupertinoHaptics.trigger();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const now = performance.now();
    const timeSinceLastMove = now - lastTimeRef.current;
    const v = velocityRef.current;

    let target: number;
    // QUY TẮC CỐT LÕI:
    // Nếu người dùng dừng lại trước khi nhả tay (> 60ms) hoặc kéo từ từ (vận tốc < 0.22 px/ms):
    // -> TUYỆT ĐỐI KHÔNG DÙNG QUÁN TÍNH! Snap chính xác 100% vào số đang hiển thị ở tâm!
    if (timeSinceLastMove > 60 || Math.abs(v) < 0.22) {
      target = Math.round(offsetRef.current);
    } else {
      // Chỉ khi người dùng vuốt nhanh (flick gesture) thì mới lướt theo quán tính vừa phải
      const momentum = (v * 70) / ITEM_HEIGHT;
      const clampedMomentum = Math.max(-4, Math.min(4, momentum));
      target = Math.round(offsetRef.current - clampedMomentum);
    }

    if (!loop) {
      target = Math.max(0, Math.min(itemsCount - 1, target));
    }

    animateTo(target);
  };

  // Cuộn bằng con lăn chuột (Mouse Wheel) với { passive: false } để tránh cảnh báo passive listener của Chrome
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const dir = e.deltaY > 0 ? 1 : -1;
      let nextTarget = Math.round(offsetRef.current) + dir;
      if (!loop) {
        nextTarget = Math.max(0, Math.min(itemsCount - 1, nextTarget));
      }
      animateTo(nextTarget);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [loop, itemsCount, animateTo]);

  const handleItemClick = (index: number) => {
    if (hasMovedRef.current) return;
    let nextTarget = index;
    if (!loop) {
      nextTarget = Math.max(0, Math.min(itemsCount - 1, index));
    }
    animateTo(nextTarget);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let delta = 0;
    if (e.key === "ArrowUp") delta = -1;
    else if (e.key === "ArrowDown") delta = 1;
    else if (e.key === "PageUp") delta = -5;
    else if (e.key === "PageDown") delta = 5;

    if (delta !== 0) {
      e.preventDefault();
      let nextTarget = Math.round(offsetRef.current) + delta;
      if (!loop) {
        nextTarget = Math.max(0, Math.min(itemsCount - 1, nextTarget));
      }
      animateTo(nextTarget);
    }
  };

  const centerIndex = Math.round(offset);
  const visibleIndices: number[] = [];
  for (let i = centerIndex - 3; i <= centerIndex + 3; i++) {
    if (!loop) {
      if (i >= 0 && i < itemsCount) {
        visibleIndices.push(i);
      }
    } else {
      visibleIndices.push(i);
    }
  }

  return (
    <div
      ref={containerRef}
      role="spinbutton"
      aria-label={`Chọn ${label}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative flex-1 h-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-xl"
      style={{
        touchAction: "none",
        transformStyle: "preserve-3d",
      }}
    >
      {visibleIndices.map((i) => {
        const diff = i - offset;
        const absDiff = Math.abs(diff);

        const angleDeg = diff * 22;
        const angleRad = (angleDeg * Math.PI) / 180;
        const y = RADIUS * Math.sin(angleRad);
        const z = RADIUS * (Math.cos(angleRad) - 1);
        const scale = Math.max(0.72, 1 - absDiff * 0.05);
        const opacity = Math.max(0, Math.pow(Math.cos(angleRad), 2.2));
        const valIndex = loop ? (((i % itemsCount) + itemsCount) % itemsCount) : i;

        const isCenter = absDiff < 0.45;

        return (
          <div
            key={i}
            onClick={() => handleItemClick(i)}
            className={cn(
              "absolute left-0 right-0 flex items-center justify-center font-mono select-none transition-colors duration-100",
              isCenter
                ? "text-xl sm:text-2xl font-black text-foreground tracking-tight drop-shadow-xs"
                : "text-base sm:text-lg font-semibold text-muted-foreground/75"
            )}
            style={{
              height: `${ITEM_HEIGHT}px`,
              top: "50%",
              marginTop: `-${ITEM_HEIGHT / 2}px`,
              transform: `translate3d(0, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${-angleDeg.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
              opacity: opacity.toFixed(3),
              pointerEvents: absDiff < 2.5 ? "auto" : "none",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              WebkitFontSmoothing: "antialiased",
            }}
          >
            {formatItem(valIndex)}
          </div>
        );
      })}
    </div>
  );
}

export function IosDatePicker({
  day = 1,
  month = 1,
  year = new Date().getFullYear(),
  isLunar = false,
  onChange,
  className,
  defaultOpen = false,
  headerRight,
}: IosDatePickerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const safeYear = year && year >= MIN_YEAR && year <= MAX_YEAR ? year : new Date().getFullYear();
  const safeMonth = month >= 1 && month <= 12 ? month : 1;
  const initialMaxDays = new Date(safeYear, safeMonth, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), initialMaxDays);

  const [selectedDay, setSelectedDay] = useState<number>(safeDay);
  const [selectedMonth, setSelectedMonth] = useState<number>(safeMonth);
  const [selectedYear, setSelectedYear] = useState<number>(safeYear);

  const maxDays = useMemo(
    () => new Date(selectedYear, selectedMonth, 0).getDate(),
    [selectedYear, selectedMonth]
  );

  useEffect(() => {
    setSelectedDay(safeDay);
    setSelectedMonth(safeMonth);
    setSelectedYear(safeYear);
  }, [safeDay, safeMonth, safeYear]);

  const emitChange = useCallback(
    (d: number, m: number, y: number) => {
      const currentMax = new Date(y, m, 0).getDate();
      const clampedD = Math.min(d, currentMax);
      onChange({ day: clampedD, month: m, year: y });
    },
    [onChange]
  );

  const handleDayChange = (dayIndex: number) => {
    const newDay = dayIndex + 1;
    setSelectedDay(newDay);
    emitChange(newDay, selectedMonth, selectedYear);
  };

  const handleMonthChange = (monthIndex: number) => {
    const newMonth = monthIndex + 1;
    const currentMax = new Date(selectedYear, newMonth, 0).getDate();
    const clampedDay = Math.min(selectedDay, currentMax);
    if (clampedDay !== selectedDay) {
      setSelectedDay(clampedDay);
    }
    setSelectedMonth(newMonth);
    emitChange(clampedDay, newMonth, selectedYear);
  };

  const handleYearChange = (yearIndex: number) => {
    const newYear = MIN_YEAR + yearIndex;
    const currentMax = new Date(newYear, selectedMonth, 0).getDate();
    const clampedDay = Math.min(selectedDay, currentMax);
    if (clampedDay !== selectedDay) {
      setSelectedDay(clampedDay);
    }
    setSelectedYear(newYear);
    emitChange(clampedDay, selectedMonth, newYear);
  };

  // Xác định thứ trong tuần
  const getWeekdayName = (d: number, m: number, y: number) => {
    try {
      const dt = new Date(y, m - 1, d);
      const dayOfWeek = dt.getDay();
      const names = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      return names[dayOfWeek] || "Hôm nay";
    } catch {
      return "";
    }
  };

  return (
    <div className={cn("w-full max-w-full space-y-2 select-none overflow-hidden", className)}>
      {/* 1. Nút hiển thị ngày thu gọn phong cách Apple iOS (Bấm vào để mở/đóng con lăn 3D) */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0">
          <CalendarIcon className="w-3.5 h-3.5 text-primary" />
          <span>Ngày diễn ra <span className="text-rose-500">*</span></span>
        </label>

        <div className="flex items-center gap-2.5 ml-auto">
          {headerRight}

          {/* Nút bấm iOS Badge mở con lăn */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all select-none text-left shadow-sm active:scale-95 cursor-pointer shrink-0",
              isOpen
                ? "bg-primary text-white border-primary shadow-md ring-2 ring-primary/20"
                : "bg-secondary/60 hover:bg-secondary border-border text-foreground hover:border-primary/40"
            )}
          >
          <span className="font-mono text-sm font-black tracking-wider">
            {String(selectedDay).padStart(2, "0")} / {String(selectedMonth).padStart(2, "0")} / {selectedYear}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              isOpen
                ? "bg-white/20 text-white"
                : "bg-card text-muted-foreground border border-border/50"
            )}
          >
            {isLunar ? "Âm lịch" : getWeekdayName(selectedDay, selectedMonth, selectedYear)}
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
        </div>
      </div>

      {/* 2. Con lăn Apple iOS Cupertino Wheel (UIDatePickerStyle.wheels) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden w-full max-w-full"
          >
            <div
              className="mt-1 rounded-2xl bg-secondary/50 dark:bg-[#13141f] border border-border/80 p-3 shadow-lg select-none w-full max-w-full overflow-hidden backdrop-blur-md"
              style={{
                touchAction: "none",
                overscrollBehavior: "none",
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Thanh phụ hiển thị tiêu đề & Nút "Xong" */}
              <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-border/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Lăn chọn ngày, tháng, năm</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-transform active:scale-95 flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Xong</span>
                </button>
              </div>

              {/* Nhãn 3 cột: Ngày - Tháng - Năm */}
              <div className="grid grid-cols-3 text-center text-[11px] font-bold text-muted-foreground/80 py-1 border-b border-border/40">
                <span>Ngày</span>
                <span>Tháng</span>
                <span>Năm</span>
              </div>

              {/* Khu vực 3 con lăn Apple Drum Roll 3D Perspective */}
              <div
                className="relative flex items-center justify-center h-[180px] w-full max-w-full overflow-hidden select-none"
                style={{
                  perspective: "1000px",
                  touchAction: "none",
                }}
              >
                {/* Thanh kính lúp trung tâm Apple Cupertino Lens */}
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[42px] rounded-xl bg-white/10 dark:bg-white/[0.08] border-y border-white/20 dark:border-white/10 shadow-sm pointer-events-none z-0 backdrop-blur-[2px]" />

                {/* 3 Cột con lăn: Ngày - Tháng - Năm cuộn vô tận mượt mà */}
                <div className="flex items-center w-full h-full z-10">
                  <WheelColumn
                    itemsCount={maxDays}
                    value={Math.min(selectedDay - 1, maxDays - 1)}
                    onChange={handleDayChange}
                    formatItem={(idx) => String(idx + 1).padStart(2, "0")}
                    label="ngày"
                    loop={true}
                  />
                  <WheelColumn
                    itemsCount={12}
                    value={selectedMonth - 1}
                    onChange={handleMonthChange}
                    formatItem={(idx) => `Tháng ${idx + 1}`}
                    label="tháng"
                    loop={true}
                  />
                  <WheelColumn
                    itemsCount={YEARS_COUNT}
                    value={selectedYear - MIN_YEAR}
                    onChange={handleYearChange}
                    formatItem={(idx) => String(MIN_YEAR + idx)}
                    label="năm"
                    loop={false}
                  />
                </div>

                {/* Lớp phủ Vignette Gradient làm mềm 2 đầu tạo chiều sâu 3D */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-secondary/90 dark:from-[#13141f] via-secondary/60 dark:via-[#13141f]/75 to-transparent z-20" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-secondary/90 dark:from-[#13141f] via-secondary/60 dark:via-[#13141f]/75 to-transparent z-20" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
