// ==============================================================================
// EMAIL TEMPLATE BUILDER: GIAO DIỆN THƯ THÔNG BÁO CHUẨN MỰC, TINH GỌN & TỐI ƯU TOÀN DIỆN CHO MOBILE
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

export const EMAIL_FONT_STACK =
  "'Be Vietnam Pro', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

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

export function formatReminderSubject(items: ReminderItem[]): string {
  if (!items || items.length === 0) {
    return "[Nhắc nhở]: Sự kiện";
  }
  const eventNames = items.map((i) => i.name).join(", ");
  return `[Nhắc nhở]: ${eventNames}`;
}

export function generateReminderEmailHtml(params: {
  userName?: string;
  items: ReminderItem[];
  appUrl?: string;
  unsubscribeUrl?: string;
}): string {
  const { items } = params;
  const appUrl = resolveProductionAppUrl(params.appUrl);
  const unsubscribeUrl =
    params.unsubscribeUrl &&
    !params.unsubscribeUrl.includes("localhost") &&
    !params.unsubscribeUrl.includes("127.0.0.1") &&
    !params.unsubscribeUrl.includes("ber-reminder.vercel.app")
      ? params.unsubscribeUrl
      : `${appUrl}/settings`;

  const hasToday = items.some((i) => i.daysRemaining === 0);
  const headline = hasToday
    ? "🎉 Hôm nay có sự kiện đặc biệt!"
    : items.length === 1
    ? "⏳ Sự kiện sắp diễn ra"
    : `⏳ ${items.length} sự kiện sắp diễn ra`;

  const firstItem = items[0];
  const timeDesc = firstItem
    ? firstItem.daysRemaining === 0
      ? "Hôm nay"
      : firstItem.daysRemaining === 1
      ? "Ngày mai"
      : `còn ${firstItem.daysRemaining} ngày`
    : "";
  const preheaderText = firstItem
    ? `Sự kiện: ${firstItem.name} • ${timeDesc} (${firstItem.eventDateFormatted})${items.length > 1 ? ` và ${items.length - 1} sự kiện khác` : ""}. Nhấn xem chi tiết.`
    : "Thông báo nhắc nhở sự kiện từ Hệ thống BER.";

  const itemsHtml = items
    .map((item, index) => {
      let typeLabel = "Sự kiện";
      let typeIcon = "🌟";
      let badgeBg = "#eff6ff";
      let badgeColor = "#1d4ed8";
      let badgeBorder = "#bfdbfe";

      if (item.eventType === "birthday") {
        typeLabel = "Sinh nhật";
        typeIcon = "🎂";
        badgeBg = "#f5f3ff";
        badgeColor = "#6d28d9";
        badgeBorder = "#ddd6fe";
      } else if (item.eventType === "anniversary") {
        typeLabel = "Kỷ niệm";
        typeIcon = "💍";
        badgeBg = "#fdf2f8";
        badgeColor = "#be185d";
        badgeBorder = "#fbcfe8";
      } else if (item.eventType === "memorial") {
        typeLabel = "Ngày giỗ";
        typeIcon = "🕯️";
        badgeBg = "#f8fafc";
        badgeColor = "#334155";
        badgeBorder = "#cbd5e1";
      }

      let countdownBadge = "";
      let statusDetail = "";
      if (item.daysRemaining === 0) {
        countdownBadge = `
          <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; background: #dc2626; color: #ffffff !important; font-weight: 700; font-size: 11.5px; padding: 3px 9px; border-radius: 9999px;">
            🎉 Hôm nay
          </span>
        `;
        statusDetail = "<strong style=\"color: #dc2626;\">Đang diễn ra hôm nay</strong>";
      } else if (item.daysRemaining === 1) {
        countdownBadge = `
          <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; background: #d97706; color: #ffffff !important; font-weight: 700; font-size: 11.5px; padding: 3px 9px; border-radius: 9999px;">
            ⏳ Ngày mai
          </span>
        `;
        statusDetail = "<strong style=\"color: #d97706;\">Ngày mai (còn 1 ngày)</strong>";
      } else {
        countdownBadge = `
          <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; background: #e0e7ff; color: #3730a3; font-weight: 700; font-size: 11.5px; padding: 3px 9px; border-radius: 9999px; border: 1px solid #c7d2fe;">
            ⏳ Còn ${item.daysRemaining} ngày
          </span>
        `;
        statusDetail = `<strong>Còn ${item.daysRemaining} ngày</strong>`;
      }

      const lunarBadge = item.isLunar
        ? `<span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; font-size: 10.5px; font-weight: 700; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 1px 6px; border-radius: 9999px; margin-left: 4px; vertical-align: middle;">Âm lịch</span>`
        : "";

      const ageBadge = item.upcomingAge
        ? `<span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; font-size: 11.5px; font-weight: 700; background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; padding: 2px 7px; border-radius: 9999px; margin-left: 6px; vertical-align: middle;">🎂 ${item.upcomingAge} tuổi</span>`
        : "";

      return `
        <!-- Khối phiếu sự kiện #${index + 1} -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-box" style="margin-bottom: 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04); font-family: ${EMAIL_FONT_STACK};">
          <!-- Tiêu đề sự kiện (Header của phiếu) -->
          <tr>
            <td style="padding: 12px 14px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-family: ${EMAIL_FONT_STACK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle; font-family: ${EMAIL_FONT_STACK};">
                    <span style="font-family: ${EMAIL_FONT_STACK}; font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">
                      📌 ${item.name}
                    </span>
                    ${ageBadge}
                  </td>
                  <td align="right" style="vertical-align: middle; white-space: nowrap; padding-left: 8px; font-family: ${EMAIL_FONT_STACK};">
                    ${countdownBadge}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bảng chi tiết căn chỉnh thoáng đãng, nhãn gọn 90px để cột giá trị không bị ép dòng trên mobile -->
          <tr>
            <td style="padding: 10px 14px; font-family: ${EMAIL_FONT_STACK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family: ${EMAIL_FONT_STACK}; font-size: 13.5px; line-height: 1.55;">
                
                <!-- Hàng: Thời gian diễn ra -->
                <tr>
                  <td style="width: 90px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: #1e293b; vertical-align: middle; white-space: nowrap;">
                    • Thời gian:
                  </td>
                  <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; color: #1e293b; vertical-align: middle;">
                    <strong style="color: #2563eb; font-size: 14px;">${item.eventDateFormatted}</strong>
                    <span style="color: #64748b; font-size: 12px;"> (${item.isLunar ? "Lịch Âm" : "Lịch Dương"})</span>
                  </td>
                </tr>

                <!-- Hàng: Trạng thái đếm ngược -->
                <tr>
                  <td style="width: 90px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: #1e293b; vertical-align: middle; white-space: nowrap;">
                    • Trạng thái:
                  </td>
                  <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; color: #334155; vertical-align: middle;">
                    ${statusDetail}
                  </td>
                </tr>

                <!-- Hàng: Loại sự kiện -->
                <tr>
                  <td style="width: 90px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: #1e293b; vertical-align: middle; white-space: nowrap;">
                    • Loại sự kiện:
                  </td>
                  <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; color: #334155; vertical-align: middle;">
                    <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; font-size: 12px; font-weight: 700; color: ${badgeColor}; background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 1px 7px; border-radius: 6px;">
                      ${typeIcon} ${typeLabel}
                    </span>
                    ${lunarBadge}
                  </td>
                </tr>

                <!-- Hàng: Nhóm liên quan -->
                <tr>
                  <td style="width: 90px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: #1e293b; vertical-align: middle; white-space: nowrap;">
                    • Nhóm:
                  </td>
                  <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; color: #4338ca; font-weight: 700; vertical-align: middle;">
                    ${item.groupName || "Chung"}
                  </td>
                </tr>

                <!-- Hàng: Ghi chú (nếu có) -->
                ${
                  item.note
                    ? `
                  <tr>
                    <td style="width: 90px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: #1e293b; vertical-align: top; white-space: nowrap;">
                      • Ghi chú:
                    </td>
                    <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; color: #92400e; vertical-align: top;">
                      <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; background: #fef3c7; border-left: 3px solid #f59e0b; padding: 3px 8px; border-radius: 0 6px 6px 0; font-size: 12.5px; font-weight: 600;">
                        ${item.note}
                      </span>
                    </td>
                  </tr>
                `
                    : ""
                }

                <!-- Hàng: Gợi ý quà tặng / chuẩn bị (nếu có) -->
                ${
                  item.giftIdea
                    ? `
                  <tr>
                    <td style="width: 90px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: #1e293b; vertical-align: top; white-space: nowrap;">
                      • Gợi ý:
                    </td>
                    <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; color: #9d174d; vertical-align: top;">
                      <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; background: #fdf2f8; border-left: 3px solid #ec4899; padding: 3px 8px; border-radius: 0 6px 6px 0; font-size: 12.5px; font-weight: 600;">
                        🎁 ${item.giftIdea}
                      </span>
                    </td>
                  </tr>
                `
                    : ""
                }

                <!-- Hàng: Thao tác nhanh -->
                <tr>
                  <td style="width: 90px; padding: 8px 0 2px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: #1e293b; vertical-align: middle; white-space: nowrap;">
                    • Thao tác:
                  </td>
                  <td style="padding: 8px 0 2px 6px; font-family: ${EMAIL_FONT_STACK}; vertical-align: middle;">
                    <a href="${appUrl}/calendar" target="_blank" style="font-family: ${EMAIL_FONT_STACK}; color: #4f46e5; font-weight: 700; text-decoration: underline; font-size: 12.5px;">
                      📅 Xem trên Lịch & Viết nhật ký →
                    </a>
                  </td>
                </tr>

              </table>
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
  <title>Nhắc Nhở Sự Kiện - BER</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    * {
      font-family: 'Be Vietnam Pro', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }

    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #f1f5f9;
      font-family: 'Be Vietnam Pro', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-spacing: 0;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      font-family: 'Be Vietnam Pro', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    @media only screen and (max-width: 600px) {
      .email-shell {
        padding: 8px 4px !important;
      }
      .email-container {
        border-radius: 12px !important;
        border: none !important;
      }
      .content-padding {
        padding: 10px 10px 16px 10px !important;
      }
      .cta-button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 12px 16px !important;
      }
    }

    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #1a1a24 !important;
        border-color: #2e2e3d !important;
      }
      .card-box {
        background-color: #222230 !important;
        border-color: #333346 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #334155; line-height: 1.55; font-family: ${EMAIL_FONT_STACK}; -webkit-font-smoothing: antialiased;">

  <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: ${EMAIL_FONT_STACK};">
    ${preheaderText}
  </div>
  <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; font-family: ${EMAIL_FONT_STACK};">
    <tr>
      <td align="center" class="email-shell" style="padding: 16px 8px; font-family: ${EMAIL_FONT_STACK};">
        
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05); border: 1px solid #e2e8f0; font-family: ${EMAIL_FONT_STACK};">
          
          <!-- Header tinh giản, đồng nhất màu nền, không bao giờ bị vỡ dòng trên điện thoại -->
          <tr>
            <td style="padding: 20px 16px 12px 16px; text-align: center; font-family: ${EMAIL_FONT_STACK};">
              <div style="margin-bottom: 6px;">
                <span style="font-family: ${EMAIL_FONT_STACK}; font-size: 11px; font-weight: 800; color: #4f46e5; letter-spacing: 0.8px; text-transform: uppercase;">
                  🎂 BER • NHẮC SỰ KIỆN
                </span>
              </div>
              <h1 class="header-title" style="margin: 0 0 8px 0; font-family: ${EMAIL_FONT_STACK}; font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">
                Nhắc Nhở Sự Kiện
              </h1>
              <div>
                <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; font-size: 11.5px; font-weight: 700; padding: 3px 12px; border-radius: 9999px;">
                  ${headline}
                </span>
              </div>
            </td>
          </tr>

          <!-- Thân thư chính -->
          <tr>
            <td class="content-padding" style="padding: 6px 16px 18px 16px; font-family: ${EMAIL_FONT_STACK};">

              <!-- Danh sách các sự kiện -->
              ${itemsHtml}

              <!-- Nút kêu gọi hành động -->
              <div style="text-align: center; margin: 18px 0 14px 0;">
                <a href="${appUrl}/dashboard" target="_blank" class="cta-button" style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; width: 100%; max-width: 240px; box-sizing: border-box; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13.5px; padding: 11px 20px; border-radius: 8px; box-shadow: 0 3px 10px rgba(79, 70, 229, 0.25); text-align: center; letter-spacing: 0.2px;">
                  🚀 Mở Ứng Dụng BER →
                </a>
              </div>

              <!-- Lời kết & Chữ ký trang trọng -->
              <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.5; font-family: ${EMAIL_FONT_STACK};">
                <p style="margin: 0 0 4px 0; font-family: ${EMAIL_FONT_STACK};">
                  Chúc bạn có một ngày làm việc thuận lợi và chuẩn bị cho sự kiện thật chu đáo!
                </p>
                <p style="margin: 0; font-weight: 700; color: #0f172a; font-family: ${EMAIL_FONT_STACK};">
                  Trân trọng,<br>
                  <span style="color: #4f46e5; font-size: 12.5px; font-family: ${EMAIL_FONT_STACK};">Ban Quản trị Hệ thống Nhắc Sự Kiện (BER)</span>
                </p>
              </div>

            </td>
          </tr>

          <!-- Chân trang thư (Footer) -->
          <tr>
            <td style="background-color: #f8fafc; padding: 14px 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.5; font-family: ${EMAIL_FONT_STACK};">
              <p style="margin: 0 0 4px 0; font-family: ${EMAIL_FONT_STACK};">
                Thư này được gửi tự động theo cấu hình thông báo tại tài khoản của bạn tại <strong style="color: #64748b;">Nhắc Sinh Nhật & Sự Kiện (BER)</strong>.
              </p>
              <p style="margin: 0; font-family: ${EMAIL_FONT_STACK};">
                <a href="${appUrl}/events" target="_blank" rel="noopener noreferrer" style="font-family: ${EMAIL_FONT_STACK}; color: #4f46e5; text-decoration: none; font-weight: 600;">Quản lý sự kiện</a> &nbsp;•&nbsp; 
                <a href="${appUrl}/settings" target="_blank" rel="noopener noreferrer" style="font-family: ${EMAIL_FONT_STACK}; color: #4f46e5; text-decoration: none; font-weight: 600;">Cài đặt thông báo</a> &nbsp;•&nbsp; 
                <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="font-family: ${EMAIL_FONT_STACK}; color: #94a3b8; text-decoration: underline;">Hủy nhận email</a>
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
