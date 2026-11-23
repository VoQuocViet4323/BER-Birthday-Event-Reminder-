"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  UserPlus,
  UserMinus,
  QrCode,
  Search,
  Check,
  X,
  Users,
  Clock,
  Image as ImageIcon,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useMessengerNetwork } from "@/hooks/use-messenger";
import { useUserSettings } from "@/hooks/use-user-settings";
import { ChatWindow } from "@/components/messenger/chat-window";
import { MyQrModal } from "@/components/messenger/my-qr-modal";
import { AddFriendModal } from "@/components/messenger/add-friend-modal";
import {
  formatMessageRelativeTime,
  formatReactionActivityPreview,
  getFixedFriendCode,
  isUserOnline,
} from "@/lib/messenger-utils";
import { cn } from "@/lib/utils";

function MessengerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useUserSettings();

  const {
    currentUserId,
    schemaMissing,
    friends,
    incomingRequests,
    outgoingRequests,
    totalUnreadMessages,
    isLoading,
    refetch,
    searchUserForFriend,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriendship,
  } = useMessengerNetwork();

  const [activeTab, setActiveTab] = useState<"chats" | "friends" | "requests">("chats");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMyQr, setShowMyQr] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [deepLinkAddCode, setDeepLinkAddCode] = useState<string | null>(null);
  const [mobileViewport, setMobileViewport] = useState<{ top: number; height: number } | null>(null);

  // Bắt đường dẫn từ QR hoặc Chuông Thông Báo (?add=BER-..., ?tab=requests, ?chat=friendId)
  useEffect(() => {
    const addParam = searchParams.get("add");
    const tabParam = searchParams.get("tab");
    const chatParam = searchParams.get("chat");
    let handled = false;

    if (addParam && addParam.trim()) {
      setDeepLinkAddCode(addParam.trim());
      setShowAddFriend(true);
      handled = true;
    }
    if (tabParam === "requests" || tabParam === "friends" || tabParam === "chats") {
      setActiveTab(tabParam);
      if (tabParam !== "chats") setSelectedFriendId(null);
      handled = true;
    }
    if (chatParam && chatParam.trim()) {
      setActiveTab("chats");
      setSelectedFriendId(chatParam.trim());
      handled = true;
    }

    if (handled) {
      router.replace("/messenger", { scroll: false });
    }
  }, [searchParams, router]);

  // Chọn đối tượng bạn bè hiện tại (nếu đã hủy kết bạn thì tự xóa lựa chọn)
  const selectedFriend = useMemo(
    () => friends.find((f) => f.friend_id === selectedFriendId) || null,
    [friends, selectedFriendId]
  );

  // Khi đang mở khung chat trên Mobile, ẩn thanh MobileBottomNav & bám sát visualViewport (fix lỗi bàn phím ảo iOS đẩy mất tin nhắn)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("ber-messenger-chat-active", {
        detail: { active: Boolean(selectedFriend) },
      })
    );

    if (!selectedFriend) {
      setMobileViewport(null);
      return () => {
        window.dispatchEvent(
          new CustomEvent("ber-messenger-chat-active", {
            detail: { active: false },
          })
        );
      };
    }

    const syncMobileViewport = () => {
      if (window.innerWidth >= 1024) {
        setMobileViewport(null);
        return;
      }
      const vv = window.visualViewport;
      if (vv) {
        setMobileViewport({
          top: Math.max(0, vv.offsetTop),
          height: vv.height,
        });
      } else {
        setMobileViewport({
          top: 0,
          height: window.innerHeight,
        });
      }
    };

    syncMobileViewport();
    window.visualViewport?.addEventListener("resize", syncMobileViewport);
    window.visualViewport?.addEventListener("scroll", syncMobileViewport);
    window.addEventListener("resize", syncMobileViewport);

    // Khóa cuộn body phía sau trên Mobile để bàn phím ảo không đẩy trang web nhảy lên trên
    const prevBodyOverflow = document.body.style.overflow;
    if (window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.visualViewport?.removeEventListener("resize", syncMobileViewport);
      window.visualViewport?.removeEventListener("scroll", syncMobileViewport);
      window.removeEventListener("resize", syncMobileViewport);
      document.body.style.overflow = prevBodyOverflow;
      window.dispatchEvent(
        new CustomEvent("ber-messenger-chat-active", {
          detail: { active: false },
        })
      );
    };
  }, [selectedFriend]);

  // Lọc danh sách đoạn chat theo từ khóa
  const filteredFriends = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.display_name.toLowerCase().includes(q) ||
        (f.email || "").toLowerCase().includes(q) ||
        f.friend_code.toLowerCase().includes(q)
    );
  }, [friends, searchTerm]);

  // Danh sách tất cả bạn bè: ưu tiên người đang Online lên trên, sau đó sắp xếp A-Z tiếng Việt
  const sortedAllFriends = useMemo(() => {
    return [...filteredFriends].sort((a, b) => {
      const aOnline = isUserOnline(a.last_seen_at) ? 1 : 0;
      const bOnline = isUserOnline(b.last_seen_at) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      return (a.display_name || "").localeCompare(b.display_name || "", "vi");
    });
  }, [filteredFriends]);

  const onlineFriendsCount = useMemo(
    () => friends.filter((f) => isUserOnline(f.last_seen_at)).length,
    [friends]
  );

  const myFriendCode = getFixedFriendCode(currentUserId || profile?.id, profile?.friend_code);

  const handleAcceptAndChat = async (friendshipId: string, friendId: string) => {
    await acceptFriendRequest(friendshipId);
    setActiveTab("chats");
    setSelectedFriendId(friendId);
  };

  const handleUnfriend = async (friendshipId: string) => {
    await removeFriendship(friendshipId);
    setSelectedFriendId(null);
  };

  return (
    <div
      className={cn(
        "w-full flex flex-col lg:h-[calc(100vh-7.5rem)]",
        selectedFriend ? "h-[calc(100dvh-4rem)]" : "h-[calc(100dvh-4rem-4.25rem)]"
      )}
    >
      {/* Banner nhắc chạy Migration nếu DB chưa tạo bảng Messenger */}
      {schemaMissing && (
        <div className="mb-3 mx-3 sm:mx-0 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5 text-amber-600 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Cần kích hoạt bảng Messenger trên Supabase</p>
              <p className="text-[11px] opacity-90">
                Vui lòng chạy file{" "}
                <code className="px-1.5 py-0.5 rounded bg-amber-500/15 font-mono">
                  supabase/migrations/20261123_023_messenger_and_friends.sql
                </code>{" "}
                trong Supabase SQL Editor để kích hoạt kết bạn, mã QR cố định và nhắn tin realtime.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-200 font-bold shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Khung Messenger chính: 2 cột trên PC, Master/Detail chuyển mượt trên Mobile */}
      <div className="flex-1 min-h-0 bg-card/75 backdrop-blur-xl lg:rounded-3xl lg:border border-border/70 lg:shadow-soft overflow-hidden grid grid-cols-1 lg:grid-cols-[356px_1fr]">
        {/* CỘT TRÁI: Danh sách đoạn chat, Tất cả bạn bè & Lời mời kết bạn */}
        <section className="flex flex-col min-h-0 border-r border-border/60 bg-card/60">
          {/* Thanh tiêu đề & 2 nút hành động nhanh (QR cố định + Thêm bạn) */}
          <div className="px-4 pt-4 pb-3 border-b border-border/60 space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl gradient-brand text-white flex items-center justify-center shadow-soft shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-extrabold text-foreground leading-tight">
                    Messenger
                  </h1>
                  <p className="text-[10.5px] text-muted-foreground whitespace-nowrap truncate">
                    Mã: <span className="font-bold text-primary tracking-wide">{myFriendCode}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMyQr(true)}
                  className="w-9 h-9 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/70 text-foreground hover:text-primary flex items-center justify-center transition-all active:scale-95 cursor-pointer touch-manipulation shrink-0"
                  title="Mã QR cố định của tôi"
                  aria-label="Mã QR cố định của tôi"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeepLinkAddCode(null);
                    setShowAddFriend(true);
                  }}
                  className="h-9 px-3 rounded-xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
                  title="Thêm bạn qua Email hoặc Quét mã QR"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span>Thêm bạn</span>
                </button>
              </div>
            </div>

            {/* Ô tìm kiếm trong danh bạ */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === "friends"
                    ? "Tìm theo tên, email hoặc mã BER-..."
                    : "Tìm bạn bè trong đoạn chat..."
                }
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary/60 border border-border/60 focus:border-primary/70 focus:outline-none text-xs text-foreground placeholder:text-muted-foreground/70 transition-colors"
              />
            </div>

            {/* Tabs Đoạn chat / Bạn bè / Lời mời */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-secondary/70 border border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab("chats")}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap",
                  activeTab === "chats"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Đoạn chat</span>
                {totalUnreadMessages > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] gradient-brand text-white font-extrabold">
                    {totalUnreadMessages > 99 ? "99+" : totalUnreadMessages}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("friends")}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap",
                  activeTab === "friends"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Bạn bè</span>
                {friends.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/15 text-primary font-extrabold">
                    {friends.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("requests")}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap",
                  activeTab === "requests"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Lời mời</span>
                {incomingRequests.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold">
                    {incomingRequests.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Nội dung danh sách cuộn */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 overscroll-contain">
            {activeTab === "chats" ? (
              isLoading ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-2xl bg-secondary/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">
                      {searchTerm
                        ? "Không tìm thấy bạn bè phù hợp"
                        : "Chưa có cuộc trò chuyện nào"}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Kết bạn qua Email hoặc quét mã QR. Sau khi hai bên chấp nhận kết bạn, khung chat realtime sẽ mở ngay!
                    </p>
                  </div>
                  {!searchTerm && (
                    <div className="flex flex-col gap-2 pt-1 max-w-[220px] mx-auto">
                      <button
                        type="button"
                        onClick={() => setShowAddFriend(true)}
                        className="py-2 px-3 rounded-xl gradient-brand text-white text-xs font-bold shadow-soft cursor-pointer active:scale-95 transition-all"
                      >
                        + Thêm bạn (Email / QR)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMyQr(true)}
                        className="py-2 px-3 rounded-xl bg-secondary hover:bg-secondary/80 border border-border/70 text-foreground text-xs font-bold cursor-pointer active:scale-95 transition-all"
                      >
                        Xem mã QR cố định của tôi
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredFriends.map((item) => {
                  const isActive = item.friend_id === selectedFriendId;
                  const online = isUserOnline(item.last_seen_at);
                  const isMineLast = item.last_message_sender_id === currentUserId;
                  const hasUnread = item.unread_count > 0;

                  const msgTime = item.last_message_at ? new Date(item.last_message_at).getTime() : 0;
                  const reactTime = item.last_reaction_at ? new Date(item.last_reaction_at).getTime() : 0;
                  const showReactionAsLatest = Boolean(
                    item.last_reaction_emoji && item.last_reaction_by && reactTime >= msgTime && reactTime > 0
                  );
                  const reactionPreviewText = showReactionAsLatest
                    ? formatReactionActivityPreview({
                        emoji: item.last_reaction_emoji,
                        actorId: item.last_reaction_by,
                        targetSenderId: item.last_reaction_target_sender_id,
                        currentUserId,
                        friendName: item.display_name,
                      })
                    : null;
                  const latestActivityAt = showReactionAsLatest
                    ? item.last_reaction_at
                    : item.last_message_at || item.updated_at;

                  return (
                    <button
                      key={item.friendship_id}
                      type="button"
                      onClick={() => setSelectedFriendId(item.friend_id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all cursor-pointer touch-manipulation",
                        isActive
                          ? "bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/25 shadow-2xs"
                          : "hover:bg-secondary/70 border border-transparent"
                      )}
                    >
                      {/* Avatar + Chấm Online */}
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-2xl gradient-brand p-0.5 overflow-hidden">
                          <div className="w-full h-full rounded-[14px] bg-card overflow-hidden flex items-center justify-center">
                            {item.avatar_url ? (
                              <img
                                src={item.avatar_url}
                                alt={item.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full gradient-brand text-white font-bold text-sm flex items-center justify-center">
                                {(item.display_name || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        {online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                        )}
                      </div>

                      {/* Tên + Tin nhắn cuối */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "text-xs sm:text-[13px] truncate",
                              hasUnread
                                ? "font-extrabold text-foreground"
                                : "font-bold text-foreground"
                            )}
                          >
                            {item.display_name}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatMessageRelativeTime(latestActivityAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={cn(
                              "text-[11px] truncate flex items-center gap-1",
                              hasUnread || (showReactionAsLatest && item.last_reaction_by !== currentUserId)
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground"
                            )}
                          >
                            {reactionPreviewText ? (
                              <span className="truncate">{reactionPreviewText}</span>
                            ) : item.last_message_content ? (
                              <>
                                {isMineLast &&
                                  item.last_message_content !== "Tin nhắn đã được thu hồi" && (
                                    <span>Bạn:</span>
                                  )}
                                <span className="truncate">{item.last_message_content}</span>
                              </>
                            ) : item.last_message_image_url ? (
                              <span className="inline-flex items-center gap-1">
                                <ImageIcon className="w-3 h-3 shrink-0" />
                                {isMineLast ? "Bạn đã gửi một ảnh" : "Đã gửi một ảnh"}
                              </span>
                            ) : (
                              <span className="italic opacity-80">
                                Đã kết bạn • Bắt đầu trò chuyện
                              </span>
                            )}
                          </p>
                          {hasUnread && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full gradient-brand text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                              {item.unread_count > 9 ? "9+" : item.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : activeTab === "friends" ? (
              /* TAB TẤT CẢ BẠN BÈ */
              <div className="space-y-2.5 p-1">
                <div className="flex items-center justify-between px-1.5">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tất cả bạn bè ({sortedAllFriends.length})
                  </h2>
                  {onlineFriendsCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {onlineFriendsCount} trực tuyến
                    </span>
                  )}
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-2xl bg-secondary/50 animate-pulse" />
                    ))}
                  </div>
                ) : sortedAllFriends.length === 0 ? (
                  <div className="py-10 px-4 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        {searchTerm
                          ? "Không tìm thấy bạn bè nào khớp từ khóa"
                          : "Danh sách bạn bè đang trống"}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Thêm bạn bè qua Email hoặc quét mã QR cố định để kết nối ngay.
                      </p>
                    </div>
                    {!searchTerm && (
                      <button
                        type="button"
                        onClick={() => setShowAddFriend(true)}
                        className="py-2 px-4 rounded-xl gradient-brand text-white text-xs font-bold shadow-soft cursor-pointer active:scale-95 transition-all"
                      >
                        + Thêm bạn mới
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {sortedAllFriends.map((friend) => {
                      const online = isUserOnline(friend.last_seen_at);
                      const isConfirming = confirmRemoveId === friend.friendship_id;

                      return (
                        <div
                          key={friend.friendship_id}
                          className="p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/60 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFriendId(friend.friend_id);
                                setActiveTab("chats");
                              }}
                              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-2xl gradient-brand p-0.5 overflow-hidden">
                                  <div className="w-full h-full rounded-[14px] bg-card overflow-hidden flex items-center justify-center">
                                    {friend.avatar_url ? (
                                      <img
                                        src={friend.avatar_url}
                                        alt={friend.display_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full gradient-brand text-white font-bold text-sm flex items-center justify-center">
                                        {(friend.display_name || "U").charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {online && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-[13px] font-bold text-foreground truncate">
                                  {friend.display_name}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {online ? (
                                    <span className="text-emerald-500 font-medium">
                                      Đang hoạt động
                                    </span>
                                  ) : (
                                    friend.email || friend.friend_code
                                  )}
                                </p>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFriendId(friend.friend_id);
                                  setActiveTab("chats");
                                }}
                                className="w-8 h-8 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                                title="Nhắn tin ngay"
                                aria-label={`Nhắn tin với ${friend.display_name}`}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmRemoveId(
                                    isConfirming ? null : friend.friendship_id
                                  )
                                }
                                className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer",
                                  isConfirming
                                    ? "bg-rose-500/20 text-rose-500"
                                    : "bg-secondary hover:bg-rose-500/15 text-muted-foreground hover:text-rose-500"
                                )}
                                title="Hủy kết bạn"
                                aria-label={`Hủy kết bạn với ${friend.display_name}`}
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isConfirming && (
                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/50 text-[11px]">
                              <span className="text-muted-foreground">Hủy kết bạn?</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveId(null)}
                                  className="px-2.5 py-1 rounded-lg bg-secondary text-foreground font-semibold cursor-pointer"
                                >
                                  Giữ lại
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setConfirmRemoveId(null);
                                    await handleUnfriend(friend.friendship_id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold cursor-pointer"
                                >
                                  Xác nhận
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* TAB LỜI MỜI KẾT BẠN */
              <div className="space-y-4 p-1">
                {/* Lời mời đến */}
                <div className="space-y-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Lời mời kết bạn đến ({incomingRequests.length})
                  </h2>
                  {incomingRequests.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-secondary/35 border border-border/50 text-center text-xs text-muted-foreground">
                      Chưa có lời mời kết bạn nào đang chờ duyệt.
                    </div>
                  ) : (
                    incomingRequests.map((req) => (
                      <div
                        key={req.friendship_id}
                        className="p-3 rounded-2xl bg-secondary/50 border border-border/70 space-y-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl gradient-brand p-0.5 shrink-0 overflow-hidden">
                            <div className="w-full h-full rounded-[10px] bg-card overflow-hidden flex items-center justify-center">
                              {req.avatar_url ? (
                                <img
                                  src={req.avatar_url}
                                  alt={req.display_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-bold text-primary">
                                  {(req.display_name || "U").charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">
                              {req.display_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {req.email || req.friend_code}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleAcceptAndChat(req.friendship_id, req.friend_id)
                            }
                            className="py-1.5 px-3 rounded-xl gradient-brand text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Chấp nhận</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFriendship(req.friendship_id)}
                            className="py-1.5 px-3 rounded-xl bg-secondary hover:bg-rose-500/15 hover:text-rose-500 border border-border/70 text-xs font-bold text-muted-foreground flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Từ chối</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Lời mời đã gửi */}
                {outgoingRequests.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                      Đã gửi lời mời ({outgoingRequests.length})
                    </h2>
                    {outgoingRequests.map((req) => (
                      <div
                        key={req.friendship_id}
                        className="p-3 rounded-2xl bg-secondary/35 border border-border/60 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl gradient-brand p-0.5 shrink-0 overflow-hidden">
                            <div className="w-full h-full rounded-[10px] bg-card overflow-hidden flex items-center justify-center text-xs font-bold">
                              {req.avatar_url ? (
                                <img
                                  src={req.avatar_url}
                                  alt={req.display_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (req.display_name || "U").charAt(0).toUpperCase()
                              )}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {req.display_name}
                            </p>
                            <p className="text-[10px] text-amber-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" /> Đang chờ chấp nhận
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFriendship(req.friendship_id)}
                          className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-rose-500/15 hover:text-rose-500 text-[11px] font-bold text-muted-foreground transition-colors cursor-pointer shrink-0"
                        >
                          Hủy
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* CỘT PHẢI: Khung trò chuyện Realtime (PC Split-View) */}
        <section className="hidden lg:flex min-h-0 flex-col">
          {selectedFriend && currentUserId ? (
            <ChatWindow
              currentUserId={currentUserId}
              friend={selectedFriend}
              onBackMobile={() => setSelectedFriendId(null)}
              onUnfriend={handleUnfriend}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-5 bg-gradient-to-br from-purple-500/[0.03] via-transparent to-pink-500/[0.04]">
              <div className="w-20 h-20 rounded-3xl gradient-brand text-white flex items-center justify-center shadow-soft">
                <MessageCircle className="w-10 h-10" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold mb-1">
                  <Sparkles className="w-3 h-3" /> Nhắn tin riêng tư thời gian thực
                </div>
                <h2 className="text-lg font-extrabold text-foreground">
                  Kết nối & Trò chuyện cùng người thân
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Chọn một cuộc trò chuyện ở danh sách bên trái, hoặc thêm bạn bè mới bằng <strong>Email</strong> / <strong>Quét mã QR</strong>. Hai tài khoản sẽ nhắn tin & gửi ảnh realtime ngay sau khi chấp nhận kết bạn.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddFriend(true)}
                  className="px-4 py-2.5 rounded-2xl gradient-brand text-white text-xs font-bold shadow-soft hover:shadow-soft-hover active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Thêm bạn mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMyQr(true)}
                  className="px-4 py-2.5 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground text-xs font-bold active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-primary" />
                  <span>Mã QR của tôi</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Lớp phủ Phòng Chat Mobile với hiệu ứng trượt mượt mà (slide-in/out) & bám sát VisualViewport khi bật bàn phím */}
      <AnimatePresence>
        {selectedFriend && currentUserId && (
          <motion.div
            key={`mobile-chat-${selectedFriend.friend_id}`}
            initial={{ x: "100%", opacity: 0.92 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.92 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            style={
              mobileViewport
                ? { top: `${mobileViewport.top}px`, height: `${mobileViewport.height}px` }
                : undefined
            }
            className="lg:hidden fixed inset-x-0 top-0 h-[100dvh] z-[60] bg-background flex flex-col overflow-hidden shadow-2xl"
          >
            <ChatWindow
              currentUserId={currentUserId}
              friend={selectedFriend}
              onBackMobile={() => setSelectedFriendId(null)}
              onUnfriend={handleUnfriend}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Mã QR cố định của tôi */}
      <MyQrModal
        isOpen={showMyQr}
        onClose={() => setShowMyQr(false)}
        userId={currentUserId || profile?.id}
        friendCode={profile?.friend_code}
        displayName={profile?.display_name}
        email={profile?.email}
        avatarUrl={profile?.avatar_url}
      />

      {/* Modal Thêm bạn qua Email / Quét mã QR */}
      <AddFriendModal
        isOpen={showAddFriend}
        onClose={() => {
          setShowAddFriend(false);
          setDeepLinkAddCode(null);
        }}
        initialQuery={deepLinkAddCode}
        onSearch={searchUserForFriend}
        onSendRequest={sendFriendRequest}
        onAcceptRequest={acceptFriendRequest}
        onCancelRequest={removeFriendship}
        onOpenChat={(friendId) => {
          setActiveTab("chats");
          setSelectedFriendId(friendId);
        }}
      />
    </div>
  );
}

export default function MessengerPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-[70vh] rounded-3xl bg-card/60 border border-border/60 animate-pulse" />
      }
    >
      <MessengerContent />
    </Suspense>
  );
}
