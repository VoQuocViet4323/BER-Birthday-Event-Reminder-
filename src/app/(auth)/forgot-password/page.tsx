"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Vui lòng nhập địa chỉ email",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

    if (isConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setIsLoading(false);
        toast({
          title: "Không thể gửi email đặt lại mật khẩu",
          description: error.message,
          variant: "error",
        });
        return;
      }
    }

    setIsLoading(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl shadow-glow">
            🎂
          </div>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Quên mật khẩu?
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          Đừng lo lắng, chúng tôi sẽ gửi hướng dẫn khôi phục mật khẩu vào email của bạn.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-6 sm:px-10 rounded-3xl border border-border shadow-2xl space-y-6">
          {isSubmitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-foreground">Đã gửi liên kết khôi phục!</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vui lòng kiểm tra hộp thư đến của <strong>{email}</strong> và làm theo hướng dẫn trong email để đặt mật khẩu mới.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline mt-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại trang Đăng nhập</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Địa chỉ Email tài khoản
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl gradient-brand text-white font-bold text-sm shadow-soft hover:shadow-soft-hover transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Gửi link đặt lại mật khẩu</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại đăng nhập</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
