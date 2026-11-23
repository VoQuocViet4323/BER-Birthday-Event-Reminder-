import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import {
  getFixedFriendCode,
  buildFriendQrPayload,
  parseFriendQrPayload,
  isUserOnline,
  formatMessageRelativeTime,
  compressChatImage,
  uploadChatImageDetailed,
  uploadChatImageWithFallback,
  isMessengerSchemaMissingError,
  canChatWithUser,
  isMessageHiddenForUser,
  summarizeReactions,
  getMessagePreviewText,
  canPinMoreMessages,
  isSwipeReplyTriggered,
  formatReactionActivityPreview,
  hasUnreadReactionFromFriend,
  MAX_CHAT_IMAGE_BYTES,
  MAX_PINNED_MESSAGES,
  MESSAGE_REACTIONS,
} from "../lib/messenger-utils";

describe("Messenger & Fixed QR Friend System Test Suite", () => {
  it("getFixedFriendCode sinh mã cố định nhất quán theo UUID và ưu tiên mã có sẵn từ DB", () => {
    const uid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(getFixedFriendCode(uid)).toBe("BER-A1B2C3D4");
    expect(getFixedFriendCode(uid)).toBe(getFixedFriendCode(uid));
    expect(getFixedFriendCode(uid, "ber-custom99")).toBe("BER-CUSTOM99");
  });

  it("buildFriendQrPayload & parseFriendQrPayload mã hóa và giải mã chính xác mọi định dạng QR & Email", () => {
    const code = "BER-A1B2C3D4";
    const urlPayload = buildFriendQrPayload(code, "https://ber-app.vercel.app");
    expect(urlPayload).toBe("https://ber-app.vercel.app/messenger?add=BER-A1B2C3D4");

    // 1. Quét QR dạng URL đầy đủ
    expect(parseFriendQrPayload(urlPayload)).toEqual({
      type: "friend_code",
      value: "BER-A1B2C3D4",
    });

    // 2. Quét QR dạng BER_FRIEND:
    expect(parseFriendQrPayload("BER_FRIEND:ber-9988aabb")).toEqual({
      type: "friend_code",
      value: "BER-9988AABB",
    });

    // 3. Nhập mã trực tiếp
    expect(parseFriendQrPayload("  ber-12345678  ")).toEqual({
      type: "friend_code",
      value: "BER-12345678",
    });

    // 4. Nhập Email hoặc QR mailto:
    expect(parseFriendQrPayload("VoViet4323@Gmail.com")).toEqual({
      type: "email",
      value: "voviet4323@gmail.com",
    });
    expect(parseFriendQrPayload("mailto:friend@example.com?subject=hi")).toEqual({
      type: "email",
      value: "friend@example.com",
    });

    // 5. Chuỗi không hợp lệ
    expect(parseFriendQrPayload("   ")).toEqual({
      type: "unknown",
      value: "",
    });
  });

  it("QRCode sinh ảnh QR cố định PNG Data URL hợp lệ từ payload tài khoản", async () => {
    const code = getFixedFriendCode("f0e1d2c3-b4a5-6789-0123-456789abcdef");
    const payload = buildFriendQrPayload(code, "https://ber.example.com");
    const dataUrl = await QRCode.toDataURL(payload, { width: 256, margin: 2 });
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(200);
  });

  it("canChatWithUser chỉ cho phép nhắn tin giữa 2 tài khoản khác nhau sau khi đã chấp nhận kết bạn", () => {
    expect(canChatWithUser("user-a", "user-b", "accepted")).toBe(true);
    expect(canChatWithUser("user-a", "user-b", "pending")).toBe(false);
    expect(canChatWithUser("user-a", "user-b", "declined")).toBe(false);
    expect(canChatWithUser("user-a", "user-b", null)).toBe(false);
    expect(canChatWithUser("user-a", "user-a", "accepted")).toBe(false);
  });

  it("isUserOnline xác định đúng trạng thái trực tuyến trong cửa sổ 3 phút", () => {
    const now = new Date("2026-11-23T10:00:00Z");
    expect(isUserOnline("2026-11-23T09:58:30Z", now)).toBe(true);
    expect(isUserOnline("2026-11-23T09:56:00Z", now)).toBe(false);
    expect(isUserOnline(null, now)).toBe(false);
  });

  it("formatMessageRelativeTime định dạng đúng thời gian tin nhắn tiếng Việt", () => {
    const now = new Date("2026-11-23T10:00:00Z");
    expect(formatMessageRelativeTime("2026-11-23T09:59:45Z", now)).toBe("Vừa xong");
    expect(formatMessageRelativeTime("2026-11-23T09:45:00Z", now)).toBe("15 phút");
    expect(formatMessageRelativeTime("2026-11-10T08:00:00Z", now)).toBe("10/11");
  });

  it("compressChatImage từ chối tệp không phải ảnh hoặc vượt quá 30MB", async () => {
    const textFile = new File(["hello"], "doc.txt", { type: "text/plain" });
    await expect(compressChatImage(textFile)).rejects.toThrow("không phải hình ảnh");

    const hugeFile = new File(["x"], "huge.jpg", { type: "image/jpeg" });
    Object.defineProperty(hugeFile, "size", { value: MAX_CHAT_IMAGE_BYTES + 1 });
    await expect(compressChatImage(hugeFile)).rejects.toThrow("30MB");
  });

  it("uploadChatImageWithFallback giữ nguyên tỷ lệ khung ảnh gốc, upload Storage và fallback an toàn khi lỗi bucket", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    const mockFile = new File(["binary"], "photo.jpg", { type: "image/jpeg" });

    (global as any).FileReader = class {
      readAsDataURL() {
        setTimeout(() => {
          (this as any).onload?.({ target: { result: "data:image/jpeg;base64,raw" } });
        }, 0);
      }
    };

    // Giả lập ảnh chữ nhật 2000x1000 để đảm bảo giữ nguyên tỷ lệ 2:1 (1280x640)
    (global as any).Image = class {
      naturalWidth = 2000;
      naturalHeight = 1000;
      width = 2000;
      height = 1000;
      onload: any = null;
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    };

    let createdCanvas: any = null;
    (global as any).document = {
      createElement: (tag: string) => {
        if (tag === "canvas") {
          createdCanvas = {
            width: 0,
            height: 0,
            getContext: () => ({
              imageSmoothingEnabled: false,
              imageSmoothingQuality: "high",
              drawImage: vi.fn(),
            }),
            toDataURL: () => "data:image/webp;base64,compactchatimg",
            toBlob: (cb: any) => cb(new Blob(["webp-bytes"], { type: "image/webp" })),
          };
          return createdCanvas;
        }
        return {};
      },
    };

    // Case 1: Upload lên Storage bucket chat-images thành công
    const mockSupabaseOk = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: {
              publicUrl:
                "https://example.supabase.co/storage/v1/object/public/chat-images/u1/img.webp",
            },
          }),
        }),
      },
    };

    const okDetail = await uploadChatImageDetailed(mockSupabaseOk, "u1", mockFile);
    expect(okDetail.url).toContain("/chat-images/u1/img.webp");
    expect(okDetail.storageMode).toBe("storage");
    expect(okDetail.storagePath).toMatch(/^u1\/chat-.*\.webp$/);
    expect(okDetail.width).toBe(1280);
    expect(okDetail.height).toBe(640);
    expect(okDetail.sizeBytes).toBeGreaterThan(0);
    expect(createdCanvas.width).toBe(1280);
    expect(createdCanvas.height).toBe(640);

    // Case 2: Storage lỗi -> Fallback sang Data URL gọn nhẹ lưu trực tiếp trên DB mà không làm gián đoạn gửi ảnh
    const mockSupabaseErr = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({
            error: new Error("Bucket chat-images not found"),
          }),
        }),
      },
    };

    const fallbackDetail = await uploadChatImageDetailed(mockSupabaseErr, "u1", mockFile);
    expect(fallbackDetail.url).toBe("data:image/webp;base64,compactchatimg");
    expect(fallbackDetail.storageMode).toBe("db_inline");
    expect(fallbackDetail.storagePath).toBeNull();

    const fallbackUrl = await uploadChatImageWithFallback(mockSupabaseErr, "u1", mockFile);
    expect(fallbackUrl).toBe("data:image/webp;base64,compactchatimg");
  });

  it("isMessengerSchemaMissingError phát hiện đúng lỗi chưa chạy migration 023", () => {
    expect(
      isMessengerSchemaMissingError({
        code: "42883",
        message: "function get_my_friend_network does not exist",
      })
    ).toBe(true);
    expect(
      isMessengerSchemaMissingError({
        code: "PGRST202",
        message: "Could not find the function public.find_user_for_friend",
      })
    ).toBe(true);
    expect(
      isMessengerSchemaMissingError({
        code: "23505",
        message: "duplicate key value",
      })
    ).toBe(false);
  });

  it("SQL Migration 023 đảm bảo idempotent (DROP POLICY IF EXISTS), khóa RLS are_friends và bật Realtime", () => {
    const sqlPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261123_023_messenger_and_friends.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    expect(sql).toContain("friend_code");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.friendships");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.messages");
    expect(sql).toContain("image_storage_path");
    expect(sql).toContain("image_width");
    expect(sql).toContain("image_size_bytes");
    expect(sql).toContain("idx_messages_pair_images");
    expect(sql).toContain("public.are_friends(sender_id, receiver_id)");
    expect(sql).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.messages");
    expect(sql).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships");
    expect(sql).toContain("'chat-images'");

    // Kiểm tra mọi CREATE POLICY đều có DROP POLICY IF EXISTS tương ứng
    const createCount = (sql.match(/CREATE POLICY\s+"/g) || []).length;
    const dropCount = (sql.match(/DROP POLICY IF EXISTS\s+"/g) || []).length;
    expect(createCount).toBeGreaterThan(0);
    expect(dropCount).toBe(createCount);
  });

  it("Xóa chỉ ở phía mình (isMessageHiddenForUser) chỉ ẩn với đúng tài khoản đã xóa, đối phương vẫn thấy", () => {
    const msg = { hidden_for_user_ids: ["user-b"] };
    expect(isMessageHiddenForUser(msg, "user-b")).toBe(true);
    expect(isMessageHiddenForUser(msg, "user-a")).toBe(false);
    expect(isMessageHiddenForUser({ hidden_for_user_ids: [] }, "user-b")).toBe(false);
  });

  it("Thả cảm xúc tin nhắn (summarizeReactions) gom đúng số lượng và đủ 6 icon chuẩn Messenger", () => {
    expect(MESSAGE_REACTIONS).toEqual(["❤️", "😆", "😮", "😢", "😠", "👍"]);
    const summary = summarizeReactions({
      "user-a": "❤️",
      "user-b": "❤️",
      "user-c": "😆",
    });
    expect(summary.total).toBe(3);
    expect(summary.items[0]).toEqual({ emoji: "❤️", count: 2, userIds: ["user-a", "user-b"] });
    expect(summary.items[1]).toEqual({ emoji: "😆", count: 1, userIds: ["user-c"] });
  });

  it("Vuốt quẹt trả lời (isSwipeReplyTriggered) đúng chiều: tin người khác vuốt phải, tin của mình vuốt trái", () => {
    // Tin của người khác (bên trái): vuốt sang PHẢI (>= 50px) mới kích hoạt
    expect(isSwipeReplyTriggered(false, 55)).toBe(true);
    expect(isSwipeReplyTriggered(false, 30)).toBe(false);
    expect(isSwipeReplyTriggered(false, -60)).toBe(false);

    // Tin của mình (bên phải): vuốt sang TRÁI (<= -50px) mới kích hoạt
    expect(isSwipeReplyTriggered(true, -55)).toBe(true);
    expect(isSwipeReplyTriggered(true, -30)).toBe(false);
    expect(isSwipeReplyTriggered(true, 60)).toBe(false);
  });

  it("Ghim tin nhắn (canPinMoreMessages) giới hạn tối đa đúng 5 tin nhắn & preview đúng ngữ cảnh", () => {
    expect(MAX_PINNED_MESSAGES).toBe(5);
    expect(canPinMoreMessages(0)).toBe(true);
    expect(canPinMoreMessages(4)).toBe(true);
    expect(canPinMoreMessages(5)).toBe(false);
    expect(canPinMoreMessages(6)).toBe(false);

    expect(getMessagePreviewText({ content: "Hẹn 8h tối nhé" })).toBe("Hẹn 8h tối nhé");
    expect(getMessagePreviewText({ content: "", image_url: "https://img/a.webp" })).toBe("📷 Hình ảnh");
    expect(getMessagePreviewText({ content: "abc", is_recalled: true })).toBe("Tin nhắn đã được thu hồi");
  });

  it("SQL Migration 024 chứa đầy đủ 5 RPC bảo mật quyền người gửi/người nhận và giới hạn 5 tin ghim", () => {
    const sqlPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261123_024_messenger_interactions.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    expect(sql).toContain("edit_my_message");
    expect(sql).toContain("recall_message_for_everyone");
    expect(sql).toContain("hide_message_for_me");
    expect(sql).toContain("clear_conversation_for_me");
    expect(sql).toContain("toggle_message_reaction");
    expect(sql).toContain("toggle_pin_message");
    // Xóa đoạn chat chỉ được phép ẩn cho v_me, tuyệt đối không DELETE cứng tin nhắn của đối phương
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.messages/i);
    expect(sql).toContain("PIN_LIMIT_REACHED");
    expect(sql).toContain("v_pinned_count >= 5");
    expect(sql).toContain("v_row.sender_id <> v_me");
    expect(sql).toContain("hidden_for_user_ids");
    expect(sql).toContain("last_reaction_emoji");
    expect(sql).toContain("last_reaction_at");
  });

  it("formatReactionActivityPreview hiển thị đúng câu thông báo thả cảm xúc ở thanh đoạn chat bên ngoài", () => {
    expect(
      formatReactionActivityPreview({
        emoji: "❤️",
        actorId: "user-viet",
        targetSenderId: "user-khue",
        currentUserId: "user-khue",
        friendName: "Việt",
      })
    ).toBe("Việt đã thả tim tin nhắn của bạn");

    expect(
      formatReactionActivityPreview({
        emoji: "😆",
        actorId: "user-viet",
        targetSenderId: "user-khue",
        currentUserId: "user-khue",
        friendName: "Việt",
      })
    ).toBe("Việt đã thả haha tin nhắn của bạn");

    expect(
      formatReactionActivityPreview({
        emoji: "❤️",
        actorId: "user-khue",
        targetSenderId: "user-viet",
        currentUserId: "user-khue",
        friendName: "Việt",
      })
    ).toBe("Bạn đã thả tim tin nhắn của Việt");
  });

  it("hasUnreadReactionFromFriend bật badge thông báo khi đối phương thả cảm xúc mới và tắt sau khi đã mở xem", () => {
    const item = {
      friend_id: "user-viet",
      last_reaction_emoji: "❤️",
      last_reaction_by: "user-viet",
      last_reaction_at: "2026-11-23T11:05:00Z",
    };

    // Chưa mở xem -> phải hiện badge thông báo
    expect(hasUnreadReactionFromFriend(item, "user-khue", {})).toBe(true);
    // Đã mở xem từ trước khi bạn thả tim -> vẫn hiện badge
    expect(
      hasUnreadReactionFromFriend(item, "user-khue", {
        "user-viet": "2026-11-23T11:00:00Z",
      })
    ).toBe(true);
    // Đã mở xem sau khi bạn thả tim -> tắt badge
    expect(
      hasUnreadReactionFromFriend(item, "user-khue", {
        "user-viet": "2026-11-23T11:06:00Z",
      })
    ).toBe(false);
    // Chính mình thả -> không bật badge cho chính mình
    expect(hasUnreadReactionFromFriend(item, "user-viet", {})).toBe(false);
  });
});
