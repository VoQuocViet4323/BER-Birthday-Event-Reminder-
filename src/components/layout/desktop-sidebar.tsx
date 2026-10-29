"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Calendar,
  List,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEvents } from "@/hooks/use-events";
import { useUserSettings } from "@/hooks/use-user-settings";

interface DesktopSidebarProps {
  onOpenCreateModal: () => void;
}

export function DesktopSidebar({ onOpenCreateModal }: DesktopSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { events } = useEvents();
  const { profile } = useUserSettings();

  const isAdmin = profile?.role === "admin";

  const navItems = [
    { label: "Trang chủ", href: "/dashboard", icon: Home },
    {
      label: "Danh sách sự kiện",
      href: "/events",
      icon: List,
      badge: events.length > 0 ? events.length : undefined,
    },
    { label: "Lịch sự kiện", href: "/calendar", icon: Calendar },
    { label: "Cài đặt & Hồ sơ", href: "/settings", icon: Settings },
    ...(isAdmin
      ? [
          {
            label: "Quản trị hệ thống",
            href: "/admin",
            icon: ShieldCheck,
            badge: "Admin",
            badgeColor: "bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold shadow-xs",
          },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0 border-r border-border/60 bg-card/40 backdrop-blur-xl sticky top-16 h-[calc(100vh-4rem)] transition-all duration-300 z-30",
        collapsed ? "w-20 p-3" : "w-72 p-4"
      )}
    >
      {/* Nút Thêm mới */}
      <div className="mb-6">
        <button
          onClick={onOpenCreateModal}
          className={cn(
            "w-full flex items-center justify-center gap-2.5 rounded-2xl gradient-brand text-white font-bold shadow-soft hover:shadow-soft-hover hover:scale-[1.02] active:scale-[0.98] transition-all",
            collapsed ? "h-12 w-12 mx-auto p-0" : "py-3 px-4 text-sm"
          )}
          title="Thêm sự kiện mới"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          {!collapsed && <span>Thêm sự kiện</span>}
        </button>
      </div>

      {/* Menu liên kết */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all relative group",
                isActive
                  ? "bg-gradient-to-r from-purple-500/15 to-pink-500/15 text-primary font-bold shadow-xs border border-purple-500/20 dark:border-purple-500/30"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-primary stroke-[2.2]" : "group-hover:text-foreground")} />

              {!collapsed && (
                <>
                  <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0",
                        item.badgeColor || "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Tiện ích Xuất file ICS */}
      <div className="pt-4 border-t border-border/60">
        <a
          href="/api/export-ics"
          download
          className={cn(
            "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors",
            collapsed && "justify-center px-0"
          )}
          title="Xuất file .ics để đồng bộ Google/Apple Calendar"
        >
          <Download className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Xuất lịch (.ics)</span>}
        </a>

        {/* Nút Thu gọn / Mở rộng Sidebar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 w-full flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground text-xs transition-colors"
          title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Thu gọn thanh bên</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
