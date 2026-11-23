/**
 * Tiện ích cốt lõi cho module Messenger:
 * - Mã QR cố định duy nhất theo tài khoản (BER-XXXXXXXX)
 * - Phân tích dữ liệu quét mã QR (URL / BER_FRIEND / Mã trực tiếp / Email)
 * - Nén & tải ảnh tin nhắn giữ tỷ lệ gốc (có Smart Fallback nếu Storage chưa sẵn sàng)
 * - Định dạng thời gian và trạng thái trực tuyến
 */

export const MAX_CHAT_IMAGE_BYTES = 30 * 1024 * 1024; // 30MB
const FRIEND_CODE_REGEX = /^BER-[A-Z0-9]{6,12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sinh mã kết bạn cố định giống hệt hàm SQL public.generate_fixed_friend_code(uuid)
 */
export function getFixedFriendCode(userId?: string | null, existingCode?: string | null): string {
  if (existingCode && existingCode.trim().length >= 6) {
    return existingCode.trim().toUpperCase();
  }
  if (!userId) return "BER-00000000";
  const cleaned = userId.replace(/-/g, "").toUpperCase();
  const suffix = (cleaned.slice(0, 8) || "00000000").padEnd(8, "0");
  return `BER-${suffix}`;
}

/**
 * Tạo nội dung nhúng trong mã QR cố định của tài khoản
 * Dùng URL đầy đủ để quét bằng Camera điện thoại ngoài vẫn mở thẳng trang kết bạn
 */
export function buildFriendQrPayload(friendCode: string, origin?: string): string {
  const normalizedCode = friendCode.trim().toUpperCase();
  const base =
    origin ||
    (typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://ber-birthday-event-reminder.vercel.app");

  return `${base.replace(/\/+$/, "")}/messenger?add=${encodeURIComponent(normalizedCode)}`;
}

/**
 * Phân tích chuỗi thô từ máy quét QR hoặc ô nhập tìm kiếm thành mã định danh sạch (Email hoặc BER-XXXXXXXX)
 */
export function parseFriendQrPayload(raw: string): {
  type: "friend_code" | "email" | "unknown";
  value: string;
} {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { type: "unknown", value: "" };

  // 1. Trường hợp chuỗi là URL chứa query ?add=...
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsedUrl = new URL(trimmed);
      const addParam = parsedUrl.searchParams.get("add") || parsedUrl.searchParams.get("code");
      if (addParam) {
        return parseFriendQrPayload(decodeURIComponent(addParam));
      }
    }
  } catch {
    // Không phải URL hợp lệ, tiếp tục kiểm tra định dạng khác
  }

  // 2. Trường hợp prefix BER_FRIEND:BER-XXXXXXXX
  if (/^BER_FRIEND:/i.test(trimmed)) {
    const code = trimmed.replace(/^BER_FRIEND:/i, "").trim().toUpperCase();
    if (FRIEND_CODE_REGEX.test(code)) {
      return { type: "friend_code", value: code };
    }
  }

  // 3. Trường hợp mailto:user@example.com
  if (/^mailto:/i.test(trimmed)) {
    const email = trimmed.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
    if (EMAIL_REGEX.test(email)) {
      return { type: "email", value: email };
    }
  }

  // 4. Mã kết bạn trực tiếp BER-XXXXXXXX
  const upper = trimmed.toUpperCase();
  if (FRIEND_CODE_REGEX.test(upper)) {
    return { type: "friend_code", value: upper };
  }

  // 5. Email trực tiếp
  const lower = trimmed.toLowerCase();
  if (EMAIL_REGEX.test(lower)) {
    return { type: "email", value: lower };
  }

  return { type: "unknown", value: trimmed };
}

/**
 * Kiểm tra người dùng có đang trực tuyến hay không (dựa trên last_seen_at trong 3 phút gần nhất)
 */
export function isUserOnline(lastSeenAt?: string | null, now = new Date()): boolean {
  if (!lastSeenAt) return false;
  const seenTime = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seenTime)) return false;
  return now.getTime() - seenTime <= 3 * 60 * 1000;
}

/**
 * Định dạng thời gian tin nhắn thân thiện kiểu Messenger tiếng Việt
 */
