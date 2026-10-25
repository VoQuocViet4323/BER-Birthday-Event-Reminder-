import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format số ngày còn lại thành chuỗi tiếng Việt thân thiện
 */
export function formatDaysRemainingText(days: number): {
  text: string;
  badgeClass: string;
  isToday: boolean;
  isUrgent: boolean;
} {
  if (days === 0) {
    return {
      text: "Hôm nay! 🎉",
      badgeClass:
        "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300/40 dark:border-rose-800/40 animate-pulse-slow",
      isToday: true,
      isUrgent: true,
    };
  }
  if (days === 1) {
    return {
      text: "Ngày mai ⏳",
      badgeClass:
        "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300/40 dark:border-amber-800/40",
      isToday: false,
      isUrgent: true,
    };
  }
  if (days <= 3) {
    return {
      text: `Còn ${days} ngày`,
      badgeClass:
        "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-300/30 dark:border-amber-800/30",
      isToday: false,
      isUrgent: true,
    };
  }
  if (days <= 7) {
    return {
      text: `Còn ${days} ngày`,
      badgeClass:
        "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-300/30 dark:border-purple-800/30",
      isToday: false,
      isUrgent: false,
    };
  }
  return {
    text: `Còn ${days} ngày`,
    badgeClass:
      "bg-slate-100 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300 border-slate-200 dark:border-slate-700/80",
    isToday: false,
    isUrgent: false,
  };
}
