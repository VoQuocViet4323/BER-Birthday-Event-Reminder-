"use client";

import React, { useState } from "react";
import { Plus, X, Check, Bell, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RemindDaysPickerProps {
  value: number[]; // Danh sách các mốc ngày, ví dụ: [7, 3, 1, 0]
  onChange: (days: number[]) => void;
  className?: string;
}

const COMMON_PRESETS = [
  { label: "Đúng ngày", value: 0 },
  { label: "Trước 1 ngày", value: 1 },
  { label: "Trước 2 ngày", value: 2 },
  { label: "Trước 3 ngày", value: 3 },
  { label: "Trước 7 ngày (1 tuần)", value: 7 },
  { label: "Trước 14 ngày (2 tuần)", value: 14 },
  { label: "Trước 30 ngày (1 tháng)", value: 30 },
];

export function RemindDaysPicker({
  value = [],
  onChange,
  className,
}: RemindDaysPickerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const daysList = Array.isArray(value) ? value : [];

  // Thêm / bớt mốc ngày
  const toggleDay = (day: number) => {
    setErrorMsg("");
    if (daysList.includes(day)) {
      onChange(daysList.filter((d) => d !== day));
    } else {
      const updated = [...daysList, day].sort((a, b) => b - a);
      onChange(updated);
    }
  };

  // Thêm mốc tùy chỉnh do người dùng nhập
  const handleAddCustom = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMsg("");
    const num = parseInt(customInput.trim(), 10);

    if (isNaN(num) || num < 0) {
      setErrorMsg("Vui lòng nhập số ngày hợp lệ (>= 0)");
      return;
    }
    if (num > 365) {
      setErrorMsg("Số ngày không vượt quá 365 ngày");
      return;
    }
    if (daysList.includes(num)) {
      setErrorMsg(`Mốc ${num === 0 ? "Đúng ngày" : `Trước ${num} ngày`} đã có rồi`);
      return;
    }

    const updated = [...daysList, num].sort((a, b) => b - a);
    onChange(updated);
    setCustomInput("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header tiêu đề */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-primary" />
          <span>Mốc nhắc nhở trước (ngày)</span>
        </label>

        {daysList.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-rose-500 hover:underline font-medium transition-colors"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Danh sách các mốc đã chọn (Dạng thẻ Tags gọn gàng) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {daysList.map((day) => (
          <span
            key={day}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold transition-all shadow-sm"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{day === 0 ? "Đúng ngày" : `Trước ${day} ngày`}</span>
            <button
              type="button"
              onClick={() => toggleDay(day)}
              className="p-0.5 rounded-full hover:bg-primary/20 text-primary/80 hover:text-rose-500 transition-colors"
              title="Xóa mốc này"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        ))}

        {/* Nút bấm mở bảng thêm mốc */}
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
            isAdding
              ? "bg-primary text-white border-primary shadow-sm"
              : "border-dashed border-border bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
          )}
        >
          <Plus className={cn("w-3.5 h-3.5 transition-transform duration-200", isAdding && "rotate-45")} />
          <span>{daysList.length === 0 ? "Thêm mốc nhắc" : "Thêm mốc khác"}</span>
        </button>
      </div>

      {/* Bảng chọn mốc nhanh & Tự nhập số ngày (Chỉ mở khi bấm nút) */}
      {isAdding && (
        <div className="mt-2.5 p-3 rounded-2xl bg-secondary/50 border border-border space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* 1. Các mốc ngày phổ biến */}
          <div>
            <span className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Chọn nhanh mốc phổ biến:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PRESETS.map((preset) => {
                const isSelected = daysList.includes(preset.value);
                return (
                  <button
                    type="button"
                    key={preset.value}
                    onClick={() => toggleDay(preset.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1",
                      isSelected
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tự nhập số ngày custom bất kỳ */}
          <div className="pt-2 border-t border-border/60">
            <span className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Hoặc tự nhập số ngày bạn muốn:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Trước</span>
              <input
                type="number"
                min="0"
                max="365"
                placeholder="VD: 5"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddCustom();
                  }
                }}
                className="w-20 px-3 py-1.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary text-xs font-bold text-center text-foreground"
              />
              <span className="text-xs text-muted-foreground shrink-0">ngày</span>
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customInput.trim()}
                className="px-3 py-1.5 rounded-xl gradient-brand text-white text-xs font-bold shadow-sm disabled:opacity-50 hover:shadow-soft transition-all"
              >
                + Thêm
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded-lg hover:bg-secondary"
              >
                Xong
              </button>
            </div>
            {errorMsg && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
