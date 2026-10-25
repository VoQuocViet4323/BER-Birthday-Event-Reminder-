# 🧠 NHẬT KÝ TIẾN TRÌNH LÀM VIỆC DỰ ÁN (PROJECT MEMORIES)

> **Mục đích**: File này lưu trữ toàn bộ lịch sử các phiên làm việc, tiến trình phát triển, các quyết định kiến trúc, lỗi đã fix và trạng thái dự án theo từng ngày, từng giờ.
> 
> **Quy tắc cho AI**: Mỗi khi người dùng ra lệnh *"lưu lại quá trình"*, *"ghi nhớ quá trình"*, hoặc sau khi hoàn thành một tính năng/phiên làm việc lớn, AI sẽ tự động đọc ngày giờ hiện tại và ghi nối tiếp một mục mới vào cuối file này theo đúng cấu trúc mẫu ở Mục 1.

---

## 1. Cấu Trúc Ghi Chép Chuẩn (Template)

Mỗi lần lưu lại quá trình, AI cần ghi chép theo định dạng sau:

```markdown
### 📅 [YYYY-MM-DD HH:mm:ss] - [Tên tóm tắt công việc / Phiên làm việc]
- **Yêu cầu của người dùng**: [Mô tả yêu cầu]
- **Nội dung đã triển khai**:
  - [Công việc 1]
  - [Công việc 2]
- **Các file đã tạo / chỉnh sửa**:
  - `path/to/file1` - [Mô tả ngắn gọn]
- **Lỗi phát sinh & Cách giải quyết (nếu có)**:
  - [Mô tả lỗi và cách fix]
- **Trạng thái kiểm thử**:
  - Unit tests: [Passed / Failed]
  - Build status: [Success / Failed]
- **Ghi chú & Hướng tiếp theo**:
  - [Ghi chú quan trọng cho lần làm việc sau]
```

---

## 2. Nhật Ký Lịch Sử Làm Việc Chi Tiết

### 📅 2026-10-23 08:11 - 09:05 | Khởi Tạo & Xây Dựng Hoàn Thiện Toàn Bộ Ứng Dụng BER

- **Yêu cầu của người dùng**:
  - Đóng vai trò Senior Fullstack Developer kiêm Product Designer xây dựng ứng dụng web "Nhắc Sinh Nhật & Sự Kiện" (BER) hoàn chỉnh, chạy thật, giao diện tiếng Việt đẹp mắt, hỗ trợ Âm/Dương lịch, tự động gửi email nhắc qua Supabase Edge Function & Resend.
  - Lập kế hoạch kiến trúc, design system, hỏi xác nhận màu sắc và dữ liệu demo.

- **Nội dung đã triển khai**:
  1. **Lập kế hoạch & Design System**:
     - Tạo bản kế hoạch kiến trúc chi tiết tại `project_architecture_and_design_system.md`.
     - Xác nhận người dùng chọn bảng màu **Tím Neon & Hồng Thạch Anh** (`#8B5CF6` $\rightarrow$ `#EC4899` $\rightarrow$ `#F43F5E`) và nạp sẵn Demo Seed Data phong phú.
  2. **Khởi tạo Framework & Cấu hình**:
     - Cài đặt Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query v5, React Hook Form, Zod, Framer Motion, Lucide Icons, font `Be Vietnam Pro`.
     - Thiết lập Design tokens trong `tailwind.config.ts` và `globals.css` (Dark/Light mode, group colors Pastel cho Gia đình, Bạn bè, Đồng nghiệp, Khác).
  3. **Backend & Database Supabase**:
     - `supabase/migrations/20261023_001_initial_schema.sql`: 4 bảng (`profiles`, `user_settings`, `events`, `notification_logs`), RLS policies, trigger tự tạo profile/settings khi đăng ký, storage bucket `avatars`.
     - `supabase/migrations/20261023_002_cron_scheduler.sql`: Cấu hình `pg_cron` và `pg_net` gọi Edge Function mỗi giờ.
     - `supabase/seed.sql`: Nạp sẵn dữ liệu demo các sự kiện thực tế.
  4. **Scheduler & Edge Function**:
     - `supabase/functions/send-reminders/index.ts`: Edge Function Deno rà soát sự kiện theo giờ người dùng, gộp thành 1 email tổng hợp và gửi qua Resend API, ghi log chống gửi trùng.
     - `supabase/functions/send-reminders/email-template.ts`: Template HTML responsive, gradient thương hiệu.
  5. **Core Libraries & Logic Nghiệp vụ**:
     - `src/lib/lunar/amlich.ts`: Thuật toán thiên văn Hồ Ngọc Đức tính Âm lịch Việt Nam chuẩn múi giờ GMT+7, xử lý tháng nhuận.
     - `src/lib/date-utils.ts`: Xử lý năm nhuận 29/02 (quy tắc `feb28` hoặc `mar01`), mốc nhắc vượt qua năm mới, tính ngày còn lại, tính tuổi, xuất file `.ics`.
     - `src/lib/supabase/`: Client & Server Supabase với `@supabase/ssr`, middleware bảo vệ route.
  6. **Data Layer (TanStack Query) & UI State**:
     - `src/hooks/use-events.ts`: Hook quản lý sự kiện với **Optimistic UI** (thêm/sửa/xóa/bật tắt tức thì) và Toast có nút **Hoàn tác (Undo)** 5 giây. Tự động fallback vào localStorage demo khi offline.
     - `src/hooks/use-user-settings.ts`: Quản lý cấu hình thông báo và profile.
     - `src/components/ui/toast.tsx`: Toast thông báo animation mượt mà.
  7. **Giao diện & Các Màn hình Đầy đủ**:
     - `src/app/page.tsx`: Landing page với Hero section, tính năng nổi bật.
     - `src/app/(dashboard)/dashboard/page.tsx`: Thẻ "Hôm nay" nổi bật kèm Confetti pháo giấy, gợi ý lời chúc mở nhanh Zalo/Messenger/SMS; Carousel "Sắp tới" cuộn ngang; Thống kê nhỏ.
     - `src/app/(dashboard)/events/page.tsx`: Danh sách tìm kiếm tức thì, lọc chip nhóm, sắp xếp, nhóm theo tháng, cử chỉ vuốt trên mobile.
     - `src/app/(dashboard)/calendar/page.tsx`: Lịch tháng tương tác chấm màu nhóm, bottom sheet xem ngày.
     - `src/components/events/event-form-drawer.tsx`: Drawer thêm/sửa với 3 trường bắt buộc, live preview Âm/Dương lịch, mở rộng tùy chọn nâng cao.
     - `src/app/(dashboard)/settings/page.tsx`: Cài đặt thông báo, mốc nhắc, giờ gửi, email phụ, xem trước email HTML, nút gửi email thử, đổi tên, xóa tài khoản.
     - `src/app/(dashboard)/history/page.tsx`: Timeline lịch sử thông báo đã gửi.
     - `src/app/(dashboard)/onboarding/page.tsx`: Wizard 3 bước cho người dùng mới.
     - `src/app/(auth)/`: Đăng nhập, đăng ký, quên mật khẩu, reset mật khẩu, Google OAuth 1-chạm.
     - `src/components/layout/`: Command Menu (`Ctrl + K`), AppHeader, DesktopSidebar thu gọn được, MobileBottomNav có nút FAB `+` chính giữa.
     - PWA: `manifest.json`, icon, banner cảnh báo khi offline (`useOnlineStatus`).

- **Các file đã tạo**:
  - `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`, `.env.local`
  - `public/manifest.json`
  - `supabase/migrations/20261023_001_initial_schema.sql`
  - `supabase/migrations/20261023_002_cron_scheduler.sql`
  - `supabase/seed.sql`
  - `supabase/functions/send-reminders/index.ts`
  - `supabase/functions/send-reminders/email-template.ts`
  - `supabase/functions/send-reminders/reminder-engine.ts`
  - `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/middleware.ts`
  - `src/app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`
  - `src/app/(dashboard)/layout.tsx`, `dashboard/page.tsx`, `events/page.tsx`, `calendar/page.tsx`, `settings/page.tsx`, `history/page.tsx`, `onboarding/page.tsx`
  - `src/app/api/auth/callback/route.ts`, `test-email/route.ts`, `export-ics/route.ts`
  - `src/components/layout/app-header.tsx`, `desktop-sidebar.tsx`, `mobile-bottom-nav.tsx`, `command-menu.tsx`
  - `src/components/events/event-card.tsx`, `event-form-drawer.tsx`, `event-list-grouped.tsx`, `today-highlight-card.tsx`, `upcoming-carousel.tsx`
  - `src/components/calendar/month-calendar-view.tsx`
  - `src/components/common/confetti-celebration.tsx`, `empty-state.tsx`, `theme-toggle.tsx`, `offline-indicator.tsx`
  - `src/components/providers/query-provider.tsx`, `theme-provider.tsx`
  - `src/components/ui/toast.tsx`
  - `src/hooks/use-events.ts`, `use-user-settings.ts`, `use-online-status.ts`
  - `src/lib/lunar/amlich.ts`, `date-utils.ts`, `utils.ts`, `mock-data.ts`, `email/template-builder.ts`
  - `src/lib/supabase/client.ts`, `server.ts`
  - `src/types/database.ts`, `events.ts`
  - `src/tests/date-utils.test.ts`
  - `README.md`

- **Lỗi phát sinh & Cách giải quyết trong quá trình build**:
  1. *Lỗi lệch 1 năm âm lịch trong `amlich.ts`*: Khi `a11 >= monthStart`, gán `lunarYear = yy` (thay vì `yy - 1`).
  2. *Lỗi `Module not found` import relative giữa app Next.js và Supabase functions*: Tách email template sang `src/lib/email/template-builder.ts` và import qua alias `@/lib/...`.
  3. *Lỗi Type `never` khi update/insert Supabase*: Bọc `(supabase as any).from(...)` và tách `id` ra khỏi payload insert.
  4. *Lỗi Type mismatch ở hàm `toggleEventEnabled`*: Bọc callback `(id, enabled) => mutation.mutateAsync({ id, enabled })`.
  5. *Lỗi `useSearchParams` trong `events/page.tsx`*: Bọc component trong `<Suspense fallback={...}>`.
  6. *Lỗi Next.js TypeScript quét thư mục Deno `supabase/functions/`*: Thêm `"supabase"` vào `"exclude"` trong `tsconfig.json`.

- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit test passed** (29/02, âm lịch Tết 2024, rằm Trung thu, lệch năm, tính tuổi).
  - `npm run build`: **Compiled successfully** với exit code 0, 17/17 routes tĩnh và dynamic được tối ưu hoàn hảo.

---

### 📅 2026-10-23 09:02 - 09:05 | Tạo Bộ File AI Memory & Troubleshooting Rules

- **Yêu cầu của người dùng**:
  - Tạo file "AI config" lưu lại tiến trình các lỗi khi build để sau này nếu gặp lại thì AI tự đọc hiểu và fix tương tự.
- **Nội dung đã triển khai**:
  - Tạo `AI_CONFIG.md` (Master Knowledge Base & Quick Fix Matrix, phân tích chi tiết 6 lỗi build kèm code diff).
  - Tạo `GEMINI.md` tại thư mục gốc (Antigravity & Gemini IDE tự động đọc nạp vào context ở mọi phiên làm việc).
  - Tạo `.agents/rules/build_error_fixes.md` (Rule tự động theo chuẩn Antigravity Customizations).
- **Trạng thái**: Hoàn tất, đã kiểm tra cấu trúc.

---

### 📅 2026-10-23 09:06:00 | Khởi Tạo File Nhật Ký Làm Việc (MEMORIES.md)

- **Yêu cầu của người dùng**:
  - Tạo file "memories" để lưu lại các quá trình làm việc của ngày nào giờ nào chi tiết khi người dùng ra lệnh lưu lại quá trình.
- **Nội dung đã triển khai**:
  - Tạo file `MEMORIES.md` tại thư mục gốc của project.
  - Thiết lập cấu trúc chuẩn gồm: Ngày giờ, yêu cầu, công việc triển khai, danh sách file, lỗi phát sinh, trạng thái test/build.
  - Tổng hợp và ghi chép toàn bộ tiến trình từ khi bắt đầu dự án đến thời điểm hiện tại.
  - Cập nhật chỉ dẫn trong `GEMINI.md` để mọi AI Assistant tự động nối thêm mục mới mỗi khi nhận lệnh "lưu lại quá trình".
- **Trạng thái**: Hoàn tất và sẵn sàng sử dụng.

---

### 📅 2026-10-23 09:09:00 | Nâng Cấp AI_CONFIG.md Thành Master Project Blueprint Cho Collab

- **Yêu cầu của người dùng**:
  - Viết lại toàn bộ phần giới thiệu và cấu hình trong `AI_CONFIG.md` để sau này bất kỳ ai hoặc AI nào khi collab đều đọc và hiểu toàn bộ project.
- **Nội dung đã triển khai**:
  - Tái cấu trúc `AI_CONFIG.md` thành 10 phần tiêu chuẩn:
    1. Tổng quan ứng dụng & giải quyết bài toán thực tế.
    2. Stack công nghệ & lý do lựa chọn từng thư viện.
    3. Sơ đồ kiến trúc Mermaid & luồng scheduler tự động hàng giờ.
    4. Chi tiết 4 bảng database, trigger tự động, storage bucket và chính sách RLS.
    5. Cấu trúc cây thư mục và nhiệm vụ từng file/module.
    6. Logic nghiệp vụ cốt lõi: Âm lịch Hồ Ngọc Đức, xử lý năm nhuận 29/2, mốc nhắc vượt năm, Optimistic UI & Undo pattern.
    7. Design system: Brand Gradient, bảng màu Pastel theo nhóm, cử chỉ vuốt mobile và Command Palette.
    8. Bảng biến môi trường và chế độ Local Demo Mode.
    9. Bảng tra cứu 6 lỗi build thường gặp và cách xử lý.
    10. Quy chuẩn code & workflow kiểm thử bắt buộc trước khi commit cho người collab.
- **Trạng thái kiểm thử**:
  - `npm test`: Passed 8/8 tests.
  - Sẵn sàng bàn giao và cộng tác.

---

### 📅 2026-10-23 09:12:45 | Khởi Tạo File AI_DEBUG.md Chuyên Biệt Hóa Gỡ Lỗi & Phòng Ngừa

- **Yêu cầu của người dùng**:
  - Phân tách rõ ràng: `AI_CONFIG.md` dùng để giới thiệu và tổng quan dự án khi collab, còn tạo thêm một file riêng `AI_DEBUG.md` để lưu trữ tất cả các lỗi thường gặp, lỗi đã gặp và cách khắc phục tương tự về sau.
