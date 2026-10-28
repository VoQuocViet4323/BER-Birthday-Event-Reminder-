"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema, EventFormValues, EventWithMeta } from "@/types/events";
import { X, ChevronDown, ChevronUp, Sparkles, Calendar as CalendarIcon, Gift, FileText, Check, Clock, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { convertLunar2Solar, convertSolar2Lunar } from "@/lib/lunar/amlich";
import { cn } from "@/lib/utils";
import { IosTimePicker } from "@/components/ui/ios-time-picker";
import { RemindDaysPicker } from "@/components/events/remind-days-picker";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";

interface EventFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: EventFormValues) => Promise<any>;
  initialData?: EventWithMeta | null;
  initialDate?: { day: number; month: number; year?: number } | null;
  isSubmitting?: boolean;
}

export function EventFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  initialDate,
  isSubmitting,
}: EventFormDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      event_type: "birthday",
      event_day: new Date().getDate(),
      event_month: new Date().getMonth() + 1,
      event_year: new Date().getFullYear(),
      is_lunar: false,
      group_name: "Gia đình",
      note: "",
      gift_idea: "",
      avatar_url: "",
      repeat_yearly: true,
      remind_days: [0],
      remind_time: "08:00",
      custom_type: "",
      custom_group: "",
      enabled: true,
    },
  });

  // Watch form fields for live conversions & chips
  const isLunar = watch("is_lunar");
  const eventDay = watch("event_day");
  const eventMonth = watch("event_month");
  const eventYear = watch("event_year");
  const eventType = watch("event_type");
  const groupName = watch("group_name");
  const remindDays = watch("remind_days") || [];
  const remindTime = watch("remind_time") || "08:00";
  const repeatYearly = watch("repeat_yearly") !== false;

  // Populate data when editing
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        event_type: initialData.event_type,
        event_day: initialData.event_day,
        event_month: initialData.event_month,
        event_year: initialData.event_year ?? new Date().getFullYear(),
        is_lunar: initialData.is_lunar,
        group_name: initialData.group_name,
        note: initialData.note || "",
        gift_idea: initialData.gift_idea || "",
        avatar_url: initialData.avatar_url || "",
        repeat_yearly: initialData.repeat_yearly,
        remind_days: initialData.remind_days || [],
        remind_time: (initialData as any)?.remind_time || "08:00",
        custom_type: (initialData as any)?.custom_type || "",
        custom_group: (initialData as any)?.custom_group || "",
        enabled: initialData.enabled,
      });
      if (initialData.note || initialData.gift_idea || initialData.is_lunar || (initialData as any)?.custom_group || (initialData.remind_days && initialData.remind_days.length > 0)) {
        setShowAdvanced(true);
      }
    } else {
      const now = new Date();
      reset({
        name: "",
        event_type: "birthday",
        event_day: initialDate?.day ?? now.getDate(),
        event_month: initialDate?.month ?? (now.getMonth() + 1),
        event_year: initialDate?.year ?? now.getFullYear(),
        is_lunar: false,
        group_name: "Gia đình",
        note: "",
        gift_idea: "",
        avatar_url: "",
        repeat_yearly: true,
        remind_days: [0],
        remind_time: "08:00",
        custom_type: "",
        custom_group: "",
        enabled: true,
      });
      setShowAdvanced(false);
    }
  }, [initialData, initialDate, reset, isOpen]);

  // Live conversion preview
  const currentYear = new Date().getFullYear();
  let convertedDateText = "";
  if (isLunar && eventDay && eventMonth) {
    const solar = convertLunar2Solar(Number(eventDay), Number(eventMonth), currentYear);
    convertedDateText = `Tương ứng Dương lịch năm nay: ${solar.day}/${solar.month}/${solar.year}`;
  } else if (!isLunar && eventDay && eventMonth) {
    const lunar = convertSolar2Lunar(Number(eventDay), Number(eventMonth), currentYear);
    convertedDateText = `Tương ứng Âm lịch: ngày ${lunar.day} tháng ${lunar.month}${lunar.isLeap ? " (Nhuận)" : ""}`;
  }

  const handleFormSubmit = async (values: EventFormValues) => {
    // Tự sinh avatar nếu chưa có
    let avatarUrl = values.avatar_url;
    if (!avatarUrl && values.name) {
      const seed = encodeURIComponent(values.name.trim());
      avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    }

    try {
      await onSubmit({
        ...values,
        avatar_url: avatarUrl,
      });
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRemindOffset = (offset: number) => {
    const cur = Array.isArray(remindDays) ? remindDays : [];
    const exists = cur.includes(offset);
    const updated = exists ? cur.filter((d) => d !== offset) : [...cur, offset].sort((a, b) => b - a);
    setValue("remind_days", updated);
  };

  if (!mounted) return null;

  return typeof document !== "undefined"
    ? createPortal(
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              key="event-form-drawer-overlay"
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
                key="event-form-drawer-sheet"
                initial={{ y: "100%", opacity: 0.95 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0.95 }}
                transition={{
                  type: "spring",
                  damping: 32,
                  stiffness: 350,
                  mass: 0.8,
                }}
                className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden max-h-[92vh] flex flex-col will-change-transform transform-gpu select-text overscroll-contain"
                onClick={(e) => e.stopPropagation()}
              >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {initialData
                ? "Chỉnh sửa sự kiện"
                : initialDate
                ? `Thêm sự kiện ngày ${initialDate.day}/${initialDate.month}`
                : "Thêm sự kiện mới"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {initialData
                ? "Cập nhật ngày và mốc nhắc nhở"
                : initialDate
                ? `Đang chọn ngày ${initialDate.day} tháng ${initialDate.month}${initialDate.year ? `, ${initialDate.year}` : ""}`
                : "Chỉ mất 10 giây để lưu ngày quan trọng"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5 overscroll-contain">
          {/* 1. Tên người / sự kiện (BẮT BUỘC) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Tên người hoặc sự kiện <span className="text-rose-500">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="VD: Mẹ yêu, Bạn thân Tuấn, Kỷ niệm ngày cưới..."
              className={cn(
                "w-full px-4 py-3 rounded-2xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all",
                errors.name && "border-rose-500 focus:ring-rose-500"
              )}
            />
            {errors.name && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* 2. Loại sự kiện (BẮT BUỘC) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Loại sự kiện <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: "birthday", label: "🎂 Sinh nhật" },
                { type: "anniversary", label: "💍 Kỷ niệm" },
                { type: "memorial", label: "🕯️ Ngày giỗ" },
                { type: "other", label: "🌟 Khác" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => setValue("event_type", item.type as any)}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all",
                    eventType === item.type
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-card hover:bg-muted text-muted-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Ô nhập tên loại sự kiện khi chọn "Khác" */}
            <AnimatePresence>
              {eventType === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2.5 overflow-hidden"
                >
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Tên sự kiện / loại sự kiện là gì? <span className="text-rose-500">*</span>
                  </label>
                  <input
                    {...register("custom_type")}
                    placeholder="VD: Lễ tốt nghiệp, Họp lớp, Tân gia, Thi bằng lái..."
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl bg-secondary/60 border border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium placeholder:text-muted-foreground/60 transition-all",
                      errors.custom_type && "border-rose-500 focus:ring-rose-500"
                    )}
                  />
                  {errors.custom_type && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.custom_type.message}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Ngày, Tháng & Năm sinh (BẮT BUỘC NGÀY/THÁNG) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ngày diễn ra <span className="text-rose-500">*</span>
              </label>

              {/* Toggle Âm lịch nhanh */}
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-primary">
                <input
                  type="checkbox"
                  checked={isLunar}
                  onChange={(e) => setValue("is_lunar", e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>Theo Âm lịch</span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  min={1}
                  max={31}
                  {...register("event_day")}
                  placeholder="Ngày (1-31)"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary text-sm text-center font-bold"
                />
                <span className="block text-[10px] text-muted-foreground text-center mt-1">Ngày</span>
              </div>
              <div>
                <input
                  type="number"
                  min={1}
                  max={12}
                  {...register("event_month")}
                  placeholder="Tháng (1-12)"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary text-sm text-center font-bold"
                />
                <span className="block text-[10px] text-muted-foreground text-center mt-1">Tháng</span>
              </div>
              <div>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  {...register("event_year")}
                  placeholder="Năm"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary text-sm text-center font-bold"
                />
                <span className="block text-[10px] text-muted-foreground text-center mt-1">Năm diễn ra</span>
              </div>
            </div>

            {/* Live conversion banner */}
            {convertedDateText && (
              <div className="mt-2.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{convertedDateText}</span>
              </div>
            )}

            {/* Lặp lại hàng năm */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
              <div>
                <span className="text-xs font-semibold text-foreground block">Lặp lại hàng năm</span>
                <span className="text-[11px] text-muted-foreground block">
                  {repeatYearly ? "Tự động nhắc lại vào ngày này mỗi năm" : "Chỉ diễn ra 1 lần (sự kiện đơn lẻ)"}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register("repeat_yearly")}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Toggle mở rộng: Tùy chọn nâng cao */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "flex items-center justify-between w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition-all duration-200 group active:scale-[0.99] select-none border",
                showAdvanced
                  ? "bg-secondary/70 border-primary/30 text-foreground shadow-xs"
                  : "bg-secondary/35 hover:bg-secondary/60 border-border/60 hover:border-primary/20 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    showAdvanced ? "bg-primary animate-pulse" : "bg-muted-foreground/60 group-hover:bg-primary"
                  )}
                />
                <span>Tùy chọn nâng cao (Nhóm, Mốc nhắc, Ghi chú, Quà tặng)</span>
              </span>
              <motion.span
                animate={{ rotate: showAdvanced ? 180 : 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0 p-0.5"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.26, ease: "easeOut" },
                  }}
                  className="overflow-hidden"
                  style={{ willChange: "height, opacity" }}
                >
                  <div className="space-y-4 pt-3.5 pb-1">
                    {/* Nhóm */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Phân loại nhóm
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { name: "Gia đình", color: "border-rose-400 text-rose-600 dark:text-rose-400" },
                        { name: "Bạn bè", color: "border-amber-400 text-amber-600 dark:text-amber-400" },
                        { name: "Đồng nghiệp", color: "border-indigo-400 text-indigo-600 dark:text-indigo-400" },
                        { name: "Khác", color: "border-emerald-400 text-emerald-600 dark:text-emerald-400" },
                      ].map((grp) => (
                        <button
                          type="button"
                          key={grp.name}
                          onClick={() => setValue("group_name", grp.name as any)}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all",
                            groupName === grp.name
                              ? `bg-secondary font-bold ${grp.color} border-2`
                              : "border-border bg-card text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {grp.name}
                        </button>
                      ))}
                    </div>

                    {/* Ô nhập tên nhóm tùy chỉnh khi chọn "Khác" */}
                    <AnimatePresence>
                      {groupName === "Khác" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -6 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -6 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="mt-3 overflow-hidden"
                        >
                          <div className="p-3 sm:p-3.5 rounded-2xl bg-secondary/35 border border-border/80 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-bold text-foreground">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                Tên phân loại nhóm tùy chỉnh
                              </span>
                              <span className="text-[11px] text-muted-foreground/80 font-normal">Tùy chọn</span>
                            </div>
                            <input
                              {...register("custom_group")}
                              placeholder="VD: Concert, Họ hàng, Đối tác, CLB..."
                              maxLength={50}
                              className={cn(
                                "w-full px-3.5 py-2.5 rounded-xl bg-card border border-border hover:border-border/90 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm font-medium placeholder:text-muted-foreground/50 transition-all",
                                errors.custom_group && "border-rose-500 focus:ring-rose-500"
                              )}
                            />
                            {errors.custom_group && (
                              <p className="text-xs text-rose-500 font-medium">{errors.custom_group.message}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mốc nhắc nhở tùy chỉnh gọn gàng */}
                  <RemindDaysPicker
                    value={remindDays}
                    onChange={(days) => setValue("remind_days", days)}
                  />

                  {/* Thời gian gửi lời nhắc qua email (Chỉ mở con lăn khi bấm vào) */}
                  <div className="pt-1">
                    <IosTimePicker
                      value={remindTime}
                      onChange={(t) => setValue("remind_time", t)}
                    />
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Ghi chú sở thích, thói quen
                    </label>
                    <textarea
                      rows={2}
                      {...register("note")}
                      placeholder="VD: Thích màu tím, thích ăn đồ ngọt, không ăn cay..."
                      className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary text-xs"
                    />
                  </div>

                  {/* Ý tưởng quà tặng */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5" /> Ý tưởng quà tặng
                    </label>
                    <input
                      {...register("gift_idea")}
                      placeholder="VD: Máy massage, áo sơ mi, sách khởi nghiệp..."
                      className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary text-xs"
                    />
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Drawer Actions */}
          <div className="pt-4 border-t border-border flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-2xl border border-border hover:bg-secondary text-muted-foreground font-semibold text-sm transition-colors shrink-0"
            >
              Hủy
            </button>
            <div className="flex-1 flex justify-center items-center">
              <LiquidGlassButton
                type="submit"
                isSubmitting={isSubmitting}
                idleText={initialData ? "Lưu thay đổi" : "Tạo sự kiện"}
                loadingText="Đang lưu..."
                successText={initialData ? "Đã lưu!" : "Đã tạo!"}
                btnWidth="100%"
                btnHeight="48px"
              />
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>,
        document.body
      )
    : null;
}
