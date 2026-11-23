import { describe, it, expect } from "vitest";
import {
  resolveEventAvatarTheme,
  getEventAvatarUrl,
  isLegacyRandomAvatar,
} from "../lib/event-avatar";

describe("Contextual Event Avatar Test Suite", () => {
  it("Nhận diện đúng ngữ cảnh Ngày Nhà Giáo VN", () => {
    const theme = resolveEventAvatarTheme({ name: "Ngày Nhà Giáo Việt Nam 20/11", event_type: "other" });
    expect(theme.id).toBe("teacher");
    expect(theme.emoji).toBe("👩‍🏫");
  });

  it("Nhận diện đúng ngữ cảnh Sinh nhật người yêu", () => {
    const theme = resolveEventAvatarTheme({ name: "Sinh nhật người yêu", event_type: "birthday" });
    expect(theme.id).toBe("love-birthday");
    expect(theme.emoji).toBe("💝");
  });

  it("Nhận diện đúng các sự kiện thực tế: Trực sự cố bệnh viện, Ngày văn hoá VN, Ăn cưới, Concert", () => {
    expect(resolveEventAvatarTheme({ name: "Trực sự cố bệnh viện", event_type: "other" }).emoji).toBe("🏥");
    expect(resolveEventAvatarTheme({ name: "Ngày văn hoá VN", event_type: "other" }).emoji).toBe("🇻🇳");
    expect(resolveEventAvatarTheme({ name: "Ăn cưới Thảo", event_type: "other" }).emoji).toBe("💍");
    expect(resolveEventAvatarTheme({ name: "Concert ATVNCG", event_type: "other" }).emoji).toBe("🎤");
    expect(resolveEventAvatarTheme({ name: "Sinh nhật Khuê", event_type: "birthday" }).emoji).toBe("🎂");
  });

  it("Tự động nâng cấp các link DiceBear avataaars cũ sang Avatar SVG ngữ cảnh mới", () => {
    const oldUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=TrucSuCoBenhVien";
    expect(isLegacyRandomAvatar(oldUrl)).toBe(true);

    const newUrl = getEventAvatarUrl({
      name: "Trực sự cố bệnh viện",
      event_type: "other",
      avatar_url: oldUrl,
    });
    expect(newUrl.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(newUrl)).toContain("🏥");
  });

  it("Giữ nguyên nếu người dùng đã tự chọn/tải avatar tùy chỉnh riêng", () => {
    const customUrl = "https://example.com/my-custom-photo.png";
    expect(isLegacyRandomAvatar(customUrl)).toBe(false);
    expect(
      getEventAvatarUrl({
        name: "Sinh nhật",
        event_type: "birthday",
        avatar_url: customUrl,
      })
    ).toBe(customUrl);
  });
});
