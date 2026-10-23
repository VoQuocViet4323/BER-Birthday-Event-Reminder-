"use client";

import Link from "next/link";
import { Sparkles, Calendar, Bell, Heart, Shield, ArrowRight, Moon, Gift } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between overflow-hidden">
      {/* Navbar đơn giản */}
      <header className="container max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center text-white text-xl shadow-glow">
            🎂
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 bg-clip-text text-transparent">
            Nhắc Sự Kiện
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-bold px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          >
            Đăng nhập
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-bold px-5 py-2.5 rounded-full gradient-brand text-white shadow-soft hover:shadow-soft-hover hover:scale-105 active:scale-95 transition-all"
          >
            Trải nghiệm ngay →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container max-w-5xl mx-auto px-4 py-12 md:py-20 text-center flex-1 flex flex-col items-center justify-center">
        {/* Floating pill badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ứng dụng Nhắc Sinh Nhật & Sự Kiện Thông Minh</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl"
        >
          Không bao giờ bỏ lỡ ngày đặc biệt của{" "}
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent">
            những người bạn yêu thương
          </span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-sm sm:text-lg text-muted-foreground max-w-2xl leading-relaxed"
        >
          Lưu trữ ngày sinh nhật, kỷ niệm cưới, ngày giỗ âm lịch. Hệ thống tự động gửi email nhắc nhở trước ngày diễn ra, chuẩn bị lời chúc và quà tặng chu đáo nhất.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
        >
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full gradient-brand text-white font-bold text-sm shadow-soft hover:shadow-soft-hover hover:scale-105 active:scale-95 transition-all"
          >
            <span>Khám phá Ứng dụng ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/onboarding"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border text-foreground font-bold text-sm transition-all"
          >
            <span>Xem hướng dẫn 3 bước</span>
          </Link>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 text-left w-full"
        >
          <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-card">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3">
              <Moon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Hỗ trợ Âm & Dương lịch</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tự động quy đổi ngày âm sang dương mỗi năm, xử lý tháng nhuận và sinh nhật ngày 29/02 chuẩn xác.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-card">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Email nhắc nhở linh hoạt</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Gộp sự kiện cùng ngày thành 1 thư tổng hợp. Nhắc trước 7, 3, 1 hoặc đúng ngày theo múi giờ riêng.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-card">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Gợi ý quà & Lời chúc</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Ghi chú sở thích, mẫu lời chúc soạn sẵn theo từng phong cách, mở nhanh Zalo/Messenger 1-chạm.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-card">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Bảo mật RLS & Offline PWA</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Bảo mật Row Level Security của Supabase. Cài đặt trực tiếp lên điện thoại, xem dữ liệu cả khi mất mạng.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Nhắc Sinh Nhật & Sự Kiện (BER). Giao diện tối ưu trải nghiệm mượt mà.</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-foreground">Bảng điều khiển</Link>
            <Link href="/events" className="hover:text-foreground">Sự kiện</Link>
            <Link href="/settings" className="hover:text-foreground">Cài đặt</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
