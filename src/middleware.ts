import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Nếu chưa cấu hình Supabase thực tế, cho phép xem trang để trải nghiệm demo
  if (!supabaseUrl || supabaseUrl.includes("dummy-project")) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey!, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = request.nextUrl.clone();
  const isAuthPage =
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/register") ||
    url.pathname.startsWith("/forgot-password") ||
    url.pathname.startsWith("/reset-password");

  const isProtectedPage =
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/events") ||
    url.pathname.startsWith("/calendar") ||
    url.pathname.startsWith("/settings") ||
    url.pathname.startsWith("/history") ||
    url.pathname.startsWith("/onboarding") ||
    url.pathname.startsWith("/admin");

  // Chưa đăng nhập mà vào trang bảo vệ -> Chuyển về /login
  if (!session && isProtectedPage) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Đã đăng nhập mà vào /login, /register -> Chuyển vào giao diện tương ứng
  if (session && isAuthPage) {
    const role =
      session.user.user_metadata?.role ||
      session.user.app_metadata?.role ||
      (session.user.email?.startsWith("admin@") ? "admin" : "user");
    url.pathname = role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Khớp tất cả các đường dẫn trừ:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (manifest.json, images)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
