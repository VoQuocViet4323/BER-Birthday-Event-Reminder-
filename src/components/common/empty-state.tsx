"use client";

import React from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-3xl border border-dashed border-border bg-card/50"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl mb-4 shadow-soft">
        {icon || "🎂"}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full gradient-brand text-white text-sm font-semibold shadow-soft hover:shadow-soft-hover hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
