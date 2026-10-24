-- ==============================================================================
-- MIGRATION 002: CẤU HÌNH PG_CRON & PG_NET GỌI EDGE FUNCTION SEND-REMINDERS MỖI GIỜ
-- ==============================================================================

-- Bật extension pg_cron và pg_net trên Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cấp quyền thực thi schema cron cho postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Hàm gọi Edge Function `send-reminders` qua pg_net
-- Chú ý: Hãy thay THAY_THE_BANG_PROJECT_REF và THAY_THE_BANG_SERVICE_ROLE_KEY
-- Hoặc lưu trong Supabase Vault để bảo mật tuyệt đối.
CREATE OR REPLACE FUNCTION public.invoke_send_reminders()
RETURNS void AS $$
DECLARE
    project_url text;
    service_key text;
BEGIN
    -- Lấy config từ current_setting hoặc fallback (có thể set qua ALTER DATABASE ... SET ...)
    -- Mặc định gọi hàm Edge function qua endpoint chuẩn của Supabase
    PERFORM net.http_post(
        url := 'https://' || coalesce(current_setting('app.settings.project_ref', true), 'YOUR_PROJECT_REF') || '.supabase.co/functions/v1/send-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), 'YOUR_SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object(
            'trigger_source', 'pg_cron',
            'timestamp', now()
        ),
        timeout_milliseconds := 30000
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lên lịch chạy mỗi phút: '* * * * *' (quét chính xác theo từng phút)
-- Xóa job cũ nếu đã tồn tại để tránh tạo trùng lặp
SELECT cron.unschedule('send-hourly-reminders') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-hourly-reminders'
);
SELECT cron.unschedule('send-minute-reminders') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-minute-reminders'
);

SELECT cron.schedule(
    'send-minute-reminders',
    '* * * * *',
    'SELECT public.invoke_send_reminders();'
);
