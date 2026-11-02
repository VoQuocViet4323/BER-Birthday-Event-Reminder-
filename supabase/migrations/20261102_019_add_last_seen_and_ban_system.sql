-- ==============================================================================
-- MIGRATION 019: THỜI GIAN THỰC LAST_SEEN VÀ HỆ THỐNG CẤM (BAN) TÀI KHOẢN
-- Cung cấp trạng thái Online/Offline/Vừa hoạt động thời gian thực
-- Cung cấp khả năng Cấm (Ban) tài khoản người dùng theo thời hạn hoặc vĩnh viễn
-- ==============================================================================

RESET ROLE;
SET ROLE postgres;

-- 1. Bổ sung các cột last_seen_at, banned_until, ban_reason vào bảng profiles
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

-- 2. HÀM RPC ĐỒNG BỘ NHỊP TIM HOẠT ĐỘNG (HEARTBEAT) THỜI GIAN THỰC
-- Được gọi định kỳ từ ứng dụng của người dùng khi đang mở tab
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

GRANT EXECUTE ON FUNCTION public.update_user_heartbeat() TO authenticated;

-- 3. HÀM RPC QUẢN TRỊ VIÊN CẤM (BAN) TÀI KHOẢN NGƯỜI DÙNG
-- Cho phép cấm theo số giờ hoặc truyền ngày giờ cụ thể, hoặc vĩnh viễn (năm 2099)
DROP FUNCTION IF EXISTS public.admin_ban_user(UUID, TIMESTAMPTZ, TEXT);
CREATE OR REPLACE FUNCTION public.admin_ban_user(
    p_user_id UUID,
    p_banned_until TIMESTAMPTZ,
    p_ban_reason TEXT DEFAULT 'Vi phạm tiêu chuẩn cộng đồng'
)
RETURNS VOID AS $$
DECLARE
    v_target_role TEXT;
    v_target_username TEXT;
BEGIN
    -- 3.1 Chỉ Admin mới được thực hiện
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền cấm tài khoản';
    END IF;

    -- 3.2 Không được phép tự cấm chính mình
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Không thể tự cấm tài khoản của chính mình';
    END IF;

    -- 3.3 Kiểm tra mục tiêu có phải Admin khác hoặc Master Admin không
    SELECT role, username INTO v_target_role, v_target_username
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_target_role = 'admin' OR v_target_username = 'admin' THEN
        RAISE EXCEPTION 'Không thể cấm tài khoản Quản trị viên hệ thống';
    END IF;

    -- 3.4 Cập nhật cấm tài khoản
    UPDATE public.profiles
    SET 
        banned_until = p_banned_until,
        ban_reason = p_ban_reason
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.admin_ban_user(UUID, TIMESTAMPTZ, TEXT) TO authenticated;

-- 4. HÀM RPC MỞ KHÓA (GỠ CẤM / UNBAN) TÀI KHOẢN
DROP FUNCTION IF EXISTS public.admin_unban_user(UUID);
CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền mở khóa tài khoản';
    END IF;

    UPDATE public.profiles
    SET 
        banned_until = NULL,
        ban_reason = NULL
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.admin_unban_user(UUID) TO authenticated;

-- 5. CẬP NHẬT LẠI HÀM get_all_users_for_admin ĐỂ TRẢ VỀ THÊM last_seen_at, banned_until, ban_reason
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
        p.created_at,
        p.last_seen_at,
        p.banned_until,
        p.ban_reason
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;

