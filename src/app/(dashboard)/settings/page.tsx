"use client";

import { useState, useEffect } from "react";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  Clock,
  Mail,
  User,
  Shield,
  Send,
  Eye,
  Plus,
  X,
  Check,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { settings, profile, updateSettings, isUpdating } = useUserSettings();
  const { toast } = useToast();
  const supabase = createClient();

  // Local state form values
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [emailEnabled, setEmailEnabled] = useState(settings?.email_enabled ?? true);
  const [remindDays, setRemindDays] = useState<number[]>(settings?.default_remind_days || [7, 3, 1, 0]);
  const [customDayInput, setCustomDayInput] = useState("");
  const [remindTime, setRemindTime] = useState(settings?.remind_time || "08:00");
  const [timezone, setTimezone] = useState(profile?.timezone || "Asia/Ho_Chi_Minh");
  const [leapDayRule, setLeapDayRule] = useState<"feb28" | "mar01">(settings?.leap_day_rule || "feb28");
  const [extraEmails, setExtraEmails] = useState<string[]>(settings?.extra_emails || []);
  const [newExtraEmail, setNewExtraEmail] = useState("");

  // Đồng bộ form khi profile hoặc settings nạp xong từ máy chủ
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
    if (profile?.timezone) {
      setTimezone(profile.timezone);
    }
    if (settings) {
      setEmailEnabled(settings.email_enabled ?? true);
      setRemindDays(settings.default_remind_days || [7, 3, 1, 0]);
      setRemindTime(settings.remind_time || "08:00");
      setLeapDayRule(settings.leap_day_rule || "feb28");
      setExtraEmails(settings.extra_emails || []);
    }
  }, [profile, settings]);

  // Email test & preview modal states
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
      } catch {}

      // 3. Đăng xuất phiên làm việc hiện tại
      try {
        await supabase.auth.signOut();
      } catch {}

      toast({
        title: "Tài khoản đã được xóa vĩnh viễn",
        description: "Toàn bộ tài khoản và dữ liệu đã được xóa hoàn toàn khỏi cơ sở dữ liệu.",
        variant: "success",
      });

      setShowDeleteConfirm(false);
      // 4. Điều hướng về trang đăng nhập
      window.location.href = "/login";
    } catch (err: any) {
      toast({
        title: "Lỗi không xác định",
        description: err?.message || "Đã xảy ra sự cố khi thực hiện xóa tài khoản.",
        variant: "error",
      });
      setIsDeletingAccount(false);
    }
  };

  // Mốc nhắc nhanh
  const quickOffsets = [14, 7, 3, 1, 0];

  const toggleOffset = (offset: number) => {
    if (remindDays.includes(offset)) {
      setRemindDays(remindDays.filter((d) => d !== offset));
    } else {
      setRemindDays([...remindDays, offset].sort((a, b) => b - a));
    }
  };

  const handleAddCustomDay = () => {
    const val = parseInt(customDayInput.trim(), 10);
    if (!isNaN(val) && val >= 0 && val <= 365 && !remindDays.includes(val)) {
      setRemindDays([...remindDays, val].sort((a, b) => b - a));
      setCustomDayInput("");
    }
  };

  const handleAddExtraEmail = () => {
    const email = newExtraEmail.trim();
    if (email && email.includes("@") && !extraEmails.includes(email)) {
      setExtraEmails([...extraEmails, email]);
      setNewExtraEmail("");
    }
  };

  const handleRemoveExtraEmail = (email: string) => {
    setExtraEmails(extraEmails.filter((e) => e !== email));
  };

  const handleSaveAll = async () => {
    await updateSettings({
      display_name: displayName,
      email_enabled: emailEnabled,
      default_remind_days: remindDays,
      remind_time: remindTime,
      timezone: timezone,
      leap_day_rule: leapDayRule,
      extra_emails: extraEmails,
    });
  };

  const handleSendTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: extraEmails[0] }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Đã kích hoạt gửi thử nghiệm!",
          description: data.message,
          variant: "success",
        });
      } else {
        toast({
          title: "Không thể gửi email thử",
          description: data.error,
          variant: "error",
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
            Quản lý thông báo email, giờ gửi, múi giờ và cấu hình tài khoản
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
        {/* 1. Thông báo Email */}
        <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 sm:p-7 shadow-xs hover:border-border transition-all space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-transparent border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-xs">
                <Bell className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Thông báo Email</h3>
                <p className="text-xs text-muted-foreground">Tự động gửi email khi đến mốc</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Mốc nhắc nhở mặc định */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
              Mốc nhắc trước mặc định (ngày)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {quickOffsets.map((offset) => {
                const active = remindDays.includes(offset);
                return (
                  <button
                    key={offset}
                    onClick={() => toggleOffset(offset)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5",
                      active
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-soft"
                        : "bg-secondary/60 text-muted-foreground border-border/70 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {active && <Check className="w-3 h-3 stroke-[2.5]" />}
                    {offset === 0 ? "Đúng ngày (0)" : `Trước ${offset} ngày`}
                  </button>
                );
              })}
            </div>

            {/* Nhập số ngày tùy ý */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={365}
                value={customDayInput}
                onChange={(e) => setCustomDayInput(e.target.value)}
                placeholder="Nhập số ngày tùy ý (VD: 5, 10, 30)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
              <button
                type="button"
                onClick={handleAddCustomDay}
                className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-muted border border-border/70 text-xs font-bold transition-colors"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* Giờ gửi email hàng ngày & Múi giờ */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/60">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Giờ gửi email
              </label>
              <input
                type="time"
                value={remindTime}
                onChange={(e) => setRemindTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-secondary/40 border border-border/70 text-xs font-bold text-center text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                Múi giờ
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-secondary/40 border border-border/70 text-xs font-bold text-foreground"
              >
                <option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</option>
                <option value="Asia/Tokyo">Nhật Bản (GMT+9)</option>
                <option value="America/New_York">New York (EST)</option>
                <option value="Europe/London">London (GMT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Email phụ & Thử nghiệm */}
        <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 sm:p-7 shadow-xs hover:border-border transition-all space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500/15 via-pink-500/10 to-transparent border border-pink-500/20 text-pink-400 flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Email nhận thông báo</h3>
              <p className="text-xs text-muted-foreground">Nhận tại email tài khoản & email phụ</p>
            </div>
          </div>

          {/* Thêm email phụ */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Email nhận phụ (đồng thời)
            </label>
            <div className="flex items-center gap-2 mb-2.5">
              <input
                type="email"
                value={newExtraEmail}
                onChange={(e) => setNewExtraEmail(e.target.value)}
                placeholder="them.email@gmail.com..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
              <button
                type="button"
                onClick={handleAddExtraEmail}
                className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-muted border border-border/70 text-xs font-bold transition-colors"
              >
                + Thêm
              </button>
            </div>

            {/* Danh sách email phụ */}
            <div className="flex flex-wrap gap-1.5 min-h-[30px]">
              {extraEmails.length === 0 ? (
                <p className="text-xs text-muted-foreground/70 italic py-1">Chưa có email phụ nào.</p>
              ) : (
                extraEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary text-xs text-foreground font-medium border border-border/70 shadow-xs"
                  >
                    <span>{email}</span>
                    <button
                      onClick={() => handleRemoveExtraEmail(email)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Xem trước & Thử gửi email */}
          <div className="pt-4 border-t border-border/60 flex items-center gap-2.5">
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
              <p className="text-xs text-muted-foreground">Tên hiển thị trên thư thông báo</p>
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

      {/* Modal Xem trước Email */}
      <AnimatePresence>
        {showEmailPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm text-foreground">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl p-6 overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-bold text-sm">Xem trước mẫu email gửi tới bạn</h3>
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border text-xs space-y-4">
                <div className="p-4 rounded-2xl gradient-brand text-white text-center">
                  <span className="text-2xl">🎂✨</span>
                  <h4 className="font-extrabold text-base mt-1">Nhắc Nhở Sự Kiện Quan Trọng</h4>
                  <p className="text-[11px] opacity-90">Hôm nay có sự kiện đặc biệt!</p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border space-y-1 shadow-xs">
                  <span className="text-[10px] font-bold text-purple-600 uppercase">🎂 Sinh nhật</span>
                  <h5 className="font-bold text-sm text-foreground">Mẹ yêu (Tròn 58 tuổi)</h5>
                  <p className="text-muted-foreground text-[11px]">📅 25 tháng 10 • Nhóm: Gia đình</p>
                  <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-[11px] text-muted-foreground">
                    📝 <strong>Ghi chú:</strong> Mẹ thích hoa lan hồ điệp tím
                  </div>
                </div>

                <div className="text-center pt-2">
                  <span className="inline-block px-5 py-2 rounded-full gradient-brand text-white font-bold text-xs shadow-xs">
                    Mở Ứng Dụng Xem Chi Tiết →
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowEmailPreview(false)}
                className="w-full py-2.5 rounded-xl border border-border hover:bg-secondary font-bold text-xs"
              >
                Đóng xem trước
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Xác nhận Xóa tài khoản */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-card rounded-3xl border border-rose-500/30 shadow-2xl p-6 text-center space-y-4"
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
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
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
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
