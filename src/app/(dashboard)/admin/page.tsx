"use client";

import { useState } from "react";
import { useAdmin, AdminEventWithMeta, AdminUserItem } from "@/hooks/use-admin";
import { useUserSettings } from "@/hooks/use-user-settings";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { EventFormValues } from "@/types/events";
import {
  ShieldCheck,
  Users,
  Calendar,
  Bell,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Mail,
  Clock,
  ChevronRight,
  Send,
  AlertTriangle,
  UserCheck,
  UserX,
  Lock,
  ExternalLink,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

export default function AdminPage() {
  const { profile } = useUserSettings();
  const { toast } = useToast();
  const {
    allEvents,
    allUsers,
    isLoading,
    refetchEvents,
    refetchUsers,
    updateEventAsAdmin,
    deleteEventAsAdmin,
    toggleEventAsAdmin,
    deleteUserAsAdmin,
    resetUserPasswordAsAdmin,
    isUpdating,
    stats,
  } = useAdmin();

  // Tabs
  const [activeTab, setActiveTab] = useState<"overview" | "events" | "users" | "system">("overview");

  // Bộ lọc & tìm kiếm sự kiện
  const [eventSearch, setEventSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Bộ lọc người dùng
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "user">("all");

  // Trạng thái modal sửa sự kiện
  const [editingEvent, setEditingEvent] = useState<AdminEventWithMeta | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  // Trạng thái xóa xác nhận
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Trạng thái modal đặt lại mật khẩu cho user
  const [resettingUser, setResettingUser] = useState<AdminUserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [dbActivationNeeded, setDbActivationNeeded] = useState(false);

  // Kiểm tra quyền Admin
  const isAdmin = profile?.role === "admin";

  const handleEditClick = (event: AdminEventWithMeta) => {
    setEditingEvent(event);
    setIsEditDrawerOpen(true);
  };

  const handleEditSubmit = async (values: EventFormValues) => {
    if (editingEvent) {
      await updateEventAsAdmin({ id: editingEvent.id, values });
      setIsEditDrawerOpen(false);
      setEditingEvent(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingEventId) {
      await deleteEventAsAdmin(deletingEventId);
      setDeletingEventId(null);
    }
  };

  // Lọc sự kiện
  const filteredEvents = allEvents.filter((ev) => {
    const matchQuery =
      ev.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
      (ev.owner_name && ev.owner_name.toLowerCase().includes(eventSearch.toLowerCase()));
    const matchType = typeFilter === "all" || ev.event_type === typeFilter;
    return matchQuery && matchType;
  });

  // Lọc người dùng từ Database theo từ khóa và vai trò
  const filteredUsers = allUsers.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchQuery =
      (u.display_name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      ((u as any).email || "").toLowerCase().includes(q) ||
      (u.id || "").toLowerCase().includes(q);
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchQuery && matchRole;
  });

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shadow-soft">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Khu Vực Dành Riêng Cho Quản Trị Viên
        </h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Bạn đang đăng nhập bằng tài khoản người dùng thường và không có quyền truy cập vào Bảng điều khiển Quản trị hệ thống.
        </p>
        <div className="pt-2 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover transition-all"
          >
            Quay lại Bảng điều khiển cá nhân
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-2xl bg-secondary hover:bg-muted border border-border text-xs font-bold text-foreground transition-all"
          >
            Đăng nhập tài khoản Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* 1. Header Banner Quản trị */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/40 via-card to-pink-900/30 border border-purple-500/30 p-6 sm:p-8 backdrop-blur-xl shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-soft">
                <ShieldCheck className="w-3.5 h-3.5" /> SYSTEM ADMIN PANEL
              </span>
              <span className="text-xs text-muted-foreground">v1.0.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Bảng Điều Khiển Quản Trị Hệ Thống
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Toàn quyền giám sát người dùng, chỉnh sửa sự kiện, theo dõi scheduler và cấu hình thông báo
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                refetchEvents();
                refetchUsers();
                toast({ title: "Đã làm mới dữ liệu hệ thống", variant: "success" });
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-secondary/80 hover:bg-secondary border border-border text-xs font-bold text-foreground transition-all shadow-xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              <span>Đồng bộ</span>
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all"
            >
              <span>Xem trang cá nhân</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Thanh chuyển Tab chức năng */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto">
        {[
          { id: "overview", label: "Tổng quan & Thống kê", icon: Sparkles },
          { id: "events", label: `Quản lý sự kiện (${allEvents.length})`, icon: Calendar },
          { id: "users", label: `Quản lý người dùng (${allUsers.length})`, icon: Users },
          { id: "system", label: "Cấu hình hệ thống", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap",
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-soft"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. NỘI DUNG THEO TAB */}

      {/* TAB 1: TỔNG QUAN */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Mini Stats 4 ô */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-5 shadow-xs flex flex-col justify-between">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-3xl font-black text-foreground tracking-tight">{stats.totalUsers}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">Người dùng hệ thống</p>
              </div>
            </div>

            <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-5 shadow-xs flex flex-col justify-between">
              <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 border border-pink-500/20 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-3xl font-black text-foreground tracking-tight">{stats.totalEvents}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">Tổng số sự kiện</p>
              </div>
            </div>

            <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-5 shadow-xs flex flex-col justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-3">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-3xl font-black text-foreground tracking-tight">{stats.activeEvents}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">Sự kiện bật nhắc nhở</p>
              </div>
            </div>

            <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-5 shadow-xs flex flex-col justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-3xl font-black text-foreground tracking-tight">{stats.upcoming7Days}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">Sự kiện 7 ngày tới</p>
              </div>
            </div>
          </div>

          {/* Phân bố loại sự kiện & Lịch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Phân loại sự kiện toàn hệ thống
              </h3>
              <div className="space-y-3">
                {[
                  { label: "🎂 Sinh nhật", count: stats.eventsByType.birthday, color: "bg-purple-500" },
                  { label: "💍 Kỷ niệm", count: stats.eventsByType.anniversary, color: "bg-pink-500" },
                  { label: "🕯️ Ngày giỗ", count: stats.eventsByType.memorial, color: "bg-amber-500" },
                  { label: "🎈 Khác", count: stats.eventsByType.other, color: "bg-blue-500" },
                ].map((item) => {
                  const percent = stats.totalEvents > 0 ? Math.round((item.count / stats.totalEvents) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{item.label}</span>
                        <span className="text-muted-foreground">{item.count} ({percent}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Phân loại Dương lịch & Âm lịch
              </h3>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 text-center">
                  <p className="text-xs font-bold text-muted-foreground uppercase">☀️ Dương lịch</p>
                  <p className="text-2xl font-black text-foreground mt-1">{stats.solarEvents}</p>
                </div>
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 text-center">
                  <p className="text-xs font-bold text-amber-500 uppercase">🌙 Âm lịch</p>
                  <p className="text-2xl font-black text-amber-500 mt-1">{stats.lunarEvents}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Hệ thống tự động đồng bộ thiên văn theo thuật toán Hồ Ngọc Đức để quy đổi chính xác ngày mùng 1, rằm và tháng nhuận hàng năm.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ SỰ KIỆN TOÀN HỆ THỐNG */}
      {activeTab === "events" && (
        <div className="space-y-4">
          {/* Thanh tìm kiếm & Lọc */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên sự kiện hoặc người tạo..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-secondary/50 border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-2xl bg-secondary/50 border border-border/70 text-xs font-bold text-foreground"
              >
                <option value="all">Tất cả loại sự kiện</option>
                <option value="birthday">Sinh nhật</option>
                <option value="anniversary">Kỷ niệm</option>
                <option value="memorial">Ngày giỗ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          {/* Bảng sự kiện */}
          <div className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Tên sự kiện</th>
                    <th className="py-3.5 px-4">Loại</th>
                    <th className="py-3.5 px-4">Ngày diễn ra</th>
                    <th className="py-3.5 px-4">Chủ sở hữu</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        Không tìm thấy sự kiện nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">
                              {ev.event_type === "birthday"
                                ? "🎂"
                                : ev.event_type === "anniversary"
                                ? "💍"
                                : ev.event_type === "memorial"
                                ? "🕯️"
                                : "🎈"}
                            </span>
                            <span>{ev.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[11px] font-bold",
                              ev.event_type === "birthday"
                                ? "bg-purple-500/10 text-purple-600"
                                : ev.event_type === "anniversary"
                                ? "bg-pink-500/10 text-pink-600"
                                : ev.event_type === "memorial"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-blue-500/10 text-blue-600"
                            )}
                          >
                            {ev.event_type === "birthday"
                              ? "Sinh nhật"
                              : ev.event_type === "anniversary"
                              ? "Kỷ niệm"
                              : ev.event_type === "memorial"
                              ? "Ngày giỗ"
                              : "Khác"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{ev.displayDate}</span>
                            {ev.is_lunar && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">
                                Âm
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">{ev.owner_name}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => toggleEventAsAdmin(ev.id, !ev.enabled)}
                            className="inline-flex items-center"
                            title={ev.enabled ? "Bấm để tắt" : "Bấm để bật"}
                          >
                            {ev.enabled ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Bật
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Tắt
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(ev)}
                              className="p-1.5 rounded-xl hover:bg-primary/10 text-primary transition-colors"
                              title="Admin: Sửa sự kiện này"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingEventId(ev.id)}
                              className="p-1.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors"
                              title="Admin: Xóa sự kiện"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUẢN LÝ NGƯỜI DÙNG */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* 1. Metric Cards: Thống kê số lượng & vai trò người dùng trực tiếp từ Database */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-card/70 border border-border/70 backdrop-blur-xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tổng người dùng (DB)</p>
                  <p className="text-xl font-black text-foreground">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-card/70 border border-amber-500/20 bg-amber-500/5 backdrop-blur-xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-amber-500/90 uppercase tracking-wider">Quản trị viên (Admin)</p>
                  <p className="text-xl font-black text-amber-500">{stats.adminCount}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-card/70 border border-border/70 backdrop-blur-xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Người dùng thường (User)</p>
                  <p className="text-xl font-black text-foreground">{stats.userCount}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-card/70 border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-500/90 uppercase tracking-wider">Đang hoạt động</p>
                  <p className="text-xl font-black text-emerald-500">{stats.activeUsersCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Thanh tìm kiếm, bộ lọc vai trò & làm mới từ DB */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                name="admin_user_search_prevent_autofill"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                placeholder="Tìm theo tên, @username, email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-secondary/50 border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20"
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={() => setUserSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-secondary/60 border border-border/60 text-xs font-bold">
                <button
                  onClick={() => setUserRoleFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl transition-all",
                    userRoleFilter === "all"
                      ? "bg-card text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tất cả ({allUsers.length})
                </button>
                <button
                  onClick={() => setUserRoleFilter("admin")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl transition-all",
                    userRoleFilter === "admin"
                      ? "bg-amber-500/15 text-amber-500 shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Admin ({stats.adminCount})
                </button>
                <button
                  onClick={() => setUserRoleFilter("user")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl transition-all",
                    userRoleFilter === "user"
                      ? "bg-card text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  User ({stats.userCount})
                </button>
              </div>

              <button
                onClick={() => {
                  refetchUsers();
                  toast({
                    title: "Đã làm mới dữ liệu từ Database 🔄",
                    description: `Cập nhật thành công ${allUsers.length} tài khoản người dùng từ DB.`,
                    variant: "success",
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 text-xs font-bold transition-all"
                title="Lấy dữ liệu người dùng mới nhất từ Supabase Database"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Làm mới DB</span>
              </button>
            </div>
          </div>

          {/* 3. Bảng Người Dùng */}
          <div className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Người dùng</th>
                    <th className="py-3.5 px-4">Vai trò</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-center">Sự kiện trên DB</th>
                    <th className="py-3.5 px-4">Múi giờ</th>
                    <th className="py-3.5 px-4">Ngày đăng ký</th>
                    <th className="py-3.5 px-4 text-right">Hành động quyền hạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <p className="text-sm font-medium">
                            {userSearch
                              ? `Không tìm thấy người dùng nào phù hợp với từ khóa "${userSearch}"`
                              : "Không có người dùng nào trong danh mục này."}
                          </p>
                          {(userSearch || userRoleFilter !== "all") && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserSearch("");
                                setUserRoleFilter("all");
                              }}
                              className="px-4 py-2 rounded-2xl bg-secondary hover:bg-muted text-xs font-bold text-foreground border border-border/60 transition-all flex items-center gap-1.5 shadow-xs"
                            >
                              <span>Xóa bộ lọc & Hiện tất cả ({allUsers.length} tài khoản)</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isTargetAdmin = u.role === "admin";
                      const isSelf = u.id === profile?.id;
                      const isMasterAdmin =
                        u.username === "admin" ||
                        (u as any).email?.startsWith("admin@") ||
                        u.display_name === "Quản Trị Hệ Thống" ||
                        u.display_name === "Hệ Thống Admin";
                      const cannotDemote = isTargetAdmin && (isSelf || isMasterAdmin);

                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-foreground">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-xs">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (u.display_name || "U").charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-foreground">{u.display_name || "Chưa đặt tên"}</p>
                                  {isSelf && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                                      Bạn
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                  {u.username ? `@${u.username}` : u.id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {isTargetAdmin ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                <ShieldCheck className="w-3 h-3" /> ADMIN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                                USER
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Hoạt động
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary text-foreground">
                              {u.events_count ?? 0} sự kiện
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-foreground">{u.timezone || "Asia/Ho_Chi_Minh"}</td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isTargetAdmin ? (
                                <span
                                  className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-amber-500/90 border border-amber-500/30 bg-amber-500/10 flex items-center gap-1.5 select-none"
                                  title="Quản trị viên tối cao duy nhất của hệ thống"
                                >
                                  <Lock className="w-3 h-3 text-amber-500" />
                                  <span>{isSelf ? "Tài khoản của bạn" : "Quản trị viên"}</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setResettingUser(u);
                                    setNewPassword("");
                                    setShowPassword(false);
                                    setCopied(false);
                                    setDbActivationNeeded(false);
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 shadow-xs"
                                  title={`Admin: Đặt lại mật khẩu cho ${u.display_name || u.username}`}
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>Đặt lại MK</span>
                                </button>
                              )}

                              {!isSelf && !isMasterAdmin && (
                                <button
                                  onClick={() => setDeletingUserId(u.id)}
                                  className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                  title="Admin: Xóa vĩnh viễn tài khoản người dùng này khỏi Database"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CẤU HÌNH HỆ THỐNG */}
      {activeTab === "system" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Trạng thái Hạ tầng Backend
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Cơ sở dữ liệu</span>
                <span className="font-bold text-foreground">PostgreSQL + Supabase Cloud</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Scheduler Cron Job</span>
                <span className="font-bold text-emerald-500">pg_cron (chạy mỗi 0 phút hàng giờ)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Dịch vụ gửi Email</span>
                <span className="font-bold text-foreground">Resend REST API</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Chống gửi trùng lặp</span>
                <span className="font-bold text-emerald-500">Unique Constraint (notification_logs)</span>
              </div>
            </div>
          </div>

          <div className="bg-card/70 backdrop-blur-xl rounded-3xl border border-border/70 p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Kiểm tra kích hoạt Email tự động
            </h3>
            <p className="text-xs text-muted-foreground">
              Admin có thể kích hoạt gọi Edge Function thử nghiệm để kiểm tra toàn bộ luồng tạo email HTML và gửi tới hòm thư cá nhân.
            </p>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/test-email", { method: "POST" });
                  const data = await res.json();
                  toast({
                    title: "Đã kích hoạt gửi thử nghiệm!",
                    description: data.message,
                    variant: "success",
                  });
                } catch (err: any) {
                  toast({ title: "Lỗi kết nối", description: err.message, variant: "error" });
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Gửi thông báo kiểm thử hệ thống</span>
            </button>
          </div>
        </div>
      )}

      {/* Drawer sửa sự kiện dành cho Admin */}
      <EventFormDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleEditSubmit}
        initialData={editingEvent}
        isSubmitting={isUpdating}
      />

        {/* Modal xác nhận xóa sự kiện */}
        <AnimatePresence>
          {deletingEventId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-base text-foreground">Xác nhận xóa sự kiện?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hành động này của Admin sẽ xóa vĩnh viễn sự kiện khỏi cơ sở dữ liệu.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDeletingEventId(null)}
                    className="flex-1 py-2.5 rounded-2xl bg-secondary hover:bg-muted text-xs font-bold text-foreground transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white transition-colors"
                  >
                    Xóa ngay
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal xác nhận xóa người dùng */}
        <AnimatePresence>
          {deletingUserId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm rounded-3xl bg-card border border-rose-500/30 p-6 shadow-2xl space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-base text-foreground">Xác nhận xóa tài khoản?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hành động này của Admin sẽ xóa vĩnh viễn tài khoản người dùng này cùng toàn bộ sự kiện và cài đặt liên quan khỏi cơ sở dữ liệu.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDeletingUserId(null)}
                    className="flex-1 py-2.5 rounded-2xl bg-secondary hover:bg-muted text-xs font-bold text-foreground transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={async () => {
                      if (deletingUserId) {
                        await deleteUserAsAdmin(deletingUserId);
                        setDeletingUserId(null);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white transition-colors"
                  >
                    Xóa vĩnh viễn
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal đặt lại mật khẩu cho người dùng */}
        <AnimatePresence>
          {resettingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-3xl bg-card border border-amber-500/30 p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Đặt lại mật khẩu người dùng</h3>
                    <p className="text-xs text-muted-foreground">
                      Tài khoản: <span className="font-bold text-foreground">{resettingUser.display_name}</span> (@{resettingUser.username || resettingUser.email?.split("@")[0]})
                    </p>
                  </div>
                </div>

                <form
                  autoComplete="off"
                  onSubmit={(e) => e.preventDefault()}
                  className="space-y-3 pt-2"
                >
                  {/* Decoy fields to block browser password manager autofill */}
                  <input type="text" style={{ display: "none" }} tabIndex={-1} autoComplete="username" />
                  <input type="password" style={{ display: "none" }} tabIndex={-1} autoComplete="current-password" />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">Mật khẩu mới</label>
                      <button
                        type="button"
                        onClick={() => {
                          const randomPass = "ber" + Math.floor(100000 + Math.random() * 900000);
                          setNewPassword(randomPass);
                          setShowPassword(true);
                        }}
                        className="text-[11px] text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Tạo mật khẩu ngẫu nhiên</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập ít nhất 6 ký tự..."
                        autoComplete="new-password"
                        className="w-full px-4 py-2.5 pr-20 rounded-2xl bg-secondary/60 border border-border text-xs text-foreground focus:ring-2 focus:ring-amber-500/30 font-medium"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {newPassword && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(newPassword);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Sao chép mật khẩu"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    {copied && (
                      <p className="text-[11px] text-emerald-500 font-semibold">Đã sao chép mật khẩu vào bộ nhớ tạm!</p>
                    )}
                  </div>

                  {dbActivationNeeded && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-amber-500 font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Cần kích hoạt hàm đổi mật khẩu trên Database</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Để đổi mật khẩu trực tiếp trong Database, bạn cần chạy 1 đoạn mã SQL trong Supabase SQL Editor (chỉ cần chạy 1 lần).
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`RESET ROLE;
SET ROLE postgres;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_target_user_id UUID,
    p_new_password TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
    v_encrypted_pw TEXT;
    v_target_username TEXT;
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role <> 'admin' AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND (email = 'admin@ber-app.com' OR email LIKE 'admin@%')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chỉ Quản trị viên tối cao mới có quyền đổi mật khẩu.');
    END IF;

    IF LENGTH(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
    END IF;

    SELECT username INTO v_target_username FROM public.profiles WHERE id = p_target_user_id;
    IF v_target_username = 'admin' OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_target_user_id AND email = 'admin@ber-app.com'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không thể đổi mật khẩu Admin qua tính năng này.');
    END IF;

    v_encrypted_pw := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        updated_at = now()
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Đã đặt lại mật khẩu thành công trực tiếp trên Database.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';`);
                          toast({
                            title: "Đã sao chép đoạn mã SQL! 📋",
                            description: "Vào Supabase Dashboard > SQL Editor, dán đoạn mã này và bấm Run.",
                            variant: "success",
                          });
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép đoạn mã SQL kích hoạt DB</span>
                      </button>
                    </div>
                  )}

                  <div className="p-3 rounded-2xl bg-secondary/40 border border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                    💡 Mật khẩu mới sẽ có hiệu lực ngay lập tức trên Database. Bạn có thể sao chép mật khẩu này và gửi lại cho người dùng.
                  </div>
                </form>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResettingUser(null);
                      setNewPassword("");
                      setDbActivationNeeded(false);
                    }}
                    disabled={isSubmittingPassword}
                    className="flex-1 py-2.5 rounded-2xl bg-secondary hover:bg-muted text-xs font-bold text-foreground transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newPassword || newPassword.length < 6) {
                        toast({
                          title: "Mật khẩu không hợp lệ",
                          description: "Mật khẩu mới phải có ít nhất 6 ký tự.",
                          variant: "error",
                        });
                        return;
                      }
                      setIsSubmittingPassword(true);
                      try {
                        await resetUserPasswordAsAdmin({
                          userId: resettingUser.id,
                          newPassword,
                        });
                        setResettingUser(null);
                        setNewPassword("");
                        setDbActivationNeeded(false);
                      } catch {
                        setDbActivationNeeded(true);
                      } finally {
                        setIsSubmittingPassword(false);
                      }
                    }}
                    disabled={isSubmittingPassword || newPassword.length < 6}
                    className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 shadow-soft"
                  >
                    {isSubmittingPassword ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>Xác nhận đổi mật khẩu</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}
