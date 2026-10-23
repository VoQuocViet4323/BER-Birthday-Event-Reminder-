---
trigger: always_on
description: Hướng dẫn và kinh nghiệm tự động khắc phục các lỗi build phổ biến trong dự án BER
---

# Hướng Dẫn Tự Động Khắc Phục Lỗi Build (AI Build Troubleshooting Rules)

Khi AI làm việc với dự án này, nếu gặp bất kỳ lỗi nào trong quá trình build (`next build`) hoặc kiểm thử (`npm test`), hãy tuân thủ nghiêm ngặt các quy tắc sau:

1. **Thư mục Supabase Edge Function vs Next.js TypeScript**:
   - `supabase/functions/` là mã Deno, sử dụng import URL dạng `https://esm.sh/...`.
   - Tuyệt đối KHÔNG bỏ `supabase` khỏi mục `"exclude"` trong `tsconfig.json`.
   - Tuyệt đối KHÔNG import file chéo từ `supabase/functions/` vào trong thư mục `src/`. Mọi mã dùng chung phải đặt tại `src/lib/`.

2. **Supabase Client Types trong React Query**:
   - Khi gọi `.insert()`, `.update()`, `.delete()` trên client Supabase, nếu gặp lỗi `Argument of type '...' is not assignable to parameter of type 'never'`, luôn dùng `(supabase as any).from("<table_name>")` để vượt qua strict overload inference mà không làm vỡ logic nghiệp vụ.

3. **TanStack Query Mutation Handlers**:
   - Hàm `mutateAsync` nhận một tham số đơn. Nếu component cần truyền nhiều tham số riêng biệt (ví dụ `(id, enabled)`), hãy luôn bọc thành hàm mũi tên `(id, enabled) => mutation.mutateAsync({ id, enabled })`.

4. **Next.js App Router & Suspense**:
   - Mọi Client Component sử dụng hook `useSearchParams()` phải được bọc trong `<Suspense fallback={...}>` để Next.js pre-render và build production thành công.

5. **Âm lịch Việt Nam**:
   - Khi tính toán Âm lịch theo thuật toán Hồ Ngọc Đức trong `src/lib/lunar/amlich.ts`, giữ nguyên công thức:
     - `a11 >= monthStart`: `lunarYear = yy`
     - `a11 < monthStart`: `lunarYear = yy + 1`
