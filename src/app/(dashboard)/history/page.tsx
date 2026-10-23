"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { NotificationLog } from "@/types/events";
import { Clock, CheckCircle2, AlertCircle, Mail, Calendar } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const supabase = createClient();

  const mockLogs: NotificationLog[] = [
    {
      id: "log-1",
      user_id: "demo-user",
      event_id: "mock-1",
      remind_offset: 0,
      occurrence_date: new Date().toISOString().split("T")[0],
      channel: "email",
      status: "sent",
      error: null,
      sent_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "log-2",
      user_id: "demo-user",
      event_id: "mock-2",
      remind_offset: 3,
      occurrence_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split("T")[0],
      channel: "email",
      status: "sent",
      error: null,
      sent_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: "log-3",
      user_id: "demo-user",
      event_id: "mock-3",
      remind_offset: 7,
      occurrence_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split("T")[0],
      channel: "email",
      status: "sent",
      error: null,
      sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ];

  const { data: logs = mockLogs, isLoading } = useQuery({
    queryKey: ["notification-logs"],
    queryFn: async (): Promise<NotificationLog[]> => {
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
            .select("*")
            .eq("user_id", session.user.id)
            .order("sent_at", { ascending: false });

          if (!error && data && data.length > 0) return data;
        }
      }

      return mockLogs;
    },
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          Lịch sử thông báo đã gửi
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Nhật ký timeline các email nhắc nhở được hệ thống tự động gửi đi
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="Chưa có thông báo nào"
          description="Hệ thống sẽ ghi lại lịch sử tại đây ngay khi có email nhắc sự kiện đầu tiên được gửi đi."
        />
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
          {logs.map((log) => {
            const isSuccess = log.status === "sent";
            const sentDate = new Date(log.sent_at);
            const formattedTime = sentDate.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const formattedDate = sentDate.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            return (
              <div key={log.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={cn(
                    "absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-background",
                    isSuccess
                      ? "bg-emerald-500 text-white"
                      : "bg-rose-500 text-white"
                  )}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                </div>

                {/* Timeline card */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-xs hover:shadow-soft transition-all">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      Email nhắc trước {log.remind_offset === 0 ? "đúng ngày" : `${log.remind_offset} ngày`}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isSuccess
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                      )}
                    >
                      {isSuccess ? "Đã gửi thành công" : "Lỗi gửi"}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Ngày diễn ra: {log.occurrence_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Gửi lúc: {formattedTime} - {formattedDate}
                    </span>
                  </p>

                  {log.error && (
                    <p className="text-xs text-rose-500 mt-2 p-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                      Chi tiết lỗi: {log.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
