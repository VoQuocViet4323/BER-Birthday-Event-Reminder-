-- ==============================================================================
-- BỔ SUNG CÁC POLICY CHO BẢNG NOTIFICATION_LOGS
-- Hỗ trợ cơ chế Atomic Claim Lock (Insert 'pending', Update 'sent', Delete 'rollback')
-- ==============================================================================

-- 1. Cho phép authenticated user insert log của chính họ
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.notification_logs;
CREATE POLICY "Users can insert their own logs"
    ON public.notification_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- 2. Cho phép authenticated user update log của chính họ (chuyển pending sang sent)
DROP POLICY IF EXISTS "Users can update their own logs" ON public.notification_logs;
CREATE POLICY "Users can update their own logs"
    ON public.notification_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Cho phép authenticated user delete log pending nếu gửi mail lỗi (rollback)
DROP POLICY IF EXISTS "Users can delete their own logs" ON public.notification_logs;
CREATE POLICY "Users can delete their own logs"
    ON public.notification_logs FOR DELETE
    USING (auth.uid() = user_id);
