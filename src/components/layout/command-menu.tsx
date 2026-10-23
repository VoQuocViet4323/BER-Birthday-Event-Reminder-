"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, List, Settings, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEvents } from "@/hooks/use-events";

interface CommandMenuProps {
  onOpenCreateModal?: () => void;
}

export function CommandMenu({ onOpenCreateModal }: CommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { events } = useEvents();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const filteredEvents = search.trim()
    ? events.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.group_name.toLowerCase().includes(search.toLowerCase()) ||
          (e.note && e.note.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  return (
    <>
      {/* Nút mở nhanh trên thanh Header */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground text-xs font-medium transition-colors border border-border/50"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Tìm kiếm sự kiện...</span>
        <kbd className="ml-2 font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border">
          ⌘K
        </kbd>
      </button>

      {/* Modal Command Palette */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              {/* Ô tìm kiếm */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Gõ tên người, nhóm hoặc sự kiện..."
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground text-foreground"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Danh sách kết quả & Lối tắt */}
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {/* Hành động nhanh */}
                <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Hành động nhanh
                </div>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCreateModal?.();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm hover:bg-primary/10 text-primary font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm sự kiện / người mới</span>
                </button>

                {/* Danh sách sự kiện tìm thấy */}
                {filteredEvents.length > 0 && (
                  <>
                    <div className="px-2 pt-3 pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Sự kiện ({filteredEvents.length})
                    </div>
                    {filteredEvents.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/events?search=${encodeURIComponent(item.name)}`);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {item.event_type === "birthday" ? "🎂" : "🌟"}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.displayDate} • {item.group_name}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {item.daysRemaining === 0 ? "Hôm nay" : `Còn ${item.daysRemaining} ngày`}
                        </span>
                      </button>
                    ))}
                  </>
                )}

                {/* Điều hướng nhanh */}
                <div className="px-2 pt-3 pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Điều hướng
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/dashboard");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm hover:bg-muted text-foreground transition-colors"
                >
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Trang chủ Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/events");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm hover:bg-muted text-foreground transition-colors"
                >
                  <List className="w-4 h-4 text-muted-foreground" />
                  <span>Danh sách tất cả sự kiện</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/calendar");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm hover:bg-muted text-foreground transition-colors"
                >
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Xem Lịch tháng</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/settings");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm hover:bg-muted text-foreground transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>Cài đặt thông báo & Tài khoản</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
