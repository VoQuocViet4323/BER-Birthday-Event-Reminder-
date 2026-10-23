"use client";

import { useState, useMemo } from "react";
import { EventWithMeta, EventGroup } from "@/types/events";
import { EventCard } from "./event-card";
import { EmptyState } from "@/components/common/empty-state";
import { Search, SlidersHorizontal, X } from "lucide-react";
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

  const groups: ("Tất cả" | EventGroup)[] = [
    "Tất cả",
    "Gia đình",
    "Bạn bè",
    "Đồng nghiệp",
    "Khác",
  ];

  // Lọc và sắp xếp
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        const matchesSearch =
          ev.name.toLowerCase().includes(search.toLowerCase()) ||
          ev.group_name.toLowerCase().includes(search.toLowerCase()) ||
          (ev.note && ev.note.toLowerCase().includes(search.toLowerCase())) ||
          (ev.gift_idea && ev.gift_idea.toLowerCase().includes(search.toLowerCase()));

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
      const month = ev.nextOccurrence.getMonth() + 1;
      const list = groupsMap.get(month) || [];
      list.push(ev);
      groupsMap.set(month, list);
    }

    return Array.from(groupsMap.entries());
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      {/* Search Bar & Filter Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, sở thích hoặc nhóm..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-card border border-border shadow-xs focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Group Filter Chips & Sort Select */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            {groups.map((grp) => (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0",
                  selectedGroup === grp
                    ? "bg-primary text-white shadow-soft"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {grp}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-muted-foreground border-none outline-none cursor-pointer hover:text-foreground"
            >
              <option value="remaining">Sắp xếp: Ngày còn lại</option>
              <option value="name">Tên A-Z</option>
              <option value="date">Ngày trong năm</option>
              <option value="age">Độ tuổi</option>
            </select>
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
        <div className="space-y-8">
          {monthGroups.map(([monthNum, monthEvents]) => (
            <div key={monthNum} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1 rounded-full gradient-brand-subtle text-primary border border-primary/20">
                  Tháng {monthNum}
                </span>
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-xs text-muted-foreground font-medium">
                  {monthEvents.length} sự kiện
                </span>
              </div>

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
