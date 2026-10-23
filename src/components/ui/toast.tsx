"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, AlertTriangle, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ duration = 5000, ...options }: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, duration, ...options };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-0 left-0 md:left-auto md:right-6 z-50 pointer-events-none flex flex-col items-center md:items-end px-4 gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "pointer-events-auto flex items-center justify-between gap-3 w-full max-w-sm p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all",
                t.variant === "error"
                  ? "bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100"
                  : t.variant === "warning"
                  ? "bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100"
                  : t.variant === "success"
                  ? "bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                  : "bg-white/95 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100"
              )}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {t.variant === "error" ? (
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                ) : t.variant === "warning" ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                ) : t.variant === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </div>
              </div>

              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t.action.label}
                </button>
              )}

              <button
                onClick={() => dismiss(t.id)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
