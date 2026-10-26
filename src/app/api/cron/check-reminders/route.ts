import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateNextOccurrence,
  calculateDaysRemaining,
  calculateUpcomingAge,
} from "@/lib/date-utils";
import { ReminderItem, generateReminderEmailHtml } from "@/lib/email/template-builder";
import { sendEmail } from "@/lib/email/mailer";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleCheckReminders(request);
}

export async function POST(request: Request) {
  return handleCheckReminders(request);
}

async function handleCheckReminders(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Lấy thời gian hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }); // Dạng "HH:mm" (ví dụ: "16:50")

    // Nếu không có phiên người dùng (được gọi từ Vercel Cron hoặc Cloud scheduler):
    // Tự động chuyển sang chế độ quét toàn hệ thống cho mọi người dùng
    if (!user) {
      const admin = createAdminClient();
      if (admin) {
        return await handleGlobalCronCheck(admin, currentTimeStr, now);
      }

      return NextResponse.json({
        success: true,
        checkedAt: currentTimeStr,
        message: "Chưa có phiên người dùng đăng nhập để quét nhắc nhở.",
      });
    }

    // 1. Lấy thông tin cấu hình người dùng
    const [settingsRes, profileRes] = await Promise.all([
      (supabase as any).from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      (supabase as any).from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);

    const userSetting = settingsRes.data;
    const userProfile = profileRes.data;

    // Nếu người dùng chủ động tắt thông báo qua email -> bỏ qua
    if (userSetting && userSetting.email_enabled === false) {
      return NextResponse.json({
        success: true,
        checkedAt: currentTimeStr,
        skipped: true,
        reason: "Người dùng đã tắt tính năng gửi email trong Cài đặt.",
      });
    }

    const leapDayRule = userSetting?.leap_day_rule || "feb28";
    const defaultRemindTime = userSetting?.remind_time || "08:00";
    const defaultOffsets: number[] = userSetting?.default_remind_days || [7, 3, 1, 0];

    // 2. Lấy danh sách sự kiện đang hoạt động của người dùng
    const { data: events, error: eventsError } = await (supabase as any)
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .eq("enabled", true);

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        checkedAt: currentTimeStr,
        dueCount: 0,
        message: "Không có sự kiện nào đang được bật.",
      });
    }

    // 3. Tìm các sự kiện trùng khớp với ngày và giờ phút hiện tại
    const dueEvents: any[] = [];

    for (const ev of events) {
      const nextOcc = calculateNextOccurrence(ev, now, leapDayRule);
      const daysRemaining = calculateDaysRemaining(nextOcc, now);

      // Kiểm tra xem hôm nay có phải là một trong các mốc nhắc trước không
      const rawOffsets =
        Array.isArray(ev.remind_days) && ev.remind_days.length > 0
          ? ev.remind_days
          : defaultOffsets;

      const eventOffsets = (rawOffsets || []).map((d: any) => Number(d)).filter((d: number) => !isNaN(d));

      if (!eventOffsets.includes(daysRemaining)) {
        continue;
      }

      // Giờ nhắc của sự kiện (ưu tiên giờ riêng của sự kiện, fallback về giờ mặc định)
      const eventTime = ev.remind_time || defaultRemindTime;

      // Chuẩn hóa định dạng "HH:mm" để tránh sai lệch khi Postgres trả về "HH:mm:ss"
      const normalizeTime = (t: string | null | undefined) => {
        if (!t) return "08:00";
        const parts = t.trim().split(":");
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
        }
        return t;
      };

      const normalizedEventTime = normalizeTime(eventTime);
      const normalizedCurrentTime = normalizeTime(currentTimeStr);

      // Nếu chưa đến giờ nhắc trong ngày hôm nay -> bỏ qua chờ đến đúng giờ
      if (normalizedCurrentTime < normalizedEventTime) {
        continue;
      }

      // Chuẩn hóa ngày diễn ra sự kiện dạng "YYYY-MM-DD" không phụ thuộc timezone
      const occurrenceDateStr = formatOccurrenceDate(nextOcc);
      const locked = await claimReminderLock(
        supabase,
        user.id,
        ev.id,
        daysRemaining,
        occurrenceDateStr
      );

      if (!locked) {
        // Đã gửi hoặc đang có một request song song khác chiếm quyền xử lý -> bỏ qua ngay!
        continue;
      }

      const upcomingAge = ev.event_year
        ? calculateUpcomingAge(ev.event_year, nextOcc.getFullYear())
        : null;

      dueEvents.push({
        ...ev,
        daysRemaining,
        upcomingAge,
        occurrenceDateStr,
      });
    }

    if (dueEvents.length === 0) {
      return NextResponse.json({
        success: true,
        checkedAt: currentTimeStr,
        dueCount: 0,
        message: `Đã quét lúc ${currentTimeStr}. Không có sự kiện nào đến giờ thông báo tại phút này (hoặc đã được gửi).`,
      });
    }

    // 5. Xác định email người nhận hợp lệ
    let targetEmail =
      userSetting?.custom_reminder_email ||
      userProfile?.email ||
      (user.email && !user.email.includes("@ber-app.com") ? user.email : null) ||
      process.env.SMTP_USER;

    if (!targetEmail) {
      // Rollback lock nếu thiếu email nhận
      await releaseReminderLock(supabase, dueEvents);
      return NextResponse.json(
        {
          success: false,
          error: "Không tìm thấy email người nhận hợp lệ.",
        },
        { status: 400 }
      );
    }

    // 6. Tạo nội dung email đẹp mắt
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const appUrl =
      rawAppUrl && !rawAppUrl.includes("localhost") && !rawAppUrl.includes("127.0.0.1")
        ? rawAppUrl.replace(/\/+$/, "")
        : "https://ber-birthday-event-reminder.vercel.app";
    const itemsToSend: ReminderItem[] = dueEvents.map((ev) => ({
      id: ev.id,
      name: ev.name,
      eventType: ev.event_type,
      eventDateFormatted: `${ev.event_day} tháng ${ev.event_month}${ev.is_lunar ? " (Âm lịch)" : ""}`,
      daysRemaining: ev.daysRemaining,
      upcomingAge: ev.upcomingAge,
      groupName: ev.group_name || "Khác",
      isLunar: ev.is_lunar,
      note: ev.note,
      giftIdea: ev.gift_idea,
    }));

    const recipientName =
      userProfile?.display_name || user.user_metadata?.full_name || "Bạn";

    const html = generateReminderEmailHtml({
      userName: recipientName,
      items: itemsToSend,
      appUrl,
      unsubscribeUrl: `${appUrl}/settings`,
    });

    const eventNames = dueEvents.map((e) => e.name).join(", ");
    const subject = `🔔 [Nhắc nhở lúc ${currentTimeStr}] Sự kiện: ${eventNames}`;

    // 7. Gửi email qua Gmail SMTP / Resend
    const sendResult = await sendEmail({
      to: targetEmail,
      subject,
      html,
    });

    if (!sendResult.success) {
      // Rollback: Xóa bản ghi pending để chu kỳ tiếp theo có thể gửi lại
      await releaseReminderLock(supabase, dueEvents);
      return NextResponse.json(
        { success: false, error: sendResult.error || "Gửi email thất bại" },
        { status: 500 }
      );
    }

    // 8. Chốt thành công: Cập nhật notification_logs từ 'pending' sang 'sent'
    await commitReminderSent(supabase, dueEvents);

    return NextResponse.json({
      success: true,
      sent: true,
      checkedAt: currentTimeStr,
      targetEmail,
      eventCount: dueEvents.length,
      events: dueEvents.map((e) => ({
        id: e.id,
        name: e.name,
        remind_time: e.remind_time || defaultRemindTime,
      })),
      message: `Đã tự động gửi email thành công lúc ${currentTimeStr} tới ${targetEmail}!`,
    });
  } catch (error: any) {
    console.error("Cron minute check error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi kiểm tra nhắc nhở" },
      { status: 500 }
    );
  }
}

