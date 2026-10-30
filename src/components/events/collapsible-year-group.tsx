"use client";

import { useMemo } from "react";
import { EventWithMeta } from "@/types/events";
import { CollapsibleMonthGroup } from "./collapsible-month-group";
import { Calendar, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CollapsibleYearGroupProps {
  year: number;
  totalEvents: number;
  monthGroups: [number, EventWithMeta[]][];
  isExpanded: boolean;
  onToggle: () => void;
  expandedMonths: Record<string, boolean>;
  onToggleMonth: (year: number, monthNum: number) => void;
  onEdit: (event: EventWithMeta) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  isSearching?: boolean;
  sortBy?: string;
  customYear?: number;
}

export function CollapsibleYearGroup({
  year,
  totalEvents,
  monthGroups,
  isExpanded,
  onToggle,
  expandedMonths,
  onToggleMonth,
  onEdit,
  onDelete,
  onToggleEnabled,
  isSearching = false,
  sortBy,
  customYear,
}: CollapsibleYearGroupProps) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const isCurrentYear = year === currentYear;

  return (
    <div className="rounded-3xl bg-card border border-border/80 shadow-card hover:shadow-soft-hover transition-all duration-200 overflow-hidden">
      {/* Nút bấm tiêu đề Năm (Trigger Accordion) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-secondary/20 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {/* Badge số Năm Gradient sang trọng */}
          <div className="w-12 h-12 rounded-2xl gradient-brand text-white flex items-center justify-center font-black text-base shadow-soft shrink-0 tracking-tight">
            {year}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                Năm {year}
              </h2>
              {isCurrentYear && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  <span>Năm hiện tại</span>
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
              {totalEvents} sự kiện · {monthGroups.length} tháng · Nhấn để{" "}
              <span className="text-primary font-semibold">
                {isExpanded ? "thu gọn" : "xổ ra"}
              </span>
            </p>
          </div>
        </div>

        {/* Mũi tên xổ xuống xoay mượt mà */}
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 border border-border/60",
            isExpanded
              ? "rotate-180 bg-primary text-white shadow-soft border-primary"
              : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <ChevronDown className="w-4 h-4 stroke-[2.5]" />
        </div>
      </button>

      {/* Nội dung bên trong: Danh sách các tháng thuộc Năm này */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/60 bg-secondary/10"
          >
            <div className="p-3 sm:p-4 space-y-3">
              {monthGroups.map(([monthNum, monthEvents]) => {
                const monthKey = `${year}-${monthNum}`;
                const isMonthExpanded = isSearching || !!expandedMonths[monthKey];
                const monthTitle =
                  sortBy === "custom_month_year"
                    ? `Tháng ${monthNum} năm ${customYear}`
                    : sortBy === "past_month"
                    ? `Tháng ${monthNum} (1 tháng trước)`
                    : `Tháng ${monthNum}`;

                return (
                  <CollapsibleMonthGroup
                    key={monthKey}
                    monthNum={monthNum}
                    monthTitle={monthTitle}
                    monthEvents={monthEvents}
                    isExpanded={isMonthExpanded}
                    onToggle={() => onToggleMonth(year, monthNum)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleEnabled={onToggleEnabled}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
