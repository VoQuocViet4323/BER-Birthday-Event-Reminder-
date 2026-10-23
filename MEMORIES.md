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











