"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * Hook tự động quét sự kiện mỗi 30 - 60 giây để gửi email đúng giờ (từng phút).
 * Hoạt động ngầm ngay khi người dùng mở ứng dụng trên trình duyệt.
 */
export function useAutoReminderScheduler() {
  const { toast } = useToast();
  const lastCheckedMinuteRef = useRef<string>("");
  const isCheckingRef = useRef<boolean>(false);

  useEffect(() => {
    async function checkReminders() {
      // Tránh kiểm tra song song nếu mạng chậm
      if (isCheckingRef.current) return;

      const now = new Date();
      const currentMinute = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      // Nếu trong phút này đã gửi hoặc quét rồi thì bỏ qua
      if (lastCheckedMinuteRef.current === currentMinute) {
        return;
      }

      isCheckingRef.current = true;
      try {
        const res = await fetch("/api/cron/check-reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          isCheckingRef.current = false;
          return;
        }

        const data = await res.json();
        lastCheckedMinuteRef.current = currentMinute;

        if (data.sent && data.events && data.events.length > 0) {
          console.log("🔔 [Auto Scheduler] Đã tự động gửi email thành công:", data);
          toast({
            title: `⏰ Đúng ${data.checkedAt}: Đã tự động gửi email nhắc nhở!`,
            description: `Hệ thống vừa gửi email nhắc nhở sự kiện (${data.events.map((e: any) => e.name).join(", ")}) tới hộp thư ${data.targetEmail}`,
            variant: "success",
            duration: 9000,
          });
        }
      } catch (err) {
        // Lỗi mạng hoặc server bận, bỏ qua chờ chu kỳ tiếp theo
      } finally {
        isCheckingRef.current = false;
      }
    }

    // Quét ngay lần đầu tiên sau khi trang nạp
    const initialTimer = setTimeout(checkReminders, 1500);

    // Lắng nghe sự kiện kích hoạt thủ công khi thêm/sửa sự kiện
    const handleManualTrigger = () => {
      lastCheckedMinuteRef.current = "";
      checkReminders();
    };
    window.addEventListener("trigger-reminder-check", handleManualTrigger);

    // Lặp lại mỗi 30 giây để đảm bảo không bỏ lỡ khoảnh khắc chuyển phút
    const interval = setInterval(checkReminders, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("trigger-reminder-check", handleManualTrigger);
    };
  }, [toast]);
}
