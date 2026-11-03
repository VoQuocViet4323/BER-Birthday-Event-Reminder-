"use client";

import React, { useState } from "react";
import { Clock, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { IosTimePicker } from "@/components/ui/ios-time-picker";
import {
  parseRemindTime,
  serializeRemindTime,
  OffsetTimeMap,
} from "@/lib/reminder-time-utils";

interface MultiOffsetTimePickerProps {
  remindDays: number[]; // Mảng các mốc ngày: e.g. [1, 0] hoặc [7, 3, 1, 0]
  value?: string | null; // e.g. "08:00" hoặc "08:00|0:21:00,1:08:00"
  onChange: (serializedTime: string) => void;
  className?: string;
}

export function MultiOffsetTimePicker({
  remindDays = [],
  value = "08:00",
  onChange,
  className,
}: MultiOffsetTimePickerProps) {
  // Phân tích giá trị ban đầu
  const parsed = parseRemindTime(value);
  const [defaultTime, setDefaultTime] = useState(parsed.defaultTime || "08:00");
  const [offsetTimes, setOffsetTimes] = useState<OffsetTimeMap>(parsed.offsetTimes || {});

  // Tab mốc đang được chọn để chỉnh giờ (nếu có >= 2 mốc)
  const sortedDays = [...remindDays].sort((a, b) => b - a);
  const [activeDayTab, setActiveDayTab] = useState<number>(sortedDays[0] ?? 0);

  // Nếu tab hiện tại không nằm trong remindDays (do vừa xóa mốc), tự chuyển về mốc đầu tiên
  const currentTab = sortedDays.includes(activeDayTab) ? activeDayTab : (sortedDays[0] ?? 0);

  // Helper lấy giờ cho mốc ngày
  const getTimeForDay = (day: number) => {
    return offsetTimes[day] || defaultTime;
  };

  // Cập nhật giờ cho một mốc ngày cụ thể
  const handleTimeChangeForDay = (day: number, newTime: string) => {
    const updatedMap = {
      ...offsetTimes,
      [day]: newTime,
    };
    setOffsetTimes(updatedMap);

    // Nếu chỉ có 1 mốc, cập nhật luôn defaultTime
    if (sortedDays.length <= 1) {
      setDefaultTime(newTime);
    }

    const serialized = serializeRemindTime(defaultTime, updatedMap, sortedDays);
    onChange(serialized);
  };

  // Cập nhật giờ chung (khi người dùng muốn áp dụng cho tất cả)
  const handleTimeChangeAll = (newTime: string) => {
    setDefaultTime(newTime);
    const updatedMap: OffsetTimeMap = {};
    for (const d of sortedDays) {
      updatedMap[d] = newTime;
    }
    setOffsetTimes(updatedMap);

    const serialized = serializeRemindTime(newTime, updatedMap, sortedDays);
    onChange(serialized);
  };

  const formatDayLabel = (d: number) => {
    return d === 0 ? "Đúng ngày" : `Trước ${d} ngày`;
  };

  // TRƯỜNG HỢP 1: Không có hoặc chỉ có 1 mốc ngày -> Hiển thị 1 bộ chọn giờ đơn giản
  if (sortedDays.length <= 1) {
    const singleDay = sortedDays[0] ?? 0;
    const currentTime = getTimeForDay(singleDay);

    return (
      <div className={cn("space-y-1.5", className)}>
        <IosTimePicker
          value={currentTime}
          onChange={(t) => handleTimeChangeForDay(singleDay, t)}
        />
      </div>
    );
  }

  // TRƯỜNG HỢP 2: Có từ 2 mốc ngày trở lên -> Cho phép chọn riêng giờ cho từng mốc!
  const currentTimeOfCurrentTab = getTimeForDay(currentTab);

  return (
    <div className={cn("space-y-2.5 p-3 rounded-2xl bg-secondary/35 border border-border/80 shadow-2xs", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>Thời gian gửi lời nhắc (Từng mốc riêng biệt)</span>
        </label>
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border/50">
          {sortedDays.length} mốc nhắc
        </span>
      </div>

      {/* Thanh Tabs chọn mốc ngày để đổi giờ */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
        {sortedDays.map((day) => {
          const isActive = currentTab === day;
          const timeForThisDay = getTimeForDay(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDayTab(day)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border select-none",
                isActive
                  ? "bg-primary text-white border-primary shadow-xs font-bold ring-2 ring-primary/20"
                  : "bg-card hover:bg-secondary border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{formatDayLabel(day)}</span>
              <span
                className={cn(
                  "font-mono text-[11px] px-1.5 py-0.2 rounded-md font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-secondary text-primary border border-primary/20"
                )}
              >
                {timeForThisDay}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bộ điều khiển giờ của mốc đang chọn */}
      <div className="pt-1 border-t border-border/50">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1 px-1">
          <span>
            Đang chỉnh giờ cho: <strong className="text-foreground">{formatDayLabel(currentTab)}</strong>
          </span>
          <button
            type="button"
            onClick={() => handleTimeChangeAll(currentTimeOfCurrentTab)}
            className="text-[10px] text-primary hover:underline font-semibold"
            title="Đặt giờ này cho tất cả các mốc còn lại"
          >
            Áp dụng giờ này cho mọi mốc
          </button>
        </div>

        <IosTimePicker
          key={currentTab}
          value={currentTimeOfCurrentTab}
          onChange={(t) => handleTimeChangeForDay(currentTab, t)}
        />
      </div>
    </div>
  );
}

