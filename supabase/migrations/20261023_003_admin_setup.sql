-- ==============================================================================
-- MIGRATION 003: THIẾT LẬP VAI TRÒ ADMIN & TÀI KHOẢN ADMIN HỆ THỐNG
-- Tài khoản: admin (email: admin@ber.local) | Mật khẩu: admin123
-- ==============================================================================

-- 1. Thêm cột role vào bảng profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Hàm kiểm tra quyền Admin an toàn (Security Definer tránh đệ quy RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_role TEXT;
BEGIN
    SELECT role INTO current_role 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Phân quyền RLS cho Admin truy cập và chỉnh sửa toàn bộ dữ liệu hệ thống
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Admins can view all events"
    ON public.events FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all events" ON public.events;
CREATE POLICY "Admins can update all events"
    ON public.events FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete all events" ON public.events;
CREATE POLICY "Admins can delete all events"
    ON public.events FOR DELETE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());

-- 4. Bật extension pgcrypto để mã hóa mật khẩu
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5. Khởi tạo tài khoản Admin (admin@ber.local / admin123)
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@ber.local';
    
    IF admin_id IS NULL THEN
        admin_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES (
            admin_id,
            '00000000-0000-0000-0000-000000000000',
            'admin@ber.local',
            crypt('admin123', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Hệ Thống Admin"}',
            now(),
            now(),
            'authenticated',
            'authenticated'
        );
    ELSE
        UPDATE auth.users
        SET encrypted_password = crypt('admin123', gen_salt('bf')),
            email_confirmed_at = now()
        WHERE id = admin_id;
    END IF;

    -- Thiết lập profile với quyền admin
    INSERT INTO public.profiles (id, display_name, role, timezone, onboarded)
    VALUES (admin_id, 'Hệ Thống Admin', 'admin', 'Asia/Ho_Chi_Minh', true)
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', display_name = 'Hệ Thống Admin', onboarded = true;

    -- Thiết lập user_settings mặc định
    INSERT INTO public.user_settings (user_id)
    VALUES (admin_id)
    ON CONFLICT (user_id) DO NOTHING;
END $$;
