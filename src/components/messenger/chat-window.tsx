"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Images,
  Smile,
  X,
  Check,
  MoreVertical,
  UserMinus,
  Download,
  Loader2,
  Lock,
  History,
  Pin,
  PinOff,
  Reply,
  Pencil,
  ChevronRight,
} from "lucide-react";
import { ChatMessage, FriendNetworkItem } from "@/types/messenger";
import { useConversation } from "@/hooks/use-messenger";
import {
  getMessagePreviewText,
  isUserOnline,
  MAX_CHAT_IMAGE_BYTES,
  MAX_PINNED_MESSAGES,
} from "@/lib/messenger-utils";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { MessageBubbleItem } from "./message-bubble-item";
import { MessageActionSheet } from "./message-action-sheet";

const QUICK_EMOJIS = ["🎂", "🎉", "❤️", "🥰", "😂", "🙏", "👍", "🔥", "✨", "💐"];

interface ChatWindowProps {
  currentUserId: string;
  friend: FriendNetworkItem;
  onBackMobile?: () => void;
  onUnfriend: (friendshipId: string) => Promise<void>;
}

export function ChatWindow({
  currentUserId,
  friend,
  onBackMobile,
  onUnfriend,
}: ChatWindowProps) {
  const isAccepted = friend.status === "accepted";
  const {
    messages,
    pinnedMessages,
    sharedImages,
    isLoading,
    isLoadingMedia,
    hasMoreMessages,
    isLoadingOlder,
    loadOlderMessages,
    friendIsTyping,
    notifyTyping,
    sendMessage,
    isSending,
    editMessage,
    isEditing,
    recallForEveryone,
    hideForMe,
    toggleReaction,
    togglePin,
  } = useConversation(currentUserId, friend.friend_id, isAccepted);

  const { toast } = useToast();
  const [text, setText] = useState("");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [confirmUnfriend, setConfirmUnfriend] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // State cho tương tác tin nhắn (Menu bấm giữ, Trả lời, Chỉnh sửa, Nhảy & Highlight)
  const [activeActionMessage, setActiveActionMessage] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const lastMsgIdRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Map tra cứu nhanh tin nhắn gốc khi render trích dẫn trả lời
  const messageById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    messages.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    setMounted(true);
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  // Reset trạng thái đang trả lời / chỉnh sửa khi đổi bạn bè
  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
    setActiveActionMessage(null);
    setShowPinnedModal(false);
    setText("");
  }, [friend.friend_id]);

  // Chỉ cuộn nội bộ vùng tin nhắn (tránh iOS Safari đẩy cả viewport khi bật bàn phím)
  const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (latestMessageId !== lastMsgIdRef.current || friendIsTyping) {
      lastMsgIdRef.current = latestMessageId;
      scrollToBottom("smooth");
    }
  }, [latestMessageId, friendIsTyping, friend.friend_id]);

  // Khi bàn phím ảo trên Mobile thay đổi kích thước viewport, giữ khung tin nhắn cuộn sát tin mới nhất
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handleViewportResize = () => {
      requestAnimationFrame(() => scrollToBottom("auto"));
    };
    window.visualViewport.addEventListener("resize", handleViewportResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  // Đóng menu header khi click ra ngoài
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false);
        setConfirmUnfriend(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    };
  }, [pendingImagePreview]);

  const jumpToMessage = (messageId: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetEl = container.querySelector(
      `[data-message-id="${messageId}"]`
    ) as HTMLElement | null;

    if (!targetEl) {
      toast({
        title: "Tin nhắn nằm ở lịch sử cũ hơn — hãy bấm 'Tải thêm tin nhắn cũ hơn'",
        variant: "warning",
      });
      return;
    }

    const offsetTop = targetEl.offsetTop - container.clientHeight / 2 + targetEl.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, offsetTop), behavior: "smooth" });
    setHighlightedMessageId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
    }, 1600);
  };

  const startReply = (msg: ChatMessage) => {
    setEditingMessage(null);
    setReplyingTo(msg);
    setTimeout(() => textareaRef.current?.focus(), 60);
  };

  const startEdit = (msg: ChatMessage) => {
    setReplyingTo(null);
    clearPendingImage();
    setEditingMessage(msg);
    setText(msg.content || "");
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 60);
  };

  const cancelEditOrReply = () => {
    if (editingMessage) {
      setEditingMessage(null);
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
    setReplyingTo(null);
  };

  const attachImageFile = (file: File) => {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
    if (!isImage) {
      toast({ title: "Vui lòng chọn tệp hình ảnh hợp lệ", variant: "error" });
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      toast({ title: "Ảnh vượt quá giới hạn 30MB", variant: "error" });
      return;
    }

    setEditingMessage(null);
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImageFile(file);
    setPendingImagePreview(URL.createObjectURL(file));
  };

  const clearPendingImage = () => {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImageFile(null);
    setPendingImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) attachImageFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          attachImageFile(file);
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    if (!isAccepted) return;

    // Chế độ lưu chỉnh sửa tin nhắn
    if (editingMessage) {
      const trimmed = text.trim();
      if (!trimmed || isEditing) return;
      if (trimmed === editingMessage.content.trim()) {
        cancelEditOrReply();
        return;
      }
      const targetId = editingMessage.id;
      setEditingMessage(null);
      setText("");
      setShowEmojiPicker(false);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      try {
        await editMessage({ messageId: targetId, content: trimmed });
      } catch {}
      return;
    }

    // Chế độ gửi tin nhắn mới (kèm tùy chọn reply_to_id & ảnh)
    if ((!text.trim() && !pendingImageFile) || isSending) return;
    const contentToSend = text;
    const imageToSend = pendingImageFile;
    const replyToId = replyingTo?.id || null;

    setText("");
    setReplyingTo(null);
    setShowEmojiPicker(false);
    clearPendingImage();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await sendMessage({
        content: contentToSend,
        imageFile: imageToSend,
        replyToId,
      });
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && (editingMessage || replyingTo)) {
      e.preventDefault();
      cancelEditOrReply();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (!editingMessage) notifyTyping();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const online = isUserOnline(friend.last_seen_at);
  const lastMyMessageId = [...messages]
    .reverse()
    .find((m) => m.sender_id === currentUserId)?.id;

  const latestPinned = pinnedMessages[0] || null;

  return (
    <div className="flex flex-col h-full bg-background/40">
      {/* Header Khung Chat */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 border-b border-border/70 bg-card/85 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {onBackMobile && (
            <motion.button
              type="button"
              onClick={onBackMobile}
              whileHover={{ x: -2, scale: 1.06 }}
              whileTap={{ x: -6, scale: 0.86 }}
              transition={{ type: "spring", stiffness: 460, damping: 22 }}
              className="lg:hidden group w-9 h-9 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 flex items-center justify-center text-foreground shrink-0 cursor-pointer touch-manipulation"
              aria-label="Quay lại danh sách"
            >
              <ArrowLeft className="w-5 h-5 transition-transform duration-150 group-hover:-translate-x-0.5" />
            </motion.button>
          )}

          {/* Avatar + Chấm Online */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl gradient-brand p-0.5 overflow-hidden shadow-xs">
              <div className="w-full h-full rounded-[14px] bg-card overflow-hidden flex items-center justify-center">
                {friend.avatar_url ? (
                  <img
                    src={friend.avatar_url}
                    alt={friend.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full gradient-brand text-white font-bold text-sm flex items-center justify-center">
                    {(friend.display_name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            {online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
            )}
          </div>

          {/* Tên & Trạng thái */}
          <div className="min-w-0">
            <h2 className="font-bold text-sm sm:text-base text-foreground truncate leading-tight">
              {friend.display_name}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
              {friendIsTyping ? (
                <span className="text-primary font-semibold">Đang nhập tin nhắn...</span>
              ) : online ? (
                <span className="text-emerald-500 font-medium">Đang hoạt động</span>
              ) : (
                <span>{friend.email || friend.friend_code}</span>
              )}
            </p>
          </div>
        </div>

        {/* Kho ảnh đã gửi & Menu tùy chọn hội thoại */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowMediaGallery(true)}
            className="relative w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            title="Kho ảnh đã chia sẻ trong cuộc trò chuyện"
            aria-label="Kho ảnh đã chia sẻ"
          >
            <Images className="w-4 h-4" />
            {sharedImages.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary/15 text-primary text-[9px] font-extrabold flex items-center justify-center">
                {sharedImages.length > 99 ? "99+" : sharedImages.length}
              </span>
            )}
          </button>

          <div className="relative" ref={headerMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowHeaderMenu((prev) => !prev);
                setConfirmUnfriend(false);
              }}
              className="w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Tùy chọn đoạn chat"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showHeaderMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 mt-1.5 w-52 p-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-xl z-30 text-xs"
                >
                  <div className="px-2.5 py-2 border-b border-border/60 mb-1">
                    <p className="font-bold text-foreground truncate">{friend.display_name}</p>
                    <p className="text-[10px] text-muted-foreground tracking-wider mt-0.5">
                      Mã QR: {friend.friend_code}
                    </p>
                  </div>

                  {pinnedMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeaderMenu(false);
                        setShowPinnedModal(true);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-foreground hover:bg-secondary font-semibold transition-colors cursor-pointer mb-0.5"
                    >
                      <span className="flex items-center gap-2">
                        <Pin className="w-3.5 h-3.5 text-amber-500" />
                        <span>Tin nhắn đã ghim</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-500">
                        {pinnedMessages.length}/{MAX_PINNED_MESSAGES}
                      </span>
                    </button>
                  )}

                  {!confirmUnfriend ? (
                    <button
                      type="button"
                      onClick={() => setConfirmUnfriend(true)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 font-semibold transition-colors cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Hủy kết bạn</span>
                    </button>
                  ) : (
                    <div className="p-2 space-y-2">
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Hủy kết bạn sẽ dừng khả năng nhắn tin qua lại. Xác nhận?
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmUnfriend(false)}
                          className="flex-1 py-1.5 rounded-lg bg-secondary text-foreground font-semibold cursor-pointer"
                        >
                          Giữ lại
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setShowHeaderMenu(false);
                            await onUnfriend(friend.friendship_id);
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-rose-500 text-white font-bold cursor-pointer"
                        >
                          Hủy bạn
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Thanh Tin Nhắn Đã Ghim (tối đa 5 tin nhắn, hiển thị gọn gàng ngay dưới Header) */}
      <AnimatePresence>
        {latestPinned && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border/60 bg-amber-500/[0.07] dark:bg-amber-500/[0.09] shrink-0 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2">
              <button
                type="button"
                onClick={() => jumpToMessage(latestPinned.id)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                  <Pin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                    Tin nhắn đã ghim ({pinnedMessages.length}/{MAX_PINNED_MESSAGES})
                  </p>
                  <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">
                    {getMessagePreviewText(latestPinned)}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowPinnedModal(true)}
                className="px-2.5 py-1 rounded-xl bg-card/80 hover:bg-card border border-border/70 text-[11px] font-bold text-foreground flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
              >
                <span>Danh sách</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Khu vực luồng tin nhắn */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-2.5 sm:px-5 py-4 space-y-2 overscroll-contain"
      >
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Đang tải cuộc trò chuyện...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-3">
            <div className="w-16 h-16 rounded-3xl gradient-brand p-0.5 shadow-soft">
              <div className="w-full h-full rounded-[22px] bg-card overflow-hidden flex items-center justify-center">
                {friend.avatar_url ? (
                  <img
                    src={friend.avatar_url}
                    alt={friend.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-extrabold text-primary">
                    {(friend.display_name || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-sm font-bold text-foreground">
                Hai bạn đã kết nối với nhau! 🎉
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gửi lời chào hoặc một bức ảnh để bắt đầu trò chuyện cùng{" "}
                <strong>{friend.display_name}</strong> nhé.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {["Xin chào 👋", "Chúc mừng sinh nhật 🎂", "Khoẻ không bạn? 😊"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => sendMessage({ content: preset })}
                  className="px-3 py-1.5 rounded-full bg-secondary/70 hover:bg-primary/15 hover:text-primary border border-border/70 text-xs font-medium transition-all active:scale-95 cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {hasMoreMessages && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  disabled={isLoadingOlder}
                  onClick={loadOlderMessages}
                  className="px-3.5 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border/70 text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoadingOlder ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <History className="w-3.5 h-3.5" />
                  )}
                  <span>{isLoadingOlder ? "Đang tải lịch sử..." : "Tải thêm tin nhắn cũ hơn"}</span>
                </button>
              </div>
            )}

            {messages.map((msg, index) => {
              const isMine = msg.sender_id === currentUserId;
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const currentDay = new Date(msg.created_at).toLocaleDateString("vi-VN");
              const prevDay = prevMsg
                ? new Date(prevMsg.created_at).toLocaleDateString("vi-VN")
                : null;
              const showDateDivider = currentDay !== prevDay;
              const isLastMine = msg.id === lastMyMessageId;
              const replyTarget = msg.reply_to_id ? messageById.get(msg.reply_to_id) || null : null;

              return (
                <div key={msg.id} className="space-y-2">
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-3">
                      <span className="px-3 py-1 rounded-full bg-secondary/70 border border-border/50 text-[10px] font-semibold text-muted-foreground">
                        {currentDay === new Date().toLocaleDateString("vi-VN")
                          ? "Hôm nay"
                          : currentDay}
                      </span>
                    </div>
                  )}

                  <MessageBubbleItem
                    msg={msg}
                    currentUserId={currentUserId}
                    friend={friend}
                    isMine={isMine}
                    isLastMine={isLastMine}
                    replyTarget={replyTarget}
                    isHighlighted={highlightedMessageId === msg.id}
                    onOpenMenu={(m) => setActiveActionMessage(m)}
                    onReply={startReply}
                    onQuickReact={(messageId, emoji) =>
                      toggleReaction({ messageId, emoji })
                    }
                    onOpenImage={(url) => setLightboxImageUrl(url)}
                    onJumpToMessage={jumpToMessage}
                  />
                </div>
              );
            })}

            {/* Hiệu ứng đang nhập */}
            {friendIsTyping && (
              <div className="flex items-end gap-2 px-1">
                <div className="w-7 h-7 rounded-xl overflow-hidden bg-secondary shrink-0 border border-border/60 flex items-center justify-center text-[10px] font-bold">
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (friend.display_name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-card border border-border/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Khu vực nhập tin nhắn (Composer) */}
      <div className="border-t border-border/70 bg-card/90 backdrop-blur-md p-2.5 sm:p-3.5 shrink-0 relative">
        {!isAccepted ? (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Chỉ có thể nhắn tin sau khi hai bạn đã chấp nhận kết bạn.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Thanh Trả lời tin nhắn / Chỉnh sửa tin nhắn */}
            <AnimatePresence>
              {(replyingTo || editingMessage) && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className={cn(
                    "flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl border text-xs",
                    editingMessage
                      ? "bg-blue-500/10 border-blue-500/25"
                      : "bg-primary/10 border-primary/25"
                  )}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {editingMessage ? (
                      <Pencil className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    ) : (
                      <Reply className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-[11px] font-bold leading-tight",
                          editingMessage ? "text-blue-500" : "text-primary"
                        )}
                      >
                        {editingMessage
                          ? "Đang chỉnh sửa tin nhắn"
                          : `Đang trả lời ${
                              replyingTo?.sender_id === currentUserId
                                ? "chính bạn"
                                : friend.display_name
                            }`}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {getMessagePreviewText(editingMessage || replyingTo)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEditOrReply}
                    className="w-7 h-7 rounded-full hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    aria-label="Hủy"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thanh xem trước ảnh nháp trước khi gửi */}
            <AnimatePresence>
              {pendingImagePreview && !editingMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="flex items-center gap-2.5 px-2 pt-1"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border shadow-xs shrink-0">
                    <img
                      src={pendingImagePreview}
                      alt="Ảnh chuẩn bị gửi"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearPendingImage}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-500 transition-colors cursor-pointer"
                      aria-label="Xóa ảnh đính kèm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <p className="font-semibold text-foreground">Ảnh sẵn sàng gửi</p>
                    <p>Tự động nén sắc nét, bấm Gửi hoặc Enter</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Popover Emoji nhanh */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  className="flex items-center gap-1 flex-wrap p-2 rounded-2xl bg-secondary/90 border border-border shadow-md"
                >
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        handleTextChange(`${text}${em}`);
                        textareaRef.current?.focus();
                      }}
                      className="w-8 h-8 rounded-xl hover:bg-card flex items-center justify-center text-base transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-1.5 sm:gap-2">
              {!editingMessage && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                    className="w-10 h-10 rounded-2xl bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-primary flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer touch-manipulation"
                    title="Gửi hình ảnh (hỗ trợ dán ảnh Ctrl+V)"
                    aria-label="Gửi hình ảnh"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer touch-manipulation",
                  showEmojiPicker
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-primary"
                )}
                title="Chèn biểu cảm"
                aria-label="Chèn biểu cảm"
              >
                <Smile className="w-5 h-5" />
              </button>

              <div className="flex-1 bg-secondary/60 border border-border/80 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/15 rounded-2xl px-3.5 py-2 transition-all">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onFocus={() => {
                    setTimeout(() => scrollToBottom("auto"), 120);
                  }}
                  placeholder={
                    editingMessage
                      ? "Nhập nội dung chỉnh sửa..."
                      : `Nhắn tin tới ${friend.display_name}...`
                  }
                  className="w-full bg-transparent text-[16px] sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none resize-none max-h-28 leading-snug block"
                />
              </div>

              <button
                type="button"
                onClick={handleSend}
                disabled={
                  editingMessage
                    ? isEditing || !text.trim()
                    : isSending || (!text.trim() && !pendingImageFile)
                }
                className="w-10 h-10 rounded-2xl gradient-brand text-white flex items-center justify-center shrink-0 shadow-soft hover:shadow-soft-hover active:scale-95 transition-all cursor-pointer disabled:opacity-45 disabled:scale-100 touch-manipulation"
                title={editingMessage ? "Lưu chỉnh sửa" : "Gửi tin nhắn"}
                aria-label={editingMessage ? "Lưu chỉnh sửa" : "Gửi tin nhắn"}
              >
                {isSending || isEditing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingMessage ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Sheet khi bấm giữ (Mobile) hoặc bấm tùy chọn (PC) */}
      <MessageActionSheet
        message={activeActionMessage}
        currentUserId={currentUserId}
        friendName={friend.display_name}
        pinnedCount={pinnedMessages.length}
        onClose={() => setActiveActionMessage(null)}
        onReact={(messageId, emoji) => toggleReaction({ messageId, emoji })}
        onReply={startReply}
        onEdit={startEdit}
        onTogglePin={(m) => togglePin(m)}
        onRecallForEveryone={(m) => recallForEveryone(m)}
        onHideForMe={(messageId) => hideForMe(messageId)}
      />

      {/* Modal Danh sách tin nhắn đã ghim (tối đa 5 tin) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {showPinnedModal && (
              <motion.div
                key="pinned-messages-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPinnedModal(false)}
                className="fixed inset-0 z-[135] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 14 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md max-h-[80vh] bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                        <Pin className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">
                          Tin nhắn đã ghim ({pinnedMessages.length}/{MAX_PINNED_MESSAGES})
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Ghim tối đa {MAX_PINNED_MESSAGES} tin nhắn quan trọng cho cả hai phía
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPinnedModal(false)}
                      className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Đóng"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                    {pinnedMessages.length === 0 ? (
                      <p className="py-10 text-center text-xs text-muted-foreground">
                        Chưa có tin nhắn nào được ghim.
                      </p>
                    ) : (
                      pinnedMessages.map((pm) => (
                        <div
                          key={pm.id}
                          className="p-3 rounded-2xl bg-secondary/45 border border-border/70 flex items-start justify-between gap-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setShowPinnedModal(false);
                              jumpToMessage(pm.id);
                            }}
                            className="min-w-0 flex-1 text-left space-y-1 cursor-pointer group"
                          >
                            <p className="text-[11px] font-bold text-primary">
                              {pm.sender_id === currentUserId ? "Bạn" : friend.display_name}
                            </p>
                            <p className="text-xs text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                              {getMessagePreviewText(pm)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(pm.created_at).toLocaleString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => togglePin(pm)}
                            className="px-2.5 py-1.5 rounded-xl bg-secondary hover:bg-rose-500/15 hover:text-rose-500 text-[11px] font-bold text-muted-foreground flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                            title="Bỏ ghim tin nhắn này"
                          >
                            <PinOff className="w-3.5 h-3.5" />
                            <span>Bỏ ghim</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Modal Kho ảnh đã chia sẻ (truy vấn trực tiếp từ DB) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {showMediaGallery && (
              <motion.div
                key="shared-media-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMediaGallery(false)}
                className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 14 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md max-h-[80vh] bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                        <Images className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">
                          Ảnh đã chia sẻ ({sharedImages.length})
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Lưu trữ đồng bộ trên hệ thống cùng {friend.display_name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMediaGallery(false)}
                      className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Đóng"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {isLoadingMedia ? (
                      <div className="py-12 flex items-center justify-center text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : sharedImages.length === 0 ? (
                      <div className="py-12 text-center space-y-2 text-muted-foreground">
                        <ImageIcon className="w-8 h-8 mx-auto opacity-50" />
                        <p className="text-xs font-semibold text-foreground">
                          Chưa có ảnh nào được gửi
                        </p>
                        <p className="text-[11px]">
                          Mọi ảnh hai bạn gửi cho nhau sẽ tự động được lưu giữ tại đây.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {sharedImages.map((imgMsg) => (
                          <button
                            key={imgMsg.id}
                            type="button"
                            onClick={() => {
                              setShowMediaGallery(false);
                              setLightboxImageUrl(imgMsg.image_url);
                            }}
                            className="aspect-square rounded-xl overflow-hidden bg-secondary border border-border/60 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                          >
                            <img
                              src={imgMsg.image_url || ""}
                              alt="Ảnh đã chia sẻ"
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Lightbox phóng to ảnh trong tin nhắn */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {lightboxImageUrl && (
              <motion.div
                key="chat-image-lightbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLightboxImageUrl(null)}
                className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
              >
                <div
                  className="relative max-w-3xl max-h-[82vh] flex flex-col items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={lightboxImageUrl}
                    alt="Xem ảnh lớn"
                    className="max-w-full max-h-[75vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                  />
                  <div className="flex items-center gap-2.5">
                    <a
                      href={lightboxImageUrl}
                      download={`messenger-image-${Date.now()}.webp`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải ảnh về</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setLightboxImageUrl(null)}
                      className="px-5 py-2 rounded-xl bg-white text-slate-900 hover:bg-white/90 text-xs font-bold cursor-pointer transition-all"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
