-- ==============================================================================
-- MIGRATION 009: TÍCH HỢP EMAIL THỰC TẾ CHO USER & TỰ ĐỘNG EMAIL GOOGLE OAUTH
-- Ứng dụng: Nhắc Sinh Nhật & Sự Kiện (BER)
-- ==============================================================================

-- 1. Bổ sung cột email vào bảng profiles (nếu chưa có)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Đồng bộ email từ auth.users sang public.profiles cho tất cả các tài khoản hiện tại
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 3. Cập nhật Trigger tự động gán email khi có tài khoản mới (cả Email thường lẫn Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, email, username)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', NULL),
        new.email,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
        avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);

    INSERT INTO public.user_settings (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn lại Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. CẬP NHẬT HÀM ĐĂNG KÝ BẮT BUỘC EMAIL THỰC TẾ CỦA NGƯỜI DÙNG
CREATE OR REPLACE FUNCTION public.register_with_username(
    p_username TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_username TEXT;
    v_clean_email TEXT;
    v_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    v_clean_username := LOWER(TRIM(p_username));
    v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
    
    IF LENGTH(v_clean_username) < 3 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản phải có ít nhất 3 ký tự');
    END IF;

    IF LENGTH(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mật khẩu phải có ít nhất 6 ký tự');
    END IF;

    -- Bắt buộc email hợp lệ để gửi thông báo nhắc hẹn
    IF v_clean_email = '' OR v_clean_email NOT LIKE '%@%.%' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Vui lòng cung cấp địa chỉ email hợp lệ để nhận thông báo nhắc hẹn sự kiện.');
    END IF;

    -- CHẶN ĐĂNG KÝ USERNAME admin
    IF v_clean_username = 'admin' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản "admin" là Quản trị viên tối cao duy nhất của hệ thống.');
    END IF;

    -- Kiểm tra xem username đã tồn tại chưa
    IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = v_clean_username) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản này đã được sử dụng. Vui lòng chọn tên khác hoặc Đăng nhập.');
    END IF;

    -- Kiểm tra xem email đã tồn tại trong auth.users chưa
    IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_clean_email) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Địa chỉ email này đã được sử dụng bởi một tài khoản khác. Vui lòng sử dụng email khác hoặc Đăng nhập.');
    END IF;

    v_user_id := gen_random_uuid();
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        phone_change, phone_change_token, email_change_token_current, reauthentication_token
    ) VALUES (
        v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        v_clean_email, v_encrypted_pw, now(), now(),
        '{"provider":"email","providers":["email"],"role":"user"}'::jsonb,
        format('{"full_name":"%s","username":"%s","role":"user","email":"%s"}', COALESCE(p_full_name, v_clean_username), v_clean_username, v_clean_email)::jsonb,
        now(), now(), '', '', '', '', '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (v_user_id, v_user_id, v_user_id::text, format('{"sub":"%s","email":"%s"}', v_user_id::text, v_clean_email)::jsonb, 'email', now(), now(), now());

    INSERT INTO public.profiles (id, display_name, role, username, email, timezone, onboarded)
    VALUES (v_user_id, COALESCE(p_full_name, v_clean_username), 'user', v_clean_username, v_clean_email, 'Asia/Ho_Chi_Minh', true)
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role, 
        username = EXCLUDED.username, 
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email;

    INSERT INTO public.user_settings (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Đăng ký thành công', 'email', v_clean_email);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.register_with_username(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. HÀM TÌM EMAIL THEO USERNAME (HỖ TRỢ ĐĂNG NHẬP BẰNG USERNAME HOẶC EMAIL)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
    v_clean_username TEXT;
    v_email TEXT;
BEGIN
    v_clean_username := LOWER(TRIM(p_username));
    
    -- 1. Tìm trong bảng profiles
    SELECT email INTO v_email
    FROM public.profiles
    WHERE LOWER(username) = v_clean_username
    LIMIT 1;

    -- 2. Nếu chưa có trong profiles.email, tìm từ auth.users metadata
    IF v_email IS NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE LOWER(raw_user_meta_data->>'username') = v_clean_username
        LIMIT 1;
    END IF;

    -- 3. Fallback cho admin mặc định nếu chưa cập nhật
    IF v_email IS NULL AND v_clean_username = 'admin' THEN
        v_email := 'admin@ber-app.com';
    END IF;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated, service_role;

-- 6. HÀM ĐỔI EMAIL NHẬN THÔNG BÁO CHO CHÍNH NGƯỜI DÙNG (CẬP NHẬT CẢ AUTH.USERS & PROFILES)
CREATE OR REPLACE FUNCTION public.update_user_email(p_new_email TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_clean_email TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.');
    END IF;

    v_clean_email := LOWER(TRIM(p_new_email));
    IF v_clean_email = '' OR v_clean_email NOT LIKE '%@%.%' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Địa chỉ email không đúng định dạng.');
    END IF;

    -- Kiểm tra xem email đã được dùng bởi tài khoản khác chưa
    IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_clean_email AND id <> v_user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Địa chỉ email này đã được sử dụng bởi một tài khoản khác.');
    END IF;

    -- Cập nhật auth.users
    UPDATE auth.users
    SET email = v_clean_email,
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object('email', v_clean_email),
        updated_at = now()
    WHERE id = v_user_id;

    -- Cập nhật auth.identities
    UPDATE auth.identities
    SET identity_data = identity_data || jsonb_build_object('email', v_clean_email),
        updated_at = now()
    WHERE user_id = v_user_id AND provider = 'email';

    -- Cập nhật profiles
    UPDATE public.profiles
    SET email = v_clean_email
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Cập nhật email nhận thông báo thành công!', 'email', v_clean_email);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.update_user_email(TEXT) TO authenticated, service_role;
