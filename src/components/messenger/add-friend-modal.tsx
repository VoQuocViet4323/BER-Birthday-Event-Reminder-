"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  UserPlus,
  QrCode,
  Check,
  Clock,
  MessageCircle,
  AlertCircle,
  Loader2,
  Mail,
} from "lucide-react";
import { FriendSearchResult } from "@/types/messenger";
import { parseFriendQrPayload } from "@/lib/messenger-utils";
import { QrScannerModal } from "./qr-scanner-modal";

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string | null;
  onSearch: (query: string) => Promise<{ user: FriendSearchResult | null; error?: string }>;
  onSendRequest: (targetUserId: string) => Promise<void>;
  onAcceptRequest: (friendshipId: string) => Promise<void>;
  onCancelRequest: (friendshipId: string) => Promise<void>;
  onOpenChat: (friendId: string) => void;
}

export function AddFriendModal({
  isOpen,
  onClose,
  initialQuery,
  onSearch,
  onSendRequest,
  onAcceptRequest,
  onCancelRequest,
  onOpenChat,
}: AddFriendModalProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<FriendSearchResult | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const executeSearch = useCallback(
    async (rawText: string) => {
      const cleaned = rawText.trim();
      if (!cleaned) {
        setErrorMsg("Vui lòng nhập email hoặc mã QR kết bạn.");
        return;
      }

      setIsSearching(true);
      setErrorMsg(null);
      setHasSearched(false);

      const { user, error } = await onSearch(cleaned);
      setIsSearching(false);
      setHasSearched(true);

      if (error) {
        setResult(null);
        setErrorMsg(error);
      } else {
        setResult(user);
      }
    },
    [onSearch]
  );

  // Tự động tìm kiếm nếu người dùng mở từ đường dẫn quét QR (?add=BER-...)
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim()) {
      const parsed = parseFriendQrPayload(initialQuery);
      const val = parsed.value || initialQuery.trim();
      setQuery(val);
      executeSearch(val);
    } else if (!isOpen) {
      setQuery("");
      setResult(null);
      setErrorMsg(null);
      setHasSearched(false);
    }
  }, [isOpen, initialQuery, executeSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleQrDetected = (rawQr: string) => {
    setIsScannerOpen(false);
    const parsed = parseFriendQrPayload(rawQr);
    const val = parsed.value || rawQr.trim();
    setQuery(val);
    executeSearch(val);
  };

  const handleSend = async () => {
    if (!result) return;
    setIsActionLoading(true);
    try {
      await onSendRequest(result.id);
      setResult((prev) =>
        prev ? { ...prev, friendship_status: "pending", is_requester: true } : prev
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!result?.friendship_id) return;
    setIsActionLoading(true);
    try {
      await onAcceptRequest(result.friendship_id);
      setResult((prev) => (prev ? { ...prev, friendship_status: "accepted" } : prev));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!result?.friendship_id) return;
    setIsActionLoading(true);
    try {
      await onCancelRequest(result.friendship_id);
      setResult((prev) =>
        prev
          ? { ...prev, friendship_id: null, friendship_status: null, is_requester: null }
          : prev
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="add-friend-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
              }}
              className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            >
              <motion.div
                key="add-friend-card"
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={{ type: "spring", damping: 28, stiffness: 340 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl gradient-brand text-white flex items-center justify-center shadow-xs">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Thêm bạn mới</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Tìm qua Email hoặc quét mã QR cố định
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Đóng"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Nội dung tìm kiếm */}
                <div className="p-5 space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    <div className="relative">
                      <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Nhập email hoặc mã BER-XXXXXXXX..."
                        className="w-full pl-10 pr-24 py-3 rounded-2xl bg-secondary/50 border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-foreground placeholder:text-muted-foreground/70 transition-all"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl gradient-brand text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSearching ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>Tìm</span>
                      </button>
                    </div>

                    {/* Nút mở máy quét QR */}
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="w-full py-2.5 px-4 rounded-2xl bg-primary/10 hover:bg-primary/15 border border-primary/25 text-primary text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Quét mã QR bằng Camera hoặc chọn ảnh QR</span>
                    </button>
                  </form>

                  {/* Thông báo lỗi */}
                  {errorMsg && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Kết quả tìm thấy */}
                  {result && (
                    <div className="p-4 rounded-2xl bg-secondary/40 border border-border/80 space-y-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl gradient-brand p-0.5 shrink-0 overflow-hidden shadow-xs">
                          <div className="w-full h-full rounded-[14px] bg-card overflow-hidden flex items-center justify-center">
                            {result.avatar_url ? (
                              <img
                                src={result.avatar_url}
                                alt={result.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full gradient-brand text-white font-bold text-lg flex items-center justify-center">
                                {(result.display_name || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-foreground truncate">
                            {result.display_name}
                          </p>
                          {result.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {result.email}
                            </p>
                          )}
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold text-muted-foreground tracking-wider">
                            {result.friend_code}
                          </span>
                        </div>
                      </div>

                      {/* Trạng thái hành động kết bạn */}
                      <div className="pt-1">
                        {result.friendship_status === "accepted" ? (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenChat(result.id);
                              onClose();
                            }}
                            className="w-full py-2.5 px-4 rounded-xl gradient-brand text-white text-xs font-bold flex items-center justify-center gap-2 shadow-soft active:scale-95 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Đã là bạn bè • Nhắn tin ngay</span>
                          </button>
                        ) : result.friendship_status === "pending" && result.is_requester ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold flex items-center justify-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Đang chờ chấp nhận</span>
                            </div>
                            {result.friendship_id && (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={handleCancel}
                                className="py-2.5 px-3 rounded-xl bg-secondary hover:bg-rose-500/15 hover:text-rose-500 text-xs font-bold text-muted-foreground transition-colors cursor-pointer"
                              >
                                Hủy
                              </button>
                            )}
                          </div>
                        ) : result.friendship_status === "pending" && !result.is_requester ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={handleAccept}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>Chấp nhận lời mời kết bạn</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={handleSend}
                            className="w-full py-2.5 px-4 rounded-xl gradient-brand text-white text-xs font-bold flex items-center justify-center gap-2 shadow-soft hover:shadow-soft-hover active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                            <span>Gửi lời mời kết bạn</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Không tìm thấy */}
                  {hasSearched && !result && !errorMsg && (
                    <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-center space-y-1">
                      <p className="text-xs font-semibold text-foreground">
                        Không tìm thấy tài khoản phù hợp
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Kiểm tra lại chính xác địa chỉ Email hoặc mã QR (không thể tự tìm chính mình).
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Máy quét QR lồng bên trên */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleQrDetected}
      />
    </>
  );
}
