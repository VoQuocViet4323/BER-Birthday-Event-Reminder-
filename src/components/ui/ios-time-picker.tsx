"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Clock, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface IosTimePickerProps {
  value?: string; // Format "HH:mm" e.g. "08:00"
  onChange: (time: string) => void;
  className?: string;
  defaultOpen?: boolean;
}

const ITEM_HEIGHT = 42; // Chiều cao mỗi dòng theo chuẩn Apple iOS Wheels (42px)
const RADIUS = 105; // Bán kính hình trụ 3D (Cylinder Radius) chuẩn iOS UIKit

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
      // Giới hạn tần suất phát âm thanh tối thiểu cách nhau 32ms để âm sắc tách bạch, cơ học
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

      // Âm thanh "tách" cơ học siêu ngắn của núm xoay Apple Digital Crown / UIDatePicker Wheels
      osc.type = "sine";
      osc.frequency.setValueAtTime(760, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.012);

      // Âm lượng siêu nhẹ, êm tai (0.035)
      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.013);
    } catch {
      // Bỏ qua an toàn nếu trình duyệt chưa kích hoạt audio context
    }
  }

  static trigger() {
    // 1. Rung xúc giác Taptic trên điện thoại di động
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignore vibration errors
      }
    }
    // 2. Âm thanh click cơ học
    this.playTick();
  }
}

/**
 * Cột con lăn 3D Apple Drum Wheel (UIDatePickerStyle.wheels)
 * - Mô phỏng chuẩn hình học 3D Cylinder: rotateX, translateZ, scale, opacity
 * - Hỗ trợ kéo lướt quán tính (Inertia & Deceleration)
 * - Vòng lặp vô tận mượt mà (Infinite Wrapping Loop)
 * - Âm thanh & rung xúc giác Taptic Engine khi lăn qua từng nấc
 */
interface WheelColumnProps {
  itemsCount: number; // 24 cho giờ, 60 cho phút
  value: number;
  onChange: (val: number) => void;
  label: string;
}

