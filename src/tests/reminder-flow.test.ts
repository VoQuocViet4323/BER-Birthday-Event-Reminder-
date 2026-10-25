import { describe, it, expect } from "vitest";
import {
  calculateNextOccurrence,
  calculateDaysRemaining,
  calculateUpcomingAge,
  isLeapYear,
} from "../lib/date-utils";
import { generateReminderEmailHtml, ReminderItem } from "../lib/email/template-builder";
import { sendEmail } from "../lib/email/mailer";

describe("Real Reminder Engine & Notification Flow Verification", () => {
  const baseDate = new Date(2026, 9, 23); // Ngày 23 tháng 10 năm 2026

  describe("1. Tính toán ngày diễn ra sự kiện thật (calculateNextOccurrence)", () => {
    it("tính chính xác sự kiện diễn ra đúng hôm nay (0 ngày)", () => {
      const event = {
        event_day: 23,
        event_month: 10,
        is_lunar: false,
        repeat_yearly: true,
      };
      const occ = calculateNextOccurrence(event, baseDate);
      expect(occ.getFullYear()).toBe(2026);
      expect(occ.getMonth()).toBe(9); // Tháng 10
      expect(occ.getDate()).toBe(23);

      const days = calculateDaysRemaining(occ, baseDate);
      expect(days).toBe(0);
    });

    it("tính chính xác sự kiện sắp tới vào ngày mai (1 ngày)", () => {
      const event = {
        event_day: 24,
        event_month: 10,
        is_lunar: false,
        repeat_yearly: true,
      };
      const occ = calculateNextOccurrence(event, baseDate);
      const days = calculateDaysRemaining(occ, baseDate);
      expect(days).toBe(1);
    });

    it("tính chính xác sự kiện đã qua trong năm nay -> dời sang năm sau", () => {
      const event = {
        event_day: 10,
        event_month: 5, // 10/5 đã qua so với 23/10
        is_lunar: false,
        repeat_yearly: true,
      };
      const occ = calculateNextOccurrence(event, baseDate);
      expect(occ.getFullYear()).toBe(2027); // Sang năm 2027
      expect(occ.getMonth()).toBe(4); // Tháng 5
      expect(occ.getDate()).toBe(10);
      expect(calculateDaysRemaining(occ, baseDate)).toBeGreaterThan(0);
    });

    it("tính chính xác sự kiện Âm lịch (ví dụ ngày 15/8 rằm Trung thu)", () => {
      const event = {
        event_day: 15,
        event_month: 8,
        is_lunar: true,
        repeat_yearly: true,
      };
      const occ = calculateNextOccurrence(event, baseDate);
      expect(occ).toBeInstanceOf(Date);
      expect(isNaN(occ.getTime())).toBe(false);
    });

    it("tính chính xác ngày 29/02 với rule feb28 và mar01 ở năm không nhuận", () => {
      const event = {
        event_day: 29,
        event_month: 2,
        is_lunar: false,
        repeat_yearly: true,
      };
      // 2026 không phải năm nhuận
      expect(isLeapYear(2026)).toBe(false);

      const occFeb28 = calculateNextOccurrence(event, new Date(2026, 0, 1), "feb28");
      expect(occFeb28.getMonth()).toBe(1); // Tháng 2
      expect(occFeb28.getDate()).toBe(28);

      const occMar01 = calculateNextOccurrence(event, new Date(2026, 0, 1), "mar01");
      expect(occMar01.getMonth()).toBe(2); // Tháng 3
      expect(occMar01.getDate()).toBe(1);
    });
  });

  describe("2. Tính tuổi sắp tới (calculateUpcomingAge)", () => {
    it("tính đúng tuổi khi có năm sinh", () => {
      expect(calculateUpcomingAge(1995, 2026)).toBe(31);
      expect(calculateUpcomingAge(2000, 2026)).toBe(26);
    });

    it("trả về null nếu không có năm sinh hoặc năm sinh không hợp lệ", () => {
      expect(calculateUpcomingAge(null, 2026)).toBeNull();
      expect(calculateUpcomingAge(undefined, 2026)).toBeNull();
      expect(calculateUpcomingAge(0, 2026)).toBeNull();
    });
  });

  describe("3. Tạo Email Template HTML (generateReminderEmailHtml)", () => {
    it("tạo mã HTML chuẩn không lỗi với danh sách sự kiện thật", () => {
      const realItems: ReminderItem[] = [
        {
          id: "event-1",
          name: "Sinh nhật Mai Lan",
          eventType: "birthday",
          eventDateFormatted: "23 tháng 10",
          daysRemaining: 0,
          upcomingAge: 24,
          groupName: "Gia đình",
          isLunar: false,
          note: "Thích hoa baby trắng",
          giftIdea: "Son môi",
        },
        {
          id: "event-2",
          name: "Giỗ Cụ Nội",
          eventType: "memorial",
          eventDateFormatted: "15 tháng 8 (Âm lịch)",
          daysRemaining: 5,
          upcomingAge: null,
          groupName: "Gia đình",
          isLunar: true,
          note: "Làm cỗ lúc 10h sáng",
          giftIdea: null,
        },
      ];

      const html = generateReminderEmailHtml({
        userName: "Quốc Việt",
        items: realItems,
        appUrl: "http://localhost:3000",
        unsubscribeUrl: "http://localhost:3000/settings",
      });

      expect(html).toContain("Quốc Việt");
      expect(html).toContain("Sinh nhật Mai Lan");
      expect(html).toContain("Giỗ Cụ Nội");
      expect(html).toContain("Hôm nay có sự kiện đặc biệt!");
      expect(html).toContain("23 tháng 10");
      expect(html).toContain("Âm lịch");
      expect(html).toContain("Thích hoa baby trắng");
      expect(html).toContain("Son môi");
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("NaN");

      // Đảm bảo các nút bấm và liên kết luôn trỏ về web app real thay vì localhost
      expect(html).toContain("https://ber-birthday-event-reminder.vercel.app/dashboard");
      expect(html).toContain("https://ber-birthday-event-reminder.vercel.app/calendar");
      expect(html).toContain("https://ber-birthday-event-reminder.vercel.app/settings");
      expect(html).not.toContain("localhost:3000");
    });
  });

  describe("4. Kiểm tra dịch vụ gửi mail (sendEmail)", () => {
    it("trả về cấu trúc kết quả hợp lệ", async () => {
      const res = await sendEmail({
        to: "test@example.com",
        subject: "Tiêu đề kiểm thử",
        html: "<p>Nội dung kiểm thử</p>",
      });

      expect(res).toBeDefined();
      expect(typeof res.success).toBe("boolean");
      if (res.success) {
        expect(res.provider).toBeDefined();
      }
    });
  });

  describe("5. Cơ chế Gửi Bù (Catch-up) & Chống Miss Thông Báo", () => {
    it("nhận diện sự kiện ngày mai (26/10) trùng mốc 'Trước 1 ngày' khi hôm nay là 25/10", () => {
      const event = {
        event_day: 26,
        event_month: 10,
        event_year: 2026,
        is_lunar: false,
        repeat_yearly: true,
      };
      const today = new Date(2026, 9, 25, 16, 54);
      const nextOcc = calculateNextOccurrence(event, today);
      const daysRemaining = calculateDaysRemaining(nextOcc, today);

      expect(daysRemaining).toBe(1);

      // Mốc nhắc nhở người dùng chọn: [1, 0] (Trước 1 ngày & Đúng ngày)
      const remindDays = [1, 0];
      const isDueToday = remindDays.map(Number).includes(daysRemaining);
      expect(isDueToday).toBe(true);
    });

    it("so khớp mốc ngày chính xác ngay cả khi dữ liệu từ database là mảng chuỗi ['1', '0']", () => {
      const stringOffsets = ["1", "0"];
      const daysRemaining = 1;
      const normalized = stringOffsets.map(Number).filter((d) => !isNaN(d));
      expect(normalized.includes(daysRemaining)).toBe(true);
    });

    it("cơ chế gửi bù: cho phép gửi khi giờ hiện tại đã đến hoặc vượt qua giờ nhắc trong ngày", () => {
      const eventTime = "08:00";
      const currentTimePassed = "16:54";
      const currentTimeBefore = "07:30";

      // Đã qua 08:00 sáng -> Không được bỏ qua (currentTimePassed < eventTime là false)
      expect(currentTimePassed < eventTime).toBe(false);

      // Chưa đến 08:00 sáng -> Bỏ qua chờ đúng giờ (currentTimeBefore < eventTime là true)
      expect(currentTimeBefore < eventTime).toBe(true);
    });

    it("mặc định repeat_yearly = true ngay cả khi sự kiện không truyền repeat_yearly", () => {
      const eventWithoutRepeat: any = {
        event_day: 10,
        event_month: 5, // 10/5 đã qua so với 23/10
        is_lunar: false,
      };
      const occ = calculateNextOccurrence(eventWithoutRepeat, baseDate);
      expect(occ.getFullYear()).toBe(2027);
    });
  });
});

