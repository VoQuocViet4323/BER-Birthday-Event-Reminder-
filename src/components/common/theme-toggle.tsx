"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Sun, Moon, Laptop } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-secondary/80 hover:bg-secondary text-foreground transition-all duration-200"
        title="Đổi giao diện"
        aria-label="Đổi giao diện"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="w-4 h-4 text-primary" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-36 p-1 rounded-xl bg-card border shadow-lg z-50 text-xs font-medium"
          >
            <button
              onClick={() => {
                setTheme("light");
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                theme === "light" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" /> Sáng
            </button>
            <button
              onClick={() => {
                setTheme("dark");
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                theme === "dark" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-purple-400" /> Tối
            </button>
            <button
              onClick={() => {
                setTheme("system");
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                theme === "system" ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-slate-400" /> Hệ thống
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
