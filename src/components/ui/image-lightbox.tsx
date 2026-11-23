"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 280 : direction < 0 ? -280 : 0,
    opacity: direction === 0 ? 1 : 0,
    scale: direction === 0 ? 1 : 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -280 : direction < 0 ? 280 : 0,
    opacity: 0,
    scale: 0.96,
  }),
};

export function ImageLightbox({
  images,
  initialIndex = 0,
  onClose,
}: ImageLightboxProps) {
  const [index, setIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1))
  );
  const [direction, setDirection] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  // Refs cho touch & mouse gestures
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number; lockedAxis: "x" | "y" | null } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const lastTouchTimeRef = useRef<number>(0);
  const mouseModeRef = useRef<"none" | "pan" | "swipe">("none");

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goToIndex = useCallback(
    (nextIdx: number, dir: number) => {
      if (images.length <= 1 || nextIdx === index) return;
      resetZoom();
      setSwipeOffsetX(0);
      setDirection(dir);
      setIndex(nextIdx);
    },
    [images.length, index, resetZoom]
  );

  const goPrev = useCallback(() => {
    if (images.length <= 1) return;
    const prevIdx = (index - 1 + images.length) % images.length;
    goToIndex(prevIdx, -1);
  }, [images.length, index, goToIndex]);

  const goNext = useCallback(() => {
    if (images.length <= 1) return;
    const nextIdx = (index + 1) % images.length;
    goToIndex(nextIdx, 1);
  }, [images.length, index, goToIndex]);

  const clampOffset = useCallback((x: number, y: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    const maxX = (window.innerWidth * (currentScale - 1)) / 2 + 80;
    const maxY = (window.innerHeight * (currentScale - 1)) / 2 + 80;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const applyScale = useCallback(
    (nextScale: number) => {
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
      setScale(clamped);
      if (clamped <= 1.01) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      } else {
        setOffset((prev) => clampOffset(prev.x, prev.y, clamped));
      }
    },
    [clampOffset]
  );

  // Phím tắt trên Desktop (Esc, mũi tên trái/phải, +, -, 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "+" || e.key === "=") {
        applyScale(scale + 0.5);
      } else if (e.key === "-") {
        applyScale(scale - 0.5);
      } else if (e.key === "0") {
        resetZoom();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, goNext, goPrev, applyScale, scale, resetZoom]);

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const toggleZoomAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      setIsInteracting(false);
      setSwipeOffsetX(0);
      if (scale > 1.05) {
        resetZoom();
        return;
      }

      const targetScale = 2.5;
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) {
        setScale(targetScale);
        setOffset({ x: 0, y: 0 });
        return;
      }

      // Tính tâm vùng hiển thị và độ lệch từ tâm tới đúng vị trí người dùng bấm double
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;

      // Dịch chuyển ảnh sao cho đúng điểm vừa chạm được phóng to ngay dưới tay
      const nextX = -dx * (targetScale - 1);
      const nextY = -dy * (targetScale - 1);

      setScale(targetScale);
      setOffset(clampOffset(nextX, nextY, targetScale));
    },
    [scale, resetZoom, clampOffset]
  );

  const finishSwipe = (deltaX: number, elapsedMs: number) => {
    if (images.length <= 1) {
      setSwipeOffsetX(0);
      return;
    }
    const velocity = Math.abs(deltaX) / Math.max(1, elapsedMs); // px/ms
    const shouldSwitch = Math.abs(deltaX) > 55 || (velocity > 0.35 && Math.abs(deltaX) > 25);

    if (shouldSwitch) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    } else {
      // Đàn hồi mượt về giữa nếu chưa đủ lực vuốt
      setSwipeOffsetX(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    lastTouchTimeRef.current = Date.now();

    if (e.touches.length === 2) {
      // Bắt đầu kéo 2 ngón tay để phóng to / thu nhỏ (pinch-to-zoom)
      setIsInteracting(true);
      setSwipeOffsetX(0);
      pinchStartDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
      pinchStartScaleRef.current = scale;
      dragStartRef.current = null;
      swipeStartRef.current = null;
      lastTapRef.current = { time: 0, x: 0, y: 0 };
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      const prevTap = lastTapRef.current;
      const tapDist = Math.hypot(touch.clientX - prevTap.x, touch.clientY - prevTap.y);

      // Chạm đúp (double-tap) tại cùng 1 vùng (<300ms, lệch <45px) -> phóng to đúng chỗ chạm hoặc thu nhỏ lại 100%
      if (now - prevTap.time < 300 && tapDist < 45) {
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        dragStartRef.current = null;
        swipeStartRef.current = null;
        toggleZoomAtPoint(touch.clientX, touch.clientY);
        return;
      }
      lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };

      if (scale > 1.02) {
        // Kéo 1 ngón để di chuyển vùng đang phóng to
        setIsInteracting(true);
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          offsetX: offset.x,
          offsetY: offset.y,
        };
      } else if (images.length > 1) {
        // Khi đang ở 1x: theo dõi vuốt ngang trực tiếp theo ngón tay để chuyển ảnh mượt mà
        setIsInteracting(true);
        swipeStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: now,
          lockedAxis: null,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const ratio = dist / Math.max(1, pinchStartDistRef.current);
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchStartScaleRef.current * ratio));
      setScale(nextScale);
      if (nextScale <= 1.01) {
        setOffset({ x: 0, y: 0 });
      } else {
        setOffset((prev) => clampOffset(prev.x, prev.y, nextScale));
      }
    } else if (e.touches.length === 1 && dragStartRef.current && scale > 1.02) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setOffset(
        clampOffset(
          dragStartRef.current.offsetX + dx,
          dragStartRef.current.offsetY + dy,
          scale
        )
      );
    } else if (e.touches.length === 1 && swipeStartRef.current && scale <= 1.02) {
      const touch = e.touches[0];
      const dx = touch.clientX - swipeStartRef.current.x;
      const dy = touch.clientY - swipeStartRef.current.y;

      if (!swipeStartRef.current.lockedAxis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        swipeStartRef.current.lockedAxis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      }

      if (swipeStartRef.current.lockedAxis === "x") {
        // Kéo ảnh chạy theo ngón tay mượt mà
        setSwipeOffsetX(dx);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
      if (scale < 1.05) {
        resetZoom();
      }
    }

    if (e.touches.length === 0) {
      setIsInteracting(false);
      if (swipeStartRef.current && scale <= 1.02 && swipeStartRef.current.lockedAxis === "x") {
        const endX = e.changedTouches[0]?.clientX;
        if (typeof endX === "number") {
          const deltaX = endX - swipeStartRef.current.x;
          const elapsed = Date.now() - swipeStartRef.current.time;
          finishSwipe(deltaX, elapsed);
        } else {
          setSwipeOffsetX(0);
        }
      } else {
        setSwipeOffsetX(0);
      }
      swipeStartRef.current = null;
      dragStartRef.current = null;
    }
  };

  // Hỗ trợ cuộn chuột phóng to / thu nhỏ trên máy tính
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.35 : -0.35;
    applyScale(scale + delta);
  };

  // Hỗ trợ kéo chuột di chuyển ảnh khi đang phóng to HOẶC kéo ngang chuyển ảnh trên máy tính
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (scale > 1.02) {
      mouseModeRef.current = "pan";
      setIsInteracting(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    } else if (images.length > 1) {
      mouseModeRef.current = "swipe";
      setIsInteracting(true);
      swipeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
        lockedAxis: "x",
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mouseModeRef.current === "pan" && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setOffset(
        clampOffset(
          dragStartRef.current.offsetX + dx,
          dragStartRef.current.offsetY + dy,
          scale
        )
      );
    } else if (mouseModeRef.current === "swipe" && swipeStartRef.current) {
      const dx = e.clientX - swipeStartRef.current.x;
      setSwipeOffsetX(dx);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mouseModeRef.current === "swipe" && swipeStartRef.current) {
      const deltaX = e.clientX - swipeStartRef.current.x;
      const elapsed = Date.now() - swipeStartRef.current.time;
      finishSwipe(deltaX, elapsed);
    }
    mouseModeRef.current = "none";
    dragStartRef.current = null;
    swipeStartRef.current = null;
    setIsInteracting(false);
  };

  const currentUrl = images[index];
  if (!currentUrl) return null;

  // Hiệu ứng giảm nhẹ độ mờ và tỷ lệ khi người dùng đang kéo vuốt ngang
  const dragProgress = Math.min(1, Math.abs(swipeOffsetX) / 320);
  const swipeScale = scale <= 1.02 ? 1 - dragProgress * 0.06 : scale;
  const swipeOpacity = scale <= 1.02 ? 1 - dragProgress * 0.35 : 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => {
        e.stopPropagation();
        if (scale <= 1.02 && Math.abs(swipeOffsetX) < 5) onClose();
      }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="fixed inset-0 z-[140] bg-black/92 backdrop-blur-md flex flex-col items-center justify-center select-none touch-none"
    >
      {/* Thanh công cụ trên cùng: Số thứ tự, Zoom +/-/Reset, Đóng */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/70 to-transparent"
      >
        <div className="flex items-center gap-2">
          {images.length > 1 && (
            <span className="px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-xs">
              {index + 1} / {images.length}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-xs">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyScale(scale - 0.5)}
            disabled={scale <= MIN_SCALE}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-40"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyScale(scale + 0.5)}
            disabled={scale >= MAX_SCALE}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-40"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {scale > 1.02 && (
            <button
              type="button"
              onClick={resetZoom}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Đặt lại 100%"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/15 hover:bg-rose-600 text-white transition-colors cursor-pointer ml-1"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nút chuyển ảnh trái/phải (khi có >1 ảnh và không đang phóng to) */}
      {images.length > 1 && scale <= 1.05 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2.5 sm:left-5 z-20 p-2.5 rounded-full bg-white/12 hover:bg-white/25 active:scale-90 text-white transition-all cursor-pointer"
            title="Ảnh trước"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2.5 sm:right-5 z-20 p-2.5 rounded-full bg-white/12 hover:bg-white/25 active:scale-90 text-white transition-all cursor-pointer"
            title="Ảnh sau"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Vùng hiển thị ảnh hỗ trợ: Vuốt trái/phải bám tay + Animation chuyển ảnh mượt + Pinch-to-zoom 2 ngón + Double-tap đúng điểm */}
      <div
        ref={viewportRef}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (Date.now() - lastTouchTimeRef.current < 500) return;
          toggleZoomAtPoint(e.clientX, e.clientY);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className="w-full h-full flex items-center justify-center overflow-hidden touch-none p-3 sm:p-8 relative"
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={`${index}-${currentUrl.slice(0, 32)}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 320, damping: 32, mass: 0.85 },
              opacity: { duration: 0.22, ease: "easeOut" },
              scale: { duration: 0.22, ease: "easeOut" },
            }}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              src={currentUrl}
              alt={`Khoảnh khắc ${index + 1}`}
              draggable={false}
              style={{
                transform: `translate3d(${offset.x + swipeOffsetX}px, ${offset.y}px, 0) scale(${swipeScale})`,
                opacity: swipeOpacity,
                transition: isInteracting
                  ? "none"
                  : "transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease-out",
              }}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl will-change-transform select-none pointer-events-none"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thanh chấm chỉ báo (Pagination Dots) + Chú thích cử chỉ ở dưới cùng */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 inset-x-0 z-20 flex flex-col items-center gap-2 px-4"
      >
        {images.length > 1 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-xs">
            {images.map((_, dotIdx) => {
              const isActive = dotIdx === index;
              return (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => goToIndex(dotIdx, dotIdx > index ? 1 : -1)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Xem ảnh ${dotIdx + 1}`}
                />
              );
            })}
          </div>
        )}
        <span className="px-3 py-1 rounded-full bg-black/45 text-white/75 text-[11px] font-medium backdrop-blur-xs text-center pointer-events-none">
          Kéo 2 ngón hoặc chạm đúp để phóng to
          {scale > 1.02 ? " • Kéo để di chuyển" : images.length > 1 ? " • Vuốt trái/phải để chuyển ảnh" : ""}
        </span>
      </div>
    </motion.div>
  );
}
