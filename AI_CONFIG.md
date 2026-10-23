# 📘 AI CONFIG & PROJECT MASTER BLUEPRINT
## Ứng Dụng Web "Nhắc Sinh Nhật & Sự Kiện" (BER - Birthday & Event Reminder)

> **MỤC ĐÍCH TÀI LIỆU**: 
> Đây là tài liệu quy chuẩn (Master Architecture & Configuration Document) của toàn bộ dự án **Nhắc Sinh Nhật & Sự Kiện (BER)**. 
> Bất kỳ **AI Assistant** (Antigravity, Gemini, Claude, Cursor, Copilot, ChatGPT) hay **Developer nào tham gia cộng tác (Collab)** cũng chỉ cần đọc tài liệu này để:
> 1. Hiểu toàn bộ bức tranh kiến trúc, luồng dữ liệu và thiết kế hệ thống.
> 2. Nắm rõ cấu trúc thư mục, trách nhiệm của từng module và quy ước code.
> 3. Hiểu sâu logic nghiệp vụ phức tạp: Âm lịch Việt Nam, năm nhuận 29/2, múi giờ, scheduler cron, email tổng hợp.
> 4. Tránh lặp lại 6 lỗi build phổ biến đã có sẵn giải pháp triệt để.

---

## 📑 MỤC LỤC
1. [Tổng Quan Ứng Dụng & Mục Tiêu](#1-tổng-quan-ứng-dụng--mục-tiêu)
2. [Stack Công Nghệ & Lý Do Lựa Chọn](#2-stack-công-nghệ--lý-do-lựa-chọn)
3. [Kiến Trúc Hệ Thống & Luồng Dữ Liệu (Architecture & Data Flow)](#3-kiến-trúc-hệ-thống--luồng-dữ-liệu)
4. [Lược Đồ Cơ Sở Dữ Liệu & Bảo Mật RLS (Database Schema)](#4-lược-đồ-cơ-sở-dữ-liệu--bảo-mật-rls)
5. [Cấu Trúc Thư Mục Chi Tiết (Project Directory Structure)](#5-cấu-trúc-thư-mục-chi-tiết)
6. [Các Logic Nghiệp Vụ Cốt Lõi (Core Business Logic)](#6-các-logic-nghiệp-vụ-cốt-lõi)
7. [Design System & Trải Nghiệm Người Dùng (UI/UX)](#7-design-system--trải-nghiệm-người-dùng)
8. [Cấu Hình Biến Môi Trường (Environment Variables)](#8-cấu-hình-biến-môi-trường)
9. [Bảng Tra Cứu & Cách Khắc Phục Lỗi Build (Troubleshooting Knowledge Base)](#9-bảng-tra-cứu--cách-khắc-phục-lỗi-build)
10. [Quy Chuẩn Code & Kiểm Thử Cho Cộng Tác Viên (Contribution Guidelines)](#10-quy-chuẩn-code--kiểm-thử-cho-cộng-tác-viên)

---

## 1. Tổng Quan Ứng Dụng & Mục Tiêu

### 1.1 Bài toán thực tế
Trong cuộc sống bận rộn, người dùng thường xuyên quên ngày sinh nhật của người thân, bạn bè, đối tác hoặc các ngày giỗ gia tiên (vốn tính theo **Âm lịch Việt Nam**). Các ứng dụng lịch thông thường (Google Calendar, Apple Calendar) không hỗ trợ tối ưu Âm lịch Việt Nam hoặc nhắc nhở quá cứng nhắc, thiếu tính cá nhân hóa.

### 1.2 Giải pháp của ứng dụng BER
- Người dùng đăng nhập tài khoản riêng, lưu trữ danh sách ngày sinh nhật, kỷ niệm ngày cưới, ngày giỗ (cả Dương lịch và Âm lịch).
- Hệ thống tự động chuyển đổi Âm lịch sang Dương lịch chính xác cho từng năm (kể cả năm có tháng nhuận âm lịch).
- Tự động gửi email thông báo nhắc trước $N$ ngày (ví dụ 14, 7, 3, 1 hoặc đúng ngày) vào khung giờ tự chọn (mặc định 08:00 sáng).
- Nếu trong ngày có nhiều sự kiện cùng diễn ra $\rightarrow$ Hệ thống tự động gộp thành **1 email tổng hợp duy nhất** gửi tới người dùng để tránh làm phiền hộp thư.
- Giao diện thân thiện, hiện đại, tối ưu mobile-first (bottom tab bar, gesture vuốt sửa/xóa, gợi ý lời chúc mở nhanh Zalo/Messenger/SMS).

---

## 2. Stack Công Nghệ & Lý Do Lựa Chọn

| Thành phần | Công nghệ | Lý do lựa chọn & Vai trò |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | Tận dụng React Server Components, Route Handlers, SEO metadata tiếng Việt, tối ưu build tĩnh. |
| **Ngôn ngữ** | TypeScript 5+ | Đảm bảo tính chặt chẽ về type, giảm thiểu runtime error trong các phép toán ngày tháng. |
| **Styling** | Tailwind CSS + CSS Variables | Hệ thống design tokens đồng bộ, dễ dàng chuyển đổi Dark/Light mode, bo góc lớn mềm mại. |
| **State & Cache** | TanStack Query v5 (React Query) | Quản lý server state, hỗ trợ **Optimistic UI** (cập nhật tức thì trên giao diện, rollback khi lỗi), tự động cache. |
| **Form Handling** | React Hook Form + Zod | Validate dữ liệu client-side tức thì, hỗ trợ schema type-safe cho form thêm/sửa sự kiện. |
| **Hiệu ứng** | Framer Motion + canvas-confetti | Chuyển trang mượt mà, drawer spring animation, hiệu ứng bắn pháo giấy chúc mừng sinh nhật. |
| **Icon & Font** | Lucide React + Font Be Vietnam Pro | Hiển thị tiếng Việt cân đối, dấu thanh rõ nét; icon đồng bộ phong cách stroke 1.8px. |
| **Database & Auth** | Supabase (PostgreSQL + RLS + Storage) | PostgreSQL tin cậy, Row Level Security cách ly dữ liệu user, Auth có trigger tự động sinh Profile. |
| **Scheduler** | Supabase `pg_cron` + `pg_net` | Chạy job mỗi giờ trực tiếp trong database, gọi sang Edge Function bằng HTTPS phi đồng bộ. |
| **Edge Functions** | Deno TypeScript | Chạy serverless trên edge, xử lý gom sự kiện và gửi email thông qua Resend API. |
| **Email Service** | Resend API | API gửi email transactional hiện đại, tỷ lệ vào Inbox cao, hỗ trợ template HTML responsive. |
| **Testing** | Vitest | Chạy test tự động siêu tốc cho các hàm tính toán Âm lịch, 29/02 và lệch múi giờ. |

---

## 3. Kiến Trúc Hệ Thống & Luồng Dữ Liệu

```mermaid
graph TD
    UserClient["Next.js PWA Client (Mobile / Desktop)"]
    Auth["Supabase Auth (Email / Google OAuth)"]
    DB[("PostgreSQL Database (RLS Enabled)")]
    CronJob["pg_cron (Scheduler chạy mỗi giờ)"]
    PgNet["pg_net Extension"]
    EdgeFunction["Supabase Edge Function: send-reminders (Deno)"]
    Resend["Resend Email API"]
    Inbox["Hộp thư Người Dùng"]

    UserClient -->|1. Đăng ký / Đăng nhập| Auth
    Auth -->|Trigger tự động tạo| DB
    UserClient -->|2. Thêm/Sửa/Xóa sự kiện (Optimistic UI)| DB
    CronJob -->|3. Mỗi giờ kiểm tra lịch| PgNet
    PgNet -->|4. Gọi HTTPS POST| EdgeFunction
    EdgeFunction -->|5. Service Role: Query sự kiện cần nhắc| DB
    EdgeFunction -->|6. Chống gửi trùng lặp qua notification_logs| DB
    EdgeFunction -->|7. Tạo HTML tổng hợp & gửi thư| Resend
    Resend -->|8. Chuyển tiếp email nhắc nhở| Inbox
```

### Luồng hoạt động của Scheduler nhắc nhở hàng giờ:
1. `pg_cron` thức dậy vào phút 00 của mỗi giờ (`0 * * * *`).
2. `pg_net` gửi request HTTPS có header `Authorization: Bearer SERVICE_ROLE_KEY` đến Edge Function `send-reminders`.
3. Edge Function lấy danh sách user có `email_enabled = true`.
4. Với từng user, tính giờ địa phương hiện tại theo `timezone` (ví dụ `Asia/Ho_Chi_Minh`). Nếu giờ hiện tại khớp `remind_time` (mặc định `08:00` sáng):
   - Lọc các sự kiện có $(OccurrenceDate - Offset) = Today$.
   - Kiểm tra bảng `notification_logs`: Nếu đã gửi mốc này trong ngày rồi $\rightarrow$ Bỏ qua.
   - Nếu có $\ge 1$ sự kiện cần gửi $\rightarrow$ Tạo 1 email HTML tổng hợp, gửi qua Resend, ghi bản ghi vào `notification_logs`.

---

## 4. Lược Đồ Cơ Sở Dữ Liệu & Bảo Mật RLS

Toàn bộ migration nằm tại: [supabase/migrations/20261023_001_initial_schema.sql](file:///e:/BER-Birthday-Event-Reminder-/supabase/migrations/20261023_001_initial_schema.sql).

### 4.1 Bảng `profiles`
Lưu hồ sơ người dùng, tự động tạo khi user đăng ký qua Trigger:
- `id` (UUID, PK, references `auth.users(id)` on delete cascade)
- `display_name` (TEXT)
- `avatar_url` (TEXT)
- `timezone` (TEXT, default `'Asia/Ho_Chi_Minh'`)
- `onboarded` (BOOLEAN, default `false`)
- `created_at` (TIMESTAMPTZ)

### 4.2 Bảng `user_settings`
Lưu cấu hình nhận thông báo của người dùng:
- `user_id` (UUID, PK, references `profiles(id)` on delete cascade)
- `email_enabled` (BOOLEAN, default `true`)
- `default_remind_days` (INT[], default `'{7, 3, 1, 0}'` - số ngày nhắc trước)
- `remind_time` (TIME, default `'08:00'`)
- `extra_emails` (TEXT[], default `'{}'` - danh sách email phụ nhận đồng thời)
- `email_template` (JSONB)
- `leap_day_rule` (TEXT, default `'feb28'` CHECK IN (`'feb28'`, `'mar01'`))
- `theme` (TEXT, default `'system'`)

### 4.3 Bảng `events`
Lưu thông tin sự kiện và người được nhắc:
- `id` (UUID, PK, default `gen_random_uuid()`)
- `user_id` (UUID, references `profiles(id)` on delete cascade)
- `name` (TEXT, tên người hoặc tên sự kiện)
- `event_type` (TEXT, CHECK IN (`'birthday'`, `'anniversary'`, `'memorial'`, `'other'`))
- `event_day` (SMALLINT, 1 - 31)
- `event_month` (SMALLINT, 1 - 12)
- `event_year` (SMALLINT, NULL nếu không rõ năm sinh)
- `is_lunar` (BOOLEAN, `true` nếu tính theo Âm lịch Việt Nam)
- `group_name` (TEXT, CHECK IN (`'Gia đình'`, `'Bạn bè'`, `'Đồng nghiệp'`, `'Khác'`))
- `note` (TEXT, ghi chú thói quen/sở thích)
- `gift_idea` (TEXT, gợi ý quà tặng)
- `avatar_url` (TEXT, ảnh đại diện)
- `repeat_yearly` (BOOLEAN, default `true`)
- `remind_days` (INT[], NULL nếu dùng theo cấu hình mặc định ở `user_settings`)
- `enabled` (BOOLEAN, default `true` - công tắc bật/tắt nhắc nhở riêng)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 4.4 Bảng `notification_logs` (Chống gửi trùng lặp tuyệt đối)
- `id` (UUID, PK)
- `user_id` (UUID, references `profiles(id)` on delete cascade)
- `event_id` (UUID, references `events(id)` on delete cascade)
- `remind_offset` (INT, số ngày nhắc trước: 0, 1, 3, 7...)
- `occurrence_date` (DATE, ngày sự kiện diễn ra của năm tương ứng)
- `channel` (TEXT, default `'email'`)
- `status` (TEXT, `'sent'` | `'failed'`)
- `error` (TEXT)
- `sent_at` (TIMESTAMPTZ)
- **Ràng buộc UNIQUE**: `CONSTRAINT unique_event_notification UNIQUE (event_id, remind_offset, occurrence_date, channel)`

### 4.5 Bảo mật Row Level Security (RLS)
Mọi bảng đều bật RLS với chính sách: `auth.uid() = user_id`. Người dùng này hoàn toàn không thể xem hoặc chỉnh sửa dữ liệu của người dùng khác. Chỉ riêng Edge Function sử dụng `service_role key` mới có quyền query liên bảng để gửi email.

---

## 5. Cấu Trúc Thư Mục Chi Tiết

```
BER-Birthday-Event-Reminder-/
├── .agents/                               # Antigravity AI Customizations
│   └── rules/
│       └── build_error_fixes.md           # Rule tự động khắc phục lỗi build
├── public/
│   ├── manifest.json                      # Cấu hình PWA cài lên điện thoại
│   ├── icon-192.png, icon-512.png         # Icon ứng dụng
│   └── favicon.ico
├── supabase/
│   ├── migrations/
│   │   ├── 20261023_001_initial_schema.sql # Tables, RLS, Trigger, Bucket
│   │   └── 20261023_002_cron_scheduler.sql # pg_cron & pg_net
│   ├── functions/
│   │   └── send-reminders/                # Deno Edge Function
│   │       ├── index.ts                   # Điểm khởi chạy gửi email
│   │       ├── email-template.ts          # Template HTML
│   │       └── reminder-engine.ts         # Logic tính ngày tiếp theo
│   └── seed.sql                           # Dữ liệu demo mẫu phong phú
├── src/
│   ├── app/                               # Next.js App Router
│   │   ├── layout.tsx                     # Root Layout (Font, Theme, Toast, Query)
│   │   ├── globals.css                    # Design Tokens & CSS Variables
│   │   ├── page.tsx                       # Landing Page giới thiệu
│   │   ├── middleware.ts                  # Route protection & session refresh
│   │   ├── (auth)/                        # Nhóm trang xác thực
│   │   │   ├── login/page.tsx             # Đăng nhập email / Google 1-chạm
│   │   │   ├── register/page.tsx          # Đăng ký tài khoản
│   │   │   ├── forgot-password/page.tsx   # Quên mật khẩu
│   │   │   └── reset-password/page.tsx    # Đặt lại mật khẩu mới
│   │   ├── (dashboard)/                   # Khu vực ứng dụng sau đăng nhập
│   │   │   ├── layout.tsx                 # Header, Sidebar, Mobile Bottom Nav, Form Drawer
│   │   │   ├── dashboard/page.tsx         # Thẻ Hôm Nay + Carousel Sắp Tới + Stats
│   │   │   ├── events/page.tsx            # Danh sách sự kiện, search, filter chips, swipe
│   │   │   ├── calendar/page.tsx          # Lịch tháng chấm màu + bottom sheet ngày
│   │   │   ├── settings/page.tsx          # Cài đặt mốc nhắc, giờ gửi, preview email, xóa tài khoản
│   │   │   ├── history/page.tsx           # Timeline lịch sử email đã gửi
│   │   │   └── onboarding/page.tsx        # Hướng dẫn 3 bước cho user mới
│   │   └── api/                           # Route Handlers
│   │       ├── auth/callback/route.ts     # Supabase Auth code exchange
│   │       ├── test-email/route.ts        # Gửi email thử nghiệm từ Settings
│   │       └── export-ics/route.ts        # Xuất file .ics đồng bộ Google Calendar
│   ├── components/
│   │   ├── layout/                        # AppHeader, DesktopSidebar, MobileBottomNav, CommandMenu
│   │   ├── events/                        # EventCard, EventFormDrawer, EventListGrouped, TodayCard, UpcomingCarousel
│   │   ├── calendar/                      # MonthCalendarView
│   │   ├── common/                        # ConfettiCelebration, EmptyState, ThemeToggle, OfflineIndicator
│   │   ├── providers/                     # QueryProvider, ThemeProvider
│   │   └── ui/                            # Toast với nút Hoàn tác (Undo)
│   ├── hooks/                             # Custom React Hooks
│   │   ├── use-events.ts                  # TanStack Query, Optimistic UI, Undo deletion
│   │   ├── use-user-settings.ts           # Cấu hình thông báo, timezone, profile
│   │   └── use-online-status.ts           # Theo dõi trạng thái mạng online/offline
│   ├── lib/                               # Core libraries & utilities
│   │   ├── lunar/amlich.ts                # Thuật toán thiên văn Hồ Ngọc Đức (Âm lịch VN)
│   │   ├── date-utils.ts                  # Xử lý 29/2, đếm ngược ngày, tính tuổi, ICS export
│   │   ├── mock-data.ts                   # Dữ liệu demo phong phú chạy ngay khi chưa có DB
│   │   ├── utils.ts                       # Helper cn() và format ngày tháng tiếng Việt
│   │   ├── email/template-builder.ts      # Builder template email HTML đồng bộ
│   │   └── supabase/                      # Browser Client & Server Client (@supabase/ssr)
│   ├── types/
│   │   ├── database.ts                    # TypeScript types ánh xạ Supabase DB
│   │   └── events.ts                      # Zod schemas & Domain models
│   └── tests/
│       └── date-utils.test.ts             # 8 Unit tests Vitest (29/2, Âm lịch, Lệch năm, Tuổi)
├── AI_CONFIG.md                           # TÀI LIỆU NÀY (Master Blueprint)
├── GEMINI.md                              # AI Memory cho Antigravity IDE
├── MEMORIES.md                            # Nhật ký tiến trình làm việc theo ngày giờ
├── README.md                              # Hướng dẫn cài đặt & deploy chi tiết
├── package.json
└── tsconfig.json
```

---

## 6. Các Logic Nghiệp Vụ Cốt Lõi

### 6.1 Thuật toán Âm lịch Việt Nam (Hồ Ngọc Đức)
File: [src/lib/lunar/amlich.ts](file:///e:/BER-Birthday-Event-Reminder-/src/lib/lunar/amlich.ts)
- Dựa trên thuật toán thiên văn tính toán vị trí mặt trăng và mặt trời tại kinh tuyến chuẩn Hà Nội (UTC+7).
- Hỗ trợ chuyển đổi 2 chiều: `convertSolar2Lunar(dd, mm, yy)` và `convertLunar2Solar(dd, mm, yy, isLeap)`.
- Xử lý chính xác các năm có **tháng nhuận âm lịch** (Leap Month) mà các thư viện dương lịch thông thường không làm được.
- Đã được unit test kỹ càng tại [src/tests/date-utils.test.ts](file:///e:/BER-Birthday-Event-Reminder-/src/tests/date-utils.test.ts).

### 6.2 Xử lý sinh nhật ngày 29/02 ở năm không nhuận
File: [src/lib/date-utils.ts](file:///e:/BER-Birthday-Event-Reminder-/src/lib/date-utils.ts)
- Năm nhuận: Có ngày 29/02 bình thường.
- Năm không nhuận: Tuân theo cấu hình `leap_day_rule` do người dùng thiết lập:
  - `feb28`: Nhắc nhở và chúc mừng vào ngày 28/02 (phong tục chúc mừng trước khi hết tháng).
  - `mar01`: Nhắc nhở và chúc mừng vào ngày 01/03 (đúng ngày thứ 60 trong năm).

### 6.3 Xử lý mốc nhắc vượt qua ranh giới năm (Year Boundary)
- Ví dụ: Sinh nhật ngày 02/01, mốc nhắc trước 7 ngày rơi vào ngày 26/12 của năm trước.
- Thuật toán `calculateNextOccurrence` luôn so sánh ngày diễn ra trong năm hiện tại với ngày hôm nay:
  - Nếu ngày sự kiện trong năm nay đã qua $\rightarrow$ Tự động dời mục tiêu sang năm tiếp theo.
  - Luôn đảm bảo khoảng cách $DaysDifference \ge 0$ tính theo chu kỳ 365 ngày tới.

### 6.4 Optimistic UI & Toast Hoàn Tác (Undo Pattern)
File: [src/hooks/use-events.ts](file:///e:/BER-Birthday-Event-Reminder-/src/hooks/use-events.ts)
- Khi người dùng xóa sự kiện:
  1. Giao diện xóa thẻ ngay lập tức (không chờ server phản hồi, mang lại cảm giác tức thì).
  2. Hiển thị Toast thông báo: *"Đã xóa sự kiện • [Hoàn tác] (5s)"*.
  3. Nếu người dùng bấm **Hoàn tác** trong 5 giây: Thẻ được khôi phục nguyên vẹn và huỷ thao tác xóa.
  4. Nếu có lỗi mạng: TanStack Query tự động rollback dữ liệu về trạng thái trước đó.

---

## 7. Design System & Trải Nghiệm Người Dùng (UI/UX)

### 7.1 Bảng màu chính (Brand Gradient)
- **Primary Brand Gradient**: `linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F43F5E 100%)` (Tím Neon $\rightarrow$ Hồng Thạch Anh $\rightarrow$ San Hô Rực Rỡ).
- **Màu Pastel theo nhóm sự kiện**:
  - 🏠 **Gia đình**: Rose (`#F43F5E`) - Tươi ấm, yêu thương.
  - 👫 **Bạn bè**: Amber (`#F59E0B`) - Năng động, vui vẻ.
  - 💼 **Đồng nghiệp**: Indigo (`#6366F1`) - Công nghệ, trang nhã.
  - 🌟 **Khác**: Emerald (`#10B981`) - Tươi mới, nổi bật.

### 7.2 Bố cục & Tương tác
- **Mobile (< 1024px)**:
  - Bottom Tab Bar (Trang chủ, Sự kiện, Lịch, Cài đặt) đặt trong tầm ngón cái.
  - Nút **FAB "+" nổi bật chính giữa** kích hoạt form thêm sự kiện nhanh.
  - Thao tác vuốt ngón tay (Swipe gesture) trên thẻ sự kiện để Sửa/Xóa.
- **Desktop ($\ge$ 1024px)**:
  - Sidebar thu gọn / mở rộng linh hoạt, có huy hiệu đếm sự kiện sắp tới.
  - Phím tắt **Command Menu (`Ctrl + K` hoặc `Cmd + K`)** tìm kiếm tức thì.
  - Thẻ sự kiện xuất hiện thanh công cụ tương tác khi di chuột (hover actions).
- **Thẻ Hôm Nay**: Confetti nhẹ nhàng + Modal gợi ý 3 mẫu lời chúc soạn sẵn (ấm áp, hài hước, lịch sự) và nút mở thẳng Zalo / Messenger / SMS.

---

## 8. Cấu Hình Biến Môi Trường (Environment Variables)

Xem file mẫu: [.env.example](file:///e:/BER-Birthday-Event-Reminder-/.env.example).

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Resend Email Configuration
RESEND_API_KEY=re_1234567890abcdef...
EMAIL_FROM=Nhắc Sự Kiện <nhac@yourdomain.com>

# App Base URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

> [!TIP]
> Khi chưa có tài khoản Supabase / Resend thật, ứng dụng tự động chạy ở chế độ **Local Demo Mode** với dữ liệu mẫu trong `src/lib/mock-data.ts`, không làm vỡ giao diện hay gián đoạn trải nghiệm của cộng tác viên.

---

## 9. Bảng Tra Cứu & Cách Khắc Phục Lỗi Build (Troubleshooting Knowledge Base)

> 💡 **Xem chi tiết chuyên sâu**: Toàn bộ stack trace, nguyên nhân kỹ thuật, code diff trước/sau và các lỗi tiềm ẩn được ghi chép đầy đủ tại: **[AI_DEBUG.md](file:///e:/BER-Birthday-Event-Reminder-/AI_DEBUG.md)**.

Dưới đây là 6 lỗi build thực tế đã được phát hiện và xử lý triệt để trong quá trình phát triển dự án này:

| # | Triệu Chứng Lỗi (Error Message) | File Bị Ảnh Hưởng | Nguyên Nhân Gốc Rễ | Cách Khắc Phục Chuẩn |
|---|---|---|---|---|
| **1** | `Cannot find module 'https://esm.sh/...'` | `supabase/functions/send-reminders/index.ts` | Next.js tsconfig quét nhầm code Deno | Thêm `"supabase"` vào `"exclude"` trong `tsconfig.json` |
| **2** | `Module not found: Can't resolve '../../.../supabase/...'` | `src/app/api/test-email/route.ts` | Import relative chéo giữa Next.js và Deno functions | Tách shared template ra `src/lib/email/template-builder.ts` |
| **3** | `Argument of type 'any' is not assignable to parameter of type 'never'` | `src/hooks/use-events.ts`, `src/hooks/use-user-settings.ts` | Overload builder của Supabase JS v2 quá nghiêm ngặt | Dùng `(supabase as any).from("events").update(...)` |
| **4** | `Type 'UseMutateAsyncFunction' is not assignable to '(id, enabled) => void'` | `src/hooks/use-events.ts` | TanStack Query `mutateAsync` nhận 1 object, component gọi 2 params | Bọc wrapper function `(id, enabled) => mutateAsync({ id, enabled })` |
| **5** | `useSearchParams() should be wrapped in a suspense boundary` | `src/app/(dashboard)/events/page.tsx` | Next.js App Router yêu cầu Client Component dùng hook tìm kiếm phải có Suspense | Bọc component con trong `<Suspense fallback={...}>` |
| **6** | `AssertionError: expected 2023 to be 2024` khi test Tết Nguyên Đán | `src/lib/lunar/amlich.ts` | Nhầm `lunarYear = yy - 1` ở nhánh `a11 >= monthStart` | Đổi thành `lunarYear = yy` khi `a11 >= monthStart` |

---

## 10. Quy Chuẩn Code & Kiểm Thử Cho Cộng Tác Viên (Contribution Guidelines)

Khi bất kỳ Developer hoặc AI nào cộng tác sửa đổi codebase:

1. **Tuân thủ quy tắc TypeScript & Deno Boundary**:
   - Tuyệt đối không import chéo file giữa thư mục `supabase/functions/` và `src/`. Mọi mã dùng chung phải đặt tại `src/lib/`.
2. **Quy tắc Supabase Client Type**:
   - Khi gọi `.insert()`, `.update()`, `.delete()`, luôn dùng cú pháp `(supabase as any).from("<table_name>")` để tránh TypeScript rơi vào overload `never`.
3. **Quy chuẩn Component có Query String**:
   - Mọi Client Component sử dụng `useSearchParams()` phải được bọc trong `<Suspense fallback={<Skeleton />}>`.
4. **Quy trình Kiểm Tra Bắt Buộc Trước Khi Commit**:
   ```bash
   # Bước 1: Chạy toàn bộ Unit Tests
   npm test

   # Bước 2: Kiểm tra biên dịch Next.js Production Build
   npm run build
   ```
   Chỉ khi cả 2 lệnh trên đều kết thúc với mã thành công (`Exit Code: 0`) thì công việc mới được coi là hoàn tất.
5. **Cập nhật nhật ký tiến trình**:
   - Sau khi hoàn tất một tính năng hoặc phiên làm việc quan trọng, hãy ghi nối tiếp vào cuối file [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md).
