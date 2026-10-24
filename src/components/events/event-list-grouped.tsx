"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { EventWithMeta, EventGroup } from "@/types/events";
import { EventCard } from "./event-card";
import { EmptyState } from "@/components/common/empty-state";
import { Search, SlidersHorizontal, X, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface EventListGroupedProps {
  events: EventWithMeta[];
  onEdit: (event: EventWithMeta) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onOpenCreateModal: () => void;
  initialSearch?: string;
  initialGroup?: string;
}

export function EventListGrouped({
  events,
  onEdit,
  onDelete,
  onToggleEnabled,
  onOpenCreateModal,
  initialSearch = "",
  initialGroup = "Tất cả",
}: EventListGroupedProps) {
  const [search, setSearch] = useState(initialSearch);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [sortBy, setSortBy] = useState<"remaining" | "name" | "date" | "age">("remaining");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const groups: { name: "Tất cả" | EventGroup; dotColor?: string }[] = [
    { name: "Tất cả" },
    { name: "Gia đình", dotColor: "bg-rose-500" },
    { name: "Bạn bè", dotColor: "bg-amber-500" },
    { name: "Đồng nghiệp", dotColor: "bg-indigo-500" },
    { name: "Khác", dotColor: "bg-emerald-500" },
  ];

  const sortOptions: { value: "remaining" | "name" | "date" | "age"; label: string }[] = [
    { value: "remaining", label: "Sắp tới gần nhất" },
    { value: "name", label: "Tên (A → Z)" },
    { value: "date", label: "Theo ngày trong năm" },
    { value: "age", label: "Theo độ tuổi" },
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

  // Lọc và sắp xếp
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        const matchesSearch =
          ev.name.toLowerCase().includes(search.toLowerCase()) ||
          ev.group_name.toLowerCase().includes(search.toLowerCase()) ||
          (ev.note && ev.note.toLowerCase().includes(search.toLowerCase())) ||
          (ev.gift_idea && ev.gift_idea.toLowerCase().includes(search.toLowerCase())) ||
          ((ev as any).custom_type && (ev as any).custom_type.toLowerCase().includes(search.toLowerCase()));

        const matchesGroup =
          selectedGroup === "Tất cả" || ev.group_name === selectedGroup;

        return matchesSearch && matchesGroup;
      })
      .sort((a, b) => {
        if (sortBy === "remaining") return a.daysRemaining - b.daysRemaining;
        if (sortBy === "name") return a.name.localeCompare(b.name, "vi");
        if (sortBy === "date") {
          return a.event_month !== b.event_month
            ? a.event_month - b.event_month
            : a.event_day - b.event_day;
        }
        if (sortBy === "age") return (b.upcomingAge || 0) - (a.upcomingAge || 0);
        return 0;
      });
  }, [events, search, selectedGroup, sortBy]);

  // Gom nhóm theo tháng diễn ra tiếp theo
  const monthGroups = useMemo(() => {
    const groupsMap = new Map<number, EventWithMeta[]>();

    for (const ev of filteredEvents) {
      const month = ev.nextOccurrence ? ev.nextOccurrence.getMonth() + 1 : ev.event_month;
      const list = groupsMap.get(month) || [];
      list.push(ev);
      groupsMap.set(month, list);
    }

    return Array.from(groupsMap.entries());
  }, [filteredEvents]);

  const currentSortLabel = sortOptions.find((o) => o.value === sortBy)?.label || "Sắp xếp";

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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
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
                key={grp.name}
                type="button"
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
          <span className="text-xs font-semibold text-muted-foreground">
            {filteredEvents.length === events.length
              ? `Tất cả ${events.length} sự kiện`
              : `Hiển thị ${filteredEvents.length} / ${events.length} sự kiện`}
          </span>

          {/* Custom Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none",
                isSortOpen
                  ? "bg-primary/10 border-primary/50 text-primary shadow-xs"
                  : "bg-secondary/50 border-border/80 text-foreground hover:bg-secondary hover:border-primary/40"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
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
                  className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-1.5 space-y-0.5"
                >
                  {sortOptions.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.value);
                          setIsSortOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left",
                          isSelected
                            ? "bg-primary/15 text-primary font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                        )}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Grouped Month List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          title="Không tìm thấy sự kiện nào"
          description={
            search || selectedGroup !== "Tất cả"
              ? "Hãy thử thay đổi từ khóa hoặc bộ lọc nhóm khác xem sao nhé."
              : "Bắt đầu lưu giữ những ngày đặc biệt của người thân và bạn bè ngay hôm nay!"
          }
          actionLabel="Thêm sự kiện đầu tiên"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="space-y-7">
          {monthGroups.map(([monthNum, monthEvents]) => (
            <div key={monthNum} className="space-y-3">
              {/* Header Tháng tinh gọn */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full gradient-brand" />
                  <span className="text-sm font-black text-foreground tracking-tight">
                    Tháng {monthNum}
                  </span>
                </div>
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-[11px] font-semibold text-muted-foreground bg-secondary/70 px-2 py-0.5 rounded-md border border-border/40">
                  {monthEvents.length} sự kiện
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {monthEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleEnabled={onToggleEnabled}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
