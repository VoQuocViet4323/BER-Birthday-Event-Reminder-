-- ==============================================================================
-- MIGRATION 022: THÊM CỘT IMAGES CHO BẢNG DIARIES & STORAGE BUCKET DIARY-IMAGES
-- ==============================================================================

-- 1. Thêm cột images (mảng URL ảnh đính kèm nhật ký) vào bảng public.diaries
ALTER TABLE public.diaries
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 2. Tạo bucket 'diary-images' nếu chưa tồn tại (hỗ trợ ảnh lớn tới 50MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'diary-images',
    'diary-images',
    true,
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

-- 3. Tạo các RLS policy cho bucket 'diary-images'
-- (Lưu ý: Supabase đã bật sẵn RLS trên storage.objects nên KHÔNG cần chạy ALTER TABLE storage.objects)

-- 4. Policy xem ảnh nhật ký (Công khai theo URL)
DROP POLICY IF EXISTS "Public can view diary images" ON storage.objects;
CREATE POLICY "Public can view diary images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'diary-images');

-- 5. Policy tải lên ảnh nhật ký của chính mình
DROP POLICY IF EXISTS "Users can upload their own diary images" ON storage.objects;
CREATE POLICY "Users can upload their own diary images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'diary-images' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- 6. Policy cập nhật ảnh nhật ký của chính mình
DROP POLICY IF EXISTS "Users can update their own diary images" ON storage.objects;
CREATE POLICY "Users can update their own diary images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'diary-images' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- 7. Policy xóa ảnh nhật ký của chính mình
DROP POLICY IF EXISTS "Users can delete their own diary images" ON storage.objects;
CREATE POLICY "Users can delete their own diary images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'diary-images' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );
