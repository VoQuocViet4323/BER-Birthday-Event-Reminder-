-- ==============================================================================
-- MIGRATION 018: KHÔI PHỤC HÀM IS_ADMIN() & CẤP QUYỀN TOÀN DIỆN CHO ADMIN
-- Khắc phục triệt để lỗi "function public.is_admin() does not exist"
-- Giúp trang Quản trị viên (Admin Panel) xem và quản lý đầy đủ 100% người dùng & sự kiện
-- ==============================================================================

-- 1. Đảm bảo chạy dưới quyền postgres cao nhất
RESET ROLE;
SET ROLE postgres;

-- 2. TẠO HÀM KIỂM TRA QUYỀN ADMIN (Security Definer tránh đệ quy RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
    v_email TEXT;
BEGIN
    -- 2.1 Kiểm tra role trong bảng profiles
    SELECT role INTO v_role 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    IF v_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 2.2 Kiểm tra fallback qua auth.users (nếu profiles chưa kịp đồng bộ)
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = auth.uid();

    IF v_email = 'admin@ber-app.com' OR v_email LIKE 'admin@%' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Cấp quyền gọi hàm cho authenticated và anon
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 3. HÀM RPC BẢO MẬT DÀNH RIÊNG CHO ADMIN XEM TOÀN BỘ DANH SÁCH NGƯỜI DÙNG
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
    SELECT 
        p.id, 
        p.username, 
        p.display_name, 
        p.role, 
        COALESCE(p.email, u.email) AS email, 
        p.timezone, 
        p.avatar_url, 
        p.onboarded, 
        p.created_at
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;

-- 4. HÀM RPC BẢO MẬT DÀNH RIÊNG CHO ADMIN XEM TOÀN BỘ SỰ KIỆN
CREATE OR REPLACE FUNCTION public.get_all_events_for_admin()
RETURNS JSONB AS $$
DECLARE
    v_events JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền xem danh sách này';
    END IF;

    SELECT COALESCE(jsonb_agg(
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
            'enabled', e.enabled,
            'created_at', e.created_at,
            'updated_at', e.updated_at,
            'owner_name', COALESCE(p.display_name, 'Người dùng')
        )
    ), '[]'::jsonb) INTO v_events
    FROM public.events e
    LEFT JOIN public.profiles p ON e.user_id = p.id;

    RETURN v_events;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_all_events_for_admin() TO authenticated;

-- 5. CẬP NHẬT CHÍNH SÁCH RLS CHO BẢNG PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- 6. CẬP NHẬT CHÍNH SÁCH RLS CHO BẢNG EVENTS
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Admins can view all events"
    ON public.events FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all events" ON public.events;
CREATE POLICY "Admins can update all events"
    ON public.events FOR UPDATE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete all events" ON public.events;
CREATE POLICY "Admins can delete all events"
    ON public.events FOR DELETE
    TO authenticated
    USING (public.is_admin());

