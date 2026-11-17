"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { generateReminderEmailHtml, ReminderItem } from "@/lib/email/template-builder";
import { uploadAvatarWithFallback, PRESET_AVATARS } from "@/lib/image-utils";
import { useTheme } from "@/components/providers/theme-provider";
import {
  Mail,
  User,
  Shield,
  Send,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  X,
  Check,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Globe,
  Edit2,
  Maximize2,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { settings, profile, updateSettings, isUpdating } = useUserSettings();
  const { toast } = useToast();
  const supabase = createClient();

  // Local state form values
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [remindDays, setRemindDays] = useState<number[]>(settings?.default_remind_days || [7, 3, 1, 0]);
  const [remindTime, setRemindTime] = useState(settings?.remind_time || "08:00");
  const [timezone, setTimezone] = useState(profile?.timezone || "Asia/Ho_Chi_Minh");
  const [leapDayRule, setLeapDayRule] = useState<"feb28" | "mar01">(settings?.leap_day_rule || "feb28");

  // Client-side mounted state for portals
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Primary email editing states
  const [isEditingPrimaryEmail, setIsEditingPrimaryEmail] = useState(false);
  const [newPrimaryEmail, setNewPrimaryEmail] = useState(profile?.email || "");
  const [isUpdatingPrimaryEmail, setIsUpdatingPrimaryEmail] = useState(false);

  // Password change states
  const [isChangingPasswordOpen, setIsChangingPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Đồng bộ form khi profile hoặc settings nạp xong từ máy chủ
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
    if (profile?.timezone) {
      setTimezone(profile.timezone);
    }
    if (profile) {
      setAvatarUrl(profile.avatar_url || null);
    }
    if (settings) {
      setRemindDays(settings.default_remind_days || [7, 3, 1, 0]);
      setRemindTime(settings.remind_time || "08:00");
      setLeapDayRule(settings.leap_day_rule || "feb28");
    }
  }, [profile, settings]);

  // Email test & preview modal states
  const { resolvedTheme } = useTheme();
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("dark");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Đồng bộ theme xem trước với theme hiện tại khi mở modal
  useEffect(() => {
    if (showEmailPreview && resolvedTheme) {
      setPreviewTheme(resolvedTheme);
    }
  }, [showEmailPreview, resolvedTheme]);

  // Tạo mẫu HTML xem trước ở chế độ CHỈ XEM (Vô hiệu hóa mọi tương tác, click, link)
  const emailPreviewHtml = useMemo(() => {
    const sampleItems: ReminderItem[] = [
      {
        id: "sample-birthday",
        name: "Mẹ yêu (Sinh nhật)",
        eventType: "birthday",
        eventDateFormatted: "26 tháng 10",
        daysRemaining: 0,
        upcomingAge: 58,
        groupName: "Gia đình",
        isLunar: false,
        note: "Mẹ thích hoa lan hồ điệp tím và trà sen",
        giftIdea: "Khăn lụa tơ tằm & bánh kem",
      },
      {
        id: "sample-friend",
        name: "Minh Khuê",
        eventType: "birthday",
        eventDateFormatted: "28 tháng 10",
        daysRemaining: 2,
        upcomingAge: 25,
        groupName: "Bạn bè",
        isLunar: false,
        note: "Hẹn ăn tối liên hoan lúc 19:00",
        giftIdea: "Sách & son môi",
      },
    ];

    const rawHtml = generateReminderEmailHtml({
      userName: profile?.display_name || "Bạn",
      items: sampleItems,
      appUrl: "https://ber-birthday-event-reminder.vercel.app",
      unsubscribeUrl: "https://ber-birthday-event-reminder.vercel.app/settings",
      theme: previewTheme,
    });

    // Chế độ CHỈ XEM (View-Only): Khóa toàn bộ liên kết, con trỏ chuột, ngăn chặn click hoặc chuyển trang
    const readOnlyStyles = `
      <style>
        *, *::before, *::after {
          cursor: default !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -webkit-user-drag: none !important;
        }
        a, button, input, [role="button"], [onclick] {
          pointer-events: none !important;
          cursor: default !important;
          text-decoration: none !important;
        }
      </style>
    `;

    return rawHtml
      .replace("</head>", `${readOnlyStyles}</head>`)
      .replace(/<a\s+href="[^"]*"/gi, '<a href="javascript:void(0)" tabindex="-1" onclick="return false;"');
  }, [profile?.display_name, previewTheme]);

  // Xóa tài khoản vĩnh viễn khỏi Database
  const handleDeleteAccount = async () => {
    if (profile?.role === "admin" || profile?.username === "admin") {
      toast({
        title: "Thao tác bị từ chối",
        description: "Tài khoản Quản trị viên tối cao (admin) được bảo vệ và không thể xóa!",
        variant: "error",
      });
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeletingAccount(true);
    try {
      // 1. Gọi RPC xóa vĩnh viễn khỏi Database (auth.users, profiles, events...)
      const { data, error } = await (supabase as any).rpc("delete_own_account");

      if (error) {
        const isMissingFunction =
          error.message?.includes("delete_own_account") || error.code === "PGRST202";
        toast({
          title: isMissingFunction ? "Chưa kích hoạt hàm trên Database" : "Lỗi xóa tài khoản",
          description: isMissingFunction
            ? "Bạn cần chạy đoạn SQL Migration 006 trong Supabase SQL Editor để kích hoạt tính năng xóa tài khoản!"
            : (error.message || "Không thể xóa tài khoản. Vui lòng kiểm tra lại Supabase."),
          variant: "error",
        });
        setIsDeletingAccount(false);
        return;
      }

      if (data && data.success === false) {
        toast({
          title: "Không thể xóa tài khoản",
          description: data.message || "Thao tác không được phép.",
          variant: "error",
        });
        setIsDeletingAccount(false);
        return;
      }

      // 2. Dọn sạch thông tin ghi nhớ đăng nhập và bộ nhớ đệm
      try {
        localStorage.removeItem("ber_remembered_username");
        localStorage.removeItem("ber_remembered_password");
        localStorage.removeItem("ber_remember_me");
        sessionStorage.clear();
      } catch { }

      // 3. Đăng xuất phiên làm việc hiện tại
      try {
        await supabase.auth.signOut();
      } catch { }

      toast({
        title: "Tài khoản đã được xóa vĩnh viễn",
        description: "Toàn bộ tài khoản và dữ liệu đã được xóa hoàn toàn khỏi cơ sở dữ liệu.",
        variant: "success",
      });

      setShowDeleteConfirm(false);
      // 4. Điều hướng về trang giới thiệu chủ đạo
      window.location.href = "/";
    } catch (err: any) {
      toast({
        title: "Lỗi không xác định",
        description: err?.message || "Đã xảy ra sự cố khi thực hiện xóa tài khoản.",
        variant: "error",
      });
      setIsDeletingAccount(false);
    }
  };



  // Cập nhật địa chỉ email nhận thông báo chính của tài khoản
  const handleUpdatePrimaryEmail = async () => {
    const clean = newPrimaryEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clean || !emailRegex.test(clean)) {
      toast({
        title: "Email không hợp lệ",
        description: "Vui lòng nhập đúng định dạng email (ví dụ: vidu@gmail.com).",
        variant: "error",
      });
      return;
    }

    setIsUpdatingPrimaryEmail(true);
    try {
      // 1. Thử gọi RPC update_user_email cập nhật trực tiếp trên DB
      const { data, error } = await (supabase as any).rpc("update_user_email", {
        p_new_email: clean,
      });

      if (!error && data?.success) {
        toast({
          title: "Cập nhật email thành công! 🎉",
          description: `Email nhận thông báo đã được đổi thành: ${clean}`,
          variant: "success",
        });
        setIsEditingPrimaryEmail(false);
        queryClient.invalidateQueries({ queryKey: ["user-settings-and-profile"] });
        setIsUpdatingPrimaryEmail(false);
        return;
      }

      // 2. Fallback qua Supabase Auth updateUser
      const { error: authErr } = await supabase.auth.updateUser({ email: clean });
      if (authErr) {
        toast({
          title: "Không thể đổi email",
          description: authErr.message || "Vui lòng thử lại sau.",
          variant: "error",
        });
        setIsUpdatingPrimaryEmail(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await (supabase as any)
          .from("profiles")
          .update({ email: clean })
          .eq("id", session.user.id);
      }

      toast({
        title: "Đã cập nhật email chính",
        description: `Email nhận thông báo mới: ${clean}`,
        variant: "success",
      });
      setIsEditingPrimaryEmail(false);
      queryClient.invalidateQueries({ queryKey: ["user-settings-and-profile"] });
    } catch (err: any) {
      toast({
        title: "Lỗi cập nhật",
        description: err?.message || "Đã xảy ra lỗi khi cập nhật email.",
        variant: "error",
      });
    } finally {
      setIsUpdatingPrimaryEmail(false);
    }
  };

  // Tải ảnh đại diện mới từ thiết bị
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast({
        title: "Ảnh quá lớn",
        description: "Vui lòng chọn tệp ảnh có dung lượng dưới 30MB.",
        variant: "error",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id || profile?.id || "user";

      // Nén ảnh vuông tối ưu và tải lên với cơ chế Fallback chống lỗi tuyệt đối
      const uploadedUrl = await uploadAvatarWithFallback(supabase, userId, file);

      setAvatarUrl(uploadedUrl);

      // Cập nhật profile & đồng bộ toàn ứng dụng
      await updateSettings({
        avatar_url: uploadedUrl,
      });

      toast({
        title: "Cập nhật ảnh đại diện thành công! 🎉",
        description: "Ảnh mới đã được đồng bộ trên thanh tiêu đề và hồ sơ của bạn.",
        variant: "success",
      });
    } catch (err: any) {
      console.error("Lỗi cập nhật ảnh đại diện:", err);
      toast({
        title: "Không thể tải ảnh lên",
        description: err?.message || "Đã xảy ra sự cố khi tải ảnh lên. Vui lòng thử lại.",
        variant: "error",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Chọn avatar mẫu preset
  const handleSelectPresetAvatar = async (preset: { emoji: string; bg: string }) => {
    try {
      setIsUploadingAvatar(true);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8B5CF6"/><stop offset="50%" stop-color="#EC4899"/><stop offset="100%" stop-color="#F43F5E"/></linearGradient></defs><rect width="200" height="200" rx="60" fill="url(#g)"/><text x="50%" y="54%" font-size="95" text-anchor="middle" dominant-baseline="middle">${preset.emoji}</text></svg>`;
      const encodedSvg = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

      setAvatarUrl(encodedSvg);
      setShowPresetModal(false);

      await updateSettings({
        avatar_url: encodedSvg,
      });

      toast({
        title: "Đã chọn ảnh đại diện mẫu! ✨",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Không thể đổi avatar",
        description: err?.message,
        variant: "error",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Gỡ bỏ ảnh đại diện về mặc định
  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true);
      setAvatarUrl(null);
      await updateSettings({
        avatar_url: null,
      });
      toast({
        title: "Đã gỡ ảnh đại diện",
        description: "Hệ thống sẽ dùng chữ cái đầu tiên làm đại diện mặc định.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Lỗi gỡ ảnh đại diện",
        description: err?.message,
        variant: "error",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveAll = async () => {
    await updateSettings({
      display_name: displayName,
      avatar_url: avatarUrl,
      email_enabled: true,
      default_remind_days: remindDays,
      remind_time: remindTime,
      timezone: timezone,
      leap_day_rule: leapDayRule,
    });
  };

  // Đổi mật khẩu tài khoản - Bắt buộc xác thực mật khẩu cũ
  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!oldPassword.trim()) {
      toast({
        title: "Thiếu mật khẩu cũ",
        description: "Vui lòng nhập mật khẩu hiện tại của tài khoản.",
        variant: "error",
      });
      return;
    }

    if (!newPassword) {
      toast({
        title: "Thiếu mật khẩu mới",
        description: "Vui lòng nhập mật khẩu mới muốn thay đổi.",
        variant: "error",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Mật khẩu quá ngắn",
        description: "Mật khẩu mới phải có ít nhất 6 ký tự.",
        variant: "error",
      });
      return;
    }

    if (newPassword === oldPassword) {
      toast({
        title: "Mật khẩu không đổi",
        description: "Mật khẩu mới không được trùng với mật khẩu hiện tại.",
        variant: "warning",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Mật khẩu không khớp",
        description: "Xác nhận mật khẩu mới không trùng khớp. Vui lòng kiểm tra lại.",
        variant: "error",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authEmail = session?.user?.email || profile?.email;

      if (!authEmail) {
        toast({
          title: "Phiên đăng nhập hết hạn",
          description: "Vui lòng tải lại trang hoặc đăng nhập lại để tiếp tục.",
          variant: "error",
        });
        setIsUpdatingPassword(false);
        return;
      }

      // Xác thực mật khẩu cũ bằng cách thử đăng nhập lại với email phiên hiện tại
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: oldPassword,
      });

      if (verifyErr) {
        toast({
          title: "Mật khẩu cũ không chính xác",
          description: "Mật khẩu hiện tại bạn vừa nhập không đúng. Vui lòng kiểm tra lại!",
          variant: "error",
        });
        setIsUpdatingPassword(false);
        return;
      }

      // Mật khẩu cũ chính xác -> Cập nhật sang mật khẩu mới
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        toast({
          title: "Đổi mật khẩu thất bại",
          description: updateErr.message || "Đã xảy ra sự cố khi cập nhật mật khẩu mới.",
          variant: "error",
        });
        setIsUpdatingPassword(false);
        return;
      }

      // Cập nhật lại mật khẩu đã lưu trong trình duyệt nếu người dùng bật "Ghi nhớ"
      try {
        if (localStorage.getItem("ber_remember_me") === "true") {
          localStorage.setItem("ber_remembered_password", newPassword);
        }
      } catch { }

      toast({
        title: "Đổi mật khẩu thành công! 🔐",
        description: "Mật khẩu tài khoản của bạn đã được cập nhật thành công.",
        variant: "success",
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPasswordOpen(false);
    } catch (err: any) {
      toast({
        title: "Lỗi hệ thống",
        description: err?.message || "Đã xảy ra sự cố trong quá trình đổi mật khẩu.",
        variant: "error",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendTestEmail = async () => {
    const activeEmail = profile?.email;
    if (!activeEmail || activeEmail.includes("@ber-app.com")) {
      toast({
        title: "Chưa cấu hình Email nhận thực tế",
        description: "Tài khoản của bạn chưa có email thực tế (đang dùng đuôi tạm thời @ber-app.com). Hãy bấm 'Đổi email' ở mục Email tài khoản chính để cập nhật Gmail của bạn trước khi thử!",
        variant: "error",
        duration: 7000,
      });
      return;
    }

    setIsTestingEmail(true);
    try {
      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.simulated) {
          toast({
            title: "Chế độ mô phỏng (Chưa gửi mail thật) ⚠️",
            description: "Chưa cấu hình thông tin gửi thư (Gmail SMTP hoặc Resend) trong file .env. Hãy cấu hình SMTP_USER và SMTP_PASS để gửi thật!",
            variant: "warning",
            duration: 8000,
          });
        } else {
          toast({
            title: "Đã gửi email thử nghiệm! 🚀",
            description: data.message || `Đã gửi email thử nghiệm đến ${activeEmail}. Hãy kiểm tra hộp thư đến (hoặc hòm Spam/Thư rác)!`,
            variant: "success",
            duration: 6000,
          });
        }
      } else {
        toast({
          title: "Không thể gửi email thử",
          description: data.error,
          variant: "error",
          duration: 7000,
        });
      }
    } catch {
      toast({
        title: "Lỗi kết nối máy chủ",
        variant: "error",
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Cài đặt & Hồ sơ
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Quản lý email nhận thông báo, đổi mật khẩu, quy tắc năm nhuận và cấu hình tài khoản
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isUpdating}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {isUpdating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Lưu thay đổi</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Email nhận thông báo & Thử nghiệm */}
        <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 sm:p-7 shadow-xs hover:border-border transition-all space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500/15 via-pink-500/10 to-transparent border border-pink-500/20 text-pink-400 flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Email nhận thông báo</h3>
              <p className="text-xs text-muted-foreground">Địa chỉ nhận thông báo nhắc hẹn sự kiện</p>
            </div>
          </div>

          {/* Email chính của tài khoản */}
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Email tài khoản chính
              </span>
              {profile?.provider === "google" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Globe className="w-3 h-3" />
                  Tài khoản Google
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Mail className="w-3 h-3" />
                  Email đăng ký
                </span>
              )}
            </div>

            {isEditingPrimaryEmail ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={newPrimaryEmail}
                    onChange={(e) => setNewPrimaryEmail(e.target.value)}
                    placeholder="vidu@gmail.com..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-primary/50 text-xs text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    disabled={isUpdatingPrimaryEmail}
                    onClick={handleUpdatePrimaryEmail}
                    className="px-3.5 py-2 rounded-xl gradient-brand text-white text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isUpdatingPrimaryEmail ? "Lưu..." : "Lưu"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPrimaryEmail(false);
                      setNewPrimaryEmail(profile?.email || "");
                    }}
                    className="px-3 py-2 rounded-xl bg-secondary hover:bg-muted text-xs font-semibold text-muted-foreground"
                  >
                    Hủy
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cập nhật email thực tế của bạn (Gmail, Outlook...) để nhận email thông báo nhắc hẹn.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {profile?.email || "Chưa có email tài khoản"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {profile?.provider === "google"
                      ? "Hệ thống tự động liên kết tài khoản Google và gửi nhắc hẹn về email này."
                      : profile?.email?.includes("@ber-app.com")
                        ? "⚠️ Đang dùng email tạm thời (@ber-app.com). Hãy bấm 'Đổi email' để nhập Gmail thật của bạn!"
                        : "Email chính dùng để nhận toàn bộ thông báo nhắc nhở sự kiện và thông báo hệ thống."}
                  </p>
                </div>
                {profile?.provider !== "google" && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewPrimaryEmail(profile?.email || "");
                      setIsEditingPrimaryEmail(true);
                    }}
                    className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-muted border border-border/80 text-xs font-bold text-foreground transition-all hover:scale-[1.02]"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-primary" />
                    <span>Đổi email</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Xem trước & Thử gửi email */}
          <div className="pt-4 border-t border-border/60 space-y-2">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowEmailPreview(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-border/80 hover:bg-secondary/70 text-xs font-semibold text-foreground transition-all shadow-xs"
              >
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span>Xem trước mẫu</span>
              </button>

              <button
                type="button"
                disabled={isTestingEmail}
                onClick={handleSendTestEmail}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                {isTestingEmail ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi email thử</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/75 text-center leading-relaxed">
              💡 Để gửi thư thật đến bất kỳ email nào mà không cần tên miền riêng, bạn chỉ cần điền <code className="bg-secondary/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-primary font-semibold">SMTP_USER</code> & <code className="bg-secondary/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-primary font-semibold">SMTP_PASS</code> (Mật khẩu ứng dụng Gmail) vào file <code className="bg-secondary/80 px-1.5 py-0.5 rounded text-[10px] font-mono">.env</code>.
            </p>
          </div>
        </div>

        {/* 2. Bảo mật & Đổi mật khẩu */}
        <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 sm:p-7 shadow-xs hover:border-border transition-all space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Bảo mật & Đổi mật khẩu</h3>
              <p className="text-xs text-muted-foreground">Đổi mật khẩu bảo vệ tài khoản</p>
            </div>
          </div>

          {profile?.provider === "google" ? (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <p className="text-xs font-bold text-foreground">Tài khoản Google</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tài khoản của bạn được liên kết với Google và không sử dụng mật khẩu riêng. Bạn có thể quản lý bảo mật trực tiếp trên tài khoản Google.
              </p>
            </div>
          ) : !isChangingPasswordOpen ? (
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Mật khẩu tài khoản</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Đang hoạt động
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Để bảo vệ an toàn cho tài khoản, hệ thống yêu cầu bạn nhập chính xác mật khẩu hiện tại trước khi thiết lập mật khẩu mới.
              </p>
              <button
                type="button"
                onClick={() => setIsChangingPasswordOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Đổi mật khẩu mới</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              {/* Mật khẩu cũ */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Mật khẩu hiện tại (cũ) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu đang dùng..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-secondary/40 border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {showOldPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Mật khẩu mới (tối thiểu 6 ký tự) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-secondary/40 border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-secondary/40 border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {isUpdatingPassword ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Xác nhận đổi</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isUpdatingPassword}
                  onClick={() => {
                    setIsChangingPasswordOpen(false);
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-muted text-xs font-bold text-muted-foreground transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 3. Quy tắc 29/02 (Năm nhuận) */}
        <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 sm:p-7 shadow-xs hover:border-border transition-all space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Quy tắc sinh nhật 29/02</h3>
              <p className="text-xs text-muted-foreground">Xử lý trong các năm không có ngày 29/2</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              {
                id: "feb28",
                title: "Nhắc vào ngày 28 tháng 2 (Mặc định)",
                desc: "Thích hợp theo phong tục chúc mừng trước khi hết tháng",
              },
              {
                id: "mar01",
                title: "Nhắc vào ngày 01 tháng 3",
                desc: "Đúng theo chu kỳ ngày thứ 60 trong năm",
              },
            ].map((rule) => (
              <label
                key={rule.id}
                className={cn(
                  "flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all",
                  leapDayRule === rule.id
                    ? "border-primary/60 bg-gradient-to-r from-primary/10 to-transparent shadow-xs ring-1 ring-primary/30"
                    : "border-border/60 hover:bg-secondary/40"
                )}
              >
                <input
                  type="radio"
                  name="leapDay"
                  checked={leapDayRule === rule.id}
                  onChange={() => setLeapDayRule(rule.id as any)}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">{rule.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{rule.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 4. Hồ sơ & Tài khoản */}
        <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 sm:p-7 shadow-xs hover:border-border transition-all space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/15 via-blue-500/10 to-transparent border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-xs">
              <User className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Hồ sơ người dùng</h3>
              <p className="text-xs text-muted-foreground">Ảnh đại diện & Tên hiển thị tài khoản</p>
            </div>
          </div>

          {/* Phần Thay đổi ảnh đại diện */}
          <div className="p-4 sm:p-5 rounded-2xl bg-secondary/30 border border-border/60 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Ảnh đại diện
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
              {/* Avatar Preview Box (Bấm vào để xem ảnh phóng to) */}
              <div className="relative group shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAvatarLightbox(true)}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl gradient-brand p-0.5 shadow-soft overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all group-hover:shadow-soft-hover touch-manipulation focus:outline-hidden"
                  title="Bấm vào để xem ảnh phóng to"
                  aria-label="Xem ảnh đại diện phóng to"
                >
                  <div className="w-full h-full rounded-[14px] sm:rounded-[22px] bg-card flex items-center justify-center overflow-hidden relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName || "Avatar"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full gradient-brand text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center">
                        {(displayName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Overlay kính lúp khi hover */}
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white backdrop-blur-[1px]">
                      <Maximize2 className="w-5 h-5 drop-shadow-md" />
                      <span className="text-[9px] font-bold mt-0.5 tracking-tight">Phóng to</span>
                    </div>
                  </div>
                </button>

                {/* Loading indicator */}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10 pointer-events-none">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
                    <span className="text-[10px] font-bold">Đang nén...</span>
                  </div>
                )}
              </div>

              {/* Action Buttons & Guidance */}
              <div className="flex-1 text-center sm:text-left space-y-2.5 w-full">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{avatarUrl ? "Đổi ảnh mới" : "Tải ảnh lên"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={() => setShowPresetModal(true)}
                    className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Avatar mẫu</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={handleRemoveAvatar}
                      className="px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer touch-manipulation"
                      title="Gỡ ảnh đại diện"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Gỡ ảnh</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  💡 Hỗ trợ JPG, PNG, WebP (tối đa 30MB). Ảnh được tự động nén siêu nhẹ và crop vuông tối ưu cho cả PC và điện thoại.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Tên hiển thị
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/40 border border-border/70 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>

          <div className="pt-4 border-t border-border/60">
            {profile?.role === "admin" || profile?.username === "admin" ? (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-500">
                <Shield className="w-5 h-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-bold text-xs text-foreground">Tài khoản Quản trị viên tối cao (admin)</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Tài khoản được bảo vệ vĩnh viễn và không thể xóa trên hệ thống để duy trì quyền điều hành.
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Xóa tài khoản vĩnh viễn</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Xem trước Email thực tế chuẩn Gmail / Mobile */}
      {mounted && createPortal(
        <AnimatePresence>
          {showEmailPreview && (
            <motion.div
              key="email-preview-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowEmailPreview(false);
              }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-[4px] text-foreground"
            >
              <motion.div
                key="email-preview-card"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="w-full max-w-xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header thanh điều hướng Modal */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border bg-card/95">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl gradient-brand text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                      ✉️
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-foreground">Xem trước mẫu email thông báo</h3>
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-semibold border border-border">
                          Chỉ xem
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">Mẫu email tĩnh xem trước • Không thể tương tác</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Bộ chuyển đổi giao diện Sáng / Tối */}
                    <div className="flex items-center p-0.5 rounded-xl bg-secondary/80 border border-border/60">
                      <button
                        type="button"
                        onClick={() => setPreviewTheme("light")}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                          previewTheme === "light"
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Xem chế độ nền sáng"
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden sm:inline">Sáng</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTheme("dark")}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                          previewTheme === "dark"
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Xem chế độ nền tối"
                      >
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Tối</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowEmailPreview(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                      aria-label="Đóng"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Khung mô phỏng hiển thị Email (Hỗ trợ cả chế độ Sáng & Tối sắc nét) */}
                <div
                  className={cn(
                    "flex-1 overflow-hidden p-2 sm:p-4 flex items-center justify-center transition-colors",
                    previewTheme === "dark" ? "bg-slate-950" : "bg-slate-100"
                  )}
                >
                  <div
                    className={cn(
                      "w-full h-[460px] sm:h-[520px] rounded-2xl overflow-hidden border shadow-md select-none transition-all",
                      previewTheme === "dark"
                        ? "border-slate-800 bg-[#0b0b14]"
                        : "border-slate-200/90 bg-white"
                    )}
                  >
                    <iframe
                      key={previewTheme}
                      title="Xem trước mẫu email nhắc sự kiện BER (Chỉ xem)"
                      srcDoc={emailPreviewHtml}
                      className="w-full h-full border-0 select-none"
                    />
                  </div>
                </div>

                {/* Footer chế độ chỉ xem */}
                <div className="p-3.5 sm:p-4 border-t border-border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="w-4 h-4 text-primary" />
                    <span>Chế độ chỉ xem • Không tương tác</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview(false)}
                    className="py-2 px-5 rounded-xl border border-border hover:bg-secondary font-semibold text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Đóng xem trước
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal Xác nhận Xóa tài khoản */}
      {mounted && createPortal(
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              key="delete-confirm-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowDeleteConfirm(false);
              }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[4px]"
            >
              <motion.div
                key="delete-confirm-card"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="w-full max-w-sm bg-card rounded-3xl border border-rose-500/30 shadow-2xl p-6 text-center space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Xác nhận xóa tài khoản?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hành động này sẽ xóa toàn bộ sự kiện và cài đặt của bạn. Không thể hoàn tác sau khi thực hiện.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isDeletingAccount}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-secondary disabled:opacity-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingAccount}
                    onClick={handleDeleteAccount}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isDeletingAccount ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang xóa...</span>
                      </>
                    ) : (
                      <span>Xác nhận xóa</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal Chọn mẫu Avatar phong cách */}
      {mounted && createPortal(
        <AnimatePresence>
          {showPresetModal && (
            <motion.div
              key="preset-avatar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowPresetModal(false);
              }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[4px]"
            >
              <motion.div
                key="preset-avatar-card"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="w-full max-w-sm bg-card rounded-3xl border border-border shadow-2xl p-5 sm:p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm text-foreground">Chọn Avatar mẫu phong cách</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPresetModal(false)}
                    className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Chọn một biểu tượng vui nhộn bạn yêu thích để làm ảnh đại diện:
                </p>

                <div className="grid grid-cols-4 gap-2.5 py-1">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPresetAvatar(preset)}
                      className="group flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-secondary border border-border/60 hover:border-primary/50 transition-all cursor-pointer active:scale-95 touch-manipulation"
                    >
                      <div className={cn(
                        "w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl shadow-xs group-hover:scale-110 transition-transform",
                        preset.bg
                      )}>
                        <span>{preset.emoji}</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground truncate w-full text-center">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPresetModal(false)}
                    className="w-full py-2.5 rounded-xl bg-secondary hover:bg-muted text-xs font-bold text-muted-foreground transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal Phóng to Ảnh đại diện (Lightbox) */}
      {mounted && createPortal(
        <AnimatePresence>
          {showAvatarLightbox && (
            <motion.div
              key="avatar-lightbox-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowAvatarLightbox(false);
              }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            >
              <motion.div
                key="avatar-lightbox-card"
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 15 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="relative max-w-xs sm:max-w-md w-full flex flex-col items-center gap-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Nút đóng góc trên bên phải */}
                <button
                  type="button"
                  onClick={() => setShowAvatarLightbox(false)}
                  className="absolute -top-12 right-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
                  aria-label="Đóng xem ảnh"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Khung ảnh đại diện kích thước lớn */}
                <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-88 md:h-88 rounded-3xl gradient-brand p-1 shadow-2xl overflow-hidden flex items-center justify-center">
                  <div className="w-full h-full rounded-[22px] bg-card overflow-hidden flex items-center justify-center shadow-inner">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName || "Avatar"}
                        className="w-full h-full object-cover select-none"
                      />
                    ) : (
                      <div className="w-full h-full gradient-brand text-white font-extrabold text-7xl sm:text-8xl flex items-center justify-center select-none">
                        {(displayName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Thông tin & nút hành động */}
                <div className="text-center space-y-1 text-white">
                  <h4 className="text-base sm:text-lg font-bold drop-shadow-md">
                    {displayName || "Ảnh đại diện"}
                  </h4>
                  <p className="text-xs text-white/70">
                    {avatarUrl ? "Ảnh đại diện tài khoản" : "Chữ cái đại diện mặc định"}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {avatarUrl && (
                    <a
                      href={avatarUrl}
                      download={`avatar-${displayName || "user"}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải ảnh gốc</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAvatarLightbox(false)}
                    className="px-5 py-2 rounded-xl bg-white text-slate-900 hover:bg-white/90 text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
