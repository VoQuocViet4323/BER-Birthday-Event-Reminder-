import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/ui/toast";
import { NavigationProgress } from "@/components/common/navigation-progress";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#8b5cf6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Nhắc Sinh Nhật & Sự Kiện (BER) | Ghi nhớ ngày quan trọng",
  description:
    "Ứng dụng lưu trữ và tự động nhắc nhở sinh nhật, ngày kỷ niệm, ngày giỗ của người thân, bạn bè qua email với giao diện trẻ trung, hỗ trợ cả âm lịch và dương lịch.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Nhắc Sinh Nhật & Sự Kiện (BER)",
    description: "Không bao giờ bỏ lỡ sinh nhật của những người bạn yêu thương",
    type: "website",
    locale: "vi_VN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${beVietnamPro.className} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider>
          <AppQueryProvider>
            <ToastProvider>
              <NavigationProgress />
              {children}
            </ToastProvider>
          </AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
