-- ==============================================================================
-- MIGRATION 005: KHÔI PHỤC VÀ KHÓA BẢO VỆ TÀI KHOẢN ADMIN TỐI CAO
-- Chống tai nạn tự hạ quyền hoặc hạ quyền tài khoản "admin"
-- ==============================================================================

-- 1. Khôi phục quyền Admin ngay lập tức trên bảng profiles (không đụng auth.users để tránh lỗi 42501)
UPDATE public.profiles
SET role = 'admin'
WHERE username = 'admin' 
   OR display_name = 'Hệ Thống Admin'
RETURNING id, display_name, username, role;

-- 2. Hàm trigger bảo vệ tài khoản Quản trị tối cao (admin)
-- Ngăn chặn tuyệt đối mọi hành vi hạ quyền tài khoản admin xuống user
CREATE OR REPLACE FUNCTION public.protect_admin_account()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu là tài khoản admin mà bị sửa role khác 'admin' -> Chặn lại và báo lỗi
    IF (OLD.username = 'admin' OR OLD.display_name = 'Hệ Thống Admin') 
       AND NEW.role <> 'admin' THEN
        RAISE EXCEPTION 'BẢO VỆ HỆ THỐNG: Không được phép hạ quyền tài khoản Quản trị viên tối cao (admin)!';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Gắn trigger vào bảng profiles
DROP TRIGGER IF EXISTS trg_protect_admin ON public.profiles;
CREATE TRIGGER trg_protect_admin
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_admin_account();
