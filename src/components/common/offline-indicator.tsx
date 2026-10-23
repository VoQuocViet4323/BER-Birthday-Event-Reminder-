"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-white backdrop-blur-md px-4 py-1.5 text-xs font-medium text-center flex items-center justify-center gap-2 shadow-sm"
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Bạn đang ở chế độ ngoại tuyến (Offline). Dữ liệu được lưu trên máy và sẽ đồng bộ khi có mạng lại.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
