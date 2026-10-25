// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code is designed to run in Supabase Edge Functions (Deno runtime).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import { generateReminderEmailHtml, ReminderItem } from "./email-template.ts";
import {
  EventRecord,
  getNextOccurrence,
  getDaysDifference,
} from "./reminder-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Xử lý CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const emailFrom = Deno.env.get("EMAIL_FROM") || "Nhắc Sinh Nhật <onboarding@resend.dev>";
    const rawAppUrl = Deno.env.get("NEXT_PUBLIC_APP_URL");
    const appUrl =
      rawAppUrl && !rawAppUrl.includes("localhost") && !rawAppUrl.includes("127.0.0.1") && !rawAppUrl.includes("ber-reminder.vercel.app")
        ? rawAppUrl.replace(/\/+$/, "")
        : "https://ber-birthday-event-reminder.vercel.app";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase configuration environment variables");
    }

    // Khởi tạo Supabase client với quyền Service Role
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Đọc body nếu có (dành cho trigger thủ công hoặc test)
    let isTest = false;
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      if (body?.is_test) isTest = true;
      if (body?.user_id) targetUserId = body.user_id;
    } catch {
      // Body rỗng khi gọi từ cron
    }

    // 1. Lấy danh sách người dùng đã bật nhận email
    let query = supabase
      .from("user_settings")
      .select(`
        user_id,
        email_enabled,
        default_remind_days,
        remind_time,
        leap_day_rule,
        profiles (
          id,
          display_name,
          timezone,
          email
        )
      `)
      .eq("email_enabled", true);

    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: userSettingsList, error: userError } = await query;
    if (userError) throw userError;

    const results = [];
    const nowUtc = new Date();

    for (const setting of userSettingsList || []) {
      const profile = (setting as any).profiles;
      const timezone = profile?.timezone || "Asia/Ho_Chi_Minh";
      const userDisplayName = profile?.display_name || "Bạn";

      // Thời gian hiện tại theo múi giờ của người dùng dạng "HH:mm" (ví dụ: "16:50")
      const userLocalTimeStr = nowUtc.toLocaleTimeString("en-GB", {
        timeZone: timezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      // Lấy email chính từ profiles trước, fallback sang auth.users
      let primaryEmail = profile?.email;
      if (!primaryEmail || primaryEmail.endsWith("@ber-app.com")) {
        const { data: authUserData } = await supabase.auth.admin.getUserById(setting.user_id);
        if (authUserData?.user?.email && !authUserData.user.email.endsWith("@ber-app.com")) {
          primaryEmail = authUserData.user.email;
        }
      }

      const rawRecipients = [primaryEmail].filter(Boolean);
      // Loại bỏ các email tạm thời nội bộ (@ber-app.com, @ber.local)
      const recipientEmails = rawRecipients.filter(
        (em) => !em.endsWith("@ber-app.com") && !em.endsWith("@ber.local")
      );
      if (recipientEmails.length === 0) continue;

      // 2. Lấy tất cả sự kiện đang hoạt động của user này
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", setting.user_id)
        .eq("enabled", true);

      if (eventsError || !events || events.length === 0) continue;

      // 3. Tính toán những sự kiện cần nhắc nhở hôm nay
      const remindersToSend: {
        item: ReminderItem;
        event: EventRecord;
        offset: number;
        occurrenceDateStr: string;
      }[] = [];

      for (const ev of events) {
        const rawDaysList = (ev.remind_days && ev.remind_days.length > 0)
          ? ev.remind_days
          : setting.default_remind_days;
        const remindDaysList = (rawDaysList || []).map((d: any) => Number(d)).filter((d: number) => !isNaN(d));

        const nextOcc = getNextOccurrence(ev as EventRecord, nowUtc, setting.leap_day_rule);
        const daysDiff = getDaysDifference(nextOcc, nowUtc);

        // Kiểm tra xem daysDiff có trùng với bất kỳ mốc remindDaysList nào không
        if (remindDaysList.includes(daysDiff)) {
          // Kiểm tra xem đã đến hoặc qua giờ nhắc trong ngày chưa (cho phép gửi bù nếu trễ giờ)
          if (!isTest) {
            const evTime = (ev.remind_time || setting.remind_time || "08:00").substring(0, 5);
            if (userLocalTimeStr < evTime) {
              continue;
            }
          }

          const occDateStr = nextOcc.toISOString().split("T")[0];

          // 4. Kiểm tra chống gửi trùng trong notification_logs
          const { data: existingLog } = await supabase
            .from("notification_logs")
            .select("id")
            .eq("event_id", ev.id)
            .eq("remind_offset", daysDiff)
            .eq("occurrence_date", occDateStr)
            .eq("channel", "email")
            .maybeSingle();

          if (!existingLog || isTest) {
            // Tính tuổi sắp tới nếu có năm sinh
            let upcomingAge: number | null = null;
            if (ev.event_year) {
              upcomingAge = nextOcc.getUTCFullYear() - ev.event_year;
            }

            remindersToSend.push({
              offset: daysDiff,
              occurrenceDateStr: occDateStr,
              event: ev as EventRecord,
              item: {
                id: ev.id,
                name: ev.name,
                eventType: ev.event_type,
                eventDateFormatted: `${ev.event_day} tháng ${ev.event_month}`,
                daysRemaining: daysDiff,
                upcomingAge,
                groupName: ev.group_name,
                isLunar: ev.is_lunar,
                note: ev.note,
                giftIdea: ev.gift_idea,
              },
            });
          }
        }
      }

      // 5. Nếu có sự kiện cần nhắc -> Gộp thành một email HTML tổng hợp và gửi đi
      if (remindersToSend.length > 0) {
        const emailHtml = generateReminderEmailHtml({
          userName: userDisplayName,
          items: remindersToSend.map((r) => r.item),
          appUrl,
          unsubscribeUrl: `${appUrl}/settings?unsubscribe=true`,
        });

        let sendStatus = "sent";
        let sendError = null;

        if (resendApiKey) {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: emailFrom,
                to: recipientEmails,
                subject: `🔔 [Nhắc nhở] Bạn có ${remindersToSend.length} sự kiện quan trọng sắp tới!`,
                html: emailHtml,
              }),
            });

            if (!res.ok) {
              const errBody = await res.text();
              sendStatus = "failed";
              sendError = `Resend error: ${errBody}`;
            }
          } catch (err: any) {
            sendStatus = "failed";
            sendError = err.message || "Failed to send email via Resend";
          }
        } else {
          // Khi chưa có Resend API key thực tế trong môi trường test
          console.log(`[SIMULATE EMAIL] To: ${recipientEmails.join(", ")} | Items: ${remindersToSend.length}`);
        }

        // 6. Ghi log vào notification_logs để chống gửi trùng lặp
        if (!isTest) {
          for (const rem of remindersToSend) {
            await supabase.from("notification_logs").insert({
              user_id: setting.user_id,
              event_id: rem.event.id,
              remind_offset: rem.offset,
              occurrence_date: rem.occurrenceDateStr,
              channel: "email",
              status: sendStatus,
              error: sendError,
            });
          }
        }

        results.push({
          user_id: setting.user_id,
          sent_to: recipientEmails,
          items_count: remindersToSend.length,
          status: sendStatus,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_users: results.length,
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
