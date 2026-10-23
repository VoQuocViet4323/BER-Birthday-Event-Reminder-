import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReminderEmailHtml } from "@/lib/email/template-builder";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    const targetEmail = body.email || user?.email;

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp email nhận thử nghiệm" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || "Nhắc Sự Kiện <onboarding@resend.dev>";

    // Dữ liệu mẫu demo cho email thử nghiệm
    const sampleItems = [
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

    const html = generateReminderEmailHtml({
      userName: user?.user_metadata?.full_name || "Bạn",
      items: sampleItems,
      appUrl,
      unsubscribeUrl: `${appUrl}/settings`,
    });

    if (resendApiKey && !resendApiKey.includes("dummy")) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [targetEmail],
          subject: "🔔 [Thử nghiệm] Email nhắc sinh nhật & sự kiện mẫu",
          html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { success: false, error: `Resend error: ${errText}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã gửi email thử nghiệm thành công tới ${targetEmail}!`,
      });
    }

    // Chế độ mô phỏng khi chưa gắn Resend Key thực tế
    return NextResponse.json({
      success: true,
      simulated: true,
      message: `[Mô phỏng] Đã tạo thành công nội dung email gửi tới ${targetEmail}. Vui lòng cấu hình RESEND_API_KEY để gửi thư thật!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
