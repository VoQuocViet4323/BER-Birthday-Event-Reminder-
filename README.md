# Ứng Dụng Web "Nhắc Sinh Nhật & Sự Kiện" (BER)

Ứng dụng web hiện đại, thẩm mỹ cao giúp bạn ghi nhớ và tự động gửi email nhắc nhở về các ngày sinh nhật, kỷ niệm ngày cưới, ngày giỗ (hỗ trợ cả **Âm lịch** và **Dương lịch**) của người thân, gia đình và bạn bè.

---

## 1. Công nghệ Sử dụng

- **Frontend**: [Next.js](https://nextjs.org/) (App Router) + TypeScript + [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) + [Lucide Icons](https://lucide.dev/)
- **Typography**: `Be Vietnam Pro` (qua `next/font/google`) tối ưu hiển thị tiếng Việt tuyệt đẹp.
- **Quản lý Dữ liệu**: [TanStack Query v5](https://tanstack.com/query/latest) (Cache, Optimistic Updates, Instant rollback khi lỗi, Offline fallback).
- **Quản lý Form**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/).
- **Backend & Auth & Database**: [Supabase](https://supabase.com/) (PostgreSQL + Supabase Auth + Row Level Security + Storage).
- **Lập lịch tự động**: `pg_cron` + `pg_net` gọi Supabase Edge Function (Deno) mỗi giờ.
- **Dịch vụ Email**: [Resend](https://resend.com/) gửi email HTML tổng hợp responsive đồng bộ phong cách thương hiệu.
- **Triển khai**: Vercel (Frontend) + Supabase Cloud (Backend & Functions).

---

## 2. Hướng dẫn Chạy Nhanh Cục Bộ (Local Development)

### Bước 1: Cài đặt Dependencies
```bash
npm install
```

### Bước 2: Cấu hình file môi trường
Sao chép `.env.example` thành `.env.local`:
```bash
cp .env.example .env.local
```
*(Nếu chưa có tài khoản Supabase và Resend ngay, ứng dụng đã được tích hợp sẵn chế độ **Demo Offline Mode** với dữ liệu mẫu phong phú để bạn trải nghiệm toàn bộ giao diện, hiệu ứng confetti, chuyển tháng và drawer thêm sửa)*.

### Bước 3: Chạy ứng dụng
```bash
npm run dev
```
Truy cập [http://localhost:3000](http://localhost:3000) trên trình duyệt.

### Bước 4: Chạy kiểm thử tự động (Unit Tests)
```bash
npm test
```
Bộ test kiểm tra toàn bộ logic tính ngày: năm nhuận 29/02, âm lịch thiên văn Hồ Ngọc Đức, chuyển giao qua năm mới, và tính tuổi tự động.

---

## 3. Hướng dẫn Thiết lập Supabase Từ A đến Z

### Bước 3.1: Tạo Project Supabase
1. Đăng nhập [Supabase Dashboard](https://supabase.com/dashboard) và nhấn **New Project**.
2. Chọn Region gần Việt Nam nhất (ví dụ: `Singapore (ap-southeast-1)`).
3. Sau khi tạo xong, vào **Project Settings** > **API** để lấy:
   - `Project URL` $\rightarrow$ Điền vào `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` $\rightarrow$ Điền vào `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret key` $\rightarrow$ Điền vào `SUPABASE_SERVICE_ROLE_KEY`

### Bước 3.2: Chạy Migration Cấu Trúc Database
1. Mở mục **SQL Editor** trong Supabase Dashboard.
2. Mở file [supabase/migrations/20261023_001_initial_schema.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_001_initial_schema.sql), sao chép toàn bộ nội dung và dán vào SQL Editor, sau đó nhấn **Run**.
   - Khởi tạo 4 bảng: `profiles`, `user_settings`, `events`, `notification_logs`.
   - Bật **Row Level Security (RLS)** trên toàn bộ các bảng.
   - Tạo Trigger tự động sinh profile & settings khi có user đăng ký mới.
   - Tạo Storage Bucket `avatars` cho phép người dùng tải ảnh đại diện.
3. Nạp dữ liệu mẫu bằng cách dán nội dung file [supabase/seed.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/seed.sql) vào SQL Editor và nhấn **Run**.

### Bước 3.3: Cấu hình Supabase Auth
1. Vào **Authentication** > **URL Configuration**:
   - **Site URL**: `https://your-domain.vercel.app` (hoặc `http://localhost:3000` khi test local).
   - **Redirect URLs**: Thêm các URL:
     - `http://localhost:3000/api/auth/callback`
     - `https://your-domain.vercel.app/api/auth/callback`
     - `http://localhost:3000/reset-password`
     - `https://your-domain.vercel.app/reset-password`
2. *(Tùy chọn Google OAuth)*: Vào **Authentication** > **Providers** > **Google**: Bật Google và nhập `Client ID` & `Client Secret` từ Google Cloud Console.

> [!WARNING]
> **Lưu ý quan trọng về Email mặc định của Supabase**:
> Dịch vụ gửi email mặc định của Supabase Auth bị giới hạn **3 email/giờ**. Để người dùng đăng ký và đặt lại mật khẩu không bị nghẽn, bạn **bắt buộc** nên vào **Project Settings** > **Authentication** > **SMTP Settings** và bật **Custom SMTP** sử dụng thông số của Resend:
> - Sender email: `nhac@domaincuaban.com`
> - Host: `smtp.resend.com`
> - Port: `465` (hoặc `587`)
> - Username: `resend`
> - Password: Điền `RESEND_API_KEY` của bạn.

---

## 4. Cấu hình Dịch vụ Gửi Email Resend

1. Đăng ký tài khoản tại [Resend.com](https://resend.com/).
2. Vào **API Keys** $\rightarrow$ **Create API Key** $\rightarrow$ Lưu key vào biến `RESEND_API_KEY`.
3. Vào **Domains** $\rightarrow$ **Add Domain**: Nhập tên miền của bạn và thêm các bản ghi DNS (DKIM, SPF, MX) theo hướng dẫn của Resend để xác thực domain gửi thư không bị rơi vào thư rác.
4. Nếu đang ở giai đoạn thử nghiệm chưa có tên miền riêng, bạn có thể dùng địa chỉ mặc định `onboarding@resend.dev` (lưu ý địa chỉ này chỉ gửi được tới email đăng ký tài khoản Resend của bạn).

---

## 5. Triển khai Supabase Edge Function & Scheduler Hàng Giờ

Hệ thống có Edge Function `send-reminders` chịu trách nhiệm rà soát những sự kiện cần nhắc nhở theo múi giờ và gửi email tổng hợp.

### Bước 5.1: Cài đặt Supabase CLI và Deploy Function
```bash
# Đăng nhập Supabase CLI
npx supabase login

# Liên kết với project của bạn
npx supabase link --project-ref your-project-ref

# Thiết lập các biến bí mật cho Edge Function
npx supabase secrets set RESEND_API_KEY=re_123456789...
npx supabase secrets set EMAIL_FROM="Nhắc Sự Kiện <nhac@domaincuaban.com>"
npx supabase secrets set NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"

# Deploy Edge Function
npx supabase functions deploy send-reminders --no-verify-jwt
```

### Bước 5.2: Bật pg_cron & pg_net Gọi Tự Động Hàng Giờ
1. Mở file [supabase/migrations/20261023_002_cron_scheduler.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_002_cron_scheduler.sql).
2. Thay thế `YOUR_PROJECT_REF` và `YOUR_SERVICE_ROLE_KEY` bằng thông số project của bạn.
3. Dán vào **SQL Editor** trên Supabase và nhấn **Run**.
4. Cron job sẽ tự động kích hoạt vào phút thứ 0 của mỗi giờ (`0 * * * *`).

---

## 6. Triển khai Frontend lên Vercel

1. Đẩy mã nguồn lên kho lưu trữ GitHub của bạn:
   ```bash
   git add .
   git commit -m "feat: complete birthday and event reminder app"
   git push origin main
   ```
2. Đăng nhập [Vercel](https://vercel.com/) $\rightarrow$ **Add New Project** $\rightarrow$ Chọn repo vừa tạo.
3. Trong phần **Environment Variables**, điền đầy đủ các biến từ file `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `NEXT_PUBLIC_APP_URL`
4. Nhấn **Deploy**.

---

## 7. Các Điểm Nổi Bật Về Thiết Kế & Trải Nghiệm (Design & UX)

- **Palette**: Gradient Tím Neon & Hồng Thạch Anh (`#8B5CF6` $\rightarrow$ `#EC4899` $\rightarrow$ `#F43F5E`) trẻ trung, hiện đại.
- **Thẻ Hôm Nay**: Confetti bắn pháo giấy sinh động, kèm 3 mẫu lời chúc soạn sẵn và nút mở nhanh Zalo / Messenger / SMS.
- **Âm Lịch Việt Nam**: Chuyển đổi chính xác 2 chiều Dương <-> Âm theo thuật toán thiên văn Hồ Ngọc Đức, live preview ngày quy đổi ngay trong form.
- **Năm Nhuận 29/02**: Tùy chỉnh linh hoạt nhắc vào ngày 28/02 hoặc 01/03 trong năm không nhuận.
- **Optimistic UI & Undo Toast**: Xóa sự kiện biến mất ngay lập tức; hiển thị Toast có nút **Hoàn tác (Undo)** trong 5 giây mà không cần hộp thoại xác nhận phiền toái.
- **PWA & Offline Ready**: Tích hợp `manifest.json`, icon, phát hiện trạng thái mất mạng với banner cảnh báo tinh tế.
- **Phím tắt Command Palette**: Nhấn `Ctrl + K` (hoặc `Cmd + K`) để tìm kiếm và thao tác tức thì.
- **Mobile First**: Thanh điều hướng ngón cái ở dưới (Bottom Tab Bar) kết hợp nút FAB nổi bật.
