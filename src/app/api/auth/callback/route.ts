import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const defaultNext = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Tự động nhận diện tài khoản Admin hay User để chuyển hướng
      let destination = defaultNext;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (
            profile?.role === "admin" ||
            user.user_metadata?.role === "admin" ||
            user.email?.startsWith("admin@")
          ) {
            destination = "/admin";
          }
        }
      } catch (e) {
        console.error("Lỗi xác thực vai trò:", e);
      }

      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  // Nếu lỗi hoặc không có code, chuyển về login với thông báo lỗi
  return NextResponse.redirect(
    new URL("/login?error=auth-callback-failed", requestUrl.origin)
  );
}

