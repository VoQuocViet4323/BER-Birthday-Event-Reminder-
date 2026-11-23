/**
 * Tiện ích sinh Avatar thông minh theo ngữ cảnh tên & loại sự kiện (BER)
 * Tự động nhận diện từ khóa tiếng Việt để tạo SVG Avatar sắc nét, tải tức thì 0ms,
 * thay thế hoàn toàn avatar mặt người ngẫu nhiên (DiceBear avataaars).
 */

export interface EventAvatarTheme {
  id: string;
  label: string;
  emoji: string;
  colors: [string, string];
}

export const EVENT_AVATAR_PRESETS: EventAvatarTheme[] = [
  { id: "birthday", label: "Sinh nhật", emoji: "🎂", colors: ["#8B5CF6", "#EC4899"] },
  { id: "love", label: "Người yêu", emoji: "❤️", colors: ["#EC4899", "#F43F5E"] },
  { id: "teacher", label: "Nhà giáo", emoji: "👩‍🏫", colors: ["#2563EB", "#0EA5E9"] },
  { id: "wedding", label: "Đám cưới", emoji: "💍", colors: ["#F59E0B", "#EC4899"] },
  { id: "medical", label: "Y tế / Trực", emoji: "🏥", colors: ["#0D9488", "#06B6D4"] },
  { id: "music", label: "Concert", emoji: "🎤", colors: ["#7C3AED", "#EC4899"] },
  { id: "culture", label: "Văn hóa / Lễ", emoji: "🇻🇳", colors: ["#DC2626", "#F59E0B"] },
  { id: "memorial", label: "Tưởng niệm", emoji: "🪷", colors: ["#6366F1", "#4338CA"] },
  { id: "work", label: "Công việc", emoji: "💼", colors: ["#3B82F6", "#1D4ED8"] },
  { id: "family", label: "Gia đình", emoji: "🏡", colors: ["#F43F5E", "#FB7185"] },
  { id: "party", label: "Tiệc tùng", emoji: "🥂", colors: ["#F97316", "#EF4444"] },
  { id: "sport", label: "Thể thao", emoji: "🏆", colors: ["#10B981", "#059669"] },
];

/**
 * Chuẩn hóa chuỗi tiếng Việt về chữ thường không dấu để so khớp từ khóa chính xác
 */
