"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { diaryFormSchema, DiaryFormValues, DiaryEntry, DiaryMood } from "@/types/diary";
import { normalizeDateKey } from "@/hooks/use-diaries";
import { X, BookOpen, Trash2, Check, Sparkles, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface DiaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  initialData?: DiaryEntry | null;
  onSave: (payload: { id?: string; values: DiaryFormValues }) => Promise<any>;
  onDelete?: (target: { id?: string; entry_date?: string } | string) => Promise<any>;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export function DiaryDrawer({
  isOpen,
  onClose,
  selectedDate,
  initialData,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: DiaryDrawerProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Khóa cuộn trang phía sau khi mở modal và hỗ trợ phím Escape
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const entryDateStr = normalizeDateKey(selectedDate);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DiaryFormValues>({
    resolver: zodResolver(diaryFormSchema),
    defaultValues: {
      entry_date: entryDateStr,
      title: "",
      content: "",
      mood: null,
      tags: [],
    },
  });

  const selectedMood = watch("mood");
  const selectedTags = watch("tags") || [];
  const contentValue = watch("content") || "";

  useEffect(() => {
    if (initialData) {
      reset({
        entry_date: initialData.entry_date,
        title: initialData.title || "",
        content: initialData.content || "",
        mood: initialData.mood || null,
        tags: initialData.tags || [],
      });
    } else {
      reset({
        entry_date: entryDateStr,
        title: "",
        content: "",
        mood: null,
        tags: [],
      });
    }
    setConfirmDelete(false);
    setTagInput("");
  }, [initialData, entryDateStr, reset, isOpen]);

  if (!mounted) return null;

  const moods: { mood: DiaryMood; label: string; icon: string; activeColor: string }[] = [
    { mood: "happy", label: "Vui vẻ", icon: "😊", activeColor: "border-amber-500 bg-amber-500/10 text-amber-500" },
    { mood: "calm", label: "Bình yên", icon: "🌿", activeColor: "border-emerald-500 bg-emerald-500/10 text-emerald-500" },
    { mood: "excited", label: "Hào hứng", icon: "🔥", activeColor: "border-rose-500 bg-rose-500/10 text-rose-500" },
    { mood: "sad", label: "Trầm lắng", icon: "🥺", activeColor: "border-sky-500 bg-sky-500/10 text-sky-500" },
    { mood: "grateful", label: "Biết ơn", icon: "🙏", activeColor: "border-purple-500 bg-purple-500/10 text-purple-500" },
  ];

  const suggestedTags = ["Kỷ niệm", "Gia đình", "Bạn bè", "Công việc", "Du lịch", "Biết ơn"];

  const handleToggleTag = (tag: string) => {
    const cur = selectedTags;
    if (cur.includes(tag)) {
      setValue("tags", cur.filter((t) => t !== tag));
    } else {
      setValue("tags", [...cur, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const clean = tagInput.trim().replace(/^#/, "");
    if (!clean) return;
    if (!selectedTags.includes(clean)) {
      setValue("tags", [...selectedTags, clean]);
    }
    setTagInput("");
  };

  const handleFormSubmit = async (values: DiaryFormValues) => {
    await onSave({
      id: initialData?.id,
      values: {
        ...values,
        entry_date: entryDateStr,
      },
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    await onDelete({
      id: initialData?.id,
      entry_date: entryDateStr,
    });
    onClose();
  };

  if (!mounted) return null;

  return typeof document !== "undefined"
    ? createPortal(
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              key="diary-drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
              }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 select-none overscroll-contain"
            >
              <motion.div
                key="diary-drawer-sheet"
                initial={{ y: "100%", opacity: 0.95 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0.95 }}
                transition={{
                  type: "spring",
                  damping: 32,
                  stiffness: 350,
                  mass: 0.8,
                }}
                className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] will-change-transform transform-gpu select-text overscroll-contain"
                onClick={(e) => e.stopPropagation()}
              >
        {/* Header (Cố định ở trên) */}
        <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center text-primary shadow-xs">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-foreground tracking-tight">
                {initialData ? "Chỉnh sửa nhật ký" : "Thêm nhật ký mới"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ngày {selectedDate.getDate()} tháng {selectedDate.getMonth() + 1}, {selectedDate.getFullYear()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="diary-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 space-y-4 overscroll-contain"
        >
          {/* 1. Chọn cảm xúc trong ngày */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Cảm xúc hôm nay của bạn
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {moods.map((m) => {
                const isActive = selectedMood === m.mood;
                return (
                  <button
                    key={m.mood}
                    type="button"
                    onClick={() => setValue("mood", isActive ? null : m.mood)}
                    className={cn(
                      "py-2 px-1 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                      isActive
                        ? cn(m.activeColor, "shadow-xs ring-2 ring-primary/50 font-bold")
                        : "border-border/70 bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:bg-secondary/80"
                    )}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-[10px] truncate max-w-full">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tiêu đề ngắn (Tùy chọn) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Tiêu đề ngắn <span className="text-muted-foreground/60 font-normal lowercase">(không bắt buộc)</span>
            </label>
            <input
              id="diary-title-input"
              {...register("title")}
              placeholder="VD: Một ngày tuyệt vời cùng gia đình, Kỷ niệm đáng nhớ..."
              className="w-full px-4 py-2.5 rounded-2xl bg-secondary/50 border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium transition-all placeholder:text-muted-foreground/60"
            />
            {errors.title && (
              <p className="text-xs text-rose-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* 3. Nội dung nhật ký (Bắt buộc) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nội dung nhật ký <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                {contentValue.length}/3000 ký tự
              </span>
            </div>
            <textarea
              id="diary-content-textarea"
              {...register("content")}
              rows={4}
              placeholder="Hôm nay có điều gì đặc biệt xảy ra? Những kỷ niệm, cảm xúc hay điều gì khiến bạn biết ơn..."
              className={cn(
                "w-full px-4 py-3 rounded-2xl bg-secondary/50 border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium transition-all leading-relaxed placeholder:text-muted-foreground/60 resize-none",
                errors.content && "border-rose-500 focus:ring-rose-500"
              )}
            />
            {errors.content && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.content.message}</p>
            )}
          </div>

          {/* 4. Thẻ chủ đề (Tags) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-primary" />
              Chủ đề & Thẻ
            </label>

            {/* Gợi ý thẻ nhanh */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {suggestedTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                      isSelected
                        ? "bg-primary text-white shadow-xs"
                        : "bg-secondary/70 border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <span>#{tag}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            {/* Ô nhập thẻ tùy chỉnh */}
            <div className="flex items-center gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="Thêm thẻ khác (nhấn Enter)..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-secondary/40 border border-border/70 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-colors cursor-pointer"
              >
                + Thêm
              </button>
            </div>
          </div>
        </form>

        {/* Footer Actions (Cố định ở dưới cùng, luôn nhìn thấy 100%) */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-border shrink-0 flex items-center justify-between gap-3 bg-card">
          {initialData ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-confirm-delete-diary"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-xs font-semibold hover:text-foreground cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-delete-diary"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa nhật ký</span>
              </button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              id="btn-save-diary"
              onClick={handleSubmit(
                (values) => handleFormSubmit(values),
                (errs) => {
                  console.error("Diary form validation errors:", errs);
                  if (errs.content) {
                    toast({
                      title: "Vui lòng nhập nội dung",
                      description: errs.content.message || "Bạn chưa nhập nội dung nhật ký.",
                      variant: "error",
                    });
                  }
                }
              )}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl gradient-brand text-white font-bold text-xs shadow-soft hover:opacity-95 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSaving ? "Đang lưu..." : "Lưu nhật ký"}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>,
        document.body
      )
    : null;
}
