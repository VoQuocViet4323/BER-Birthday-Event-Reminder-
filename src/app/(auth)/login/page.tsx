"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Tự động điền tài khoản & mật khẩu nếu đã được ghi nhớ ở máy (nếu không ghi nhớ thì xóa sạch)
  useEffect(() => {
    try {
      const isRemembered = localStorage.getItem("ber_remember_me") === "true";
      const savedUser = localStorage.getItem("ber_remembered_username");
      const savedPass = localStorage.getItem("ber_remembered_password");

      if (isRemembered && savedUser) {
        setUsername(savedUser);
        if (savedPass) {
          try {
            setPassword(decodeURIComponent(escape(atob(savedPass))));
          } catch {
            setPassword(savedPass);
          }
        }
        setRememberMe(true);
      } else {
        setUsername("");
        setPassword("");
        setRememberMe(false);
        // Ngăn chặn Chrome autofill tự động inject sau render khi không bật ghi nhớ
        const timer = setTimeout(() => {
          const stillRemembered = localStorage.getItem("ber_remember_me") === "true";
          if (!stillRemembered) {
            setUsername("");
            setPassword("");
          }
        }, 80);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.error("Không thể tải thông tin ghi nhớ tài khoản:", err);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password) {
      toast({
        title: "Vui lòng nhập đầy đủ thông tin",
        description: "Vui lòng nhập tên tài khoản và mật khẩu.",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

    if (!isConfigured) {
      setIsLoading(false);
      toast({
        title: "Cần khởi động lại máy chủ (Dev Server)",
        description:
          "Next.js cần được khởi động lại (Ctrl+C rồi chạy lại npm run dev) để nhận cấu hình Supabase từ file .env / .env.local.",
        variant: "error",
      });
      return;
    }

    // Phân giải tên tài khoản thành email để xác thực qua Supabase Auth
    let resolvedEmail = "";
    const isSpecialAdmin = cleanUsername === "admin";

    if (cleanUsername.includes("@")) {
      resolvedEmail = cleanUsername;
    } else if (isSpecialAdmin) {
      resolvedEmail = "admin@ber-app.com";
    } else {
      // 1. Thử tra cứu email thật liên kết với username qua RPC get_email_by_username
      try {
        const { data: rpcEmail } = await (supabase as any).rpc("get_email_by_username", {
          p_username: cleanUsername,
        });
        if (rpcEmail) {
          resolvedEmail = rpcEmail;
        }
      } catch (err) {
        console.warn("RPC get_email_by_username chưa kích hoạt:", err);
      }

      // 2. Nếu chưa tìm thấy, fallback với đuôi @ber-app.com mặc định cũ
      if (!resolvedEmail) {
        resolvedEmail = `${cleanUsername}@ber-app.com`;
      }
    }

    let { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    // Nếu không tìm thấy và là username, thử fallback tiếp với đuôi @ber.local
    if (error && !cleanUsername.includes("@") && !isSpecialAdmin) {
      const fallbackRes = await supabase.auth.signInWithPassword({
        email: `${cleanUsername}@ber.local`,
        password,
      });
      if (!fallbackRes.error) {
        data = fallbackRes.data;
        error = null;
        resolvedEmail = `${cleanUsername}@ber.local`;
      }
    }

    if (error) {
      setIsLoading(false);
      const errLower = error.message.toLowerCase();
      let errorDesc = error.message;

      if (error.message === "Invalid login credentials") {
        errorDesc = "Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.";
      } else if (errLower.includes("email not confirmed")) {
        errorDesc = "Tài khoản chưa được kích hoạt.";
      } else if (errLower.includes("failed to fetch") || errLower.includes("network")) {
        errorDesc = "Không thể kết nối đến máy chủ Supabase. Vui lòng kiểm tra lại URL Supabase trong .env hoặc kết nối mạng.";
      }

      toast({
        title: "Đăng nhập không thành công",
        description: errorDesc,
        variant: "error",
      });
      return;
    }

    // Xử lý ghi nhớ thông tin tài khoản & mật khẩu trên máy
    if (rememberMe) {
      try {
        localStorage.setItem("ber_remember_me", "true");
        localStorage.setItem("ber_remembered_username", cleanUsername);
        try {
          localStorage.setItem("ber_remembered_password", btoa(unescape(encodeURIComponent(password))));
        } catch {
          localStorage.setItem("ber_remembered_password", password);
        }
      } catch (err) {
        console.error("Không thể lưu ghi nhớ:", err);
      }
    } else {
      try {
        localStorage.removeItem("ber_remember_me");
        localStorage.removeItem("ber_remembered_username");
        localStorage.removeItem("ber_remembered_password");
      } catch (err) {
        console.error("Không thể xóa ghi nhớ:", err);
      }
    }

    // Tự động nhận diện loại tài khoản (Admin hay User) để chuyển hướng giao diện
    let userRole = "user";
    try {
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", data?.user?.id)
        .maybeSingle();

      if (profile?.role) {
        userRole = profile.role;
      } else if (
        data?.user?.user_metadata?.role === "admin" ||
        data?.user?.app_metadata?.role === "admin" ||
        resolvedEmail.startsWith("admin@")
      ) {
        userRole = "admin";
      }
    } catch (err) {
      console.error("Lỗi xác thực vai trò:", err);
    }

    // Dọn dẹp cache profile cũ của phiên trước
    if (typeof window !== "undefined") {
      localStorage.removeItem("ber-user-profile");
      localStorage.removeItem("ber-user-settings");
      localStorage.removeItem("ber-local-events");
    }

    if (userRole === "admin" || isSpecialAdmin) {
      toast({
        title: "Đăng nhập Quản trị viên thành công! 🛡️",
        description: "Nhận diện: Tài khoản Quản trị. Đang chuyển hướng vào giao diện Admin...",
        variant: "success",
      });
      setIsLoading(false);
      window.location.href = "/admin";
      return;
    }

    toast({
      title: "Đăng nhập thành công! 🎉",
      description: "Nhận diện: Tài khoản Người dùng. Chào mừng bạn quay trở lại!",
      variant: "success",
    });

    setIsLoading(false);
    window.location.href = "/dashboard";
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl shadow-glow group-hover:scale-105 transition-transform">
            🎂
          </div>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Chào mừng trở lại!
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          Đăng nhập để xem lịch nhắc nhở những người thân yêu của bạn
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-6 sm:px-10 rounded-3xl border border-border shadow-2xl space-y-6">
          {/* Nút đăng nhập Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-border hover:bg-secondary text-foreground text-xs font-bold transition-all shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Đăng nhập bằng tài khoản Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative px-3 bg-card text-[11px] font-semibold text-muted-foreground uppercase">
              Hoặc với tên tài khoản / email
            </span>
          </div>

          {/* Form Đăng nhập bằng Tên tài khoản hoặc Email */}
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            {/* Decoy hidden inputs ngăn chặn Chrome tự động inject thông tin cũ */}
            <input type="text" name="fakeusernameremembered" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
            <input type="password" name="fakepasswordremembered" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Tên tài khoản hoặc Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                <input
                  type="text"
                  name="login_username"
                  id="login_username"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, tên tài khoản hoặc email..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:ring-2 focus:ring-primary font-medium text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="login_password"
                  id="login_password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:ring-2 focus:ring-primary font-medium text-foreground placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Tùy chọn Ghi nhớ tài khoản & Quên mật khẩu */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer transition-all"
                />
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  Ghi nhớ tài khoản
                </span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl gradient-brand text-white font-bold text-sm shadow-soft hover:shadow-soft-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-1">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline">
              Đăng ký miễn phí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