/**
 * Quét toàn bộ người dùng trong hệ thống khi cron được gọi từ máy chủ (Vercel Cron, Cloud Scheduler)
 * mà không có cookie hay phiên người dùng trong trình duyệt.
 */
async function handleGlobalCronCheck(admin: any, currentTimeStr: string, now: Date) {
  try {
    const { data: userSettings, error: settingsErr } = await admin
      .from("user_settings")
      .select("*, profiles(*)")
      .eq("email_enabled", true);

    if (settingsErr || !userSettings || userSettings.length === 0) {
      return NextResponse.json({
        success: true,
        mode: "global-cron",
        checkedAt: currentTimeStr,
        message: "Không có người dùng nào đang bật nhận email.",
      });
    }

    let totalEmailsSent = 0;
    const processedEvents: string[] = [];

    for (const setting of userSettings) {
      const userId = setting.user_id;
      const profile = setting.profiles;
      const leapDayRule = setting.leap_day_rule || "feb28";
      const defaultRemindTime = setting.remind_time || "08:00";
      const defaultOffsets: number[] = setting.default_remind_days || [7, 3, 1, 0];

      const { data: events } = await admin
        .from("events")
        .select("*")
        .eq("user_id", userId)
        .eq("enabled", true);

      if (!events || events.length === 0) continue;

      const dueEvents: any[] = [];

      for (const ev of events) {
        const nextOcc = calculateNextOccurrence(ev, now, leapDayRule);
        const daysRemaining = calculateDaysRemaining(nextOcc, now);
        const rawOffsets =
          Array.isArray(ev.remind_days) && ev.remind_days.length > 0
            ? ev.remind_days
            : defaultOffsets;
        const eventOffsets = (rawOffsets || []).map((d: any) => Number(d)).filter((d: number) => !isNaN(d));

        if (!eventOffsets.includes(daysRemaining)) continue;

        const eventTime = ev.remind_time || defaultRemindTime;
        const normalizeTime = (t: string | null | undefined) => {
          if (!t) return "08:00";
          const parts = t.trim().split(":");
          return parts.length >= 2 ? `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}` : t;
        };

        if (normalizeTime(currentTimeStr) < normalizeTime(eventTime)) continue;

        const occurrenceDateStr = formatOccurrenceDate(nextOcc);
        const locked = await claimReminderLock(
          admin,
          userId,
          ev.id,
          daysRemaining,
          occurrenceDateStr
        );
        if (!locked) continue;

        const upcomingAge = ev.event_year ? calculateUpcomingAge(ev.event_year, nextOcc.getFullYear()) : null;
        dueEvents.push({ ...ev, daysRemaining, upcomingAge, occurrenceDateStr });
      }

      if (dueEvents.length === 0) continue;

      const targetEmail =
        setting.custom_reminder_email ||
        profile?.email ||
        process.env.SMTP_USER;

      if (!targetEmail) {
        await releaseReminderLock(admin, dueEvents);
        continue;
      }

      const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL;
      const appUrl =
        rawAppUrl && !rawAppUrl.includes("localhost")
          ? rawAppUrl.replace(/\/+$/, "")
          : "https://ber-birthday-event-reminder.vercel.app";

      const itemsToSend: ReminderItem[] = dueEvents.map((ev) => ({
        id: ev.id,
        name: ev.name,
        eventType: ev.event_type,
        eventDateFormatted: `${ev.event_day} tháng ${ev.event_month}${ev.is_lunar ? " (Âm lịch)" : ""}`,
        daysRemaining: ev.daysRemaining,
        upcomingAge: ev.upcomingAge,
        groupName: ev.group_name || "Khác",
        isLunar: ev.is_lunar,
        note: ev.note,
        giftIdea: ev.gift_idea,
      }));

      const recipientName = profile?.display_name || "Bạn";
      const html = generateReminderEmailHtml({
        userName: recipientName,
        items: itemsToSend,
        appUrl,
        unsubscribeUrl: `${appUrl}/settings`,
      });

      const eventNames = dueEvents.map((e) => e.name).join(", ");
      const subject = `🔔 [Nhắc nhở lúc ${currentTimeStr}] Sự kiện: ${eventNames}`;

      const sendResult = await sendEmail({ to: targetEmail, subject, html });

      if (sendResult.success) {
        totalEmailsSent++;
        processedEvents.push(...dueEvents.map((e) => e.name));
        await commitReminderSent(admin, dueEvents);
      } else {
        await releaseReminderLock(admin, dueEvents);
      }
    }

    return NextResponse.json({
      success: true,
      mode: "global-cron",
      checkedAt: currentTimeStr,
      totalEmailsSent,
      events: processedEvents,
      message: `Đã hoàn tất quét toàn hệ thống lúc ${currentTimeStr}. Đã gửi ${totalEmailsSent} email.`,
    });
  } catch (err: any) {
    console.error("Global cron check error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi quét toàn hệ thống" },
      { status: 500 }
    );
  }
}

