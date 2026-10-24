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

const ITEM_HEIGHT = 44; // Chiều cao mỗi dòng theo chuẩn Apple iOS Human Interface
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function IosTimePicker({
  value = "08:00",
  onChange,
  className,
  defaultOpen = false,
}: IosTimePickerProps) {
  // Trạng thái đóng/mở con lăn (mặc định thu gọn siêu nhỏ, chỉ mở khi bấm vào)
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

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // Đồng bộ state khi value từ ngoài thay đổi
  useEffect(() => {
    setSelectedHour(initHour);
    setSelectedMinute(initMinute);
  }, [initHour, initMinute]);

  // Cuộn con lăn đến vị trí đã chọn
  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement>, index: number, smooth = true) => {
    if (ref.current) {
      ref.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Cuộn con lăn khi mở khung chọn
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollTo(hourRef, selectedHour, false);
        scrollTo(minuteRef, selectedMinute, false);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedHour, selectedMinute, scrollTo]);

  // Cập nhật khi chọn giờ hoặc phút
  const emitChange = useCallback((hour: number, minute: number) => {
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  }, [onChange]);

  // Bắt sự kiện cuộn con lăn
  const handleScroll = (type: "hour" | "minute", e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const index = Math.round(target.scrollTop / ITEM_HEIGHT);

    if (type === "hour") {
      const validHour = Math.max(0, Math.min(23, index));
      if (validHour !== selectedHour) {
        setSelectedHour(validHour);
        emitChange(validHour, selectedMinute);
      }
    } else {
      const validMin = Math.max(0, Math.min(59, index));
      if (validMin !== selectedMinute) {
        setSelectedMinute(validMin);
        emitChange(selectedHour, validMin);
      }
    }
  };

  // Nút tăng giảm từng đơn vị (cho chuột máy tính)
  const stepHour = (delta: number) => {
    const next = (selectedHour + delta + 24) % 24;
    setSelectedHour(next);
    scrollTo(hourRef, next, true);
    emitChange(next, selectedMinute);
  };

  const stepMinute = (delta: number) => {
    const next = (selectedMinute + delta + 60) % 60;
    setSelectedMinute(next);
    scrollTo(minuteRef, next, true);
    emitChange(selectedHour, next);
  };

  // Bấm trực tiếp vào số trên con lăn
  const selectHour = (h: number) => {
    setSelectedHour(h);
    scrollTo(hourRef, h, true);
    emitChange(h, selectedMinute);
  };

  const selectMinute = (m: number) => {
    setSelectedMinute(m);
    scrollTo(minuteRef, m, true);
    emitChange(selectedHour, m);
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
    <div className={cn("w-full space-y-2", className)}>
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
            "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all select-none text-left shadow-sm",
            isOpen
              ? "bg-primary text-white border-primary shadow-md"
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

      {/* 2. Con lăn Apple iOS Cupertino Wheel (Chỉ hiện khi bấm vào) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-2xl bg-secondary/70 border border-border p-3 shadow-lg select-none">
              {/* Thanh phụ hiển thị giờ đang lăn & Nút "Xong" */}
              <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-border/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span>Lăn chọn giờ và phút</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Xong</span>
                </button>
              </div>

              {/* Khu vực 2 con lăn Apple Drum Roll (Giờ & Phút) */}
              <div className="relative flex items-center justify-center h-[132px] overflow-hidden">
                {/* Thanh highlight giữa rõ ràng, sắc nét (Không dùng backdrop-blur gây mờ số) */}
                <div className="absolute inset-x-2 top-[44px] h-[44px] rounded-xl bg-primary/10 border-2 border-primary/40 shadow-sm pointer-events-none z-0" />

                {/* Dấu hai chấm (Colon) ở giữa */}
                <div className="absolute left-1/2 -translate-x-1/2 top-[44px] h-[44px] flex items-center justify-center font-black text-2xl text-primary z-20 pointer-events-none select-none">
                  :
                </div>

                {/* Cột con lăn GIỜ (00 - 23) */}
                <div className="relative flex-1 flex flex-col items-center z-10">
                  <button
                    type="button"
                    onClick={() => stepHour(-1)}
                    className="absolute -top-1 z-30 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Giảm 1 giờ"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <div
                    ref={hourRef}
                    onScroll={(e) => handleScroll("hour", e)}
                    className="h-[132px] w-full overflow-y-auto snap-y snap-mandatory no-scrollbar text-center py-[44px]"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {HOURS.map((h) => {
                      const isActive = h === selectedHour;
                      return (
                        <div
                          key={h}
                          onClick={() => selectHour(h)}
                          className={cn(
                            "h-[44px] flex items-center justify-center snap-center cursor-pointer font-mono transition-all duration-150",
                            isActive
                              ? "text-2xl font-black text-foreground scale-110 drop-shadow-sm"
                              : "text-base font-semibold text-muted-foreground/60 hover:text-foreground/80 opacity-60 scale-95"
                          )}
                        >
                          {String(h).padStart(2, "0")}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => stepHour(1)}
                    className="absolute -bottom-1 z-30 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Tăng 1 giờ"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Cột con lăn PHÚT (00 - 59) */}
                <div className="relative flex-1 flex flex-col items-center z-10">
                  <button
                    type="button"
                    onClick={() => stepMinute(-1)}
                    className="absolute -top-1 z-30 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Giảm 1 phút"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <div
                    ref={minuteRef}
                    onScroll={(e) => handleScroll("minute", e)}
                    className="h-[132px] w-full overflow-y-auto snap-y snap-mandatory no-scrollbar text-center py-[44px]"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {MINUTES.map((m) => {
                      const isActive = m === selectedMinute;
                      return (
                        <div
                          key={m}
                          onClick={() => selectMinute(m)}
                          className={cn(
                            "h-[44px] flex items-center justify-center snap-center cursor-pointer font-mono transition-all duration-150",
                            isActive
                              ? "text-2xl font-black text-foreground scale-110 drop-shadow-sm"
                              : "text-base font-semibold text-muted-foreground/60 hover:text-foreground/80 opacity-60 scale-95"
                          )}
                        >
                          {String(m).padStart(2, "0")}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => stepMinute(1)}
                    className="absolute -bottom-1 z-30 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Tăng 1 phút"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Lớp phủ Gradient làm mềm 2 đầu khớp màu nền */}
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
