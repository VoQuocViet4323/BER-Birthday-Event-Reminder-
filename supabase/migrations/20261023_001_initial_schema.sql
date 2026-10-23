-- ==============================================================================
-- MIGRATION 001: KHỞI TẠO BẢNG, RLS, TRIGGERS VÀ STORAGE BUCKET
-- Ứng dụng: Nhắc Sinh Nhật & Sự Kiện (BER)
-- ==============================================================================

-- Bật extension cần thiết
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG PROFILES (Hồ sơ người dùng liên kết với auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. BẢNG USER_SETTINGS (Cài đặt thông báo & cấu hình của từng user)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    default_remind_days INT[] NOT NULL DEFAULT '{7, 1, 0}',
    remind_time TIME NOT NULL DEFAULT '08:00',
    extra_emails TEXT[] DEFAULT '{}',
    email_template JSONB DEFAULT '{
      "subject": "🔔 [Nhắc nhở] Sắp đến {su_kien} của {ten}!",
      "greeting": "Xin chào,",
      "custom_note": "Đừng quên gửi lời chúc và chuẩn bị quà nhé!"
    }'::jsonb,
    leap_day_rule TEXT NOT NULL DEFAULT 'feb28' CHECK (leap_day_rule IN ('feb28', 'mar01')),
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. BẢNG EVENTS (Sự kiện sinh nhật, ngày kỷ niệm, ngày giỗ...)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'birthday' CHECK (event_type IN ('birthday', 'anniversary', 'memorial', 'other')),
    event_day SMALLINT NOT NULL CHECK (event_day BETWEEN 1 AND 31),
    event_month SMALLINT NOT NULL CHECK (event_month BETWEEN 1 AND 12),
    event_year SMALLINT CHECK (event_year IS NULL OR (event_year >= 1900 AND event_year <= 2100)),
    is_lunar BOOLEAN NOT NULL DEFAULT FALSE,
    group_name TEXT NOT NULL DEFAULT 'Gia đình' CHECK (group_name IN ('Gia đình', 'Bạn bè', 'Đồng nghiệp', 'Khác')),
    note TEXT,
    gift_idea TEXT,
    avatar_url TEXT,
    repeat_yearly BOOLEAN NOT NULL DEFAULT TRUE,
    remind_days INT[] DEFAULT NULL, -- NULL nghĩa là sử dụng mặc định từ user_settings
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. BẢNG NOTIFICATION_LOGS (Lịch sử đã gửi, chống gửi trùng lặp tuyệt đối)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    remind_offset INT NOT NULL, -- Số ngày nhắc trước: 0 (đúng ngày), 1, 3, 7...
    occurrence_date DATE NOT NULL, -- Ngày diễn ra sự kiện trong năm tương ứng
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'telegram', 'push')),
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_event_notification UNIQUE (event_id, remind_offset, occurrence_date, channel)
);

-- ==============================================================================
-- INDEX TỐI ƯU TRUY VẤN
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_month_day ON public.events(event_month, event_day);
CREATE INDEX IF NOT EXISTS idx_events_group ON public.events(user_id, group_name);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - BẢO MẬT DỮ LIỆU TUYỆT ĐỐI
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. User Settings Policies
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- 3. Events Policies
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
CREATE POLICY "Users can view their own events"
    ON public.events FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
CREATE POLICY "Users can create their own events"
    ON public.events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
CREATE POLICY "Users can update their own events"
    ON public.events FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
CREATE POLICY "Users can delete their own events"
    ON public.events FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Notification Logs Policies
DROP POLICY IF EXISTS "Users can view their own logs" ON public.notification_logs;
CREATE POLICY "Users can view their own logs"
    ON public.notification_logs FOR SELECT
    USING (auth.uid() = user_id);

-- (Chỉ Service Role mới được insert/update notification logs qua Edge Function)
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.notification_logs;
CREATE POLICY "Service role can insert notification logs"
    ON public.notification_logs FOR INSERT
    WITH CHECK (true);

-- ==============================================================================
-- AUTOMATIC PROFILE & SETTINGS TRIGGER ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Tạo profile cho user mới
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', NULL)
    );

    -- Tạo settings mặc định cho user mới
    INSERT INTO public.user_settings (user_id)
    VALUES (new.id);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sau khi có dòng mới trong auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger tự động cập nhật updated_at trên events
CREATE OR REPLACE FUNCTION public.update_events_updated_at()
RETURNS trigger AS $$
BEGIN
    new.updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_events_timestamp ON public.events;
CREATE TRIGGER update_events_timestamp
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE PROCEDURE public.update_events_updated_at();

-- ==============================================================================
-- STORAGE BUCKET: AVATARS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies cho Storage Bucket avatars
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );
