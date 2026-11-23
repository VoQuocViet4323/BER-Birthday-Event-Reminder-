-- ==============================================================================
-- MIGRATION 024: TƯƠNG TÁC TIN NHẮN MESSENGER NÂNG CAO
-- Chỉnh sửa, Thu hồi (mọi người / chỉ phía mình), Thả cảm xúc, Trả lời (Reply), Ghim (tối đa 5)
-- Tất cả lưu trữ bền vững trên DB & bảo mật bằng RPC SECURITY DEFINER + Realtime
-- Có thể chạy lại nhiều lần an toàn (Idempotent)
-- ==============================================================================

-- 1. Bổ sung các cột tương tác vào bảng public.messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_recalled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recalled_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS hidden_for_user_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS last_reaction_emoji TEXT DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS last_reaction_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS last_reaction_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Nới lỏng ràng buộc messages_non_empty để cho phép tin nhắn đã thu hồi có content = '' và image_url = NULL
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_non_empty;
ALTER TABLE public.messages ADD CONSTRAINT messages_non_empty
    CHECK (
        is_recalled = true
        OR length(trim(content)) > 0
        OR (image_url IS NOT NULL AND length(trim(image_url)) > 0)
    );

-- Index tối ưu cho tin nhắn ghim & trả lời
CREATE INDEX IF NOT EXISTS idx_messages_pair_pinned
    ON public.messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), pinned_at DESC)
    WHERE is_pinned = true AND is_recalled = false;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to
    ON public.messages (reply_to_id)
    WHERE reply_to_id IS NOT NULL;

