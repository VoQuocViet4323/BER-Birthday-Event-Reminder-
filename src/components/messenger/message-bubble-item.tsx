"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCheck,
  MoreHorizontal,
  Pin,
  Reply,
  SmilePlus,
} from "lucide-react";
import { ChatMessage, FriendNetworkItem } from "@/types/messenger";
import {
  formatMessageClock,
  getMessagePreviewText,
  isSwipeReplyTriggered,
  MESSAGE_REACTIONS,
  summarizeReactions,
} from "@/lib/messenger-utils";
import { cn } from "@/lib/utils";

interface MessageBubbleItemProps {
  msg: ChatMessage;
  currentUserId: string;
  friend: FriendNetworkItem;
  isMine: boolean;
  isLastMine: boolean;
  replyTarget?: ChatMessage | null;
  isHighlighted?: boolean;
  onOpenMenu: (msg: ChatMessage) => void;
  onReply: (msg: ChatMessage) => void;
  onQuickReact: (messageId: string, emoji: string) => void;
  onOpenImage: (url: string) => void;
  onJumpToMessage: (messageId: string) => void;
}

const SWIPE_THRESHOLD = 50;
const MAX_SWIPE_PX = 70;
const LONG_PRESS_MS = 420;

export function MessageBubbleItem({
  msg,
  currentUserId,
  friend,
  isMine,
  isLastMine,
  replyTarget,
  isHighlighted,
  onOpenMenu,
  onReply,
  onQuickReact,
  onOpenImage,
  onJumpToMessage,
}: MessageBubbleItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showDesktopQuickReact, setShowDesktopQuickReact] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef(false);
  const swipeLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);
  const swipeVibratedRef = useRef(false);
  const lastTapTimeRef = useRef<number>(0);
  const lastHeartTriggerRef = useRef<number>(0);
  const imageClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartBurstTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (imageClickTimerRef.current) clearTimeout(imageClickTimerRef.current);
      if (heartBurstTimerRef.current) clearTimeout(heartBurstTimerRef.current);
    };
  }, []);

  const triggerDoubleHeart = () => {
    if (msg.optimistic || msg.is_recalled) return;
    const now = Date.now();
    // Tránh kích hoạt kép khi trình duyệt mobile vừa phát touchend vừa phát dblclick
    if (now - lastHeartTriggerRef.current < 350) return;
    lastHeartTriggerRef.current = now;

    if (imageClickTimerRef.current) {
      clearTimeout(imageClickTimerRef.current);
      imageClickTimerRef.current = null;
    }

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }

    setShowHeartBurst(true);
    if (heartBurstTimerRef.current) clearTimeout(heartBurstTimerRef.current);
    heartBurstTimerRef.current = setTimeout(() => setShowHeartBurst(false), 620);

    onQuickReact(msg.id, "❤️");
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (msg.optimistic || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    touchMovedRef.current = false;
    swipeLockedRef.current = null;
    longPressTriggeredRef.current = false;
    swipeVibratedRef.current = false;

    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(18);
      }
      onOpenMenu(msg);
    }, LONG_PRESS_MS);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      touchMovedRef.current = true;
      clearLongPress();
    }

    // Tin đã thu hồi không cho vuốt trả lời
    if (msg.is_recalled) return;

    if (!swipeLockedRef.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swipeLockedRef.current = Math.abs(dx) > Math.abs(dy) * 1.25 ? "horizontal" : "vertical";
    }

    if (swipeLockedRef.current !== "horizontal") return;

    // Tin của mình: chỉ vuốt sang TRÁI (dx < 0). Tin của đối phương: chỉ vuốt sang PHẢI (dx > 0)
    const validDirection = isMine ? dx < 0 : dx > 0;
    if (!validDirection) {
      setSwipeOffset(0);
      setIsSwiping(false);
      return;
    }

    const clamped = isMine
      ? Math.max(-MAX_SWIPE_PX, dx * 0.85)
      : Math.min(MAX_SWIPE_PX, dx * 0.85);

    setIsSwiping(true);
    setSwipeOffset(clamped);

    if (isSwipeReplyTriggered(isMine, clamped, SWIPE_THRESHOLD) && !swipeVibratedRef.current) {
      swipeVibratedRef.current = true;
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(12);
      }
    }
  };

  const handleTouchEnd = () => {
    clearLongPress();
    if (isSwiping && !msg.is_recalled && isSwipeReplyTriggered(isMine, swipeOffset, SWIPE_THRESHOLD)) {
      onReply(msg);
    } else if (!touchMovedRef.current && !longPressTriggeredRef.current && !msg.is_recalled && !msg.optimistic) {
      // Nhận diện double-tap trên Mobile để thả tim ❤️
      const now = Date.now();
      if (now - lastTapTimeRef.current <= 300) {
        lastTapTimeRef.current = 0;
        triggerDoubleHeart();
      } else {
        lastTapTimeRef.current = now;
      }
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
    touchMovedRef.current = false;
    swipeLockedRef.current = null;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (msg.optimistic) return;
    e.preventDefault();
    onOpenMenu(msg);
  };

  const reactionSummary = summarizeReactions(msg.reactions);
  const myReaction = msg.reactions?.[currentUserId] || null;
  const swipeProgress = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD);

  const replyAuthorName = replyTarget
    ? replyTarget.sender_id === currentUserId
      ? "chính bạn"
      : friend.display_name
    : "";

  return (
    <div
      data-message-id={msg.id}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
      onMouseLeave={() => setShowDesktopQuickReact(false)}
      className={cn(
        "relative flex items-end gap-2 group select-none sm:select-text transition-colors duration-500 rounded-2xl px-1 py-0.5",
        isMine ? "justify-end" : "justify-start",
        isHighlighted && "bg-primary/15 ring-2 ring-primary/40"
      )}
    >
      {/* Chỉ báo mũi tên Vuốt để Trả lời bên trái (cho tin của đối phương vuốt sang phải) */}
      {!isMine && Math.abs(swipeOffset) > 6 && (
        <div
          style={{
            opacity: swipeProgress,
            transform: `scale(${0.7 + swipeProgress * 0.3})`,
          }}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center pointer-events-none"
        >
          <Reply className="w-4 h-4" />
        </div>
      )}

      {/* Chỉ báo mũi tên Vuốt để Trả lời bên phải (cho tin của mình vuốt sang trái) */}
      {isMine && Math.abs(swipeOffset) > 6 && (
        <div
          style={{
            opacity: swipeProgress,
            transform: `scale(${0.7 + swipeProgress * 0.3})`,
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center pointer-events-none"
        >
          <Reply className="w-4 h-4" />
        </div>
      )}

      {/* Nội dung trượt theo tay khi vuốt */}
      <div
        style={{
          transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
          transition: isSwiping ? "none" : "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={cn(
          "flex items-end gap-2 max-w-full w-full",
          isMine ? "justify-end" : "justify-start"
        )}
      >
        {/* Avatar bạn bè bên trái */}
        {!isMine && (
          <div className="w-7 h-7 rounded-xl overflow-hidden bg-secondary shrink-0 mb-0.5 border border-border/60">
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt={friend.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full gradient-brand text-white font-bold text-[10px] flex items-center justify-center">
                {(friend.display_name || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Thanh hành động nhanh khi hover trên PC (bên trái tin nhắn của mình) */}
        {isMine && !msg.optimistic && (
          <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 mb-4 relative">
            {!msg.is_recalled && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDesktopQuickReact((prev) => !prev)}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    title="Thả cảm xúc"
                    aria-label="Thả cảm xúc"
                  >
                    <SmilePlus className="w-3.5 h-3.5" />
                  </button>
                  {showDesktopQuickReact && (
                    <div className="absolute bottom-full right-0 mb-1.5 flex items-center gap-0.5 px-2 py-1 rounded-full bg-card border border-border shadow-xl z-30">
                      {MESSAGE_REACTIONS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            setShowDesktopQuickReact(false);
                            onQuickReact(msg.id, em);
                          }}
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-base hover:scale-125 transition-transform cursor-pointer",
                            myReaction === em && "bg-primary/15 ring-1 ring-primary/40"
                          )}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onReply(msg)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="Trả lời tin nhắn"
                  aria-label="Trả lời tin nhắn"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onOpenMenu(msg)}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Tùy chọn tin nhắn"
              aria-label="Tùy chọn tin nhắn"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Khối bong bóng tin nhắn + Trích dẫn trả lời + Cảm xúc + Trạng thái */}
        <div
          className={cn(
            "max-w-[78%] sm:max-w-[68%] flex flex-col",
            isMine ? "items-end" : "items-start"
          )}
        >
          {/* Nhãn tin nhắn đã ghim */}
          {msg.is_pinned && !msg.is_recalled && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 mb-1 px-1">
              <Pin className="w-3 h-3 fill-amber-500/30" />
              <span>Đã ghim</span>
            </div>
          )}

          {/* Khối trích dẫn tin nhắn gốc (Reply preview) */}
          {msg.reply_to_id && !msg.is_recalled && (
            <button
              type="button"
              onClick={() => {
                if (msg.reply_to_id) onJumpToMessage(msg.reply_to_id);
              }}
              className={cn(
                "mb-1 px-3 py-1.5 rounded-xl border text-left max-w-full transition-colors cursor-pointer",
                isMine
                  ? "bg-secondary/70 border-border/70 hover:bg-secondary text-muted-foreground"
                  : "bg-secondary/60 border-border/70 hover:bg-secondary text-muted-foreground"
              )}
            >
              <p className="text-[10px] font-bold text-primary flex items-center gap-1 truncate">
                <Reply className="w-2.5 h-2.5 shrink-0" />
                <span>Trả lời {replyAuthorName || "tin nhắn"}</span>
              </p>
              <p className="text-[11px] truncate opacity-85 mt-0.5">
                {getMessagePreviewText(replyTarget)}
              </p>
            </button>
          )}

          {/* Bong bóng chính */}
          <div className="relative">
            {msg.is_recalled ? (
              <div className="px-3.5 py-2 rounded-2xl border border-dashed border-border/80 bg-secondary/40 text-muted-foreground italic text-xs">
                {isMine
                  ? "Bạn đã thu hồi một tin nhắn"
                  : `${friend.display_name} đã thu hồi một tin nhắn`}
              </div>
            ) : (
              <div
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  triggerDoubleHeart();
                }}
                className={cn(
                  "rounded-2xl overflow-hidden shadow-xs transition-opacity relative",
                  msg.optimistic && "opacity-75",
                  isMine
                    ? "gradient-brand text-white rounded-br-md"
                    : "bg-card border border-border/80 text-foreground rounded-bl-md",
                  msg.image_url && !msg.content ? "p-1" : "px-3.5 py-2.5"
                )}
              >
                {/* Hiệu ứng tim bay khi double click / double tap */}
                <AnimatePresence>
                  {showHeartBurst && (
                    <motion.span
                      key="heart-burst"
                      initial={{ opacity: 0, scale: 0.4, y: 6 }}
                      animate={{ opacity: 1, scale: 1.45, y: -6 }}
                      exit={{ opacity: 0, scale: 1.8, y: -22 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl drop-shadow-lg z-20"
                    >
                      ❤️
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Ảnh đính kèm (click đơn mở Lightbox, double click thả tim ❤️) */}
                {msg.image_url && (
                  <button
                    type="button"
                    onClick={() => {
                      if (longPressTriggeredRef.current || !msg.image_url) return;
                      const url = msg.image_url;
                      if (imageClickTimerRef.current) {
                        clearTimeout(imageClickTimerRef.current);
                        imageClickTimerRef.current = null;
                        triggerDoubleHeart();
                      } else {
                        imageClickTimerRef.current = setTimeout(() => {
                          imageClickTimerRef.current = null;
                          onOpenImage(url);
                        }, 240);
                      }
                    }}
                    className={cn(
                      "block overflow-hidden rounded-xl cursor-pointer group/img relative",
                      msg.content && "mb-2"
                    )}
                  >
                    <img
                      src={msg.image_url}
                      alt="Ảnh tin nhắn"
                      loading="lazy"
                      className="max-h-64 sm:max-h-72 w-auto max-w-full rounded-xl object-cover group-hover/img:brightness-95 transition-all"
                    />
                  </button>
                )}

                {/* Văn bản tin nhắn */}
                {msg.content && (
                  <p className="text-[13.5px] sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                )}
              </div>
            )}

            {/* Huy hiệu cảm xúc dính ở góc dưới bong bóng (giống Messenger) */}
            {!msg.is_recalled && reactionSummary.total > 0 && (
              <button
                type="button"
                onClick={() => onOpenMenu(msg)}
                className={cn(
                  "absolute -bottom-3 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border shadow-md text-[11px] cursor-pointer hover:scale-105 active:scale-95 transition-transform z-10",
                  myReaction ? "border-primary/60" : "border-border/80",
                  isMine ? "right-2" : "left-2"
                )}
                title="Bấm để đổi hoặc gỡ cảm xúc"
              >
                {reactionSummary.items.slice(0, 3).map((item) => (
                  <span key={item.emoji} className="leading-none">
                    {item.emoji}
                  </span>
                ))}
                {reactionSummary.total > 1 && (
                  <span className="text-[10px] font-bold text-muted-foreground ml-0.5 leading-none">
                    {reactionSummary.total}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Thời gian + Đã chỉnh sửa + Đã xem */}
          <div
            className={cn(
              "flex items-center gap-1 px-1 text-[10px] text-muted-foreground",
              !msg.is_recalled && reactionSummary.total > 0 ? "mt-3.5" : "mt-1"
            )}
          >
            <span>{formatMessageClock(msg.created_at)}</span>
            {msg.edited_at && !msg.is_recalled && (
              <span className="italic opacity-80">• Đã chỉnh sửa</span>
            )}
            {isMine && isLastMine && !msg.is_recalled && (
              <span className="inline-flex items-center gap-0.5 ml-1">
                {msg.optimistic ? (
                  <span>• Đang gửi</span>
                ) : msg.is_read ? (
                  <span className="text-primary font-semibold inline-flex items-center gap-0.5">
                    <CheckCheck className="w-3 h-3" /> Đã xem
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Đã gửi
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Thanh hành động nhanh khi hover trên PC (bên phải tin nhắn của đối phương) */}
        {!isMine && !msg.optimistic && (
          <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 mb-4 relative">
            {!msg.is_recalled && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDesktopQuickReact((prev) => !prev)}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    title="Thả cảm xúc"
                    aria-label="Thả cảm xúc"
                  >
                    <SmilePlus className="w-3.5 h-3.5" />
                  </button>
                  {showDesktopQuickReact && (
                    <div className="absolute bottom-full left-0 mb-1.5 flex items-center gap-0.5 px-2 py-1 rounded-full bg-card border border-border shadow-xl z-30">
                      {MESSAGE_REACTIONS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            setShowDesktopQuickReact(false);
                            onQuickReact(msg.id, em);
                          }}
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-base hover:scale-125 transition-transform cursor-pointer",
                            myReaction === em && "bg-primary/15 ring-1 ring-primary/40"
                          )}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onReply(msg)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="Trả lời tin nhắn"
                  aria-label="Trả lời tin nhắn"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onOpenMenu(msg)}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Tùy chọn tin nhắn"
              aria-label="Tùy chọn tin nhắn"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
