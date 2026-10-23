// ==============================================================================
// REMINDER ENGINE: TÍNH TOÁN NGÀY SỰ KIỆN TIẾP THEO, XỬ LÝ 29/2, ÂM LỊCH & MÚI GIỜ
// ==============================================================================

export interface EventRecord {
  id: string;
  user_id: string;
  name: string;
  event_type: string;
  event_day: number;
  event_month: number;
  event_year?: number | null;
  is_lunar: boolean;
  group_name: string;
  note?: string | null;
  gift_idea?: string | null;
  remind_days?: number[] | null;
  repeat_yearly: boolean;
  enabled: boolean;
}

export interface UserSettingsRecord {
  user_id: string;
  email_enabled: boolean;
  default_remind_days: number[];
  remind_time: string; // "08:00"
  extra_emails?: string[] | null;
  leap_day_rule: "feb28" | "mar01";
  timezone: string;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Lấy ngày dương lịch cho sự kiện trong một năm cụ thể, xử lý ngày 29/2
 */
export function getSolarOccurrenceForYear(
  day: number,
  month: number,
  year: number,
  leapDayRule: "feb28" | "mar01" = "feb28"
): Date {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    if (leapDayRule === "mar01") {
      return new Date(Date.UTC(year, 2, 1)); // Tháng 3 là index 2 trong JS
    }
    return new Date(Date.UTC(year, 1, 28)); // 28/2
  }

  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Tính ngày diễn ra tiếp theo (Occurrence Date) tính từ ngày hôm nay (theo múi giờ user)
 */
export function getNextOccurrence(
  event: EventRecord,
  today: Date,
  leapDayRule: "feb28" | "mar01" = "feb28"
): Date {
  const currentYear = today.getUTCFullYear();
  let occ = getSolarOccurrenceForYear(event.event_day, event.event_month, currentYear, leapDayRule);

  // So sánh xem ngày này đã qua trong năm nay chưa (bỏ qua phần giờ phút giây)
  const todayZero = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  if (occ < todayZero) {
    // Nếu đã qua năm nay, lần diễn ra kế tiếp là ở năm sau
    occ = getSolarOccurrenceForYear(event.event_day, event.event_month, currentYear + 1, leapDayRule);
  }

  return occ;
}

/**
 * Tính số ngày còn lại giữa ngày hôm nay và ngày sự kiện
 */
export function getDaysDifference(targetDate: Date, today: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const t1 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const t2 = Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate());
  return Math.round((t2 - t1) / msPerDay);
}
