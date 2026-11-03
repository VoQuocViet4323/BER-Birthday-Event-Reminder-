/**
 * Helper phân giải và format cấu hình giờ nhắc cho từng mốc ngày
 * Format chuỗi lưu trữ trong events.remind_time:
 * 1. Đơn giản (1 mốc hoặc dùng chung): "08:00"
 * 2. Nâng cao (từng mốc riêng biệt): "08:00|0:21:00,1:08:00,3:09:30"
 *    - Trong đó: phần đầu là giờ mặc định "08:00" (hoàn toàn tương thích ngược với hệ thống cũ)
 *    - Sau dấu "|" là map từng offset: "<offset>:<HH:mm>"
 */

export interface OffsetTimeMap {
  [offset: number]: string;
}

/**
 * Phân tích chuỗi remind_time lưu trong DB thành giờ mặc định và map giờ của từng mốc
 */
export function parseRemindTime(rawTime?: string | null): {
  defaultTime: string;
  offsetTimes: OffsetTimeMap;
} {
  if (!rawTime || typeof rawTime !== "string") {
    return { defaultTime: "08:00", offsetTimes: {} };
  }

  const trimmed = rawTime.trim();
  if (!trimmed.includes("|")) {
    const validTime = isValidTimeFormat(trimmed) ? trimmed : "08:00";
    return { defaultTime: validTime, offsetTimes: {} };
  }

  const [baseTime, mapString] = trimmed.split("|");
  const defaultTime = isValidTimeFormat(baseTime?.trim()) ? baseTime.trim() : "08:00";
  const offsetTimes: OffsetTimeMap = {};

  if (mapString) {
    const pairs = mapString.split(",");
    for (const pair of pairs) {
      const colonIdx = pair.indexOf(":");
      if (colonIdx > 0) {
        const offset = parseInt(pair.substring(0, colonIdx), 10);
        const timeVal = pair.substring(colonIdx + 1).trim();
        if (!isNaN(offset) && isValidTimeFormat(timeVal)) {
          offsetTimes[offset] = timeVal;
        }
      }
    }
  }

  return { defaultTime, offsetTimes };
}

/**
 * Đóng gói giờ mặc định và map giờ từng mốc thành chuỗi lưu DB
 */
export function serializeRemindTime(
  defaultTime: string = "08:00",
  offsetTimes: OffsetTimeMap = {},
  activeOffsets: number[] = []
): string {
  const cleanDefault = isValidTimeFormat(defaultTime) ? defaultTime : "08:00";
  
  // Lọc chỉ lấy các mốc đang được chọn trong activeOffsets
  const validPairs: string[] = [];
  const sortedOffsets = [...activeOffsets].sort((a, b) => b - a);

  for (const offset of sortedOffsets) {
    const timeForOffset = offsetTimes[offset] || cleanDefault;
    validPairs.push(`${offset}:${timeForOffset}`);
  }

  if (validPairs.length === 0) {
    return cleanDefault;
  }

  // Nếu tất cả các mốc đều có giờ giống hệt nhau và bằng defaultTime -> chỉ cần lưu defaultTime
  const allSame = validPairs.every((p) => p.endsWith(`:${cleanDefault}`));
  if (allSame) {
    return cleanDefault;
  }

  return `${cleanDefault}|${validPairs.join(",")}`;
}

/**
 * Lấy giờ gửi thông báo cho một mốc ngày cụ thể
 */
export function getTimeForOffset(rawTime?: string | null, offset: number = 0): string {
  const { defaultTime, offsetTimes } = parseRemindTime(rawTime);
  return offsetTimes[offset] || defaultTime;
}

function isValidTimeFormat(t?: string): boolean {
  if (!t) return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t.trim());
}