export function normalizeVietnameseText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((rawKw) => {
    const kw = rawKw.trim();
    if (!kw) return false;
    // Khớp chính xác theo ranh giới từ cho từ khóa ngắn hoặc viết tắt để tránh nhận nhầm
    if (kw.length <= 4 || /^[a-z0-9/.-]+$/i.test(kw) && !kw.includes(" ")) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(?:^|\\s|/|-|,|\\.|\\()${escaped}(?:$|\\s|/|-|,|\\.|\\))`, "i");
      return regex.test(text);
    }
    return text.includes(kw);
  });
}

/**
 * Phân tích ngữ cảnh từ tên sự kiện, loại sự kiện, nhóm và ghi chú
 */
export function resolveEventAvatarTheme(params: {
  name?: string | null;
  event_type?: string | null;
  group_name?: string | null;
  custom_type?: string | null;
  note?: string | null;
}): EventAvatarTheme {
  const combined = normalizeVietnameseText(
    [params.name, params.custom_type, params.note].filter(Boolean).join(" ")
  );
  const groupNormalized = normalizeVietnameseText(params.group_name || "");
  const eventType = params.event_type || "other";

  // 1. Ngày Nhà giáo VN / Thầy cô / Trường học / Tốt nghiệp
  if (
    hasAnyKeyword(combined, [
      "nha giao",
      "20/11",
      "20-11",
      "thay giao",
      "co giao",
      "thay co",
      "co chu nhiem",
      "giang vien",
      "giao vien",
      "hieu truong",
      "tot nghiep",
      "khai giang",
      "truong hoc",
      "hoc sinh",
      "sinh vien",
      "on thi",
      "bang lai",
      "bao ve luan van",
    ])
  ) {
    if (hasAnyKeyword(combined, ["tot nghiep", "luan van", "thi", "khai giang"])) {
      return { id: "graduation", label: "Học tập & Thi cử", emoji: "🎓", colors: ["#2563EB", "#4F46E5"] };
    }
    return { id: "teacher", label: "Nhà giáo & Tri ân", emoji: "👩‍🏫", colors: ["#2563EB", "#0EA5E9"] };
  }

  // 2. Người yêu / Tình yêu / Valentine / Kỷ niệm yêu
  if (
    hasAnyKeyword(combined, [
      "nguoi yeu",
      "ny",
      "crush",
      "ban gai",
      "ban trai",
      "vo yeu",
      "chong yeu",
      "ong xa",
      "ba xa",
      "valentine",
      "14/2",
      "14-2",
      "tinh yeu",
      "hen ho",
      "ky niem yeu",
      "love",
      "anniversary",
    ])
  ) {
    if (eventType === "birthday" || hasAnyKeyword(combined, ["sinh nhat", "sn"])) {
      return { id: "love-birthday", label: "Sinh nhật người yêu", emoji: "💝", colors: ["#EC4899", "#F43F5E"] };
    }
    return { id: "love", label: "Tình yêu & Hẹn hò", emoji: "❤️", colors: ["#EC4899", "#E11D48"] };
  }

  // 3. Đám cưới / Ăn cưới / Hôn lễ
  if (
    hasAnyKeyword(combined, [
      "an cuoi",
      "dam cuoi",
      "mung cuoi",
      "ngay cuoi",
      "cuoi",
      "hon le",
      "dinh hon",
      "vu quy",
      "thanh hon",
      "tan hon",
      "cau hon",
    ])
  ) {
    return { id: "wedding", label: "Cưới hỏi & Hôn lễ", emoji: "💍", colors: ["#F59E0B", "#EC4899"] };
  }

  // 4. Bệnh viện / Y tế / Trực sự cố / Sức khỏe
  if (
    hasAnyKeyword(combined, [
      "benh vien",
      "truc su co",
      "su co",
      "truc ca",
      "bac si",
      "y te",
      "kham benh",
      "kham suc khoe",
      "suc khoe",
      "cap cuu",
      "phong kham",
      "nha khoa",
      "tiem",
      "thuoc",
    ])
  ) {
    if (hasAnyKeyword(combined, ["su co", "cap cuu", "truc"])) {
      return { id: "hospital-duty", label: "Trực & Y tế", emoji: "🏥", colors: ["#0D9488", "#0284C7"] };
    }
    return { id: "medical", label: "Sức khỏe & Y tế", emoji: "🩺", colors: ["#0D9488", "#10B981"] };
  }

  // 5. Âm nhạc / Concert / Liveshow / Du lịch
  if (
    hasAnyKeyword(combined, [
      "concert",
      "atvncg",
      "anh trai",
      "chi dep",
      "am nhac",
      "ca nhac",
      "nhac hoi",
      "liveshow",
      "show",
      "festival",
      "du lich",
      "phuot",
      "chuyen di",
      "nghi mat",
      "may bay",
      "san bay",
      "trip",
    ])
  ) {
    if (hasAnyKeyword(combined, ["du lich", "phuot", "chuyen di", "nghi mat", "may bay", "san bay", "trip"])) {
      return { id: "travel", label: "Du lịch & Khám phá", emoji: "✈️", colors: ["#0EA5E9", "#6366F1"] };
    }
    return { id: "music", label: "Âm nhạc & Concert", emoji: "🎤", colors: ["#7C3AED", "#EC4899"] };
  }

  // 6. Ngày giỗ / Cúng / Tưởng niệm / Tâm linh
  if (
    eventType === "memorial" ||
    hasAnyKeyword(combined, [
      "ngay gio",
      "gio ",
      "cung",
      "tuong niem",
      "thanh minh",
      "vu lan",
      "ram ",
      "mung 1",
      "to tien",
      "chua",
    ])
  ) {
    return { id: "memorial", label: "Tưởng niệm & Tâm linh", emoji: "🪷", colors: ["#6366F1", "#4338CA"] };
  }

  // 7. Ngày lễ đặc biệt / Văn hóa / Phụ nữ / Tết / Noel
  if (
    hasAnyKeyword(combined, [
      "8/3",
      "8-3",
      "20/10",
      "20-10",
      "phu nu",
      "ngay cua me",
      "mother",
    ])
  ) {
    return { id: "women", label: "Ngày Phụ nữ", emoji: "💐", colors: ["#EC4899", "#A855F7"] };
  }

  if (hasAnyKeyword(combined, ["noel", "giang sinh", "christmas"])) {
    return { id: "xmas", label: "Giáng sinh", emoji: "🎄", colors: ["#16A34A", "#DC2626"] };
  }

  if (hasAnyKeyword(combined, ["trung thu", "den long", "trang ram"])) {
    return { id: "midautumn", label: "Trung thu", emoji: "🏮", colors: ["#EA580C", "#F59E0B"] };
  }

  if (hasAnyKeyword(combined, ["tet ", "giao thua", "mung 1 tet", "nam moi", "new year"])) {
    return { id: "tet", label: "Tết & Năm mới", emoji: "🧧", colors: ["#DC2626", "#F59E0B"] };
  }

  if (
    hasAnyKeyword(combined, [
      "van hoa",
      "quoc khanh",
      "2/9",
      "30/4",
      "1/5",
      "viet nam",
      "vn",
      "le hoi",
      "truyen thong",
    ])
  ) {
    return { id: "culture", label: "Văn hóa & Ngày lễ", emoji: "🇻🇳", colors: ["#DC2626", "#F59E0B"] };
  }

  // 8. Công việc / Họp / Dự án / Khai trương
  if (
    hasAnyKeyword(combined, [
      "hop ",
      "meeting",
      "deadline",
      "du an",
      "cong ty",
      "sep",
      "khai truong",
      "ra mat",
      "phong van",
      "bao cao",
      "ky ket",
      "hoi thao",
      "thang chuc",
    ]) ||
    groupNormalized === "dong nghiep"
  ) {
    if (hasAnyKeyword(combined, ["khai truong", "ra mat", "thang chuc"])) {
      return { id: "launch", label: "Khai trương & Thành công", emoji: "🚀", colors: ["#6366F1", "#EC4899"] };
    }
    return { id: "work", label: "Công việc & Sự nghiệp", emoji: "💼", colors: ["#3B82F6", "#1D4ED8"] };
  }

  // 9. Thể thao / Gym / Giải đấu
  if (
    hasAnyKeyword(combined, [
      "bong da",
      "gym",
      "chay bo",
      "marathon",
      "the thao",
      "cau long",
      "tennis",
      "boi loi",
      "giai dau",
    ])
  ) {
    return { id: "sport", label: "Thể thao", emoji: "🏆", colors: ["#10B981", "#059669"] };
  }

  // 10. Tiệc tùng / Ăn uống / Họp lớp
  if (
    hasAnyKeyword(combined, [
      "tiec",
      "party",
      "lien hoan",
      "nhau",
      "hop lop",
      "tan gia",
      "lau",
      "bbq",
      "ca phe",
    ])
  ) {
    return { id: "party", label: "Tiệc tùng & Gặp gỡ", emoji: "🥂", colors: ["#F97316", "#EF4444"] };
  }

  // 11. Gia đình & Người thân
  if (hasAnyKeyword(combined, ["me yeu", "me", "ma yeu", "ba noi", "ba ngoai", "chi gai", "chi dau", "co ruot", "di"])) {
    return { id: "family-female", label: "Gia đình thân yêu", emoji: "🌸", colors: ["#F43F5E", "#EC4899"] };
  }
  if (hasAnyKeyword(combined, ["bo yeu", "bo", "ba yeu", "cha", "ong noi", "ong ngoai", "anh trai", "chu"])) {
    return { id: "family-male", label: "Gia đình thân yêu", emoji: "🎁", colors: ["#0EA5E9", "#2563EB"] };
  }
  if (hasAnyKeyword(combined, ["con yeu", "be yeu", "chau", "day thang", "thoi noi"])) {
    return { id: "baby", label: "Bé yêu", emoji: "🧸", colors: ["#F59E0B", "#EC4899"] };
  }
  if (hasAnyKeyword(combined, ["gia dinh", "nha "]) || (groupNormalized === "gia dinh" && eventType !== "birthday")) {
    return { id: "family", label: "Gia đình", emoji: "🏡", colors: ["#F43F5E", "#8B5CF6"] };
  }

  // 12. Fallback theo event_type
  if (eventType === "birthday") {
    return { id: "birthday", label: "Sinh nhật", emoji: "🎂", colors: ["#8B5CF6", "#EC4899"] };
  }
  if (eventType === "anniversary") {
    return { id: "anniversary", label: "Kỷ niệm", emoji: "💖", colors: ["#EC4899", "#F43F5E"] };
  }

  return { id: "other", label: "Sự kiện đặc biệt", emoji: "✨", colors: ["#6366F1", "#8B5CF6"] };
}

/**
 * Tạo Data URL SVG Avatar sắc nét từ theme
 */
export function buildEventAvatarSvgDataUrl(theme: EventAvatarTheme): string {
  const [c1, c2] = theme.colors;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="160" height="160" rx="36" fill="url(#bg)"/><circle cx="132" cy="28" r="34" fill="#ffffff" fill-opacity="0.14"/><circle cx="24" cy="136" r="28" fill="#ffffff" fill-opacity="0.1"/><text x="50%" y="54%" font-size="76" text-anchor="middle" dominant-baseline="middle">${theme.emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Sinh Avatar SVG theo ngữ cảnh sự kiện
 */
export function generateContextualEventAvatar(params: {
  name?: string | null;
  event_type?: string | null;
  group_name?: string | null;
  custom_type?: string | null;
  note?: string | null;
}): string {
  const theme = resolveEventAvatarTheme(params);
  return buildEventAvatarSvgDataUrl(theme);
}

/**
 * Kiểm tra xem avatar_url có phải là avatar mặt người ngẫu nhiên cũ của DiceBear không
 */
export function isLegacyRandomAvatar(url?: string | null): boolean {
  if (!url) return true;
  return url.includes("api.dicebear.com/7.x/avataaars");
}

/**
 * Lấy URL Avatar tối ưu để hiển thị:
 * - Nếu người dùng tự tải/chọn avatar tùy chỉnh (không phải link DiceBear ngẫu nhiên cũ) -> Giữ nguyên
 * - Nếu chưa có hoặc là link DiceBear cũ -> Tự động sinh avatar phù hợp 100% với ngữ cảnh tên sự kiện
 */
export function getEventAvatarUrl(event: {
  name?: string | null;
  event_type?: string | null;
  group_name?: string | null;
  custom_type?: string | null;
  note?: string | null;
  avatar_url?: string | null;
}): string {
  if (event.avatar_url && !isLegacyRandomAvatar(event.avatar_url)) {
    return event.avatar_url;
  }
  return generateContextualEventAvatar(event);
}