export function formatMessageRelativeTime(isoString?: string | null, now = new Date()): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút`;
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays < 7) {
    const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return weekdays[date.getDay()];
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/**
 * Giờ phút chính xác của từng bong bóng tin nhắn (VD: 14:25)
 */
export function formatMessageClock(isoString?: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export interface ProcessedChatImage {
  blob: Blob;
  dataUrl: string;
  ext: string;
  width: number;
  height: number;
}

/**
 * Nén ảnh gửi trong tin nhắn, GIỮ NGUYÊN TỶ LỆ GỐC (tối đa maxDimension px)
 * Dùng ObjectURL trên trình duyệt để tiết kiệm RAM khi nén ảnh chụp >10MB trên Mobile
 */
export async function compressChatImage(
  file: File,
  maxDimension = 1280,
  quality = 0.84
): Promise<ProcessedChatImage> {
  return new Promise((resolve, reject) => {
    const isImageType =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);

    if (!isImageType) {
      reject(new Error("Tệp đã chọn không phải hình ảnh hợp lệ."));
      return;
    }

    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      reject(new Error("Ảnh vượt quá giới hạn 30MB. Vui lòng chọn ảnh nhẹ hơn."));
      return;
    }

    const handleLoadedImage = (img: HTMLImageElement, revokeUrl?: string) => {
      try {
        const naturalW = img.naturalWidth || img.width || 800;
        const naturalH = img.naturalHeight || img.height || 600;
        const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
        const outW = Math.max(1, Math.round(naturalW * scale));
        const outH = Math.max(1, Math.round(naturalH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          if (revokeUrl) URL.revokeObjectURL(revokeUrl);
          reject(new Error("Trình duyệt không hỗ trợ xử lý hình ảnh."));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, outW, outH);

        if (revokeUrl) URL.revokeObjectURL(revokeUrl);

        const exportWithMime = (mime: string, ext: string, onFail?: () => void) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const dataUrl = canvas.toDataURL(mime, quality);
                resolve({ blob, dataUrl, ext, width: outW, height: outH });
              } else if (onFail) {
                onFail();
              } else {
                reject(new Error("Không thể nén hình ảnh để gửi."));
              }
            },
            mime,
            quality
          );
        };

        exportWithMime("image/webp", "webp", () => exportWithMime("image/jpeg", "jpg"));
      } catch (err: any) {
        if (revokeUrl) URL.revokeObjectURL(revokeUrl);
        reject(new Error(err?.message || "Lỗi xử lý hình ảnh."));
      }
    };

    if (typeof window !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Không thể giải mã hình ảnh này trên trình duyệt."));
      };
      img.onload = () => handleLoadedImage(img, objectUrl);
      img.src = objectUrl;
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc tệp hình ảnh."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Hình ảnh bị lỗi hoặc không được hỗ trợ."));
      img.onload = () => handleLoadedImage(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface UploadedChatImageResult {
  url: string;
  storagePath: string | null;
  width: number;
  height: number;
  sizeBytes: number;
  storageMode: "storage" | "db_inline";
}

/**
 * Upload ảnh tin nhắn lên Supabase Storage bucket "chat-images" kèm đầy đủ metadata lưu trên DB.
 * Nếu Storage chưa sẵn sàng -> Tự động fallback sang Data URL nén gọn lưu trực tiếp trong cột messages.image_url trên DB.
 */
export async function uploadChatImageDetailed(
  supabase: any,
  userId: string,
  file: File
): Promise<UploadedChatImageResult> {
  const processed = await compressChatImage(file, 1280, 0.84);

  const isConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

  if (!isConfigured || !supabase?.storage) {
    return {
      url: processed.dataUrl,
      storagePath: null,
      width: processed.width,
      height: processed.height,
      sizeBytes: processed.blob.size,
      storageMode: "db_inline",
    };
  }

  try {
    const fileName = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${processed.ext}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-images")
      .upload(filePath, processed.blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: processed.blob.type || "image/webp",
      });

    if (!uploadError) {
      const { data } = supabase.storage.from("chat-images").getPublicUrl(filePath);
      if (data?.publicUrl) {
        return {
          url: data.publicUrl,
          storagePath: filePath,
          width: processed.width,
          height: processed.height,
          sizeBytes: processed.blob.size,
          storageMode: "storage",
        };
      }
    } else {
      console.warn(
        "Storage chat-images chưa sẵn sàng, chuyển sang fallback lưu trực tiếp vào DB:",
        uploadError.message
      );
    }
  } catch (err) {
    console.warn("Ngoại lệ upload chat-images, chuyển sang fallback lưu trực tiếp vào DB:", err);
  }

  // Fallback gọn nhẹ (< 760px) lưu trực tiếp vào cột image_url trên PostgreSQL DB
  try {
    const compact = await compressChatImage(file, 760, 0.72);
    return {
      url: compact.dataUrl,
      storagePath: null,
      width: compact.width,
      height: compact.height,
      sizeBytes: compact.blob.size,
      storageMode: "db_inline",
    };
  } catch {
    return {
      url: processed.dataUrl,
      storagePath: null,
      width: processed.width,
      height: processed.height,
      sizeBytes: processed.blob.size,
      storageMode: "db_inline",
    };
  }
}

/**
 * Wrapper tiện lợi trả về trực tiếp URL ảnh đã lưu trữ trên Supabase Storage / DB
 */
export async function uploadChatImageWithFallback(
  supabase: any,
  userId: string,
  file: File
): Promise<string> {
  const result = await uploadChatImageDetailed(supabase, userId, file);
  return result.url;
}

/**
 * Kiểm tra lỗi schema/RPC chưa được khởi tạo (khi chưa chạy migration 023 trên Supabase)
 */
export function isMessengerSchemaMissingError(err: any): boolean {
  const msg = String(err?.message || err?.details || "").toLowerCase();
  const code = String(err?.code || "");
  return (
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    msg.includes("get_my_friend_network") ||
    msg.includes("find_user_for_friend") ||
    msg.includes('relation "public.friendships" does not exist') ||
    msg.includes('relation "public.messages" does not exist')
  );
}

/**
 * Kiểm tra quy tắc nghiệp vụ: 2 tài khoản chỉ được nhắn tin khi khác nhau và trạng thái kết bạn là "accepted"
 */
export function canChatWithUser(
  currentUserId?: string | null,
  friendId?: string | null,
  friendshipStatus?: string | null
): boolean {
  if (!currentUserId || !friendId) return false;
  if (currentUserId === friendId) return false;
  return friendshipStatus === "accepted";
}
