import { convertLunar2Solar, convertSolar2Lunar } from "./lunar/amlich";

export interface EventBase {
  id: string;
  name: string;
  event_type: "birthday" | "anniversary" | "memorial" | "other";
  event_day: number;
  event_month: number;
  event_year?: number | null;
  is_lunar: boolean;
  group_name: "Gia đình" | "Bạn bè" | "Đồng nghiệp" | "Khác";
  note?: string | null;
  gift_idea?: string | null;
  avatar_url?: string | null;
  repeat_yearly: boolean;
  remind_days?: number[] | null;
  enabled: boolean;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Lấy ngày dương lịch tiếp theo của một sự kiện (Dương lịch hoặc Âm lịch)
 * Xử lý:
 * 1. Năm nhuận 29/02 (với rule 'feb28' hoặc 'mar01')
 * 2. Sự kiện Âm lịch (chuyển đổi sang Dương lịch tương ứng trong năm hiện tại hoặc năm sau)
 * 3. Chuyển tiếp qua năm mới (ví dụ ngày 2/1 xét vào tháng 12)
 */
export function calculateNextOccurrence(
  event: Pick<EventBase, "event_day" | "event_month" | "is_lunar" | "repeat_yearly"> & {
    event_year?: number | null;
  },
  baseDate: Date = new Date(),
  leapDayRule: "feb28" | "mar01" = "feb28"
): Date {
  const currentYear = baseDate.getFullYear();
  const todayZero = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  if (event.is_lunar) {
    // Với sự kiện âm lịch: tìm ngày dương lịch tương ứng trong năm nay
    let solar = convertLunar2Solar(event.event_day, event.event_month, currentYear);
    let occDate = new Date(solar.year, solar.month - 1, solar.day);
    const diffDays = Math.round((occDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));

    // Nếu sự kiện lặp hàng năm và đã qua hơn 1 ngày (không tính hôm qua diffDays = -1) -> dời sang năm sau
    if (diffDays < -1 && event.repeat_yearly !== false) {
      solar = convertLunar2Solar(event.event_day, event.event_month, currentYear + 1);
      occDate = new Date(solar.year, solar.month - 1, solar.day);
    }
    return occDate;
  }

  // Sự kiện Dương lịch
  let targetYear = (event.repeat_yearly === false && event.event_year)
    ? event.event_year
    : currentYear;
  let targetMonth = event.event_month - 1; // 0-indexed
  let targetDay = event.event_day;

  // Xử lý ngày 29/02 trong năm không nhuận
  if (event.event_month === 2 && event.event_day === 29 && !isLeapYear(targetYear)) {
    if (leapDayRule === "mar01") {
      targetMonth = 2; // Tháng 3
      targetDay = 1;
    } else {
      targetMonth = 1; // Tháng 2
      targetDay = 28;
    }
  }

  let occDate = new Date(targetYear, targetMonth, targetDay);
  const diffDays = Math.round((occDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));

  // Nếu sự kiện lặp hàng năm và đã qua hơn 1 ngày (nếu là hôm qua diffDays = -1 thì giữ nguyên để hiển thị "Hôm qua") -> dời sang năm sau
  if (diffDays < -1 && event.repeat_yearly !== false) {
    targetYear += 1;
    targetMonth = event.event_month - 1;
    targetDay = event.event_day;

    if (event.event_month === 2 && event.event_day === 29 && !isLeapYear(targetYear)) {
      if (leapDayRule === "mar01") {
        targetMonth = 2;
        targetDay = 1;
      } else {
        targetMonth = 1;
        targetDay = 28;
      }
    }
    occDate = new Date(targetYear, targetMonth, targetDay);
  }

  return occDate;
}

/**
 * Tính số ngày còn lại từ hôm nay đến ngày diễn ra sự kiện tiếp theo
 */
export function calculateDaysRemaining(nextOccurrence: Date, baseDate: Date = new Date()): number {
  const d1 = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).getTime();
  const d2 = new Date(nextOccurrence.getFullYear(), nextOccurrence.getMonth(), nextOccurrence.getDate()).getTime();
  const diffTime = d2 - d1;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Tính tuổi sắp tới của người được nhắc
 */
export function calculateUpcomingAge(
  birthYear: number | null | undefined,
  nextOccurrenceYear: number
): number | null {
  if (!birthYear || birthYear <= 0) return null;
  const age = nextOccurrenceYear - birthYear;
  return age > 0 ? age : null;
}

/**
 * Format ngày hiển thị tiếng Việt (ví dụ: "25 tháng 10" hoặc "25/10/1995")
 */
export function formatEventDateDisplay(
  day: number,
  month: number,
  year?: number | null,
  isLunar?: boolean
): string {
  const base = `${day} tháng ${month}${year ? `, ${year}` : ""}`;
  return isLunar ? `${base} (Âm lịch)` : base;
}

/**
 * Chuyển danh sách sự kiện thành file chuẩn iCalendar (.ics) để import vào Google Calendar, Apple Calendar
 */
export function generateIcsCalendar(events: (EventBase & { nextOccurrence: Date })[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BER//Birthday and Event Reminder//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    const occ = ev.nextOccurrence;
    const yyyy = occ.getFullYear();
    const mm = String(occ.getMonth() + 1).padStart(2, "0");
    const dd = String(occ.getDate()).padStart(2, "0");
    const dtstart = `${yyyy}${mm}${dd}`;

    const summary = `${ev.event_type === "birthday" ? "🎂 Sinh nhật" : "🌟 Sự kiện"}: ${ev.name}`;
    const desc = [
      ev.note ? `Ghi chú: ${ev.note}` : "",
      ev.gift_idea ? `Gợi ý quà: ${ev.gift_idea}` : "",
      ev.is_lunar ? "(Sự kiện tính theo Âm lịch)" : "",
    ]
      .filter(Boolean)
      .join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:ber-${ev.id}@ber-reminder.app`,
      `DTSTAMP:${dtstart}T080000Z`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      ev.repeat_yearly ? "RRULE:FREQ=YEARLY" : "",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}
