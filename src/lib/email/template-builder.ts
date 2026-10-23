// ==============================================================================
// EMAIL TEMPLATE BUILDER: GIAO DIỆN EMAIL HTML CHUẨN THƯƠNG HIỆU, ĐỒNG BỘ, RESPONSIVE
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

export function generateReminderEmailHtml(params: {
  userName: string;
  items: ReminderItem[];
  appUrl: string;
  unsubscribeUrl: string;
}): string {
  const { userName, items, appUrl, unsubscribeUrl } = params;

  // Lời tựa
  const hasToday = items.some((i) => i.daysRemaining === 0);
  const headline = hasToday
    ? "Hôm nay có sự kiện đặc biệt!"
    : `Bạn có ${items.length} sự kiện quan trọng sắp diễn ra`;

  const itemsHtml = items
    .map((item) => {
      const typeLabel =
        item.eventType === "birthday"
          ? "🎂 Sinh nhật"
          : item.eventType === "anniversary"
          ? "💍 Kỷ niệm"
          : item.eventType === "memorial"
          ? "🕯️ Ngày giỗ"
          : "🌟 Sự kiện";

      const countdownText =
        item.daysRemaining === 0
          ? "🎉 Đang diễn ra hôm nay!"
          : item.daysRemaining === 1
          ? "⏳ Còn 1 ngày nữa (Ngày mai)"
          : `⏳ Còn ${item.daysRemaining} ngày nữa`;

      const countdownBadgeColor =
        item.daysRemaining === 0
          ? "background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;"
          : item.daysRemaining <= 3
          ? "background: #fef3c7; color: #d97706; border: 1px solid #fcd34d;"
          : "background: #ede9fe; color: #7c3aed; border: 1px solid #ddd6fe;";

      const ageText = item.upcomingAge ? ` (Tuổi: ${item.upcomingAge})` : "";
      const lunarBadge = item.isLunar ? " <span style='font-size: 11px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 9999px; margin-left: 6px;'>Âm lịch</span>" : "";

      const notesSection = item.note || item.giftIdea
        ? `
          <div style="margin-top: 10px; padding: 10px 14px; background: #f8fafc; border-radius: 10px; font-size: 13px; color: #475569; border-left: 3px solid #8b5cf6;">
            ${item.note ? `<div><strong>📝 Ghi chú:</strong> ${item.note}</div>` : ""}
            ${item.giftIdea ? `<div style="margin-top: 4px;"><strong>🎁 Gợi ý quà:</strong> ${item.giftIdea}</div>` : ""}
          </div>
        `
        : "";

      return `
        <div style="background: #ffffff; border: 1px solid #f1f5f9; border-radius: 16px; padding: 18px 20px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #8b5cf6;">
                ${typeLabel} ${lunarBadge}
              </span>
              <h3 style="margin: 4px 0 2px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                ${item.name} ${ageText}
              </h3>
              <p style="margin: 0; font-size: 14px; color: #64748b;">
                📅 Ngày: <strong>${item.eventDateFormatted}</strong> • Nhóm: ${item.groupName}
              </p>
            </div>
            <div style="margin-left: 12px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; ${countdownBadgeColor}">
              ${countdownText}
            </div>
          </div>
          ${notesSection}
        </div>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc Sinh Nhật & Sự Kiện</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Container chính -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Banner Gradient rực rỡ -->
          <tr>
            <td style="padding: 36px 30px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F43F5E 100%); text-align: center; color: #ffffff;">
              <div style="display: inline-block; font-size: 32px; margin-bottom: 8px;">🎂✨</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                Nhắc Nhở Sự Kiện Quan Trọng
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.95; font-weight: 500;">
                ${headline}
              </p>
            </td>
          </tr>

          <!-- Nội dung chính -->
          <tr>
            <td style="padding: 30px 24px;">
              <p style="margin-top: 0; font-size: 15px; color: #475569;">
                Xin chào <strong>${userName}</strong>,
              </p>
              <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">
                Dưới đây là danh sách những ngày ý nghĩa sắp diễn ra. Hãy chuẩn bị những lời chúc ấm áp và món quà bất ngờ nhé!
              </p>

              <!-- Danh sách sự kiện tổng hợp -->
              ${itemsHtml}

              <!-- Nút CTA mở Ứng dụng -->
              <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                <a href="${appUrl}/dashboard" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 9999px; box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35);">
                  Mở Ứng Dụng Xem Chi Tiết →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 8px 0;">
                Bạn nhận được email này vì đã bật thông báo nhắc sự kiện tại <strong>Nhắc Sinh Nhật & Sự Kiện (BER)</strong>.
              </p>
              <p style="margin: 0;">
                <a href="${appUrl}/settings" style="color: #8b5cf6; text-decoration: none;">Cài đặt thông báo</a> • 
                <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">Hủy nhận email nhắc</a>
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
