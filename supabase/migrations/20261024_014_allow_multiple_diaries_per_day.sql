-- ==============================================================================
-- MIGRATION 014: CHO PHÉP TẠO NHIỀU NHẬT KÝ TRONG CÙNG MỘT NGÀY
-- ==============================================================================

-- Bỏ ràng buộc duy nhất 1 ngày / 1 nhật ký của mỗi người dùng
ALTER TABLE public.diaries DROP CONSTRAINT IF EXISTS unique_user_entry_date;

-- Giữ lại index tối ưu hóa truy vấn danh sách nhật ký theo user_id và entry_date
CREATE INDEX IF NOT EXISTS idx_diaries_user_date ON public.diaries(user_id, entry_date);
