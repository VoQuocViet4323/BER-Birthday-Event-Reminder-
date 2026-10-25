"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { NotificationLog, EventWithMeta } from "@/types/events";
import { Clock, CheckCircle2, AlertCircle, Mail, Calendar, Sparkles, User, Tag } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { getLocalCustomGroups } from "@/hooks/use-events";
import { cn } from "@/lib/utils";

interface NotificationLogWithEvent extends NotificationLog {
  events?: {
    id: string;
    name: string;
    event_type: string;
    custom_type?: string | null;
    event_day: number;
    event_month: number;
    event_year?: number | null;
    is_lunar: boolean;
    group_name: string;
    custom_group?: string | null;
    avatar_url?: string | null;
    note?: string | null;
    gift_idea?: string | null;
  } | null;
}

export default function HistoryPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Demo logs đầy đủ thông tin sự kiện để hiển thị đẹp mắt
  const mockLogs: NotificationLogWithEvent[] = [
    {
      id: "log-1",
      user_id: "demo-user",
      event_id: "mock-1",
      remind_offset: 2,
      occurrence_date: "2026-10-26",
      channel: "email",
      status: "sent",
      error: null,
      sent_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      events: {
        id: "mock-1",
        name: "Trúc",
        event_type: "birthday",
        event_day: 26,
        event_month: 10,
        event_year: 2000,
        is_lunar: false,
        group_name: "Bạn bè",
        custom_group: null,
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Truc",
        note: "Thích hoa hồng phấn, uống trà sữa ít đường",
        gift_idea: "Son môi YSL",
      },
    },
    {
      id: "log-2",
      user_id: "demo-user",
      event_id: "mock-2",
      remind_offset: 0,
      occurrence_date: "2026-10-25",
      channel: "email",
      status: "sent",
      error: null,
      sent_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      events: {
        id: "mock-2",
        name: "Mẹ yêu",
        event_type: "birthday",
        event_day: 25,
        event_month: 10,
        event_year: 1968,
        is_lunar: false,
        group_name: "Gia đình",
        custom_group: null,
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=MeYeu",
        note: "Mẹ thích hoa lan tím và trà sen",
        gift_idea: "Khăn lụa tơ tằm",
      },
    },
    {
      id: "log-3",
      user_id: "demo-user",
      event_id: "mock-3",
      remind_offset: 7,
      occurrence_date: "2026-12-05",
      channel: "email",
      status: "sent",
      error: null,
      sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      events: {
        id: "mock-3",
        name: "Concert ATVNCG",
        event_type: "other",
        custom_type: "Sự kiện Concert",
        event_day: 5,
        event_month: 12,
        event_year: 2026,
        is_lunar: false,
        group_name: "Khác",
        custom_group: "Concert",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=ConcertATVNCG",
        note: "Sân vận động Mỹ Đình lúc 19:30",
        gift_idea: null,
      },
    },
  ];

  const { data: logs = mockLogs, isLoading } = useQuery({
    queryKey: ["notification-logs"],
    queryFn: async (): Promise<NotificationLogWithEvent[]> => {
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
            .select("*, events(*)")
            .eq("user_id", session.user.id)
            .order("sent_at", { ascending: false });

          if (!error && data && data.length > 0) return data;
        }
      }

      return mockLogs;
    },
  });

  // Đọc bộ nhớ cache sự kiện để đối chiếu nếu database chưa kịp join
  const cachedEvents = queryClient.getQueryData<EventWithMeta[]>(["events"]) || [];
  const localCustomGroups = getLocalCustomGroups();

  const totalLogs = logs.length;
  const successLogs = logs.filter((l) => l.status === "sent").length;

  const formatOccurrenceDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parseInt(parts[2], 10)} tháng ${parseInt(parts[1], 10)}, ${parts[0]}`;
      }
      const d = new Date(dateStr);
      return `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const getEventTypeBadge = (type: string, customType?: string | null) => {
    if (type === "birthday") {
      return {
        label: "Sinh nhật",
        icon: "🎂",
        color: "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-800/40",
      };
    }
    if (type === "anniversary") {
      return {
        label: "Kỷ niệm",
        icon: "💍",
        color: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/40",
      };
    }
    if (type === "memorial") {
      return {
        label: "Ngày giỗ",
        icon: "🕯️",
        color: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
      };
    }
    return {
      label: customType || "Sự kiện",
      icon: "🌟",
      color: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/40",
    };
  };

  const groupStyles: Record<string, string> = {
    "Gia đình": "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/40",
    "Bạn bè": "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40",
    "Đồng nghiệp": "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/40",
    Khác: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40",
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-primary shrink-0" />
            <span>Lịch sử thông báo</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Nhật ký các email nhắc nhở kèm thông tin chi tiết sự kiện đã gửi thành công
          </p>
        </div>
      </div>

      {/* Thẻ thống kê tổng quan (Mini Stats) - Thiết kế cân đối, rõ ràng */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/70 p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Tổng thông báo</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-3xl font-black text-foreground tracking-tight">{totalLogs}</span>
            <span className="text-[11px] text-muted-foreground font-normal">lượt</span>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/70 p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400">Đã gửi thành công</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{successLogs}</span>
            <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 font-normal">email</span>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/70 p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[11px] sm:text-xs font-medium text-primary">Kênh thông báo</span>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Mail className="w-3 h-3" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground">Email Resend</span>
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="Chưa có thông báo nào"
          description="Hệ thống sẽ tự động ghi lại lịch sử tại đây ngay khi có email nhắc sự kiện đầu tiên được gửi đi."
        />
      ) : (
        /* Timeline Container: Căn chỉnh trục thời gian chính xác ở giữa */
        <div className="relative pl-7 sm:pl-9 space-y-5 before:absolute before:left-3 sm:before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-border/70">
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

            // Tìm thông tin sự kiện từ log hoặc đối chiếu từ cache
            const joinedEvent = (log as any).events || (log as any).event;
            const matchedCached = cachedEvents.find((e) => e.id === log.event_id);
            const eventInfo = joinedEvent || matchedCached;

            // Nhóm tùy chỉnh
            const customGroup =
              eventInfo?.custom_group ||
              (eventInfo?.id ? localCustomGroups[eventInfo.id] : null);
            const groupName = customGroup || eventInfo?.group_name || "Khác";

            // Nhãn loại sự kiện
            const typeConfig = getEventTypeBadge(
              eventInfo?.event_type || "other",
              eventInfo?.custom_type
            );

            const occurrenceFormatted = formatOccurrenceDate(log.occurrence_date);

            return (
              <div key={log.id} className="relative group">
                {/* Timeline node icon - Căn chỉnh chính xác tuyệt đối tâm trục (center at 14px) */}
                <div
                  className={cn(
                    "absolute -left-7 sm:-left-9 top-4 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-background shadow-xs z-10 translate-x-[1px]",
                    isSuccess
                      ? "bg-emerald-500 text-white"
                      : "bg-rose-500 text-white"
                  )}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Thẻ Timeline - Card thiết kế cân đối, thoáng đãng, phân cấp thị giác chuẩn mực */}
                <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-border/80 p-4 sm:p-5 shadow-xs hover:border-primary/40 hover:shadow-md transition-all space-y-3.5">
                  {/* Header hàng 1: Tiêu đề nhắc trước & Trạng thái gửi */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-foreground">
                          {log.remind_offset === 0
                            ? "Email nhắc đúng ngày"
                            : `Email nhắc trước ${log.remind_offset} ngày`}
                        </span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shrink-0 border",
                        isSuccess
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-500/20"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          isSuccess ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        )}
                      />
                      <span>{isSuccess ? "Đã gửi" : "Thất bại"}</span>
                    </span>
                  </div>

                  {/* Body hàng 2: Khung chi tiết sự kiện đã gửi */}
                  {eventInfo ? (
                    <div className="flex items-start gap-3 sm:gap-3.5 p-3 sm:p-3.5 rounded-xl bg-secondary/30 dark:bg-secondary/20 border border-border/60">
                      {/* Avatar */}
                      <img
                        src={
                          eventInfo.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            eventInfo.name || "BER"
                          )}`
                        }
                        alt={eventInfo.name}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-secondary border border-border/80 shrink-0 object-cover shadow-2xs"
                      />

                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Tên sự kiện & Huy hiệu */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                            {eventInfo.name}
                          </h4>

                          {/* Huy hiệu loại sự kiện */}
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1",
                              typeConfig.color
                            )}
                          >
                            <span>{typeConfig.icon}</span>
                            <span>{typeConfig.label}</span>
                          </span>

                          {/* Huy hiệu nhóm */}
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                              groupStyles[eventInfo.group_name] || groupStyles["Khác"]
                            )}
                          >
                            {groupName}
                          </span>
                        </div>

                        {/* Ngày diễn ra sự kiện */}
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>
                              Ngày sự kiện: <span className="font-semibold text-foreground">{occurrenceFormatted}</span>
                            </span>
                          </span>
                          {eventInfo.is_lunar && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0 flex items-center gap-0.5">
                              <span>🌙</span>
                              <span>Âm lịch</span>
                            </span>
                          )}
                        </div>

                        {/* Ghi chú & Quà tặng */}
                        {(eventInfo.note || eventInfo.gift_idea) && (
                          <div className="pt-0.5 space-y-1">
                            {eventInfo.note && (
                              <div className="text-[11px] sm:text-xs text-muted-foreground bg-background/60 rounded-lg px-2.5 py-1 border border-border/40">
                                <span className="font-medium text-foreground">📝 Ghi chú:</span> {eventInfo.note}
                              </div>
                            )}
                            {eventInfo.gift_idea && (
                              <div className="text-[11px] sm:text-xs text-muted-foreground bg-background/60 rounded-lg px-2.5 py-1 border border-border/40">
                                <span className="font-medium text-foreground">🎁 Gợi ý quà:</span> {eventInfo.gift_idea}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        Sự kiện: <strong className="text-foreground">Sự kiện đã lên lịch (#{log.event_id?.slice(0, 8)})</strong> • Ngày diễn ra: <strong className="text-foreground">{occurrenceFormatted}</strong>
                      </span>
                    </div>
                  )}

                  {/* Footer hàng 3: Thời gian gửi chi tiết & Kênh gửi */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>
                        Thời gian gửi: <strong className="text-foreground">{formattedTime}</strong> • <span className="text-foreground">{formattedDate}</span>
                      </span>
                    </div>

                    <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary/50 border border-border/50 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-primary/70" />
                      <span>Email</span>
                    </div>
                  </div>

                  {/* Chi tiết lỗi nếu có */}
                  {log.error && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <strong>Chi tiết lỗi:</strong> {log.error}
                    </div>
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

