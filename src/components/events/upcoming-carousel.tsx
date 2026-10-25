"use client";

import { EventWithMeta } from "@/types/events";
import { formatDaysRemainingText } from "@/lib/utils";
import { Clock, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UpcomingCarouselProps {
  events: EventWithMeta[];
  onSelectEvent?: (event: EventWithMeta) => void;
}

export function UpcomingCarousel({ events, onSelectEvent }: UpcomingCarouselProps) {
  // Lọc các sự kiện sắp tới trong 30 ngày (bỏ qua hôm nay vì đã có thẻ Hôm Nay)
  const upcomingEvents = events
    .filter((e) => e.daysRemaining > 0 && e.daysRemaining <= 30)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  if (upcomingEvents.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Clock className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Sắp diễn ra</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {upcomingEvents.length}
          </span>
        </div>

        <Link
          href="/events"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {upcomingEvents.map((ev) => {
          const remainingInfo = formatDaysRemainingText(ev.daysRemaining);
          const typeLabel =
            ev.event_type === "birthday"
              ? "Sinh nhật"
              : ev.event_type === "anniversary"
              ? "Kỷ niệm"
              : ev.event_type === "memorial"
              ? "Ngày giỗ"
              : "Sự kiện";

          return (
            <div
              key={ev.id}
              onClick={() => onSelectEvent?.(ev)}
              className="min-w-[240px] max-w-[260px] snap-start rounded-3xl bg-card border border-border/80 p-4 shadow-card hover:shadow-soft-hover transition-all duration-200 flex flex-col justify-between shrink-0 group cursor-pointer active:scale-[0.98] touch-manipulation"
            >
              <div>
                {/* Header card: Avatar & Countdown badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/10 border border-primary/20 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    {ev.avatar_url ? (
                      <img src={ev.avatar_url} alt={ev.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full gradient-brand text-white flex items-center justify-center font-bold text-base">
                        {ev.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0",
                      remainingInfo.badgeClass
                    )}
                  >
                    {remainingInfo.text}
                  </span>
                </div>

                {/* Event Name & Type */}
                <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {ev.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span>{typeLabel}</span>
                  {Boolean(ev.upcomingAge && ev.upcomingAge > 0) && (
                    <span className="font-semibold text-primary">
                      • Tròn {ev.upcomingAge} tuổi
                    </span>
                  )}
                </p>
              </div>

              {/* Footer: Date and group */}
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3 h-3 text-primary/70" />
                  {ev.displayDate}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-secondary font-semibold">
                  {(ev as any).custom_group || ev.group_name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
