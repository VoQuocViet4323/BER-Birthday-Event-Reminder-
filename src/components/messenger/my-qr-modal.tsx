"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Download, Share2, QrCode, Sparkles } from "lucide-react";
import { buildFriendQrPayload, getFixedFriendCode } from "@/lib/messenger-utils";
import { useToast } from "@/components/ui/toast";

interface MyQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  friendCode?: string | null;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export function MyQrModal({
  isOpen,
  onClose,
  userId,
  friendCode,
  displayName,
  email,
  avatarUrl,
}: MyQrModalProps) {
  const [mounted, setMounted] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { toast } = useToast();

  const fixedCode = getFixedFriendCode(userId, friendCode);
  const qrPayload = buildFriendQrPayload(fixedCode);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => console.error("Lỗi tạo mã QR cá nhân:", err));

    return () => {
      cancelled = true;
    };
  }, [isOpen, qrPayload]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(fixedCode);
      setCopiedCode(true);
      toast({ title: `Đã sao chép mã ${fixedCode}`, variant: "success" });
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      toast({ title: "Không thể sao chép mã", variant: "error" });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrPayload);
      setCopiedLink(true);
      toast({ title: "Đã sao chép đường dẫn kết bạn!", variant: "success" });
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      toast({ title: "Không thể sao chép đường dẫn", variant: "error" });
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-KetBan-${fixedCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Đã tải ảnh mã QR về thiết bị", variant: "success" });
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Kết bạn với ${displayName || "tôi"} trên Nhắc Sự Kiện`,
          text: `Quét mã hoặc mở link để kết bạn & nhắn tin cùng ${displayName || "tôi"} (Mã: ${fixedCode})`,
          url: qrPayload,
        });
        return;
      } catch {
        // Người dùng hủy chia sẻ
      }
    }
    handleCopyLink();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="my-qr-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            key="my-qr-card"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Header gradient mềm */}
            <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-purple-600/15 via-pink-500/10 to-transparent border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl gradient-brand text-white flex items-center justify-center shadow-xs">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Mã QR kết bạn cố định</h3>
                    <p className="text-[11px] text-muted-foreground">Định danh riêng không đổi của tài khoản</p>
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
            </div>

            {/* Thẻ QR trung tâm */}
            <div className="p-5 sm:p-6 flex flex-col items-center text-center space-y-4">
              {/* Thông tin chủ sở hữu */}
              <div className="flex items-center gap-3 w-full p-3 rounded-2xl bg-secondary/40 border border-border/60">
                <div className="w-11 h-11 rounded-2xl gradient-brand p-0.5 shrink-0 overflow-hidden shadow-xs">
                  <div className="w-full h-full rounded-[14px] bg-card overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName || "Avatar"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full gradient-brand text-white font-bold text-base flex items-center justify-center">
                        {(displayName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground truncate">{displayName || "Người dùng"}</p>
                  {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Sparkles className="w-2.5 h-2.5" /> Cố định
                </span>
              </div>

              {/* Khung ảnh QR trắng tinh tương phản cao */}
              <div className="p-3.5 rounded-3xl bg-white shadow-lg border-2 border-purple-500/20 relative">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Mã QR ${fixedCode}`}
                    className="w-52 h-52 sm:w-56 sm:h-56 rounded-xl block select-none"
                  />
                ) : (
                  <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
                    Đang tạo mã QR...
                  </div>
                )}
              </div>

              {/* Mã định danh cố định có thể sao chép 1 chạm */}
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/80 text-xs font-extrabold tracking-widest text-foreground transition-all active:scale-95 cursor-pointer"
                title="Bấm để sao chép mã kết bạn"
              >
                <span>{fixedCode}</span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>

              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[260px]">
                Bạn bè chỉ cần quét mã QR này hoặc nhập email của bạn trong mục <strong>Messenger</strong> để gửi lời mời kết bạn.
              </p>

              {/* Hàng nút hành động */}
              <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border/80 text-xs font-bold text-foreground transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>Tải ảnh QR</span>
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover transition-all active:scale-95 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Đã chép link" : "Chia sẻ"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
