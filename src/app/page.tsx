"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Calendar,
  Bell,
  Heart,
  Shield,
  ArrowRight,
  ArrowUpRight,
  Moon,
  Gift,
  Clock,
  CheckCircle2,
  BookOpen,
  Layers,
  ListChecks,
  HelpCircle,
  ChevronDown,
  Mail,
  Users,
  LogIn,
  LogOut,
  Phone,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

const faqs = [
  {
    q: "Ứng dụng Nhắc Sự Kiện (BER) có miễn phí không?",
    a: "Hoàn toàn miễn phí! Bạn có thể lưu trữ không giới hạn ngày sinh nhật, kỷ niệm cưới, ngày giỗ âm lịch, viết nhật ký cảm xúc và nhận email nhắc hẹn tự động mỗi năm mà không tốn bất kỳ chi phí nào.",
  },
  {
    q: "Sự kiện tính theo Âm lịch có tự động đổi sang ngày Dương mỗi năm không?",
    a: "Có. BER tích hợp thuật toán thiên văn Âm lịch Việt Nam (Hồ Ngọc Đức), tự động quy đổi chính xác ngày Âm sang ngày Dương tương ứng của từng năm, xử lý trọn vẹn cả tháng nhuận và ngày sinh 29/02 năm nhuận.",
  },
  {
    q: "Tôi có thể chọn giờ gửi thông báo riêng cho từng mốc nhắc trước không?",
    a: "Hoàn toàn được! Khi bạn chọn từ 2 mốc nhắc trở lên (ví dụ: Trước 7 ngày, Trước 1 ngày và Đúng ngày), hệ thống cho phép thiết lập khung giờ nhận email riêng biệt cho từng mốc — kèm cơ chế gửi bù thông minh để không bao giờ bỏ sót lời nhắc.",
  },
  {
    q: "Dữ liệu sự kiện và nhật ký cá nhân của tôi có được bảo mật không?",
    a: "Tuyệt đối an toàn. Toàn bộ dữ liệu được bảo vệ bằng cơ chế phân quyền Row Level Security (RLS) trên nền tảng đám mây Supabase — chỉ duy nhất tài khoản của bạn mới có quyền truy cập dữ liệu cá nhân của mình.",
  },
];

