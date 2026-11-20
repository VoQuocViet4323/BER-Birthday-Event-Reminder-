"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { diaryFormSchema, DiaryFormValues, DiaryEntry, DiaryMood, MAX_DIARY_IMAGES } from "@/types/diary";
import { normalizeDateKey } from "@/hooks/use-diaries";
import { X, BookOpen, Trash2, Check, Hash, ImagePlus, Loader2, ZoomIn, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { createClient } from "@/lib/supabase/client";
import {
  uploadDiaryImageWithFallback,
  prepareDiaryImageForUpload,
  isValidImageFile,
  ProcessedAvatar,
} from "@/lib/image-utils";

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  // Nén sẵn cục bộ trong nền ngay khi chọn ảnh (KHÔNG upload lên mạng) để bấm Lưu là đẩy lên tức thì
  compressedPromise: Promise<ProcessedAvatar | null>;
}

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
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotosRef = useRef<PendingPhoto[]>([]);
  pendingPhotosRef.current = pendingPhotos;
  // Hàng đợi nén tuần tự 1 ảnh/lần để chọn cùng lúc 6 ảnh >30MB trên iPhone không bao giờ bị tràn RAM
  const compressQueueRef = useRef<Promise<any>>(Promise.resolve());
  // Cache sẵn userId khi mở modal để lúc bấm Lưu không mất thời gian chờ auth.getSession()
  const cachedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled && session?.user?.id) {
          cachedUserIdRef.current = session.user.id;
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const clearPendingPhotos = () => {
    pendingPhotosRef.current.forEach((p) => {
      try {
        URL.revokeObjectURL(p.previewUrl);
      } catch {}
    });
    setPendingPhotos([]);
  };

  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((p) => {
        try {
          URL.revokeObjectURL(p.previewUrl);
        } catch {}
      });
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Khóa cuộn trang phía sau khi mở modal và hỗ trợ phím Escape
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (previewIndex !== null) {
            setPreviewIndex(null);
          } else {
            onClose();
          }
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose, previewIndex]);

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
      images: [],
    },
  });

  const selectedMood = watch("mood");
  const selectedTags = watch("tags") || [];
  const selectedImages = watch("images") || [];
  const contentValue = watch("content") || "";

  useEffect(() => {
    if (initialData) {
      reset({
        entry_date: initialData.entry_date,
        title: initialData.title || "",
        content: initialData.content || "",
        mood: initialData.mood || null,
        tags: initialData.tags || [],
        images: initialData.images || [],
      });
    } else {
      reset({
        entry_date: entryDateStr,
        title: "",
        content: "",
        mood: null,
        tags: [],
        images: [],
      });
    }
    setConfirmDelete(false);
    setTagInput("");
    setPreviewIndex(null);
    setIsDragOver(false);
    clearPendingPhotos();
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

  const totalImagesCount = selectedImages.length + pendingPhotos.length;

  const handleFilesSelected = (incomingFiles: FileList | File[]) => {
    const fileArray = Array.from(incomingFiles || []);
    if (fileArray.length === 0) return;

    const validFiles = fileArray.filter((f) => isValidImageFile(f));
    if (validFiles.length === 0) {
      toast({
        title: "Định dạng ảnh không hợp lệ",
        description: "Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP, GIF, AVIF...).",
        variant: "error",
      });
      return;
    }

    if (validFiles.length < fileArray.length) {
      toast({
        title: "Một số tệp đã được bỏ qua",
        description: "Chỉ những tệp hình ảnh hợp lệ mới được chọn.",
        variant: "default",
      });
    }

    const remainingSlots = MAX_DIARY_IMAGES - totalImagesCount;
    if (remainingSlots <= 0) {
      toast({
        title: `Đã đạt tối đa ${MAX_DIARY_IMAGES} ảnh`,
        description: "Bạn hãy xóa bớt ảnh cũ nếu muốn thêm ảnh mới.",
        variant: "error",
      });
      return;
    }

    const filesToQueue = validFiles.slice(0, remainingSlots);
    if (validFiles.length > remainingSlots) {
      toast({
        title: `Giới hạn tối đa ${MAX_DIARY_IMAGES} ảnh`,
        description: `Hệ thống sẽ chỉ chọn ${remainingSlots} ảnh đầu tiên.`,
        variant: "default",
      });
    }

    // Tạo ảnh xem trước cục bộ VÀ xếp hàng nén tuần tự trong nền (1 ảnh/lần để chống tràn RAM khi chọn 6 ảnh >30MB trên iPhone)
    // Hoàn toàn KHÔNG gọi mạng / KHÔNG upload lên Storage cho tới khi bấm "Lưu nhật ký"
    const newPending: PendingPhoto[] = filesToQueue.map((file) => {
      const task = compressQueueRef.current.then(() =>
        prepareDiaryImageForUpload(file).catch((err) => {
          console.warn(`Lỗi nén sẵn cục bộ ${file.name}:`, err);
          return null;
        })
      );
      compressQueueRef.current = task.then(() => undefined);

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        compressedPromise: task,
      };
    });

    setPendingPhotos((prev) => [...prev, ...newPending]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveSavedImage = (indexToRemove: number) => {
    const next = selectedImages.filter((_, idx) => idx !== indexToRemove);
    setValue("images", next, { shouldDirty: true });
  };

  const handleRemovePendingPhoto = (photoId: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      return prev.filter((p) => p.id !== photoId);
    });
  };

  const handleDropImages = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isUploadingImages || isSaving) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handlePasteImages = (e: React.ClipboardEvent<HTMLFormElement>) => {
    if (isUploadingImages || isSaving) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedImages: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) pastedImages.push(file);
      }
    }
    if (pastedImages.length > 0) {
      e.preventDefault();
      handleFilesSelected(pastedImages);
    }
  };

  const handleFormSubmit = async (values: DiaryFormValues) => {
    if (isSubmittingForm || isUploadingImages || isSaving) return;

    setIsSubmittingForm(true);
    let finalImages = [...(values.images || [])];

    try {
      // Chỉ nén & upload các ảnh mới chọn lên Supabase Storage khi người dùng bấm "Lưu nhật ký"
      if (pendingPhotos.length > 0) {
        setIsUploadingImages(true);
        setUploadProgress({ current: 0, total: pendingPhotos.length });

        const supabase = createClient();
        let userId = cachedUserIdRef.current || "local_user";
        if (!cachedUserIdRef.current) {
          try {
            const authPromise = (async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) return session.user.id;
              const { data } = await supabase.auth.getUser();
              return data?.user?.id || "local_user";
            })();
            userId = await Promise.race([
              authPromise,
              new Promise<string>((resolve) => setTimeout(() => resolve("local_user"), 4000)),
            ]);
            if (userId !== "local_user") cachedUserIdRef.current = userId;
          } catch {
            // Fallback sang local_user nếu chưa đăng nhập hoặc timeout
          }
        }

        let completedCount = 0;
        let failedCount = 0;

        // Tận dụng ảnh đã nén sẵn trong nền và upload SONG SONG lên Supabase Storage để lưu siêu nhanh trên mobile
        const uploadResults = await Promise.all(
          pendingPhotos.map(async (photo) => {
            try {
              const preCompressed = await photo.compressedPromise;
              const url = await uploadDiaryImageWithFallback(
                supabase,
                userId,
                photo.file,
                preCompressed ?? undefined
              );
              completedCount++;
              setUploadProgress({ current: completedCount, total: pendingPhotos.length });
              return url;
            } catch (err: any) {
              failedCount++;
              completedCount++;
              setUploadProgress({ current: completedCount, total: pendingPhotos.length });
              console.error(`Lỗi xử lý ảnh ${photo.file.name}:`, err);
              return null;
            }
          })
        );

        const uploadedUrls = uploadResults.filter((u): u is string => Boolean(u));

        setIsUploadingImages(false);
        setUploadProgress(null);

        if (uploadedUrls.length === 0 && failedCount > 0) {
          toast({
            title: "Không thể tải ảnh lên",
            description: "Hình ảnh bị lỗi hoặc trình duyệt chưa hỗ trợ định dạng này (ví dụ HEIC chưa chuyển đổi).",
            variant: "error",
          });
          return;
        }

        if (failedCount > 0) {
          toast({
            title: "Một số ảnh không thể tải lên",
            description: `${failedCount} ảnh bị lỗi định dạng đã được bỏ qua.`,
            variant: "default",
          });
        }

        finalImages = [...finalImages, ...uploadedUrls];
      }

      await onSave({
        id: initialData?.id,
        values: {
          ...values,
          entry_date: entryDateStr,
          images: finalImages,
        },
      });
      clearPendingPhotos();
      setTimeout(() => {
        onClose();
      }, 250);
    } catch (err: any) {
      console.error("Diary submit error:", err);
      toast({
        title: "Không thể lưu nhật ký",
        description: err?.message || "Đã xảy ra lỗi khi lưu nhật ký. Vui lòng thử lại.",
        variant: "error",
      });
    } finally {
      setIsSubmittingForm(false);
      setIsUploadingImages(false);
      setUploadProgress(null);
    }
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
          onPaste={handlePasteImages}
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

          {/* 4. Khoảnh khắc trong ngày - Upload ảnh (Không bắt buộc) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ImagePlus className="w-3.5 h-3.5 text-primary" />
                <span>
                  Khoảnh khắc trong ngày{" "}
                  <span className="text-muted-foreground/60 font-normal lowercase">(không bắt buộc)</span>
                </span>
              </label>
              <span className="text-[11px] text-muted-foreground font-medium">
                {totalImagesCount}/{MAX_DIARY_IMAGES} ảnh
              </span>
            </div>

            <input
              ref={fileInputRef}
              id="diary-image-input"
              type="file"
              accept="image/*"
              multiple
              disabled={isUploadingImages || isSaving}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesSelected(e.target.files);
                }
              }}
              className="hidden"
            />

            {totalImagesCount === 0 ? (
              <div
                onClick={() => !isUploadingImages && !isSaving && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDropImages}
                className={cn(
                  "rounded-2xl border border-dashed p-4 text-center transition-all cursor-pointer select-none",
                  isDragOver
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : "border-border/80 bg-secondary/30 hover:border-primary/60 hover:bg-secondary/50",
                  (isUploadingImages || isSaving) && "opacity-75 cursor-wait"
                )}
              >
                <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <ImagePlus className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    Thêm ảnh lưu giữ khoảnh khắc đẹp
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Bấm chọn, kéo thả hoặc dán ảnh • Hỗ trợ ảnh &gt;30MB (tự động nén sắc nét)
                  </p>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDropImages}
                className={cn(
                  "rounded-2xl border p-2.5 transition-all",
                  isDragOver
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-secondary/25"
                )}
              >
                <div className="grid grid-cols-3 gap-2">
                  {/* Ảnh đã lưu sẵn trên DB (khi chỉnh sửa) */}
                  {selectedImages.map((imgUrl, idx) => (
                    <div
                      key={`saved-${imgUrl.slice(0, 32)}-${idx}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-border/80 bg-secondary/50 group"
                    >
                      <img
                        src={imgUrl}
                        alt={`Khoảnh khắc ${idx + 1}`}
                        onClick={() => setPreviewIndex(idx)}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(idx)}
                        className="absolute bottom-1.5 left-1.5 p-1 rounded-lg bg-black/55 hover:bg-black/75 text-white transition-opacity cursor-pointer touch-manipulation [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                        title="Xem ảnh lớn"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isUploadingImages || isSaving}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveSavedImage(idx);
                        }}
                        className="absolute top-1.5 right-1.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/70 hover:bg-rose-600 active:bg-rose-600 active:scale-90 text-white transition-all cursor-pointer shadow-xs touch-manipulation disabled:opacity-50"
                        title="Xóa ảnh này"
                        aria-label="Xóa ảnh này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Ảnh mới chọn (chỉ xem trước cục bộ, chỉ đẩy lên Storage khi bấm Lưu nhật ký) */}
                  {pendingPhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden border border-primary/50 bg-secondary/50 group"
                    >
                      <img
                        src={photo.previewUrl}
                        alt={`Ảnh chờ lưu ${idx + 1}`}
                        onClick={() => setPreviewIndex(selectedImages.length + idx)}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(selectedImages.length + idx)}
                        className="absolute bottom-1.5 left-1.5 p-1 rounded-lg bg-black/55 hover:bg-black/75 text-white transition-opacity cursor-pointer touch-manipulation [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                        title="Xem ảnh lớn"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isUploadingImages || isSaving}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemovePendingPhoto(photo.id);
                        }}
                        className="absolute top-1.5 right-1.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/70 hover:bg-rose-600 active:bg-rose-600 active:scale-90 text-white transition-all cursor-pointer shadow-xs touch-manipulation disabled:opacity-50"
                        title="Bỏ chọn ảnh này"
                        aria-label="Bỏ chọn ảnh này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {totalImagesCount < MAX_DIARY_IMAGES && (
                    <button
                      type="button"
                      disabled={isUploadingImages || isSaving}
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border border-dashed border-border/80 hover:border-primary/60 bg-secondary/40 hover:bg-secondary/70 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                      title="Thêm ảnh khác"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">Thêm ảnh</span>
                    </button>
                  )}
                </div>

                {(isUploadingImages || isSubmittingForm) && (
                  <p className="text-[11px] text-primary font-medium mt-2 text-center flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {isUploadingImages
                        ? `Đang tải ảnh lên (${uploadProgress?.current || 0}/${uploadProgress?.total || 1})...`
                        : "Đang lưu nhật ký lên cơ sở dữ liệu..."}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 5. Thẻ chủ đề (Tags) */}
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
            <LiquidGlassButton
              type="button"
              id="btn-save-diary"
              isSubmitting={isSubmittingForm || isSaving || isUploadingImages}
              idleText={initialData ? "Lưu thay đổi" : "Lưu nhật ký"}
              loadingText={isUploadingImages ? "Đang tải ảnh..." : "Đang lưu..."}
              successText="Đã lưu!"
              btnWidth="145px"
              btnHeight="42px"
              onClick={handleSubmit(
                (values) => handleFormSubmit(values),
                (errs) => {
                  console.error("Diary form validation errors:", errs);
                  const firstErr =
                    errs.content?.message ||
                    errs.title?.message ||
                    errs.images?.message ||
                    errs.entry_date?.message ||
                    "Vui lòng kiểm tra lại thông tin nhật ký.";
                  toast({
                    title: errs.content ? "Vui lòng nhập nội dung" : "Thông tin chưa hợp lệ",
                    description: String(firstErr),
                    variant: "error",
                  });
                }
              )}
            />
          </div>
        </div>
      </motion.div>

      {/* Lightbox xem trước ảnh toàn màn hình (hỗ trợ kéo 2 ngón tay phóng to / thu nhỏ) */}
      {previewIndex !== null && (
        <ImageLightbox
          images={[...selectedImages, ...pendingPhotos.map((p) => p.previewUrl)]}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </motion.div>
  )}
</AnimatePresence>,
        document.body
      )
    : null;
}
