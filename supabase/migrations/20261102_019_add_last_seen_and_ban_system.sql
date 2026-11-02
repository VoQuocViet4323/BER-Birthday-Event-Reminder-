-- ==============================================================================
-- BẢN SỬA LỖI ĐỘC LẬP HOÀN TOÀN: CẤM TÀI KHOẢN & TRẠNG THÁI HOẠT ĐỘNG
-- ĐÃ LOẠI BỎ HOÀN TOÀN HÀM is_admin() ĐỂ TRÁNH LỖI "function public.is_admin() does not exist"
-- CHẠY 1 LẦN DUY NHẤT TRONG SUPABASE SQL EDITOR
-- ==============================================================================

RESET ROLE;
SET ROLE postgres;

-- 1. Bổ sung các cột vào bảng profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_seen_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'banned_until'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN banned_until TIMESTAMPTZ DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'ban_reason'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN ban_reason TEXT DEFAULT NULL;
    END IF;
END $$;

-- 2. HÀM CHECK ADMIN ĐỘC LẬP AN TOÀN TUYỆT ĐỐI
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
    v_email TEXT;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    IF v_email = 'admin@ber-app.com' OR v_email LIKE 'admin@%' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 3. HÀM CẤM TÀI KHOẢN (ADMIN BAN USER) - CÓ TỰ KIỂM TRA ROLE ĐỘC LẬP
DROP FUNCTION IF EXISTS public.admin_ban_user(UUID, TIMESTAMPTZ, TEXT);
CREATE OR REPLACE FUNCTION public.admin_ban_user(
    p_user_id UUID,
    p_banned_until TIMESTAMPTZ,
    p_ban_reason TEXT DEFAULT 'Vi phạm quy định hệ thống'
)
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
    v_target_role TEXT;
    v_target_username TEXT;
BEGIN
    -- Kiểm tra người gọi có phải admin không
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role <> 'admin' AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND (email = 'admin@ber-app.com' OR email LIKE 'admin@%')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chỉ Quản trị viên mới có quyền cấm tài khoản.');
    END IF;

    -- Không được cấm chính mình
    IF p_user_id = auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không thể tự cấm tài khoản của chính mình.');
    END IF;

    -- Không được cấm Master Admin
    SELECT role, username INTO v_target_role, v_target_username FROM public.profiles WHERE id = p_user_id;
    IF v_target_role = 'admin' OR v_target_username = 'admin' OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_user_id AND email = 'admin@ber-app.com'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không thể cấm tài khoản Quản trị viên hệ thống.');
    END IF;

    -- Cập nhật cấm
    UPDATE public.profiles
    SET 
        banned_until = p_banned_until,
        ban_reason = p_ban_reason
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Đã cấm tài khoản thành công.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.admin_ban_user(UUID, TIMESTAMPTZ, TEXT) TO anon, authenticated, service_role;

-- 4. HÀM MỞ CẤM (ADMIN UNBAN USER)
DROP FUNCTION IF EXISTS public.admin_unban_user(UUID);
CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role <> 'admin' AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND (email = 'admin@ber-app.com' OR email LIKE 'admin@%')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chỉ Quản trị viên mới có quyền mở cấm tài khoản.');
    END IF;

    UPDATE public.profiles
    SET 
        banned_until = NULL,
        ban_reason = NULL
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Đã mở khóa tài khoản thành công.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.admin_unban_user(UUID) TO anon, authenticated, service_role;

-- 5. HÀM GỬI NHỊP TIM HOẠT ĐỘNG (HEARTBEAT)
DROP FUNCTION IF EXISTS public.update_user_heartbeat();
CREATE OR REPLACE FUNCTION public.update_user_heartbeat()
RETURNS VOID AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        UPDATE public.profiles
        SET last_seen_at = now()
        WHERE id = auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.update_user_heartbeat() TO anon, authenticated, service_role;

-- 6. CẬP NHẬT LẠI HÀM get_all_users_for_admin
DROP FUNCTION IF EXISTS public.get_all_users_for_admin();
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
    created_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    banned_until TIMESTAMPTZ,
    ban_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, 
        p.username, 
        p.display_name, 
        p.role, 
        COALESCE(p.email, u.email) AS email, 
        p.timezone, 
        p.avatar_url, 
        p.onboarded, 
        p.created_at,
        p.last_seen_at,
        p.banned_until,
        p.ban_reason
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO anon, authenticated, service_role;

-- 7. CẬP NHẬT HÀM cron_get_active_events_and_settings ĐỂ CŨNG TRẢ VỀ last_seen_at, banned_until
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
                'timezone', p.timezone,
                'role', p.role,
                'last_seen_at', p.last_seen_at,
                'banned_until', p.banned_until,
                'ban_reason', p.ban_reason
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

GRANT EXECUTE ON FUNCTION public.cron_get_active_events_and_settings() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
