"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, List, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenCreateModal: () => void;
}

export function MobileBottomNav({ onOpenCreateModal }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Trang chủ", href: "/dashboard", icon: Home },
    { label: "Sự kiện", href: "/events", icon: List },
    // Vị trí nút FAB ở giữa
    { label: "Lịch", href: "/calendar", icon: Calendar },
    { label: "Cài đặt", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border/80 px-2 py-2 safe-area-pb shadow-lg">
      <div className="grid grid-cols-5 items-center relative max-w-md mx-auto">
        {/* Tab 1: Trang chủ */}
        <Link
          href={navItems[0].href}
          className={cn(
            "flex flex-col items-center justify-center py-1 rounded-2xl transition-all touch-manipulation",
            pathname === navItems[0].href
              ? "text-primary font-bold scale-105"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap tracking-tight">{navItems[0].label}</span>
        </Link>

        {/* Tab 2: Sự kiện (Cân đối 100%, không bị lệch hay che lấp) */}
        <Link
          href={navItems[1].href}
          className={cn(
            "flex flex-col items-center justify-center py-1 rounded-2xl transition-all touch-manipulation",
            pathname === navItems[1].href
              ? "text-primary font-bold scale-105"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <List className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap tracking-tight">{navItems[1].label}</span>
        </Link>

        {/* Cột 3: Nút FAB chính giữa (Floating Action Button) */}
        <div className="flex items-center justify-center relative h-10">
          <button
            onClick={onOpenCreateModal}
            className="absolute -top-7 w-[52px] h-[52px] rounded-full gradient-brand text-white shadow-glow hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer touch-manipulation z-10"
            title="Thêm sự kiện mới"
            aria-label="Thêm sự kiện mới"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Lịch */}
        <Link
          href={navItems[2].href}
          className={cn(
            "flex flex-col items-center justify-center py-1 rounded-2xl transition-all touch-manipulation",
            pathname === navItems[2].href
              ? "text-primary font-bold scale-105"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap tracking-tight">{navItems[2].label}</span>
        </Link>

        {/* Tab 4: Cài đặt */}
        <Link
          href={navItems[3].href}
          className={cn(
            "flex flex-col items-center justify-center py-1 rounded-2xl transition-all touch-manipulation",
            pathname === navItems[3].href
              ? "text-primary font-bold scale-105"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap tracking-tight">{navItems[3].label}</span>
        </Link>
      </div>
    </nav>
  );
}
