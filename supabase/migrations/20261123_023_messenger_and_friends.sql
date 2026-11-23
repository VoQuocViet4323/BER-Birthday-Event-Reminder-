-- ==============================================================================
-- MIGRATION 023: MODULE MESSENGER - KẾT BẠN (EMAIL / QR CỐ ĐỊNH) & NHẮN TIN REALTIME
-- Hỗ trợ gửi ảnh, kiểm tra quyền kết bạn bằng RLS, Supabase Realtime & RPC bảo mật
-- Có thể chạy lại nhiều lần an toàn (Idempotent)
-- ==============================================================================

-- 1. Bổ sung cột friend_code (Mã QR cố định duy nhất) cho mỗi tài khoản trong profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS friend_code TEXT;

-- Hàm sinh mã kết bạn cố định từ UUID người dùng (ví dụ: BER-A1B2C3D4)
CREATE OR REPLACE FUNCTION public.generate_fixed_friend_code(p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN 'BER-' || UPPER(SUBSTRING(REPLACE(p_user_id::text, '-', ''), 1, 8));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Gán mã cố định cho tất cả tài khoản hiện có chưa có friend_code
UPDATE public.profiles
SET friend_code = public.generate_fixed_friend_code(id)
WHERE friend_code IS NULL OR trim(friend_code) = '';

-- Đảm bảo duy nhất và tự động sinh khi tạo profile mới
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_friend_code_unique
    ON public.profiles (UPPER(friend_code));

CREATE OR REPLACE FUNCTION public.set_default_friend_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.friend_code IS NULL OR trim(NEW.friend_code) = '' THEN
        NEW.friend_code := public.generate_fixed_friend_code(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_set_friend_code ON public.profiles;
CREATE TRIGGER trg_profiles_set_friend_code
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_default_friend_code();

-- 2. Tạo bảng friendships (Quan hệ kết bạn giữa 2 tài khoản)
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);

-- Đảm bảo mỗi cặp 2 tài khoản chỉ có duy nhất 1 bản ghi kết bạn (không phân biệt chiều gửi)
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_unique_pair
    ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships (addressee_id, status);

-- 3. Tạo bảng messages (Tin nhắn văn bản & hình ảnh lưu trữ vĩnh viễn trên DB theo thời gian thực)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    image_url TEXT DEFAULT NULL,
    image_storage_path TEXT DEFAULT NULL,
    image_width INTEGER DEFAULT NULL,
    image_height INTEGER DEFAULT NULL,
    image_size_bytes INTEGER DEFAULT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT messages_no_self CHECK (sender_id <> receiver_id),
    CONSTRAINT messages_non_empty CHECK (length(trim(content)) > 0 OR (image_url IS NOT NULL AND length(trim(image_url)) > 0))
);

-- Bổ sung an toàn các cột metadata ảnh nếu bảng messages đã được tạo trước đó
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_storage_path TEXT DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_width INTEGER DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_height INTEGER DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_size_bytes INTEGER DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_pair_time
    ON public.messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_pair_images
    ON public.messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC)
    WHERE image_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
    ON public.messages (receiver_id, is_read) WHERE is_read = false;

-- 4. Hàm kiểm tra 2 tài khoản đã chấp nhận kết bạn hay chưa
CREATE OR REPLACE FUNCTION public.are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
              (f.requester_id = user_a AND f.addressee_id = user_b)
              OR (f.requester_id = user_b AND f.addressee_id = user_a)
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated, service_role;

-- 5. Bật Row Level Security (RLS) & Policies cho friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships"
    ON public.friendships FOR SELECT
    TO authenticated
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests"
    ON public.friendships FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = requester_id AND requester_id <> addressee_id);

DROP POLICY IF EXISTS "Users can update their friendships" ON public.friendships;
CREATE POLICY "Users can update their friendships"
    ON public.friendships FOR UPDATE
    TO authenticated
    USING (auth.uid() = addressee_id OR auth.uid() = requester_id)
    WITH CHECK (auth.uid() = addressee_id OR auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friendships;
CREATE POLICY "Users can delete their friendships"
    ON public.friendships FOR DELETE
    TO authenticated
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 6. Bật Row Level Security (RLS) & Policies cho messages
-- BẮT BUỘC: Chỉ cho phép INSERT tin nhắn khi 2 người đã chấp nhận kết bạn!
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Friends can send messages to each other" ON public.messages;
CREATE POLICY "Friends can send messages to each other"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND sender_id <> receiver_id
        AND public.are_friends(sender_id, receiver_id)
    );

DROP POLICY IF EXISTS "Receivers can mark messages as read" ON public.messages;
CREATE POLICY "Receivers can mark messages as read"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Senders can delete their own messages" ON public.messages;
CREATE POLICY "Senders can delete their own messages"
    ON public.messages FOR DELETE
    TO authenticated
    USING (auth.uid() = sender_id);

-- 7. RPC Tìm người dùng để kết bạn bằng Email hoặc Mã QR cố định (bảo mật, không lộ toàn bộ bảng profiles)
DROP FUNCTION IF EXISTS public.find_user_for_friend(TEXT);
CREATE OR REPLACE FUNCTION public.find_user_for_friend(p_query TEXT)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    avatar_url TEXT,
    email TEXT,
    friend_code TEXT,
    last_seen_at TIMESTAMPTZ,
    friendship_id UUID,
    friendship_status TEXT,
    is_requester BOOLEAN
) AS $$
DECLARE
    v_me UUID := auth.uid();
    v_clean TEXT := UPPER(TRIM(COALESCE(p_query, '')));
    v_email_clean TEXT := LOWER(TRIM(COALESCE(p_query, '')));
