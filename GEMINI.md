# QUY TẮC & KINH NGHIỆM BUILD DỰ ÁN CHO AI ASSISTANT (GEMINI / ANTIGRAVITY)

> **Mục đích**: Tài liệu này đóng vai trò là "AI Memory / Build Knowledge Base" cho dự án **Nhắc Sinh Nhật & Sự Kiện (BER)**. Mỗi khi AI làm việc, phân tích lỗi hoặc build/deploy, hãy luôn đối chiếu các quy tắc và lỗi đã được giải quyết dưới đây để xử lý tức thì, tránh lặp lại sai lầm.

---

## 1. Thông Tin Công Nghệ Cốt Lõi
- **Framework**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui pattern.
- **Data Layer**: TanStack Query v5 (Optimistic UI, offline persistence fallback).
- **Backend**: Supabase (PostgreSQL + RLS + Supabase Auth + Storage).
- **Edge Functions**: Deno TypeScript (`supabase/functions/send-reminders/`).
- **Lập lịch**: `pg_cron` + `pg_net` gọi Edge Function hàng giờ.
- **Email Service**: Resend API (`src/lib/email/template-builder.ts`).
- **Testing**: Vitest (`src/tests/date-utils.test.ts`).

---

## 2. Danh Mục Các Lỗi Build Thường Gặp & Cách Khắc Phục Tương Tự

### 🔴 Lỗi 1: Type error do TypeScript Next.js quét thư mục Deno Edge Functions
- **Mã lỗi / Triệu chứng**:
  ```
  ./supabase/functions/send-reminders/index.ts:5:30
  Type error: Cannot find module 'https://esm.sh/@supabase/supabase-js@2.46.1' or its corresponding type declarations.
  ```
- **Nguyên nhân**: Supabase Edge Functions chạy trên runtime Deno và import module qua URL (`https://esm.sh/...`). TypeScript của Next.js mặc định quét toàn bộ file `.ts` trong workspace nên báo lỗi cú pháp Deno.
- **Cách fix triệt để**: Thêm `"supabase"` vào danh sách `"exclude"` trong file `tsconfig.json`:
  ```json
  "exclude": ["node_modules", "supabase"]
  ```

---

### 🔴 Lỗi 2: Module not found khi import relative giữa app Next.js và Supabase Functions
- **Mã lỗi / Triệu chứng**:
  ```
  ./src/app/api/test-email/route.ts
  Module not found: Can't resolve '../../../../../supabase/functions/send-reminders/email-template'
  ```
- **Nguyên nhân**: Không được import trực tiếp file từ thư mục `supabase/functions/` vào trong `src/` của Next.js bằng relative path vì webpack bundle sẽ không quản lý được boundary giữa Deno và Node.js.
- **Cách fix triệt để**:
  1. Đặt shared templates và utilities vào `src/lib/email/template-builder.ts`.
  2. Các Route Handler trong `src/app/` luôn import qua alias chuẩn:
     ```typescript
     import { generateReminderEmailHtml } from "@/lib/email/template-builder";
     ```

---

### 🔴 Lỗi 3: Type error `never` khi gọi `.update()` hoặc `.insert()` của Supabase Client v2
- **Mã lỗi / Triệu chứng**:
  ```
  Type error: Argument of type 'any' is not assignable to parameter of type 'never'
  trên lệnh supabase.from("events").update(...) hoặc supabase.from("user_settings").update(...)
  ```
- **Nguyên nhân**: TypeScript inference của thư viện `@supabase/supabase-js` v2 có các overload builder rất nghiêm ngặt. Khi payload truyền vào có type inference phức tạp (ví dụ union type hoặc optional fields), TypeScript sẽ rơi vào fallback type `never`.
- **Cách fix triệt để**:
  1. Ép kiểu client gọi table: `(supabase as any).from("events").update(...)`.
  2. Bỏ `id` ra khỏi payload khi gọi `.insert()`:
     ```typescript
     const { id: _ignore, ...eventPayload } = newEvent;
     await (supabase as any).from("events").insert({ ...eventPayload, user_id: session.user.id } as any);
     ```

---

### 🔴 Lỗi 4: Type mismatch giữa mutation TanStack Query và callback props của component
- **Mã lỗi / Triệu chứng**:
  ```
  Type error: Type 'UseMutateAsyncFunction<void, Error, { id: string; enabled: boolean; }>' 
  is not assignable to type '(id: string, enabled: boolean) => void'.
  ```
- **Nguyên nhân**: TanStack Query `mutateAsync` chỉ nhận 1 đối số duy nhất (object parameters `{ id, enabled }`), trong khi component con (ví dụ `EventCard`) truyền 2 tham số riêng biệt `onToggle(id, enabled)`.
- **Cách fix triệt để**: Trong hook custom `useEvents.ts`, bọc hàm wrapper tương thích trước khi export:
  ```typescript
  return {
    deleteEvent: (id: string) => deleteMutation.mutateAsync(id),
    toggleEventEnabled: (id: string, enabled: boolean) =>
      toggleEnabledMutation.mutateAsync({ id, enabled }),
  };
  ```

---

