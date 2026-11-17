import { describe, it, expect, vi } from "vitest";
import { PRESET_AVATARS, uploadAvatarWithFallback } from "../lib/image-utils";

describe("Avatar & Image Utils Test Suite", () => {
  it("PRESET_AVATARS danh sách biểu tượng mẫu phải đầy đủ và hợp lệ", () => {
    expect(PRESET_AVATARS.length).toBeGreaterThan(0);
    PRESET_AVATARS.forEach((p) => {
      expect(p.id).toBeDefined();
      expect(p.label).toBeTruthy();
      expect(p.emoji).toBeTruthy();
      expect(p.bg).toContain("from-");
    });
  });

  it("uploadAvatarWithFallback trả về publicUrl khi Supabase Storage upload thành công", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    // Mock File & Canvas xử lý trong môi trường Node.js
    const mockFile = new File(["dummy content"], "avatar.png", { type: "image/png" });

    // Mock FileReader trên global
    (global as any).FileReader = class {
      readAsDataURL() {
        setTimeout(() => {
          (this as any).onload?.({ target: { result: "data:image/png;base64,dummybase64" } });
        }, 0);
      }
    };

    // Mock Image trên global
    (global as any).Image = class {
      naturalWidth = 500;
      naturalHeight = 500;
      width = 500;
      height = 500;
      onload: any = null;
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
          return {
            width: 0,
            height: 0,
            getContext: () => mockContext,
            toDataURL: () => "data:image/webp;base64,optimizedbase64data",
            toBlob: (cb: any) => cb(new Blob(["mockblob"], { type: "image/webp" })),
          };
        }
        return {};
      },
    };

    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/avatars/user-123/avatar-999.webp" },
          }),
        }),
      },
    };

    const result = await uploadAvatarWithFallback(mockSupabase, "user-123", mockFile);
    expect(result).toBe("https://example.supabase.co/storage/v1/object/public/avatars/user-123/avatar-999.webp");
  });

  it("uploadAvatarWithFallback tự động fallback sang Data URL base64 an toàn khi Supabase Storage bị lỗi", async () => {
    const mockFile = new File(["dummy content"], "avatar.jpg", { type: "image/jpeg" });

    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: new Error("Bucket 'avatars' not found") }),
        }),
      },
    };

    const result = await uploadAvatarWithFallback(mockSupabase, "user-456", mockFile);
    // Khi Storage lỗi, kết quả phải fallback sang chuỗi dataUrl mà không throw exception
    expect(result).toBe("data:image/webp;base64,optimizedbase64data");
  });
});
