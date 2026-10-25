// ==============================================================================
// EMAIL TEMPLATE BUILDER: GIAO DIỆN EMAIL HTML CHUẨN HIỆN ĐẠI & TỐI ƯU TOÀN DIỆN MOBILE
// ==============================================================================

export interface ReminderItem {
  id: string;
  name: string;
  eventType: string; // 'birthday' | 'anniversary' | 'memorial' | 'other'
  eventDateFormatted: string; // e.g. "25 tháng 10"
  daysRemaining: number;
  upcomingAge?: number | null;
  groupName: string;
  isLunar?: boolean;
  note?: string | null;
  giftIdea?: string | null;
}

export const CANONICAL_APP_URL = "https://ber-birthday-event-reminder.vercel.app";

/**
 * Đảm bảo liên kết trong email gửi đến người dùng luôn trỏ chính xác về Web App Real (Production).
 * Nếu truyền vào localhost hoặc domain cũ không tồn tại, hàm sẽ tự động chuẩn hóa về URL Production.
 */
export function resolveProductionAppUrl(inputUrl?: string): string {
  if (!inputUrl || typeof inputUrl !== "string") {
    return CANONICAL_APP_URL;
  }
  const clean = inputUrl.trim().replace(/\/+$/, "");
  if (
    !clean ||
    clean.includes("localhost") ||
    clean.includes("127.0.0.1") ||
    clean.includes("ber-reminder.vercel.app")
  ) {
    return CANONICAL_APP_URL;
  }
  return clean;
}

