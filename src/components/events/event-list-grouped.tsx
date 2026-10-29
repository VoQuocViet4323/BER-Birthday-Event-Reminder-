"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { EventWithMeta, EventGroup } from "@/types/events";
import { EventCard } from "./event-card";
import { CollapsibleMonthGroup } from "./collapsible-month-group";
import { EmptyState } from "@/components/common/empty-state";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  Clock,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { convertLunar2Solar } from "@/lib/lunar/amlich";

interface EventListGroupedProps {
  events: EventWithMeta[];
  onEdit: (event: EventWithMeta) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onOpenCreateModal: () => void;
  initialSearch?: string;
  initialGroup?: string;
  defaultExpandAll?: boolean;
}

export type SortFilterOption = "remaining" | "name" | "past_month" | "custom_month_year";

export function EventListGrouped({
  events,
  onEdit,
  onDelete,
  onToggleEnabled,
  onOpenCreateModal,
  initialSearch = "",
  initialGroup = "Tất cả",
  defaultExpandAll = false,
}: EventListGroupedProps) {
  const [search, setSearch] = useState(initialSearch);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [sortBy, setSortBy] = useState<SortFilterOption>("remaining");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // State cho bộ lọc tháng/năm tự chọn
  const now = useMemo(() => new Date(), []);
  const [customMonth, setCustomMonth] = useState<number>(() => now.getMonth() + 1);
  const [customYear, setCustomYear] = useState<number>(() => now.getFullYear());
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Tháng và năm của "1 tháng trước" (tháng liền kề trước tháng hiện tại)
  const pastMonth = useMemo(() => (now.getMonth() === 0 ? 12 : now.getMonth()), [now]);
  const pastMonthYear = useMemo(
    () => (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()),
    [now]
  );

  // State tạm trong popup chọn tháng/năm
  const [tempMonth, setTempMonth] = useState<number>(() => now.getMonth() + 1);
  const [tempYear, setTempYear] = useState<number>(() => now.getFullYear());

  // Quản lý trạng thái đóng/mở của từng tháng
  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>({});

  // Tự động mở rộng khi đang gõ tìm kiếm
  const isSearching = search.trim().length > 0;

  const toggleMonth = (monthNum: number) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthNum]: !prev[monthNum],
    }));
  };

  const groups: { name: "Tất cả" | EventGroup; dotColor?: string }[] = [
    { name: "Tất cả" },
    { name: "Gia đình", dotColor: "bg-rose-500" },
    { name: "Bạn bè", dotColor: "bg-amber-500" },
    { name: "Đồng nghiệp", dotColor: "bg-indigo-500" },
    { name: "Khác", dotColor: "bg-emerald-500" },
  ];

  // Danh mục 4 bộ lọc chuẩn theo yêu cầu người dùng
  const sortOptions: { value: SortFilterOption; label: string; icon?: any }[] = [
    { value: "remaining", label: "Sắp tới gần nhất" },
    { value: "name", label: "Tên (A → Z)" },
    { value: "past_month", label: "1 tháng trước" },
    { value: "custom_month_year", label: "Lọc theo tháng năm tự chọn" },
  ];

  // Đóng dropdown sắp xếp khi bấm ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };

    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isSortOpen]);

  // Xử lý chọn trong dropdown menu
  const handleSelectOption = (optValue: SortFilterOption) => {
    if (optValue === "custom_month_year") {
      setIsSortOpen(false);
      // Đồng bộ giá trị tạm với giá trị hiện tại trước khi mở modal
      setTempMonth(customMonth);
      setTempYear(customYear);
      setIsCustomModalOpen(true);
      return;
    }
    setSortBy(optValue);
    setIsSortOpen(false);
  };

  // Xác nhận áp dụng bộ lọc tháng/năm tự chọn
  const handleApplyCustomFilter = () => {
    setCustomMonth(tempMonth);
    setCustomYear(tempYear);
    setSortBy("custom_month_year");
    setIsCustomModalOpen(false);
  };

  // Lọc và sắp xếp danh sách sự kiện
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        // 1. Lọc theo từ khóa tìm kiếm
        const matchesSearch =
          ev.name.toLowerCase().includes(search.toLowerCase()) ||
          ev.group_name.toLowerCase().includes(search.toLowerCase()) ||
          (ev.note && ev.note.toLowerCase().includes(search.toLowerCase())) ||
          (ev.gift_idea && ev.gift_idea.toLowerCase().includes(search.toLowerCase())) ||
          ((ev as any).custom_type && (ev as any).custom_type.toLowerCase().includes(search.toLowerCase())) ||
          ((ev as any).custom_group && (ev as any).custom_group.toLowerCase().includes(search.toLowerCase()));

        if (!matchesSearch) return false;

        // 2. Lọc theo nhóm
        const matchesGroup =
          selectedGroup === "Tất cả" || ev.group_name === selectedGroup;
        if (!matchesGroup) return false;

        // 3. Lọc theo "1 tháng trước" (Tháng liền kề trước tháng hiện tại)
        if (sortBy === "past_month") {
          // Nếu có năm sinh và lớn hơn năm lọc thì loại (chưa sinh tại thời điểm đó)
          if (ev.event_year && ev.event_year > pastMonthYear) {
            return false;
          }

          if (ev.event_month === pastMonth) {
            return true;
          }

          if (ev.is_lunar) {
            try {
              const solar = convertLunar2Solar(ev.event_day, ev.event_month, pastMonthYear);
              if (solar.month === pastMonth) return true;
            } catch {
              // ignore
            }
          }

          return false;
        }

        // 4. Lọc theo "Tháng năm tự chọn"
        if (sortBy === "custom_month_year") {
          // Nếu có năm sinh và lớn hơn năm lọc thì loại (chưa sinh tại thời điểm đó)
          if (ev.event_year && ev.event_year > customYear) {
            return false;
          }

          if (ev.event_month === customMonth) {
            return true;
          }

          if (ev.is_lunar) {
            try {
              const solar = convertLunar2Solar(ev.event_day, ev.event_month, customYear);
              if (solar.month === customMonth) return true;
            } catch {
              // ignore
            }
          }

          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "remaining") {
          const getWeight = (d: number) => {
            if (d === 0) return 0; // Hôm nay ở vị trí đầu tiên
            if (d === -1) return 0.5; // Hôm qua ưu tiên ngay sau Hôm nay
            if (d < 0) return 1000 + Math.abs(d); // Đã qua lâu hơn
            return d;
          };
          return getWeight(a.daysRemaining) - getWeight(b.daysRemaining);
        }
        if (sortBy === "name") return a.name.localeCompare(b.name, "vi");
        if (sortBy === "past_month") {
          // Xếp theo ngày trong tháng tăng dần (ngày 1 đến ngày 31)
          return a.event_day - b.event_day;
        }
        if (sortBy === "custom_month_year") {
          // Xếp theo ngày trong tháng tăng dần (ngày 1 đến ngày 31)
          return a.event_day - b.event_day;
        }
        return 0;
      });
  }, [events, search, selectedGroup, sortBy, customMonth, customYear, pastMonth, pastMonthYear]);

  // Gom nhóm theo tháng
  const monthGroups = useMemo(() => {
    const groupsMap = new Map<number, EventWithMeta[]>();

    for (const ev of filteredEvents) {
      let month: number;
      if (sortBy === "custom_month_year") {
        month = customMonth;
      } else if (sortBy === "past_month") {
        month = pastMonth;
      } else {
        month = ev.nextOccurrence ? ev.nextOccurrence.getMonth() + 1 : ev.event_month;
      }

      const list = groupsMap.get(month) || [];
      list.push(ev);
      groupsMap.set(month, list);
    }

    return Array.from(groupsMap.entries());
  }, [filteredEvents, sortBy, customMonth, pastMonth]);

  // Tự động mở rộng tất cả các tháng nếu defaultExpandAll = true (dành cho chế độ 7 ngày sắp tới)
  useEffect(() => {
    if (defaultExpandAll && monthGroups.length > 0) {
      const all: Record<number, boolean> = {};
      monthGroups.forEach(([m]) => {
        all[m] = true;
      });
      setExpandedMonths(all);
    }
  }, [defaultExpandAll, monthGroups]);

  // Tiêu đề hiển thị trên nút dropdown
  const currentSortLabel = useMemo(() => {
    if (sortBy === "custom_month_year") {
      return `Tháng ${customMonth}/${customYear}`;
    }
    return sortOptions.find((o) => o.value === sortBy)?.label || "Sắp xếp";
  }, [sortBy, customMonth, customYear]);

  // Kiểm tra xem tất cả các tháng đang hiển thị có đang mở không
  const areAllExpanded = useMemo(() => {
    if (monthGroups.length === 0) return false;
    return monthGroups.every(([m]) => !!expandedMonths[m]);
  }, [monthGroups, expandedMonths]);

  // Chuyển đổi giữa mở rộng tất cả và thu gọn tất cả
  const toggleAllMonths = () => {
    if (areAllExpanded) {
      setExpandedMonths({});
    } else {
      const all: Record<number, boolean> = {};
      monthGroups.forEach(([m]) => {
        all[m] = true;
      });
      setExpandedMonths(all);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search Bar & Filter Controls */}
      <div className="space-y-3.5 bg-card/60 rounded-3xl p-4 sm:p-5 border border-border/80 shadow-xs backdrop-blur-xs">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, sở thích, nhóm hoặc ghi chú..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-secondary/50 border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all placeholder:text-muted-foreground/70"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Group Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {groups.map((grp) => {
            const isSelected = selectedGroup === grp.name;
            return (
              <button
                type="button"
                key={grp.name}
                onClick={() => setSelectedGroup(grp.name)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-primary text-white shadow-soft"
                    : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50"
                )}
              >
                {grp.dotColor && (
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      grp.dotColor,
                      isSelected && "ring-1 ring-white"
                    )}
                  />
                )}
                <span>{grp.name}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-bar: Event Counter & Custom Sort Dropdown */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {filteredEvents.length === events.length
                ? `Tất cả ${events.length} sự kiện`
                : `Hiển thị ${filteredEvents.length} / ${events.length} sự kiện`}
            </span>

            {/* Nút hủy bộ lọc nhanh nếu đang ở chế độ lọc đặc biệt */}
            {(sortBy === "past_month" || sortBy === "custom_month_year") && (
              <button
                type="button"
                onClick={() => setSortBy("remaining")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Quay lại mặc định"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}

            {/* Nút Mở rộng / Thu gọn tất cả các tháng */}
            {monthGroups.length > 0 && !isSearching && (
              <button
                type="button"
                onClick={toggleAllMonths}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-muted-foreground hover:text-foreground bg-secondary/60 hover:bg-secondary border border-border/50 transition-colors cursor-pointer select-none"
                title={areAllExpanded ? "Thu gọn tất cả các tháng" : "Mở rộng tất cả các tháng"}
              >
                {areAllExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 text-primary" />
                    <span>Thu gọn</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 text-primary" />
                    <span>Mở tất cả</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Custom Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                if (sortBy === "custom_month_year") {
                  // Nếu đang ở custom_month_year, bấm vào mở lại popup đổi tháng năm
                  setTempMonth(customMonth);
                  setTempYear(customYear);
                  setIsCustomModalOpen(true);
                } else {
                  setIsSortOpen((prev) => !prev);
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none",
                sortBy === "custom_month_year" || isSortOpen
                  ? "bg-primary/15 border-primary/50 text-primary shadow-xs font-bold"
                  : "bg-secondary/50 border-border/80 text-foreground hover:bg-secondary hover:border-primary/40"
              )}
            >
              {sortBy === "custom_month_year" ? (
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : sortBy === "past_month" ? (
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : (
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
              <span>{currentSortLabel}</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                  isSortOpen && "rotate-180 text-primary"
                )}
              />
            </button>

            {/* Custom Dropdown Menu Popover */}
            <AnimatePresence>
              {isSortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-1.5 space-y-0.5"
                >
                  {sortOptions.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectOption(opt.value)}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left",
                          isSelected
                            ? "bg-primary/15 text-primary font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* MODAL / DIALOG NHẬP THÁNG & NĂM TỰ CHỌN */}
      <AnimatePresence>
        {isCustomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-sm bg-card border border-border/90 rounded-3xl p-5 shadow-2xl z-10 space-y-4 select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Lọc theo tháng & năm</h3>
                    <p className="text-[11px] text-muted-foreground">Chọn tháng và năm bạn muốn xem sự kiện</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Chọn Năm */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  1. Năm cần xem
                </label>
                <div className="flex items-center justify-between bg-secondary/60 rounded-2xl p-1.5 border border-border/70">
                  <button
                    type="button"
                    onClick={() => setTempYear((y) => Math.max(1900, y - 1))}
                    className="p-2 rounded-xl hover:bg-card text-foreground font-bold transition-all active:scale-90"
                    title="Năm trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={tempYear}
                      onChange={(e) => setTempYear(Number(e.target.value) || now.getFullYear())}
                      min={1900}
                      max={2100}
                      className="w-20 text-center font-mono text-base font-black text-foreground bg-transparent border-none focus:outline-none focus:ring-0"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setTempYear((y) => y + 1)}
                    className="p-2 rounded-xl hover:bg-card text-foreground font-bold transition-all active:scale-90"
                    title="Năm sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. Chọn Tháng */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  2. Chọn tháng (Tháng {tempMonth})
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const isSelected = tempMonth === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTempMonth(m)}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 text-center cursor-pointer border",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-sm font-black"
                            : "bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/50"
                        )}
                      >
                        Tháng {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustomFilter}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Áp dụng</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grouped Month List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          title={
            sortBy === "past_month"
              ? `Không có sự kiện nào trong Tháng ${pastMonth}`
              : sortBy === "custom_month_year"
              ? `Không có sự kiện nào vào Tháng ${customMonth}/${customYear}`
              : "Không tìm thấy sự kiện nào"
          }
          description={
            sortBy === "past_month"
              ? `Trong Tháng ${pastMonth} năm ${pastMonthYear} không có sinh nhật hay ngày kỷ niệm nào.`
              : sortBy === "custom_month_year"
              ? `Chưa có sự kiện nào được ghi nhận diễn ra trong tháng ${customMonth} năm ${customYear}.`
              : search || selectedGroup !== "Tất cả"
              ? "Hãy thử thay đổi từ khóa hoặc bộ lọc nhóm khác xem sao nhé."
              : "Bắt đầu lưu giữ những ngày đặc biệt của người thân và bạn bè ngay hôm nay!"
          }
          actionLabel="Thêm sự kiện"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="space-y-4">
          {monthGroups.map(([monthNum, monthEvents]) => {
            const isExpanded = isSearching || !!expandedMonths[monthNum];
            const monthTitle =
              sortBy === "custom_month_year"
                ? `Tháng ${monthNum} năm ${customYear}`
                : sortBy === "past_month"
                ? `Tháng ${monthNum} (1 tháng trước)`
                : `Tháng ${monthNum}`;

            return (
              <CollapsibleMonthGroup
                key={monthNum}
                monthNum={monthNum}
                monthTitle={monthTitle}
                monthEvents={monthEvents}
                isExpanded={isExpanded}
                onToggle={() => toggleMonth(monthNum)}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleEnabled={onToggleEnabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
