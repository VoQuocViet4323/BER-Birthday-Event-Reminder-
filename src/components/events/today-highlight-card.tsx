"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { EventWithMeta } from "@/types/events";
import { fireCelebrationConfetti } from "@/components/common/confetti-celebration";
import { Sparkles, MessageCircle, Send, Heart, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";

interface TodayHighlightCardProps {
  events: EventWithMeta[];
}

export function TodayHighlightCard({ events }: TodayHighlightCardProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedWishEvent, setSelectedWishEvent] = useState<EventWithMeta | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (events.length === 0) return null;

  const currentEvent = events[0];

  // Các mẫu lời chúc được biên soạn sẵn theo từng phong cách
  const wishTemplates = [
    {
      title: "Ấm áp & Chân thành",
      text: `Chúc mừng sinh nhật ${currentEvent.name}! Chúc bạn tuổi mới luôn rực rỡ, bình an, ngập tràn niềm vui và gặt hái được mọi ước mơ nhé! 🎉🎂✨`,
    },
    {
      title: "Hài hước & Vui tươi",
      text: `Happy Birthday ${currentEvent.name}! Thêm một tuổi mới bớt âu lo, tiền vô như nước, nhan sắc thăng hoa và lúc nào cũng cười tươi như hoa nhé! 🥳🍻`,
    },
    {
      title: "Trang trọng & Lịch sự",
      text: `Nhân dịp sinh nhật của ${currentEvent.name}, kính chúc bạn luôn dồi dào sức khỏe, hạnh phúc viên mãn và đạt được nhiều thành công hơn nữa trên con đường sự nghiệp! 🌟💐`,
    },
  ];

  const handleCopyWish = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({
      title: "Đã sao chép lời chúc!",
      description: "Bạn có thể dán vào Zalo hoặc Messenger để gửi ngay.",
      variant: "success",
    });
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 text-white shadow-glow mb-8"
    >
      {/* Background Glow Orbs */}
      <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-pink-500/30 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Avatar with Confetti trigger */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/20 p-1 backdrop-blur-md shadow-2xl">
              <img
                src={
                  currentEvent.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentEvent.name)}`
                }
                alt={currentEvent.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
            <button
              onClick={() => fireCelebrationConfetti()}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white text-rose-600 flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-transform text-sm"
              title="Bắn pháo chúc mừng!"
            >
              🎉
            </button>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Sự kiện đặc biệt hôm nay!</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {currentEvent.name}
              {Boolean(currentEvent.upcomingAge && currentEvent.upcomingAge > 0) && (
                <span className="ml-2.5 text-lg font-semibold opacity-90">
                  (Tròn {currentEvent.upcomingAge} tuổi)
                </span>
              )}
            </h2>
            <p className="text-sm sm:text-base text-white/90 mt-1 max-w-md">
              {currentEvent.note || "Hôm nay là ngày đặc biệt của người thân yêu. Hãy gửi những lời chúc ấm áp nhất nhé!"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap sm:flex-col gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={() => setSelectedWishEvent(currentEvent)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-violet-700 font-bold text-sm shadow-xl hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>Gợi ý lời chúc</span>
          </button>

          <button
            onClick={() => fireCelebrationConfetti()}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Bắn Confetti 🎊</span>
          </button>
        </div>
      </div>

      {/* Modal / Dialog Gợi ý lời chúc và gửi qua Zalo / Messenger / SMS */}
      <AnimatePresence>
        {selectedWishEvent && mounted && createPortal(
          <div
            onClick={() => setSelectedWishEvent(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md text-foreground animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl p-6 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white">
                    💌
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Gửi lời chúc tới {selectedWishEvent.name}</h3>
                    <p className="text-xs text-muted-foreground">Chọn mẫu lời chúc hoặc sao chép nhanh</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWishEvent(null)}
                  className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Danh sách mẫu lời chúc */}
              <div className="space-y-3 my-4 max-h-72 overflow-y-auto pr-1">
                {wishTemplates.map((tpl, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-secondary/50 border border-border/80 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-primary">{tpl.title}</span>
                      <button
                        onClick={() => handleCopyWish(tpl.text, idx)}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{tpl.text}</p>
                  </div>
                ))}
              </div>

              {/* Mở ứng dụng gửi tin nhắn */}
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Mở nhanh ứng dụng</p>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href="https://chat.zalo.me"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 font-bold text-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Zalo
                  </a>
                  <a
                    href="https://www.messenger.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 font-bold text-xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Messenger
                  </a>
                  <a
                    href={`sms:?body=${encodeURIComponent(wishTemplates[0].text)}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-xs transition-colors"
                  >
                    <span>💬 Tin nhắn SMS</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </motion.div>
  );
}
