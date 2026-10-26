"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  timeAgo: string;
  status: "sent" | "failed" | "pending";
  channel: string;
  avatarColor: string;
  avatarUrl: string;
  emoji: string;
  isRead: boolean;
  eventName?: string;
  error?: string | null;
}

const STORAGE_KEY = "ber_read_notification_ids";

function getReadIdsFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveReadIdsToStorage(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error("Lỗi lưu trạng thái đọc thông báo:", e);
  }
}

function formatTimeAgo(dateStr: string): string {
  try {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return "Vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return "Hôm qua";
    if (diffDay < 7) return `${diffDay} ngày trước`;

    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return "Gần đây";
  }
}

export function useNotifications() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadIdsFromStorage());
  const [shouldRing, setShouldRing] = useState(false);
  const prevCountRef = useRef<number>(0);

  // Lắng nghe sự kiện hệ thống vừa gửi nhắc nhở để làm mới ngay
  useEffect(() => {
    const handleTrigger = () => {
      queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
    };
    window.addEventListener("trigger-reminder-check", handleTrigger);
    return () => {
      window.removeEventListener("trigger-reminder-check", handleTrigger);
    };
  }, [queryClient]);

  const { data: rawLogs = [], isLoading } = useQuery({
    queryKey: ["header-notifications"],
    queryFn: async () => {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await (supabase as any)
            .from("notification_logs")
            .select("*, events(name, avatar_url, event_type)")
            .eq("user_id", session.user.id)
            .order("sent_at", { ascending: false })
            .limit(20);

          if (!error && data && data.length > 0) return data;
        }
      }

      // Mock dữ liệu thực tế nếu offline hoặc chưa cấu hình Supabase
      return [
        {
          id: "mock-1",
          status: "sent",
          channel: "email",
          sent_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          events: {
            name: "KSK cựu chiến binh",
            avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=KSK",
          },
          error: null,
        },
        {
          id: "mock-2",
          status: "sent",
          channel: "email",
          sent_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          events: {
            name: "Sinh nhật Trúc",
            avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Truc",
          },
          error: null,
        },
        {
          id: "mock-3",
          status: "failed",
          channel: "email",
          sent_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          events: {
            name: "Khuê nợ thơm gió",
            avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Khue",
          },
          error: "Hộp thư người nhận tạm thời không phản hồi",
        },
      ];
    },
    refetchInterval: 30000, // Tự động làm mới mỗi 30s
  });

  // Chuyển đổi dữ liệu notification_logs thành danh sách chuẩn
  const notifications: AppNotification[] = useMemo(() => {
    const cachedEvents: any[] = queryClient.getQueryData(["events"]) || [];

    return rawLogs.map((log: any) => {
      const isRead = readIds.has(log.id);
      const eventInfo =
        log.events ||
        cachedEvents.find((e: any) => e.id === log.event_id) ||
        null;

      const eventName = eventInfo?.name || "Sự kiện";
      const isSent = log.status === "sent";
      const isFailed = log.status === "failed";

      let title = isSent
        ? `Đã gửi email nhắc: ${eventName}`
        : isFailed
        ? `Gửi email thất bại: ${eventName}`
        : `Đang gửi email nhắc: ${eventName}`;

      let message = isSent
        ? "Email thông báo sinh nhật / sự kiện đã được chuyển phát thành công."
        : isFailed
        ? log.error || "Gửi email không thành công. Hệ thống sẽ thử lại."
        : "Đang tiến hành gửi email nhắc nhở...";

      let avatarColor = isSent
        ? "linear-gradient(140deg,#10B981,#059669)"
        : isFailed
        ? "linear-gradient(140deg,#F43F5E,#BE123C)"
        : "linear-gradient(140deg,#F59E0B,#D97706)";

      let emoji = isSent ? "✅" : isFailed ? "⚠️" : "⏳";

      const avatarUrl =
        eventInfo?.avatar_url ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          eventName
        )}`;

      return {
        id: log.id,
        title,
        message,
        timestamp: log.sent_at || new Date().toISOString(),
        timeAgo: formatTimeAgo(log.sent_at || new Date().toISOString()),
        status: log.status,
        channel: log.channel || "email",
        avatarColor,
        avatarUrl,
        emoji,
        isRead,
        eventName,
        error: log.error,
      };
    });
  }, [rawLogs, readIds, queryClient]);

  // Đếm số thông báo chưa đọc
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Kích hoạt hiệu ứng lắc chuông và nảy số khi có thông báo mới
  useEffect(() => {
    if (unreadCount > prevCountRef.current && prevCountRef.current !== 0) {
      setShouldRing(true);
      const t = setTimeout(() => setShouldRing(false), 1200);
      return () => clearTimeout(t);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  // Đánh dấu 1 thông báo đã đọc
  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadIdsToStorage(next);
      return next;
    });
  }, []);

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      saveReadIdsToStorage(next);
      return next;
    });
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    shouldRing,
    markAsRead,
    markAllAsRead,
  };
}