/**
 * Định dạng ngày sự kiện độc lập tuyệt đối với múi giờ client/server
 * Tránh lỗi lệch 1 ngày khi dùng .toISOString() ở múi giờ GMT+7
 */
function formatOccurrenceDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Khóa độc quyền đa tầng (Triple Lock Idempotency) chống gửi trùng lặp tuyệt đối:
 * Lớp 1: Kiểm tra xem trong 18 giờ qua đã có email 'sent' cho sự kiện & mốc nhắc này chưa.
 * Lớp 2: Kiểm tra bản ghi với occurrence_date chính xác (dọn dẹp pending stuck > 3 phút).
 * Lớp 3: Ràng buộc cơ sở dữ liệu UNIQUE (event_id, remind_offset, occurrence_date, channel).
 */
async function claimReminderLock(
  client: any,
  userId: string,
  eventId: string,
  remindOffset: number,
  occurrenceDateStr: string
): Promise<boolean> {
  try {
    // LỚP 1: Chống gửi lặp trong vòng 18 giờ qua (ngăn chặn tuyệt đối double email trong cùng 1 ngày)
    const eighteenHoursAgo = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString();
    const { data: recentSent } = await client
      .from("notification_logs")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("remind_offset", remindOffset)
      .eq("channel", "email")
      .eq("status", "sent")
      .gte("sent_at", eighteenHoursAgo)
      .limit(1);

    if (recentSent && recentSent.length > 0) {
      // Đã gửi email thành công trong 18 giờ qua -> TUYỆT ĐỐI KHÔNG GỬI LẠI!
      return false;
    }

    // LỚP 2: Kiểm tra bản ghi cùng mốc occurrence_date
    const { data: existingLogs } = await client
      .from("notification_logs")
      .select("id, status, sent_at")
      .eq("event_id", eventId)
      .eq("remind_offset", remindOffset)
      .eq("occurrence_date", occurrenceDateStr)
      .eq("channel", "email")
      .order("sent_at", { ascending: false })
      .limit(1);

    if (existingLogs && existingLogs.length > 0) {
      const log = existingLogs[0];
      if (log.status === "sent") {
        return false;
      }
      // Nếu là 'pending' nhưng vừa mới tạo trong vòng 3 phút -> đang có luồng khác gửi
      const logTime = new Date(log.sent_at || Date.now()).getTime();
      if (Date.now() - logTime < 3 * 60 * 1000) {
        return false;
      }
      // Nếu là 'pending' đã quá 3 phút (stuck timeout) -> xóa để claim lại
      await client.from("notification_logs").delete().eq("id", log.id);
    }

    // LỚP 3: Atomic Insert với status = 'pending'
    const { error: lockErr } = await client.from("notification_logs").insert({
      user_id: userId,
      event_id: eventId,
      remind_offset: remindOffset,
      occurrence_date: occurrenceDateStr,
      channel: "email",
      status: "pending",
    });

    if (lockErr) {
      // Bị trùng khóa UNIQUE (luồng song song khác vừa chiếm lock trong cùng mili-giây)
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Xác nhận đã gửi email thành công -> chuyển 'pending' sang 'sent'
 */
async function commitReminderSent(client: any, events: any[]) {
  for (const ev of events) {
    try {
      await client
        .from("notification_logs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("event_id", ev.id)
        .eq("remind_offset", ev.daysRemaining)
        .eq("occurrence_date", ev.occurrenceDateStr)
        .eq("channel", "email");
    } catch (err) {
      console.warn("Could not commit reminder log status to sent:", err);
    }
  }
}

/**
 * Rollback xóa lock 'pending' nếu gửi email gặp sự cố (để lần quét tiếp theo có thể thử lại)
 */
async function releaseReminderLock(client: any, events: any[]) {
  for (const ev of events) {
    try {
      await client
        .from("notification_logs")
        .delete()
        .eq("event_id", ev.id)
        .eq("remind_offset", ev.daysRemaining)
        .eq("occurrence_date", ev.occurrenceDateStr)
        .eq("channel", "email")
        .eq("status", "pending");
    } catch (err) {
      console.warn("Could not release pending reminder lock:", err);
    }
  }
}
