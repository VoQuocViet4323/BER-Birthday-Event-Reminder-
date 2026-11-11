"use client";

import { Lottie } from "lottie-react";
import loadingAnimation from "@/assets/lottie/loading.json";
import { cn } from "@/lib/utils";

// Lọc bỏ cảnh báo WCAG 2.2.2 development của thư viện lottie-react để Console DevTools luôn sạch bóng
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("[lottie-react] this animation starts by itself")
    ) {
      return;
    }
    originalWarn(...args);
  };
}

interface LottieLoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
}

const sizeClasses = {
  sm: "w-28 h-16",
  md: "w-48 h-28",
  lg: "w-72 h-40",
  xl: "w-96 h-52",
};

export function LottieLoading({
  className,
  size = "md",
  label,
}: LottieLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center select-none", className)}>
      <div className={cn("relative flex items-center justify-center overflow-hidden", sizeClasses[size])}>
        <Lottie
          src={loadingAnimation}
          autoplay
          loop
          className="w-full h-full"
        />
      </div>
      {label && (
        <p className="text-xs font-semibold text-muted-foreground mt-0.5 tracking-wide animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}