-- 2. RPC Chỉnh sửa tin nhắn của chính mình (chỉ sender được phép, không cho sửa tin đã thu hồi)
DROP FUNCTION IF EXISTS public.edit_my_message(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.edit_my_message(p_message_id UUID, p_new_content TEXT)
RETURNS JSONB AS $$
DECLARE
    v_me UUID := auth.uid();
    v_clean TEXT := trim(COALESCE(p_new_content, ''));
    v_row public.messages%ROWTYPE;
BEGIN
    IF v_me IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa đăng nhập.');
    END IF;

    IF length(v_clean) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nội dung tin nhắn không được để trống.');
    END IF;

    SELECT * INTO v_row FROM public.messages WHERE id = p_message_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy tin nhắn.');
    END IF;

    IF v_row.sender_id <> v_me THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình.');
    END IF;

    IF v_row.is_recalled THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không thể chỉnh sửa tin nhắn đã thu hồi.');
    END IF;

    UPDATE public.messages
    SET content = v_clean, edited_at = now()
    WHERE id = p_message_id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.edit_my_message(UUID, TEXT) TO authenticated, service_role;

-- 3. RPC Thu hồi tin nhắn với MỌI NGƯỜI (chỉ sender được phép)
DROP FUNCTION IF EXISTS public.recall_message_for_everyone(UUID);
CREATE OR REPLACE FUNCTION public.recall_message_for_everyone(p_message_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_me UUID := auth.uid();
    v_row public.messages%ROWTYPE;
    v_old_image TEXT;
BEGIN
    IF v_me IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa đăng nhập.');
    END IF;

    SELECT * INTO v_row FROM public.messages WHERE id = p_message_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy tin nhắn.');
    END IF;

    IF v_row.sender_id <> v_me THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chỉ người gửi mới có quyền thu hồi tin nhắn với mọi người.');
    END IF;

    v_old_image := v_row.image_url;

    UPDATE public.messages
    SET
        is_recalled = true,
        recalled_at = now(),
        content = '',
        image_url = NULL,
        is_pinned = false,
        pinned_at = NULL,
        pinned_by = NULL,
        reactions = '{}'::jsonb,
        last_reaction_emoji = NULL,
        last_reaction_by = NULL,
        last_reaction_at = NULL
    WHERE id = p_message_id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true, 'old_image_url', v_old_image, 'data', to_jsonb(v_row));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.recall_message_for_everyone(UUID) TO authenticated, service_role;

-- 4. RPC Xóa tin nhắn CHỈ Ở PHÍA MÌNH (áp dụng cho cả tin nhắn của mình lẫn của người khác, người kia vẫn thấy bình thường)
DROP FUNCTION IF EXISTS public.hide_message_for_me(UUID);
CREATE OR REPLACE FUNCTION public.hide_message_for_me(p_message_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_me UUID := auth.uid();
    v_row public.messages%ROWTYPE;
BEGIN
    IF v_me IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa đăng nhập.');
    END IF;

    SELECT * INTO v_row FROM public.messages WHERE id = p_message_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy tin nhắn.');
    END IF;

    IF v_row.sender_id <> v_me AND v_row.receiver_id <> v_me THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn không có quyền thao tác với tin nhắn này.');
    END IF;

    UPDATE public.messages
    SET hidden_for_user_ids = CASE
        WHEN v_me = ANY(COALESCE(hidden_for_user_ids, '{}'::uuid[])) THEN hidden_for_user_ids
        ELSE array_append(COALESCE(hidden_for_user_ids, '{}'::uuid[]), v_me)
    END
    WHERE id = p_message_id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.hide_message_for_me(UUID) TO authenticated, service_role;

-- 4b. RPC Xóa TOÀN BỘ đoạn chat CHỈ Ở PHÍA MÌNH (người còn lại vẫn giữ nguyên 100% tin nhắn & ảnh)
DROP FUNCTION IF EXISTS public.clear_conversation_for_me(UUID);
CREATE OR REPLACE FUNCTION public.clear_conversation_for_me(p_friend_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_me UUID := auth.uid();
    v_affected INTEGER := 0;
BEGIN
    IF v_me IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa đăng nhập.');
    END IF;

    IF p_friend_id IS NULL OR p_friend_id = v_me THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tài khoản đối thoại không hợp lệ.');
    END IF;

    UPDATE public.messages
    SET
        hidden_for_user_ids = CASE
            WHEN v_me = ANY(COALESCE(hidden_for_user_ids, '{}'::uuid[])) THEN hidden_for_user_ids
            ELSE array_append(COALESCE(hidden_for_user_ids, '{}'::uuid[]), v_me)
        END,
        is_read = CASE WHEN receiver_id = v_me THEN true ELSE is_read END,
        read_at = CASE WHEN receiver_id = v_me THEN COALESCE(read_at, now()) ELSE read_at END
    WHERE ((sender_id = v_me AND receiver_id = p_friend_id)
        OR (sender_id = p_friend_id AND receiver_id = v_me))
      AND NOT (v_me = ANY(COALESCE(hidden_for_user_ids, '{}'::uuid[])));

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'hidden_count', v_affected);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.clear_conversation_for_me(UUID) TO authenticated, service_role;

-- 5. RPC Thả / Đổi / Gỡ cảm xúc tin nhắn (cả 2 phía đều thả được)
DROP FUNCTION IF EXISTS public.toggle_message_reaction(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(p_message_id UUID, p_emoji TEXT)
RETURNS JSONB AS $$
DECLARE
    v_me UUID := auth.uid();
    v_emoji TEXT := trim(COALESCE(p_emoji, ''));
    v_row public.messages%ROWTYPE;
    v_current TEXT;
    v_next JSONB;
BEGIN
    IF v_me IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa đăng nhập.');
    END IF;

    IF length(v_emoji) = 0 OR length(v_emoji) > 16 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Biểu cảm không hợp lệ.');
    END IF;

    SELECT * INTO v_row FROM public.messages WHERE id = p_message_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy tin nhắn.');
    END IF;

    IF v_row.sender_id <> v_me AND v_row.receiver_id <> v_me THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn không thuộc cuộc trò chuyện này.');
    END IF;

    IF v_row.is_recalled THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không thể thả cảm xúc vào tin nhắn đã thu hồi.');
    END IF;

    v_current := COALESCE(v_row.reactions, '{}'::jsonb) ->> v_me::text;

    IF v_current = v_emoji THEN
        v_next := COALESCE(v_row.reactions, '{}'::jsonb) - v_me::text;
        UPDATE public.messages
        SET
            reactions = v_next,
            last_reaction_emoji = CASE WHEN last_reaction_by = v_me THEN NULL ELSE last_reaction_emoji END,
            last_reaction_by = CASE WHEN last_reaction_by = v_me THEN NULL ELSE last_reaction_by END,
            last_reaction_at = CASE WHEN last_reaction_by = v_me THEN NULL ELSE last_reaction_at END
        WHERE id = p_message_id
        RETURNING * INTO v_row;
    ELSE
        v_next := jsonb_set(COALESCE(v_row.reactions, '{}'::jsonb), ARRAY[v_me::text], to_jsonb(v_emoji), true);
        UPDATE public.messages
        SET
            reactions = v_next,
            last_reaction_emoji = v_emoji,
            last_reaction_by = v_me,
            last_reaction_at = now()
        WHERE id = p_message_id
        RETURNING * INTO v_row;
    END IF;

    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(UUID, TEXT) TO authenticated, service_role;

-- 6. RPC Ghim / Bỏ ghim tin nhắn (TỐI ĐA 5 TIN NHẮN GHIM mỗi cuộc trò chuyện, áp dụng cho cả mình và đối phương)
DROP FUNCTION IF EXISTS public.toggle_pin_message(UUID);
CREATE OR REPLACE FUNCTION public.toggle_pin_message(p_message_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_me UUID := auth.uid();
    v_row public.messages%ROWTYPE;
    v_pinned_count INTEGER;
BEGIN
    IF v_me IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa đăng nhập.');
    END IF;

    SELECT * INTO v_row FROM public.messages WHERE id = p_message_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy tin nhắn.');
    END IF;

    IF v_row.sender_id <> v_me AND v_row.receiver_id <> v_me THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn không thuộc cuộc trò chuyện này.');
    END IF;

    IF v_row.is_recalled THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không thể ghim tin nhắn đã thu hồi.');
    END IF;

    -- Nếu đang ghim -> Bỏ ghim
    IF v_row.is_pinned THEN
        UPDATE public.messages
        SET is_pinned = false, pinned_at = NULL, pinned_by = NULL
        WHERE id = p_message_id
        RETURNING * INTO v_row;

        RETURN jsonb_build_object('success', true, 'pinned', false, 'data', to_jsonb(v_row));
    END IF;

    -- Nếu chưa ghim -> Kiểm tra giới hạn tối đa 5 tin ghim trong cuộc trò chuyện này
    SELECT COUNT(*)::INTEGER INTO v_pinned_count
    FROM public.messages m
    WHERE m.is_pinned = true
      AND m.is_recalled = false
      AND (
          (m.sender_id = v_row.sender_id AND m.receiver_id = v_row.receiver_id)
          OR (m.sender_id = v_row.receiver_id AND m.receiver_id = v_row.sender_id)
      );

    IF v_pinned_count >= 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'PIN_LIMIT_REACHED',
            'message', 'Chỉ có thể ghim tối đa 5 tin nhắn trong một đoạn chat. Hãy bỏ ghim bớt 1 tin trước.'
        );
    END IF;

    UPDATE public.messages
    SET is_pinned = true, pinned_at = now(), pinned_by = v_me
    WHERE id = p_message_id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object('success', true, 'pinned', true, 'data', to_jsonb(v_row));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.toggle_pin_message(UUID) TO authenticated, service_role;

-- 7. Cập nhật get_my_friend_network() để bỏ qua tin nhắn đã ẩn, hiển thị tin thu hồi & thông báo cảm xúc mới nhất ngoài thanh đoạn chat
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
    last_reaction_emoji TEXT,
    last_reaction_by UUID,
    last_reaction_target_sender_id UUID,
    last_reaction_at TIMESTAMPTZ,
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
        CASE WHEN lm.is_recalled THEN 'Tin nhắn đã được thu hồi' ELSE lm.content END AS last_message_content,
        CASE WHEN lm.is_recalled THEN NULL ELSE lm.image_url END AS last_message_image_url,
        lm.sender_id AS last_message_sender_id,
        lm.created_at AS last_message_at,
        lr.last_reaction_emoji,
        lr.last_reaction_by,
        lr.sender_id AS last_reaction_target_sender_id,
        lr.last_reaction_at,
        COALESCE(uc.cnt, 0) AS unread_count
    FROM public.friendships f
    JOIN public.profiles p
        ON p.id = CASE WHEN f.requester_id = v_me THEN f.addressee_id ELSE f.requester_id END
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN LATERAL (
        SELECT m.content, m.image_url, m.sender_id, m.created_at, m.is_recalled
        FROM public.messages m
        WHERE ((m.sender_id = v_me AND m.receiver_id = p.id)
            OR (m.sender_id = p.id AND m.receiver_id = v_me))
          AND NOT (v_me = ANY(COALESCE(m.hidden_for_user_ids, '{}'::uuid[])))
        ORDER BY m.created_at DESC
        LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
        SELECT m.last_reaction_emoji, m.last_reaction_by, m.sender_id, m.last_reaction_at
        FROM public.messages m
        WHERE ((m.sender_id = v_me AND m.receiver_id = p.id)
            OR (m.sender_id = p.id AND m.receiver_id = v_me))
          AND m.is_recalled = false
          AND m.last_reaction_at IS NOT NULL
          AND m.last_reaction_emoji IS NOT NULL
          AND NOT (v_me = ANY(COALESCE(m.hidden_for_user_ids, '{}'::uuid[])))
        ORDER BY m.last_reaction_at DESC
        LIMIT 1
    ) lr ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT AS cnt
        FROM public.messages m
        WHERE m.sender_id = p.id
          AND m.receiver_id = v_me
          AND m.is_read = false
          AND m.is_recalled = false
          AND NOT (v_me = ANY(COALESCE(m.hidden_for_user_ids, '{}'::uuid[])))
    ) uc ON true
    WHERE f.requester_id = v_me OR f.addressee_id = v_me
    ORDER BY GREATEST(
        COALESCE(lm.created_at, f.updated_at, f.created_at),
        COALESCE(lr.last_reaction_at, f.updated_at, f.created_at)
    ) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_my_friend_network() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