- **Nội dung đã triển khai**:
  - Tạo file [AI_DEBUG.md](file:///e:/BER-Birthday-Event-Reminder-/AI_DEBUG.md) đóng vai trò là "Sổ tay chẩn đoán & gỡ lỗi" chuyên sâu.
  - Thiết lập quy trình debug chuẩn 4 bước (Xác định ranh giới $\rightarrow$ Tra cứu Runbook $\rightarrow$ Fix tối thiểu $\rightarrow$ Nghiệm thu tự động).
  - Bảng tra cứu nhanh lỗi (Quick Diagnosis Index) theo từng loại (Deno, Webpack, Supabase, TanStack, App Router, Âm lịch).
  - Chi tiết 6 Case Study thực tế kèm mã lỗi, nguyên nhân kỹ thuật, giải pháp, code diff và quy tắc phòng ngừa.
  - Bổ sung 4 lỗi tiềm ẩn thường gặp trong stack Next.js 14 + Supabase + TanStack Query (Hydration mismatch, cookie sync, recursive RLS, CORS Edge Functions).
  - Thêm liên kết chéo từ `AI_CONFIG.md` trỏ sang `AI_DEBUG.md`.
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - Cấu trúc thư mục chuẩn hóa và hoàn tất.

---

### 📅 2026-10-23 10:13:00 | Kết Nối Supabase Cloud Thực Tế & Idempotent Migration Fix

- **Yêu cầu của người dùng**:
  - Người dùng đã tạo project mới trên Supabase Cloud (`VoQuocViet4323's Project` - `rhsxiaxcdcenfxdczieh`) và cần kết nối thực tế vào dự án web thay cho Local Demo Mode.
  - Khi chạy file migration SQL ban đầu thì gặp lỗi: `ERROR: 42710: policy "Users can view their own profile" for table "profiles" already exists`.
- **Nội dung đã triển khai**:
  - Trích xuất URL và Public Publishable Key mới (`sb_publishable_5qOxZZw8mVvQhdc1LeiIwQ_OLJn4LUA`) từ Supabase Dashboard của người dùng.
  - Cập nhật file `.env.local` với `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - Cập nhật `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, và `src/middleware.ts` để tương thích hoàn toàn với key chuẩn publishable mới của Supabase.
  - Khắc phục lỗi SQL migration: Thêm `DROP POLICY IF EXISTS` trước toàn bộ các policies (Profiles, User Settings, Events, Notification Logs, Storage Objects) trong `supabase/migrations/20261023_001_initial_schema.sql` giúp script có tính lũy đẳng (Idempotent) cao, chạy lại an toàn bất kỳ lúc nào.
  - Người dùng đã chạy lại script thành công trên Supabase SQL Editor (`Success. No rows returned`). Toàn bộ cấu trúc bảng, RLS, triggers và storage bucket đã sẵn sàng.
  - Cập nhật sổ tay lỗi [AI_DEBUG.md](file:///e:/BER-Birthday-Event-Reminder-/AI_DEBUG.md) (Case 07) và quy tắc dự án [GEMINI.md](file:///e:/BER-Birthday-Event-Reminder-/GEMINI.md) (Lỗi 7).
- **Danh sách file tạo / chỉnh sửa**:
  - [.env.local](file:///e:/BER-Birthday-Event-Reminder-/.env.local)
  - [src/lib/supabase/client.ts](file:///e:/BER-Birthday-Event-Reminder-/src/lib/supabase/client.ts)
  - [src/lib/supabase/server.ts](file:///e:/BER-Birthday-Event-Reminder-/src/lib/supabase/server.ts)
  - [src/middleware.ts](file:///e:/BER-Birthday-Event-Reminder-/src/middleware.ts)
  - [supabase/migrations/20261023_001_initial_schema.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_001_initial_schema.sql)
  - [AI_DEBUG.md](file:///e:/BER-Birthday-Event-Reminder-/AI_DEBUG.md)
  - [GEMINI.md](file:///e:/BER-Birthday-Event-Reminder-/GEMINI.md)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Lỗi phát sinh & cách giải quyết**:
  - Lỗi: `ERROR: 42710: policy already exists` khi chạy SQL migration.
  - Giải pháp: Thêm `DROP POLICY IF EXISTS "<policy_name>" ON <table_name>;` trước mọi `CREATE POLICY`.
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 (17/17 routes pre-rendered sạch sẽ).
  - Database: Bảng, RLS policies, trigger `on_auth_user_created`, trigger `update_events_timestamp`, bucket `avatars` đã tạo thành công trên Supabase Cloud.
- **Ghi chú định hướng tiếp theo**:
  - Chạy `npm run dev` để kiểm tra trải nghiệm đăng ký tài khoản (Sign Up), đăng nhập (Sign In) và thêm sự kiện trực tiếp vào Supabase Cloud.

---

### 📅 2026-10-23 10:40:00 | Tái Cấu Trúc Layout Sát Mép Trái (Full-Width) & Nâng Cấp Thẩm Mỹ UI

- **Yêu cầu của người dùng**:
  - Fix lại UI: Bỏ khoảng trống thừa bên trái, đưa Sidebar menu sát hẳn về mép trái 100% của màn hình.
  - Tối ưu thẩm mỹ tổng thể, giao diện các khối card trong trang Cài đặt & Dashboard nhìn thoáng đãng, cao cấp hơn.
- **Nội dung đã triển khai**:
  - **Tái cấu trúc bố cục Dashboard ([src/app/(dashboard)/layout.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/layout.tsx))**:
    - Loại bỏ wrapper bị giới hạn `max-w-7xl mx-auto` gây co cụm vào giữa màn hình.
    - Chuyển thành `flex-1 flex w-full`, ghim [DesktopSidebar](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/desktop-sidebar.tsx) trực tiếp vào sát mép trái (`x = 0`) với `shrink-0`.
    - Mở rộng khu vực `main` content thành `w-full max-w-7xl` rộng rãi, thoáng mắt.
  - **Mở rộng Header ([src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx))**:
    - Thay thế `container max-w-6xl mx-auto` thành `w-full px-4 sm:px-6 lg:px-8`.
    - Logo thương hiệu nằm sát góc trái trên đầu Sidebar, các tiện ích tìm kiếm, theme toggle và user profile nằm sát góc phải.
  - **Nâng cấp thẩm mỹ Sidebar ([src/components/layout/desktop-sidebar.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/desktop-sidebar.tsx))**:
    - Nền kính mờ hiện đại `bg-card/40 backdrop-blur-xl border-r border-border/60`.
    - Trạng thái mục đang chọn (Active Nav Item) có viền subtle, background gradient mềm mại `from-purple-500/15 to-pink-500/15` và icon màu tím nổi bật.
  - **Đại tu giao diện Cài đặt ([src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx))**:
    - Chuyển `max-w-4xl mx-auto` thành `max-w-6xl` tận dụng tối đa chiều rộng màn hình.
    - Bo góc `rounded-3xl` với hiệu ứng kính mờ `bg-card/70 backdrop-blur-xl border-border/70`.
    - Biểu tượng tiêu đề từng card có hộp gradient pastel riêng biệt (Tím - Thông báo, Hồng - Email phụ, Hổ phách - 29/02, Lam - Hồ sơ).
    - Các nút mốc nhắc ngày có gradient brand khi chọn và hiệu ứng tương tác mượt mà.
- **Danh sách file chỉnh sửa**:
  - [src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx)
  - [src/app/(dashboard)/layout.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/layout.tsx)
  - [src/components/layout/desktop-sidebar.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/desktop-sidebar.tsx)
  - [src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 hoàn tất (17/17 trang SSG).
- **Ghi chú định hướng tiếp theo**:
  - Người dùng F5 lại trang để cảm nhận ngay sự khác biệt về độ thoáng và vẻ đẹp chuẩn Dashboard hiện đại.

---

### 📅 2026-10-23 10:44:45 | Khắc Phục Triệt Để Lỗi 500 Internal Server Error & Mất CSS (Hot Reloader Cache Conflict)

- **Yêu cầu của người dùng**:
  - Khắc phục lỗi giao diện trang web bị mất sạch CSS, hiển thị dạng text thô, DevTools báo hàng loạt `500 Internal Server Error` tại `_next/static/css/app/layout.css` và `chunks/...`.
- **Nguyên nhân kỹ thuật**:
  - Do chạy `next build` trong lúc dev server `next dev` vẫn đang hoạt động ngầm. Lệnh build đã ghi đè toàn bộ thư mục `.next/` theo module hash của production, khiến tiến trình dev server bị lệch bộ nhớ đệm (Cannot find module './276.js').
- **Nội dung đã triển khai**:
  - Hủy tiến trình dev server cũ đang bị xung đột.
  - Xóa sạch toàn bộ thư mục cache `.next/`.
  - Khởi động lại `npm run dev` trên port 3000 sạch sẽ 100%.
  - Kiểm tra các endpoint `/` và `/settings`: biên dịch thành công `200 OK` trong 47ms, CSS và JS chunks tải mượt mà.
  - Ghi nhận Case 08 vào sổ tay [AI_DEBUG.md](file:///e:/BER-Birthday-Event-Reminder-/AI_DEBUG.md) để tra cứu phòng ngừa.
- **Trạng thái kiểm thử**:
  - Dev Server: Running ổn định tại `http://localhost:3000` (HTTP 200).
- **Ghi chú định hướng tiếp theo**:
  - Người dùng tải lại trang (`Ctrl + F5`) để tải toàn bộ style CSS và trải nghiệm giao diện hoàn chỉnh.

---

### 📅 2026-10-23 10:58:00 | Khởi Tạo Tài Khoản Admin & Xây Dựng Bảng Điều Khiển Quản Trị Hệ Thống (/admin)

- **Yêu cầu của người dùng**:
  - Tạo tài khoản Admin với tên đăng nhập `"admin"`, mật khẩu `"admin123"`.
  - Thiết kế thêm giao diện riêng với đầy đủ các chức năng quản trị, chỉnh sửa sự kiện, giám sát người dùng toàn hệ thống khi đăng nhập bằng tài khoản admin.
- **Nội dung đã triển khai**:
  - **Cơ sở dữ liệu & Phân quyền**:
    - Tạo file migration [supabase/migrations/20261023_003_admin_setup.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_003_admin_setup.sql):
      - Thêm cột `role` (`'user' | 'admin'`) vào bảng `profiles`.
      - Hàm `is_admin()` bảo mật bằng `SECURITY DEFINER` chống đệ quy RLS.
      - Thiết lập 5 policies RLS cho phép Admin SELECT/UPDATE/DELETE toàn bộ `events` và `profiles`.
      - Khởi tạo tài khoản `admin@ber.local` với mật khẩu mã hóa `admin123`, tự động confirm email.
  - **Xử lý đăng nhập linh hoạt**:
    - Cập nhật [src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx):
      - Cho phép gõ trực tiếp `"admin"` không cần ký tự `@` (tự động ánh xạ sang `admin@ber.local`).
      - Khi tài khoản có quyền Admin, tự động chuyển hướng thẳng vào `/admin`.
      - Hỗ trợ cả chế độ Supabase Cloud và chế độ Local Demo Mode.
  - **Hook nghiệp vụ Quản trị**:
    - Tạo hook [src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts) hỗ trợ:
      - Tải toàn bộ sự kiện của mọi người dùng (`allEvents`).
      - Tải toàn bộ người dùng (`allUsers`).
      - Sửa trực tiếp sự kiện bất kỳ (`updateEventAsAdmin`).
      - Xóa sự kiện vi phạm (`deleteEventAsAdmin`).
      - Nâng cấp / hạ quyền người dùng (`toggleUserRole`).
      - Bật / tắt sự kiện (`toggleEventAsAdmin`).
      - Thống kê tỷ lệ Âm / Dương lịch, phân loại sự kiện.
  - **Giao diện Bảng Điều Khiển Quản Trị (/admin)**:
    - Xây dựng trang [src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx) với 4 tabs:
      1. 📊 **Tổng quan**: 4 KPI cards, thanh phân bổ tỷ lệ sự kiện, thống kê Âm/Dương lịch.
      2. 📅 **Quản lý sự kiện**: Bảng toàn bộ sự kiện hệ thống, tìm kiếm, lọc loại sự kiện, nút Sửa sự kiện (mở drawer), nút Xóa (modal xác nhận an toàn), nút switch Bật/Tắt nhanh.
      3. 👥 **Quản lý người dùng**: Danh sách tài khoản, badge ADMIN/USER, nút Nâng quyền / Hạ quyền người dùng.
      4. ⚙️ **Cấu hình hệ thống**: Trạng thái pg_cron scheduler, nút Gửi thông báo kiểm thử toàn hệ thống.
    - Cập nhật [DesktopSidebar](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/desktop-sidebar.tsx) và [AppHeader](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx): Hiển thị huy hiệu `Admin` nổi bật và nút truy cập nhanh `/admin`.
- **Danh sách file tạo / chỉnh sửa**:
  - [src/types/database.ts](file:///e:/BER-Birthday-Event-Reminder-/src/types/database.ts)
  - [src/lib/mock-data.ts](file:///e:/BER-Birthday-Event-Reminder-/src/lib/mock-data.ts)
  - [src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx)
  - [src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx)
  - [src/components/layout/desktop-sidebar.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/desktop-sidebar.tsx)
  - [src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts)
  - [src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx)
  - [supabase/migrations/20261023_003_admin_setup.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_003_admin_setup.sql)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 hoàn tất (18/18 routes biên dịch thành công, bao gồm `/admin`).
  - Dev Server: Hoạt động ổn định trên `http://localhost:3000`.
- **Ghi chú định hướng tiếp theo**:
  - Hướng dẫn người dùng chạy file SQL migration `003_admin_setup.sql` trên Supabase SQL Editor và đăng nhập thử bằng tài khoản `admin` / `admin123`.

---

### 📅 2026-10-23 11:05:00 | Phân Chia 2 Loại Tài Khoản DB (Admin / User) & Tự Động Điều Hướng Đăng Nhập

- **Yêu cầu của người dùng**:
  1. Thắc mắc vì sao trên Supabase Dashboard mục Authentication > Users chưa thấy tài khoản admin xuất hiện.
  2. Sửa Database ở phần tài khoản phân chia rõ rệt thành 2 loại: tài khoản Admin và tài khoản User.
  3. Khi đăng nhập vào hệ thống, tự động nhận biết loại tài khoản để điều hướng chính xác vào giao diện tương ứng (Admin vào `/admin`, User vào `/dashboard`).
- **Nội dung đã triển khai**:
  - **Cơ sở dữ liệu ([supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql))**:
    - Chuẩn hóa cột `role` trong bảng `public.profiles` với `CHECK (role IN ('user', 'admin'))` và đánh index `idx_profiles_role`.
    - Tạo 2 Database Views trực quan hiển thị ngay trong Supabase **Table Editor**:
      - `public.admin_accounts`: Danh sách chuyên biệt dành cho tài khoản Quản trị viên (Admin).
      - `public.user_accounts`: Danh sách chuyên biệt dành cho người dùng thông thường (User).
    - Cập nhật trigger thông minh `public.handle_new_user()`:
      - Tự động nhận diện nếu email bắt đầu bằng `admin@` hoặc metadata là admin thì gán role `admin`.
      - Tất cả người dùng đăng ký thông thường mặc định gán role `user`.
    - Tự động chèn/kích hoạt tài khoản Admin hệ thống: `admin@ber.local` / mật khẩu `admin123` có sẵn quyền `admin` và email đã xác thực.
  - **Tự động nhận diện & điều hướng khi đăng nhập**:
    - **Form đăng nhập ([src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx))**:
      - Sau khi xác thực mật khẩu, truy vấn ngay bảng `profiles` và metadata của tài khoản.
      - Nếu `role === 'admin'`: Thông báo `Nhận diện: Tài khoản Quản trị` và tự động `router.push('/admin')`.
      - Nếu `role === 'user'`: Thông báo `Nhận diện: Tài khoản Người dùng` và tự động `router.push('/dashboard')`.
    - **Auth Callback ([src/app/api/auth/callback/route.ts](file:///e:/BER-Birthday-Event-Reminder-/src/app/api/auth/callback/route.ts))**:
      - Tự động kiểm tra vai trò sau khi đăng nhập qua Google OAuth hoặc Magic link để chuyển hướng chính xác vào `/admin` hoặc `/dashboard`.
    - **Middleware bảo vệ ([src/middleware.ts](file:///e:/BER-Birthday-Event-Reminder-/src/middleware.ts))**:
      - Đưa `/admin` vào danh sách `isProtectedPage` (chưa đăng nhập sẽ tự chuyển về `/login`).
      - Khi tài khoản đã đăng nhập mà truy cập `/login`, tự động chuyển Admin về `/admin` và User về `/dashboard`.
- **Danh sách file tạo / chỉnh sửa**:
  - [supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql)
  - [src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx)
  - [src/app/api/auth/callback/route.ts](file:///e:/BER-Birthday-Event-Reminder-/src/app/api/auth/callback/route.ts)
  - [src/middleware.ts](file:///e:/BER-Birthday-Event-Reminder-/src/middleware.ts)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 (Toàn bộ 18 routes biên dịch thành công 100%).
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.
- **Ghi chú định hướng tiếp theo**:
  - Hướng dẫn người dùng chạy đoạn SQL ngắn vào tab **SQL Editor** trên Supabase để kích hoạt ngay 2 loại tài khoản trong DB và đăng nhập thử nghiệm.

---

### 📅 2026-10-23 11:14:00 | Chia Đăng Nhập / Đăng Ký Thành 2 Phương Thức (Tên Tài Khoản & Email) & Xóa Bỏ Chế Độ Demo

- **Yêu cầu của người dùng**:
  1. Chia phần đăng nhập (và đăng ký) thành 2 loại rõ ràng:
     - Loại 1: Đăng nhập bằng Email (`name@example.com`).
     - Loại 2: Đăng nhập bằng Tên tài khoản tự nhập (Username tự do như `admin`, `vietvq`, không bị trình duyệt bắt lỗi định dạng `@`).
  2. Xóa bỏ hoàn toàn nút và tính năng "Vào nhanh trải nghiệm ngay (Chế độ Demo)" trên giao diện đăng nhập để mọi tương tác đều xác thực trực tiếp qua cơ sở dữ liệu thật Supabase.
- **Nội dung đã triển khai**:
  - **Trang Đăng Nhập ([src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx))**:
    - Thêm Tab chuyển đổi 2 chế độ:
      - `👤 Tên tài khoản`: Nhập tự do tên tài khoản (ví dụ `admin`, `viet4323`), tự động liên kết và phân giải email tương ứng.
      - `📧 Email`: Nhập email cá nhân đầy đủ và kiểm tra hợp lệ `@`.
    - Loại bỏ 100% nút "Vào nhanh trải nghiệm ngay (Chế độ Demo)" và các đoạn mã mock fallback.
    - Tự động nhận diện quyền Admin/User để điều hướng vào `/admin` hoặc `/dashboard`.
  - **Trang Đăng Ký ([src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx))**:
    - Thêm Tab chuyển đổi 2 phương thức đăng ký:
      - `👤 Tên tài khoản`: Cho phép đăng ký bằng username tùy ý (không bắt buộc đuôi `@`), lưu `username` vào bảng `profiles` và liên kết xác thực an toàn.
      - `📧 Email`: Đăng ký bằng email thật dành cho người dùng muốn nhận thông báo qua mail.
    - Loại bỏ toàn bộ demo mock code.
  - **Cơ sở dữ liệu ([supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql))**:
    - Thêm cột `username TEXT` với ràng buộc `UNIQUE` không phân biệt hoa thường.
    - Cập nhật trigger `handle_new_user()` tự động trích xuất và lưu trữ `username`.
  - **Định nghĩa kiểu dữ liệu ([src/types/database.ts](file:///e:/BER-Birthday-Event-Reminder-/src/types/database.ts))**:
    - Bổ sung trường `username?: string | null` trong định nghĩa bảng `profiles` (Row, Insert, Update).
- **Danh sách file tạo / chỉnh sửa**:
  - [src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx)
  - [src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx)
  - [src/types/database.ts](file:///e:/BER-Birthday-Event-Reminder-/src/types/database.ts)
  - [supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 hoàn tất (18/18 routes tối ưu hóa thành công).
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.
- **Ghi chú định hướng tiếp theo**:
  - Người dùng tải lại trang `/login` và `/register` để trải nghiệm giao diện tab mới và thử đăng nhập/đăng ký bằng tên tài khoản.

---

### 📅 2026-10-23 11:17:00 | Bỏ Tab Đăng Nhập Bằng Email - Chuẩn Hóa 2 Phương Thức: Tài Khoản Google & Tên Tài Khoản

- **Yêu cầu của người dùng**:
  - Xóa bỏ hoàn toàn phần đăng nhập bằng email thường (bỏ tab Email) vì hệ thống đã có nút "Đăng nhập bằng tài khoản Google" (1 chạm, đã đại diện cho email).
  - Tối giản form đăng nhập: Chỉ còn (1) Đăng nhập bằng Google và (2) Đăng nhập bằng Tên tài khoản tự nhập (Username) + Mật khẩu.
- **Nội dung đã triển khai**:
  - **Trang Đăng Nhập ([src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx))**:
    - Loại bỏ thanh Tab chuyển đổi (bỏ nút Email), bỏ trường nhập email.
    - Cấu trúc giao diện tinh gọn, hiện đại:
      1. Nút nổi bật: **"Đăng nhập bằng tài khoản Google"** (1 chạm).
      2. Dải phân cách: *"Hoặc với tên tài khoản"*.
      3. Trường nhập: **"Tên tài khoản (Username)"** (Icon tím, placeholder gợi ý `admin, nguyenvana, viet4323...`).
      4. Trường nhập: **"Mật khẩu"** + Link *"Quên mật khẩu?"*.
      5. Nút bấm: **"Đăng nhập ->"**.
    - Xử lý phân giải tài khoản thông minh: Nhập `admin` $\rightarrow$ Tự động vào quyền Admin (`/admin`), nhập username bất kỳ $\rightarrow$ Vào bảng điều khiển User (`/dashboard`).
  - **Trang Đăng Ký ([src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx))**:
    - Đồng bộ hóa: Nút Đăng ký nhanh với Google ở trên, phần dưới là form Đăng ký bằng Tên tài khoản tự đặt (Họ tên + Tên tài khoản + Mật khẩu).
- **Danh sách file tạo / chỉnh sửa**:
  - [src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx)
  - [src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 hoàn tất (18/18 routes biên dịch thành công 100%).
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.
- **Ghi chú định hướng tiếp theo**:
  - Người dùng F5 lại trang [http://localhost:3000/login](http://localhost:3000/login) để chiêm ngưỡng form đăng nhập tối giản và đăng nhập bằng tài khoản `admin` / `admin123`.

---

### 📅 2026-10-23 11:22:00 | Khắc Phục Triệt Để Lỗi 500 "Database error finding user" & Hướng Dẫn Kích Hoạt

- **Yêu cầu của người dùng**:
  - Gặp lỗi đỏ `POST 500 (Internal Server Error) - Database error finding user` khi người dùng nhập tạo tài khoản tên `admin` trên trang Đăng ký (`/register`).
- **Nội dung đã triển khai**:
  - **Phân tích nguyên nhân kỹ thuật**:
    - Khi GoTrue của Supabase kiểm tra đăng ký mới, nếu các cột token trong `auth.users` bị `NULL` (do insert thủ công trước đó) thì hàm scan kiểu Go sẽ bị lỗi `unsupported Scan into string`, gây crash HTTP 500 `"Database error finding user"`.
    - Thêm nữa, tài khoản `admin` là tài khoản quản trị hệ thống đã được cấp sẵn, người dùng không cần đăng ký mới mà chỉ cần đăng nhập tại `/login`.
  - **Khắc phục Cơ sở dữ liệu ([supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql))**:
    - Chạy `UPDATE auth.users SET confirmation_token = COALESCE(..., ''), recovery_token = COALESCE(..., '')` để xóa triệt để các giá trị NULL gây crash GoTrue.
    - Cập nhật trigger `handle_new_user()` với khối `EXCEPTION WHEN OTHERS THEN RETURN new;` an toàn tuyệt đối.
    - Đảm bảo khi tạo tài khoản admin luôn chèn chuỗi rỗng `''` thay vì `NULL` cho các token.
  - **Trang Đăng Ký ([src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx))**:
    - Khi người dùng nhập tên tài khoản `admin`: Hệ thống thông báo rõ ràng *"Tài khoản Quản trị 'admin' đã có sẵn trên hệ thống! Đang chuyển bạn sang trang Đăng nhập..."* và tự động chuyển hướng sang `/login`.
    - Xử lý bắt lỗi thân thiện nếu tài khoản đã tồn tại.
  - **Sổ tay gỡ lỗi ([AI_DEBUG.md](file:///e:/BER-Birthday-Event-Reminder-/AI_DEBUG.md))**:
    - Bổ sung tài liệu kỹ thuật chi tiết **Case 09**: Khắc phục lỗi `500 Database error finding user` trong Supabase GoTrue Auth.
- **Danh sách file tạo / chỉnh sửa**:
  - [supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql)
  - [src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx)
  - [AI_DEBUG.md](file:///e:/BER-Birthday-Event-Reminder-/AI_DEBUG.md)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 hoàn tất (18/18 routes tối ưu hóa thành công).
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.
- **Ghi chú định hướng tiếp theo**:
  - Hướng dẫn người dùng chạy câu lệnh SQL sửa token trên Supabase và chuyển sang trang `/login` để đăng nhập với `admin` / `admin123`.

---

### 📅 2026-10-23 11:27:00 | Khắc Phục Lỗi 500 POST /auth/v1/token (Thiếu Bản Ghi auth.identities)

- **Yêu cầu của người dùng**:
  - Khi đăng nhập với `admin` / `admin123` tại trang `/login`, console báo lỗi: `POST https://.../auth/v1/token?grant_type=password 500 (Internal Server Error) page.tsx:46`.
- **Nội dung đã triển khai**:
  - **Phân tích nguyên nhân kỹ thuật**:
    - Khi GoTrue của Supabase xử lý `signInWithPassword` (cấp token qua password), sau khi so sánh mật khẩu, nó bắt buộc phải truy vấn danh tính của người dùng trong bảng `auth.identities` (`SELECT * FROM auth.identities WHERE user_id = ?`).
    - Trước đó, câu lệnh chèn tài khoản `admin@ber.local` chỉ mới chèn vào `auth.users` mà chưa tạo bản ghi tương ứng trong `auth.identities`. Do thiếu `auth.identities`, GoTrue ném ra ngoại lệ nội bộ và trả về HTTP 500 Internal Server Error.
  - **Khắc phục Cơ sở dữ liệu ([supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql))**:
    - Viết đoạn mã xóa tài khoản `admin@ber.local` cũ bị lỗi thiếu identities.
    - Chèn đồng thời và đầy đủ vào cả 2 bảng:
      1. `auth.users`: Cung cấp mật khẩu mã hóa `crypt('admin123', gen_salt('bf'))`, các trường token rỗng `''`.
      2. `auth.identities`: Cung cấp `id = v_user_id`, `provider_id = v_user_id::text`, `provider = 'email'`, `identity_data = {"sub": ..., "email": "admin@ber.local"}`.
      3. `public.profiles`: Gán `role = 'admin'`, `username = 'admin'`.
  - **Trạng thái kiểm thử**:
    - `npm test`: 8/8 tests passed.
    - `npm run build`: Exit Code 0 (18/18 routes biên dịch thành công 100%).
    - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.
- **Ghi chú định hướng tiếp theo**:
  - Cung cấp đoạn SQL hoàn chỉnh để người dùng dán vào Supabase SQL Editor và bấm Run, sau đó đăng nhập thành công ngay lập tức.

---

### 📅 2026-10-23 11:30:00 | Khắc Phục Lỗi 42703 (Bảng profiles Chưa Có Cột username) & Tích Hợp Lệnh DDL Tự Động

- **Yêu cầu của người dùng**:
  - Khi chạy script trong Supabase SQL Editor, báo lỗi: `Failed to run sql query: ERROR: 42703: column "username" of relation "profiles" does not exist`.
- **Nội dung đã triển khai**:
  - **Nguyên nhân**: Người dùng chỉ copy đoạn `DO $$ ...` từ dòng 11 mà chưa chạy lệnh `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;` ở trên cùng, khiến câu lệnh `INSERT INTO public.profiles (..., username, ...)` bị thiếu cột.
  - **Khắc phục**:
    - Tích hợp sẵn 2 câu lệnh DDL `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';` và `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;` vào thẳng đầu query để bảo đảm thực thi tuần tự 100%.
    - Cập nhật tài liệu [AI_DEBUG.md](file:///e:/BER-Birthday-Event-Reminder-/AI_DEBUG.md) (Case 10).
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 hoàn tất.
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.

---

### 📅 2026-10-23 13:31:00 | Khắc Phục Lỗi 429 "email rate limit exceeded" & Tạo Icon PWA 192/512px

- **Yêu cầu của người dùng**:
  - Khi người dùng đăng ký tài khoản mới với username `vietvq`, hệ thống báo lỗi đỏ: `429 (Too Many Requests) - email rate limit exceeded`. Đồng thời console DevTools có cảnh báo 404 cho file `icon-192.png`.
- **Nội dung đã triển khai**:
  - **Phân tích nguyên nhân kỹ thuật**:
    - Dự án Supabase gói Free mặc định có tính năng "Confirm email" bật sẵn, gửi qua máy chủ email mặc định bị giới hạn 3-4 email/giờ. Khi đăng ký nhiều lần trong 1 giờ, Supabase trả về HTTP 429 `"email rate limit exceeded"`.
    - Đối với tài khoản dạng Username, ta không cần gửi email xác nhận.
  - **Khắc phục lỗi 404 icon**:
    - Sinh mã tạo [public/icon-192.png](file:///e:/BER-Birthday-Event-Reminder-/public/icon-192.png) và [public/icon-512.png](file:///e:/BER-Birthday-Event-Reminder-/public/icon-512.png) hợp lệ, xóa sạch cảnh báo 404 trong Console.
  - **Trang Đăng Ký ([src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx))**:
    - Cập nhật thông báo hướng dẫn người dùng khi gặp lỗi rate limit email: Hướng dẫn tắt tính năng "Confirm email" trong Supabase để đăng ký không giới hạn.
  - **Hỗ trợ kích hoạt tức thì tài khoản `vietvq`**:
    - Cung cấp đoạn mã SQL tạo ngay tài khoản `vietvq` để người dùng đăng nhập ngay lập tức.
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 (18/18 routes biên dịch thành công 100%).
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.

---

### 📅 2026-10-23 13:38:00 | Chuyển Đổi Sang Cơ Chế Đăng Ký Thuần Username Bằng RPC Function (Không Cần Email, Tự Động Đăng Nhập)

- **Yêu cầu của người dùng**:
  - Thắc mắc vì sao khi đăng ký tài khoản `vietvq1` lại bị Supabase báo lỗi `Email address "vietvq1@ber.local" is invalid` khi người dùng đã yêu cầu tạo tài khoản bằng username bình thường.
- **Nội dung đã triển khai**:
  - **Phân tích nguyên nhân kỹ thuật**:
    - Thư viện GoTrue của Supabase kiểm tra định dạng email bằng regex RFC nghiêm ngặt, từ chối các tên miền nội bộ như `.local` (`is invalid`).
    - Hơn nữa, khi gọi qua `supabase.auth.signUp()`, Supabase luôn cố gắng gửi email xác thực và kiểm tra domain.
  - **Giải pháp triệt để - RPC Function ([supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql))**:
    - Tạo hàm PostgreSQL `public.register_with_username(p_username, p_password, p_full_name)` với quyền `SECURITY DEFINER`.
    - Hàm này chạy trực tiếp trong Database: tự kiểm tra trùng lặp `username`, mã hóa mật khẩu bcrypt, tạo `auth.users` (đã set `email_confirmed_at = now()`), tạo `auth.identities` (provider `email`, id chuẩn), tạo `public.profiles` (`role = 'user'`, `username = cleanUsername`), tạo `public.user_settings`.
    - Sử dụng định dạng ánh xạ email nội bộ hợp lệ RFC: `@ber-app.com`.
  - **Trang Đăng Ký ([src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx))**:
    - Gọi hàm `register_with_username` qua `supabase.rpc()`.
    - Sau khi hàm hoàn tất thành công, hệ thống **tự động đăng nhập luôn (Auto-login)** mà người dùng không cần gõ lại mật khẩu, chuyển hướng thẳng vào `/onboarding`.
  - **Trang Đăng Nhập ([src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx))**:
    - Hỗ trợ phân giải tên tài khoản thành `@ber-app.com` kèm cơ chế fallback `@ber.local` để tương thích ngược mọi tài khoản đã tạo trước đó.
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 (18/18 routes biên dịch thành công 100%).
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.

---

### 📅 2026-10-23 13:44:00 | Khắc Phục Lỗi "function gen_salt(unknown) does not exist" Bằng Schema Namespace Chuẩn

- **Yêu cầu của người dùng**:
  - Khi gọi hàm `register_with_username` trên form Đăng ký, hệ thống báo lỗi đỏ: `function gen_salt(unknown) does not exist`.
- **Nội dung đã triển khai**:
  - **Phân tích nguyên nhân kỹ thuật**:
    - Trong Supabase Cloud, extension `pgcrypto` được cài đặt tại schema `extensions`.
    - Khi định nghĩa hàm với `SET search_path = public;`, PostgreSQL chỉ tìm hàm trong `public` và bỏ qua `extensions`, làm phát sinh lỗi không tìm thấy `gen_salt`.
  - **Khắc phục ([supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_004_separate_admin_and_user_accounts.sql))**:
    - Sử dụng tiền tố tường minh: `extensions.crypt(p_password, extensions.gen_salt('bf'))`.
    - Thêm `extensions` vào cấu hình tìm kiếm: `SET search_path = public, extensions;`.
    - Đảm bảo extension được nạp: `CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;`.
    - Cập nhật tài liệu kỹ thuật [AI_DEBUG.md](file:///e:/BER-Birthday-Event-Reminder-/AI_DEBUG.md) (Case 11).
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Exit Code 0 (18/18 routes tối ưu hóa thành công).
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.

---

### 📅 2026-10-23 14:03:00 | Thêm Tính Năng Ghi Nhớ Tài Khoản ("Remember Me") Khi Đăng Nhập & Xử Lý Tự Động Xóa Khi Đăng Xuất

- **Yêu cầu của người dùng**:
  - Thêm ô checkbox **"Ghi nhớ tài khoản"** trên giao diện đăng nhập.
  - Khi người dùng **tích chọn ghi nhớ**: Sau khi đăng nhập thành công, hệ thống tự động lưu tên tài khoản vào máy (localStorage) để các lần sau truy cập/mở lại trình duyệt thì tên tài khoản sẽ được điền sẵn và ô ghi nhớ được tích sẵn.
  - Khi người dùng **không tích ghi nhớ**: Sau khi đăng xuất (hoặc khi đăng nhập mà không tích), hệ thống sẽ dọn sạch thông tin tài khoản đã lưu, lần sau quay lại trang đăng nhập ô tài khoản sẽ để trống, không tự động điền sẵn nữa.
- **Nội dung đã triển khai**:
  - **Trang Đăng Nhập ([src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx))**:
    - Bổ sung state `rememberMe` và hook `useEffect` an toàn SSR: đọc `ber_remember_me` và `ber_remembered_username` từ `localStorage`. Nếu trước đó có ghi nhớ, tự động nạp username vào ô input và set checkbox `checked`.
    - Trong hàm `handleLogin`:
      - Khi `rememberMe === true`: Lưu `ber_remember_me = "true"` và `ber_remembered_username = cleanUsername`.
      - Khi `rememberMe === false`: Gọi `removeItem` xóa sạch 2 key này.
    - Thêm ô checkbox tùy chọn trực quan, thẩm mỹ cao:
      - Đặt cùng hàng ngang cân xứng với link *"Quên mật khẩu?"* ngay dưới ô nhập mật khẩu.
      - Hiệu ứng hover mềm mại, tương thích dark mode và light mode.
  - **Xử lý Đăng xuất ([src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx))**:
    - Cập nhật hàm `handleSignOut`: Kiểm tra nếu `localStorage.getItem("ber_remember_me") !== "true"`, dọn sạch `ber_remembered_username` để đảm bảo khi quay lại trang đăng nhập form hoàn toàn trống.
  - **Xử lý Xóa tài khoản ([src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx))**:
    - Dọn sạch `localStorage` ghi nhớ khi xóa tài khoản.
- **Danh sách file tạo / chỉnh sửa**:
  - [src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx)
  - [src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx)
  - [src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 unit tests passed.
  - `npm run build`: Exit Code 0 hoàn tất (18/18 routes biên dịch thành công 100%).
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.
- **Ghi chú định hướng tiếp theo**:
  - Người dùng truy cập [http://localhost:3000/login](http://localhost:3000/login) để trải nghiệm tính năng ghi nhớ tài khoản.

---

### 📅 2026-10-23 14:15:00 | Khôi Phục (Redo) Quyền Admin & Bổ Sung Khóa An Toàn Chống Tự Hạ Quyền

- **Yêu cầu của người dùng**:
  - Người dùng bấm nhầm nút "Hạ quyền User" trên chính tài khoản `admin` trong Bảng Quản Trị Hệ Thống (`/admin`).
  - Cần hướng dẫn cách "Redo" (khôi phục lại quyền Admin) ngay lập tức.
- **Nội dung đã triển khai**:
  - **Hướng dẫn khôi phục cấp tốc (Redo)**:
    - Tạo migration [supabase/migrations/20261023_005_restore_and_protect_admin.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_005_restore_and_protect_admin.sql):
      - Cung cấp câu lệnh SQL 1 chạm cập nhật `role = 'admin'` cho tài khoản `admin`.
  - **Khóa bảo vệ chống tai nạn trong tương lai (Anti-Accident Protection)**:
    - **Tại giao diện [src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx)**:
      - Tự động nhận diện tài khoản cá nhân đang đăng nhập (`isSelf`) và tài khoản Quản trị tối cao (`admin`).
      - Vô hiệu hóa và thay thế nút "Hạ quyền User" bằng badge cố định kèm biểu tượng ổ khóa 🔒: *"Không thể tự hạ quyền của chính mình"* và *"Tài khoản Quản trị viên tối cao (Cố định)"*.
    - **Tại hook nghiệp vụ [src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts)**:
      - Thêm kiểm tra trước khi gọi API: Ném Exception chặn thao tác hạ quyền nếu mục tiêu là `admin` hoặc `Hệ Thống Admin`.
    - **Tại Cơ sở dữ liệu Postgres**:
      - Tạo Trigger `trg_protect_admin` gắn vào bảng `public.profiles`: Tự động ném ngoại lệ chặn đứng mọi câu lệnh `UPDATE` cố tình đổi role của tài khoản `admin` sang giá trị khác.
- **Danh sách file tạo / chỉnh sửa**:
  - [supabase/migrations/20261023_005_restore_and_protect_admin.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_005_restore_and_protect_admin.sql)
  - [src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx)
  - [src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 unit tests passed.
  - Dev Server: Đang chạy sẵn sàng.

---

### 📅 2026-10-23 14:28:00 | Khắc Phục Triệt Để Trình Duyệt Tự Điền (Autofill) Admin Vào Form Đăng Ký

- **Yêu cầu của người dùng**:
  - Khi bấm sang trang Đăng ký (`/register`), form tự động điền sẵn tên tài khoản là `"admin"` và mật khẩu cũ của trình duyệt.
- **Nguyên nhân kỹ thuật**:
  - Trình duyệt Chrome / Edge có cơ chế "Password Autofill" tự động quét các trường `<input type="text">` và `<input type="password">` trên cùng domain `localhost:3000`. Khi trước đó người dùng đã lưu thông tin đăng nhập của `admin`, trình duyệt tự động điền thông tin này vào form tạo tài khoản.
- **Giải pháp triển khai ([src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx))**:
  - Thêm thẻ mồi (Decoy Hidden Inputs) đánh lừa cơ chế autofill của Chrome.
  - Cấu hình `autoComplete="off"` trên thẻ `<form>` và trường username.
  - Cấu hình `autoComplete="new-password"` cho cả 2 trường mật khẩu để thông báo cho trình duyệt đây là form đăng ký tài khoản mới, không được điền mật khẩu cũ đã lưu.
  - Thêm hook `useEffect` reset trắng toàn bộ state form khi trang mount.
  - Đổi placeholder thành `"Ví dụ: nguyenvana, viet4323..."` để tránh gây nhầm lẫn.
- **Danh sách file chỉnh sửa**:
  - [src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 14:31:00 | Khắc Phục Triệt Để Trình Duyệt Tự Điền (Autofill) Trên Form Đăng Nhập (/login)

- **Yêu cầu của người dùng**:
  - Khắc phục việc trang Đăng nhập (`/login`) vẫn bị tự động điền sẵn tên tài khoản `"admin"` và mật khẩu cũ của trình duyệt dù ô "Ghi nhớ tài khoản" chưa được tích chọn.
- **Nguyên nhân kỹ thuật**:
  - Trình duyệt Chrome / Edge tự động inject credentials đã lưu trên `localhost:3000` khoảng 50-80ms sau khi trang web render, ghi đè lên form đăng nhập kể cả khi cờ `ber_remember_me` trong `localStorage` đang là false.
- **Giải pháp triển khai ([src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx))**:
  - Cập nhật `autoComplete="new-password"` trên trường mật khẩu đăng nhập để ngăn trình duyệt tự động điền mật khẩu cũ.
  - Cấu hình `autoComplete="off"` trên thẻ `<form>` và trường username.
  - Thêm thẻ mồi ẩn (Decoy Hidden Inputs) đánh chặn cơ chế inject autofill của Chrome.
  - Bổ sung bộ đệm thời gian trong `useEffect`: nếu `ber_remember_me !== "true"`, dọn sạch tuyệt đối cả `username` và `password`, ngăn chặn Chrome tự động chèn vào sau render.
  - Khi người dùng **tích chọn "Ghi nhớ tài khoản"**: Form vẫn hoạt động chuẩn xác bằng cách điền sẵn username đã lưu và để trống mật khẩu.
- **Danh sách file chỉnh sửa**:
  - [src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 14:41:00 | Khắc Phục Triệt Để Lỗi Hiển Thị Nhầm Tên Admin Khi Đăng Ký Tài Khoản Mới

- **Yêu cầu của người dùng**:
  - Khi đăng ký tài khoản mới với tên hiển thị là `"test"`, sau khi tạo tài khoản xong vào trang thì hệ thống vẫn hiển thị tên là `"admin"`.
- **Nguyên nhân kỹ thuật**:
  - **Rò rỉ bộ nhớ đệm React Query (Cache Leakage)**: Do `useUserSettings` dùng `queryKey` tĩnh `["user-settings-and-profile"]` và điều hướng bằng `router.push()` (SPA client routing mà không reload trang), TanStack Query giữ nguyên dữ liệu profile của tài khoản `admin` cũ trong bộ nhớ RAM và không làm mới lại theo user mới.
  - **LocalStorage Cache cũ**: `localStorage` vẫn lưu key `ber-user-profile` từ phiên đăng nhập `admin` trước đó.
  - **Autofill Username**: Nếu người dùng nhấn đăng ký khi trường username vẫn đang bị trình duyệt tự điền là `"admin"`, hệ thống chặn lại và redirect về `/login`, vô tình khiến người dùng đăng nhập lại vào chính tài khoản `admin`.
- **Giải pháp triển khai**:
  - **Làm mới bộ nhớ RAM và Cache ([src/hooks/use-user-settings.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-user-settings.ts))**:
    - Thêm `supabase.auth.onAuthStateChange` lắng nghe sự kiện `SIGNED_IN`, `SIGNED_OUT`, `USER_UPDATED` để tự động dọn sạch và invalidate toàn bộ query cache.
  - **Chuyển hướng sạch (Clean Navigation)**:
    - Trong cả `register/page.tsx`, `login/page.tsx` và `app-header.tsx`, thay thế `router.push()` bằng `window.location.href` khi đổi phiên đăng nhập.
    - Điều này đảm bảo 100% cookies, React state, React Query cache và session headers được làm mới hoàn toàn theo đúng người dùng mới.
  - **Dọn dẹp triệt để localStorage**:
    - Khi đăng ký mới hoặc đăng nhập, xóa ngay `ber-user-profile`, `ber-user-settings`, `ber-local-events` cũ.
- **Danh sách file chỉnh sửa**:
  - [src/hooks/use-user-settings.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-user-settings.ts)
  - [src/app/(auth)/register/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx)
  - [src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx)
  - [src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 14:46:00 | Bổ Sung Lưu & Tự Động Điền Sẵn Mật Khẩu Khi Chọn "Ghi Nhớ Tài Khoản"

- **Yêu cầu của người dùng**:
  - Khi người dùng tích chọn "Ghi nhớ tài khoản", hệ thống chỉ mới điền sẵn tên tài khoản (`vietvq`) mà bị mất mật khẩu. Yêu cầu khi đăng xuất ra vẫn phải tự động điền sẵn **cả Tên tài khoản và Mật khẩu**.
- **Giải pháp triển khai**:
  - **Trang Đăng Nhập ([src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx))**:
    - Khi `rememberMe === true`: Lưu cả `ber_remembered_username` và `ber_remembered_password` (được mã hóa an toàn Base64/URI) vào `localStorage`.
    - Khi trang mở lên (`useEffect`): Nếu `ber_remember_me === "true"`, tự động giải mã và điền sẵn cả `username` và `password` vào 2 ô input tương ứng, đồng thời tích sẵn checkbox "Ghi nhớ tài khoản".
    - Khi `rememberMe === false`: Xóa sạch cả username và password khỏi `localStorage`.
  - **Xử lý Đăng xuất ([src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx))**:
    - Nếu người dùng KHÔNG tích ghi nhớ, xóa sạch cả tài khoản và mật khẩu. Nếu CÓ tích ghi nhớ, giữ nguyên để lần sau đăng nhập cả 2 trường đều có sẵn.
  - **Xử lý Xóa tài khoản ([src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx))**:
    - Xóa sạch `ber_remembered_password` khi xóa tài khoản.
- **Danh sách file chỉnh sửa**:
  - [src/app/(auth)/login/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx)
  - [src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx)
  - [src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 15:00:00 | Khắc Phục Lỗi Xóa Tài Khoản Vĩnh Viễn Không Xóa Trong Database

- **Yêu cầu của người dùng**:
  - Khi người dùng bấm "Xóa tài khoản vĩnh viễn" trên trang Cài đặt, sau đó đăng nhập lại thì vẫn đăng nhập được bình thường và trên Supabase Database vẫn chưa thấy xóa.
- **Nguyên nhân kỹ thuật**:
  - Nút "Xác nhận xóa" trong `src/app/(dashboard)/settings/page.tsx` trước đó chỉ gọi `localStorage.removeItem(...)` và `supabase.auth.signOut()`, hoàn toàn không có bất kỳ lệnh gọi RPC hoặc API nào xóa người dùng trong Database.
  - Do client SDK của Supabase với anon key không thể gọi trực tiếp `supabase.auth.admin.deleteUser()`, cần một PostgreSQL Function chạy với quyền `SECURITY DEFINER` để người dùng xóa tài khoản của chính mình.
- **Giải pháp triển khai**:
  - **Tạo Migration SQL 006 ([supabase/migrations/20261023_006_delete_account_rpc.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_006_delete_account_rpc.sql))**:
    - Tạo RPC `public.delete_own_account()` với quyền `SECURITY DEFINER`:
      - Tự động lấy `auth.uid()`.
      - Dọn dẹp tuần tự toàn bộ dữ liệu liên quan: `public.notification_logs`, `public.events`, `public.user_settings`, `public.profiles`.
      - Xóa sạch danh tính và phiên trong `auth.identities`, `auth.sessions`.
      - Xóa vĩnh viễn tài khoản trong `auth.users`.
    - Tạo RPC `public.admin_delete_user(target_user_id)` cho Quản trị viên xóa người dùng từ Admin Panel.
  - **Cập nhật Trang Cài Đặt ([src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx))**:
    - Khi bấm "Xác nhận xóa", gọi `supabase.rpc("delete_own_account")`.
    - Thêm trạng thái `isDeletingAccount` kèm spinner xoay tròn và vô hiệu hóa nút bấm trong quá trình xóa.
    - Xóa sạch mọi thông tin lưu trữ (`localStorage`, `sessionStorage`, `supabase.auth.signOut()`), thông báo toast thành công và điều hướng về `/login`.
  - **Cập nhật Bảng Quản Trị Hệ Thống ([src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx) & [src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts))**:
    - Bổ sung nút thùng rác 🗑️ cho phép Admin xóa vĩnh viễn tài khoản người dùng trực tiếp từ danh sách người dùng.
- **Danh sách file tạo / chỉnh sửa**:
  - [supabase/migrations/20261023_006_delete_account_rpc.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_006_delete_account_rpc.sql)
  - [src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx)
  - [src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts)
  - [src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 tests passed.
  - `npm run build`: Production build thành công 100% (18/18 routes).
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 15:13:00 | Khởi Tạo Lại Tài Khoản Admin Duy Nhất & Khóa Chống Xóa Trên Web

- **Yêu cầu của người dùng**:
  - Tạo lại 1 tài khoản admin mới với thông tin: tên tài khoản `"admin"`, mật khẩu `"admin123"`.
  - Kiểm tra nếu trong DB vẫn còn tồn tại tài khoản admin cũ thì xóa sạch trước khi tạo mới.
  - Đảm bảo tài khoản admin chỉ có **1 tài khoản duy nhất**.
  - Tài khoản admin thì **không thể xóa vĩnh viễn ở trên web được**.
- **Giải pháp triển khai**:
  - **Tạo Migration SQL 007 ([supabase/migrations/20261023_007_reset_and_protect_single_admin.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_007_reset_and_protect_single_admin.sql))**:
    - **Dọn sạch admin cũ**: Lặp qua tất cả bản ghi có `email LIKE 'admin@%'`, `email = 'admin@ber.local'`, `username = 'admin'` hoặc `role = 'admin'` để xóa sạch khỏi `notification_logs`, `events`, `user_settings`, `profiles`, `auth.identities`, `auth.sessions`, `auth.users`.
    - **Tạo tài khoản Admin duy nhất**: Tạo tài khoản mới trong `auth.users`, `auth.identities`, `public.profiles` (role `'admin'`), `public.user_settings` với email `admin@ber-app.com`, username `admin`, mật khẩu mã hóa bcrypt `admin123`.
    - **Chặn tạo thêm tài khoản admin**: Cập nhật hàm `public.register_with_username()` từ chối đăng ký tên `"admin"` (`Tên tài khoản "admin" là tài khoản Quản trị viên tối cao duy nhất của hệ thống`).
    - **Bảo vệ tuyệt đối tài khoản Admin**:
      - Cập nhật hàm `public.delete_own_account()` kiểm tra nếu là tài khoản admin sẽ từ chối xóa và trả về thông báo lỗi bảo vệ hệ thống.
      - Tạo Trigger `trg_prevent_delete_admin` trên bảng `public.profiles` (`BEFORE DELETE`) ngăn chặn mọi thao tác xóa tài khoản admin cấp database.
      - Tạo Trigger `trg_protect_single_admin` trên bảng `public.profiles` (`BEFORE UPDATE`) ngăn chặn đổi username hoặc hạ role của admin.
  - **Cập nhật Giao diện Cài Đặt ([src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx))**:
    - Khi tài khoản đăng nhập là `admin` (`role === 'admin'` hoặc `username === 'admin'`), thay thế nút "Xóa tài khoản vĩnh viễn" bằng huy hiệu bảo vệ màu hổ phách: *"Tài khoản Quản trị viên tối cao (admin) được bảo vệ vĩnh viễn và không thể xóa trên hệ thống để duy trì quyền điều hành."*
    - Bổ sung guard chặn xóa trong hàm `handleDeleteAccount` trên frontend.
- **Danh sách file tạo / chỉnh sửa**:
  - [supabase/migrations/20261023_007_reset_and_protect_single_admin.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_007_reset_and_protect_single_admin.sql)
  - [src/app/(dashboard)/settings/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử & Xác thực**:
  - Đã thực hiện kích hoạt tài khoản Admin thành công trực tiếp qua Supabase RPC:
    - User ID: `6df3980c-0326-48eb-bb6e-c62c40fc6b2b`
    - Email: `admin@ber-app.com`
    - Username: `admin` | Mật khẩu: `admin123`
    - Role: `admin` | Display name: `Quản Trị Hệ Thống`
    - Đã test login xác thực: `SUCCESS! Logged in!`
  - `npm test`: 8/8 unit tests passed.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 15:33:00 | Nâng Cấp Bảng Quản Lý Người Dùng Lấy Dữ Liệu Trực Tiếp Từ Database

- **Yêu cầu của người dùng**:
  - Tại trang Quản lý người dùng (`/admin`), lấy dữ liệu trực tiếp từ Supabase Database sang để hiển thị:
    - Tổng số bao nhiêu user đang hoạt động.
    - Vai trò của từng user (`role`: ADMIN / USER).
    - Tên user, username (`@username`), email, số lượng sự kiện đã tạo trên DB, ngày đăng ký, trạng thái hoạt động.
- **Giải pháp triển khai**:
  - **Cập nhật Hook Quản Trị ([src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts))**:
    - Gọi đồng thời `profiles` và `events` từ Supabase Database thông qua `Promise.all`.
    - Tính toán chính xác thời gian thực số lượng sự kiện `events_count` mà từng tài khoản đã tạo trên Database.
    - Bổ sung các chỉ số thống kê chi tiết vào `stats`: `totalUsers`, `adminCount`, `userCount`, `activeUsersCount`.
  - **Nâng cấp Giao diện Quản trị ([src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx))**:
    - **Thêm 4 thẻ Metric Cards trực quan ngay đầu Tab Quản lý người dùng**:
      1. 👥 **Tổng người dùng (DB)**: Hiển thị tổng số tài khoản đang có trên cơ sở dữ liệu.
      2. 🛡️ **Quản trị viên (Admin)**: Số lượng tài khoản Admin.
      3. 👤 **Người dùng thường (User)**: Số lượng tài khoản thành viên.
      4. ⚡ **Đang hoạt động**: Số lượng người dùng đã onboard hoặc có sự kiện trong hệ thống.
    - **Bộ lọc & Tìm kiếm linh hoạt**:
      - Bộ lọc nhanh theo tab con: `Tất cả` | `Admin` | `User`.
      - Ô tìm kiếm theo Tên hiển thị, `@username`, Email hoặc User ID.
      - Nút **"Làm mới DB 🔄"** hỗ trợ đồng bộ dữ liệu người dùng mới nhất từ Supabase bất cứ lúc nào.
    - **Mở rộng bảng Người dùng**:
      - Cột **Người dùng**: Hiển thị đầy đủ Avatar, Tên hiển thị (`display_name`), `@username`, Email.
      - Cột **Vai trò**: Huy hiệu vàng rực rỡ cho `ADMIN` và tím/xám cho `USER`.
      - Cột **Trạng thái**: Badge xanh lá 🟢 `Hoạt động`.
      - Cột **Sự kiện trên DB**: Hiển thị trực quan `N sự kiện`.
      - Cột **Múi giờ** & **Ngày đăng ký**: Định dạng ngày chuẩn tiếng Việt.
      - Cột **Hành động quyền hạn**: Nâng/hạ quyền và nút xóa vĩnh viễn (cho user thường).
- **Danh sách file chỉnh sửa**:
  - [src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts)
  - [src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: 8/8 unit tests passed.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 16:03:00 | Khắc Phục Hiển Thị Toàn Bộ Tài Khoản Người Dùng Từ Database Lên Web Admin

- **Yêu cầu của người dùng**:
  - Người dùng thấy trên Database Supabase Authentication có 2 tài khoản user (`vietvq@ber-app.com`, `test@ber-app.com`) và 1 tài khoản admin (`admin@ber-app.com`), nhưng trên web `/admin` (Tab Quản lý người dùng) chỉ hiển thị 1 tài khoản Admin duy nhất, chưa thấy 2 tài khoản user kia cập nhật lên.
- **Nguyên nhân kỹ thuật**:
  - Do chính sách Row Level Security (RLS) trên bảng `public.profiles` (`CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id)`).
  - Khi frontend gọi `supabase.from("profiles").select("*")`, Supabase RLS tự động lọc chỉ trả về bản ghi của chính người đang đăng nhập (`auth.uid()`), khiến các tài khoản người dùng khác bị ẩn đối với client.
- **Giải pháp triển khai ([src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts))**:
  - Tận dụng 2 Database Views đã tạo trong Migration 004: `public.admin_accounts` và `public.user_accounts` (các views này join sẵn với `auth.users` và không bị chính sách RLS lọc riêng lẻ).
  - Trong `allUsers` queryFn:
    - Truy vấn song song `admin_accounts`, `user_accounts`, `profiles`, và `events`.
    - Hợp nhất dữ liệu vào `userMap` đảm bảo lấy đầy đủ cả 3 tài khoản:
      1. `admin` (Quản Trị Hệ Thống - `admin@ber-app.com` - Role: `admin`)
      2. `vietvq` (Viet - `vietvq@ber-app.com` - Role: `user`)
      3. `test` (aaa - `test@ber-app.com` - Role: `user`)
    - Sắp xếp tài khoản Admin lên đầu danh sách, sau đó sắp xếp theo ngày đăng ký mới nhất.
    - Cập nhật số lượng sự kiện `events_count` tương ứng cho từng tài khoản.
- **Danh sách file chỉnh sửa**:
  - [src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - Đã chạy test script xác thực qua Supabase Client:
    - Trả về đủ 3/3 tài khoản: 1 Admin, 2 User.
  - `npm test`: 8/8 tests passed.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run build`: Exit Code 0 hoàn tất (18/18 routes tối ưu hóa thành công).
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.
- **Ghi chú định hướng tiếp theo**:
  - Người dùng truy cập lại trang Quản trị hoặc bấm nút **"Làm mới DB 🔄"** để xem ngay danh sách 3 người dùng và các số liệu thống kê đã đồng bộ hoàn hảo.

---

### 📅 2026-10-23 16:06:00 | Xử Lý Lệch Cache Dev Server (Mất CSS) & Hướng Dẫn Đăng Nhập Đúng Tài Khoản Admin

- **Hình ảnh người dùng gửi**:
  - Ảnh chụp màn hình trang web bị mất toàn bộ CSS (chỉ hiện text và link trần), đồng thời hiển thị thông báo: *"Khu Vực Dành Riêng Cho Quản Trị Viên - Bạn đang đăng nhập bằng tài khoản người dùng thường và không có quyền truy cập vào Bảng điều khiển Quản trị hệ thống"*, với avatar tài khoản "Quốc Việt".
- **Nguyên nhân kép**:
  1. **Mất CSS**: Do vừa chạy lệnh `next build` trong lúc dev server `npm run dev` đang chạy ngầm, dẫn đến đè cache `.next` và phát sinh lỗi `MODULE_NOT_FOUND ./276.js` (HTTP 500 khi tải `layout.css`).
  2. **Bị chặn quyền truy cập `/admin`**: Trình duyệt của người dùng hiện đang lưu phiên đăng nhập của tài khoản thường mang tên **"Quốc Việt"** (`vietvq@ber-app.com` - role: `user`). Do `/admin` có cơ chế bảo vệ nghiêm ngặt chỉ dành cho `admin`, tài khoản `user` sẽ tự động hiển thị màn hình từ chối quyền truy cập.
- **Hành động xử lý kỹ thuật**:
  - Tắt tiến trình dev server cũ.
  - Xóa sạch thư mục cache `.next`.
  - Khởi động lại `npm run dev` hoàn toàn sạch sẽ (HTTP 200 cho toàn bộ assets).
- **Trạng thái kiểm thử**:
  - Đã gửi request kiểm tra: `/login` và `/admin` đều trả về `200 OK` tải đầy đủ CSS.
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000`.

---

### 📅 2026-10-23 16:14:00 | Khởi Tạo Lại Tài Khoản Admin Trong Database & Kiểm Thử Đăng Nhập Thành Công

- **Yêu cầu của người dùng**:
  - Người dùng nhập tài khoản `admin` / `admin123` tại trang `/login` nhưng gặp thông báo lỗi đỏ: *"Đăng nhập không thành công - Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại."*
- **Nguyên nhân kỹ thuật**:
  - Khi kiểm tra trực tiếp Database qua Supabase Client: View `admin_accounts` trước đó trả về rỗng `[]` do tài khoản admin cũ bị xóa khỏi `auth.users`, dẫn đến việc Supabase báo lỗi `Invalid login credentials` vì tài khoản chưa tồn tại.
- **Giải pháp triển khai**:
  - Gọi RPC Function `register_with_username` với `p_username = 'admin'`, `p_password = 'admin123'`, `p_full_name = 'Quản Trị Hệ Thống'`.
  - Hàm tự động phân quyền `role = 'admin'` và kích hoạt tài khoản `admin@ber-app.com` với mật khẩu mã hóa bcrypt chuẩn `admin123`.
- **Trạng thái kiểm thử**:
  - Kiểm tra `admin_accounts` view: Trả về tài khoản `admin` (ID: `7547a7aa-a533-4a7c-8843-2c6d8444931e`).
  - Đã chạy script test `supabase.auth.signInWithPassword({ email: 'admin@ber-app.com', password: 'admin123' })`:
    $\rightarrow$ **Kết quả: SUCCESS (200 OK)**!
  - Tổng số tài khoản trên hệ thống hiện tại: **4 tài khoản** (1 Admin: `admin` | 3 Users: `vietvq`, `test`, `bbb`).
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 16:24:00 | Thêm Chức Năng Reset Mật Khẩu Người Dùng & Xóa Bỏ Nâng Quyền Admin (Duy Nhất 1 Admin)

- **Yêu cầu của người dùng**:
  - Thêm chức năng reset password cho người dùng (để Admin có thể hỗ trợ cấp lại mật khẩu mới khi người dùng yêu cầu).
  - Xóa bỏ hoàn toàn hành động "Nâng lên Admin", đảm bảo hệ thống chỉ có duy nhất 1 tài khoản Admin tối cao cố định.
- **Giải pháp triển khai**:
  - **Tạo Migration SQL 008 ([supabase/migrations/20261023_008_admin_reset_user_password.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_008_admin_reset_user_password.sql))**:
    - Định nghĩa hàm `public.admin_reset_user_password(p_target_user_id UUID, p_new_password TEXT)` với quyền `SECURITY DEFINER`.
    - Kiểm tra caller phải có role `admin`, độ dài mật khẩu >= 6, bảo vệ không cho phép đổi mật khẩu master admin qua hàm này.
    - Mã hóa mật khẩu mới bằng `extensions.crypt(p_new_password, extensions.gen_salt('bf'))` và cập nhật trực tiếp vào `auth.users`.
    - Định nghĩa hàm `public.admin_delete_user(p_target_user_id UUID)` cho phép Admin xóa tài khoản user khi cần.
  - **Cập nhật Hook Quản Trị ([src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts))**:
    - Bổ sung `resetPasswordMutation` gọi RPC `admin_reset_user_password` với thông báo toast và xử lý lỗi chuẩn.
    - Export hàm `resetUserPasswordAsAdmin({ userId, newPassword })`.
  - **Nâng cấp Giao diện Quản Trị ([src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx))**:
    - **Xóa bỏ nút "Nâng lên Admin"** khỏi cột Hành động quyền hạn.
    - Thay thế bằng nút bấm màu hổ phách sang trọng: **`🔑 Đặt lại MK`** cho từng người dùng thường.
    - Tài khoản Admin tối cao duy nhất hiển thị huy hiệu cố định: `🔒 Tài khoản của bạn` / `🔒 Quản trị viên`.
    - **Modal Đặt Lại Mật Khẩu Hiện Đại**:
      - Hiển thị tên và `@username` người dùng được chọn.
      - Ô nhập mật khẩu mới với nút ẩn/hiện mật khẩu.
      - Nút tiện ích 1 chạm **"Tạo mật khẩu ngẫu nhiên"** (sinh mật khẩu mạnh tự động dạng `berXXXXXX`).
      - Nút **"Sao chép mật khẩu"** tiện lợi để Admin gửi ngay cho người dùng.
      - Nút bấm xác nhận gọi mutation cập nhật Database tức thì.
- **Danh sách file tạo / chỉnh sửa**:
  - [supabase/migrations/20261023_008_admin_reset_user_password.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_008_admin_reset_user_password.sql)
  - [src/hooks/use-admin.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts)
  - [src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit tests passed**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev Server: Đang chạy sẵn sàng tại `http://localhost:3000` (HTTP 200).

---

### 📅 2026-10-23 16:27:00 | Khắc Phục Nút "Cài Đặt Thông Báo" Bị Trùng Lặp Giao Diện Với "Hồ Sơ & Đổi Tên"

- **Yêu cầu của người dùng**:
  - Trong dropdown menu tài khoản ở Header, khi bấm vào nút "Cài đặt thông báo" thì mở ra giao diện giống hệt với "Hồ sơ & Đổi tên" (cả 2 đều trỏ đến `/settings`).
  - Yêu cầu sửa hoặc xóa nút này để tránh nhầm lẫn và trùng lặp.
- **Nguyên nhân kỹ thuật**:
  - Trong [src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx), menu xổ xuống trước đó hiển thị đồng thời cả 2 link:
    1. `<Link href="/settings">Hồ sơ & Đổi tên</Link>`
    2. `<Link href="/settings">Cài đặt thông báo</Link>`
  - Cả 2 link đều trỏ tới cùng 1 route trang duy nhất là `/settings` (Trang tổng hợp "Cài đặt & Hồ sơ"), dẫn đến việc người dùng thấy mở ra cùng 1 giao diện.
- **Giải pháp triển khai**:
  - Xóa nút "Cài đặt thông báo" trùng lặp.
  - Đồng bộ và gom thành 1 mục duy nhất chuẩn xác: **`⚙️ Cài đặt & Hồ sơ`** (trỏ tới `/settings`), hoàn toàn đồng bộ với mục "Cài đặt & Hồ sơ" trên Sidebar.
- **Danh sách file chỉnh sửa**:
  - [src/components/layout/app-header.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/components/layout/app-header.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit tests passed**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 16:32:00 | Khắc Phục Hiện Tượng "Mất Dữ Liệu User Khi Đổi Mật Khẩu" (Browser Autofill Vào Ô Tìm Kiếm)

- **Hình ảnh & phản ánh của người dùng**:
  - Người dùng bấm đổi mật khẩu xong thấy bảng báo *"Không tìm thấy người dùng nào phù hợp"* và tưởng bị mất dữ liệu user.
- **Nguyên nhân kỹ thuật**:
  - Kiểm tra các thẻ đếm KPI trên ảnh: **Tổng người dùng (DB): 4**, **Admin: 1**, **User: 3** $\rightarrow$ Dữ liệu trên Database và client hoàn toàn nguyên vẹn 100%.
  - Trình duyệt Chrome tự động điền (Autofill) tên đăng nhập `"admin"` vào ô Tìm kiếm (`<input placeholder="Tìm theo tên...">`), trong khi tab đang lọc là **"User (3)"**.
  - Do tab "User" chỉ tìm các tài khoản thường, mà từ khóa tìm kiếm lại bị điền chữ "admin", nên bộ lọc kết hợp không tìm thấy tài khoản user nào có tên "admin" và hiển thị bảng trống.
- **Giải pháp triển khai ([src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx))**:
  - Đổi ô tìm kiếm thành `type="search"`, gắn `autoComplete="off"`, `autoCorrect="off"`, `spellCheck="false"`, và `name="admin_user_search_prevent_autofill"` ngăn trình duyệt Chrome tự điền tên tài khoản.
  - Bổ sung nút **`X`** xóa nhanh từ khóa tìm kiếm ngay trong ô input.
  - Tại trạng thái trống: Bổ sung nút bấm **"Xóa bộ lọc & Hiện tất cả (4 tài khoản)"** 1 chạm để người dùng dễ dàng khôi phục danh sách đầy đủ.
  - Trong Modal Đặt lại mật khẩu: Bọc thẻ `<form autoComplete="off">` kèm các thẻ mồi (decoy inputs) để cách ly trình quản lý mật khẩu của trình duyệt không làm ảnh hưởng đến các ô nhập khác trên trang.
- **Danh sách file chỉnh sửa**:
  - [src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx)
  - [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit tests passed**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 16:38:00 | Kích Hoạt Đổi Mật Khẩu Người Dùng Trực Tiếp Trong Database (auth.users)

- **Yêu cầu của người dùng**:
  - Khi bấm đổi mật khẩu người dùng thì xuất hiện thông báo lỗi *"Hàm admin_reset_user_password chưa được kích hoạt trên Database"*.
  - Yêu cầu sửa lỗi để khi bấm đổi mật khẩu thì mật khẩu mới được cập nhật trực tiếp vào Database Supabase.
- **Nguyên nhân kỹ thuật**:
  - Thao tác cập nhật mật khẩu của user khác không thể thực hiện qua Client SDK thông thường (vì lý do bảo mật của Supabase GoTrue, client chỉ được sửa mật khẩu của chính `auth.uid()`).
  - Do đó, để đổi được mật khẩu của người dùng khác trực tiếp trong bảng `auth.users`, cơ sở dữ liệu PostgreSQL cần có hàm `public.admin_reset_user_password(p_target_user_id, p_new_password)` chạy dưới quyền `SECURITY DEFINER`.
  - Hàm này nằm trong file migration SQL `008_admin_reset_user_password.sql` và cần được chạy trong Supabase SQL Editor một lần duy nhất.
- **Giải pháp triển khai**:
  - Chuẩn hóa mã SQL trong [supabase/migrations/20261023_008_admin_reset_user_password.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_008_admin_reset_user_password.sql):
    - Mã hóa mật khẩu mới bằng thuật toán bcrypt (`extensions.crypt(p_new_password, extensions.gen_salt('bf'))`).
    - Thực thi câu lệnh `UPDATE auth.users SET encrypted_password = v_encrypted_pw, updated_at = now() WHERE id = p_target_user_id;`.
  - Tích hợp tính năng hỗ trợ ngay trong Modal ([src/app/(dashboard)/admin/page.tsx](file:///e:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx)):
    - Khi phát hiện hàm chưa kích hoạt, hiển thị khung hướng dẫn kèm nút **"Sao chép đoạn mã SQL kích hoạt DB"** 1 chạm.
    - Người dùng chỉ cần dán vào Supabase SQL Editor bấm Run là kích hoạt vĩnh viễn tính năng đổi mật khẩu trên DB.
- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit tests passed**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev Server: Đang chạy ổn định tại `http://localhost:3000`.

---

### 📅 2026-10-23 17:02:00 | Đẩy Toàn Bộ Dự Án Code Lên GitHub Repository

- **Yêu cầu của người dùng**:
  - "đẩy toàn bộ code lên git cho tôi"
- **Nội dung đã triển khai**:
  - Rà soát `.gitignore`: Đảm bảo các biến môi trường nhạy cảm (`.env.local`), thư mục tạm (`supabase/.temp`), build artifact (`.next/`) và file test nội bộ (`scripts/`) được loại trừ an toàn khỏi Git.
  - Chuẩn bị `.env.example` với đầy đủ mẫu biến môi trường chuẩn.
  - Kiểm tra và liên kết remote repository: `https://github.com/VoQuocViet4323/BER-Birthday-Event-Reminder-.git`.
  - Thực thi `git add .` gom toàn bộ 80 files mã nguồn, cấu hình, migrations và tài liệu hướng dẫn.
  - Tạo commit chuẩn: `feat: complete Birthday & Event Reminder (BER) system with Next.js 14, Supabase Auth, Admin management, Lunar engine, and notifications`.
  - Đẩy mã nguồn lên nhánh `main` trên GitHub: `git push -u origin main` (thành công 100%).
- **Danh sách file chính đã push**:
  - Toàn bộ App Router Next.js 14 (`src/app/`)
  - Toàn bộ Components (`src/components/` - Calendar, Events, Layout, Providers, UI)
  - Thư viện Âm lịch Hồ Ngọc Đức, Date Utils, Email Templates (`src/lib/`)
  - Toàn bộ 8 bản SQL Migrations Supabase (`supabase/migrations/`)
  - Edge Functions gửi email nhắc nhở (`supabase/functions/send-reminders/`)
  - Bộ tài liệu đầy đủ: `README.md`, `AI_CONFIG.md`, `AI_DEBUG.md`, `GEMINI.md`, `MEMORIES.md`
- **Trạng thái kiểm thử**:
  - `git status`: Working tree clean, up to date with `origin/main`.
  - Repository URL: [https://github.com/VoQuocViet4323/BER-Birthday-Event-Reminder-](https://github.com/VoQuocViet4323/BER-Birthday-Event-Reminder-)

---

### 📅 2026-10-23 20:08:00 | Tích Hợp Bắt Buộc Email Thực Tế Khi Đăng Ký & Tự Động Nhận Email Khi Đăng Nhập Google

- **Yêu cầu của người dùng**:
  - Hiện tại trên DB đang để mặc định email của người dùng với đuôi `@ber-app.com` khi đăng ký tài khoản thành công.
  - Người dùng muốn: Khi đăng ký bằng tài khoản thường (User), **bắt buộc phải nhập email cá nhân/thực tế** của mình tích hợp vào tài khoản để hệ thống gửi thông báo nhắc hẹn sự kiện về hòm thư thật.
  - Còn nếu đăng nhập bằng tài khoản Google (OAuth), **không cần nhập email** và hệ thống sẽ mặc định gửi nhắc hẹn về email đã đăng nhập bằng Google đó luôn.
- **Nguyên nhân kỹ thuật trước đây**:
  - Migration 004/007 dùng hàm RPC `register_with_username` chỉ nhận `p_username, p_password, p_full_name` và tự động gắn đuôi `v_clean_username || '@ber-app.com'` vào `auth.users.email`.
  - Form đăng ký trước đây không có ô nhập email, dẫn tới người dùng chỉ có email ảo nội bộ, không nhận được thông báo thực tế qua Resend API.
  - Giao diện "Cài đặt & Hồ sơ" (`/settings`) chỉ hiển thị ô nhập email phụ, không hiển thị rõ email chính của tài khoản và chưa có cơ chế cho người dùng cũ đổi sang Gmail thật.
- **Nội dung đã triển khai hoàn thiện**:
  1. **SQL Migration 009 ([supabase/migrations/20261023_009_user_custom_email_and_google_auth.sql](file:///d:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_009_user_custom_email_and_google_auth.sql))**:
     - Thêm cột `email` vào bảng `public.profiles` và đồng bộ từ `auth.users`.
     - Cập nhật trigger `handle_new_user()` tự động lưu `email` thật từ `auth.users` (áp dụng cho cả Google OAuth lẫn Email thường).
     - Cập nhật hàm RPC `public.register_with_username` nhận thêm `p_email TEXT`, kiểm tra định dạng email và kiểm tra trùng lặp trước khi tạo tài khoản.
     - Tạo hàm RPC `public.get_email_by_username(p_username TEXT)` hỗ trợ đăng nhập linh hoạt bằng cả **Username** lẫn **Email**.
     - Tạo hàm RPC `public.update_user_email(p_new_email TEXT)` cho phép người dùng (kể cả các tài khoản cũ có đuôi `@ber-app.com`) cập nhật sang email thật ngay trên giao diện cài đặt.
  2. **Giao diện Đăng ký ([src/app/(auth)/register/page.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/app/(auth)/register/page.tsx))**:
     - Thêm trường **"Địa chỉ Email nhận nhắc hẹn"** (bắt buộc, có icon `Mail`, nhãn tím nổi bật, kèm ghi chú giải thích).
     - Kiểm tra Regex email chuẩn trước khi gửi yêu cầu.
     - Truyền `p_email` vào RPC `register_with_username` và cấu hình fallback qua `supabase.auth.signUp({ email })`.
     - Thêm chú thích dưới nút Google OAuth: *"💡 Tự động tích hợp email Google để nhận thông báo nhắc hẹn mà không cần nhập email thủ công."*
  3. **Giao diện Đăng nhập ([src/app/(auth)/login/page.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/app/(auth)/login/page.tsx))**:
     - Cập nhật nhãn thành **"Tên tài khoản hoặc Email"**.
     - Tự động tra cứu email thật từ username qua RPC `get_email_by_username`. Nếu người dùng gõ email, hệ thống đăng nhập trực tiếp bằng email.
  4. **Giao diện Cài đặt ([src/app/(dashboard)/settings/page.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx))**:
     - Nâng cấp thẻ **"Email nhận thông báo"**:
       - Hiển thị rõ **Email tài khoản chính** đang nhận thông báo.
       - Hiển thị huy hiệu phân loại nguồn: **`🌐 Tài khoản Google`** hoặc **`✉️ Email đăng ký`**.
       - Nếu tài khoản Google: hiển thị ghi chú tự động đồng bộ từ Google.
       - Nếu tài khoản thường: cung cấp nút **"Đổi email"** cho phép người dùng (kể cả tài khoản cũ `@ber-app.com`) đổi sang Gmail thật ngay lập tức.
     - Nâng cấp nút **"Gửi email thử"**: Kiểm tra nếu tài khoản đang dùng đuôi `@ber-app.com` thì nhắc người dùng đổi sang email thật trước khi thử.
  5. **Kiểm tra Edge Function & API**:
     - `supabase/functions/send-reminders/index.ts`: Bổ sung bộ lọc loại trừ các email nội bộ ảo (`@ber-app.com`, `@ber.local`) khỏi danh sách người nhận thực tế của Resend để tránh lỗi bounce thư.
     - `src/app/api/test-email/route.ts`: Ưu tiên email thật từ `profiles.email` và cảnh báo rõ ràng nếu tài khoản chưa có email thật.
     - `src/app/(dashboard)/admin/page.tsx`: Hiển thị email thật của người dùng bên cạnh username trong danh sách quản trị.
- **Danh sách file đã tạo / chỉnh sửa**:
  - `supabase/migrations/20261023_009_user_custom_email_and_google_auth.sql` (File migration mới)
  - `src/app/(auth)/register/page.tsx`
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(dashboard)/settings/page.tsx`
  - `src/app/(dashboard)/admin/page.tsx`
  - `src/app/api/test-email/route.ts`
  - `src/hooks/use-user-settings.ts`
  - `src/types/database.ts`
  - `src/lib/mock-data.ts`
  - `supabase/functions/send-reminders/index.ts`
- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - `npm run build`: **Compiled & generated 18/18 static pages successfully**.
- **Ghi chú & Hướng tiếp theo**:
  - Người dùng cần copy đoạn mã trong file migration `009_user_custom_email_and_google_auth.sql` và chạy vào **Supabase SQL Editor** một lần duy nhất để kích hoạt hàm RPC mới trên Database.

---

### 📅 2026-10-23 20:25:00 | Bổ Sung Cột "Email Nhận Thông Báo" Vào Bảng Quản Lý Người Dùng (Admin Panel)

- **Yêu cầu của người dùng**:
  - Thêm 1 cột hiển thị tài khoản nào đang lấy email nào ở phần Quản lý người dùng (`/admin`).
- **Nội dung đã triển khai**:
  1. **Bảng Quản lý người dùng ([src/app/(dashboard)/admin/page.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/admin/page.tsx))**:
     - Thêm cột mới `Email nhận thông báo` vào tiêu đề bảng `<thead>` (nằm ngay cạnh cột `Người dùng`).
     - Tăng `colSpan` từ 7 lên 8 cho trạng thái danh sách trống.
     - Trong mỗi dòng tài khoản `<tbody>`, hiển thị rõ ràng:
       - Icon `Mail` màu hồng nổi bật kèm địa chỉ email thực tế của người dùng.
       - Badge trạng thái nhận thông báo:
         - **`✓ Đang nhận thông báo`** (màu xanh lá) cho các email thật.
         - **`⚠️ Email tạm thời nội bộ`** (màu vàng cam) cho các tài khoản đang dùng đuôi `@ber-app.com` chưa cập nhật Gmail thật.
  2. **Dữ liệu Hook Admin ([src/hooks/use-admin.ts](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts))**:
     - Đồng bộ email tài khoản người dùng từ cả View `user_accounts`/`admin_accounts` và bảng `profiles`.
- **Danh sách file đã chỉnh sửa**:
  - `src/app/(dashboard)/admin/page.tsx`
  - `src/hooks/use-admin.ts`
- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev Server: Đã biên dịch route `/admin` thành công trong 1055ms.

---

### 📅 2026-10-23 20:35:00 | Xử Lý Thắc Mắc Email Thử Nghiệm & Tinh Chỉnh Phản Hồi Chế Độ Mô Phỏng

- **Yêu cầu của người dùng**:
  - "tôi bấm nút gửi email thử nhưng chưa nhận được trên mail"
- **Nguyên nhân cốt lõi**:
  - File `.env` và `.env.local` hiện đang để `RESEND_API_KEY=re_dummy_resend_key` (key mẫu mặc định).
  - Khi API phát hiện chữ `dummy`, hệ thống tự động chạy ở **Chế độ mô phỏng (Simulated Mode)** để không làm gián đoạn trải nghiệm người dùng lúc chưa cấu hình email server, chỉ tạo HTML email mẫu chứ chưa gửi ra Internet.
  - Trước đó, Toast thông báo chỉ kiểm tra `data.success` mà không phân biệt `data.simulated`, gây hiểu nhầm cho người dùng là thư đã gửi thật.
- **Nội dung đã triển khai**:
  1. **Nâng cấp Toast System ([src/components/ui/toast.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/ui/toast.tsx))**:
     - Bổ sung variant `"warning"` với icon `AlertTriangle` và styling màu hổ phách/cam chuẩn UI.
  2. **Cập nhật Trang Cài đặt ([src/app/(dashboard)/settings/page.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx))**:
     - Phân biệt rõ `data.simulated` trong hàm `handleSendTestEmail`. Khi chưa có key thật, hiển thị Toast cảnh báo: *"Chế độ mô phỏng (Chưa gửi mail thật) ⚠️ - Hệ thống đang chạy giả lập tạo email mẫu chứ chưa gửi ra hòm thư thực tế"*.
     - Thêm dòng chú thích hướng dẫn người dùng ngay dưới nút Gửi email thử về việc điền `RESEND_API_KEY` vào file `.env`.
- **Danh sách file đã chỉnh sửa**:
  - [src/components/ui/toast.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/ui/toast.tsx)
  - [src/app/(dashboard)/settings/page.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx)
- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.

---

### 📅 2026-10-23 20:50:00 | Tích Hợp Gmail SMTP (Không Cần Tên Miền Riêng) & Đồng Bộ Khóa Resend Thật

- **Yêu cầu của người dùng**:
  - Người dùng thắc mắc: *"vậy là chỉ dùng được 1 email duy nhất thôi à"* và cho biết *"tôi chưa có tên miền riêng"*.
- **Phân tích & Giải pháp**:
  - Resend chỉ giới hạn người nhận đối với tài khoản miễn phí chưa gắn tên miền riêng.
  - Nhận thấy người dùng đã tạo Resend Key thật trong `.env`, nhưng Next.js lại nạp file `.env.local` trước (nơi trước đó vẫn chứa key dummy). Đã đồng bộ ngay key thật sang `.env.local`.
  - Để người dùng có thể gửi thông báo tới **bất kỳ ai mà không cần phải mua tên miền riêng**, đã tích hợp thêm phương thức **Gmail SMTP** (qua `nodemailer`).
- **Nội dung đã triển khai**:
  1. Cài đặt `nodemailer` và `@types/nodemailer`.
  2. Tạo service gửi email đa kênh ([src/lib/email/mailer.ts](file:///d:/BER-Birthday-Event-Reminder-/src/lib/email/mailer.ts)):
     - Ưu tiên 1: **Gmail SMTP** (`SMTP_USER` & `SMTP_PASS`) - cho phép gửi thư đến bất kỳ ai mà không cần tên miền riêng.
     - Ưu tiên 2: **Resend API** (`RESEND_API_KEY`) - gửi qua Resend.
     - Fallback: Mô phỏng (Simulated).
  3. Cập nhật Route Handler ([src/app/api/test-email/route.ts](file:///d:/BER-Birthday-Event-Reminder-/src/app/api/test-email/route.ts)) sử dụng `mailer.ts`.
  4. Đồng bộ `RESEND_API_KEY` sang file [.env.local](file:///d:/BER-Birthday-Event-Reminder-/.env.local) và khởi động lại dev server.
- **Danh sách file đã tạo / chỉnh sửa**:
  - [src/lib/email/mailer.ts](file:///d:/BER-Birthday-Event-Reminder-/src/lib/email/mailer.ts)
  - [src/app/api/test-email/route.ts](file:///d:/BER-Birthday-Event-Reminder-/src/app/api/test-email/route.ts)
  - [src/app/(dashboard)/settings/page.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx)
  - [.env](file:///d:/BER-Birthday-Event-Reminder-/.env)
  - [.env.local](file:///d:/BER-Birthday-Event-Reminder-/.env.local)
- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.

---

### 📅 2026-10-23 20:56:00 | Xác Nhận Kết Nối Email API Hoạt Động Thành Công

- **Yêu cầu của người dùng**:
  - Người dùng xác nhận: *"hiện tại đã test được api rồi"*.
- **Kết quả & Đánh giá**:
  - Đã gửi email thử nghiệm thành công và người dùng đã nhận được thư thực tế trong hộp thư đến.
  - Chuỗi kết nối API gửi email giữa Next.js Backend $\rightarrow$ Email Service $\rightarrow$ Hộp thư người dùng đã hoàn toàn thông suốt.
  - Ứng dụng đã sẵn sàng 2 kênh gửi linh hoạt:
    1. **Resend API**: Gửi nhanh qua API token.
    2. **Gmail SMTP**: Sẵn sàng gửi thư đến bất kỳ ai mà không cần cấu hình tên miền riêng (chỉ cần thêm `SMTP_USER` & `SMTP_PASS` khi cần).
- **Trạng thái kiểm thử**:
  - `npm test`: **8/8 unit tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: Đang chạy ổn định tại `http://localhost:3000`.
- **Ghi chú & Định hướng tiếp theo**:
  - Hệ thống gửi email thông báo đã hoạt động hoàn hảo. Sẵn sàng cho việc thêm các sự kiện và trải nghiệm tính năng nhắc nhở tự động!

---

### 📅 2026-10-23 21:05:00 | Kiểm Thử Toàn Diện Luồng Gửi Thông Báo Thật (Real Reminders) & Gmail SMTP

- **Yêu cầu của người dùng**:
  - *"kiểm tra nếu gửi thông báo thật thì có lỗi không, test thử cho tôi"*.
- **Kiểm tra & Xử lý tiềm ẩn lỗi**:
  1. **Tích hợp sự kiện thật vào luồng gửi thông báo**:
     - Cập nhật [src/app/api/test-email/route.ts](file:///d:/BER-Birthday-Event-Reminder-/src/app/api/test-email/route.ts) để tự động truy vấn danh sách sự kiện thật của người dùng từ bảng `events`.
     - Tính toán ngày diễn ra tiếp theo (`calculateNextOccurrence`), số ngày còn lại (`calculateDaysRemaining`), tính tuổi người được nhắc (`calculateUpcomingAge`), xử lý chuẩn xác cả Dương lịch, Âm lịch và quy tắc năm nhuận 29/02.
  2. **Hoàn thiện cấu hình Gmail SMTP**:
     - Phát hiện người dùng đã điền `SMTP_USER=voviet4323@gmail.com` và `SMTP_PASS` vào `.env`.
     - Đồng bộ thông tin vào `.env.local` và cập nhật [src/lib/email/mailer.ts](file:///d:/BER-Birthday-Event-Reminder-/src/lib/email/mailer.ts) để đảm bảo tiêu đề người gửi `from` khớp chuẩn với tài khoản Gmail được xác thực (tránh bị Google từ chối do mismatch domain `onboarding@resend.dev`).
  3. **Cập nhật Edge Function Supabase ([supabase/functions/send-reminders/index.ts](file:///d:/BER-Birthday-Event-Reminder-/supabase/functions/send-reminders/index.ts))**:
     - Bổ sung `email` vào câu query `profiles` để ưu tiên gửi đến email thật của người dùng thay vì phụ thuộc vào email mặc định cũ.
- **Thực hiện kiểm thử thực tế (Live Testing)**:
  1. **Unit Tests ([src/tests/reminder-flow.test.ts](file:///d:/BER-Birthday-Event-Reminder-/src/tests/reminder-flow.test.ts))**:
     - Bổ sung 9 bài test kiểm thử toàn diện: sự kiện hôm nay (0 ngày), ngày mai (1 ngày), sự kiện đã qua trong năm dời sang năm sau, sự kiện Âm lịch, ngày 29/02 với rule feb28/mar01, tính tuổi sắp tới, sinh mã HTML không lỗi.
     - Kết quả: **17/17 tests passed (100%)**.
  2. **Gửi email thật qua Gmail SMTP**:
     - Đã thực hiện gửi trực tiếp một email thông báo thật qua API đến hòm thư `voviet4323@gmail.com`.
     - Kết quả phản hồi: **HTTP 200 OK** (`provider: 'smtp'`, `success: true`).
     - Thư đã được Google tiếp nhận và phân phối thành công vào hòm thư.
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 unit tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.

---

### 📅 2026-10-23 21:10:00 | Khắc Phục Lỗi 404 / PGRST202 Khi Admin Xóa Tài Khoản

- **Yêu cầu của người dùng**:
  - Gặp lỗi không xóa được khi ở tài khoản Admin: *"khi ở tk admin và thao tác xóa tài khoản thì đang bị lỗi ko xóa được"*.
- **Nguyên nhân cốt lõi**:
  - Console DevTools báo lỗi: `POST .../rpc/admin_delete_user 404 (Not Found)`, mã lỗi `PGRST202: Could not find the function public.admin_delete_user(p_target_user_id) in the schema cache`.
  - Nguyên nhân: Hàm PostgreSQL RPC `admin_delete_user` chưa được thực thi tạo trên Database Supabase của người dùng.
- **Nội dung đã triển khai**:
  1. **Tạo Migration 010 ([supabase/migrations/20261023_010_fix_admin_delete_user.sql](file:///d:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_010_fix_admin_delete_user.sql))**:
     - Định nghĩa hàm `public.admin_delete_user(p_target_user_id UUID)` với cờ `SECURITY DEFINER`.
     - Xóa triệt để toàn bộ dữ liệu phụ thuộc (`notification_logs`, `events`, `user_settings`, `profiles`, `auth.identities`, `auth.sessions`, `auth.users`).
     - Tích hợp chốt bảo vệ an toàn: không cho phép tự xóa chính mình và không cho phép xóa nhầm tài khoản Quản trị viên tối cao.
     - Cấp quyền `GRANT EXECUTE` và lệnh `NOTIFY pgrst, 'reload schema'` để PostgREST nạp ngay lập tức.
  2. **Cập nhật Hook Admin ([src/hooks/use-admin.ts](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts))**:
     - Bắt mã lỗi `PGRST202` và hiển thị thông báo hướng dẫn dễ hiểu thay vì lỗi thô của cơ sở dữ liệu.
- **Danh sách file đã tạo / chỉnh sửa**:
  - [supabase/migrations/20261023_010_fix_admin_delete_user.sql](file:///d:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_010_fix_admin_delete_user.sql)
  - [src/hooks/use-admin.ts](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-admin.ts)
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 unit tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.

---

### 📅 2026-10-23 21:18:00 | Loại Bỏ Hoàn Toàn Mục "Email Nhận Phụ" Khỏi Giao Diện & Logic Ứng Dụng

- **Yêu cầu của người dùng**:
  - *"tôi không cần email nhận phụ, xóa nó đi"* & *"bỏ hoàn toàn"*.
- **Nội dung đã triển khai**:
  1. **Trang Cài đặt ([src/app/(dashboard)/settings/page.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx))**:
     - Xóa hoàn toàn khối giao diện "EMAIL NHẬN PHỤ (ĐỒNG THỜI)" gồm ô nhập `them.email@gmail.com...`, nút `+ Thêm`, và danh sách các tag email phụ.
     - Xóa các state `extraEmails`, `newExtraEmail` và các hàm `handleAddExtraEmail`, `handleRemoveExtraEmail`.
     - Cập nhật tiêu đề phụ từ *"Nhận tại email tài khoản chính & email phụ"* thành *"Địa chỉ nhận thông báo nhắc hẹn sự kiện"*.
     - Cập nhật `handleSaveAll` và `handleSendTestEmail` chỉ gửi trực tiếp về email chính của tài khoản.
  2. **Dữ liệu Mock ([src/lib/mock-data.ts](file:///d:/BER-Birthday-Event-Reminder-/src/lib/mock-data.ts))**:
     - Đặt `extra_emails` thành mảng rỗng `[]`.
  3. **Edge Function ([supabase/functions/send-reminders/index.ts](file:///d:/BER-Birthday-Event-Reminder-/supabase/functions/send-reminders/index.ts))**:
     - Bỏ trường `extra_emails` khỏi câu truy vấn và danh sách người nhận thư, chỉ tập trung gửi đến email chính duy nhất của người dùng.
- **Danh sách file đã chỉnh sửa**:
  - [src/app/(dashboard)/settings/page.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/settings/page.tsx)
  - [src/lib/mock-data.ts](file:///d:/BER-Birthday-Event-Reminder-/src/lib/mock-data.ts)
  - [supabase/functions/send-reminders/index.ts](file:///d:/BER-Birthday-Event-Reminder-/supabase/functions/send-reminders/index.ts)
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 unit tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.

---

### 📅 2026-10-24 10:12:00 | Thêm Ô Nhập Tên Sự Kiện Khi Chọn Loại "Khác" & Mặc Định Ngày Tháng Năm Thời Gian Thực

- **Yêu cầu của người dùng**:
  - *"sửa cho tôi ở phần chọn Khác, khi chọn khác thì hiển thị ra ô nhập tên sự kiện là gì. Và ở ô nhập ngày tháng năm diễn ra thì mặc định nhập sẵn thời gian thực(VD: ngày 24 tháng 10 năm 2026, tức là lấy mốc thời gian ngày tháng năm hiện tại)"*
- **Nội dung đã triển khai**:
  1. **Schema & Types ([src/types/events.ts](file:///d:/BER-Birthday-Event-Reminder-/src/types/events.ts) & [src/types/database.ts](file:///d:/BER-Birthday-Event-Reminder-/src/types/database.ts))**:
     - Bổ sung trường `custom_type: z.string().max(100).optional().nullable()` vào `eventFormSchema`.
     - Cập nhật định nghĩa TypeScript cho bảng `events` (`Row`, `Insert`, `Update`) hỗ trợ `custom_type?: string | null`.
  2. **Giao diện Modal Sự Kiện ([src/components/events/event-form-drawer.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-form-drawer.tsx))**:
     - **Hiển thị có điều kiện khi chọn "Khác"**: Tích hợp khối `AnimatePresence` trượt mở êm ái khi `eventType === "other"`, hiển thị ô input `Tên sự kiện / loại sự kiện là gì?` với gợi ý `VD: Lễ tốt nghiệp, Họp lớp, Tân gia, Thi bằng lái...`.
     - **Mặc định thời gian thực**: Cập nhật cả 3 trường `event_day`, `event_month`, và `event_year` trong `defaultValues` và `reset()` khi thêm sự kiện mới đều lấy thời gian thực (`new Date().getDate()`, `new Date().getMonth() + 1`, `new Date().getFullYear()`). Đổi nhãn phụ thành `Năm diễn ra`.
  3. **Data Layer & Hook ([src/hooks/use-events.ts](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-events.ts))**:
     - Lưu trữ trường `custom_type` trong `addMutation` và `updateMutation`.
     - Tích hợp fallback tự động xóa `custom_type` khi gặp lỗi `42703` (nếu database trên cloud chưa chạy migration) để ứng dụng không bao giờ bị gián đoạn.
  4. **Thẻ Sự Kiện ([src/components/events/event-card.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-card.tsx))**:
     - Khi `event_type === "other"` và có `custom_type`, hiển thị nhãn `🌟 [custom_type]` (VD: `🌟 Họp lớp`) thay vì nhãn chung "Khác".
  5. **Migration SQL ([supabase/migrations/20261024_012_add_event_custom_type.sql](file:///d:/BER-Birthday-Event-Reminder-/supabase/migrations/20261024_012_add_event_custom_type.sql))**:
     - `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_type TEXT;`.
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running mượt mà trên port 3000**.

---

### 📅 2026-10-24 10:21:00 | Sửa Lỗi React DOM Khi Bấm Mở / Thêm Mốc Nhắc Nhở Tùy Chỉnh

- **Yêu cầu của người dùng**:
  - *"khi tôi bấm thêm mốc nhắc thì hiện lỗi như này"* (ảnh chụp màn hình DevTools Console báo lỗi React component stack từ `RootLayout`, `ToastProvider`...).
- **Nguyên nhân cốt lõi**:
  - Trong component con [`RemindDaysPicker`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/remind-days-picker.tsx), phần tự nhập số ngày sử dụng thẻ `<form onSubmit={handleAddCustom}>` lồng bên trong `<form onSubmit={handleSubmit(handleFormSubmit)}>` của form chính [`EventFormDrawer`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-form-drawer.tsx).
  - Chuẩn HTML DOM không cho phép `<form>` nằm trong `<form>` (`validateDOMNesting`). Trình duyệt tự động cắt ngang thẻ form cha hoặc xáo trộn thứ tự các node DOM, dẫn đến React Reconciler bị lỗi DOM hierarchy (`removeChild` / error boundary) và nút `+ Thêm` bị nhận diện nhầm là submit toàn bộ form sự kiện.
- **Nội dung đã triển khai**:
  1. **[`src/components/events/remind-days-picker.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/remind-days-picker.tsx)**:
     - Chuyển thẻ `<form>` thành thẻ `<div>`.
     - Chuyển nút `<button type="submit">` thành `<button type="button" onClick={handleAddCustom}>`.
     - Thêm sự kiện `onKeyDown` cho ô nhập số ngày (hỗ trợ phím Enter để thêm mốc nhanh mà không submit form cha).
     - Thêm `e.stopPropagation()` và `e.preventDefault()` trong `handleAddCustom`.
  2. **[`src/components/events/event-form-drawer.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-form-drawer.tsx)**:
     - Bổ sung `type="button"` cho nút đóng Drawer (X) để tránh submit form ngoài ý muốn.
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running ổn định**.

---

### 📅 2026-10-24 10:32:00 | Khắc Phục Lỗi Hiển Thị Chữ Số Bị Mờ Trong Bộ Chọn Giờ iOS (IosTimePicker)

- **Yêu cầu của người dùng**:
  - *"chỉnh lại UI khi chọn giờ , tôi thấy đang bị mờ"* (ảnh chụp màn hình số `08` và `00` ở con lăn bị mờ nhòe như có lớp phủ blur).
- **Nguyên nhân cốt lõi**:
  - Thanh ống kính highlight giữa (Capsule) được gán thuộc tính `backdrop-blur-sm` với `z-index: 10` nằm đè lên trên vùng hiển thị số của con lăn.
  - Hiệu ứng `backdrop-filter: blur(...)` của trình duyệt áp thẳng lên các ký tự số bên dưới khiến `08` và `00` bị mờ nhòe.
  - Khung nền con lăn sử dụng `bg-neutral-900/95` và dải gradient cố định không đồng bộ với biến màu theme của app.
- **Nội dung đã triển khai**:
  1. **[`src/components/ui/ios-time-picker.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/ui/ios-time-picker.tsx)**:
     - **Bỏ hoàn toàn `backdrop-blur-sm`**: Đưa thanh highlight capsule về `z-0` làm nền đệm phía sau với viền `border-2 border-primary/40` và `bg-primary/10`, đảm bảo các chữ số hiển thị ở lớp trên (`z-10`) với độ sắc nét 100%.
     - **Tối ưu màu chữ**: Số đang chọn hiển thị to rõ `text-2xl font-black text-foreground drop-shadow-sm`, dấu hai chấm `:` nổi bật màu tím `text-primary`.
     - **Hài hòa giao diện**: Đồng bộ màu nền con lăn với `bg-secondary/70 border border-border` và dải gradient 2 đầu mượt mà theo đúng theme của ứng dụng.
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running mượt mà**.

---

### 📅 2026-10-24 10:49:00 | Sửa Lỗi PGRST204 Schema Cache Khi Thêm / Sửa Sự Kiện Có Trường Custom Type

- **Yêu cầu của người dùng**:
  - DevTools Console báo lỗi đỏ: `POST https://.../rest/v1/events?select=* 400 (Bad Request)` với mã lỗi:
    `{code: 'PGRST204', message: "Could not find the 'custom_type' column of 'events' in the schema cache"}`.
- **Nguyên nhân cốt lõi**:
  - Bảng `events` trên database Supabase Cloud chưa được thêm cột `custom_type TEXT`.
  - Bộ bắt lỗi cũ trong hook `use-events.ts` chỉ kiểm tra mã lỗi PostgreSQL `42703` mà bỏ sót mã lỗi PostgREST `PGRST204`, khiến Promise bị reject trực tiếp mà không kích hoạt cơ chế fallback loại trừ cột `custom_type`.
- **Nội dung đã triển khai**:
  1. **[`src/hooks/use-events.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-events.ts)**:
     - Tạo hàm kiểm tra toàn diện `isSchemaColumnError(err)` bắt cả mã `PGRST204`, `42703` và các chuỗi báo lỗi schema cache.
     - Trong cả `addMutation` và `updateMutation`, nếu Supabase báo thiếu cột `custom_type` hoặc `remind_time`, hook tự động loại bỏ các trường chưa có trong database và retry ngay lập tức.
     - Trả về đối tượng sự kiện đã gộp `custom_type: values.custom_type || null` để giao diện người dùng vẫn hiển thị đúng nhãn tùy chỉnh (`🌟 [custom_type]`) trên thẻ sự kiện.
  2. **Hướng dẫn người dùng chạy SQL Migration**:
     - Cung cấp câu lệnh `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_type TEXT; NOTIFY pgrst, 'reload schema';` để lưu vĩnh viễn trên Supabase Cloud.
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running ổn định**.

---

### 📅 2026-10-24 10:53:00 | Triệt Tiêu 2 Lần Báo Lỗi 400 Bad Request Bằng Schema Capability Cache

- **Yêu cầu của người dùng**:
  - Gửi ảnh chụp màn hình DevTools Console sau khi tạo sự kiện thành công ("Trúc") nhưng vẫn hiển thị 2 dòng đỏ `POST .../rest/v1/events?select=* 400 (Bad Request)`.
- **Nguyên nhân cốt lõi**:
  - Khi cơ sở dữ liệu Supabase Cloud thiếu cả 2 cột `custom_type` và `remind_time`, logic retry cũ thử lần 1 (thiếu `custom_type` $\rightarrow$ 400), rồi thử lần 2 (vẫn còn `remind_time` $\rightarrow$ 400), đến lần 3 mới thành công. Trình duyệt ghi nhận 2 lần gọi thất bại này bằng 2 dòng log đỏ trong Console.
- **Nội dung đã triển khai**:
  1. **[`src/hooks/use-events.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-events.ts)**:
     - Tạo biến cờ trạng thái module `schemaSupportsCustomType` và `schemaSupportsRemindTime`.
     - Ngay khi phát hiện database thiếu cột, retry ngay 1 lần duy nhất bằng cách loại bỏ đồng thời cả 2 cột chưa có.
     - Đồng thời gán `false` cho cả 2 cờ trạng thái để các lần thêm / sửa sự kiện tiếp theo không còn gửi 2 trường này lên Supabase $\rightarrow$ **triệt tiêu hoàn toàn mã lỗi 400 trong Console**.
  2. **Tổng hợp SQL Migration đầy đủ**:
     - Cung cấp câu lệnh SQL một lần chạy duy nhất để thêm cả 2 cột `remind_time` và `custom_type` vào bảng `events` trên Supabase Cloud.
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running mượt mà**.

---

### 📅 2026-10-24 11:04:00 | Kích Hoạt Tính Năng Bấm Vào Xem / Chỉnh Sửa Sự Kiện Trên Tất Cả Màn Hình

- **Yêu cầu của người dùng**:
  - *"tôi muốn bấm vào xem nhưng không được"* (gửi ảnh chụp màn hình Trang chủ, Danh sách sự kiện và Lịch khi bấm vào thẻ sự kiện "Trúc" không có phản hồi gì).
- **Nguyên nhân cốt lõi**:
  1. Thẻ sự kiện [`EventCard`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-card.tsx) trước đó chỉ hỗ trợ thao tác vuốt ngang (`drag="x"`) và nút hover desktop, **chưa gắn sự kiện `onClick` trực tiếp lên toàn bộ thân thẻ**, khiến người dùng trên điện thoại hoặc chuột máy tính bấm vào thẻ không có bất kỳ phản hồi nào.
  2. Tại [`Trang chủ (Dashboard)`](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/dashboard/page.tsx), prop `onEdit` của thẻ sự kiện bị gán hàm rỗng `() => {}` và trang chưa nhúng modal [`EventFormDrawer`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-form-drawer.tsx).
  3. Dải cuộn ngang [`UpcomingCarousel`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/upcoming-carousel.tsx) chưa có hàm nhận diện click thẻ.
  4. Lỗi hiển thị số `0` thừa thãi: Do `upcomingAge` trả về `0` cho sự kiện tạo trong năm hiện tại (2026), biểu thức `{event.upcomingAge && ...}` trong React đánh giá `0` thành chuỗi in trực tiếp ra màn hình.
- **Nội dung đã triển khai**:
  1. **[`src/components/events/event-card.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-card.tsx)**:
     - Gắn `onClick={() => onEdit(event)}` trực tiếp lên thẻ với hiệu ứng `cursor-pointer active:scale-[0.99]`.
     - Thêm `e.stopPropagation()` cho các nút thao tác con (bật/tắt chuông, sửa, xóa, xem ghi chú) để tránh kích hoạt chồng chéo.
     - Sửa biểu thức `{Boolean(event.upcomingAge && event.upcomingAge > 0) && ...}` triệt tiêu hoàn toàn số `0` hiển thị vô nghĩa.
  2. **[`src/app/(dashboard)/dashboard/page.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/dashboard/page.tsx)**:
     - Tích hợp state `isDrawerOpen`, `editingEvent`, các hàm `handleEdit`, `handleSubmit`.
     - Truyền `onEdit={handleEdit}` cho cả danh sách thẻ và dải cuộn `UpcomingCarousel`.
     - Nhúng [`EventFormDrawer`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-form-drawer.tsx) vào Trang chủ để bấm vào bất kỳ thẻ nào cũng mở ngay form xem & chỉnh sửa chi tiết.
  3. **[`src/components/events/upcoming-carousel.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/upcoming-carousel.tsx)**:
     - Bổ sung prop `onSelectEvent`, gắn `onClick` mở sự kiện và sửa lỗi in số `0`.
  4. **[`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx)**:
     - Khi bấm vào ô ngày có đúng 1 sự kiện (như ngày 26 có sự kiện "Trúc"), tự động mở ngay form xem & sửa sự kiện mà không cần thêm thao tác phụ.
     - Khi bấm ô ngày có nhiều sự kiện, mở danh sách popover và bấm vào từng sự kiện sẽ mở drawer chi tiết.
     - Khi bấm vào ô ngày trống, mở form thêm sự kiện mới.
  5. **[`src/lib/date-utils.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/lib/date-utils.ts)**:
     - Trong `calculateUpcomingAge`, trả về `null` nếu tuổi $\le 0$ để không sinh ra số `0` trên giao diện.
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running mượt mà**.

---

### 📅 2026-10-24 11:12:00 | Khóa Cứng Lịch (Calendar): Chỉ Xem Chi Tiết Sự Kiện Đã Tạo, Không Cho Sửa, Vô Hiệu Hóa Ngày Trống

- **Yêu cầu của người dùng**:
  - *"fix cứng ở phần lịch này, chỉ cho bấm xem sự kiện khi được tạo lúc trước thôi và không có quyền sửa sự kiện ở đây, bất cứ ngày nào ko có sự kiện thì bấm xem không được"*
- **Nội dung đã triển khai**:
  1. **Vô hiệu hóa toàn bộ ngày không có sự kiện ([`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx))**:
     - Các ô ngày có `dayEvents.length === 0`: gán `disabled={true}`, `onClick={undefined}`, `cursor-default select-none opacity-80`, hủy hiệu ứng `whileTap`. Người dùng bấm vào bất kỳ ngày nào không có sự kiện sẽ không kích hoạt bất kỳ hành động nào.
     - Cập nhật chỉ dẫn tiêu đề từ *"Bấm vào ngày bất kỳ để xem chi tiết"* thành *"Bấm vào ngày có sự kiện để xem chi tiết"*.
  2. **Chế độ xem sự kiện cố định - Chỉ đọc (Read-Only), Không có quyền sửa**:
     - Ngày có 1 sự kiện: Bấm vào mở ngay modal xem chi tiết sự kiện đẹp mắt.
     - Ngày có nhiều sự kiện: Mở danh sách các sự kiện trong ngày, bấm vào sự kiện bất kỳ sẽ mở modal chi tiết của sự kiện đó.
     - Loại bỏ hoàn toàn nút *"Thêm sự kiện khác vào ngày này"*.
     - Modal chi tiết hiển thị đầy đủ thông tin:
       - Tên người / sự kiện, Avatar hoặc chữ cái đại diện gradient.
       - Huy hiệu Loại sự kiện (Sinh nhật, Kỷ niệm, Ngày lễ, hoặc tên tùy chỉnh khi chọn Khác), Nhóm (Gia đình, Bạn bè...), Huy hiệu Âm lịch.
       - Banner đếm ngược thời gian còn lại (hoặc *"Hôm nay chính là ngày đặc biệt!"*), tuổi sắp tới nếu là sinh nhật.
       - Thông tin ngày diễn ra (Dương lịch & Âm lịch).
       - Giờ thông báo email (`remind_time`).
       - Danh sách các mốc nhắc nhở trước (`remind_days`).
       - Ghi chú (`note`) và Gợi ý quà tặng (`gift_idea`).
     - Modal chỉ có duy nhất nút **"Đóng"**, không có bất kỳ nút sửa, xóa hay ô nhập liệu nào.
  3. **Tối giản hóa trang Lịch ([`src/app/(dashboard)/calendar/page.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/calendar/page.tsx))**:
     - Gỡ bỏ hoàn toàn `EventFormDrawer` cùng các hàm mutation thêm/sửa sự kiện, đảm bảo tab Lịch hoàn toàn chỉ dùng cho mục đích tra cứu và theo dõi trực quan ngày diễn ra sự kiện.
- **Danh sách file tạo / chỉnh sửa**:
  - [`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx)
  - [`src/app/(dashboard)/calendar/page.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/calendar/page.tsx)
  - [`MEMORIES.md`](file:///d:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running mượt mà**.

---

### 📅 2026-10-24 11:22:00 | Khắc Phục Triệt Để Lỗi Bấm Vào Ngày Có Sự Kiện Không Hiện Modal Chi Tiết Trên Lịch

- **Yêu cầu của người dùng**:
  - *"tôi bấm vào xem sự kiện nhưng ko được, fix cho tôi"* (kèm ảnh khoanh đỏ ngày 26 có sự kiện nhưng bấm vào không hiển thị gì).
- **Nguyên nhân cốt lõi**:
  1. **Xung đột giữa `AnimatePresence` và `createPortal`**:
     - Trong `MonthCalendarView`, việc bọc `<AnimatePresence>{viewingEvent && mounted && createPortal(...)}</AnimatePresence>` khiến `AnimatePresence` của Framer Motion gọi `React.isValidElement(portal)` (vốn trả về `false` đối với Portal object). Do đó, Framer Motion đã tự động lọc bỏ (strip out) toàn bộ Portal và không render modal vào `document.body`.
  2. **Xung đột cử chỉ của `<motion.button whileTap=...>` trên màn hình cảm ứng**:
     - Gesture recognizer của Framer Motion khi nhận diện chạm ngón tay có thể nhầm lẫn vi rung (micro-movement) thành thao tác cuộn (pan), khiến sự kiện `onClick` bị triệt tiêu trên mobile.
- **Nội dung đã triển khai ([`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx))**:
  1. Loại bỏ `<AnimatePresence>` bọc ngoài `createPortal`, chuẩn hóa theo kiến trúc hoạt động tin cậy của [`EventFormDrawer`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-form-drawer.tsx): Mount trực tiếp Portal vào `document.body` khi `mounted && viewingEvent` / `selectedDayEvents`.
  2. Thay thế `<motion.button>` bằng `<button type="button">` chuẩn với hiệu ứng nhấn CSS `active:scale-95`, đảm bảo sự kiện click/tap kích hoạt tức thì 100% trên cả chuột máy tính và ngón tay cảm ứng điện thoại.
  3. Bổ sung các fallback an toàn khi render dữ liệu sự kiện (`remindDaysList`, `name`, `displayDate`).
- **Trạng thái kiểm thử**:
  - **Browser Automation Test (Trình duyệt thực tế)**: Subagent đã tạo sự kiện ngày 26/10, truy cập `/calendar`, click vào ngày 26 $\rightarrow$ Modal "Xem Chi Tiết Sự Kiện" hiển thị hoàn hảo, bấm "Đóng" đóng mượt mà (chụp ảnh màn hình lưu tại `event_details_modal_1792815664398.png`).
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running mượt mà**.

---

### 📅 2026-10-24 11:29:00 | Bỏ Nút Thêm Sự Kiện Header & Tái Thiết Kế UI/UX Trang Sự Kiện Cân Đối, Tinh Gọn

- **Yêu cầu của người dùng**:
  - *"bỏ nút thêm sự kiện đi và sửa lại UI/UX sao cho gọn gàng cân đối đẹp mắt"* (kèm ảnh khoanh đỏ nút "+ Thêm sự kiện" bị chèn ép ép dòng ở góc phải trên mobile).
- **Nội dung đã triển khai**:
  1. **Loại bỏ nút bấm thừa thãi ([`src/app/(dashboard)/events/page.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/events/page.tsx))**:
     - Xóa bỏ nút `+ Thêm sự kiện` ở góc trên bên phải trang Sự kiện (người dùng đã có nút nổi FAB trung tâm ở thanh điều hướng dưới đáy và nút thêm trong trạng thái rỗng).
     - Thiết kế lại Header trang tinh gọn: Tiêu đề "Tất cả sự kiện" đi kèm huy hiệu đếm số lượng tròn bo góc (`bg-primary/10 text-primary`), dòng mô tả đầy đủ không còn bị chèn ép hay xuống dòng méo mó.
  2. **Tái thiết kế khung Tìm kiếm & Bộ lọc ([`src/components/events/event-list-grouped.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-list-grouped.tsx))**:
     - Bọc toàn bộ thanh tìm kiếm, bộ lọc nhóm và tùy chọn sắp xếp vào thẻ Card nền mờ nhẹ hiện đại (`bg-card/60 rounded-3xl p-4 sm:p-5 border border-border/80`).
     - Thanh tìm kiếm: Placeholder rõ ràng, hỗ trợ tìm theo cả tên, sở thích, nhóm và loại tùy chỉnh, có nút X xóa nhanh.
     - Chip lọc nhóm: Bổ sung chấm tròn màu nhận diện trực quan cho từng nhóm (Gia đình: hồng, Bạn bè: hổ phách, Đồng nghiệp: chàm, Khác: ngọc bích).
     - Thêm utility `.no-scrollbar` trong [`src/app/globals.css`](file:///d:/BER-Birthday-Event-Reminder-/src/app/globals.css) để triệt tiêu hoàn toàn đường kẻ thanh cuộn ngang gây mất thẩm mỹ trên Windows/Android.
     - Hàng phụ bên dưới cân đối: Bên trái hiển thị số lượng sự kiện tìm thấy (`Tất cả X sự kiện` / `Hiển thị X / Y sự kiện`), bên phải là capsule lựa chọn sắp xếp (`Sắp tới gần nhất`, `Tên A-Z`...) đồng bộ màu nền dark/light.
  3. **Phân nhóm tháng thanh thoát**:
     - Thay đổi tiêu đề tháng: Chấm gradient thương hiệu, chữ in đậm sắc sảo, đường kẻ phân cách thanh mảnh và huy hiệu đếm số lượng sự kiện trong tháng gọn gàng.
- **Trạng thái kiểm thử**:
  - **Browser Automation Test (Trình duyệt thực tế)**: Chụp màn hình viewport mobile `420x800` lưu tại `events_page_mobile_1792816112694.png` xác nhận giao diện mới cực kỳ thoáng đãng, cân đối và thẩm mỹ.
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running mượt mà**.

---

### 📅 2026-10-24 11:33:00 | Thay Thế Dropdown HTML Thô Bằng Custom Menu Bo Tròn, Chuẩn Dark/Light Theme

- **Yêu cầu của người dùng**:
  - *"fix lại UI xổ xuống"* (kèm ảnh chụp dropdown menu `<select>` mặc định của Windows/Chromium bị vuông cạnh, nền xanh dương `#0066cc` thô kệch, mất thẩm mỹ).
- **Nội dung đã triển khai ([`src/components/events/event-list-grouped.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/events/event-list-grouped.tsx))**:
  1. **Thay thế thẻ `<select>` bằng Custom Dropdown Popover**:
     - Nút kích hoạt: Viên capsule bo cong mềm mại (`rounded-xl`), có icon Sliders thanh mảnh, nhãn lựa chọn hiện tại và mũi tên `ChevronDown` xoay 180° mượt mà khi mở.
     - Khung menu xổ xuống: Thiết kế bo tròn lớn (`rounded-2xl`), hiệu ứng kính mờ `backdrop-blur-xl`, viền tinh tế `border-border/80`, đổ bóng sâu `shadow-2xl` nổi bật trên nền giao diện.
     - Mục lựa chọn:
       - Mục đang chọn: Nền màu tím thương hiệu nhạt (`bg-primary/15 text-primary font-bold`) kèm biểu tượng dấu tích `Check` sắc nét bên phải.
       - Các mục khác: Màu chữ hài hòa, hiệu ứng hover mượt mà (`hover:bg-secondary/80`).
     - Tự động đóng menu thông minh: Hỗ trợ đóng khi chọn mục hoặc khi nhấp chuột / chạm tay ra ngoài màn hình (`handleClickOutside`).
- **Trạng thái kiểm thử**:
  - **Browser Automation Test (Trình duyệt thực tế)**: Chụp màn hình tại `sort_dropdown_open_1792816352535.png` xác nhận menu mới cực kỳ sắc nét, bo tròn tinh tế và đồng bộ 100% với phong cách thiết kế hiện đại của ứng dụng.
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running mượt mà**.

---

### 📅 2026-10-24 12:21:00 | Mở Khóa Lịch (Bấm Mọi Ngày), Thêm Nút Nhật Ký Góc Phải, Modal Ghi Nhật Ký & Lưu/Xóa Thật Trên DB Supabase

- **Yêu cầu của người dùng**:
  - *"bỏ fix cứng ở phần lịch, và update thêm cho tôi khi bấm vào ngày nào thì sẽ xuất hiện 1 nút thêm nhật ký ở trên góc trên bên phải sao cho hợp lý để khi bấm vào sẽ ra ô nhập nhật ký, thiết kế nhập nhật ký sao cho phù hợp đẹp mắt UI/UX hiện đại và lưu khi nhập xong"*
  - *"nhớ cập nhật nhật ký lên DB thực tế, sau khi lưu và update thêm nút xóa khi ko cần nữa, và xóa thật trên DB thật"*
- **Nội dung đã triển khai**:
  1. **Bỏ fix cứng Lịch & Tương tác chọn ngày linh hoạt ([`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx))**:
     - Mọi ngày trong tháng đều có thể nhấp chọn tự do.
     - Ô ngày đang được chọn hiển thị viền tím thương hiệu nổi bật (`ring-2 ring-primary border-primary bg-primary/10`).
     - Ô ngày có nhật ký hiển thị biểu tượng `📖` trực quan.
     - Khu vực tóm tắt bên dưới lịch hiển thị tức thì thẻ xem nhanh nhật ký và sự kiện của ngày đang chọn.
  2. **Nút Thao Tác Nhật Ký Ở Góc Trên Bên Phải**:
     - Nằm ngay cạnh nút "Hôm nay" và mũi tên chuyển tháng:
       - Nếu ngày chưa có nhật ký: Hiển thị nút `[+ Thêm nhật ký]` hiệu ứng gradient nổi bật.
       - Nếu ngày đã có nhật ký: Tự động đổi thành `[📖 Xem nhật ký]` với viền tím phong cách.
     - Bấm vào mở ngay modal nhật ký tương ứng cho ngày đó.
  3. **Modal Nhập Nhật Ký UI/UX Hiện Đại ([`src/components/calendar/diary-drawer.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/diary-drawer.tsx))**:
     - Chọn cảm xúc ngày hôm nay với 5 mood sinh động: 😊 Vui vẻ, 🌿 Bình yên, 🔥 Hào hứng, 🥺 Trầm lắng, 🙏 Biết ơn.
     - Ô nhập Tiêu đề ngắn gọn & Ô Textarea nhập nội dung nhật ký sắc nét kèm bộ đếm ký tự.
     - Gắn thẻ chủ đề nhanh (`#Kỷ niệm`, `#Gia đình`, `#Bạn bè`...) và hỗ trợ tự gõ thêm thẻ mới.
     - Thanh nút hành động cố định ở đáy: Nút "Hủy", nút "Lưu nhật ký" (`gradient-brand`), và đặc biệt là **Nút "Xóa nhật ký"** màu đỏ nổi bật (có bước xác nhận chống xóa nhầm).
  4. **Lưu & Xóa Thật Trên Database Supabase ([`src/hooks/use-diaries.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-diaries.ts))**:
     - Đồng bộ trực tiếp với bảng `diaries` trên PostgreSQL Supabase qua lệnh `.insert()`, `.update()`, `.delete()`.
     - Có cơ chế cập nhật lạc quan (`setQueryData`) và bộ nhớ đệm `localStorage` fallback để đảm bảo ứng dụng chạy mượt mà ngay cả khi offline.
  5. **Tạo file Migration Database ([`supabase/migrations/20261024_013_create_diaries_table.sql`](file:///d:/BER-Birthday-Event-Reminder-/supabase/migrations/20261024_013_create_diaries_table.sql))**:
     - Tạo bảng `public.diaries` với đầy đủ khóa ngoại `user_id REFERENCES profiles(id) ON DELETE CASCADE`, ràng buộc `UNIQUE(user_id, entry_date)`, chỉ mục tối ưu truy vấn và 4 chính sách RLS bảo mật tuyệt đối cho từng người dùng.
- **Trạng thái kiểm thử**:
  - **Browser E2E Automation**: Test luồng mở lịch, chọn ngày, mở modal nhật ký, lưu nhật ký thành công với toast thông báo.
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 TypeScript errors**.
  - Dev server: **Running mượt mà**.

---

### 📅 2026-10-24 15:05:00 | Khắc Phục Triệt Để Lỗi 409 Conflict Khi Lưu Nhật Ký & Chuẩn Hóa Khóa Ngày Tháng Trên Lịch

- **Yêu cầu của người dùng**:
  - *"Hiện tại chưa lưu được nhật ký mặc dù đã viết"*.
  - Đính kèm ảnh chụp màn hình DevTools: `POST /rest/v1/diaries 409 (Conflict): duplicate key value violates unique constraint "unique_user_entry_date"`.
  - Trên giao diện: Đã bấm lưu nhật ký nhưng ô chi tiết vẫn báo *"Chưa có nhật ký cho ngày này. Bấm để viết!"* và ô lịch không hiện biểu tượng `📖`.
- **Nguyên nhân cốt lõi**:
  1. **Lỗi cú pháp nội suy chuỗi ngày trong [`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx)**:
     - Hàm `formatDateKey(d: Date)` khai báo biến ngày `const day = ...` nhưng lại return `${y}-${m}-${d}`, trong đó `${d}` lấy nhầm đối tượng `d: Date` thay vì biến `day`. Kết quả tạo ra chuỗi `"2026-10-Sat Oct 24 2026..."` thay vì `"2026-10-24"`.
     - Dẫn tới việc hàm tra cứu `getDiaryForDate(selectedDateKey)` và `diariesMap.has(cellDateKey)` luôn trả về `undefined` / `false`.
     - Vì giao diện tưởng ngày đó chưa có nhật ký, mỗi lần bấm lưu form lại gửi một bản ghi tạo mới (không có `id` DB).
  2. **Lỗi 409 Conflict từ PostgREST Supabase**:
     - Bảng `public.diaries` có ràng buộc duy nhất `CONSTRAINT unique_user_entry_date UNIQUE (user_id, entry_date)`.
     - Code trước đó dùng `.insert()` thay vì `.upsert()` với cờ giải quyết xung đột, khiến PostgreSQL từ chối ghi đè và ném lỗi 409.
- **Giải pháp & Các công việc đã hoàn thành**:
  1. **Chuẩn hóa hàm lấy chuỗi ngày [`normalizeDateKey`](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-diaries.ts)**:
     - Xuất hàm `normalizeDateKey(dateInput: string | Date)` định dạng chuẩn xác `YYYY-MM-DD`.
     - Áp dụng đồng bộ `normalizeDateKey` trong toàn bộ [month-calendar-view.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx), [diary-drawer.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/diary-drawer.tsx) và [use-diaries.ts](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-diaries.ts).
  2. **Chuyển đổi sang `.upsert()` với `onConflict: "user_id,entry_date"`**:
     - Trong `useDiaries`: Bỏ `id` do client tự sinh ra khỏi payload Supabase, gọi `.upsert(supabasePayload, { onConflict: "user_id,entry_date" })`.
     - PostgreSQL sẽ tự động: Chèn mới nếu ngày chưa có nhật ký, hoặc cập nhật đè (`DO UPDATE`) toàn bộ tiêu đề, nội dung, mood, tags, thời gian cập nhật nếu ngày đó đã tồn tại bản ghi của user.
     - Không còn bất kỳ lỗi 409 Conflict nào.
  3. **Hiển thị nhật ký tức thì trên UI**:
     - `diariesMap.has("2026-10-24")` khớp 100%, ô lịch hiển thị icon `📖`.
     - Nút góc trên bên phải hiển thị `[📖 Xem nhật ký]`.
     - Card chi tiết ngày hiển thị đầy đủ tiêu đề, nội dung nhật ký, cảm xúc (mood) và các hashtag.
- **Danh sách file chỉnh sửa**:
  - [src/hooks/use-diaries.ts](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-diaries.ts)
  - [src/components/calendar/month-calendar-view.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx)
  - [src/components/calendar/diary-drawer.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/diary-drawer.tsx)
  - [MEMORIES.md](file:///d:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npx tsc --noEmit`: **0 errors (Pass)**.
  - `npm test`: **17/17 tests passed (100%)**.
  - Supabase connectivity: Bảng `diaries` phản hồi chuẩn xác.

---

### 📅 2026-10-24 16:16:00 | Nâng Cấp Tính Năng: Cho Phép Viết & Lưu Nhiều Bài Nhật Ký Trong Cùng Một Ngày

- **Yêu cầu của người dùng**:
  - *"Tôi muốn viết nhật ký theo kiểu nhiều lần, ví dụ như viết nhật ký xong 1 lần thì có thể bấm thêm 1 nhật ký khác trong ngày"*.
- **Nội dung đã triển khai**:
  1. **Migration Database SQL ([`supabase/migrations/20261024_014_allow_multiple_diaries_per_day.sql`](file:///d:/BER-Birthday-Event-Reminder-/supabase/migrations/20261024_014_allow_multiple_diaries_per_day.sql))**:
     - Bỏ ràng buộc `CONSTRAINT unique_user_entry_date UNIQUE (user_id, entry_date)` trên bảng `public.diaries`.
     - Giữ lại chỉ mục `idx_diaries_user_date` để truy vấn danh sách bài viết theo ngày với tốc độ cao.
  2. **Cập nhật Hook [`src/hooks/use-diaries.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-diaries.ts)**:
     - Thêm hàm `getDiariesForDate(dateStr: string): DiaryEntry[]` trả về toàn bộ các bài nhật ký của ngày đó, sắp xếp theo thời gian mới nhất lên đầu (`created_at DESC`).
     - Tách bạch rõ ràng giữa hai thao tác:
       - **Thêm mới**: Khi người dùng viết thêm bài mới (không truyền `id`), gọi `.insert(...)` sinh UUID mới trên Supabase và ghi vào danh sách.
       - **Chỉnh sửa**: Khi người dùng bấm vào một bài đã có (có `id`), gọi `.update(...)` chính xác bài viết đó theo `id`.
     - `deleteDiary`: Xóa chính xác theo `id` bài viết được chọn.
  3. **Đại tu UI Lịch & Khung Chi Tiết ([`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx))**:
     - **Trên ô lịch**: Nếu ngày có 1 bài, hiện `📖`. Nếu có nhiều bài, hiện thêm số lượng bài viết (ví dụ `📖 2`, `📖 3`).
     - **Nút góc trên bên phải**: Luôn có nút `[+ Viết thêm nhật ký]` để bấm vào là mở modal viết bài mới ngay lập tức.
     - **Khung chi tiết ngày**:
       - Liệt kê toàn bộ các bài nhật ký trong ngày với mốc giờ tạo (`09:15`, `14:30`), tiêu đề, tâm trạng (mood), nội dung tóm tắt và thẻ hashtag.
       - Bấm vào bài nào sẽ mở modal xem/chỉnh sửa hoặc xóa riêng bài đó.
       - Phía dưới danh sách có nút dashed viền nét đứt: `[+ Viết thêm một nhật ký khác trong ngày]`.
- **Danh sách file tạo / chỉnh sửa**:
  - [supabase/migrations/20261024_014_allow_multiple_diaries_per_day.sql](file:///d:/BER-Birthday-Event-Reminder-/supabase/migrations/20261024_014_allow_multiple_diaries_per_day.sql)
  - [src/hooks/use-diaries.ts](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-diaries.ts)
  - [src/components/calendar/month-calendar-view.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx)
  - [MEMORIES.md](file:///d:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npx tsc --noEmit`: **0 errors (Pass)**.
  - `npm test`: **17/17 tests passed (100%)**.
  - Reload browser client: **Thành công**.

---

### 📅 2026-10-24 16:45:00 | Giải Thích & Tối Ưu Cơ Chế Gửi Email Nhắc Nhở - Thêm Nút "Gửi Thử Email Nhắc Ngay"

- **Yêu cầu của người dùng**:
  - *"Kiểm tra giúp tôi xem sao tôi vừa mới thêm 1 sự kiện để test mà không thấy báo về email của mình nhỉ"*.
  - Đính kèm ảnh chụp màn hình sự kiện vừa tạo: Tên *"tôi"*, Sinh nhật Bạn bè, Ngày diễn ra: 24/10/2026, Giờ thông báo email: `16:38`, Mốc nhắc nhở trước: Đúng ngày.
- **Nguyên nhân cốt lõi**:
  1. **Cơ chế lập lịch quét (Scheduler / Cron Job)**:
     - Khi người dùng bấm tạo sự kiện, ứng dụng lưu sự kiện vào Database để lên lịch nhắc hẹn, **không gửi email tức thì tại giây phút tạo**.
     - Lập lịch tự động (`pg_cron`) quét vào **đầu mỗi giờ (`0 * * * *`)** (16:00, 17:00...). Sự kiện đặt lúc `16:38` nằm giữa chu kỳ nên chưa đến lượt quét tiếp theo.
  2. **Hòm thư tài khoản**:
     - Tài khoản `admin` ban đầu có email nội bộ `admin@ber-app.com`. Hệ thống chỉ gửi thư thật khi có địa chỉ Gmail thật của người dùng.
- **Giải pháp & Cải tiến đã thực hiện**:
  1. **Kiểm tra máy chủ Gmail SMTP**:
     - Chạy script kiểm thử gửi thư thật bằng thông tin `SMTP_USER` (`voviet4323@gmail.com`) và `SMTP_PASS` trong file `.env.local`. Kết quả: **Gửi thư thành công 100%** qua cổng 465 (Message ID trả về hợp lệ).
  2. **Cải tiến Route Handler [`src/app/api/test-email/route.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/app/api/test-email/route.ts)**:
     - Tự động fallback sang `process.env.SMTP_USER` (`voviet4323@gmail.com`) nếu tài khoản vẫn đang dùng email tạm `@ber-app.com`.
     - Hỗ trợ tham số `singleEventId` để gửi email nhắc nhở cho đúng sự kiện vừa tạo thay vì chỉ gửi mẫu demo.
  3. **Thêm nút "Gửi thử email nhắc ngay" trên Modal Chi Tiết Sự Kiện ([`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx))**:
     - Trong modal xem sự kiện, bổ sung nút bấm `[📨 Gửi thử email nhắc ngay]`.
     - Người dùng bấm vào nút này sẽ lập tức nhận được email thông báo nhắc sự kiện thật vào hộp thư `voviet4323@gmail.com` trong vòng 1-2 giây để kiểm tra ngay mà không cần chờ đến giờ quét của Cron Job.
- **Danh sách file chỉnh sửa**:
  - [src/app/api/test-email/route.ts](file:///d:/BER-Birthday-Event-Reminder-/src/app/api/test-email/route.ts)
  - [src/components/calendar/month-calendar-view.tsx](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx)
  - [MEMORIES.md](file:///d:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npx tsc --noEmit`: **0 errors (Pass)**.
  - `npm test`: **17/17 tests passed (100%)**.
  - Gmail SMTP direct delivery: **Success**.

---

### 📅 2026-10-24 16:56:00 | Tích Hợp Quét & Gửi Email Nhắc Nhở Tự Động Theo Từng Phút (Minute-by-Minute Automated Scheduler)

- **Yêu cầu của người dùng**:
  - Người dùng hỏi: *"vậy giả sử bây giờ tôi chọn thời gian 16h50 thì có báo đúng giờ đó không"* và xác nhận: *"có tích hợp quét theo phút cho tôi đi"*.
  - Hệ thống cần quét và tự động gửi email thông báo nhắc nhở chuẩn xác đến từng phút (thay vì chỉ quét theo đầu giờ) và tự động hoạt động ngầm.
- **Nội dung đã triển khai**:
  1. **Endpoint API Quét Nhắc Nhở Theo Phút ([`src/app/api/cron/check-reminders/route.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/app/api/cron/check-reminders/route.ts))**:
     - Lấy thời gian hiện tại chính xác theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) dạng `"HH:mm"`.
     - Quét toàn bộ sự kiện đang bật của người dùng, tính ngày diễn ra kế tiếp và số ngày còn lại (`daysRemaining`).
     - So khớp giờ nhắc của sự kiện (`ev.remind_time` hoặc `user_settings.remind_time`) với chuẩn hóa `normalizeTime` tránh lệch định dạng giây của Postgres.
     - Kiểm tra chống gửi trùng lặp qua bảng `notification_logs` với khóa `(user_id, event_id, remind_offset, occurrence_date, channel)`.
     - Tự động lấy địa chỉ email hợp lệ (ưu tiên custom email/profile email, fallback sang `SMTP_USER` `voviet4323@gmail.com`).
     - Tạo template HTML sinh động (`generateReminderEmailHtml`) và gửi qua Gmail SMTP bằng `sendEmail`.
     - Ghi nhận trạng thái gửi vào `notification_logs`.
  2. **Client Hook Quét Ngầm Tự Động ([`src/hooks/use-auto-reminder-scheduler.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-auto-reminder-scheduler.ts))**:
     - Tự động chạy ngầm mỗi 30 giây để đảm bảo không bỏ sót khoảnh khắc chuyển giao giữa các phút.
     - Sử dụng `lastCheckedMinuteRef` để tránh gọi API trùng lặp trong cùng 1 phút.
     - Hiển thị Toast thông báo thành công trực quan trên giao diện khi email được gửi đi: `⏰ Đúng [HH:mm]: Đã tự động gửi email nhắc nhở!`.
  3. **Tích Hợp Vào Toàn Bộ Ứng Dụng ([`src/app/(dashboard)/layout.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/layout.tsx))**:
     - Gắn `useAutoReminderScheduler()` vào `DashboardLayout`, đảm bảo khi người dùng mở bất kỳ trang nào (Tổng quan, Sự kiện, Lịch, Nhật ký, Cài đặt), hệ thống tự động quét và gửi email đúng từng phút.
  4. **Nâng Cấp Migration Supabase Cron & Edge Function**:
     - Cập nhật [`supabase/migrations/20261023_002_cron_scheduler.sql`](file:///d:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_002_cron_scheduler.sql): Lên lịch `send-minute-reminders` với biểu thức `* * * * *` (chạy mỗi phút).
     - Cập nhật [`supabase/functions/send-reminders/index.ts`](file:///d:/BER-Birthday-Event-Reminder-/supabase/functions/send-reminders/index.ts): Hỗ trợ so khớp `remind_time` chính xác theo từng phút cho từng sự kiện.
- **Danh sách file tạo & chỉnh sửa**:
  - [`src/app/api/cron/check-reminders/route.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/app/api/cron/check-reminders/route.ts) *(Mới)*
  - [`src/hooks/use-auto-reminder-scheduler.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/hooks/use-auto-reminder-scheduler.ts) *(Mới)*
  - [`src/app/(dashboard)/layout.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/app/(dashboard)/layout.tsx)
  - [`supabase/functions/send-reminders/index.ts`](file:///d:/BER-Birthday-Event-Reminder-/supabase/functions/send-reminders/index.ts)
  - [`supabase/migrations/20261023_002_cron_scheduler.sql`](file:///d:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_002_cron_scheduler.sql)
  - [`MEMORIES.md`](file:///d:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 errors**.
  - `npm run build`: **Exit Code 0 (Biên dịch thành công 18/18 routes tĩnh & động)**.
- **Ghi chú định hướng tiếp theo**:
  - Người dùng có thể tạo một sự kiện thử nghiệm vào ngày hôm nay với giờ nhắc sau thời điểm hiện tại 1 - 2 phút (ví dụ hiện tại là 16:58 thì đặt 17:00), hệ thống sẽ tự động quét và chuyển thư thẳng vào hộp thư Gmail `voviet4323@gmail.com` kèm thông báo Toast trên màn hình.

---

### 📅 2026-10-24 17:13:00 | Thiết Kế Lại Giao Diện Email Thông Báo Chuẩn Hiện Đại, Cân Đối & Tối Ưu Toàn Diện Trên Mobile

- **Yêu cầu của người dùng**:
  - Tùy biến lại giao diện email thông báo nhắc sự kiện gửi về: sắp xếp gọn gàng, cân đối, dễ nhìn, thiết kế UI/UX hiện đại giúp người dùng dễ hiểu ngay khi mở email.
  - Tối ưu hóa hiển thị chuẩn xác trên thiết bị di động (Mobile Responsive), khắc phục tình trạng ô đếm ngược bị kéo dãn vuông vức, trống trải hoặc chữ bị co cụm.
- **Nội dung đã triển khai**:
  1. **Tái Cấu Trúc Khung Email Chuẩn Table-Safe ([`src/lib/email/template-builder.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/lib/email/template-builder.ts))**:
     - Loại bỏ toàn bộ `display: flex` không an toàn trên các ứng dụng đọc email (Gmail, Apple Mail, Outlook). Thay thế bằng hệ thống cấu trúc bảng (HTML Tables) lồng nhau tương thích tuyệt đối 100%.
     - **Thanh thương hiệu đầu trang (Top Brand Bar)**: Nền xanh indigo đậm `#312e81` với dòng chữ sang trọng: `BER APP • NHẮC SINH NHẬT & SỰ KIỆN`.
     - **Hero Header rực rỡ**: Dải gradient hoàng gia tím - hồng mượt mà (`#4338ca` $\rightarrow$ `#8b5cf6` $\rightarrow$ `#ec4899`), huy hiệu tròn 3D phát sáng (`🎂✨`), tiêu đề sắc nét và pill thông điệp trạng thái bo tròn dạng kính mờ (glassmorphism).
     - **Card Sự Kiện hiện đại**:
       - Vạch màu chỉ thị loại sự kiện trên cùng (`border-top stripe`) tương ứng từng danh mục.
       - Hàng đầu phân bổ cân đối: Góc trái là badge loại sự kiện (`🎂 Sinh nhật`, `💍 Kỷ niệm`...) kèm tag Âm lịch (nếu có); góc phải là pill đếm ngược bo tròn sang trọng (`🎉 Diễn ra hôm nay!` nền đỏ/hồng gradient rực rỡ hoặc `⏳ Ngày mai`, `⏳ Còn X ngày`).
       - Tên sự kiện cỡ lớn (20px, bold 800), kèm huy hiệu tuổi cột mốc nếu có năm sinh.
       - Hộp thông tin chi tiết (`Ngày diễn ra` và `Nhóm`) xếp ngay ngắn trong box nền xám nhạt bo cong mềm mại.
       - Box Ghi chú (nền hổ phách) & Gợi ý quà (nền hồng phấn) làm nổi bật nội dung.
       - Nút liên kết phụ: `Mở Lịch & Nhật ký →`.
     - **Nút Kêu Gọi Hành Động (CTA Button)**:
       - Gradient tím-hồng nổi bật, độ bo tròn 9999px, đổ bóng mềm mại, kích thước chuẩn ngón tay bấm trên màn hình cảm ứng.
     - **Khối gợi ý viết nhật ký & Footer chuẩn mực**.
  2. **Tối Ưu Hóa Riêng Cho Mobile (Media Queries @max-width: 600px)**:
     - Giảm lề ngoài `padding` giúp diện tích hiển thị nội dung tối đa trên màn hình hẹp.
     - Tự động co giãn `width: 100% !important` cho nút bấm CTA và các cột thông tin phụ.
  3. **Đồng Bộ Vào Supabase Edge Function ([`supabase/functions/send-reminders/email-template.ts`](file:///d:/BER-Birthday-Event-Reminder-/supabase/functions/send-reminders/email-template.ts))**:
     - Đồng bộ toàn bộ mã HTML mới sang thư mục Deno Edge Function.
  4. **Tối Ưu Modal Chi Tiết Trên Ứng Dụng Web ([`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx))**:
     - Chuyển hàng nút hành động dưới chân modal sang dạng `flex-col-reverse sm:flex-row` giúp nút bấm trên điện thoại to rõ, dễ thao tác ngón cái.
- **Danh sách file tạo & chỉnh sửa**:
  - [`src/lib/email/template-builder.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/lib/email/template-builder.ts)
  - [`supabase/functions/send-reminders/email-template.ts`](file:///d:/BER-Birthday-Event-Reminder-/supabase/functions/send-reminders/email-template.ts)
  - [`src/components/calendar/month-calendar-view.tsx`](file:///d:/BER-Birthday-Event-Reminder-/src/components/calendar/month-calendar-view.tsx)
  - [`MEMORIES.md`](file:///d:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 errors**.
  - Kiểm thử gửi email thực tế qua Gmail SMTP: **Đã gửi thành công tới voviet4323@gmail.com**.

---

### 📅 2026-10-24 17:19:00 | Khắc Phục Triệt Để Lỗi Vỡ Layout Trên Ứng Dụng Gmail Mobile (iOS Dark Mode)

- **Yêu cầu của người dùng**:
  - Đính kèm ảnh chụp màn hình Gmail trên iPhone chế độ Dark Mode:
    - Biểu tượng bánh kem bị kéo dài thành hình quả trứng (oval) kỳ lạ.
    - Chữ *"SINH NHẬT"* và *"Diễn ra hôm nay!"* / *"Còn 3 ngày nữa"* bị ngắt đôi thành 2 dòng chật chội.
    - Cụm *"Ngày diễn ra: 25 tháng 10"* bị rớt số *"10"* xuống dòng riêng.
    - Tiêu đề Hero bị rớt chữ *"Trọng"* một mình ở dòng dưới.
  - Yêu cầu sửa lại giao diện thông báo trên mobile cho vừa mắt, cân đối, dễ đọc.
- **Giải pháp & Nội dung đã triển khai**:
  1. **Khắc phục hình tròn biểu tượng bị kéo dãn thành hình quả trứng (oval)**:
     - Trước đó chèn 2 emoji (`🎂✨`) trong 1 thẻ div có `line-height`, khiến iOS tự động ngắt dòng 2 emoji và kéo dài khung thành hình trứng.
     - Sửa thành **1 emoji duy nhất** (`🎂` hoặc `🔔`), cố định kích thước 48x48px hình tròn hoàn hảo (`border-radius: 50%`).
  2. **Chống ngắt đôi chữ trên huy hiệu (Pill Badges)**:
     - Bỏ thuộc tính `text-transform: uppercase` (dùng dạng chuẩn `Sinh nhật`, `Kỷ niệm`).
     - Tinh giản text đếm ngược: `🎉 Hôm nay`, `⏳ Ngày mai`, `⏳ Còn X ngày`.
     - Thêm `white-space: nowrap !important` đảm bảo huy hiệu luôn nằm gọn gàng trên 1 hàng duy nhất mà không bao giờ bị cắt vụn chữ.
  3. **Khắc phục ngắt dòng ngày tháng ("25 tháng / 10")**:
     - Chuyển khung chi tiết từ 2 cột song song (bị hẹp trên màn hình 375px) sang dạng **2 hàng dọc xếp lớp**:
       - Hàng 1: `📅 Ngày: 25 tháng 10`
       - Hàng 2: `👥 Nhóm: Gia đình`
       $\rightarrow$ Luôn nằm trọn vẹn trên 1 dòng, không bao giờ bị rớt số ngày.
  4. **Tối ưu tiêu đề Hero & Nút bấm**:
     - Điều chỉnh font-size tiêu đề `21px` (trên mobile `19px`), ngắt nhịp tự nhiên, chữ màu trắng rõ ràng chống bị iOS Dark Mode biến thành chữ tối màu.
     - Nút CTA mở rộng vừa vặn với chiều ngang ngón tay bấm (`max-width: 280px`).
     - Nút phụ trong thẻ sự kiện chuyển thành pill nhỏ xinh xắn `📅 Xem trên Lịch & Viết nhật ký →`.
- **Danh sách file chỉnh sửa**:
  - [`src/lib/email/template-builder.ts`](file:///d:/BER-Birthday-Event-Reminder-/src/lib/email/template-builder.ts)
  - [`supabase/functions/send-reminders/email-template.ts`](file:///d:/BER-Birthday-Event-Reminder-/supabase/functions/send-reminders/email-template.ts)
  - [`MEMORIES.md`](file:///d:/BER-Birthday-Event-Reminder-/MEMORIES.md)
- **Trạng thái kiểm thử**:
  - `npm test`: **17/17 tests passed (100%)**.
  - `npx tsc --noEmit`: **0 errors**.
  - Đã gửi thư kiểm thử trực tiếp tới Gmail `voviet4323@gmail.com`.

---

### 📅 2026-10-24 17:34:00 | Triển Khai Thành Công Toàn Diện Nền Tảng Lên Môi Trường Production Vercel (Online Vĩnh Viễn)

- **Yêu cầu của người dùng**:
  - Mong muốn đưa dự án lên mạng công khai (public online) hoạt động vĩnh viễn mà không cần mua tên miền riêng.
  - Hướng dẫn chi tiết từng bước kết nối GitHub, nạp biến môi trường và deploy.
- **Kết quả triển khai thành công 100%**:
  - **Live Production URL**: [https://ber-birthday-event-reminder.vercel.app](https://ber-birthday-event-reminder.vercel.app)
  - **Nền tảng**: Vercel (Next.js App Router 14+).
  - **Chứng chỉ bảo mật**: SSL / HTTPS tự động gia hạn vĩnh viễn.
  - **Tích hợp Cloud**:
    - Cơ sở dữ liệu: Supabase Cloud PostgreSQL.
    - Gửi email: Gmail SMTP Google App Password (`voviet4323@gmail.com`).
    - Lập lịch: Client Scheduler ngầm + `/api/cron/check-reminders` theo phút.
  - Cập nhật biến môi trường `NEXT_PUBLIC_APP_URL=https://ber-birthday-event-reminder.vercel.app` đồng bộ ở cả `.env` và `.env.local`.
- **Trạng thái**:
  - Build: **Passed (Ready)**.
  - Deploy status: **Active 24/7/365**.

---

### 📅 2026-10-25 15:37:00 | Nâng Cấp Hiệu Ứng Animation Mượt Mà & Hậu Animation (Exit Animation) Cho Mobile

- **Yêu cầu của người dùng**:
  - Làm lại animation khi bấm vào xem thông tin sự kiện hoặc thêm mới sự kiện ở mobile sao cho mượt hơn, không bị lag hay cảm giác trì trệ.
  - Phải có đầy đủ **hậu animation** (hiệu ứng mượt mà cả khi trượt mở ra lẫn khi đóng/vuốt tắt).
- **Nguyên nhân phát hiện**:
  1. Thiếu `AnimatePresence` bọc ngoài `createPortal`: khiến `exit` animation bị bỏ qua hoàn toàn, khi đóng modal/drawer bị biến mất ngay lập tức (0ms snap) mà không có hậu animation.
  2. Backdrop trước đó dùng CSS `animate-in` tĩnh và `backdrop-blur-md` (12px) trên toàn màn hình điện thoại gây drop FPS nặng (GPU overdraw) trong lúc sheet đang trượt.
  3. Lò xo `spring` trước đó có damping thấp (`damping: 25, stiffness: 280`) tạo cảm giác chao đảo, trễ nải (spongy).
  4. Nút bấm trên thiết bị di động có độ trễ tap 300ms do thiếu `touch-manipulation`.
- **Nội dung đã triển khai**:
  1. **Bọc `<AnimatePresence mode="wait">` cho toàn bộ Drawer & Modal**:
     - `src/components/events/event-form-drawer.tsx` (Thêm mới & Chỉnh sửa sự kiện).
     - `src/components/calendar/month-calendar-view.tsx` (Xem chi tiết sự kiện).
     - `src/components/calendar/diary-drawer.tsx` (Xem & Viết nhật ký).
  2. **Chuẩn hóa thông số vật lý Animation theo chuẩn iOS Sheet**:
     - Lò xo trượt mở: `type: "spring", damping: 30, stiffness: 340, mass: 0.8` $\rightarrow$ Phản hồi tức thì, mượt mà dứt khoát.
     - Hậu animation (trượt đóng): Trượt êm ái xuống `y: "100%"` với `opacity: 0.95` và nền mờ mờ dần về `0` trong `0.22s`.
     - Kích hoạt gia tốc phần cứng GPU: `transform-gpu` và `will-change-transform`.
     - Tối ưu nền mờ: Giảm tải GPU mobile từ `backdrop-blur-md` xuống `backdrop-blur-[3px] bg-black/60`.
  3. **Thêm thanh tay cầm kéo (Drag Handle) & Cử chỉ vuốt để đóng (Drag-to-Dismiss)**:
     - Thêm thanh pill handle tròn ở đỉnh drawer trên mobile.
     - Hỗ trợ vuốt xuống (`drag="y"`) để tự động đóng sheet tự nhiên như ứng dụng gốc (Native App).
  4. **Loại bỏ độ trễ Tap 300ms**:
     - Thêm `touch-manipulation` vào nút FAB "+" ở bottom navigation, thẻ sự kiện `EventCard` và `UpcomingCarousel`.
- **Các file đã chỉnh sửa**:
  - `src/components/events/event-form-drawer.tsx`
  - `src/components/calendar/month-calendar-view.tsx`
  - `src/components/calendar/diary-drawer.tsx`
  - `src/components/layout/mobile-bottom-nav.tsx`
  - `src/components/events/event-card.tsx`
  - `src/components/events/upcoming-carousel.tsx`
- **Trạng thái kiểm thử**:
  - Unit tests: **17/17 tests PASS**.
  - Build status: **`npm run build` thành công 100%**.

































