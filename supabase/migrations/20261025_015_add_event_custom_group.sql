-- ==============================================================================
-- MIGRATION 015: BỔ SUNG CỘT CUSTOM_GROUP VÀO BẢNG EVENTS
-- Giúp lưu tên phân loại nhóm tùy chỉnh khi người dùng chọn nhóm "Khác"
-- ==============================================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_group TEXT;
