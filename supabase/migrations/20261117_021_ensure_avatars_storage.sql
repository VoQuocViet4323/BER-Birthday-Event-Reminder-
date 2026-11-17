-- ==============================================================================
-- MIGRATION: ENSURE AVATARS STORAGE BUCKET & RLS POLICIES
-- ==============================================================================

-- 1. Tạo bucket 'avatars' nếu chưa tồn tại
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Đảm bảo RLS được bật trên storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy xem ảnh đại diện (Công khai)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- 4. Policy tải lên ảnh đại diện của chính mình
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- 5. Policy cập nhật ảnh đại diện của chính mình
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );

-- 6. Policy xóa ảnh đại diện của chính mình
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );
