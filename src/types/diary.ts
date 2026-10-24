import { z } from "zod";
import { Database } from "./database";

export type DiaryRow = Database["public"]["Tables"]["diaries"]["Row"];
export type DiaryMood = "happy" | "calm" | "excited" | "sad" | "grateful";

export interface DiaryEntry {
  id: string;
  user_id?: string;
  entry_date: string; // YYYY-MM-DD
  title?: string | null;
  content: string;
  mood?: DiaryMood | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export const diaryFormSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày không hợp lệ (YYYY-MM-DD)"),
  title: z.union([
    z.string().max(120, "Tiêu đề không quá 120 ký tự"),
    z.literal("").transform(() => null),
    z.null(),
  ]).optional(),
  content: z.string().min(1, "Vui lòng nhập nội dung nhật ký").max(3000, "Nội dung không quá 3000 ký tự"),
  mood: z.union([
    z.enum(["happy", "calm", "excited", "sad", "grateful"]),
    z.literal("").transform(() => null),
    z.null(),
  ]).optional(),
  tags: z.array(z.string()).optional().default([]),
});

export type DiaryFormValues = z.infer<typeof diaryFormSchema>;
