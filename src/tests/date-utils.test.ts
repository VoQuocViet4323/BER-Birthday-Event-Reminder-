import { describe, it, expect } from "vitest";
import {
  isLeapYear,
  calculateNextOccurrence,
  calculateDaysRemaining,
  calculateUpcomingAge,
} from "../lib/date-utils";
import { convertSolar2Lunar, convertLunar2Solar } from "../lib/lunar/amlich";
import { formatDaysRemainingText } from "../lib/utils";

describe("Date Utilities & Edge Cases", () => {
  describe("Năm nhuận và sinh nhật ngày 29/02", () => {
    it("nhận diện đúng năm nhuận dương lịch", () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(1900)).toBe(false);
    });

    it("xử lý sinh nhật 29/2 ở năm không nhuận (rule: feb28)", () => {
      const event = {
        event_day: 29,
        event_month: 2,
        is_lunar: false,
        repeat_yearly: true,
      };
      // Giả sử hôm nay là 01/01/2025 (năm không nhuận)
      const baseDate = new Date(2025, 0, 1);
      const nextOcc = calculateNextOccurrence(event, baseDate, "feb28");

      expect(nextOcc.getFullYear()).toBe(2025);
      expect(nextOcc.getMonth()).toBe(1); // Tháng 2
      expect(nextOcc.getDate()).toBe(28); // Dời về 28/2
    });

    it("xử lý sinh nhật 29/2 ở năm không nhuận (rule: mar01)", () => {
      const event = {
        event_day: 29,
        event_month: 2,
        is_lunar: false,
        repeat_yearly: true,
      };
      const baseDate = new Date(2025, 0, 1);
      const nextOcc = calculateNextOccurrence(event, baseDate, "mar01");

      expect(nextOcc.getFullYear()).toBe(2025);
      expect(nextOcc.getMonth()).toBe(2); // Tháng 3 (index 2)
      expect(nextOcc.getDate()).toBe(1); // Dời sang 01/3
    });

    it("giữ nguyên 29/2 nếu năm đó là năm nhuận", () => {
      const event = {
        event_day: 29,
        event_month: 2,
        is_lunar: false,
        repeat_yearly: true,
      };
      const baseDate = new Date(2028, 0, 1); // 2028 là năm nhuận
      const nextOcc = calculateNextOccurrence(event, baseDate, "feb28");

      expect(nextOcc.getFullYear()).toBe(2028);
      expect(nextOcc.getMonth()).toBe(1);
      expect(nextOcc.getDate()).toBe(29);
    });
  });

  describe("Chuyển tiếp qua ranh giới năm (Year Boundary)", () => {
    it("tính chính xác sự kiện đầu tháng 1 khi đang ở cuối tháng 12", () => {
      const event = {
        event_day: 2,
        event_month: 1, // Sinh nhật 02/01
        is_lunar: false,
        repeat_yearly: true,
      };
      // Ngày hiện tại: 26/12/2025
      const baseDate = new Date(2025, 11, 26);
      const nextOcc = calculateNextOccurrence(event, baseDate);

      expect(nextOcc.getFullYear()).toBe(2026);
      expect(nextOcc.getMonth()).toBe(0); // Tháng 1
      expect(nextOcc.getDate()).toBe(2);

      const daysDiff = calculateDaysRemaining(nextOcc, baseDate);
      expect(daysDiff).toBe(7); // Đúng 7 ngày
    });
  });

  describe("Âm lịch Việt Nam (Hồ Ngọc Đức)", () => {
    it("chuyển đổi Tết Nguyên Đán Giáp Thìn 2024 (01/01/2024 Âm lịch -> 10/02/2024 Dương lịch)", () => {
      const solar = convertLunar2Solar(1, 1, 2024);
      expect(solar.day).toBe(10);
      expect(solar.month).toBe(2);
      expect(solar.year).toBe(2024);

      const lunar = convertSolar2Lunar(10, 2, 2024);
      expect(lunar.day).toBe(1);
      expect(lunar.month).toBe(1);
      expect(lunar.year).toBe(2024);
    });

    it("tính ngày diễn ra tiếp theo cho sự kiện Âm lịch", () => {
      const event = {
        event_day: 15,
        event_month: 8, // Rằm Trung Thu (15/8 Âm lịch)
        is_lunar: true,
        repeat_yearly: true,
      };
      // Giả sử xét vào đầu năm 2024
      const baseDate = new Date(2024, 0, 1);
      const nextOcc = calculateNextOccurrence(event, baseDate);

      // 15/8 Âm lịch năm 2024 rơi vào 17/9/2024 Dương lịch
      expect(nextOcc.getFullYear()).toBe(2024);
      expect(nextOcc.getMonth()).toBe(8); // Tháng 9
      expect(nextOcc.getDate()).toBe(17);
    });
  });

  describe("Tính tuổi sắp tới", () => {
    it("tính chính xác tuổi khi bước sang năm tiếp theo", () => {
      const birthYear = 1995;
      expect(calculateUpcomingAge(birthYear, 2025)).toBe(30);
      expect(calculateUpcomingAge(birthYear, 2026)).toBe(31);
      expect(calculateUpcomingAge(null, 2026)).toBeNull();
    });
  });

  describe("Format số ngày còn lại (formatDaysRemainingText)", () => {
    it("trả về thông tin đúng cho ngày hôm nay (days = 0)", () => {
      const res = formatDaysRemainingText(0);
      expect(res.text).toBe("Hôm nay! 🎉");
      expect(res.isToday).toBe(true);
      expect(res.isUrgent).toBe(true);
      expect(res.badgeClass).toContain("dark:text-rose-400");
    });

    it("trả về thông tin đúng cho ngày mai (days = 1)", () => {
      const res = formatDaysRemainingText(1);
      expect(res.text).toBe("Ngày mai ⏳");
      expect(res.isToday).toBe(false);
      expect(res.isUrgent).toBe(true);
      expect(res.badgeClass).toContain("dark:text-amber-400");
    });

    it("trả về thông tin đúng cho mốc 2-3 ngày", () => {
      const res = formatDaysRemainingText(3);
      expect(res.text).toBe("Còn 3 ngày");
      expect(res.isUrgent).toBe(true);
      expect(res.badgeClass).toContain("dark:text-amber-300");
    });

    it("trả về thông tin đúng cho mốc 4-7 ngày", () => {
      const res = formatDaysRemainingText(7);
      expect(res.text).toBe("Còn 7 ngày");
      expect(res.isUrgent).toBe(false);
      expect(res.badgeClass).toContain("dark:text-purple-300");
    });

    it("trả về thông tin đúng cho mốc > 7 ngày (Minh Khuê 31 ngày, Concert 41 ngày)", () => {
      const res31 = formatDaysRemainingText(31);
      expect(res31.text).toBe("Còn 31 ngày");
      expect(res31.badgeClass).toContain("dark:bg-slate-800");
      expect(res31.badgeClass).toContain("dark:text-slate-300");
      expect(res31.badgeClass).toContain("bg-slate-100");

      const res41 = formatDaysRemainingText(41);
      expect(res41.text).toBe("Còn 41 ngày");
      expect(res41.badgeClass).toContain("dark:bg-slate-800");
    });

    it("trả về thông tin đúng cho sự kiện diễn ra hôm qua (days = -1)", () => {
      const res = formatDaysRemainingText(-1);
      expect(res.text).toBe("Hôm qua");
      expect(res.isToday).toBe(false);
      expect(res.isUrgent).toBe(true);
      expect(res.badgeClass).toContain("dark:text-amber-400");
    });

    it("trả về thông tin đúng cho sự kiện đã qua nhiều ngày (days < -1)", () => {
      const res = formatDaysRemainingText(-2);
      expect(res.text).toBe("Đã qua 2 ngày");
      expect(res.isToday).toBe(false);
      expect(res.isUrgent).toBe(false);
    });
  });

  describe("Sự kiện diễn ra hôm qua và trong vòng 30 ngày qua (Past Events Grace Period)", () => {
    it("giữ nguyên ngày hôm qua (diffDays = -1) thay vì nhảy sang năm sau", () => {
      const event = {
        event_day: 26,
        event_month: 10,
        is_lunar: false,
        repeat_yearly: true,
      };
      // Ngày hiện tại: 27/10/2026, sự kiện là 26/10/2026
      const baseDate = new Date(2026, 9, 27);
      const nextOcc = calculateNextOccurrence(event, baseDate);

      expect(nextOcc.getFullYear()).toBe(2026);
      expect(nextOcc.getMonth()).toBe(9);
      expect(nextOcc.getDate()).toBe(26);

      const daysDiff = calculateDaysRemaining(nextOcc, baseDate);
      expect(daysDiff).toBe(-1);
      expect(formatDaysRemainingText(daysDiff).text).toBe("Hôm qua");
    });

    it("giữ nguyên sự kiện diễn ra 2 ngày trước (26/10 vs 28/10/2026) hiển thị 'Đã qua 2 ngày' thay vì 'Còn 363 ngày'", () => {
      const event = {
        event_day: 26,
        event_month: 10,
        is_lunar: false,
        repeat_yearly: true,
      };
      // Ngày hiện tại: 28/10/2026, sự kiện là 26/10/2026
      const baseDate = new Date(2026, 9, 28);
      const nextOcc = calculateNextOccurrence(event, baseDate);

      expect(nextOcc.getFullYear()).toBe(2026);
      expect(nextOcc.getMonth()).toBe(9);
      expect(nextOcc.getDate()).toBe(26);

      const daysDiff = calculateDaysRemaining(nextOcc, baseDate);
      expect(daysDiff).toBe(-2);
      expect(formatDaysRemainingText(daysDiff).text).toBe("Đã qua 2 ngày");
    });

    it("tự động dời sang năm sau nếu sự kiện đã qua hơn 30 ngày", () => {
      const event = {
        event_day: 10,
        event_month: 9, // 10/9/2026 so với 28/10/2026 là 48 ngày trước (> 30 ngày)
        is_lunar: false,
        repeat_yearly: true,
      };
      const baseDate = new Date(2026, 9, 28);
      const nextOcc = calculateNextOccurrence(event, baseDate);

      expect(nextOcc.getFullYear()).toBe(2027);
      expect(nextOcc.getMonth()).toBe(8);
      expect(nextOcc.getDate()).toBe(10);
    });
  });
});
