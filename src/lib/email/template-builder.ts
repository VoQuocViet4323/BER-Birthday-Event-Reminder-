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

/**
 * Font chữ hiện đại, sắc nét và tối ưu hiển thị tiếng Việt trên mọi thiết bị & ứng dụng mail
 */
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

/**
 * Tạo tiêu đề thư (Email Subject) theo đúng định dạng: "[Nhắc nhở]: + (tên sự kiện)"
 */
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
  theme?: "light" | "dark" | "auto";
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

  const isDark = params.theme === "dark";
  const isLight = params.theme === "light";
  const isAuto = !isDark && !isLight;

  // Bảng màu thích ứng chuẩn cho cả 2 nền Sáng & Tối
  const colors = isDark
    ? {
        bodyBg: "#0b0f19",
        containerBg: "#171e2e",
        containerBorder: "#2a364f",
        cardBg: "#1f293d",
        cardBorder: "#33415c",
        cardHeaderBg: "#27344d",
        cardHeaderBorder: "#33415c",
        eventTitle: "#ffffff",
        label: "#cbd5e1", // Nhãn xám bạc sáng rõ ràng trên nền tối
        timeText: "#60a5fa",
        timeSub: "#94a3b8",
        statusToday: "#f87171",
        statusTomorrow: "#fbbf24",
        statusOther: "#e2e8f0",
        groupText: "#a5b4fc",
        actionLink: "#818cf8",
        noteBg: "#3b1e08",
        noteBorder: "#d97706",
        noteText: "#fef3c7",
        giftBg: "#4a0428",
        giftBorder: "#f43f5e",
        giftText: "#fce7f3",
        headlineBg: "#2e236b",
        headlineColor: "#e0e7ff",
        headlineBorder: "#4338ca",
        footerBg: "#141a27",
        footerBorder: "#2a364f",
        footerText: "#94a3b8",
        footerLink: "#818cf8",
        signBorder: "#2a364f",
        signText: "#94a3b8",
        signTitle: "#ffffff",
        signBrand: "#818cf8",
      }
    : {
        bodyBg: "#f1f5f9",
        containerBg: "#ffffff",
        containerBorder: "#e2e8f0",
        cardBg: "#ffffff",
        cardBorder: "#e2e8f0",
        cardHeaderBg: "#f8fafc",
        cardHeaderBorder: "#e2e8f0",
        eventTitle: "#0f172a",
        label: "#475569", // Nhãn xám slate-600 đậm, tương phản cao trên nền sáng
        timeText: "#2563eb",
        timeSub: "#64748b",
        statusToday: "#dc2626",
        statusTomorrow: "#d97706",
        statusOther: "#334155",
        groupText: "#4338ca",
        actionLink: "#4f46e5",
        noteBg: "#fef3c7",
        noteBorder: "#f59e0b",
        noteText: "#92400e",
        giftBg: "#fdf2f8",
        giftBorder: "#ec4899",
        giftText: "#9d174d",
        headlineBg: "#eef2ff",
        headlineColor: "#4338ca",
        headlineBorder: "#c7d2fe",
        footerBg: "#f8fafc",
        footerBorder: "#e2e8f0",
        footerText: "#64748b",
        footerLink: "#4f46e5",
        signBorder: "#e2e8f0",
        signText: "#64748b",
        signTitle: "#0f172a",
        signBrand: "#4f46e5",
      };

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

  // Khối danh sách các sự kiện
  const itemsHtml = items
    .map((item, index) => {
      // 1. Phân loại sự kiện
      let typeLabel = "Sự kiện";
      let typeIcon = "🌟";
      let badgeBg = isDark ? "#1e293b" : "#eff6ff";
      let badgeColor = isDark ? "#93c5fd" : "#1d4ed8";
      let badgeBorder = isDark ? "#3b82f6" : "#bfdbfe";

      if (item.eventType === "birthday") {
        typeLabel = "Sinh nhật";
        typeIcon = "🎂";
        badgeBg = isDark ? "#2e1065" : "#f5f3ff";
        badgeColor = isDark ? "#c4b5fd" : "#6d28d9";
        badgeBorder = isDark ? "#7c3aed" : "#ddd6fe";
      } else if (item.eventType === "anniversary") {
        typeLabel = "Kỷ niệm";
        typeIcon = "💍";
        badgeBg = isDark ? "#500724" : "#fdf2f8";
        badgeColor = isDark ? "#fbcfe8" : "#be185d";
        badgeBorder = isDark ? "#db2777" : "#fbcfe8";
      } else if (item.eventType === "memorial") {
        typeLabel = "Ngày giỗ";
        typeIcon = "🕯️";
        badgeBg = isDark ? "#1e293b" : "#f8fafc";
        badgeColor = isDark ? "#cbd5e1" : "#334155";
        badgeBorder = isDark ? "#475569" : "#cbd5e1";
      }

      // 2. Mốc thời gian & trạng thái
      let countdownBadge = "";
      let statusDetail = "";
      if (item.daysRemaining === 0) {
        countdownBadge = `
          <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; background: #dc2626; color: #ffffff !important; font-weight: 700; font-size: 11.5px; padding: 3px 9px; border-radius: 9999px;">
            🎉 Hôm nay
          </span>
        `;
        statusDetail = `<strong class="status-today" style="color: ${colors.statusToday}; font-size: 13.5px;">Đang diễn ra hôm nay</strong>`;
      } else if (item.daysRemaining === 1) {
        countdownBadge = `
          <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; background: #d97706; color: #ffffff !important; font-weight: 700; font-size: 11.5px; padding: 3px 9px; border-radius: 9999px;">
            ⏳ Ngày mai
          </span>
        `;
        statusDetail = `<strong class="status-tomorrow" style="color: ${colors.statusTomorrow}; font-size: 13.5px;">Ngày mai (còn 1 ngày)</strong>`;
      } else {
        countdownBadge = `
          <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; background: ${isDark ? "#312e81" : "#e0e7ff"}; color: ${isDark ? "#c7d2fe" : "#3730a3"}; font-weight: 700; font-size: 11.5px; padding: 3px 9px; border-radius: 9999px; border: 1px solid ${isDark ? "#4338ca" : "#c7d2fe"};">
            ⏳ Còn ${item.daysRemaining} ngày
          </span>
        `;
        statusDetail = `<strong class="status-other" style="color: ${colors.statusOther}; font-size: 13.5px;">Còn ${item.daysRemaining} ngày</strong>`;
      }

      // Huy hiệu Âm lịch & Tuổi
      const lunarBadge = item.isLunar
        ? `<span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; font-size: 10.5px; font-weight: 700; background: ${isDark ? "#451a03" : "#fef3c7"}; color: ${isDark ? "#fde68a" : "#b45309"}; border: 1px solid ${isDark ? "#92400e" : "#fde68a"}; padding: 1px 6px; border-radius: 9999px; margin-left: 4px; vertical-align: middle;">Âm lịch</span>`
        : "";

      const ageBadge = item.upcomingAge
        ? `<span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; white-space: nowrap; font-size: 11.5px; font-weight: 700; background: ${isDark ? "#500724" : "#fdf2f8"}; color: ${isDark ? "#fbcfe8" : "#be185d"}; border: 1px solid ${isDark ? "#9d174d" : "#fbcfe8"}; padding: 2px 7px; border-radius: 9999px; margin-left: 6px; vertical-align: middle;">🎂 ${item.upcomingAge} tuổi</span>`
        : "";

      return `
        <!-- Khối phiếu sự kiện #${index + 1} -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-box" style="margin-bottom: 16px; background-color: ${colors.cardBg}; border: 1px solid ${colors.cardBorder}; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04); font-family: ${EMAIL_FONT_STACK};">
          <!-- Tiêu đề sự kiện (Header của phiếu) -->
          <tr>
            <td class="card-header" style="padding: 12px 14px; background-color: ${colors.cardHeaderBg}; border-bottom: 1px solid ${colors.cardHeaderBorder}; font-family: ${EMAIL_FONT_STACK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle; font-family: ${EMAIL_FONT_STACK};">
                    <span class="event-title" style="font-family: ${EMAIL_FONT_STACK}; font-size: 16px; font-weight: 800; color: ${colors.eventTitle}; letter-spacing: -0.2px;">
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

          <!-- Bảng chi tiết: Cột nhãn luôn có màu sắc tương phản cao rõ nét -->
          <tr>
            <td style="padding: 12px 14px; font-family: ${EMAIL_FONT_STACK};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family: ${EMAIL_FONT_STACK}; font-size: 13.5px; line-height: 1.55;">
                
                <!-- Hàng: Thời gian diễn ra -->
                <tr>
                  <td class="label-text" style="width: 95px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: ${colors.label}; vertical-align: middle; white-space: nowrap;">
                    • Thời gian:
                  </td>
                  <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; vertical-align: middle;">
                    <strong class="time-text" style="color: ${colors.timeText}; font-size: 14px;">${item.eventDateFormatted}</strong>
                    <span class="time-sub" style="color: ${colors.timeSub}; font-size: 12px;"> (${item.isLunar ? "Lịch Âm" : "Lịch Dương"})</span>
                  </td>
                </tr>

                <!-- Hàng: Trạng thái đếm ngược -->
                <tr>
                  <td class="label-text" style="width: 95px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: ${colors.label}; vertical-align: middle; white-space: nowrap;">
                    • Trạng thái:
                  </td>
                  <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; vertical-align: middle;">
                    ${statusDetail}
                  </td>
                </tr>

                <!-- Hàng: Loại sự kiện -->
                <tr>
                  <td class="label-text" style="width: 95px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: ${colors.label}; vertical-align: middle; white-space: nowrap;">
                    • Loại sự kiện:
                  </td>
                  <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; vertical-align: middle;">
                    <span style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; font-size: 12px; font-weight: 700; color: ${badgeColor}; background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 1px 7px; border-radius: 6px;">
                      ${typeIcon} ${typeLabel}
                    </span>
                    ${lunarBadge}
                  </td>
                </tr>

                <!-- Hàng: Nhóm liên quan -->
                <tr>
                  <td class="label-text" style="width: 95px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: ${colors.label}; vertical-align: middle; white-space: nowrap;">
                    • Nhóm:
                  </td>
                  <td class="group-text" style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; color: ${colors.groupText}; font-weight: 700; vertical-align: middle;">
                    ${item.groupName || "Chung"}
                  </td>
                </tr>

                <!-- Hàng: Ghi chú (nếu có) -->
                ${
                  item.note
                    ? `
                  <tr>
                    <td class="label-text" style="width: 95px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: ${colors.label}; vertical-align: top; white-space: nowrap;">
                      • Ghi chú:
                    </td>
                    <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; vertical-align: top;">
                      <span class="note-box" style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; background: ${colors.noteBg}; border-left: 3px solid ${colors.noteBorder}; color: ${colors.noteText}; padding: 3px 8px; border-radius: 0 6px 6px 0; font-size: 12.5px; font-weight: 600;">
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
                    <td class="label-text" style="width: 95px; padding: 6px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: ${colors.label}; vertical-align: top; white-space: nowrap;">
                      • Gợi ý:
                    </td>
                    <td style="padding: 6px 0 6px 6px; font-family: ${EMAIL_FONT_STACK}; vertical-align: top;">
                      <span class="gift-box" style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; background: ${colors.giftBg}; border-left: 3px solid ${colors.giftBorder}; color: ${colors.giftText}; padding: 3px 8px; border-radius: 0 6px 6px 0; font-size: 12.5px; font-weight: 600;">
                        🎁 ${item.giftIdea}
                      </span>
                    </td>
                  </tr>
                `
                    : ""
                }

                <!-- Hàng: Thao tác nhanh -->
                <tr>
                  <td class="label-text" style="width: 95px; padding: 8px 0 2px 0; font-family: ${EMAIL_FONT_STACK}; font-weight: 700; color: ${colors.label}; vertical-align: middle; white-space: nowrap;">
                    • Thao tác:
                  </td>
                  <td style="padding: 8px 0 2px 6px; font-family: ${EMAIL_FONT_STACK}; vertical-align: middle;">
                    <a href="${appUrl}/calendar" target="_blank" class="action-link" style="font-family: ${EMAIL_FONT_STACK}; color: ${colors.actionLink}; font-weight: 700; text-decoration: underline; font-size: 12.5px;">
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

  // Style CSS cho Dark Mode thích ứng
  const autoDarkModeCss = isAuto
    ? `
    @media (prefers-color-scheme: dark) {
      body, .body-bg {
        background-color: #0b0f19 !important;
        color: #f1f5f9 !important;
      }
      .email-container {
        background-color: #171e2e !important;
        border-color: #2a364f !important;
      }
      .card-box {
        background-color: #1f293d !important;
        border-color: #33415c !important;
      }
      .card-header {
        background-color: #27344d !important;
        border-bottom-color: #33415c !important;
      }
      .event-title {
        color: #ffffff !important;
      }
      .label-text {
        color: #cbd5e1 !important;
      }
      .time-text {
        color: #60a5fa !important;
      }
      .time-sub {
        color: #94a3b8 !important;
      }
      .group-text {
        color: #a5b4fc !important;
      }
      .status-today {
        color: #f87171 !important;
      }
      .status-tomorrow {
        color: #fbbf24 !important;
      }
      .status-other {
        color: #e2e8f0 !important;
      }
      .action-link {
        color: #818cf8 !important;
      }
      .note-box {
        background-color: #3b1e08 !important;
        border-left-color: #d97706 !important;
        color: #fef3c7 !important;
      }
      .gift-box {
        background-color: #4a0428 !important;
        border-left-color: #f43f5e !important;
        color: #fce7f3 !important;
      }
      .headline-pill {
        background-color: #2e236b !important;
        color: #e0e7ff !important;
        border-color: #4338ca !important;
      }
      .footer-cell {
        background-color: #141a27 !important;
        border-top-color: #2a364f !important;
        color: #94a3b8 !important;
      }
      .footer-sub {
        color: #94a3b8 !important;
      }
      .footer-link {
        color: #818cf8 !important;
      }
      .sign-box {
        border-top-color: #2a364f !important;
        color: #94a3b8 !important;
      }
      .sign-title {
        color: #ffffff !important;
      }
      .sign-brand {
        color: #818cf8 !important;
      }
    }
  `
    : "";

  const colorSchemeMeta = isDark
    ? '<meta name="color-scheme" content="dark">'
    : isLight
    ? '<meta name="color-scheme" content="light">'
    : '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${colorSchemeMeta}
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
      background-color: ${colors.bodyBg};
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

    ${autoDarkModeCss}
  </style>
</head>
<body class="body-bg" style="margin: 0; padding: 0; background-color: ${colors.bodyBg}; color: ${colors.label}; line-height: 1.55; font-family: ${EMAIL_FONT_STACK}; -webkit-font-smoothing: antialiased;">

  <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: ${EMAIL_FONT_STACK};">
    ${preheaderText}
  </div>
  <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="body-bg" style="background-color: ${colors.bodyBg}; font-family: ${EMAIL_FONT_STACK};">
    <tr>
      <td align="center" class="email-shell" style="padding: 16px 8px; font-family: ${EMAIL_FONT_STACK};">
        
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 520px; background-color: ${colors.containerBg}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05); border: 1px solid ${colors.containerBorder}; font-family: ${EMAIL_FONT_STACK};">
          
          <!-- Header tinh giản -->
          <tr>
            <td style="padding: 20px 16px 12px 16px; text-align: center; font-family: ${EMAIL_FONT_STACK};">
              <div>
                <span class="headline-pill" style="font-family: ${EMAIL_FONT_STACK}; display: inline-block; background: ${colors.headlineBg}; color: ${colors.headlineColor}; border: 1px solid ${colors.headlineBorder}; font-size: 11.5px; font-weight: 700; padding: 3px 12px; border-radius: 9999px;">
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
              <div class="sign-box" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid ${colors.signBorder}; font-size: 13px; color: ${colors.signText}; line-height: 1.5; font-family: ${EMAIL_FONT_STACK};">
                <p style="margin: 0 0 4px 0; font-family: ${EMAIL_FONT_STACK};">
                  Chúc bạn có một ngày làm việc thuận lợi và chuẩn bị cho sự kiện thật chu đáo!
                </p>
                <p style="margin: 0; font-weight: 700; color: ${colors.signTitle}; font-family: ${EMAIL_FONT_STACK};">
                  Trân trọng,<br>
                  <span class="sign-brand" style="color: ${colors.signBrand}; font-size: 12.5px; font-family: ${EMAIL_FONT_STACK};">Ban Quản trị Hệ thống Nhắc Sự Kiện (BER)</span>
                </p>
              </div>

            </td>
          </tr>

          <!-- Chân trang thư (Footer) -->
          <tr>
            <td class="footer-cell" style="background-color: ${colors.footerBg}; padding: 14px 16px; text-align: center; border-top: 1px solid ${colors.footerBorder}; font-size: 11px; color: ${colors.footerText}; line-height: 1.5; font-family: ${EMAIL_FONT_STACK};">
              <p class="footer-sub" style="margin: 0 0 4px 0; font-family: ${EMAIL_FONT_STACK}; color: ${colors.footerText};">
                Thư này được gửi tự động theo cấu hình thông báo tại tài khoản của bạn tại <strong>Nhắc Sinh Nhật & Sự Kiện (BER)</strong>.
              </p>
              <p style="margin: 0; font-family: ${EMAIL_FONT_STACK};">
                <a href="${appUrl}/events" target="_blank" rel="noopener noreferrer" class="footer-link" style="font-family: ${EMAIL_FONT_STACK}; color: ${colors.footerLink}; text-decoration: none; font-weight: 600;">Quản lý sự kiện</a> &nbsp;•&nbsp; 
                <a href="${appUrl}/settings" target="_blank" rel="noopener noreferrer" class="footer-link" style="font-family: ${EMAIL_FONT_STACK}; color: ${colors.footerLink}; text-decoration: none; font-weight: 600;">Cài đặt thông báo</a> &nbsp;•&nbsp; 
                <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="font-family: ${EMAIL_FONT_STACK}; color: #94a3b8; text-decoration: underline;">Hủy nhận email</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
