"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Reply,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  RotateCcw,
  EyeOff,
  X,
  Copy,
} from "lucide-react";
import { ChatMessage } from "@/types/messenger";
import {
  getMessagePreviewText,
  MAX_PINNED_MESSAGES,
  MESSAGE_REACTIONS,
} from "@/lib/messenger-utils";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface MessageActionSheetProps {
  message: ChatMessage | null;
  currentUserId: string;
  friendName: string;
  pinnedCount: number;
  onClose: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onTogglePin: (msg: ChatMessage) => void;
  onRecallForEveryone: (msg: ChatMessage) => void;
  onHideForMe: (messageId: string) => void;
}

export function MessageActionSheet({
  message,
  currentUserId,
  friendName,
  pinnedCount,
  onClose,
  onReact,
  onReply,
  onEdit,
  onTogglePin,
  onRecallForEveryone,
  onHideForMe,
}: MessageActionSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [showRemoveOptions, setShowRemoveOptions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setShowRemoveOptions(false);
  }, [message?.id]);

  if (!mounted) return null;

  const isMine = message?.sender_id === currentUserId;
  const myReaction = message?.reactions?.[currentUserId] || null;
  const isRecalled = Boolean(message?.is_recalled);
  const isPinned = Boolean(message?.is_pinned);
  const canEdit = Boolean(isMine && !isRecalled && message?.content?.trim());

  const handleCopy = async () => {
    if (!message?.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      toast({ title: "Đã sao chép tin nhắn", variant: "success" });
    } catch {}
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {message && (
        <motion.div
          key="msg-action-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-[3px] flex items-end sm:items-center justify-center p-3 sm:p-4"
        >
          <motion.div
            key="msg-action-panel"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-2.5 pb-1"
          >
            {/* 1. Thanh thả cảm xúc chuẩn Messenger (nổi phía trên menu) */}
            {!isRecalled && !showRemoveOptions && (
              <div className="flex items-center justify-between px-3 py-2 rounded-full bg-card/95 border border-border shadow-2xl">
                {MESSAGE_REACTIONS.map((emoji) => {
                  const selected = myReaction === emoji;
                  return (
                    <motion.button
                      key={emoji}
                      type="button"
                      whileHover={{ scale: 1.22 }}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => {
                        onReact(message.id, emoji);
                        onClose();
                      }}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-2xl transition-colors cursor-pointer touch-manipulation",
                        selected
                          ? "bg-primary/20 ring-2 ring-primary/50"
                          : "hover:bg-secondary"
                      )}
                      aria-label={`Thả cảm xúc ${emoji}`}
                    >
                      {emoji}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 2. Thẻ menu chức năng */}
            <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border shadow-2xl overflow-hidden">
              {/* Trích đoạn tin nhắn đang chọn */}
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-2 bg-secondary/30">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isMine ? "Tin nhắn của bạn" : `Tin nhắn của ${friendName}`}
                  </p>
                  <p className="text-xs font-medium text-foreground truncate mt-0.5">
                    {getMessagePreviewText(message)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground shrink-0 cursor-pointer"
                  aria-label="Đóng menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!showRemoveOptions ? (
                <div className="p-2 space-y-1 text-sm">
                  {/* Trả lời */}
                  {!isRecalled && (
                    <button
                      type="button"
                      onClick={() => {
                        onReply(message);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary active:scale-[0.99] text-foreground font-semibold transition-all cursor-pointer touch-manipulation"
                    >
                      <Reply className="w-4 h-4 text-primary" />
                      <span>Trả lời tin nhắn</span>
                    </button>
                  )}

                  {/* Chỉnh sửa (CHỈ tin nhắn văn bản của chính mình) */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(message);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary active:scale-[0.99] text-foreground font-semibold transition-all cursor-pointer touch-manipulation"
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                      <span>Chỉnh sửa tin nhắn</span>
                    </button>
                  )}

                  {/* Ghim / Bỏ ghim (cả mình & đối phương, tối đa 5 tin) */}
                  {!isRecalled && (
                    <button
                      type="button"
                      onClick={() => {
                        onTogglePin(message);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary active:scale-[0.99] text-foreground font-semibold transition-all cursor-pointer touch-manipulation"
                    >
                      <span className="flex items-center gap-3">
                        {isPinned ? (
                          <PinOff className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Pin className="w-4 h-4 text-amber-500" />
                        )}
                        <span>{isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}</span>
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {pinnedCount}/{MAX_PINNED_MESSAGES}
                      </span>
                    </button>
                  )}

                  {/* Sao chép chữ */}
                  {!isRecalled && message.content?.trim() && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary active:scale-[0.99] text-foreground font-semibold transition-all cursor-pointer touch-manipulation"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                      <span>Sao chép nội dung</span>
                    </button>
                  )}

                  {/* Thu hồi / Xóa tin nhắn */}
                  <div className="pt-1 mt-1 border-t border-border/50">
                    {isMine && !isRecalled ? (
                      <button
                        type="button"
                        onClick={() => setShowRemoveOptions(true)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-rose-500/10 active:scale-[0.99] text-rose-500 font-semibold transition-all cursor-pointer touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Thu hồi / Xóa tin nhắn</span>
                      </button>
                    ) : (
                      /* Tin của đối phương hoặc tin đã thu hồi: CHỈ xóa ở phía mình */
                      <button
                        type="button"
                        onClick={() => {
                          onHideForMe(message.id);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-rose-500/10 active:scale-[0.99] text-rose-500 font-semibold transition-all cursor-pointer touch-manipulation"
                      >
                        <EyeOff className="w-4 h-4" />
                        <div className="text-left">
                          <p className="leading-tight">Xóa ở phía bạn</p>
                          <p className="text-[11px] font-normal text-muted-foreground mt-0.5">
                            Chỉ ẩn với bạn, {friendName} vẫn thấy tin nhắn này
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Bước chọn 2 chế độ thu hồi/xóa giống Messenger (dành cho tin của mình) */
                <div className="p-3 space-y-2">
                  <p className="text-xs font-bold text-foreground px-1">
                    Bạn muốn gỡ tin nhắn này ở phía ai?
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      onRecallForEveryone(message);
                      onClose();
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-left transition-all active:scale-[0.99] cursor-pointer touch-manipulation"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-500">Thu hồi với mọi người</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        Gỡ tin nhắn ở cả hai phía. {friendName} sẽ thấy thông báo tin đã thu hồi.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onHideForMe(message.id);
                      onClose();
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/70 text-left transition-all active:scale-[0.99] cursor-pointer touch-manipulation"
                  >
                    <EyeOff className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Xóa chỉ ở phía bạn</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        Chỉ ẩn khỏi màn hình của bạn. {friendName} vẫn thấy tin nhắn bình thường.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRemoveOptions(false)}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                  >
                    Quay lại
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
