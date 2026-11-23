"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Image as ImageIcon, RefreshCw, AlertCircle, ScanLine } from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (rawText: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onDetected }: QrScannerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [imageScanError, setImageScanError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectedOnceRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      detectedOnceRef.current = false;
      setCameraError(null);
      setImageScanError(null);
      return;
    }

    let cancelled = false;
    detectedOnceRef.current = false;

    const startCamera = async () => {
      setIsStarting(true);
      setCameraError(null);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Trình duyệt hoặc kết nối hiện tại chưa hỗ trợ mở Camera. Bạn có thể chọn ảnh mã QR từ thiết bị ở nút bên dưới.");
        setIsStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setIsStarting(false);

        const scanFrame = () => {
          if (cancelled || detectedOnceRef.current) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
            const w = video.videoWidth;
            const h = video.videoHeight;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);
              const imageData = ctx.getImageData(0, 0, w, h);
              const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              });

              if (decoded?.data) {
                detectedOnceRef.current = true;
                stopCamera();
                onDetected(decoded.data);
                return;
              }
            }
          }

          rafRef.current = requestAnimationFrame(scanFrame);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (err: any) {
        if (!cancelled) {
          setIsStarting(false);
          if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
            setCameraError("Bạn đã từ chối quyền truy cập Camera. Hãy cấp quyền hoặc chọn ảnh mã QR từ thư viện bên dưới.");
          } else {
            setCameraError("Không tìm thấy Camera khả dụng trên thiết bị này. Hãy dùng nút 'Chọn ảnh QR từ thiết bị' bên dưới.");
          }
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, facingMode, onDetected, stopCamera]);

  const handleScanImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageScanError(null);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setImageScanError("Không thể đọc tệp ảnh này. Vui lòng thử ảnh QR khác rõ nét hơn.");
    };
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          setImageScanError("Trình duyệt không hỗ trợ đọc mã QR từ ảnh.");
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);

        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (decoded?.data) {
          stopCamera();
          onDetected(decoded.data);
        } else {
          setImageScanError("Không nhận diện được mã QR trong ảnh này. Hãy chọn ảnh rõ nét và không bị cắt góc.");
        }
      } catch {
        URL.revokeObjectURL(objectUrl);
        setImageScanError("Đã xảy ra lỗi khi quét ảnh QR.");
      }
    };
    img.src = objectUrl;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="qr-scanner-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            key="qr-scanner-card"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl gradient-brand text-white flex items-center justify-center">
                  <ScanLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Quét mã QR kết bạn</h3>
                  <p className="text-[11px] text-muted-foreground">Đưa mã QR của bạn bè vào khung ngắm</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Đóng máy quét"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Khung Camera */}
            <div className="p-4 space-y-3.5">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border border-border/80 flex items-center justify-center">
                {!cameraError ? (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Khung ngắm 4 góc + Tia quét */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-56 h-56">
                        <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-pink-500 rounded-tl-xl" />
                        <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-purple-500 rounded-tr-xl" />
                        <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-purple-500 rounded-bl-xl" />
                        <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-pink-500 rounded-br-xl" />
                        <motion.div
                          animate={{ y: [10, 206, 10] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_12px_rgba(236,72,153,0.9)]"
                        />
                      </div>
                    </div>

                    {/* Nút chuyển camera trước/sau */}
                    <button
                      type="button"
                      onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-[11px] font-semibold backdrop-blur-md flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Đổi camera trước / sau"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Đổi camera</span>
                    </button>

                    {isStarting && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white gap-2">
                        <Camera className="w-6 h-6 animate-pulse text-pink-400" />
                        <span className="text-xs font-medium">Đang khởi động camera...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-6 text-center space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                  </div>
                )}
              </div>

              {imageScanError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{imageScanError}</span>
                </div>
              )}

              {/* Quét từ ảnh có sẵn (hữu ích cho cả PC và Mobile) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScanImageFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-primary" />
                <span>Chọn ảnh mã QR từ thiết bị</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