### 🔴 Lỗi 5: `useSearchParams()` trong Next.js App Router Client Component
- **Mã lỗi / Triệu chứng**: Cảnh báo hoặc lỗi tĩnh khi `next build`:
  ```
  useSearchParams() should be wrapped in a suspense boundary at page "/events"
  ```
- **Nguyên nhân**: Next.js App Router yêu cầu toàn bộ component client có sử dụng `useSearchParams()` phải được bọc trong `<Suspense>` để tránh bailout khỏi Static Site Generation (SSG).
- **Cách fix triệt để**:
  ```tsx
  function EventsContent() {
    const searchParams = useSearchParams();
    // Logic của trang
  }

  export default function EventsPage() {
    return (
      <Suspense fallback={<div className="animate-pulse h-32 rounded-3xl bg-card" />}>
        <EventsContent />
      </Suspense>
    );
  }
  ```

---

### 🔴 Lỗi 6: Lệch 1 năm âm lịch trong thuật toán thiên văn Hồ Ngọc Đức
- **Mã lỗi / Triệu chứng**:
  ```
  AssertionError: expected 2023 to be 2024
  Khi kiểm tra convertSolar2Lunar(10, 2, 2024) (Tết Giáp Thìn 2024)
  ```
- **Nguyên nhân**: Nhầm công thức `lunarYear = yy - 1` ở nhánh `a11 >= monthStart`.
- **Cách fix triệt để**: Trong `src/lib/lunar/amlich.ts`:
  ```typescript
  let lunarYear = yy;
  if (a11 >= monthStart) {
    lunarYear = yy; // Đúng: gán bằng yy, không trừ 1
    a11 = getLunarMonth11(yy - 1, TIMEZONE);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, TIMEZONE);
  }
  ```

---

### 🔴 Lỗi 7: `policy "..." already exists` khi chạy SQL Migration Supabase
- **Mã lỗi / Triệu chứng**:
  ```
  ERROR: 42710: policy "Users can view their own profile" for table "profiles" already exists
  ```
- **Nguyên nhân**: PostgreSQL `CREATE POLICY` không hỗ trợ `OR REPLACE` hay `IF NOT EXISTS`. Nếu migration bị chạy lại thì sẽ ném lỗi 42710.
- **Cách fix triệt để**: Luôn chèn `DROP POLICY IF EXISTS "<policy_name>" ON <table_name>;` ngay trước câu lệnh `CREATE POLICY`.

---

### 🔴 Lỗi 8: `A conflicting public file and page file was found for path /favicon.ico` (Lỗi 500 trắng trang)
- **Mã lỗi / Triệu chứng**:
  ```
  Failed to load resource: the server responded with a status of 500 (Internal Server Error) webpack.js, main.js, favicon.ico
  Server log: Error: A conflicting public file and page file was found for path /favicon.ico
  ```
- **Nguyên nhân**: Để đồng thời cả `src/app/favicon.ico` (hoặc `src/app/icon.png`) và `public/favicon.ico` (hoặc `public/icon.png`). Next.js App Router coi cả hai cùng trỏ về 1 route path gây xung đột định tuyến và sập dev server (500).
- **Cách fix triệt để**:
  1. Chỉ giữ icon trong `public/` (ví dụ `public/favicon.ico`, `public/icon.png`, `public/favicon-32x32.png`, v.v.).
  2. Xóa các file icon trùng lặp trong `src/app/` (`src/app/favicon.ico`, `src/app/icon.png`, `src/app/apple-icon.png`).
  3. Cấu hình khai báo tập trung trong `metadata.icons` tại `src/app/layout.tsx`.

---

## 3. Quy Trình Kiểm Tra Chuẩn (Verification Workflow)
Mỗi khi chỉnh sửa code hoặc thêm tính năng mới, AI cần tự chạy 2 lệnh sau để đảm bảo chất lượng:
1. `npm test` $\rightarrow$ Đảm bảo toàn bộ 8+ unit test ngày tháng, âm lịch, 29/2 đều pass.
2. `npm run build` $\rightarrow$ Đảm bảo không còn bất kỳ lỗi compile, type error hay module not found nào.

---

## 4. Quy Tắc Ghi Nhớ & Cập Nhật Tiến Trình (MEMORIES.md)
Mỗi khi người dùng đưa ra câu lệnh:
- *"lưu lại quá trình"*
- *"ghi nhớ quá trình"*
- *"cập nhật nhật ký / memories"*
- Hoặc sau khi hoàn tất một tính năng lớn quan trọng:

$\rightarrow$ **Hành động bắt buộc của AI**:
1. Lấy ngày giờ hiện tại chính xác (năm, tháng, ngày, giờ, phút).
2. Mở file [MEMORIES.md](file:///e:/BER-Birthday-Event-Reminder-/MEMORIES.md).
3. Nối tiếp (append) một mục mới ở cuối file với đầy đủ các phần:
   - `### 📅 [YYYY-MM-DD HH:mm:ss] - [Tên tóm tắt công việc]`
   - Yêu cầu của người dùng
   - Các công việc đã hoàn thành
   - Danh sách file tạo/chỉnh sửa
   - Lỗi phát sinh & cách giải quyết (nếu có)
   - Trạng thái kiểm thử (`npm test`, `npm run build`)
   - Ghi chú định hướng tiếp theo.
