-- ==============================================================================
-- MIGRATION 010: CÀI ĐẶT HÀM XÓA NGƯỜI DÙNG CHO ADMIN (admin_delete_user)
-- Chạy đoạn mã này trong Supabase Dashboard > SQL Editor để kích hoạt tính năng xóa tài khoản
-- ==============================================================================

RESET ROLE;
SET ROLE postgres;

-- 1. Hàm Quản trị viên xóa một tài khoản bất kỳ (Admin delete user)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
    v_target_username TEXT;
BEGIN
    -- 1.1 Kiểm tra người gọi có phải admin không
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role <> 'admin' AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND (email = 'admin@ber-app.com' OR email LIKE 'admin@%')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này.');
    END IF;

    -- 1.2 Không cho phép xóa nhầm chính mình qua hàm này
    IF p_target_user_id = auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không thể dùng chức năng này để tự xóa chính mình.');
    END IF;

    -- 1.3 Bảo vệ: Không cho phép xóa tài khoản Quản trị viên tối cao
    SELECT username INTO v_target_username FROM public.profiles WHERE id = p_target_user_id;
    IF v_target_username = 'admin' OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_target_user_id AND email = 'admin@ber-app.com'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'BẢO VỆ HỆ THỐNG: Không thể xóa tài khoản Quản trị viên tối cao.');
    END IF;

    -- 1.4 Xóa dữ liệu các bảng liên quan trong public schema
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

    -- 1.5 Xóa phiên và danh tính trong auth schema
    BEGIN
        DELETE FROM auth.identities WHERE user_id = p_target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        DELETE FROM auth.sessions WHERE user_id = p_target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 1.6 Xóa tài khoản gốc trong auth.users
    DELETE FROM auth.users WHERE id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Đã xóa người dùng vĩnh viễn khỏi hệ thống.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 2. Cấp quyền thực thi cho người dùng đã xác thực (authenticated) và service_role
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, service_role, anon;

-- 3. Làm mới schema cache của PostgREST ngay lập tức
NOTIFY pgrst, 'reload schema';
