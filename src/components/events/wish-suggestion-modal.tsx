"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { EventWithMeta } from "@/types/events";
import {
  X,
  Copy,
  Check,
  Send,
  MessageCircle,
  Sparkles,
  Heart,
  Shuffle,
  Smile,
  Briefcase,
  Globe,
  Home,
  Flame,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";

interface WishSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventWithMeta | null;
}

interface WishCategory {
  id: string;
  label: string;
  icon: any;
}

export function WishSuggestionModal({
  isOpen,
  onClose,
  event,
}: WishSuggestionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Khóa cuộn trang khi mở modal
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab về 'all' mỗi khi mở modal cho sự kiện mới
  useEffect(() => {
    if (isOpen) {
      setActiveCategory("all");
      setSearchQuery("");
    }
  }, [isOpen, event?.id]);

  const targetName = event?.name || "Bạn";
  const upcomingAge = event?.upcomingAge;
  const isAnniversary = event?.event_type === "anniversary";
  const isBirthday = !isAnniversary; // Mặc định hoặc sinh nhật

  // Danh mục tab hiển thị theo đúng ngữ cảnh loại sự kiện
  const categories: WishCategory[] = useMemo(() => {
    if (isAnniversary) {
      return [
        { id: "all", label: "Tất cả", icon: Sparkles },
        { id: "romantic", label: "Ngọt ngào & Lãng mạn", icon: Flame },
        { id: "heartwarming", label: "Gắn kết & Bền lâu", icon: Heart },
        { id: "funny", label: "Hài hước & Vui vẻ", icon: Smile },
        { id: "formal", label: "Trang trọng & Lịch thiệp", icon: Briefcase },
        { id: "english", label: "Tiếng Anh (English)", icon: Globe },
      ];
    }

    // Danh mục cho Sinh nhật
    return [
      { id: "all", label: "Tất cả", icon: Sparkles },
      { id: "heartwarming", label: "Ấm áp & Chân thành", icon: Heart },
      { id: "funny", label: "Hài hước & Vui tươi", icon: Smile },
      { id: "formal", label: "Trang trọng (Sếp / Đối tác)", icon: Briefcase },
      { id: "family", label: "Gia đình & Người thân", icon: Home },
      { id: "romantic", label: "Người yêu & Crush", icon: Flame },
      { id: "english", label: "Tiếng Anh (English)", icon: Globe },
    ];
  }, [isAnniversary]);

  // Bộ sưu tập lời chúc được chọn lọc kỹ lưỡng theo loại sự kiện
  const rawWishes = useMemo(() => {
    const ageText = upcomingAge && upcomingAge > 0 ? ` bước sang tuổi ${upcomingAge}` : "";
    const ageTag = upcomingAge && upcomingAge > 0 ? ` tuổi ${upcomingAge}` : "";

    // -------------------------------------------------------------
    // KHO LỜI CHÚC DÀNH CHO: KỶ NIỆM (ANNIVERSARY)
    // -------------------------------------------------------------
    if (isAnniversary) {
      return [
        // Ngọt ngào & Lãng mạn
        {
          id: "anni-1",
          category: "romantic",
          title: "Món quà tuyệt vời nhất",
          text: `Cảm ơn cuộc đời vì đã mang ${targetName} đến bên anh/em. Chúc cho ngày kỷ niệm hôm nay và mọi ngày về sau của chúng mình luôn ngập tràn yêu thương, thấu hiểu và hạnh phúc đong đầy! 💖💍🥂`,
        },
        {
          id: "anni-2",
          category: "romantic",
          title: "Vẹn nguyên như ngày đầu",
          text: `Chúc mừng ngày kỷ niệm của chúng ta! Dù thời gian trôi qua, tình cảm dành cho ${targetName} vẫn vẹn nguyên và sâu sắc như ngày đầu tiên. Cùng nhau nắm tay đi thật xa trên chặng đường phía trước nhé! 🌹✨`,
        },
        {
          id: "anni-3",
          category: "romantic",
          title: "Bình yên bên người thương",
          text: `Nhân ngày kỷ niệm đặc biệt này, gửi đến ${targetName} ngàn cái ôm ấm áp. Hạnh phúc lớn nhất là mỗi ngày được cùng bạn chia sẻ mọi buồn vui của cuộc sống. Yêu bạn thật nhiều! 🥰💌`,
        },
        {
          id: "anni-4",
          category: "romantic",
          title: "Bản tình ca hạnh phúc",
          text: `Mỗi khoảnh khắc có ${targetName} bên cạnh đều là một kỷ niệm vô giá. Chúc cho tình yêu của chúng ta luôn rực rỡ, ngọt ngào và bền chặt theo năm tháng! 🥂🍰❤️`,
        },

        // Gắn kết & Bền lâu
        {
          id: "anni-5",
          category: "heartwarming",
          title: "Gắn bó bền chặt",
          text: `Chúc mừng ngày kỷ niệm đáng nhớ của ${targetName}! Chúc cho sự gắn kết này luôn bền vững, tràn ngập niềm vui, sự sẻ chia và cùng nhau xây dựng thêm nhiều ký ức tuyệt vời! 🌿💎`,
        },
        {
          id: "anni-6",
          category: "heartwarming",
          title: "Mãi mãi bên nhau",
          text: `Chúc mừng ngày kỷ niệm! Cảm ơn ${targetName} vì đã luôn đồng hành, lắng nghe và là chỗ dựa vững chắc. Chúc tình cảm của chúng ta ngày càng đơm hoa kết trái! 🌸✨`,
        },

        // Hài hước & Vui vẻ
        {
          id: "anni-7",
          category: "funny",
          title: "Hợp đồng dài hạn không hủy",
          text: `Chúc mừng ngày kỷ niệm! Chúc ${targetName} tiếp tục kiên nhẫn chịu đựng và bao dung mình thêm thật nhiều năm nữa nhé. Hợp đồng này đã ký là trọn đời, miễn đổi trả nha! 🤣🎉🍻`,
        },
        {
          id: "anni-8",
          category: "funny",
          title: "Vượt qua thử thách xuất sắc",
          text: `Thêm một năm cùng nhau vượt qua bao 'sóng gió' gia đình/tình yêu! Chúc ${targetName} luôn vui vẻ, đáng yêu và tối nay nhớ thưởng một bữa ăn thịnh soạn nhé! 🍕🥳🍾`,
        },

        // Trang trọng & Lịch thiệp
        {
          id: "anni-9",
          category: "formal",
          title: "Chúc mừng Kỷ niệm Hạnh phúc",
          text: `Xin gửi lời chúc mừng chân thành và nồng nhiệt nhất nhân ngày kỷ niệm đặc biệt của ${targetName}. Kính chúc bạn luôn ngập tràn niềm vui, an khang và hạnh phúc viên mãn! 💐🌟`,
        },
        {
          id: "anni-10",
          category: "formal",
          title: "Hợp tác & Đồng hành bền vững",
          text: `Nhân dấu mốc kỷ niệm ý nghĩa này, kính chúc ${targetName} tiếp tục gặt hái nhiều thành công rực rỡ và luôn giữ vững tinh thần hợp tác, đồng hành bền lâu! 🤝💼🎯`,
        },

        // Tiếng Anh (English)
        {
          id: "anni-11",
          category: "english",
          title: "Happy Anniversary",
          text: `Happy Anniversary to ${targetName}! Wishing you a lifetime of endless love, cherished memories, and lasting happiness together! 💍🍾❤️`,
        },
        {
          id: "anni-12",
          category: "english",
          title: "Forever & Always",
          text: `Another year of creating beautiful memories together. Happy Anniversary, ${targetName}! Here's to many more wonderful years ahead! 🥂🌹✨`,
        },
      ];
    }

    // -------------------------------------------------------------
    // KHO LỜI CHÚC DÀNH CHO: SINH NHẬT (BIRTHDAY)
    // -------------------------------------------------------------
    return [
      // 1. Ấm áp & Chân thành
      {
        id: "bday-1",
        category: "heartwarming",
        title: "Bình an & Rực rỡ",
        text: `Chúc mừng sinh nhật ${targetName}! Chúc bạn${ageText} luôn ngập tràn bình an, hạnh phúc và gặt hái được mọi ước mơ đã ấp ủ nhé! 🎉✨💐`,
      },
      {
        id: "bday-2",
        category: "heartwarming",
        title: "Nụ cười rạng rỡ",
        text: `Chúc ${targetName} có một ngày sinh nhật thật trọn vẹn và ấm áp bên những người thân yêu. Mong nụ cười rạng rỡ sẽ luôn đồng hành cùng bạn trên mọi nẻo đường! 🌸💖`,
      },
      {
        id: "bday-3",
        category: "heartwarming",
        title: "Tuổi mới vạn điều may",
        text: `Chúc mừng sinh nhật ${targetName}${ageTag}! Chúc bạn tuổi mới luôn dồi dào sức khỏe, may mắn, công việc hanh thông và luôn giữ trọn niềm lạc quan yêu đời! 🎂🥂`,
      },
      {
        id: "bday-4",
        category: "heartwarming",
        title: "Những điều tốt đẹp nhất",
        text: `Gửi đến ${targetName} những lời chúc sinh nhật chân thành nhất. Chúc bạn luôn được yêu thương, trân trọng và mỗi ngày trôi qua đều là một ngày ngập tràn niềm vui! 🎈🌟`,
      },

      // 2. Hài hước & Vui tươi
      {
        id: "bday-5",
        category: "funny",
        title: "Bớt âu lo - Tiền vô như nước",
        text: `Happy Birthday ${targetName}! Thêm tuổi mới chúc bớt âu lo, tiền vô như nước sông Đà, tiền ra nhỏ giọt như cà phê phin, nhan sắc thì thăng hoa không phanh nhé! 🥳🍻💸`,
      },
      {
        id: "bday-6",
        category: "funny",
        title: "Tâm hồn mãi tuổi 18",
        text: `Chúc mừng ${targetName} lại già thêm 1 tuổi nhưng tâm hồn lúc nào cũng phơi phới như tuổi 18! Mau mau mở tiệc chiêu đãi anh em bạn bè đi nào! 🎂🍕🎉`,
      },
      {
        id: "bday-7",
        category: "funny",
        title: "KPI hoàn thành 300%",
        text: `Chúc mừng ngày sinh nhật của ${targetName}! Tuổi mới chúc bạn sớm thành đại gia, KPI chạy ào ào vượt chỉ tiêu 300% và sớm mời mình đi ăn khao nhé! 🚀🍾`,
      },
      {
        id: "bday-8",
        category: "funny",
        title: "Sớm thoát kiếp độc thân",
        text: `Sinh nhật vui vẻ nha ${targetName}! Chúc tuổi mới xinh đẹp/đẹp trai gấp bội, công việc phất lên như diều gặp gió và quan trọng nhất là mau mau thoát ế nhé! 💘😆`,
      },

      // 3. Trang trọng (Sếp / Đối tác / Đồng nghiệp)
      {
        id: "bday-9",
        category: "formal",
        title: "Kính chúc Sức khỏe & Thành công",
        text: `Nhân dịp sinh nhật của ${targetName}, kính chúc bạn luôn dồi dào sức khỏe, hạnh phúc viên mãn và gặt hái thêm nhiều thành tựu rực rỡ trên con đường sự nghiệp! 🌟💐`,
      },
      {
        id: "bday-10",
        category: "formal",
        title: "Công việc Hanh thông",
        text: `Kính chúc ${targetName} một ngày sinh nhật thật ý nghĩa và trọn vẹn. Chúc bạn luôn giữ vững nhiệt huyết, bản lĩnh và tiếp tục gặt hái nhiều thắng lợi mới trong công việc! 💼🎯`,
      },
      {
        id: "bday-11",
        category: "formal",
        title: "Vạn sự như ý",
        text: `Xin gửi đến ${targetName} lời chúc mừng sinh nhật trân trọng nhất. Chúc bạn cùng gia đình luôn an khang thịnh vượng, vạn sự như ý và tràn đầy năng lượng tích cực! 🎊🌿`,
      },

      // 4. Gia đình & Người thân
      {
        id: "bday-12",
        category: "family",
        title: "Mái ấm bình yên",
        text: `Chúc mừng sinh nhật ${targetName}! Cả nhà chúc bạn luôn mạnh khỏe, bình an, gặp nhiều may mắn và luôn nhớ rằng gia đình luôn là chỗ dựa vững chắc nhất nhé! 🏡❤️👨‍👩‍👧‍👦`,
      },
      {
        id: "bday-13",
        category: "family",
        title: "Yêu thương đong đầy",
        text: `Chúc mừng sinh nhật ${targetName}! Chúc bạn tuổi mới luôn vui vẻ, học tập/công tác tốt và mãi là niềm tự hào to lớn của cả gia đình! 🎂🎁🍀`,
      },

      // 5. Người yêu & Crush
      {
        id: "bday-14",
        category: "romantic",
        title: "Hạnh phúc giản đơn",
        text: `Gửi đến người đặc biệt nhất trong tim! Chúc ${targetName} một ngày sinh nhật thật ngọt ngào. Hãy luôn mỉm cười vì nụ cười của bạn là điều ấm áp nhất với mình! 🍰💌🥰`,
      },
      {
        id: "bday-15",
        category: "romantic",
        title: "Bên nhau trọn vẹn",
        text: `Chúc mừng sinh nhật ${targetName}! Chúc cho mọi ước muốn của bạn hôm nay đều thành hiện thực, và mong rằng trong mọi sinh nhật về sau đều có mình ở cạnh! 💖🎈`,
      },

      // 6. Tiếng Anh (English)
      {
        id: "bday-16",
        category: "english",
        title: "Warmest Birthday Wishes",
        text: `Happy Birthday, ${targetName}! Wishing you a year ahead filled with happiness, great health, and tremendous success. May all your dreams come true! 🎂🎉✨`,
      },
      {
        id: "bday-17",
        category: "english",
        title: "Cheers to Another Year",
        text: `Cheers to another wonderful year around the sun! Wishing you, ${targetName}, countless moments of joy, love, and laughter today and always! 🥂🎈💖`,
      },
      {
        id: "bday-18",
        category: "english",
        title: "Short & Sweet",
        text: `Happy Birthday to someone who brings so much sunshine to those around! Have a fabulous celebration, ${targetName}! 🌟🎁🥳`,
      },
    ];
  }, [targetName, upcomingAge, isAnniversary]);

  // Lọc lời chúc theo Tab và Tìm kiếm
  const filteredWishes = useMemo(() => {
    return rawWishes.filter((wish) => {
      const matchCategory =
        activeCategory === "all" || wish.category === activeCategory;
      const matchSearch =
        searchQuery.trim() === "" ||
        wish.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wish.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [rawWishes, activeCategory, searchQuery]);

  // Sao chép lời chúc
  const handleCopyWish = (text: string, id: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedId(id);
      toast({
        title: "Đã sao chép lời chúc! ✨",
        description: "Bạn có thể dán ngay vào Zalo, Messenger hoặc SMS.",
        variant: "success",
      });
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast({
        title: "Chưa sao chép được",
        description: "Vui lòng chọn thủ công để sao chép.",
        variant: "error",
      });
    }
  };

  // Chọn ngẫu nhiên 1 lời chúc để sao chép nhanh
  const handleShufflePick = () => {
    if (filteredWishes.length === 0) return;
    const randomIdx = Math.floor(Math.random() * filteredWishes.length);
    const chosen = filteredWishes[randomIdx];
    handleCopyWish(chosen.text, chosen.id);
  };

  if (!mounted || typeof document === "undefined") return null;

  const modalBadgeIcon = isAnniversary ? "💍" : "🎂";
  const modalTypeTitle = isAnniversary ? "Lời chúc Kỷ niệm" : "Lời chúc Sinh nhật";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 select-none">
          {/* Backdrop mờ nền */}
          <motion.div
            key="wish-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
            aria-label="Đóng bảng gợi ý lời chúc"
          />

          {/* Modal Container */}
          <motion.div
            key="wish-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-card rounded-3xl border border-border shadow-2xl overflow-hidden z-10"
          >
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-border/80 bg-gradient-to-r from-primary/10 via-purple-500/5 to-pink-500/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-md shrink-0">
                    {modalBadgeIcon}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-foreground tracking-tight flex items-center gap-1.5">
                      <span>{modalTypeTitle} cho</span>
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {targetName}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isAnniversary
                        ? "Tuyển tập những mẫu lời chúc kỷ niệm ngọt ngào và gắn kết"
                        : "Tuyển tập những mẫu lời chúc sinh nhật ấm áp, vui tươi và ý nghĩa"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleShufflePick}
                    className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-primary hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Chọn & sao chép ngẫu nhiên một lời chúc"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-secondary/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Thanh tìm kiếm nhanh */}
              <div className="relative mt-3">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isAnniversary
                      ? "Tìm kiếm lời chúc kỷ niệm (lãng mạn, hài hước, bền lâu...)"
                      : "Tìm kiếm lời chúc sinh nhật (ấm áp, hài hước, sếp, gia đình...)"
                  }
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-background/90 border border-border/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Thanh chọn Danh Mục / Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 -mb-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                          : "bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thân danh sách Lời chúc */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 max-h-[55vh]">
              {filteredWishes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <div className="text-3xl">🔍</div>
                  <p className="text-sm font-semibold">Không tìm thấy mẫu lời chúc phù hợp</p>
                  <p className="text-xs">Thử chuyển danh mục hoặc xóa từ khóa tìm kiếm nhé!</p>
                </div>
              ) : (
                filteredWishes.map((wish) => {
                  const isCopied = copiedId === wish.id;
                  return (
                    <motion.div
                      key={wish.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/70 hover:border-primary/40 p-4 transition-all shadow-xs"
                    >
                      {/* Tiêu đề & Nút thao tác sao chép */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          {wish.title}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopyWish(wish.text, wish.id)}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer ${
                            isCopied
                              ? "bg-emerald-500 text-white"
                              : "bg-card hover:bg-primary hover:text-white text-foreground border border-border/80 group-hover:border-primary/30"
                          }`}
                          title="Sao chép lời chúc này"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Đã chép!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Nội dung lời chúc */}
                      <p className="text-xs sm:text-[13px] text-foreground/90 leading-relaxed font-normal selection:bg-primary/20">
                        {wish.text}
                      </p>

                      {/* Nút gửi nhanh qua các app cho lời chúc này */}
                      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="text-[10px] opacity-75">{wish.text.length} ký tự</span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://chat.zalo.me`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => handleCopyWish(wish.text, wish.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 font-bold transition-colors"
                            title="Chép lời chúc & Mở Zalo"
                          >
                            <Send className="w-2.5 h-2.5" /> Zalo
                          </a>
                          <a
                            href={`https://www.messenger.com`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => handleCopyWish(wish.text, wish.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 font-bold transition-colors"
                            title="Chép lời chúc & Mở Messenger"
                          >
                            <MessageCircle className="w-2.5 h-2.5" /> Messenger
                          </a>
                          <a
                            href={`sms:?body=${encodeURIComponent(wish.text)}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold transition-colors"
                            title="Mở ứng dụng tin nhắn SMS"
                          >
                            💬 SMS
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer: Mở nhanh ứng dụng */}
            <div className="p-3 sm:p-4 border-t border-border/80 bg-card/60 backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-2">
                <a
                  href="https://chat.zalo.me"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 font-bold text-xs transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" /> Zalo Web
                </a>
                <a
                  href="https://www.messenger.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 font-bold text-xs transition-colors shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Messenger
                </a>
                <a
                  href={`sms:?body=${encodeURIComponent(rawWishes[0]?.text || "")}`}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-xs transition-colors shadow-xs"
                >
                  <span>💬 Gửi SMS</span>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
