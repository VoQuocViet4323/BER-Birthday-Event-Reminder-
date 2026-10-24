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
          let userRole = "user";
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (!profile) {
            // Tự động tạo hồ sơ dự phòng cho tài khoản Google OAuth nếu trigger DB chưa tạo
            const displayName =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Người dùng";
            const avatarUrl =
              user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              null;
            const username =
              user.user_metadata?.username ||
              user.email?.split("@")[0] ||
              `user_${user.id.slice(0, 6)}`;

            await (supabase as any).from("profiles").upsert(
              {
                id: user.id,
                display_name: displayName,
                avatar_url: avatarUrl,
                email: user.email,
                username: username,
                role: "user",
                timezone: "Asia/Ho_Chi_Minh",
                onboarded: true,
              },
              { onConflict: "id" }
            );

            await (supabase as any).from("user_settings").upsert(
              { user_id: user.id },
              { onConflict: "user_id" }
            );
          } else {
            userRole = profile.role || "user";
          }

          if (
            userRole === "admin" ||
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