BEGIN
    IF v_me IS NULL OR length(v_clean) < 3 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        COALESCE(NULLIF(TRIM(p.display_name), ''), NULLIF(TRIM(p.username), ''), split_part(COALESCE(p.email, u.email, ''), '@', 1), 'Người dùng') AS display_name,
        p.avatar_url,
        COALESCE(p.email, u.email) AS email,
        COALESCE(p.friend_code, public.generate_fixed_friend_code(p.id)) AS friend_code,
        p.last_seen_at,
        f.id AS friendship_id,
        f.status AS friendship_status,
        (f.requester_id = v_me) AS is_requester
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.friendships f
        ON (f.requester_id = v_me AND f.addressee_id = p.id)
        OR (f.requester_id = p.id AND f.addressee_id = v_me)
    WHERE p.id <> v_me
      AND (
          LOWER(TRIM(COALESCE(p.email, ''))) = v_email_clean
          OR LOWER(TRIM(COALESCE(u.email, ''))) = v_email_clean
          OR UPPER(TRIM(COALESCE(p.friend_code, public.generate_fixed_friend_code(p.id)))) = v_clean
      )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.find_user_for_friend(TEXT) TO authenticated, service_role;

-- 8. RPC Lấy toàn bộ mạng lưới bạn bè & lời mời kèm thông tin hồ sơ + tin nhắn gần nhất + số tin chưa đọc
DROP FUNCTION IF EXISTS public.get_my_friend_network();
CREATE OR REPLACE FUNCTION public.get_my_friend_network()
RETURNS TABLE (
    friendship_id UUID,
    status TEXT,
    requester_id UUID,
    addressee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    friend_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    email TEXT,
    friend_code TEXT,
    last_seen_at TIMESTAMPTZ,
    last_message_content TEXT,
    last_message_image_url TEXT,
    last_message_sender_id UUID,
    last_message_at TIMESTAMPTZ,
    unread_count BIGINT
) AS $$
DECLARE
    v_me UUID := auth.uid();
BEGIN
    IF v_me IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        f.id AS friendship_id,
        f.status,
        f.requester_id,
        f.addressee_id,
        f.created_at,
        f.updated_at,
        p.id AS friend_id,
        COALESCE(NULLIF(TRIM(p.display_name), ''), NULLIF(TRIM(p.username), ''), split_part(COALESCE(p.email, u.email, ''), '@', 1), 'Người dùng') AS display_name,
        p.avatar_url,
        COALESCE(p.email, u.email) AS email,
        COALESCE(p.friend_code, public.generate_fixed_friend_code(p.id)) AS friend_code,
        p.last_seen_at,
        lm.content AS last_message_content,
        lm.image_url AS last_message_image_url,
        lm.sender_id AS last_message_sender_id,
        lm.created_at AS last_message_at,
        COALESCE(uc.cnt, 0) AS unread_count
    FROM public.friendships f
    JOIN public.profiles p
        ON p.id = CASE WHEN f.requester_id = v_me THEN f.addressee_id ELSE f.requester_id END
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN LATERAL (
        SELECT m.content, m.image_url, m.sender_id, m.created_at
        FROM public.messages m
        WHERE (m.sender_id = v_me AND m.receiver_id = p.id)
           OR (m.sender_id = p.id AND m.receiver_id = v_me)
        ORDER BY m.created_at DESC
        LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT AS cnt
        FROM public.messages m
        WHERE m.sender_id = p.id
          AND m.receiver_id = v_me
          AND m.is_read = false
    ) uc ON true
    WHERE f.requester_id = v_me OR f.addressee_id = v_me
    ORDER BY COALESCE(lm.created_at, f.updated_at, f.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_my_friend_network() TO authenticated, service_role;

-- 9. RPC Đánh dấu đã đọc toàn bộ tin nhắn từ 1 người bạn
DROP FUNCTION IF EXISTS public.mark_conversation_read(UUID);
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_friend_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_me UUID := auth.uid();
    v_updated INTEGER := 0;
BEGIN
    IF v_me IS NULL THEN
        RETURN 0;
    END IF;

    UPDATE public.messages
    SET is_read = true, read_at = now()
    WHERE sender_id = p_friend_id
      AND receiver_id = v_me
      AND is_read = false;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated, service_role;

-- 10. Bật Supabase Realtime cho bảng messages và friendships
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 11. Tạo Storage Bucket 'chat-images' cho ảnh gửi trong Messenger (tối đa 15MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-images',
    'chat-images',
    true,
    15728640, -- 15MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

DROP POLICY IF EXISTS "Public can view chat images" ON storage.objects;
CREATE POLICY "Public can view chat images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Users can upload their own chat images" ON storage.objects;
CREATE POLICY "Users can upload their own chat images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'chat-images' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete their own chat images" ON storage.objects;
CREATE POLICY "Users can delete their own chat images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'chat-images' AND
        (auth.uid())::text = (storage.foldername(name))[1]
    );

NOTIFY pgrst, 'reload schema';
