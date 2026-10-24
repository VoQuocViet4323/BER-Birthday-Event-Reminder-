-- ==============================================================================
-- MIGRATION 012: BỔ SUNG CỘT CUSTOM_TYPE VÀO BẢNG EVENTS
-- Giúp lưu tên loại sự kiện tùy chỉnh khi người dùng chọn loại "Khác"
-- ==============================================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_type TEXT;
