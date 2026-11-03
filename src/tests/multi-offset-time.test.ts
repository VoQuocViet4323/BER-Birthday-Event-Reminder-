import { describe, it, expect } from "vitest";
import {
  parseRemindTime,
  serializeRemindTime,
  getTimeForOffset,
} from "../lib/reminder-time-utils";

describe("Multi-offset reminder time utils", () => {
  it("hỗ trợ định dạng đơn giản cũ (backward compatibility)", () => {
    const parsed = parseRemindTime("08:00");
    expect(parsed.defaultTime).toBe("08:00");
    expect(parsed.offsetTimes).toEqual({});
    expect(getTimeForOffset("08:00", 0)).toBe("08:00");
    expect(getTimeForOffset("08:00", 1)).toBe("08:00");
  });

  it("đóng gói và phân giải đúng khi cấu hình riêng từng mốc", () => {
    // Ví dụ: Đúng ngày (mốc 0) nhắc lúc 21:00, Trước 1 ngày (mốc 1) nhắc lúc 08:30
    const serialized = serializeRemindTime(
      "08:00",
      { 0: "21:00", 1: "08:30" },
      [1, 0]
    );

    expect(serialized).toBe("08:00|1:08:30,0:21:00");

    const parsed = parseRemindTime(serialized);
    expect(parsed.defaultTime).toBe("08:00");
    expect(parsed.offsetTimes[0]).toBe("21:00");
    expect(parsed.offsetTimes[1]).toBe("08:30");

    expect(getTimeForOffset(serialized, 0)).toBe("21:00");
    expect(getTimeForOffset(serialized, 1)).toBe("08:30");
    // Mốc khác không có cấu hình riêng sẽ fallback về defaultTime
    expect(getTimeForOffset(serialized, 7)).toBe("08:00");
  });

  it("tối ưu chuỗi khi tất cả các mốc đều có giờ giống nhau", () => {
    const serialized = serializeRemindTime(
      "09:00",
      { 0: "09:00", 1: "09:00" },
      [1, 0]
    );
    // Nếu các mốc đều bằng nhau, chỉ cần lưu "09:00"
    expect(serialized).toBe("09:00");
  });
});