export function generateReminderEmailHtml(params: {
  userName: string;
  items: ReminderItem[];
  appUrl?: string;
  unsubscribeUrl?: string;
}): string {
  const { userName, items } = params;
  const appUrl = resolveProductionAppUrl(params.appUrl);
  const unsubscribeUrl =
    params.unsubscribeUrl &&
    !params.unsubscribeUrl.includes("localhost") &&
    !params.unsubscribeUrl.includes("127.0.0.1") &&
    !params.unsubscribeUrl.includes("ber-reminder.vercel.app")
      ? params.unsubscribeUrl
      : `${appUrl}/settings`;

  // Tiêu đề & lời dẫn
  const hasToday = items.some((i) => i.daysRemaining === 0);
  const headline = hasToday
    ? "Hôm nay có sự kiện đặc biệt!"
    : `Bạn có ${items.length} sự kiện quan trọng sắp diễn ra`;

  // Sử dụng 1 biểu tượng duy nhất để tránh bị kéo giãn thành hình oval trên mobile
  const heroEmoji = hasToday ? "🎂" : "🔔";

  const itemsHtml = items
    .map((item) => {
      // 1. Phân loại sự kiện (Dùng chữ thường có dấu, không all-caps để tránh vỡ chữ)
      let typeConfig = {
        label: "Sự kiện",
        icon: "🌟",
        color: "#2563eb",
        bg: "#eff6ff",
        border: "#bfdbfe",
        accentColor: "#3b82f6",
      };

      if (item.eventType === "birthday") {
        typeConfig = {
          label: "Sinh nhật",
          icon: "🎂",
          color: "#7c3aed",
          bg: "#f5f3ff",
          border: "#ddd6fe",
          accentColor: "#8b5cf6",
        };
      } else if (item.eventType === "anniversary") {
        typeConfig = {
          label: "Kỷ niệm",
          icon: "💍",
          color: "#db2777",
          bg: "#fdf2f8",
          border: "#fbcfe8",
          accentColor: "#ec4899",
        };
      } else if (item.eventType === "memorial") {
        typeConfig = {
          label: "Ngày giỗ",
          icon: "🕯️",
          color: "#475569",
          bg: "#f8fafc",
          border: "#cbd5e1",
          accentColor: "#64748b",
        };
      }

      // 2. Mốc thời gian đếm ngược: chữ ngắn gọn, có white-space: nowrap chống xuống dòng
      let countdownHtml = "";
      if (item.daysRemaining === 0) {
        countdownHtml = `
          <span style="display: inline-block; white-space: nowrap; background: linear-gradient(135deg, #ef4444 0%, #f43f5e 100%); color: #ffffff !important; font-weight: 700; font-size: 11.5px; padding: 4px 11px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25);">
            🎉 Hôm nay
          </span>
        `;
      } else if (item.daysRemaining === 1) {
        countdownHtml = `
          <span style="display: inline-block; white-space: nowrap; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff !important; font-weight: 700; font-size: 11.5px; padding: 4px 11px; border-radius: 9999px;">
            ⏳ Ngày mai
          </span>
        `;
      } else {
        countdownHtml = `
          <span style="display: inline-block; white-space: nowrap; background: #e0e7ff; color: #3730a3; font-weight: 700; font-size: 11.5px; padding: 4px 11px; border-radius: 9999px; border: 1px solid #c7d2fe;">
            ⏳ Còn ${item.daysRemaining} ngày
          </span>
        `;
      }

      // 3. Huy hiệu Âm lịch & Tuổi
      const lunarBadge = item.isLunar
        ? `<span style="display: inline-block; white-space: nowrap; font-size: 11px; font-weight: 700; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 2px 7px; border-radius: 9999px; margin-left: 4px; vertical-align: middle;">Âm lịch</span>`
        : "";

      const ageBadge = item.upcomingAge
        ? `<span style="display: inline-block; white-space: nowrap; font-size: 11.5px; font-weight: 700; background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; padding: 2px 8px; border-radius: 9999px; margin-left: 6px; vertical-align: middle;">🎂 ${item.upcomingAge} tuổi</span>`
        : "";

      // 4. Khối Ghi chú & Gợi ý quà tặng
      const noteHtml = item.note
        ? `
          <div style="background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 8px 12px; margin-top: 8px; font-size: 13px; color: #92400e; line-height: 1.45;">
            <strong>📝 Ghi chú:</strong> ${item.note}
          </div>
        `
        : "";

      const giftHtml = item.giftIdea
        ? `
          <div style="background: #fdf2f8; border-left: 3px solid #ec4899; border-radius: 0 8px 8px 0; padding: 8px 12px; margin-top: 6px; font-size: 13px; color: #9d174d; line-height: 1.45;">
            <strong>🎁 Gợi ý quà:</strong> ${item.giftIdea}
          </div>
        `
        : "";

      return `
        <!-- Card Sự Kiện -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-box" style="margin-bottom: 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04); overflow: hidden;">
          <tr>
            <td style="height: 3px; background: ${typeConfig.accentColor}; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 16px 18px;">
              <!-- Hàng Top: Loại sự kiện (trái) + Trạng thái đếm ngược (phải) - Không bao giờ vỡ dòng -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle; white-space: nowrap;">
                    <span style="display: inline-block; white-space: nowrap; font-size: 11.5px; font-weight: 700; color: ${typeConfig.color}; background: ${typeConfig.bg}; border: 1px solid ${typeConfig.border}; padding: 3px 9px; border-radius: 9999px;">
                      ${typeConfig.icon} ${typeConfig.label}
                    </span>
                    ${lunarBadge}
                  </td>
                  <td align="right" style="vertical-align: middle; white-space: nowrap;">
                    ${countdownHtml}
                  </td>
                </tr>
              </table>

              <!-- Tên sự kiện & Tuổi -->
              <div style="margin-top: 12px; margin-bottom: 8px;">
                <span class="card-title" style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; line-height: 1.25; vertical-align: middle;">
                  ${item.name}
                </span>
                ${ageBadge}
              </div>

              <!-- Bảng Thông tin Chi tiết: Ngày & Nhóm (Xếp hàng dọc để không bao giờ bị cắt chữ ngày tháng) -->
              <div class="info-box" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; margin-top: 10px;">
                <div class="meta-text" style="font-size: 13.5px; color: #334155; line-height: 1.5;">
                  <span style="display: inline-block; width: 22px;">📅</span>
                  <span>Ngày: <strong>${item.eventDateFormatted}</strong></span>
                </div>
                <div class="meta-text" style="font-size: 13.5px; color: #334155; line-height: 1.5; margin-top: 4px;">
                  <span style="display: inline-block; width: 22px;">👥</span>
                  <span>Nhóm: <strong style="color: #6366f1;">${item.groupName || "Khác"}</strong></span>
                </div>
              </div>

              <!-- Ghi chú & Quà tặng nếu có -->
              ${noteHtml}
              ${giftHtml}

              <!-- Nút liên kết xem trên Lịch -->
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e2e8f0; text-align: center;">
                <a href="${appUrl}/calendar" target="_blank" style="display: inline-block; background: #f5f3ff; color: #6366f1; border: 1px solid #ddd6fe; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 9999px; text-decoration: none;">
                  📅 Xem trên Lịch & Viết nhật ký →
                </a>
              </div>
            </td>
          </tr>
        </table>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Nhắc Sinh Nhật & Sự Kiện</title>
  <style>
    /* Reset & Fonts */
    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    table {
      border-spacing: 0;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    /* Mobile Responsive Optimizations */
    @media only screen and (max-width: 600px) {
      .email-shell {
        padding: 10px 6px !important;
      }
      .email-container {
        border-radius: 16px !important;
      }
      .hero-padding {
        padding: 24px 16px !important;
      }
      .content-padding {
        padding: 16px 12px !important;
      }
      .cta-button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 14px 18px !important;
      }
      .hero-title {
        font-size: 19px !important;
      }
    }

    /* Dark Mode Protections (iOS Mail, Apple Mail, Gmail) */
    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #1a1a24 !important;
        border-color: #2e2e3d !important;
      }
      .card-box {
        background-color: #222230 !important;
        border-color: #333346 !important;
      }
      .info-box {
        background-color: #171720 !important;
        border-color: #2d2d3e !important;
      }
      .card-title {
        color: #ffffff !important;
      }
      .meta-text {
        color: #cbd5e1 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #334155; line-height: 1.5;">
  <!-- Vỏ bọc toàn màn hình -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" class="email-shell" style="padding: 28px 10px;">
        
        <!-- Khung nội dung chính (Max-width 560px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Thanh Thương Hiệu Gọn Gàng Trên Cùng -->
          <tr>
            <td style="background-color: #312e81; padding: 8px 16px; text-align: center;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #a5b4fc; white-space: nowrap;">
                ✨ BER • NHẮC SINH NHẬT & SỰ KIỆN
              </span>
            </td>
          </tr>

          <!-- Banner Hero Gradient Rực Rỡ -->
          <tr>
            <td class="hero-padding" style="padding: 30px 22px; background: linear-gradient(135deg, #4338ca 0%, #6366f1 40%, #8b5cf6 75%, #ec4899 100%); text-align: center; color: #ffffff;">
              <!-- Biểu tượng tròn 48px chuẩn hình tròn (không bao giờ biến dạng thành hình oval) -->
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.4); border-radius: 50%; font-size: 24px; text-align: center; margin: 0 auto 10px auto; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);">
                ${heroEmoji}
              </div>
              <h1 class="hero-title" style="margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff !important; line-height: 1.35; text-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                Nhắc Nhở Sự Kiện Quan Trọng
              </h1>
              <div style="margin-top: 8px;">
                <span style="display: inline-block; background: rgba(255, 255, 255, 0.22); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 9999px; padding: 4px 14px; font-size: 13px; font-weight: 600; color: #ffffff !important;">
                  ${headline}
                </span>
              </div>
            </td>
          </tr>

          <!-- Thân Email -->
          <tr>
            <td class="content-padding" style="padding: 24px 20px;">
              <!-- Lời chào cá nhân -->
              <div style="margin-bottom: 18px;">
                <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
                  Xin chào ${userName} 👋,
                </p>
                <p style="margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5;">
                  Hôm nay hệ thống ghi nhận sự kiện đặc biệt dành cho bạn. Đừng quên gửi gắm những lời chúc ấm áp nhé!
                </p>
              </div>

              <!-- Danh sách Sự Kiện -->
              ${itemsHtml}

              <!-- Nút Kêu Gọi Hành Động (CTA Button) Cân Đối & Bấm Cực Nhạy Trên Mobile -->
              <div style="text-align: center; margin-top: 24px; margin-bottom: 12px;">
                <a href="${appUrl}/dashboard" target="_blank" class="cta-button" style="display: inline-block; width: 100%; max-width: 280px; box-sizing: border-box; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14.5px; padding: 13px 22px; border-radius: 9999px; box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35); letter-spacing: 0.2px; text-align: center;">
                  🚀 Mở Ứng Dụng BER →
                </a>
              </div>

              <!-- Gợi ý viết nhật ký nhỏ gọn -->
              <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px 14px; text-align: center; font-size: 12.5px; color: #64748b; margin-top: 12px;">
                💡 <strong>Mẹo:</strong> Bạn có thể mở <a href="${appUrl}/calendar" target="_blank" rel="noopener noreferrer" style="color: #6366f1; font-weight: 700; text-decoration: underline;">Lịch</a> để lưu lại những dòng <strong>Nhật ký kỷ niệm</strong> đáng nhớ sau sự kiện!
              </div>
            </td>
          </tr>

          <!-- Footer Tinh Tế -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 16px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11.5px; color: #94a3b8; line-height: 1.6;">
              <p style="margin: 0 0 6px 0;">
                Bạn nhận được thông báo này vì đã bật chế độ nhắc sự kiện tại <strong style="color: #64748b;">Nhắc Sinh Nhật & Sự Kiện (BER)</strong>.
              </p>
              <p style="margin: 0;">
                <a href="${appUrl}/settings" target="_blank" rel="noopener noreferrer" style="color: #6366f1; text-decoration: none; font-weight: 600;">Cài đặt thông báo</a> &nbsp;•&nbsp; 
                <a href="${appUrl}/events" target="_blank" rel="noopener noreferrer" style="color: #6366f1; text-decoration: none; font-weight: 600;">Quản lý sự kiện</a> &nbsp;•&nbsp; 
                <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="color: #94a3b8; text-decoration: underline;">Hủy nhận email</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
