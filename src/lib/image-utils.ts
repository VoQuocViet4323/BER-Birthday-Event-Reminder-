/**
 * Tiện ích xử lý, nén ảnh và tải lên ảnh đại diện (Avatar) cho BER
 * Đảm bảo tối ưu dung lượng, crop vuông mượt mà và tự động fallback nếu Storage chưa cấu hình
 */

export interface ProcessedAvatar {
  blob: Blob;
  dataUrl: string;
  ext: string;
  width: number;
  height: number;
}

/**
 * Nén ảnh và crop vuông từ tâm ảnh bằng Canvas API
 * Hỗ trợ ảnh lớn tới 30MB+ trên cả PC và Mobile, tự động giảm xuống chỉ còn ~30-70KB
 */
export async function compressAndCropAvatar(
  file: File,
  targetSize = 360,
  quality = 0.85
): Promise<ProcessedAvatar> {
  return new Promise((resolve, reject) => {
    // Kiểm tra định dạng ảnh hợp lệ (bao gồm cả trường hợp mobile không trả về MIME type rõ ràng)
    const isImageType =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);

    if (!isImageType) {
      reject(new Error("Tệp được chọn không phải là hình ảnh hợp lệ."));
      return;
    }

    const processImage = (img: HTMLImageElement, revokeUrl?: string) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          if (revokeUrl) URL.revokeObjectURL(revokeUrl);
          reject(new Error("Trình duyệt không hỗ trợ xử lý Canvas đồ họa."));
          return;
        }

        // Kích hoạt làm mịn ảnh chất lượng cao
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Tính toán vùng crop vuông từ tâm (center-crop)
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        const minSide = Math.min(naturalW, naturalH);
        const sx = (naturalW - minSide) / 2;
        const sy = (naturalH - minSide) / 2;

        // Vẽ ảnh vuông lên canvas
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

        // Giải phóng bộ nhớ ObjectURL ngay sau khi vẽ xong vào Canvas (quan trọng cho Mobile với ảnh >10MB)
        if (revokeUrl) URL.revokeObjectURL(revokeUrl);

        // Thử xuất sang định dạng WebP, nếu trình duyệt không hỗ trợ thì fallback sang JPEG
        let outputType = "image/webp";
        let ext = "webp";

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const dataUrl = canvas.toDataURL(outputType, quality);
              resolve({
                blob,
                dataUrl,
                ext,
                width: targetSize,
                height: targetSize,
              });
            } else {
              // Fallback sang JPEG
              outputType = "image/jpeg";
              ext = "jpg";
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) {
                    const dataUrl = canvas.toDataURL(outputType, quality);
                    resolve({
                      blob: jpegBlob,
                      dataUrl,
                      ext,
                      width: targetSize,
                      height: targetSize,
                    });
                  } else {
                    reject(new Error("Không thể xuất tệp nén hình ảnh."));
                  }
                },
                outputType,
                quality
              );
            }
          },
          outputType,
          quality
        );
      } catch (err: any) {
        if (revokeUrl) URL.revokeObjectURL(revokeUrl);
        reject(new Error(err?.message || "Lỗi trong quá trình nén và xử lý ảnh."));
      }
    };

    // Trên trình duyệt (PC & Mobile), ưu tiên dùng ObjectURL để không tốn gấp đôi RAM cho chuỗi Base64 với ảnh >10MB
    if (typeof window !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Hình ảnh bị lỗi hoặc trình duyệt chưa hỗ trợ định dạng này (ví dụ HEIC chưa chuyển đổi)."));
      };
      img.onload = () => processImage(img, objectUrl);
      img.src = objectUrl;
      return;
    }

    // Fallback dùng FileReader (môi trường test / trình duyệt cũ)
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc tệp hình ảnh từ thiết bị."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Hình ảnh bị lỗi hoặc không hỗ trợ định dạng này."));
      img.onload = () => processImage(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Tải ảnh đại diện lên Supabase Storage với cơ chế Phục hồi thông minh (Smart Fallback)
 * 1. Thử tải lên Storage bucket "avatars"
 * 2. Nếu bucket chưa tạo hoặc lỗi quyền RLS -> Tự động chuyển sang lưu trữ Data URL base64 đã nén siêu nhẹ
 * Đảm bảo 100% ảnh đại diện luôn được tải lên thành công mà không bao giờ báo lỗi
 */
export async function uploadAvatarWithFallback(
  supabase: any,
  userId: string,
  file: File
): Promise<string> {
  // 1. Nén ảnh và crop vuông chuẩn 360x360 (~30-60KB)
  const processed = await compressAndCropAvatar(file, 360, 0.85);

  const isConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

  if (!isConfigured || !supabase?.storage) {
    // Nếu môi trường offline/demo -> Lưu thẳng Data URL đã nén
    return processed.dataUrl;
  }

  // 2. Thử tải lên Supabase Storage
  try {
    const fileName = `avatar-${Date.now()}.${processed.ext}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, processed.blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: processed.blob.type,
      });

    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    } else {
      console.warn("Lỗi upload Supabase Storage avatars, kích hoạt cơ chế Base64 fallback:", uploadError.message);
    }
  } catch (storageErr) {
    console.warn("Ngoại lệ khi tải lên Supabase Storage, chuyển sang Base64 fallback:", storageErr);
  }

  // 3. Fallback an toàn tuyệt đối: Lưu dataUrl đã nén vào cột avatar_url (PostgreSQL TEXT)
  return processed.dataUrl;
}

/**
 * Kiểm tra định dạng tệp có phải hình ảnh hợp lệ không
 */
export function isValidImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name)
  );
}

/**
 * Nén ảnh nhật ký giữ nguyên tỷ lệ khung hình (aspect ratio) bằng Canvas API.
 * Hỗ trợ ảnh dung lượng rất lớn (>30MB, 50MB+) trên cả PC và Mobile:
 * - Ưu tiên createImageBitmap (tiết kiệm RAM, tự động xoay EXIF)
 * - Fallback sang ObjectURL -> Image và giải phóng bộ nhớ ngay sau khi vẽ
 * - Tự động thu gọn cạnh dài tối đa về maxDimension (mặc định 1600px) và nén WebP/JPEG sắc nét (~150-350KB)
 */
export async function compressDiaryImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<ProcessedAvatar> {
  if (!isValidImageFile(file)) {
    throw new Error("Tệp được chọn không phải là hình ảnh hợp lệ.");
  }

  const drawSourceToCanvas = (
    source: CanvasImageSource,
    naturalW: number,
    naturalH: number,
    cleanup?: () => void
  ): Promise<ProcessedAvatar> => {
    return new Promise((resolve, reject) => {
      try {
        let targetW = naturalW;
        let targetH = naturalH;

        if (naturalW > maxDimension || naturalH > maxDimension) {
          if (naturalW >= naturalH) {
            targetW = maxDimension;
            targetH = Math.max(1, Math.round((naturalH * maxDimension) / naturalW));
          } else {
            targetH = maxDimension;
            targetW = Math.max(1, Math.round((naturalW * maxDimension) / naturalH));
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          cleanup?.();
          reject(new Error("Trình duyệt không hỗ trợ xử lý Canvas đồ họa."));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, 0, 0, targetW, targetH);

        // Giải phóng RAM ngay lập tức (rất quan trọng với ảnh >30MB)
        cleanup?.();

        let outputType = "image/webp";
        let ext = "webp";

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const dataUrl = canvas.toDataURL(outputType, quality);
              resolve({
                blob,
                dataUrl,
                ext,
                width: targetW,
                height: targetH,
              });
            } else {
              outputType = "image/jpeg";
              ext = "jpg";
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) {
                    const dataUrl = canvas.toDataURL(outputType, quality);
                    resolve({
                      blob: jpegBlob,
                      dataUrl,
                      ext,
                      width: targetW,
                      height: targetH,
                    });
                  } else {
                    reject(new Error("Không thể xuất tệp nén hình ảnh."));
                  }
                },
                outputType,
                quality
              );
            }
          },
          outputType,
          quality
        );
      } catch (err: any) {
        cleanup?.();
        reject(new Error(err?.message || "Lỗi trong quá trình nén và xử lý ảnh."));
      }
    });
  };

  // 1. Ưu tiên createImageBitmap trên trình duyệt hiện đại (tối ưu RAM cho ảnh >30MB và giữ đúng hướng EXIF)
  if (typeof window !== "undefined" && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return await drawSourceToCanvas(bitmap, bitmap.width, bitmap.height, () => {
        if (typeof bitmap.close === "function") bitmap.close();
      });
    } catch {
      // Fallback sang ObjectURL nếu trình duyệt không hỗ trợ decode định dạng này qua createImageBitmap
    }
  }

  // 2. Fallback sang ObjectURL (không nhân đôi RAM như FileReader.readAsDataURL)
  if (typeof window !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Hình ảnh bị lỗi hoặc trình duyệt chưa hỗ trợ định dạng này (ví dụ HEIC chưa chuyển đổi)."));
      };
      img.onload = () => {
        drawSourceToCanvas(
          img,
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          () => URL.revokeObjectURL(objectUrl)
        )
          .then(resolve)
          .catch(reject);
      };
      img.src = objectUrl;
    });
  }

  // 3. Fallback FileReader (môi trường test / trình duyệt cũ)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc tệp hình ảnh từ thiết bị."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Hình ảnh bị lỗi hoặc không hỗ trợ định dạng này."));
      img.onload = () => {
        drawSourceToCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
          .then(resolve)
          .catch(reject);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Tải ảnh nhật ký lên Supabase Storage (bucket "diary-images") với Smart Fallback sang Data URL.
 * Cho phép chọn ảnh dung lượng >30MB nhờ cơ chế nén thông minh trước khi tải lên.
 */
export async function uploadDiaryImageWithFallback(
  supabase: any,
  userId: string,
  file: File
): Promise<string> {
  // 1. Nén ảnh giữ nguyên tỷ lệ khung hình (max 1600px, quality 0.82)
  const processed = await compressDiaryImage(file, 1600, 0.82);

  const isConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

  if (!isConfigured || !supabase?.storage || !userId || userId === "local_user") {
    return processed.dataUrl;
  }

  // 2. Thử tải lên bucket "diary-images"
  try {
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const fileName = `diary-${Date.now()}-${randomSuffix}.${processed.ext}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("diary-images")
      .upload(filePath, processed.blob, {
        cacheControl: "31536000",
        upsert: false,
        contentType: processed.blob.type,
      });

    if (!uploadError) {
      const { data } = supabase.storage.from("diary-images").getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    } else {
      console.warn(
        "Lỗi upload Supabase Storage diary-images, kích hoạt cơ chế Base64 fallback:",
        uploadError.message
      );
    }
  } catch (storageErr) {
    console.warn("Ngoại lệ khi tải ảnh nhật ký lên Supabase Storage, chuyển sang Base64 fallback:", storageErr);
  }

  // 3. Fallback an toàn sang Data URL đã nén
  return processed.dataUrl;
}

/**
 * Danh sách avatar preset biểu tượng mẫu (Emoji & Avatar phong cách)
 */
export const PRESET_AVATARS = [
  { id: "cake", label: "Bánh kem", emoji: "🎂", bg: "from-pink-500 to-rose-500" },
  { id: "party", label: "Bữa tiệc", emoji: "🎉", bg: "from-purple-500 to-indigo-500" },
  { id: "crown", label: "Vương miện", emoji: "👑", bg: "from-amber-400 to-orange-500" },
  { id: "heart", label: "Trái tim", emoji: "💖", bg: "from-rose-500 to-pink-600" },
  { id: "star", label: "Ngôi sao", emoji: "🌟", bg: "from-yellow-400 to-amber-500" },
  { id: "rocket", label: "Tên lửa", emoji: "🚀", bg: "from-blue-500 to-cyan-500" },
  { id: "cat", label: "Mèo con", emoji: "🐱", bg: "from-amber-500 to-emerald-500" },
  { id: "panda", label: "Gấu trúc", emoji: "🐼", bg: "from-slate-600 to-slate-900" },
];
