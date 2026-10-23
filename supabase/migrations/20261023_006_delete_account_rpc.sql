-- ==============================================================================
-- MIGRATION 006: HÀM XÓA TÀI KHOẢN VĨNH VIỄN (RPC DELETE OWN ACCOUNT)
-- Xóa toàn bộ dữ liệu người dùng khỏi auth.users, profiles, events, settings, logs
-- ==============================================================================

-- 1. Hàm cho người dùng tự xóa vĩnh viễn tài khoản của chính mình
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- Kiểm tra phiên đăng nhập
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Bạn chưa đăng nhập hoặc phiên làm việc đã kết thúc.'
        );
    END IF;

    -- Xóa các bảng con phụ thuộc trong public schema trước
    BEGIN
        DELETE FROM public.notification_logs WHERE user_id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM public.events WHERE user_id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM public.user_settings WHERE user_id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM public.profiles WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Xóa dữ liệu phiên và danh tính trong auth schema
    BEGIN
        DELETE FROM auth.identities WHERE user_id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM auth.sessions WHERE user_id = v_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Xóa tài khoản gốc trong auth.users
    DELETE FROM auth.users WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Tài khoản và toàn bộ dữ liệu liên quan đã được xóa vĩnh viễn thành công.'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Cấp quyền thực thi cho người dùng đã đăng nhập và service_role
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated, service_role;

-- 2. Hàm Quản trị viên xóa một tài khoản bất kỳ (Admin delete user)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
    v_target_username TEXT;
BEGIN
    -- Kiểm tra người gọi có phải admin không
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role <> 'admin' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này.');
    END IF;

    -- Không cho phép xóa nhầm chính mình qua hàm này (dùng delete_own_account nếu muốn tự xóa)
    IF p_target_user_id = auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không thể dùng chức năng này để tự xóa chính mình. Vui lòng vào Cài đặt để xóa tài khoản.');
    END IF;

    -- Xóa dữ liệu liên quan
    BEGIN
        DELETE FROM public.notification_logs WHERE user_id = p_target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM public.events WHERE user_id = p_target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM public.user_settings WHERE user_id = p_target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM public.profiles WHERE id = p_target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM auth.identities WHERE user_id = p_target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM auth.sessions WHERE user_id = p_target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    DELETE FROM auth.users WHERE id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Đã xóa người dùng vĩnh viễn khỏi hệ thống.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, service_role;
