import { z } from "zod";
import { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type NotificationLog = Database["public"]["Tables"]["notification_logs"]["Row"];

export type EventGroup = "Gia đình" | "Bạn bè" | "Đồng nghiệp" | "Khác";
export type EventType = "birthday" | "anniversary" | "memorial" | "other";

export interface EventWithMeta extends EventRow {
  nextOccurrence: Date;
  daysRemaining: number;
  upcomingAge: number | null;
  displayDate: string;
}

// Zod Schema cho form thêm / sửa sự kiện
export const eventFormSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên người hoặc sự kiện").max(100, "Tên không quá 100 ký tự"),
  event_type: z.enum(["birthday", "anniversary", "memorial", "other"], {
    required_error: "Vui lòng chọn loại sự kiện",
  }),
  event_day: z.coerce.number().min(1, "Ngày không hợp lệ").max(31, "Ngày không hợp lệ"),
  event_month: z.coerce.number().min(1, "Tháng không hợp lệ").max(12, "Tháng không hợp lệ"),
  event_year: z.union([
    z.coerce.number().min(1900, "Năm không hợp lệ").max(2100, "Năm không hợp lệ"),
    z.literal("").transform(() => null),
    z.null(),
  ]).optional(),
  is_lunar: z.boolean().default(false),
  group_name: z.enum(["Gia đình", "Bạn bè", "Đồng nghiệp", "Khác"]).default("Gia đình"),
  note: z.string().max(500, "Ghi chú không quá 500 ký tự").optional().nullable(),
  gift_idea: z.string().max(300, "Gợi ý quà không quá 300 ký tự").optional().nullable(),
  avatar_url: z.string().url("URL không hợp lệ").optional().nullable().or(z.literal("")),
  repeat_yearly: z.boolean().default(true),
  remind_days: z.array(z.number()).optional().nullable(),
  enabled: z.boolean().default(true),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

// Schema cấu hình cài đặt người dùng
export const userSettingsSchema = z.object({
  email_enabled: z.boolean(),
  default_remind_days: z.array(z.number()),
  remind_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Giờ không đúng định dạng HH:MM"),
  extra_emails: z.array(z.string().email("Email không hợp lệ")),
  leap_day_rule: z.enum(["feb28", "mar01"]),
  theme: z.enum(["light", "dark", "system"]),
  timezone: z.string(),
  display_name: z.string().min(1, "Vui lòng nhập tên hiển thị"),
});

export type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;
