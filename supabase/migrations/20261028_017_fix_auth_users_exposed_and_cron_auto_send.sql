-- ==============================================================================
-- MIGRATION 017: KHẮC PHỤC LỖ HỔNG BẢO MẬT AUTH_USERS_EXPOSED & TỰ ĐỘNG GỬI EMAIL NGẦM 24/7
-- Ứng dụng: Nhắc Sinh Nhật & Sự Kiện (BER)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. KHẮC PHỤC TRIỆT ĐỂ CẢNH BÁO BẢO MẬT SUPABASE: "auth_users_exposed"
-- Xóa bỏ hoàn toàn 2 view public.admin_accounts và public.user_accounts
-- (Vì 2 view này trong schema public join trực tiếp auth.users, khiến API PostgREST public dữ liệu người dùng)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.admin_accounts CASCADE;
DROP VIEW IF EXISTS public.user_accounts CASCADE;

-- Đảm bảo bảng profiles đã có cột email (được đồng bộ từ auth.users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS custom_reminder_email TEXT;

-- ------------------------------------------------------------------------------
-- 2. HÀM RPC BẢO MẬT DÀNH RIÊNG CHO ADMIN XEM DANH SÁCH USER (THAY THẾ VIEW CŨ)
-- Hàm này có SECURITY DEFINER, chỉ người có role = 'admin' mới được phép gọi.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    role TEXT,
    email TEXT,
    timezone TEXT,
    avatar_url TEXT,
    onboarded BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền xem danh sách này';
    END IF;

    RETURN QUERY
    SELECT p.id, p.username, p.display_name, p.role, p.email, p.timezone, p.avatar_url, p.onboarded, p.created_at
    FROM public.profiles p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. BỘ HÀM RPC BẢO MẬT PHỤC VỤ CRON CHẠY TỰ ĐỘNG NGẦM (DUAL-ENGINE CRON)
-- Cho phép máy chủ Next.js (Vercel) quét sự kiện và khóa nhắc nhở nguyên tử
-- ngay cả khi chưa có SUPABASE_SERVICE_ROLE_KEY.
-- ------------------------------------------------------------------------------

-- 3.1. Lấy toàn bộ người dùng đang bật email cùng danh sách sự kiện đang kích hoạt
CREATE OR REPLACE FUNCTION public.cron_get_active_events_and_settings()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'user_id', s.user_id,
            'email_enabled', s.email_enabled,
            'default_remind_days', s.default_remind_days,
            'remind_time', s.remind_time,
            'leap_day_rule', s.leap_day_rule,
            'custom_reminder_email', s.custom_reminder_email,
            'profile', jsonb_build_object(
                'id', p.id,
                'display_name', p.display_name,
                'email', p.email,
                'timezone', p.timezone
            ),
            'events', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', e.id,
                        'user_id', e.user_id,
                        'name', e.name,
                        'event_type', e.event_type,
                        'event_day', e.event_day,
                        'event_month', e.event_month,
                        'event_year', e.event_year,
                        'is_lunar', e.is_lunar,
                        'group_name', e.group_name,
                        'note', e.note,
                        'gift_idea', e.gift_idea,
                        'repeat_yearly', e.repeat_yearly,
                        'remind_days', e.remind_days,
                        'remind_time', e.remind_time,
                        'enabled', e.enabled
                    )
                )
                FROM public.events e
                WHERE e.user_id = s.user_id AND e.enabled = true
            ), '[]'::jsonb)
        )
    ), '[]'::jsonb) INTO v_result
    FROM public.user_settings s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.email_enabled = true;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.2. Khóa độc quyền đa tầng nguyên tử (Triple Lock Idempotency)
