"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LottieLoading } from "@/components/ui/lottie-loading";

function NavigationProgressContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Khi pathname hoặc searchParams thay đổi -> Hoàn thành quá trình chuyển tab và tắt hiệu ứng loading
  useEffect(() => {
    if (isLoading) {
      setProgress(100);
      const hideTimeout = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 250);

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

        // Bắt đầu hiệu ứng loading ngay khi click
        setIsLoading(true);
        setProgress(25);

        // Hủy các timer cũ nếu có
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

        // Tăng dần thanh progress bar
        progressIntervalRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) return prev;
            return prev + Math.random() * 12;
          });
        }, 120);

        // Timeout an toàn: Tự động tắt loading sau tối đa 1.8 giây để tránh bị treo che màn hình nếu mạng chậm
        safetyTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setProgress(0);
        }, 1800);
      } catch {
        // Bỏ qua nếu URL không hợp lệ
      }
    };

    document.addEventListener("click", handleLinkClick, true);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
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

      {/* 2. Hiệu ứng chữ loading Lottie chính giữa màn hình (Không viền, Không chữ phụ) */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none bg-background/25 backdrop-blur-[2px]"
          >
            <LottieLoading size="lg" />
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
