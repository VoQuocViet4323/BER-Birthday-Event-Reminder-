-- ==============================================================================
-- Migration: 20261025_016_sync_display_name_to_auth_users.sql
-- Mục đích: Đồng bộ tên hiển thị (display_name) từ public.profiles sang auth.users
-- Giúp bảng "Authentication > Users" trên Supabase Dashboard hiển thị đúng tên mới đổi
-- ==============================================================================

-- 1. Đồng bộ ngay lập tức toàn bộ display_name hiện tại từ public.profiles sang auth.users
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'full_name', p.display_name,
        'display_name', p.display_name,
        'name', p.display_name
    )
FROM public.profiles p
WHERE u.id = p.id AND p.display_name IS NOT NULL AND p.display_name != '';

-- 2. Trigger tự động cập nhật auth.users mỗi khi public.profiles.display_name thay đổi
CREATE OR REPLACE FUNCTION public.sync_profile_display_name_to_auth()
RETURNS trigger AS $$
BEGIN
    IF (NEW.display_name IS DISTINCT FROM OLD.display_name AND NEW.display_name IS NOT NULL) THEN
        UPDATE auth.users
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object(
                'full_name', NEW.display_name,
                'display_name', NEW.display_name,
                'name', NEW.display_name
            )
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_display_name_updated ON public.profiles;
CREATE TRIGGER on_profile_display_name_updated
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_display_name_to_auth();
