"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { CommandMenu } from "./command-menu";
import { NotificationBellDropdown } from "./notification-bell-dropdown";
import { useUserSettings } from "@/hooks/use-user-settings";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Settings, Sparkles, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AppHeaderProps {
  onOpenCreateModal?: () => void;
}

export function AppHeader({ onOpenCreateModal }: AppHeaderProps) {
  const { profile } = useUserSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const isRemembered = localStorage.getItem("ber_remember_me") === "true";
      if (!isRemembered) {
        localStorage.removeItem("ber_remembered_username");
        localStorage.removeItem("ber_remembered_password");
        localStorage.removeItem("ber_remember_me");
      }
      localStorage.removeItem("ber-user-profile");
      localStorage.removeItem("ber-user-settings");
      localStorage.removeItem("ber-local-events");
    } catch (e) {
      console.error("Lỗi xóa thông tin ghi nhớ khi đăng xuất:", e);
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Ignored if local
    }
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="w-full flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Logo & Brand Name */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center text-white text-xl shadow-soft group-hover:scale-105 transition-transform">
            🎂
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base md:text-lg tracking-tight bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 bg-clip-text text-transparent">
                Nhắc Sự Kiện
              </span>
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                <Sparkles className="w-2.5 h-2.5" /> Pro
              </span>
              {isAdmin && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-500 border border-amber-500/30">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Không bao giờ lỡ ngày quan trọng
            </p>
          </div>
        </Link>

        {/* Thanh tìm kiếm & Hành động */}
        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-500/30 text-amber-500 hover:text-amber-400 text-xs font-bold hover:scale-105 transition-transform shadow-xs"
              title="Mở Bảng điều khiển Quản trị"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quản trị</span>
            </Link>
          )}

          <CommandMenu onOpenCreateModal={onOpenCreateModal} />
          <NotificationBellDropdown />
          <ThemeToggle />

          {/* User Profile Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1 pl-2 rounded-2xl hover:bg-secondary transition-colors"
              aria-label="Menu tài khoản"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {profile?.display_name || "Người dùng"}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight flex items-center justify-end gap-1">
                  {isAdmin ? (
                    <span className="text-amber-500 font-bold">Quản trị viên</span>
                  ) : (
                    "Tài khoản cá nhân"
                  )}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-soft overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(profile?.display_name || "U").charAt(0).toUpperCase()}</span>
                )}
              </div>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-card border shadow-xl z-50 text-xs font-medium space-y-1"
                >
                  <div className="px-3 py-2 border-b border-border/50 mb-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-foreground">
                        {profile?.display_name || "Người dùng"}
                      </p>
                      {isAdmin && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
                          ADMIN
                        </span>
                      )}
                    </div>
                    {profile?.email ? (
                      <p className="text-muted-foreground truncate text-xs font-normal mt-0.5">
                        {profile.email}
                      </p>
                    ) : null}
                  </div>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-500 font-bold hover:bg-amber-500/20 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      <span>Bảng Quản Trị Hệ Thống</span>
                    </Link>
                  )}

                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-foreground hover:bg-secondary transition-colors"
                  >
                    <Settings className="w-4 h-4 text-primary" />
                    <span>Cài đặt & Hồ sơ</span>
                  </Link>

                  <div className="border-t border-border/50 pt-1 mt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
