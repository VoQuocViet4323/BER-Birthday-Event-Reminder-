"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Mật khẩu quá ngắn",
        description: "Mật khẩu mới phải có tối thiểu 6 ký tự.",
        variant: "error",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Mật khẩu không khớp",
        description: "Vui lòng nhập lại chính xác mật khẩu mới.",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

    if (isConfigured) {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setIsLoading(false);
        toast({
          title: "Không thể đổi mật khẩu",
          description: error.message,
          variant: "error",
        });
        return;
      }
    }

    setIsLoading(false);
    toast({
      title: "Đã cập nhật mật khẩu mới thành công! 🎉",
      description: "Bạn có thể tiếp tục sử dụng ứng dụng.",
      variant: "success",
    });

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl shadow-glow mx-auto mb-6">
          🔒
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Thiết lập mật khẩu mới
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          Vui lòng nhập mật khẩu mới để bảo mật tài khoản của bạn
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-6 sm:px-10 rounded-3xl border border-border shadow-2xl space-y-5">
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:ring-2 focus:ring-primary font-medium"
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
                Nhập lại mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:ring-2 focus:ring-primary font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl gradient-brand text-white font-bold text-sm shadow-soft hover:shadow-soft-hover transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Xác nhận đổi mật khẩu</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
