"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEvents } from "@/hooks/use-events";
import { useUserSettings } from "@/hooks/use-user-settings";
import { User, Bell, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { addEvent } = useEvents();
  const { updateSettings } = useUserSettings();

  // Step 1 State
  const [name, setName] = useState("Mẹ yêu");
  const [eventType, setEventType] = useState<"birthday" | "anniversary" | "memorial" | "other">("birthday");
  const [eventDay, setEventDay] = useState(25);
  const [eventMonth, setEventMonth] = useState(10);
  const [groupName, setGroupName] = useState<"Gia đình" | "Bạn bè" | "Đồng nghiệp" | "Khác">("Gia đình");

  // Step 2 State
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>([7, 3, 1, 0]);
  const [remindTime, setRemindTime] = useState("08:00");

  const handleFinish = async () => {
    // Lưu sự kiện đầu tiên
    await addEvent({
      name,
      event_type: eventType,
      event_day: Number(eventDay),
      event_month: Number(eventMonth),
      event_year: null,
      is_lunar: false,
      group_name: groupName,
      repeat_yearly: true,
      enabled: true,
    });

    // Cập nhật cấu hình
    await updateSettings({
      default_remind_days: selectedOffsets,
      remind_time: remindTime,
    });

    router.push("/dashboard");
  };

  const toggleOffset = (offset: number) => {
    if (selectedOffsets.includes(offset)) {
      setSelectedOffsets(selectedOffsets.filter((o) => o !== offset));
    } else {
      setSelectedOffsets([...selectedOffsets, offset].sort((a, b) => b - a));
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-xl bg-card rounded-3xl border border-border shadow-2xl p-6 sm:p-8">
        {/* Progress Stepper Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Bước {step} trên 3
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {step === 1 && "Thêm người thân yêu đầu tiên"}
              {step === 2 && "Chọn mốc nhắc nhở phù hợp"}
              {step === 3 && "Sẵn sàng nhận thông báo!"}
            </h1>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Bỏ qua →
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                step >= s ? "gradient-brand" : "bg-secondary"
              )}
            />
          ))}
        </div>

        {/* Step Contents */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">
                  Tên người hoặc sự kiện
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Mẹ yêu, Bạn thân, Vợ..."
                  className="w-full px-4 py-3 rounded-2xl bg-secondary/50 border border-border text-sm font-semibold focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">
                  Ngày và tháng
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={eventDay}
                      onChange={(e) => setEventDay(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-bold text-center"
                    />
                    <span className="block text-[10px] text-muted-foreground text-center mt-1">Ngày</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={eventMonth}
                      onChange={(e) => setEventMonth(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-bold text-center"
                    />
                    <span className="block text-[10px] text-muted-foreground text-center mt-1">Tháng</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">
                  Thuộc nhóm
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["Gia đình", "Bạn bè", "Đồng nghiệp", "Khác"] as const).map((grp) => (
                    <button
                      type="button"
                      key={grp}
                      onClick={() => setGroupName(grp)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-semibold border transition-all text-center",
                        groupName === grp
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {grp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover transition-all"
                >
                  <span>Tiếp theo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                  Nhắc trước bao nhiêu ngày?
                </label>
                <div className="flex flex-wrap gap-2">
                  {[14, 7, 3, 1, 0].map((offset) => {
                    const isSelected = selectedOffsets.includes(offset);
                    return (
                      <button
                        type="button"
                        key={offset}
                        onClick={() => toggleOffset(offset)}
                        className={cn(
                          "px-4 py-2 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-secondary text-muted-foreground border-border hover:bg-muted"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {offset === 0 ? "Đúng ngày (0)" : `Trước ${offset} ngày`}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Mẹo: Chọn nhắc trước 7 ngày và 1 ngày giúp bạn có đủ thời gian chuẩn bị quà!
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">
                  Thời gian gửi email hàng ngày
                </label>
                <input
                  type="time"
                  value={remindTime}
                  onChange={(e) => setRemindTime(e.target.value)}
                  className="w-40 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-bold text-center"
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border text-xs font-semibold hover:bg-secondary"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover transition-all"
                >
                  <span>Tiếp theo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center py-4"
            >
              <div className="w-16 h-16 rounded-3xl gradient-brand text-white flex items-center justify-center mx-auto text-3xl shadow-glow">
                ✨
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">Thiết lập hoàn tất!</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                  Chúng tôi sẽ tự động theo dõi và gửi email nhắc nhở về chính xác ngày kỷ niệm của <strong>{name}</strong> đúng vào lúc <strong>{remindTime}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/50 border border-border text-left text-xs space-y-1.5 max-w-sm mx-auto">
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sự kiện:</span>
                  <span className="font-bold text-foreground">{name}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ngày diễn ra:</span>
                  <span className="font-bold text-foreground">{eventDay}/{eventMonth}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mốc nhắc nhở:</span>
                  <span className="font-bold text-primary">Trước {selectedOffsets.join(", ")} ngày</span>
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border text-xs font-semibold hover:bg-secondary"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu khám phá Dashboard</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
