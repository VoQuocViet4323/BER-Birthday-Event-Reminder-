"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

function NavigationProgressContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Khi pathname hoặc searchParams thay đổi -> Hoàn thành quá trình chuyển tab
  useEffect(() => {
    if (isLoading) {
      setProgress(100);
      const hideTimeout = setTimeout(() => {
        setIsLoading(false);
        setShowSpinner(false);
        setProgress(0);
      }, 200);

      return () => clearTimeout(hideTimeout);
    }
  }, [pathname, searchParams]);

  // Bắt sự kiện click vào các thẻ liên kết nội bộ
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Bỏ qua liên kết ngoài, liên kết mở tab mới hoặc neo hash trong trang
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        target.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Kiểm tra xem có thực sự chuyển sang trang khác hay không
      try {
        const destUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (
          destUrl.pathname === currentUrl.pathname &&
          destUrl.search === currentUrl.search
        ) {
          // Cùng trang -> Không cần hiện hiệu ứng loading
          return;
        }

        // Bắt đầu hiệu ứng loading
        setIsLoading(true);
        setProgress(25);

        // Hủy các timer cũ nếu có
        if (timerRef.current) clearTimeout(timerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

        // Nếu mạng lag hoặc thiết bị chậm quá 180ms -> Bật xoay spinner thương hiệu BER
        timerRef.current = setTimeout(() => {
          setShowSpinner(true);
        }, 180);

        // Tăng dần thanh progress bar
        progressIntervalRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) return prev;
            return prev + Math.random() * 12;
          });
        }, 150);

        // Timeout an toàn sau 8 giây tự tắt nếu có lỗi kết nối
        safetyTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setShowSpinner(false);
          setProgress(0);
        }, 8000);
      } catch {
        // Bỏ qua nếu URL không hợp lệ
      }
    };

    document.addEventListener("click", handleLinkClick, true);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  return (
    <>
      {/* 1. Thanh Progress Bar mảnh ở mép trên cùng màn hình */}
      {isLoading && (
        <div
          className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full gradient-brand shadow-glow transition-all duration-200 ease-out"
            style={{
              width: `${progress}%`,
              boxShadow: "0 0 10px rgba(236, 72, 153, 0.7), 0 0 5px rgba(139, 92, 246, 0.7)",
            }}
          />
        </div>
      )}

      {/* 2. Hiệu ứng Loading xoay tròn thương hiệu khi chuyển trang bị lag / mạng chậm */}
      <AnimatePresence>
        {showSpinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none bg-background/30 backdrop-blur-[2px]"
          >
            <div className="bg-card/95 border border-primary/20 shadow-2xl rounded-2xl p-4 flex flex-col items-center gap-2.5 min-w-[140px] text-center backdrop-blur-md">
              {/* Vòng xoay spinner */}
              <div className="relative flex items-center justify-center w-8 h-8">
                <div className="absolute inset-0 rounded-full bg-primary/25 blur-md animate-pulse" />
                <Loader2 className="w-7 h-7 text-primary animate-spin stroke-[2.5] relative" />
              </div>

              {/* Thông điệp tải trang */}
              <p className="text-xs font-bold text-foreground tracking-tight">
                Đang chuyển trang...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressContent />
    </Suspense>
  );
}
