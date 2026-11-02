"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook tự động gửi "nhịp tim" (heartbeat) thời gian thực lên database
 * Giúp hệ thống ghi nhận người dùng đang thực sự online / hoạt động trên web/app
 */
export function useUserHeartbeat() {
  const supabase = createClient();
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

    if (!isConfigured) return;

    const sendHeartbeat = async () => {
      const now = Date.now();
      // Giới hạn tần suất: tối thiểu 60 giây giữa các lần gửi
      if (now - lastSentRef.current < 60 * 1000) return;
      lastSentRef.current = now;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;

        // 1. Thử gọi RPC update_user_heartbeat
        const { error: rpcError } = await (supabase as any).rpc("update_user_heartbeat");
        if (rpcError) {
          // 2. Fallback update trực tiếp bảng profiles
          await (supabase as any)
            .from("profiles")
            .update({ last_seen_at: new Date().toISOString() } as any)
            .eq("id", session.user.id);
        }
      } catch {
        // Bỏ qua lỗi ngầm
      }
    };

    // Gửi ngay khi tải app
    sendHeartbeat();

    // Gửi định kỳ mỗi 2 phút khi tab đang mở
    const interval = setInterval(sendHeartbeat, 2 * 60 * 1000);

    // Gửi khi người dùng quay lại tab (focus / visibilitychange)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [supabase]);
}

export function UserHeartbeatProvider({ children }: { children: React.ReactNode }) {
  useUserHeartbeat();
  return <>{children}</>;
}

