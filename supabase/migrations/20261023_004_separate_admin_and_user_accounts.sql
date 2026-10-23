-- ==============================================================================
-- MIGRATION 004: HỆ THỐNG ĐĂNG KÝ / ĐĂNG NHẬP BẰNG USERNAME THUẦN TÚY (KHÔNG CẦN EMAIL)
-- Sử dụng extensions.crypt và extensions.gen_salt chống lỗi function does not exist
-- ==============================================================================

-- 1. Bật extension pgcrypto trong schema extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Đảm bảo bảng profiles có đầy đủ cột: role và username
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles(LOWER(username)) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Tạo 2 View phân chia tài khoản trong Table Editor
CREATE OR REPLACE VIEW public.admin_accounts AS
SELECT p.id, p.username, p.display_name, p.role, p.timezone, p.created_at, u.email, u.last_sign_in_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin';

CREATE OR REPLACE VIEW public.user_accounts AS
SELECT p.id, p.username, p.display_name, p.role, p.timezone, p.created_at, u.email, u.last_sign_in_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'user';

-- 4. HÀM ĐĂNG KÝ TÀI KHOẢN BẰNG USERNAME TRỰC TIẾP (KHÔNG CẦN EMAIL, TỰ KÍCH HOẠT)
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
    v_role TEXT := 'user';
BEGIN
    v_clean_username := LOWER(TRIM(p_username));
    
    IF LENGTH(v_clean_username) < 3 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản phải có ít nhất 3 ký tự');
    END IF;

    IF LENGTH(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mật khẩu phải có ít nhất 6 ký tự');
    END IF;

    -- Kiểm tra xem username đã tồn tại chưa
    IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = v_clean_username) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản này đã được sử dụng. Vui lòng chọn tên khác hoặc Đăng nhập.');
    END IF;

    IF v_clean_username = 'admin' THEN
        v_role := 'admin';
    END IF;

    v_user_id := gen_random_uuid();
    v_email := v_clean_username || '@ber-app.com';
    
    -- Sử dụng extensions.crypt và extensions.gen_salt
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

    -- 1) Tạo trong auth.users với trạng thái đã xác thực
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        phone_change,
        phone_change_token,
        email_change_token_current,
        reauthentication_token
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_email,
        v_encrypted_pw,
        now(),
        now(),
        format('{"provider":"email","providers":["email"],"role":"%s"}', v_role)::jsonb,
        format('{"full_name":"%s","username":"%s","role":"%s"}', COALESCE(p_full_name, v_clean_username), v_clean_username, v_role)::jsonb,
        now(),
        now(),
        '', '', '', '', '', '', '', ''
    );

    -- 2) Tạo trong auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        v_user_id::text,
        format('{"sub":"%s","email":"%s"}', v_user_id::text, v_email)::jsonb,
        'email',
        now(),
        now(),
        now()
    );

    -- 3) Tạo trong public.profiles
    INSERT INTO public.profiles (id, display_name, role, username, timezone, onboarded)
    VALUES (v_user_id, COALESCE(p_full_name, v_clean_username), v_role, v_clean_username, 'Asia/Ho_Chi_Minh', true)
    ON CONFLICT (id) DO UPDATE 
    SET role = EXCLUDED.role,
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name;

    -- 4) Tạo settings mặc định
    INSERT INTO public.user_settings (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Đăng ký thành công', 'email', v_email);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Cấp quyền gọi hàm cho anon và authenticated
GRANT EXECUTE ON FUNCTION public.register_with_username(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
