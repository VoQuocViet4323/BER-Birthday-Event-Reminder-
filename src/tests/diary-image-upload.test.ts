import { describe, it, expect, vi, beforeEach } from "vitest";
import { diaryFormSchema, MAX_DIARY_IMAGES } from "../types/diary";
import {
  isValidImageFile,
  compressDiaryImage,
  prepareDiaryImageForUpload,
  uploadDiaryImageWithFallback,
} from "../lib/image-utils";

describe("Diary Image Upload & Schema Test Suite", () => {
  let mockNaturalWidth = 4000;
  let mockNaturalHeight = 2000;
  let lastCanvasSize = { width: 0, height: 0 };

  beforeEach(() => {
    mockNaturalWidth = 4000;
    mockNaturalHeight = 2000;
    lastCanvasSize = { width: 0, height: 0 };

    // Mock FileReader trên global
    (global as any).FileReader = class {
      result = "data:image/webp;base64,diaryOptimizedImageData";
      readAsDataURL() {
        setTimeout(() => {
          (this as any).onload?.({ target: { result: this.result } });
        }, 0);
      }
    };

    // Mock Image trên global
    (global as any).Image = class {
      get naturalWidth() {
        return mockNaturalWidth;
      }
      get naturalHeight() {
        return mockNaturalHeight;
      }
      get width() {
        return mockNaturalWidth;
      }
      get height() {
        return mockNaturalHeight;
      }
      onload: any = null;
      onerror: any = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    };

    // Mock Canvas
    const mockContext = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "high",
      drawImage: vi.fn(),
    };

    (global as any).document = {
      createElement: (tag: string) => {
        if (tag === "canvas") {
          const canvasObj = {
            _width: 0,
            _height: 0,
            get width() {
              return this._width;
            },
            set width(v: number) {
              this._width = v;
              lastCanvasSize.width = v;
            },
            get height() {
              return this._height;
            },
            set height(v: number) {
              this._height = v;
              lastCanvasSize.height = v;
            },
            getContext: () => mockContext,
            toDataURL: () => "data:image/webp;base64,diaryOptimizedImageData",
            toBlob: (cb: any) => cb(new Blob(["mockdiaryblob"], { type: "image/webp" })),
          };
          return canvasObj;
        }
        return {};
      },
    };
  });

  describe("diaryFormSchema validation", () => {
    it("cho phép lưu nhật ký mà không cần upload ảnh (images không bắt buộc)", () => {
      const parsed = diaryFormSchema.parse({
        entry_date: "2026-11-20",
        title: "Một ngày bình yên",
        content: "Hôm nay thời tiết rất đẹp.",
        mood: "calm",
        tags: ["Kỷ niệm"],
      });
      expect(parsed.images).toEqual([]);
    });

    it("chấp nhận nhật ký có từ 1 đến 6 ảnh đính kèm", () => {
      const imgs = Array.from({ length: MAX_DIARY_IMAGES }, (_, i) => `https://cdn.example.com/img-${i}.webp`);
      const parsed = diaryFormSchema.parse({
        entry_date: "2026-11-20",
        content: "Lưu giữ trọn vẹn kỷ niệm!",
        images: imgs,
      });
      expect(parsed.images).toHaveLength(MAX_DIARY_IMAGES);
    });

    it("từ chối nếu vượt quá 6 ảnh trong một bài nhật ký", () => {
      const tooMany = Array.from({ length: MAX_DIARY_IMAGES + 1 }, (_, i) => `https://cdn.example.com/img-${i}.webp`);
      const result = diaryFormSchema.safeParse({
        entry_date: "2026-11-20",
        content: "Quá nhiều ảnh",
        images: tooMany,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("isValidImageFile", () => {
    it("chấp nhận các định dạng ảnh hợp lệ (kể cả khi MIME trống nhưng đúng đuôi file)", () => {
      expect(isValidImageFile(new File(["a"], "photo.jpg", { type: "image/jpeg" }))).toBe(true);
      expect(isValidImageFile(new File(["a"], "photo.png", { type: "image/png" }))).toBe(true);
      expect(isValidImageFile(new File(["a"], "photo.webp", { type: "image/webp" }))).toBe(true);
      expect(isValidImageFile(new File(["a"], "iphone.HEIC", { type: "" }))).toBe(true);
    });

    it("từ chối các tệp không phải hình ảnh", () => {
      expect(isValidImageFile(new File(["a"], "doc.pdf", { type: "application/pdf" }))).toBe(false);
      expect(isValidImageFile(new File(["a"], "video.mp4", { type: "video/mp4" }))).toBe(false);
      expect(isValidImageFile(new File(["a"], "notes.txt", { type: "text/plain" }))).toBe(false);
    });
  });

  describe("compressDiaryImage (hỗ trợ ảnh >30MB & giữ nguyên tỷ lệ khung hình)", () => {
    it("xử lý thành công ảnh dung lượng >30MB (35MB) và giữ đúng tỷ lệ ngang (4000x2000 -> 1600x800)", async () => {
      // Tạo File giả lập dung lượng 35MB (>30MB)
      const largeFile = new File(["mock"], "dslr-raw-moment.jpg", { type: "image/jpeg" });
      Object.defineProperty(largeFile, "size", { value: 35 * 1024 * 1024 });

      mockNaturalWidth = 4000;
      mockNaturalHeight = 2000;

      const result = await compressDiaryImage(largeFile, 1600, 0.82);
      expect(result.width).toBe(1600);
      expect(result.height).toBe(800);
      expect(lastCanvasSize).toEqual({ width: 1600, height: 800 });
      expect(result.ext).toBe("webp");
      expect(result.dataUrl).toBe("data:image/webp;base64,diaryOptimizedImageData");
    });

    it("giữ đúng tỷ lệ ảnh dọc (2000x4000 -> 800x1600)", async () => {
      const portraitFile = new File(["mock"], "portrait.png", { type: "image/png" });
      mockNaturalWidth = 2000;
      mockNaturalHeight = 4000;

      const result = await compressDiaryImage(portraitFile, 1600, 0.82);
      expect(result.width).toBe(800);
      expect(result.height).toBe(1600);
    });

    it("không phóng to ảnh nhỏ hơn giới hạn tối đa (800x600 -> giữ nguyên 800x600)", async () => {
      const smallFile = new File(["mock"], "small.jpg", { type: "image/jpeg" });
      mockNaturalWidth = 800;
      mockNaturalHeight = 600;

      const result = await compressDiaryImage(smallFile, 1600, 0.82);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it("tự động chuyển sang JPEG trên iOS Safari khi toBlob('image/webp') trả về image/png không nén", async () => {
      // Giả lập hành vi thực tế của iOS Safari/WebKit: gọi image/webp nhưng trả về image/png
      const origCreateElement = (global as any).document.createElement;
      (global as any).document.createElement = (tag: string) => {
        const el = origCreateElement(tag);
        if (tag === "canvas") {
          el.toBlob = (cb: any, mime?: string) => {
            if (mime === "image/webp") {
              cb(new Blob(["huge-uncompressed-png"], { type: "image/png" }));
            } else {
              cb(new Blob(["fast-jpeg"], { type: "image/jpeg" }));
            }
          };
        }
        return el;
      };

      const iphonePhoto = new File(["mock"], "IMG_001.JPG", { type: "image/jpeg" });
      const result = await compressDiaryImage(iphonePhoto, 1280, 0.8, false);
      expect(result.ext).toBe("jpg");
      expect(result.blob.type).toBe("image/jpeg");
    });

    it("báo lỗi rõ ràng khi chọn tệp không phải hình ảnh", async () => {
      const pdfFile = new File(["mock"], "report.pdf", { type: "application/pdf" });
      await expect(compressDiaryImage(pdfFile)).rejects.toThrow(
        "Tệp được chọn không phải là hình ảnh hợp lệ."
      );
    });
  });

  describe("uploadDiaryImageWithFallback", () => {
    it("tải lên bucket 'diary-images' và trả về publicUrl khi Supabase Storage thành công", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      const file = new File(["mock"], "sunset.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 38 * 1024 * 1024 }); // 38MB

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: null }),
            getPublicUrl: vi.fn().mockReturnValue({
              data: {
                publicUrl:
                  "https://example.supabase.co/storage/v1/object/public/diary-images/user-1/diary-123.webp",
              },
            }),
          }),
        },
      };

      const url = await uploadDiaryImageWithFallback(mockSupabase, "user-1", file);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("diary-images");
      expect(url).toBe(
        "https://example.supabase.co/storage/v1/object/public/diary-images/user-1/diary-123.webp"
      );
    });

    it("tự động fallback sang Data URL nén khi bucket 'diary-images' chưa được tạo", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      const file = new File(["mock"], "memory.png", { type: "image/png" });

      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: new Error("Bucket 'diary-images' not found") }),
          }),
        },
      };

      const url = await uploadDiaryImageWithFallback(mockSupabase, "user-2", file);
      expect(url).toBe("data:image/webp;base64,diaryOptimizedImageData");
    });

    it("trả về Data URL ngay lập tức ở chế độ local_user (chưa đăng nhập)", async () => {
      const file = new File(["mock"], "local.jpg", { type: "image/jpeg" });
      const url = await uploadDiaryImageWithFallback(null, "local_user", file);
      expect(url).toBe("data:image/webp;base64,diaryOptimizedImageData");
    });

    it("prepareDiaryImageForUpload bỏ qua nén Canvas với ảnh nhẹ <=400KB (0ms trên mobile)", async () => {
      const lightFile = new File(["tiny"], "light.jpg", { type: "image/jpeg" });
      Object.defineProperty(lightFile, "size", { value: 180 * 1024 }); // 180KB
      const prepared = await prepareDiaryImageForUpload(lightFile);
      expect(prepared.blob).toBe(lightFile);
      expect(prepared.ext).toBe("jpg");
    });
  });
});