function WheelColumn({ itemsCount, value, onChange, label }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<number>(value);
  const offsetRef = useRef<number>(value);
  offsetRef.current = offset;

  const lastHapticRef = useRef<number>(value);
  const animFrameRef = useRef<number | null>(null);

  // Trạng thái Dragging
  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(value);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  // Đồng bộ khi prop `value` thay đổi từ bên ngoài (khi không kéo)
  useEffect(() => {
    if (!isDraggingRef.current) {
      const currentNorm = ((Math.round(offsetRef.current) % itemsCount) + itemsCount) % itemsCount;
      if (currentNorm !== value) {
        // Tìm bước nhảy gần nhất để tránh quay vòng lớn
        let diff = value - currentNorm;
        if (diff > itemsCount / 2) diff -= itemsCount;
        if (diff < -itemsCount / 2) diff += itemsCount;
        const target = Math.round(offsetRef.current) + diff;
        setOffset(target);
        lastHapticRef.current = target;
      }
    }
  }, [value, itemsCount]);

  // Dọn dẹp animation frame khi unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Hàm chuyển động mượt mà bằng Spring Physics
  const animateTo = useCallback(
    (targetIndex: number) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      let current = offsetRef.current;
      const target = targetIndex;
      let velocity = 0;

      const step = () => {
        const force = (target - current) * 0.22;
        velocity = (velocity + force) * 0.74;
        current += velocity;

        setOffset(current);

        const rounded = Math.round(current);
        if (rounded !== lastHapticRef.current) {
          lastHapticRef.current = rounded;
          CupertinoHaptics.trigger();
        }

        if (Math.abs(velocity) < 0.0005 && Math.abs(target - current) < 0.0005) {
          setOffset(target);
          const normalized = ((target % itemsCount) + itemsCount) % itemsCount;
          onChange(normalized);
          animFrameRef.current = null;
          return;
        }

        animFrameRef.current = requestAnimationFrame(step);
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [itemsCount, onChange]
  );

  // Xử lý kéo thả bằng Pointer Events (Khóa cứng trục X, chỉ cuộn trục Y)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Chỉ nhận chuột trái hoặc chạm ngón tay
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
      velocityRef.current = (e.clientY - lastYRef.current) / dt;
    }
    lastYRef.current = e.clientY;
    lastTimeRef.current = now;

    // 1:1 Direct Tracking theo ngón tay / chuột
    const newOffset = startOffsetRef.current - dy / ITEM_HEIGHT;
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

    // Lướt quán tính theo vận tốc nhả chuột/ngón tay
    const v = velocityRef.current;
    const momentum = Math.max(-12, Math.min(12, v * 14));
    const target = Math.round(offsetRef.current - momentum);
    animateTo(target);
  };

  // Cuộn bằng con lăn chuột (Mouse Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dir = e.deltaY > 0 ? 1 : -1;
    animateTo(Math.round(offsetRef.current) + dir);
  };

  // Bấm vào số bất kỳ để trượt đến số đó
  const handleItemClick = (index: number) => {
    if (hasMovedRef.current) return; // Nếu đang kéo lướt thì không kích hoạt click
    animateTo(index);
  };

  // Bàn phím trợ năng (Arrow Up / Down)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      animateTo(Math.round(offsetRef.current) - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      animateTo(Math.round(offsetRef.current) + 1);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      animateTo(Math.round(offsetRef.current) - 5);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      animateTo(Math.round(offsetRef.current) + 5);
    }
  };

  // Render 7 hàng số xung quanh vị trí hiện tại
  const centerIndex = Math.round(offset);
  const visibleIndices: number[] = [];
  for (let i = centerIndex - 3; i <= centerIndex + 3; i++) {
    visibleIndices.push(i);
  }

  return (
    <div
      ref={containerRef}
      role="spinbutton"
      aria-label={`Chọn ${label}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
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

        // Công thức chiếu hình trụ 3D chuẩn Apple UIDatePickerStyle.wheels
        const angleDeg = diff * 22;
        const angleRad = (angleDeg * Math.PI) / 180;
        const y = RADIUS * Math.sin(angleRad);
        const z = RADIUS * (Math.cos(angleRad) - 1);
        const scale = Math.max(0.72, 1 - absDiff * 0.05);
        const opacity = Math.max(0, Math.pow(Math.cos(angleRad), 2.2));
        const val = ((i % itemsCount) + itemsCount) % itemsCount;

        const isCenter = absDiff < 0.45;

        return (
          <div
            key={i}
            onClick={() => handleItemClick(i)}
            className={cn(
              "absolute left-0 right-0 flex items-center justify-center font-mono select-none transition-colors duration-100",
              isCenter
                ? "text-2xl sm:text-3xl font-black text-foreground tracking-tight drop-shadow-xs"
                : "text-lg sm:text-xl font-semibold text-muted-foreground/75"
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
            {String(val).padStart(2, "0")}
          </div>
        );
      })}
    </div>
  );
}

export function IosTimePicker({
  value = "08:00",
  onChange,
  className,
  defaultOpen = false,
}: IosTimePickerProps) {
  // Trạng thái đóng/mở con lăn (mặc định thu gọn, bấm vào để mở)
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Phân tích giá trị ban đầu
  const [initHour, initMinute] = useMemo(() => {
    if (!value || !value.includes(":")) return [8, 0];
    const [h, m] = value.split(":").map(Number);
    return [
      isNaN(h) || h < 0 || h > 23 ? 8 : h,
      isNaN(m) || m < 0 || m > 59 ? 0 : m,
    ];
  }, [value]);

  const [selectedHour, setSelectedHour] = useState<number>(initHour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initMinute);

  // Đồng bộ state khi value từ ngoài thay đổi
  useEffect(() => {
    setSelectedHour(initHour);
    setSelectedMinute(initMinute);
  }, [initHour, initMinute]);

  // Cập nhật khi chọn giờ hoặc phút
  const emitChange = useCallback(
    (hour: number, minute: number) => {
      const hh = String(hour).padStart(2, "0");
      const mm = String(minute).padStart(2, "0");
      onChange(`${hh}:${mm}`);
    },
    [onChange]
  );

  const handleHourChange = (newHour: number) => {
    setSelectedHour(newHour);
    emitChange(newHour, selectedMinute);
  };

  const handleMinuteChange = (newMinute: number) => {
    setSelectedMinute(newMinute);
    emitChange(selectedHour, newMinute);
  };

  // Xác định buổi trong ngày
  const getTimePeriodDesc = (hour: number) => {
    if (hour >= 5 && hour < 11) return "Buổi sáng";
    if (hour >= 11 && hour < 14) return "Buổi trưa";
    if (hour >= 14 && hour < 18) return "Buổi chiều";
    if (hour >= 18 && hour < 22) return "Buổi tối";
    return "Đêm muộn";
  };

  return (
    <div className={cn("w-full max-w-full space-y-2 select-none overflow-hidden", className)}>
      {/* 1. Nút hiển thị giờ thu gọn phong cách Apple iOS (Bấm vào để mở/đóng con lăn) */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>Thời gian gửi lời nhắc</span>
        </label>

        {/* Nút bấm iOS Badge mở con lăn */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all select-none text-left shadow-sm active:scale-95",
            isOpen
              ? "bg-primary text-white border-primary shadow-md ring-2 ring-primary/20"
              : "bg-secondary/60 hover:bg-secondary border-border text-foreground hover:border-primary/40"
          )}
        >
          <span className="font-mono text-sm font-black tracking-wider">
            {String(selectedHour).padStart(2, "0")} : {String(selectedMinute).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              isOpen ? "bg-white/20 text-white" : "bg-card text-muted-foreground border border-border/50"
            )}
          >
            {getTimePeriodDesc(selectedHour)}
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
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
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Lăn chọn giờ và phút</span>
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

              {/* Khu vực 2 con lăn Apple Drum Roll 3D Perspective */}
              <div
                className="relative flex items-center justify-center h-[180px] w-full max-w-full overflow-hidden select-none"
                style={{
                  perspective: "1000px",
                  touchAction: "none",
                }}
              >
                {/* Thanh kính lúp trung tâm Apple Cupertino Lens */}
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[42px] rounded-xl bg-white/10 dark:bg-white/[0.08] border-y border-white/20 dark:border-white/10 shadow-sm pointer-events-none z-0 backdrop-blur-[2px]" />

                {/* Dấu hai chấm (Colon) ở giữa tâm */}
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-[42px] flex items-center justify-center font-black text-2xl text-primary/80 z-20 pointer-events-none select-none">
                  :
                </div>

                {/* 2 Cột con lăn (Giờ và Phút) cuộn vô tận mượt mà */}
                <div className="flex items-center w-full h-full z-10">
                  <WheelColumn
                    itemsCount={24}
                    value={selectedHour}
                    onChange={handleHourChange}
                    label="giờ"
                  />
                  <WheelColumn
                    itemsCount={60}
                    value={selectedMinute}
                    onChange={handleMinuteChange}
                    label="phút"
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
