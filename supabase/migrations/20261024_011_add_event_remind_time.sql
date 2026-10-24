-- ==============================================================================
-- MIGRATION 011: BỔ SUNG CỘT REMIND_TIME VÀO BẢNG EVENTS
-- Giúp lưu giờ gửi lời nhắc qua email riêng cho từng sự kiện hoặc theo mặc định
-- ==============================================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS remind_time TEXT DEFAULT '08:00';
