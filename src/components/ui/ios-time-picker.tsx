"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, Clock, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface IosTimePickerProps {
  value?: string; // Format "HH:mm" e.g. "08:00"
  onChange: (time: string) => void;
  className?: string;
  defaultOpen?: boolean;
}

const ITEM_HEIGHT = 44; // Chiều cao mỗi dòng theo chuẩn Apple iOS Human Interface (44px)
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/**
 * Trình quản lý âm thanh cơ học và phản hồi xúc giác (Haptic) chuẩn Apple iOS
 */
class CupertinoHaptics {
  private static audioCtx: AudioContext | null = null;
  private static lastTickTime = 0;

  static playTick() {
    try {
      if (typeof window === "undefined") return;
      const now = performance.now();
      // Giới hạn tần suất phát âm thanh tối thiểu cách nhau 35ms để âm sắc tách bạch, cơ học
      if (now - this.lastTickTime < 35) return;
      this.lastTickTime = now;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

      // Âm thanh "tách" cơ học siêu ngắn của núm xoay Digital Crown / Apple Wheel
      osc.type = "sine";
      osc.frequency.setValueAtTime(720, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.012);

      // Âm lượng siêu nhẹ, êm tai (0.03)
      gain.gain.setValueAtTime(0.03, t);
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
    // 1. Rung xúc giác trên điện thoại di động
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
 * Component cột con lăn 3D Apple Drum Wheel (Khóa cứng trục X, chỉ cuộn trục Y)
 */
interface WheelColumnProps {
  items: number[];
  value: number;
  onChange: (val: number) => void;
  label: string;
}

function WheelColumn({ items, value, onChange, label }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastHapticIndex = useRef<number>(value);
  const isInternalScrolling = useRef<boolean>(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Trạng thái kéo chuột trên máy tính (Mouse Dragging)
  const isPointerDown = useRef<boolean>(false);
  const startY = useRef<number>(0);
  const startScrollTop = useRef<number>(0);

  // Cuộn đến giá trị
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!containerRef.current) return;
    const targetTop = index * ITEM_HEIGHT;
    containerRef.current.scrollTo({
      top: targetTop,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Đồng bộ khi prop `value` thay đổi từ ngoài
  useEffect(() => {
    if (!isInternalScrolling.current && containerRef.current) {
      scrollToIndex(value, false);
      lastHapticIndex.current = value;
    }
  }, [value, scrollToIndex]);

  // Cập nhật hiệu ứng cong hình trụ 3D cho các con số
  const update3DTransforms = useCallback((scrollTop: number) => {
    const floatIndex = scrollTop / ITEM_HEIGHT;
    const activeIndex = Math.round(floatIndex);

    // Kích hoạt phản hồi khi nhảy sang số mới
    if (activeIndex !== lastHapticIndex.current && activeIndex >= 0 && activeIndex < items.length) {
      lastHapticIndex.current = activeIndex;
      CupertinoHaptics.trigger();
    }

    itemRefs.current.forEach((el, index) => {
      if (!el) return;
      const diff = index - floatIndex;
      const absDiff = Math.abs(diff);

      if (absDiff > 2.5) {
        el.style.opacity = "0";
        el.style.transform = "scale(0.7) translateZ(-40px)";
        el.style.pointerEvents = "none";
        return;
      }

      // 3D Apple Cylinder: xoay quanh trục X (-28deg đến +28deg) và lùi sâu theo trục Z
      const rotateX = -diff * 26;
      const translateZ = -absDiff * 12;
      const scale = Math.max(0.72, 1 - absDiff * 0.12);
      const opacity = Math.max(0.18, 1 - absDiff * 0.44);

      el.style.transform = `perspective(600px) rotateX(${rotateX}deg) translateZ(${translateZ}px) scale(${scale})`;
      el.style.opacity = String(opacity);
      el.style.pointerEvents = absDiff < 0.5 ? "auto" : "none";

      if (absDiff < 0.4) {
        el.classList.add("text-foreground", "font-black");
        el.classList.remove("text-muted-foreground");
      } else {
        el.classList.remove("text-foreground", "font-black");
        el.classList.add("text-muted-foreground", "font-semibold");
      }
    });
  }, [items.length]);

  // Lắng nghe sự kiện scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    isInternalScrolling.current = true;
    const scrollTop = containerRef.current.scrollTop;

    // Dùng requestAnimationFrame để hiệu ứng 3D mượt mà 60-120fps
    requestAnimationFrame(() => {
      update3DTransforms(scrollTop);
    });

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const finalIndex = Math.max(0, Math.min(items.length - 1, Math.round(containerRef.current.scrollTop / ITEM_HEIGHT)));
      isInternalScrolling.current = false;
      if (items[finalIndex] !== value) {
        onChange(items[finalIndex]);
      }
    }, 70);
  };

  // Nút tăng giảm từng bước
  const step = (delta: number) => {
    const nextIndex = (value + delta + items.length) % items.length;
    onChange(items[nextIndex]);
    scrollToIndex(nextIndex, true);
    CupertinoHaptics.trigger();
  };

  // Nhấp trực tiếp vào số
  const handleItemClick = (index: number) => {
    onChange(items[index]);
    scrollToIndex(index, true);
    CupertinoHaptics.trigger();
  };

  // Khóa cứng trục X: Xử lý kéo chuột trên máy tính (Mouse Dragging)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Chỉ nhận chuột trái
    isPointerDown.current = true;
    startY.current = e.clientY;
    startScrollTop.current = containerRef.current?.scrollTop || 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current || !containerRef.current) return;
    // CHỈ TÍNH TOÁN TRỤC Y, HOÀN TOÀN KHÔNG CHO PHÉP TRỤC X
    const deltaY = e.clientY - startY.current;
    containerRef.current.scrollTop = startScrollTop.current - deltaY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore pointer release error
    }

