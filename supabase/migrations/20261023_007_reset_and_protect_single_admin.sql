-- ==============================================================================
-- MIGRATION 007: RESET VÀ BẢO VỆ DUY NHẤT 1 TÀI KHOẢN ADMIN (KHÔNG THỂ XÓA)
-- Sử dụng RESET ROLE và SECURITY DEFINER tránh lỗi 42501
-- ==============================================================================

-- 0. Đảm bảo chạy dưới quyền tối cao postgres
RESET ROLE;
SET ROLE postgres;

-- Bật extension pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Tạm gỡ trigger cũ để reset sạch sẽ
DROP TRIGGER IF EXISTS trg_prevent_delete_admin ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_admin ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_single_admin ON public.profiles;

-- 1. HÀM THỰC THI RESET (Toàn quyền thao tác auth.users)
CREATE OR REPLACE FUNCTION public.reset_master_admin()
RETURNS JSONB AS $$
DECLARE
    r RECORD;
    new_admin_id UUID := gen_random_uuid();
    admin_email TEXT := 'admin@ber-app.com';
    encrypted_pw TEXT;
BEGIN
    -- 1.1 Tìm và xóa sạch mọi tài khoản admin cũ nếu còn tồn tại
    FOR r IN (
        SELECT id FROM auth.users 
        WHERE email LIKE 'admin@%' 
           OR email = 'admin@ber.local'
           OR id IN (SELECT id FROM public.profiles WHERE username = 'admin' OR role = 'admin')
    ) LOOP
        BEGIN DELETE FROM public.notification_logs WHERE user_id = r.id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.events WHERE user_id = r.id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.user_settings WHERE user_id = r.id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.profiles WHERE id = r.id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM auth.identities WHERE user_id = r.id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM auth.sessions WHERE user_id = r.id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM auth.users WHERE id = r.id; EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;

    -- 1.2 Mã hóa mật khẩu admin123
    encrypted_pw := extensions.crypt('admin123', extensions.gen_salt('bf'));

    -- 1.3 Tạo tài khoản mới trong auth.users
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        phone_change, phone_change_token, email_change_token_current, reauthentication_token
    ) VALUES (
        new_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        admin_email, encrypted_pw, now(), now(),
        '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
        '{"full_name":"Quản Trị Hệ Thống","username":"admin","role":"admin"}'::jsonb,
        now(), now(), '', '', '', '', '', '', '', ''
    );

    -- 1.4 Tạo bản ghi định danh trong auth.identities
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (new_admin_id, new_admin_id, new_admin_id::text, format('{"sub":"%s","email":"%s"}', new_admin_id::text, admin_email)::jsonb, 'email', now(), now(), now());

    -- 1.5 Tạo bản ghi hồ sơ trong public.profiles (role = 'admin')
    INSERT INTO public.profiles (id, display_name, role, username, timezone, onboarded)
    VALUES (new_admin_id, 'Quản Trị Hệ Thống', 'admin', 'admin', 'Asia/Ho_Chi_Minh', true)
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', username = 'admin', display_name = 'Quản Trị Hệ Thống';

    -- 1.6 Tạo cài đặt mặc định trong public.user_settings
    INSERT INTO public.user_settings (user_id)
    VALUES (new_admin_id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Đã khởi tạo tài khoản admin mới thành công!', 'admin_id', new_admin_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

-- THỰC THI KHỞI TẠO ADMIN NGAY LẬP TỨC
SELECT public.reset_master_admin();

-- 2. CẬP NHẬT HÀM ĐĂNG KÝ: CẤM TẠO THÊM USERNAME "admin" (DUY NHẤT 1 ADMIN)
CREATE OR REPLACE FUNCTION public.register_with_username(
    p_username TEXT,
    p_password TEXT,
    p_full_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_clean_username TEXT;
    v_user_id UUID;
    v_email TEXT;
    v_encrypted_pw TEXT;
BEGIN
    v_clean_username := LOWER(TRIM(p_username));
    
    IF LENGTH(v_clean_username) < 3 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản phải có ít nhất 3 ký tự');
    END IF;

    IF LENGTH(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mật khẩu phải có ít nhất 6 ký tự');
    END IF;

    -- CHẶN ĐĂNG KÝ USERNAME admin
    IF v_clean_username = 'admin' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản "admin" là Quản trị viên tối cao duy nhất của hệ thống và không thể đăng ký mới.');
    END IF;

    -- Kiểm tra xem username đã tồn tại chưa
    IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = v_clean_username) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản này đã được sử dụng. Vui lòng chọn tên khác hoặc Đăng nhập.');
    END IF;

    v_user_id := gen_random_uuid();
    v_email := v_clean_username || '@ber-app.com';
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        phone_change, phone_change_token, email_change_token_current, reauthentication_token
    ) VALUES (
        v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        v_email, v_encrypted_pw, now(), now(),
        '{"provider":"email","providers":["email"],"role":"user"}'::jsonb,
        format('{"full_name":"%s","username":"%s","role":"user"}', COALESCE(p_full_name, v_clean_username), v_clean_username)::jsonb,
        now(), now(), '', '', '', '', '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_user_id, v_user_id, v_user_id::text, format('{"sub":"%s","email":"%s"}', v_user_id::text, v_email)::jsonb, 'email', now(), now(), now());

    INSERT INTO public.profiles (id, display_name, role, username, timezone, onboarded)
    VALUES (v_user_id, COALESCE(p_full_name, v_clean_username), 'user', v_clean_username, 'Asia/Ho_Chi_Minh', true)
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, username = EXCLUDED.username, display_name = EXCLUDED.display_name;

    INSERT INTO public.user_settings (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Đăng ký thành công', 'email', v_email);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.register_with_username(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 3. HÀM XÓA TÀI KHOẢN VĨNH VIỄN: KHÓA BẢO VỆ TUYỆT ĐỐI ADMIN
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_username TEXT;
    v_role TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa đăng nhập hoặc phiên đã kết thúc.');
    END IF;

    -- KHÓA BẢO VỆ: Nếu là tài khoản admin -> TUYỆT ĐỐI KHÔNG CHO PHÉP XÓA
    SELECT username, role INTO v_username, v_role FROM public.profiles WHERE id = v_user_id;
    IF v_username = 'admin' OR v_role = 'admin' OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = v_user_id AND (email LIKE 'admin@%' OR email = 'admin@ber.local')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'BẢO VỆ HỆ THỐNG: Tài khoản Quản trị viên tối cao (admin) được bảo vệ cố định và không thể xóa trên web!');
    END IF;

    -- Xóa dữ liệu user thường
    BEGIN DELETE FROM public.notification_logs WHERE user_id = v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.events WHERE user_id = v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.user_settings WHERE user_id = v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.profiles WHERE id = v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM auth.identities WHERE user_id = v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM auth.sessions WHERE user_id = v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    DELETE FROM auth.users WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Đã xóa tài khoản vĩnh viễn.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated, service_role;

-- 4. TRIGGER BẢO VỆ CHỐNG XÓA TRỰC TIẾP ADMIN TẠI DATABASE
CREATE OR REPLACE FUNCTION public.prevent_delete_admin_account()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.username = 'admin' OR OLD.role = 'admin' THEN
        RAISE EXCEPTION 'BẢO VỆ HỆ THỐNG: Tài khoản Quản trị viên tối cao (admin) được bảo vệ vĩnh viễn và không thể bị xóa!';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_prevent_delete_admin
BEFORE DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_delete_admin_account();

-- 5. TRIGGER BẢO VỆ CHỐNG HẠ QUYỀN HOẶC ĐỔI USERNAME CỦA ADMIN
CREATE OR REPLACE FUNCTION public.protect_single_admin()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.username = 'admin' AND NEW.username <> 'admin' THEN
        RAISE EXCEPTION 'BẢO VỆ HỆ THỐNG: Không được phép thay đổi tên tài khoản Quản trị viên tối cao (admin)!';
    END IF;
    IF OLD.username = 'admin' AND NEW.role <> 'admin' THEN
        RAISE EXCEPTION 'BẢO VỆ HỆ THỐNG: Không được phép hạ quyền tài khoản Quản trị viên tối cao (admin)!';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_single_admin
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_single_admin();

-- 6. LÀM MỚI SCHEMA CACHE CHO POSTGREST
NOTIFY pgrst, 'reload schema';
