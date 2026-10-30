import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  simulated?: boolean;
  provider?: "smtp" | "resend" | "simulated";
  message?: string;
  error?: string;
}

/**
 * Gửi email thông báo qua Gmail SMTP (không cần tên miền riêng) hoặc Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, from } = options;
  const toList = Array.isArray(to) ? to : [to];
  const toStr = toList.join(", ");

  // 1. ƯU TIÊN 1: Gmail SMTP / Custom SMTP (Tuyệt đối không cần mua tên miền riêng)
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass && !smtpPass.includes("dummy")) {
    try {
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = Number(process.env.SMTP_PORT) || 465;
      const isSecure = smtpPort === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        auth: {
          user: smtpUser,
          // Tự động loại bỏ khoảng trắng nếu người dùng copy mã 16 ký tự có dấu cách từ Google
          pass: smtpPass.replace(/\s+/g, ""),
        },
      });

      const senderFrom =
        from ||
        (process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes("resend.dev")
          ? process.env.EMAIL_FROM
          : `"BER" <${smtpUser}>`);

      await transporter.sendMail({
        from: senderFrom,
        to: toStr,
        subject,
        html,
      });

      return {
        success: true,
        provider: "smtp",
        message: `Đã gửi email thành công qua Gmail SMTP tới ${toStr}!`,
      };
    } catch (err: any) {
      console.error("[Mailer SMTP Error]:", err);
      return {
        success: false,
        provider: "smtp",
        error: `Lỗi gửi qua Gmail SMTP: ${err?.message || "Không thể kết nối máy chủ mail"}`,
      };
    }
  }

  // 2. ƯU TIÊN 2: Resend API (Dành cho tài khoản có tên miền riêng hoặc email thử nghiệm đã verify)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && !resendApiKey.includes("dummy")) {
    try {
      const emailFrom = process.env.EMAIL_FROM || "BER <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: toList,
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          provider: "resend",
          error: `Resend error: ${errText}`,
        };
      }

      return {
        success: true,
        provider: "resend",
        message: `Đã gửi email thành công qua Resend tới ${toStr}!`,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "resend",
        error: err?.message || "Lỗi kết nối Resend API",
      };
    }
  }

  // 3. CHẾ ĐỘ MÔ PHỎNG (Khi chưa cấu hình cả Gmail SMTP lẫn Resend)
  return {
    success: true,
    simulated: true,
    provider: "simulated",
    message: `[Mô phỏng] Đã tạo thành công nội dung email gửi tới ${toStr}. Vui lòng cấu hình SMTP_USER & SMTP_PASS (Gmail) hoặc RESEND_API_KEY trong file .env để gửi thư thật!`,
  };
}
