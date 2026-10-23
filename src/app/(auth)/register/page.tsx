"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Đảm bảo form đăng ký hoàn toàn trống khi người dùng mở trang
  useEffect(() => {
    setFullName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim().toLowerCase();
    if (!fullName.trim() || !cleanUsername || !password) {
      toast({
        title: "Vui lòng nhập đầy đủ thông tin",
        description: "Điền họ tên, tên tài khoản và mật khẩu để tiếp tục.",
        variant: "error",
      });
      return;
    }

    if (cleanUsername.length < 3) {
      toast({
        title: "Tên tài khoản quá ngắn",
        description: "Tên tài khoản phải chứa ít nhất 3 ký tự.",
        variant: "error",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Mật khẩu quá ngắn",
        description: "Mật khẩu phải chứa ít nhất 6 ký tự.",
        variant: "error",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Mật khẩu xác nhận không khớp",
        description: "Vui lòng kiểm tra lại hai lần nhập mật khẩu.",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    const isSpecialAdmin = cleanUsername === "admin";
    if (isSpecialAdmin) {
      setIsLoading(false);
      toast({
        title: "Tài khoản Quản trị 'admin' đã có sẵn! 🛡️",
        description: "Tài khoản admin đã được tạo sẵn. Đang chuyển bạn sang trang Đăng nhập...",
        duration: 5000,
        variant: "success",
      });
      router.push("/login");
      return;
    }

    // 1. Thử đăng ký trực tiếp bằng RPC register_with_username (thuần username, không cần email, không rate-limit)
    try {
      const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc(
        "register_with_username",
        {
          p_username: cleanUsername,
          p_password: password,
          p_full_name: fullName.trim(),
        }
      );

      if (!rpcErr && rpcRes) {
        if (!rpcRes.success) {
          setIsLoading(false);
          toast({
            title: "Đăng ký không thành công",
            description: rpcRes.message || "Tên tài khoản không hợp lệ hoặc đã tồn tại.",
            variant: "error",
          });
          return;
        }

        // Tự động đăng nhập ngay sau khi đăng ký thành công
        const internalEmail = rpcRes.email || `${cleanUsername}@ber-app.com`;
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: internalEmail,
          password,
        });

        // Dọn dẹp cache profile cũ của trình duyệt
        if (typeof window !== "undefined") {
          localStorage.removeItem("ber-user-profile");
          localStorage.removeItem("ber-user-settings");
          localStorage.removeItem("ber-local-events");
        }

        setIsLoading(false);
        if (!loginErr) {
          toast({
            title: "Tạo tài khoản thành công! 🎉",
            description: "Chào mừng bạn gia nhập! Đang chuyển đến ứng dụng...",
            variant: "success",
          });
          window.location.href = "/onboarding";
          return;
        }

        toast({
          title: "Đăng ký thành công! 🎉",
          description: "Tài khoản đã sẵn sàng. Bạn hãy đăng nhập để tiếp tục.",
          variant: "success",
        });
        window.location.href = "/login";
        return;
      }
    } catch (e) {
      console.warn("RPC register_with_username chưa khả dụng, sử dụng fallback:", e);
    }

    // 2. Fallback qua Supabase Auth SignUp với domain chuẩn RFC
    const targetEmail = `${cleanUsername}@ber-app.com`;

    const { data, error } = await supabase.auth.signUp({
      email: targetEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: cleanUsername,
          role: "user",
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setIsLoading(false);
      const msg = error.message.toLowerCase();
      toast({
        title: "Đăng ký không thành công",
        description:
          msg.includes("rate limit")
            ? "Supabase đang giới hạn gửi email (3 email/giờ). Hãy chạy script migration 004 trong SQL Editor để đăng ký bằng tên tài khoản tự do không bao giờ bị giới hạn!"
            : msg.includes("already registered") ||
              msg.includes("already exists") ||
              msg.includes("database error finding user")
            ? "Tên tài khoản này đã tồn tại trên hệ thống. Vui lòng chọn tên khác hoặc bấm Đăng nhập."
            : error.message,
        duration: 8000,
        variant: "error",
      });
      return;
    }

    if (data?.session) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ber-user-profile");
        localStorage.removeItem("ber-user-settings");
        localStorage.removeItem("ber-local-events");
      }
      toast({
        title: "Đăng ký tài khoản thành công! 🎉",
        description: "Đang chuyển bạn đến ứng dụng...",
        variant: "success",
      });
      setIsLoading(false);
      window.location.href = "/onboarding";
      return;
    }

    toast({
      title: "Tạo tài khoản thành công! 🎉",
      description: "Tài khoản của bạn đã sẵn sàng! Đang chuyển đến trang đăng nhập...",
      duration: 5000,
      variant: "success",
    });

    setIsLoading(false);
    window.location.href = "/login";
  };

  const handleGoogleSignup = async () => {
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
          Tạo tài khoản mới
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          Bắt đầu ghi nhớ mọi ngày sinh nhật & sự kiện quan trọng
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-6 sm:px-10 rounded-3xl border border-border shadow-2xl space-y-5">
          {/* Nút đăng ký Google */}
          <button
            type="button"
            onClick={handleGoogleSignup}
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
            <span>Đăng ký nhanh bằng tài khoản Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative px-3 bg-card text-[11px] font-semibold text-muted-foreground uppercase">
              Hoặc đăng ký tên tài khoản
            </span>
          </div>

          <form onSubmit={handleRegister} autoComplete="off" className="space-y-4">
            {/* Chống tính năng autofill tự điền tài khoản cũ của trình duyệt */}
            <input type="text" name="fakeusernameremembered" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
            <input type="password" name="fakepasswordremembered" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Tên hiển thị của bạn
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  name="fullname_register"
                  id="fullname_register"
                  autoComplete="off"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:ring-2 focus:ring-primary font-medium text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Tên tài khoản tự đặt (Username)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                <input
                  type="text"
                  name="new_username_register"
                  id="new_username_register"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: nguyenvana, viet4323..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:ring-2 focus:ring-primary font-medium text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Mật khẩu (Tối thiểu 6 ký tự)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="new_password_register"
                  id="new_password_register"
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

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Nhập lại mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirm_password_register"
                  id="confirm_password_register"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:ring-2 focus:ring-primary font-medium text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl gradient-brand text-white font-bold text-sm shadow-soft hover:shadow-soft-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Đăng ký ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-1">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