    // Snap vào vị trí gần nhất
    if (containerRef.current) {
      const snapIndex = Math.max(0, Math.min(items.length - 1, Math.round(containerRef.current.scrollTop / ITEM_HEIGHT)));
      scrollToIndex(snapIndex, true);
    }
  };

  // Lăn bánh xe chuột (Mouse wheel)
  const handleWheel = (e: React.WheelEvent) => {
    // Ngăn chặn cuộn trang cha
    e.stopPropagation();
    if (!containerRef.current) return;
    const delta = e.deltaY > 0 ? 1 : -1;
    const currentIndex = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
    const targetIndex = Math.max(0, Math.min(items.length - 1, currentIndex + delta));
    scrollToIndex(targetIndex, true);
  };

  return (
    <div className="relative flex-1 flex flex-col items-center select-none overflow-hidden touch-pan-y" style={{ touchAction: "pan-y" }}>
      {/* Nút tăng/giảm ở đỉnh */}
      <button
        type="button"
        onClick={() => step(-1)}
        className="absolute -top-1 z-30 p-1 text-muted-foreground hover:text-foreground transition-colors hover:scale-110 active:scale-95"
        title={`Giảm 1 ${label}`}
      >
        <ChevronUp className="w-4 h-4" />
      </button>

      {/* Vùng cuộn bánh xe (Khóa cứng trục X) */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="h-[132px] w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory no-scrollbar text-center py-[44px] cursor-grab active:cursor-grabbing select-none"
        style={{
          touchAction: "pan-y",
          overscrollBehaviorX: "none",
          overscrollBehaviorY: "contain",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {items.map((item, index) => {
          const isSelected = item === value;
          return (
            <div
              key={item}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              onClick={() => handleItemClick(index)}
              className={cn(
                "h-[44px] flex items-center justify-center snap-center cursor-pointer font-mono transition-transform duration-75 select-none",
                isSelected
                  ? "text-2xl md:text-3xl font-black text-foreground"
                  : "text-lg font-semibold text-muted-foreground"
              )}
              style={{
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                WebkitFontSmoothing: "antialiased",
              }}
            >
              {String(item).padStart(2, "0")}
            </div>
          );
        })}
      </div>

      {/* Nút tăng/giảm ở đáy */}
      <button
        type="button"
        onClick={() => step(1)}
        className="absolute -bottom-1 z-30 p-1 text-muted-foreground hover:text-foreground transition-colors hover:scale-110 active:scale-95"
        title={`Tăng 1 ${label}`}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
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
  const emitChange = useCallback((hour: number, minute: number) => {
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  }, [onChange]);

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

      {/* 2. Con lăn Apple iOS Cupertino Wheel (Chỉ mở khi bấm vào) */}
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
              className="mt-1 rounded-2xl bg-secondary/70 border border-border p-3 shadow-lg select-none w-full max-w-full overflow-hidden"
              style={{
                touchAction: "pan-y",
                overscrollBehaviorX: "none",
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Thanh phụ hiển thị tiêu đề & Nút "Xong" */}
              <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-border/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span>Lăn chọn giờ và phút</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-transform active:scale-95 flex items-center gap-1 shadow-sm"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Xong</span>
                </button>
              </div>

              {/* Khu vực 2 con lăn Apple Drum Roll (Khóa cứng trục X) */}
              <div
                className="relative flex items-center justify-center h-[132px] w-full max-w-full overflow-hidden select-none"
                style={{
                  perspective: "1000px",
                  touchAction: "pan-y",
                  overscrollBehaviorX: "none",
                }}
              >
                {/* Thanh kính lúp trung tâm Apple Cupertino Lens */}
                <div className="absolute inset-x-2 top-[44px] h-[44px] rounded-xl bg-primary/10 border-y-2 border-primary/40 shadow-sm pointer-events-none z-0 backdrop-blur-[0.5px]" />

                {/* Dấu hai chấm (Colon) ở giữa tâm */}
                <div className="absolute left-1/2 -translate-x-1/2 top-[44px] h-[44px] flex items-center justify-center font-black text-2xl text-primary z-20 pointer-events-none select-none">
                  :
                </div>

                {/* 2 Cột con lăn (Giờ và Phút) */}
                <div className="flex items-center w-full h-full z-10 overflow-hidden">
                  <WheelColumn
                    items={HOURS}
                    value={selectedHour}
                    onChange={handleHourChange}
                    label="giờ"
                  />
                  <WheelColumn
                    items={MINUTES}
                    value={selectedMinute}
                    onChange={handleMinuteChange}
                    label="phút"
                  />
                </div>

                {/* Lớp phủ Gradient làm mềm 2 đầu tạo chiều sâu 3D */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-9 bg-gradient-to-b from-secondary via-secondary/70 to-transparent z-20" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-secondary via-secondary/70 to-transparent z-20" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
