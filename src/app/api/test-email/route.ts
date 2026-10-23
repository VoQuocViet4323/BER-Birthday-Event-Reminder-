import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ReminderItem, generateReminderEmailHtml } from "@/lib/email/template-builder";
import {
  calculateNextOccurrence,
  calculateDaysRemaining,
  calculateUpcomingAge,
} from "@/lib/date-utils";
import { sendEmail } from "@/lib/email/mailer";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    let targetEmail = body.email;

    if (!targetEmail && user) {
      // Tìm email thật trong bảng profiles nếu có
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("email, display_name")
        .eq("id", user.id)
        .maybeSingle();
      targetEmail = profile?.email || user.email;
    }

    if (!targetEmail || targetEmail.includes("@ber-app.com")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tài khoản hiện chưa có email thực tế (đang dùng đuôi @ber-app.com). Vui lòng cập nhật email nhận thông báo thực tế của bạn tại trang Cài đặt trước khi gửi thử!",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 1. Lấy thông tin user_settings (quy tắc 29/2)
    let leapDayRule: "feb28" | "mar01" = "feb28";
    if (user) {
      const { data: userSetting } = await (supabase as any)
        .from("user_settings")
        .select("leap_day_rule")
        .eq("user_id", user.id)
        .maybeSingle();
      if (userSetting?.leap_day_rule) {
        leapDayRule = userSetting.leap_day_rule;
      }
    }

    // 2. Lấy danh sách sự kiện thực tế của người dùng từ Database
    let realEvents: any[] = [];
    if (user) {
      const { data: dbEvents } = await (supabase as any)
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .eq("enabled", true);
      if (dbEvents && dbEvents.length > 0) {
        realEvents = dbEvents;
      }
    }

    let itemsToSend: ReminderItem[] = [];

    if (realEvents.length > 0) {
      const now = new Date();
      // Tính toán các sự kiện tiếp theo theo thuật toán chuẩn
      const calculated = realEvents.map((ev) => {
        const nextOcc = calculateNextOccurrence(ev, now, leapDayRule);
        const daysRemaining = calculateDaysRemaining(nextOcc, now);
        const upcomingAge = ev.event_year
          ? calculateUpcomingAge(ev.event_year, nextOcc.getFullYear())
          : null;
        return {
          id: ev.id,
          name: ev.name,
          eventType: ev.event_type,
          eventDateFormatted: `${ev.event_day} tháng ${ev.event_month}${ev.is_lunar ? " (Âm lịch)" : ""}`,
          daysRemaining,
          upcomingAge,
          groupName: ev.group_name || "Khác",
          isLunar: ev.is_lunar,
          note: ev.note,
          giftIdea: ev.gift_idea,
        };
      });

      // Sắp xếp các sự kiện gần nhất lên đầu
      calculated.sort((a, b) => a.daysRemaining - b.daysRemaining);

      // Lấy tối đa 3 sự kiện sắp tới nhất
      itemsToSend = calculated.slice(0, 3);
    }

    // Nếu người dùng chưa có sự kiện nào trên DB, dùng dữ liệu mẫu demo phong phú
    const isUsingRealEvents = itemsToSend.length > 0;
    if (!isUsingRealEvents) {
      itemsToSend = [
        {
          id: "demo-1",
          name: "Mẹ yêu",
          eventType: "birthday",
          eventDateFormatted: "25 tháng 10",
          daysRemaining: 0,
          upcomingAge: 56,
          groupName: "Gia đình",
          isLunar: false,
          note: "Mẹ thích hoa lan hồ điệp tím",
          giftIdea: "Khăn lụa tơ tằm",
        },
        {
          id: "demo-2",
          name: "Tuấn Anh (Cạ cứng)",
          eventType: "birthday",
          eventDateFormatted: "28 tháng 10",
          daysRemaining: 3,
          upcomingAge: 29,
          groupName: "Bạn bè",
          isLunar: false,
          note: "Hẹn ăn lẩu chúc mừng",
        },
      ];
    }

    const recipientName = user?.user_metadata?.full_name || "Bạn";
    const html = generateReminderEmailHtml({
      userName: recipientName,
      items: itemsToSend,
      appUrl,
      unsubscribeUrl: `${appUrl}/settings`,
    });

    const subject = isUsingRealEvents
      ? `🔔 [Nhắc nhở thật] Bạn có ${itemsToSend.length} sự kiện sắp tới: ${itemsToSend.map((i) => i.name).join(", ")}`
      : "🔔 [Thử nghiệm] Email nhắc sinh nhật & sự kiện mẫu";

    const result = await sendEmail({
      to: targetEmail,
      subject,
      html,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Gửi email thất bại" },
        { status: 500 }
      );
    }

    // Ghi log vào notification_logs nếu gửi thật thành công
    if (user && !result.simulated && result.success) {
      try {
        for (const item of itemsToSend) {
          if (!item.id.startsWith("demo-")) {
            await (supabase as any).from("notification_logs").insert({
              user_id: user.id,
              event_id: item.id,
              remind_offset: item.daysRemaining,
              occurrence_date: new Date().toISOString().split("T")[0],
              channel: "email",
              status: "sent",
            });
          }
        }
      } catch (logErr) {
        console.warn("Could not insert notification log:", logErr);
      }
    }

    return NextResponse.json({
      success: true,
      simulated: result.simulated,
      provider: result.provider,
      isRealData: isUsingRealEvents,
      itemsCount: itemsToSend.length,
      eventNames: itemsToSend.map((i) => i.name),
      message: isUsingRealEvents
        ? `Đã gửi thông báo thật cho ${itemsToSend.length} sự kiện (${itemsToSend.map((i) => i.name).join(", ")}) tới ${targetEmail}!`
        : result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
