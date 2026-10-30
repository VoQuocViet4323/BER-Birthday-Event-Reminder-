"use client";

import { useState, useRef } from "react";
import { EventWithMeta } from "@/types/events";
import { fireCelebrationConfetti } from "@/components/common/confetti-celebration";
import { Sparkles, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { WishSuggestionModal } from "./wish-suggestion-modal";
import { cn } from "@/lib/utils";

interface TodayHighlightCardProps {
  events: EventWithMeta[];
  onSelectEvent?: (event: EventWithMeta) => void;
}

const GRADIENT_THEMES = [
  "from-violet-600 via-fuchsia-600 to-rose-500",
  "from-indigo-600 via-purple-600 to-pink-500",
  "from-rose-500 via-pink-600 to-amber-500",
  "from-emerald-600 via-teal-600 to-cyan-500",
  "from-purple-600 via-violet-600 to-indigo-500",
];

export function TodayHighlightCard({ events, onSelectEvent }: TodayHighlightCardProps) {
  const [selectedWishEvent, setSelectedWishEvent] = useState<EventWithMeta | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (events.length === 0) return null;

  // Lắng nghe cuộn ngang để cập nhật chỉ số card đang hiển thị
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const children = Array.from(container.children) as HTMLElement[];
    if (!children.length) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    children.forEach((child, index) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  };

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const children = Array.from(container.children) as HTMLElement[];
    if (children[index]) {
      children[index].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      setActiveIndex(index);
    }
  };

  const scrollDir = (direction: "left" | "right") => {
    const nextIdx =
      direction === "left"
        ? Math.max(0, activeIndex - 1)
        : Math.min(events.length - 1, activeIndex + 1);
    scrollToIndex(nextIdx);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        {/* Tiêu đề & thanh điều hướng khi có từ 2 sự kiện trở lên trong ngày */}
        {events.length > 1 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <h3 className="text-sm font-bold text-foreground">
                Hôm nay có <span className="text-primary font-extrabold">{events.length}</span> sự kiện đặc biệt!
              </h3>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                (Vuốt ngang để xem thêm)
              </span>
            </div>

            {/* Nút lướt trái/phải & chấm phân trang */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollDir("left")}
                disabled={activeIndex === 0}
                className="w-7 h-7 rounded-full bg-card border border-border/80 flex items-center justify-center text-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
                title="Sự kiện trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {events.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                      activeIndex === i
                        ? "w-5 bg-primary"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                    )}
                    aria-label={`Chuyển đến sự kiện ${i + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollDir("right")}
                disabled={activeIndex === events.length - 1}
                className="w-7 h-7 rounded-full bg-card border border-border/80 flex items-center justify-center text-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
                title="Sự kiện tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Khay thẻ sự kiện cuộn ngang mượt mà (Snap Horizontal Carousel) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={cn(
            "flex gap-4 scrollbar-none pb-2 scroll-smooth touch-pan-x",
            events.length > 1
              ? "overflow-x-auto snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
              : "overflow-hidden"
          )}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {events.map((ev, idx) => {
            const isEligibleForWishes =
              ev.event_type === "birthday" || ev.event_type === "anniversary";
            const gradientClass = GRADIENT_THEMES[idx % GRADIENT_THEMES.length];

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvent?.(ev)}
                className={cn(
                  "relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br text-white shadow-glow shrink-0 snap-center flex flex-col justify-between transition-all duration-300 group",
                  gradientClass,
                  events.length > 1
                    ? "w-[88vw] max-w-[560px] sm:w-[540px] cursor-pointer"
                    : "w-full cursor-default"
                )}
              >
                {/* Background Glow Orbs */}
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-pink-500/30 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Avatar with Confetti trigger */}
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/20 p-1 backdrop-blur-md shadow-2xl group-hover:scale-105 transition-transform">
                        <img
                          src={
                            ev.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ev.name)}`
                          }
                          alt={ev.name}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fireCelebrationConfetti();
                        }}
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white text-rose-600 flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-transform text-sm cursor-pointer z-20"
                        title="Bắn pháo chúc mừng!"
                      >
                        🎉
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide uppercase">
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          <span>Sự kiện đặc biệt hôm nay!</span>
                          {events.length > 1 && (
                            <span className="opacity-90 font-mono text-[11px] ml-0.5">
                              ({idx + 1}/{events.length})
                            </span>
                          )}
                        </div>
                        {(ev.custom_group || ev.group_name) && (
                          <span className="px-2.5 py-0.5 rounded-full bg-black/20 backdrop-blur-xs text-white/95 text-xs font-semibold">
                            {ev.custom_group || ev.group_name}
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {ev.name}
                        {Boolean(ev.upcomingAge && ev.upcomingAge > 0) && (
                          <span className="ml-2.5 text-lg font-semibold opacity-90">
                            (Tròn {ev.upcomingAge} tuổi)
                          </span>
                        )}
                      </h2>
                      <p className="text-sm sm:text-base text-white/90 mt-1 max-w-md line-clamp-2">
                        {ev.note ||
                          "Hôm nay là ngày đặc biệt của người thân yêu. Hãy gửi những lời chúc ấm áp nhất nhé!"}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap sm:flex-col gap-2.5 w-full md:w-auto shrink-0 z-20">
                    {isEligibleForWishes && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWishEvent(ev);
                        }}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-violet-700 font-bold text-sm shadow-xl hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <span>Gợi ý lời chúc</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fireCelebrationConfetti();
                      }}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-sm transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Bắn Confetti 🎊</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Modal Gợi ý lời chúc cho sự kiện được chọn */}
      {selectedWishEvent && (
        <WishSuggestionModal
          isOpen={Boolean(selectedWishEvent)}
          onClose={() => setSelectedWishEvent(null)}
          event={selectedWishEvent}
        />
      )}
    </>
  );
}
