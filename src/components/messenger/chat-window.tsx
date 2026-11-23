"use client";

import { useEffect, useRef, useState } from "react";
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
  CheckCheck,
  MoreVertical,
  UserMinus,
  Trash2,
  Download,
  Loader2,
  Lock,
  History,
} from "lucide-react";
import { FriendNetworkItem } from "@/types/messenger";
import { useConversation } from "@/hooks/use-messenger";
import {
  formatMessageClock,
  isUserOnline,
  MAX_CHAT_IMAGE_BYTES,
} from "@/lib/messenger-utils";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

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
    deleteMessage,
  } = useConversation(currentUserId, friend.friend_id, isAccepted);

  const { toast } = useToast();
  const [text, setText] = useState("");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [confirmUnfriend, setConfirmUnfriend] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const lastMsgIdRef = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Chỉ cuộn xuống cuối khi mở cuộc trò chuyện mới, có tin nhắn MỚI ở cuối, hoặc bạn đang nhập (không cuộn khi đang tải tin cũ)
  const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (latestMessageId !== lastMsgIdRef.current || friendIsTyping) {
      lastMsgIdRef.current = latestMessageId;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [latestMessageId, friendIsTyping, friend.friend_id]);

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

  // Thu hồi URL ảnh nháp khi thay đổi hoặc unmount
  useEffect(() => {
    return () => {
      if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    };
  }, [pendingImagePreview]);

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
    if ((!text.trim() && !pendingImageFile) || isSending || !isAccepted) return;
    const contentToSend = text;
    const imageToSend = pendingImageFile;

    setText("");
    setShowEmojiPicker(false);
    clearPendingImage();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await sendMessage({ content: contentToSend, imageFile: imageToSend });
    } catch {
      // Lỗi đã được toast xử lý trong hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    notifyTyping();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const online = isUserOnline(friend.last_seen_at);

  // Tìm tin nhắn cuối cùng do mình gửi để hiển thị nhãn "Đã xem"
  const lastMyMessageId = [...messages]
    .reverse()
    .find((m) => m.sender_id === currentUserId)?.id;

  return (
    <div className="flex flex-col h-full bg-background/40">
      {/* Header Khung Chat */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 border-b border-border/70 bg-card/85 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="lg:hidden w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center text-foreground shrink-0 active:scale-95 transition-all cursor-pointer touch-manipulation"
              aria-label="Quay lại danh sách"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
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

      {/* Khu vực luồng tin nhắn */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-2.5 overscroll-contain">
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
            {/* Nút tải thêm tin nhắn cũ hơn từ DB khi đoạn chat dài */}
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

                  <div
                    className={cn(
                      "flex items-end gap-2 group",
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

                    {/* Nút thu hồi khi hover tin của mình */}
                    {isMine && !msg.optimistic && (
                      <button
                        type="button"
                        onClick={() => deleteMessage(msg)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0 mb-1"
                        title="Thu hồi tin nhắn"
                        aria-label="Thu hồi tin nhắn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div
                      className={cn(
                        "max-w-[78%] sm:max-w-[68%] flex flex-col",
                        isMine ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl overflow-hidden shadow-xs transition-opacity",
                          msg.optimistic && "opacity-75",
                          isMine
                            ? "gradient-brand text-white rounded-br-md"
                            : "bg-card border border-border/80 text-foreground rounded-bl-md",
                          msg.image_url && !msg.content ? "p-1" : "px-3.5 py-2.5"
                        )}
                      >
                        {/* Ảnh đính kèm */}
                        {msg.image_url && (
                          <button
                            type="button"
                            onClick={() => setLightboxImageUrl(msg.image_url)}
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

                      {/* Thời gian & Trạng thái Đã xem */}
                      <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-muted-foreground">
                        <span>{formatMessageClock(msg.created_at)}</span>
                        {isMine && isLastMine && (
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
                  </div>
                </div>
              );
            })}

            {/* Hiệu ứng đang nhập */}
            {friendIsTyping && (
              <div className="flex items-end gap-2">
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
            <div ref={messagesEndRef} />
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
            {/* Thanh xem trước ảnh nháp trước khi gửi */}
            <AnimatePresence>
              {pendingImagePreview && (
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
              {/* Chọn ảnh */}
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

              {/* Emoji */}
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

              {/* Ô nhập tin nhắn */}
              <div className="flex-1 bg-secondary/60 border border-border/80 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/15 rounded-2xl px-3.5 py-2 transition-all">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={`Nhắn tin tới ${friend.display_name}...`}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none resize-none max-h-28 leading-snug block"
                />
              </div>

              {/* Nút Gửi */}
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || (!text.trim() && !pendingImageFile)}
                className="w-10 h-10 rounded-2xl gradient-brand text-white flex items-center justify-center shrink-0 shadow-soft hover:shadow-soft-hover active:scale-95 transition-all cursor-pointer disabled:opacity-45 disabled:scale-100 touch-manipulation"
                title="Gửi tin nhắn"
                aria-label="Gửi tin nhắn"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

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
                        <p className="text-xs font-semibold text-foreground">Chưa có ảnh nào được gửi</p>
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
                className="fixed inset-0 z-[140] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
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