const navItems = [
  { id: "benefits", label: "Giá trị cốt lõi", icon: Layers },
  { id: "features", label: "Tính năng", icon: Calendar },
  { id: "workflow", label: "Hướng dẫn 3 bước", icon: ListChecks },
  { id: "faq", label: "Giải đáp", icon: HelpCircle },
  { id: "contact", label: "Liên hệ", icon: MessageCircle },
] as const;

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("top");
  const scrollAnimRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const { toast } = useToast();

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    sectionId: string
  ) => {
    e.preventDefault();
    const targetEl =
      sectionId === "top" ? document.body : document.getElementById(sectionId);
    if (!targetEl) return;

    setActiveSection(sectionId);

    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }

    const headerOffset = sectionId === "top" ? 0 : 76;
    const startY = window.scrollY;
    const maxScrollY =
      document.documentElement.scrollHeight - window.innerHeight;
    const rawTargetY =
      sectionId === "top"
        ? 0
        : Math.max(
            0,
            targetEl.getBoundingClientRect().top + window.scrollY - headerOffset
          );
    const targetY = Math.min(rawTargetY, Math.max(0, maxScrollY));
    const distance = targetY - startY;

    if (Math.abs(distance) < 4) return;

    isProgrammaticScrollRef.current = true;
    const duration = Math.min(850, Math.max(520, Math.abs(distance) * 0.35));
    let startTime: number | null = null;

    const cancelOnUserInput = () => {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
      isProgrammaticScrollRef.current = false;
      window.removeEventListener("wheel", cancelOnUserInput);
      window.removeEventListener("touchmove", cancelOnUserInput);
    };

    window.addEventListener("wheel", cancelOnUserInput, {
      passive: true,
      once: true,
    });
    window.addEventListener("touchmove", cancelOnUserInput, {
      passive: true,
      once: true,
    });

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * eased);

      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimRef.current = null;
        isProgrammaticScrollRef.current = false;
        window.removeEventListener("wheel", cancelOnUserInput);
        window.removeEventListener("touchmove", cancelOnUserInput);
        window.history.replaceState(
          null,
          "",
          sectionId === "top" ? window.location.pathname : `#${sectionId}`
        );
      }
    };

    scrollAnimRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const sectionIds = ["benefits", "features", "workflow", "faq", "contact"];

    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);

      if (isProgrammaticScrollRef.current) return;

      if (y < 240) {
        setActiveSection("top");
        return;
      }

      const viewportMid = y + window.innerHeight * 0.36;
      let current = "top";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= viewportMid) {
          current = id;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsLoggedIn(Boolean(session?.user));
      } catch {
        // Bỏ qua nếu chế độ local demo
      }
    };
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const isRemembered = localStorage.getItem("ber_remember_me") === "true";
      if (!isRemembered) {
        localStorage.removeItem("ber_remembered_username");
        localStorage.removeItem("ber_remembered_password");
        localStorage.removeItem("ber_remember_me");
      }
      localStorage.removeItem("ber-user-profile");
      localStorage.removeItem("ber-user-settings");
      localStorage.removeItem("ber-local-events");
    } catch {
      // Bỏ qua lỗi localStorage
    }

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Bỏ qua nếu offline
    }

    setIsLoggedIn(false);
    setIsSigningOut(false);
    toast({
      title: "Đã đăng xuất thành công",
      description: "Hẹn gặp lại bạn!",
      variant: "success",
    });
  };

  return (
    <div
      id="top"
      className="min-h-screen bg-background text-foreground selection:bg-pink-500 selection:text-white overflow-x-hidden scroll-smooth"
    >
      {/* 1. TOP EDITORIAL NAVIGATION */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "py-3.5 bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-lg shadow-black/5"
            : "py-5 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-8 xl:gap-10">
            <a
              href="#top"
              onClick={(e) => scrollToSection(e, "top")}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white text-lg shadow-glow transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
                🎂
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                  Nhắc Sự Kiện
                </span>
                <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  BER
                </span>
              </div>
            </a>

            <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => scrollToSection(e, item.id)}
                    className={`relative px-3.5 py-2 rounded-full transition-colors duration-200 active:scale-95 cursor-pointer ${
                      isActive
                        ? "text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="topNavActivePill"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-primary/12 border border-primary/25 -z-10"
                      />
                    )}
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <ThemeToggle />
            {isLoggedIn ? (
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                className="px-5 py-2.5 rounded-full bg-card hover:bg-rose-500/10 border border-border hover:border-rose-500/40 text-foreground hover:text-rose-500 text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-full gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* 2A. DESKTOP FLOATING BOTTOM EDITORIAL GLASS DOCK */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-center gap-2 p-2 rounded-2xl bg-card/85 dark:bg-[#12121a]/85 backdrop-blur-xl border border-border/80 shadow-2xl">
        <div className="flex items-center gap-1 pr-3 border-r border-border">
          {[
            { id: "top", title: "Đầu trang", icon: Sparkles },
            ...navItems.map((n) => ({ id: n.id, title: n.label, icon: n.icon })),
          ].map((dock) => {
            const Icon = dock.icon;
            const isActive = activeSection === dock.id;
            return (
              <a
                key={dock.id}
                href={`#${dock.id}`}
                onClick={(e) => scrollToSection(e, dock.id)}
                className={`relative p-2.5 rounded-xl transition-all active:scale-90 cursor-pointer ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary hover:bg-secondary/70"
                }`}
                title={dock.title}
              >
                {isActive && (
                  <motion.span
                    layoutId="bottomDockActivePill"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-primary/15 border border-primary/30 -z-10"
                  />
                )}
                <Icon className="w-4 h-4" />
              </a>
            );
          })}
        </div>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 gradient-brand text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-soft hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>Trải nghiệm ngay</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2B. MOBILE COMPACT RIGHT-SIDE GLASS DOCK */}
      <div className="fixed right-2.5 top-1/2 -translate-y-1/2 z-50 flex md:hidden flex-col items-center gap-1 p-1.5 rounded-2xl bg-card/85 dark:bg-[#12121a]/85 backdrop-blur-xl border border-border/80 shadow-2xl">
        {[
          { id: "top", title: "Đầu trang", icon: Sparkles },
          ...navItems.map((n) => ({ id: n.id, title: n.label, icon: n.icon })),
        ].map((dock) => {
          const Icon = dock.icon;
          const isActive = activeSection === dock.id;
          return (
            <a
              key={dock.id}
              href={`#${dock.id}`}
              onClick={(e) => scrollToSection(e, dock.id)}
              aria-label={dock.title}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 cursor-pointer ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="mobileDockActivePill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-primary/15 border border-primary/30 -z-10"
                />
              )}
              <Icon className="w-4 h-4" />
            </a>
          );
        })}

        <div className="w-5 h-px bg-border/80 my-0.5" />

        <Link
          href="/dashboard"
          aria-label="Trải nghiệm ngay"
          title="Trải nghiệm ngay"
          className="w-9 h-9 rounded-xl gradient-brand text-white shadow-soft active:scale-90 transition-all flex items-center justify-center"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 3. HERO SECTION (MIDNIGHT EDITORIAL STYLE) */}
      <header className="relative min-h-screen w-full flex flex-col items-center justify-center px-5 md:px-10 pt-28 pb-28 overflow-hidden">
        {/* Ambient Brand Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full bg-purple-600/15 dark:bg-purple-600/20 blur-[140px]" />
          <div className="absolute top-1/3 right-1/4 w-[420px] h-[420px] rounded-full bg-pink-600/10 dark:bg-pink-500/15 blur-[130px]" />
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Editorial Status Pill */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.12em] sm:tracking-[0.18em] mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shrink-0" />
            <span>Ứng dụng Nhắc Sinh Nhật & Sự Kiện Thông Minh</span>
          </motion.div>

          {/* Editorial Display Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.25rem] font-black tracking-tighter leading-[1.04] text-foreground"
          >
            Không bao giờ bỏ lỡ{" "}
            <br className="hidden sm:block" />
            ngày đặc biệt của{" "}
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">
              những người bạn yêu thương.
            </span>
          </motion.h1>

          {/* Editorial Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-7 text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed font-medium"
          >
            Lưu trữ trọn vẹn sinh nhật, kỷ niệm ngày cưới, ngày giỗ Âm lịch Việt Nam.
            Hệ thống tự động gửi email nhắc hẹn đa khung giờ, lưu giữ nhật ký cảm xúc
            và gợi ý quà tặng chu đáo nhất.
          </motion.p>

          {/* Hero Dual CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto"
          >
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-full gradient-brand text-white font-bold text-sm shadow-glow hover:scale-105 active:scale-95 transition-all"
            >
              <span>Khám phá Ứng dụng ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#workflow"
              onClick={(e) => scrollToSection(e, "workflow")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-card hover:bg-secondary border border-border text-foreground font-bold text-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span>Xem hướng dẫn 3 bước</span>
            </a>
          </motion.div>
        </div>

        {/* Bottom Hero Editorial Overlays (Left & Right) */}
        <div className="hidden sm:flex absolute bottom-10 left-6 md:left-12 items-center gap-4 group z-10">
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full border-2 border-background bg-purple-500/20 text-purple-400 flex items-center justify-center text-base shadow-sm">
              🎂
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-background bg-pink-500/20 text-pink-400 flex items-center justify-center text-base shadow-sm">
              💍
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-background bg-amber-500/20 text-amber-400 flex items-center justify-center text-base shadow-sm">
              🕯️
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-background gradient-brand text-white flex items-center justify-center text-[11px] font-black shadow-sm">
              +99
            </div>
          </div>
          <p className="text-xs font-semibold leading-snug text-muted-foreground group-hover:text-foreground transition-colors">
            Gìn giữ kết nối yêu thương
            <br />
            cho mọi gia đình Việt.
          </p>
        </div>

        <div className="hidden sm:block absolute bottom-10 right-6 md:right-12 text-right z-10">
          <a
            href="mailto:voviet4323@gmail.com"
            className="text-xs font-bold tracking-wider text-foreground hover:text-pink-500 transition-colors border-b-2 border-primary/60 hover:border-pink-500 pb-1 cursor-pointer flex items-center gap-1.5 justify-end"
          >
            <span>voviet4323@gmail.com</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
          </a>
        </div>
      </header>

      {/* 4. EDITORIAL BENEFITS & LIVE MOCKUP SECTION */}
      <section id="benefits" className="py-24 md:py-32 px-5 md:px-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          <span className="text-[11px] font-extrabold tracking-[0.28em] text-muted-foreground uppercase">
            Vì sao hàng ngàn ngày quan trọng cần BER đồng hành?
          </span>
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight text-foreground max-w-5xl mb-16 md:mb-20">
          Đừng để nhịp sống bận rộn khiến bạn{" "}
          <span className="text-muted-foreground/45">vô tình lãng quên</span>{" "}
          những khoảnh khắc vô giá bên người thân.
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {/* Benefit Card 1: Editorial Typography & Multi-Offset Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border/80 rounded-[2.25rem] p-8 sm:p-11 min-h-[480px] flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 transition-all duration-500 shadow-card"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="bg-secondary text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest text-muted-foreground border border-border">
                Đa Mốc Linh Hoạt
              </span>
            </div>

            {/* Interactive Timeline Pills */}
            <div className="my-8 space-y-2.5">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/50 border border-border/70">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Trước 7 ngày — Chuẩn bị quà tặng
                </span>
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg">
                  08:00
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/50 border border-border/70">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  Trước 1 ngày — Soạn sẵn lời chúc
                </span>
                <span className="font-mono text-xs font-bold text-pink-500 bg-pink-500/10 px-2.5 py-0.5 rounded-lg">
                  21:00
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/50 border border-border/70">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Đúng ngày — Trao gửi yêu thương
                </span>
                <span className="font-mono text-xs font-bold text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded-lg">
                  07:00
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-1.5 text-foreground">
                Chủ động trước hạn.
              </h3>
              <h3 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-muted-foreground/40 group-hover:text-primary transition-colors duration-500">
                Trọn vẹn cảm xúc.
              </h3>
            </div>
          </motion.div>

          {/* Benefit Card 2: Brand Gradient + Live App Window Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="gradient-brand rounded-[2.25rem] p-6 sm:p-10 min-h-[480px] flex items-center justify-center relative overflow-hidden group shadow-glow"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/15 blur-3xl pointer-events-none" />

            {/* Browser Window Mockup of Real BER Interface */}
            <div className="w-full max-w-md bg-[#111119] text-white rounded-2xl shadow-2xl border border-white/15 overflow-hidden transform group-hover:scale-[1.03] transition-transform duration-700 ease-out">
              {/* Window Top Bar */}
              <div className="bg-[#181824] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="px-3 py-0.5 rounded-full bg-white/5 text-[10px] font-semibold text-white/60 tracking-wide">
                  ber.app / bảng-điều-khiển
                </div>
                <div className="w-8" />
              </div>

              {/* Window App Body */}
              <div className="p-5 space-y-3.5">
                {/* Today Highlight Mock */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/15 to-rose-500/20 border border-pink-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-lg">
                      🎂
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-pink-400">
                          Diễn ra hôm nay
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                          Âm lịch 15/10
                        </span>
                      </div>
                      <p className="font-bold text-sm text-white mt-0.5">
                        Sinh nhật Mẹ yêu
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
                    Hôm nay 🎉
                  </span>
                </div>

                {/* Second Event Mock */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center text-base">
                      💍
                    </div>
                    <div>
                      <p className="font-bold text-xs text-white">Kỷ niệm ngày cưới</p>
                      <p className="text-[11px] text-white/55">
                        20 tháng 11 • Gia đình
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    Còn 4 ngày
                  </span>
                </div>

                {/* Auto Email Toast Mock */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-[11px] text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Đã tự động gửi Email nhắc hẹn lúc 07:00 sáng!</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. EDITORIAL STAGGERED FEATURE GALLERY */}
      <section id="features" className="py-24 md:py-32 px-5 md:px-10 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-16 md:mb-20 border-b border-border pb-8">
          <div>
            <span className="text-xs font-extrabold tracking-[0.35em] uppercase bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Tính năng chuyên sâu
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground mt-2">
              Thiết kế riêng cho văn hóa & thói quen người Việt
            </h2>
          </div>
          <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
            Phiên bản Pro &mdash; 2026
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-20">
          {/* Feature 01 */}
          <article className="group">
            <div className="aspect-[16/10] overflow-hidden bg-card border border-border/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-card group-hover:border-primary/50 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Moon className="w-3.5 h-3.5" /> Thuật toán Hồ Ngọc Đức
                </span>
                <span className="text-xs font-mono font-bold text-muted-foreground">01</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 my-auto pt-4">
                {[
                  { solar: "14/08", lunar: "02/07 ÂL", label: "Giỗ Ông Nội", active: false },
                  { solar: "25/11", lunar: "16/10 ÂL", label: "Sinh nhật Mẹ", active: true },
                  { solar: "29/02", lunar: "Năm nhuận", label: "SN Bạn thân", active: false },
                ].map((d, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all ${
                      d.active
                        ? "gradient-brand text-white border-transparent shadow-soft scale-105"
                        : "bg-secondary/60 border-border/70 text-foreground"
                    }`}
                  >
                    <p className="text-sm font-black">{d.solar}</p>
                    <p className={`text-[10px] font-semibold ${d.active ? "text-white/85" : "text-muted-foreground"}`}>
                      {d.lunar}
                    </p>
                    <p className={`text-[10px] font-bold mt-2 truncate ${d.active ? "text-white" : "text-primary"}`}>
                      {d.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex justify-between items-start gap-4">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight mb-1.5 group-hover:text-primary transition-colors">
                  Đồng Bộ Âm & Dương Lịch Chuẩn Xác
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  Tự động tính ngày Dương lịch tương ứng cho ngày giỗ, rằm, Tết và sinh nhật Âm lịch mỗi năm; xử lý chính xác tháng nhuận và ngày 29/02.
                </p>
              </div>
              <Link
                href="/calendar"
                className="p-3 rounded-full border border-border shrink-0 group-hover:bg-primary group-hover:text-white group-hover:border-transparent transition-all duration-300"
                aria-label="Mở Lịch Âm Dương"
              >
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </article>

          {/* Feature 02 (Staggered) */}
          <article className="group md:mt-20">
            <div className="aspect-[16/10] overflow-hidden bg-card border border-border/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-card group-hover:border-pink-500/50 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">
                  <Mail className="w-3.5 h-3.5" /> Catch-up Reminder
                </span>
                <span className="text-xs font-mono font-bold text-muted-foreground">02</span>
              </div>
              <div className="my-auto pt-4 space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-bold text-foreground">
                      Thư tổng hợp sự kiện trong ngày
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500">
                    Đã gửi
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold">
                    Trước 3 ngày <span className="text-primary font-mono ml-1">08:30</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold">
                    Trước 1 ngày <span className="text-pink-500 font-mono ml-1">21:00</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold">
                    Đúng ngày <span className="text-rose-500 font-mono ml-1">07:00</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between items-start gap-4">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight mb-1.5 group-hover:text-pink-500 transition-colors">
                  Email Nhắc Hẹn Đa Mốc & Gửi Bù
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  Gộp thông minh nhiều sự kiện trùng ngày vào 1 email tinh gọn. Hỗ trợ chọn giờ riêng cho từng mốc và tự động gửi bù nếu bạn tạo sự kiện muộn.
                </p>
              </div>
              <Link
                href="/events"
                className="p-3 rounded-full border border-border shrink-0 group-hover:bg-pink-500 group-hover:text-white group-hover:border-transparent transition-all duration-300"
                aria-label="Quản lý sự kiện"
              >
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </article>

          {/* Feature 03 */}
          <article className="group">
            <div className="aspect-[16/10] overflow-hidden bg-card border border-border/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-card group-hover:border-amber-500/50 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <BookOpen className="w-3.5 h-3.5" /> Nhật Ký & Quà Tặng
                </span>
                <span className="text-xs font-mono font-bold text-muted-foreground">03</span>
              </div>
              <div className="my-auto pt-4 space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-500">
                    <span>📔 Nhật ký kỷ niệm • 20/10</span>
                    <Gift className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-foreground/90 font-medium line-clamp-2">
                    &ldquo;Mẹ rất thích khăn lụa màu tím nhạt và hoa mẫu đơn. Năm tới nhớ đặt bánh ít ngọt tại tiệm quen...&rdquo;
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-500 text-[11px] font-bold">
                  <Heart className="w-3 h-3 fill-pink-500" /> Kho lời chúc mẫu tinh tế 1-chạm
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between items-start gap-4">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight mb-1.5 group-hover:text-amber-500 transition-colors">
                  Nhật Ký Kỷ Niệm & Gợi Ý Quà Tặng
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  Ghi lại sở thích người thân, ý tưởng quà tặng và viết nhật ký cảm xúc ngay trên từng ô lịch để mỗi mùa kỷ niệm thêm sâu sắc.
                </p>
              </div>
              <Link
                href="/calendar"
                className="p-3 rounded-full border border-border shrink-0 group-hover:bg-amber-500 group-hover:text-white group-hover:border-transparent transition-all duration-300"
                aria-label="Viết nhật ký trên lịch"
              >
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </article>

          {/* Feature 04 (Staggered) */}
          <article className="group md:mt-20">
            <div className="aspect-[16/10] overflow-hidden bg-card border border-border/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-card group-hover:border-emerald-500/50 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Shield className="w-3.5 h-3.5" /> Bảo Mật Đám Mây RLS
                </span>
                <span className="text-xs font-mono font-bold text-muted-foreground">04</span>
              </div>
              <div className="my-auto pt-4 grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-[11px] font-bold text-rose-400">Gia đình</p>
                  <p className="text-lg font-black text-foreground mt-0.5">12 sự kiện</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[11px] font-bold text-amber-400">Bạn bè</p>
                  <p className="text-lg font-black text-foreground mt-0.5">18 sự kiện</p>
                </div>
                <div className="col-span-2 p-2.5 rounded-xl bg-secondary/70 border border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-500" /> Đăng nhập Google OAuth & Mã hóa RLS
                  </span>
                  <span className="text-emerald-500 font-bold">An toàn 100%</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between items-start gap-4">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight mb-1.5 group-hover:text-emerald-500 transition-colors">
                  Phân Nhóm Trực Quan & Bảo Mật Tuyệt Đối
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  Phân loại Gia đình, Bạn bè, Đồng nghiệp hoặc tự tạo nhóm riêng. Đồng bộ xuyên suốt máy tính & điện thoại với chuẩn bảo mật Supabase RLS.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="p-3 rounded-full border border-border shrink-0 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-transparent transition-all duration-300"
                aria-label="Khám phá ngay"
              >
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* 6. BỔ SUNG: QUY TRÌNH 3 BƯỚC ĐƠN GIẢN (#workflow) */}
      <section
        id="workflow"
        className="py-24 md:py-32 px-5 md:px-10 border-t border-border/60 bg-secondary/20"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold tracking-[0.3em] uppercase text-primary">
              Bắt đầu cực dễ dàng
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground mt-3">
              Thiết lập trọn đời chỉ trong 3 bước
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 leading-relaxed">
              Chỉ mất chưa đầy 1 phút cài đặt lần đầu, BER sẽ tự động đồng hành và nhắc hẹn cho bạn qua từng năm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Đăng nhập 1 chạm",
                desc: "Sử dụng ngay tài khoản Google hoặc đăng ký tên tài khoản riêng chỉ trong vài giây mà không cần thủ tục rườm rà.",
                badge: "5 giây",
              },
              {
                step: "02",
                title: "Thêm ngày ý nghĩa",
                desc: "Nhập tên người thân, chọn ngày Dương lịch hoặc Âm lịch, phân nhóm và ghi chú sẵn món quà người ấy yêu thích.",
                badge: "Âm / Dương lịch",
              },
              {
                step: "03",
                title: "Nhận nhắc hẹn đúng giờ",
                desc: "Chọn các mốc nhắc trước (7, 3, 1 hoặc đúng ngày) kèm giờ gửi riêng. Đến hẹn, email tinh tế sẽ gửi thẳng tới hộp thư của bạn.",
                badge: "Tự động 24/7",
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 rounded-[2rem] bg-card border border-border/80 shadow-card flex flex-col justify-between hover:border-primary/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. BỔ SUNG: CÂU HỎI THƯỜNG GẶP (FAQ ACCORDION) */}
      <section id="faq" className="py-24 md:py-32 px-5 md:px-10 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-extrabold tracking-[0.3em] uppercase text-pink-500">
            Giải đáp thắc mắc
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-2.5">
            Câu hỏi thường gặp
          </h2>
        </div>

        <div className="space-y-3.5">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-3xl border transition-all ${
                  isOpen
                    ? "bg-card border-primary/40 shadow-card"
                    : "bg-card/60 border-border/70 hover:border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-bold text-sm sm:text-base text-foreground">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3.5">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. LIÊN HỆ & KẾT NỐI (CONTACT SECTION) */}
      <section id="contact" className="py-14 sm:py-20 md:py-32 px-4 sm:px-6 md:px-10 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 md:mb-14">
          <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-[11px] font-extrabold tracking-widest uppercase mb-3 md:mb-4">
            <MessageCircle className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span>KẾT NỐI & HỖ TRỢ TRỰC TIẾP</span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
            Liên hệ với chúng tôi
          </h2>
          <p className="mt-2.5 md:mt-4 text-xs sm:text-base text-muted-foreground leading-relaxed font-medium">
            Chúng tôi luôn sẵn sàng lắng nghe mọi góp ý, hỗ trợ bạn thiết lập lịch nhắc hẹn và giải đáp mọi thắc mắc 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          {/* Card 1: Facebook */}
          <a
            href="https://www.facebook.com/quocviet43"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative p-4 sm:p-5 md:p-8 rounded-2xl md:rounded-3xl bg-card/70 hover:bg-card border border-border/80 hover:border-blue-500/50 shadow-card hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-28 md:w-32 h-28 md:h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
            <div>
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center text-lg md:text-2xl mb-3 md:mb-6 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
                <svg className="w-5 h-5 md:w-7 md:h-7 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest text-blue-500">Mạng xã hội</span>
              <h3 className="text-base sm:text-lg md:text-xl font-black text-foreground mt-0.5 md:mt-1 mb-1 md:mb-2 group-hover:text-blue-500 transition-colors">
                Facebook
              </h3>
              <p className="text-[11px] md:text-xs text-muted-foreground leading-normal md:leading-relaxed">
                Nhắn tin trực tiếp qua trang cá nhân Facebook để được hỗ trợ nhanh nhất.
              </p>
            </div>
            <div className="mt-3 md:mt-8 pt-3 md:pt-4 border-t border-border/60 flex items-center justify-between text-[11px] md:text-xs font-bold text-foreground group-hover:text-blue-500">
              <span className="truncate">facebook.com/quocviet43</span>
              <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </a>

          {/* Card 2: SĐT / Zalo */}
          <div className="group relative p-4 sm:p-5 md:p-8 rounded-2xl md:rounded-3xl bg-card/70 hover:bg-card border border-border/80 hover:border-emerald-500/50 shadow-card hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute -top-12 -right-12 w-28 md:w-32 h-28 md:h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div>
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-lg md:text-2xl mb-3 md:mb-6 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                <Phone className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              <span className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest text-emerald-500">Điện thoại & Zalo</span>
              <h3 className="text-base sm:text-lg md:text-xl font-black text-foreground mt-0.5 md:mt-1 mb-1 md:mb-2 group-hover:text-emerald-500 transition-colors">
                0367 020 403
              </h3>
              <p className="text-[11px] md:text-xs text-muted-foreground leading-normal md:leading-relaxed">
                Kết nối trực tiếp qua Zalo hoặc gọi hotline khi cần hỗ trợ tức thì.
              </p>
            </div>
            <div className="mt-3 md:mt-8 pt-3 md:pt-4 border-t border-border/60 flex items-center gap-2">
              <a
                href="https://zalo.me/0367020403"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 md:py-2.5 px-2.5 md:px-3 rounded-lg md:rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white text-[11px] md:text-xs font-bold text-center transition-all flex items-center justify-center gap-1"
              >
                <span>Nhắn Zalo</span>
                <ArrowUpRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
              </a>
              <a
                href="tel:0367020403"
                className="flex-1 py-2 md:py-2.5 px-2.5 md:px-3 rounded-lg md:rounded-xl bg-secondary hover:bg-emerald-500 hover:text-white text-foreground text-[11px] md:text-xs font-bold text-center transition-all flex items-center justify-center gap-1"
              >
                <span>Gọi điện</span>
                <Phone className="w-3 h-3 md:w-3.5 md:h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 3: Email */}
          <a
            href="mailto:voviet4323@gmail.com"
            className="group relative p-4 sm:p-5 md:p-8 rounded-2xl md:rounded-3xl bg-card/70 hover:bg-card border border-border/80 hover:border-pink-500/50 shadow-card hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-28 md:w-32 h-28 md:h-32 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all pointer-events-none" />
            <div>
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-500 flex items-center justify-center text-lg md:text-2xl mb-3 md:mb-6 group-hover:scale-110 group-hover:bg-pink-500 group-hover:text-white transition-all shadow-sm">
                <Mail className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              <span className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest text-pink-500">Hộp thư điện tử</span>
              <h3 className="text-base sm:text-lg md:text-xl font-black text-foreground mt-0.5 md:mt-1 mb-1 md:mb-2 group-hover:text-pink-500 transition-colors">
                Email Hỗ Trợ
              </h3>
              <p className="text-[11px] md:text-xs text-muted-foreground leading-normal md:leading-relaxed">
                Gửi góp ý, phản hồi kỹ thuật hoặc đề xuất tính năng mới cho BER.
              </p>
            </div>
            <div className="mt-3 md:mt-8 pt-3 md:pt-4 border-t border-border/60 flex items-center justify-between text-[11px] md:text-xs font-bold text-foreground group-hover:text-pink-500">
              <span className="truncate">voviet4323@gmail.com</span>
              <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </a>
        </div>
      </section>

      {/* 9. MINIMAL EDITORIAL FOOTER */}
      <footer className="py-10 pb-28 md:pb-24 px-5 md:px-10 border-t border-border/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-muted-foreground">
          <p className="tracking-tight text-center sm:text-left">
            &copy; 2026 <strong className="text-foreground font-bold">Nhắc Sự Kiện (BER)</strong>. Gìn giữ kết nối yêu thương cho mọi gia đình.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {[
              { id: "benefits", label: "Giá trị" },
              { id: "features", label: "Tính năng" },
              { id: "workflow", label: "3 Bước" },
              { id: "faq", label: "Giải đáp" },
              { id: "contact", label: "Liên hệ" },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => scrollToSection(e, item.id)}
                className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-all cursor-pointer text-xs"
              >
                {item.label}
              </a>
            ))}

            <div className="w-px h-3.5 bg-border mx-1 hidden sm:block" />

            <a
              href="#top"
              onClick={(e) => scrollToSection(e, "top")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-primary/10 border border-border/80 hover:border-primary/40 text-foreground hover:text-primary transition-all font-semibold cursor-pointer shadow-2xs active:scale-95"
            >
              <span>Đầu trang</span>
              <span className="text-primary font-bold">↑</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
