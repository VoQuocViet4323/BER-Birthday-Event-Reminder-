-- ==============================================================================
-- MIGRATION 008: HÀM ADMIN RESET MẬT KHẨU CHO NGƯỜI DÙNG & ĐỔI TRỰC TIẾP TRÊN DATABASE
-- Chạy đoạn mã này trong Supabase Dashboard > SQL Editor để kích hoạt tính năng
-- ==============================================================================

-- 0. Chạy dưới quyền postgres tối cao để tránh lỗi 42501
RESET ROLE;
SET ROLE postgres;

-- 1. Bật extension pgcrypto trong schema extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. HÀM ADMIN ĐẶT LẠI MẬT KHẨU CHO NGƯỜI DÙNG TRỰC TIẾP TRÊN DB (Bcrypt)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_target_user_id UUID,
    p_new_password TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
    v_encrypted_pw TEXT;
    v_target_username TEXT;
BEGIN
    -- 2.1 Kiểm tra quyền của người gọi (Admin tối cao)
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role <> 'admin' AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND (email = 'admin@ber-app.com' OR email LIKE 'admin@%')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chỉ Quản trị viên tối cao mới có quyền đổi mật khẩu người dùng.');
    END IF;

    -- 2.2 Kiểm tra độ dài mật khẩu mới
    IF LENGTH(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
    END IF;

    -- 2.3 Bảo vệ: Không cho phép đổi mật khẩu tài khoản Quản trị viên tối cao qua hàm này
    SELECT username INTO v_target_username FROM public.profiles WHERE id = p_target_user_id;
    IF v_target_username = 'admin' OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_target_user_id AND email = 'admin@ber-app.com'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'BẢO VỆ HỆ THỐNG: Không thể dùng chức năng này cho tài khoản Quản trị viên tối cao.');
    END IF;

    -- 2.4 Mã hóa mật khẩu mới bằng thuật toán bcrypt an toàn
    v_encrypted_pw := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

    -- 2.5 CẬP NHẬT TRỰC TIẾP MẬT KHẨU TRONG auth.users
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        updated_at = now()
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Đã đặt lại mật khẩu thành công trực tiếp trên Database.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

-- 3. Cấp quyền thực thi hàm cho authenticated và service_role
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;

-- 4. HÀM ADMIN XÓA TÀI KHOẢN NGƯỜI DÙNG VĨNH VIỄN
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
    v_target_username TEXT;
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role <> 'admin' AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND (email = 'admin@ber-app.com' OR email LIKE 'admin@%')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này.');
    END IF;

    IF p_target_user_id = auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không thể dùng chức năng này để tự xóa chính mình.');
    END IF;

    BEGIN DELETE FROM public.notification_logs WHERE user_id = p_target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.events WHERE user_id = p_target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.user_settings WHERE user_id = p_target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.profiles WHERE id = p_target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM auth.identities WHERE user_id = p_target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM auth.sessions WHERE user_id = p_target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    DELETE FROM auth.users WHERE id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Đã xóa người dùng vĩnh viễn khỏi hệ thống.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, service_role;

-- 5. Làm mới schema cache cho Supabase PostgREST
NOTIFY pgrst, 'reload schema';