CREATE OR REPLACE FUNCTION public.cron_claim_reminder_lock(
    p_user_id UUID,
    p_event_id UUID,
    p_remind_offset INT,
    p_occurrence_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_recent_sent_id UUID;
    v_existing_id UUID;
    v_existing_status TEXT;
    v_existing_sent_at TIMESTAMPTZ;
BEGIN
    -- LỚP 1: Chống gửi lặp trong vòng 18 giờ qua (ngăn chặn tuyệt đối 2 email cùng ngày)
    SELECT id INTO v_recent_sent_id
    FROM public.notification_logs
    WHERE event_id = p_event_id
      AND remind_offset = p_remind_offset
      AND channel = 'email'
      AND status = 'sent'
      AND sent_at >= (now() - interval '18 hours')
    LIMIT 1;

    IF v_recent_sent_id IS NOT NULL THEN
        RETURN FALSE;
    END IF;

    -- LỚP 2: Kiểm tra bản ghi cùng mốc occurrence_date
    SELECT id, status, sent_at INTO v_existing_id, v_existing_status, v_existing_sent_at
    FROM public.notification_logs
    WHERE event_id = p_event_id
      AND remind_offset = p_remind_offset
      AND occurrence_date = p_occurrence_date
      AND channel = 'email'
    ORDER BY sent_at DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        IF v_existing_status = 'sent' THEN
            RETURN FALSE;
        END IF;
        -- Nếu là 'pending' nhưng chưa quá 3 phút -> đang có luồng khác gửi
        IF (now() - v_existing_sent_at) < interval '3 minutes' THEN
            RETURN FALSE;
        END IF;
        -- Nếu là 'pending' đã quá 3 phút (stuck timeout) -> xóa để claim lại
        DELETE FROM public.notification_logs WHERE id = v_existing_id;
    END IF;

    -- LỚP 3: Atomic Insert với status = 'pending'
    BEGIN
        INSERT INTO public.notification_logs (
            user_id, event_id, remind_offset, occurrence_date, channel, status, sent_at
        ) VALUES (
            p_user_id, p_event_id, p_remind_offset, p_occurrence_date, 'email', 'pending', now()
        );
        RETURN TRUE;
    EXCEPTION WHEN unique_violation THEN
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.3. Xác nhận gửi email thành công (chuyển status sang 'sent')
CREATE OR REPLACE FUNCTION public.cron_commit_reminder_sent(
    p_event_id UUID,
    p_remind_offset INT,
    p_occurrence_date DATE
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notification_logs
    SET status = 'sent', sent_at = now()
    WHERE event_id = p_event_id
      AND remind_offset = p_remind_offset
      AND occurrence_date = p_occurrence_date
      AND channel = 'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.4. Rollback hủy bỏ lock pending khi gửi email thất bại
CREATE OR REPLACE FUNCTION public.cron_release_reminder_lock(
    p_event_id UUID,
    p_remind_offset INT,
    p_occurrence_date DATE
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.notification_logs
    WHERE event_id = p_event_id
      AND remind_offset = p_remind_offset
      AND occurrence_date = p_occurrence_date
      AND channel = 'email'
      AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cấp quyền gọi các hàm Cron cho mọi caller (Next.js server anon key, authenticated, service_role)
GRANT EXECUTE ON FUNCTION public.cron_get_active_events_and_settings() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cron_claim_reminder_lock(UUID, UUID, INT, DATE) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cron_commit_reminder_sent(UUID, INT, DATE) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cron_release_reminder_lock(UUID, INT, DATE) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. CẤU HÌNH LẬP LỊCH TỰ ĐỘNG CHẠY NGẦM 24/7 BẰNG PG_CRON & PG_NET
-- Gọi thẳng Webhook Vercel Production của ứng dụng mỗi 10 phút
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
GRANT USAGE ON SCHEMA cron TO postgres;

CREATE OR REPLACE FUNCTION public.invoke_send_reminders()
RETURNS void AS $$
BEGIN
    -- Gọi thẳng endpoint Next.js Production (chứa đầy đủ Nodemailer Gmail SMTP + Resend)
    PERFORM net.http_post(
        url := 'https://ber-birthday-event-reminder.vercel.app/api/cron/check-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'User-Agent', 'Supabase-pg_cron/1.0'
        ),
        body := jsonb_build_object(
            'trigger_source', 'pg_cron',
            'timestamp', now()
        ),
        timeout_milliseconds := 25000
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Hủy bỏ các job cũ nếu có
SELECT cron.unschedule('send-hourly-reminders') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-hourly-reminders'
);
SELECT cron.unschedule('send-minute-reminders') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-minute-reminders'
);
SELECT cron.unschedule('ber-auto-check-reminders') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'ber-auto-check-reminders'
);

-- Thiết lập chu kỳ chạy tự động ngầm mỗi 10 phút một lần (24/7)
SELECT cron.schedule(
    'ber-auto-check-reminders',
    '*/10 * * * *',
    'SELECT public.invoke_send_reminders();'
);
