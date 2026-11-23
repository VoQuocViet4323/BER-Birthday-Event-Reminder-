"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import {
  ChatMessage,
  FriendNetworkItem,
  FriendSearchResult,
} from "@/types/messenger";
import {
  canPinMoreMessages,
  hasUnreadReactionFromFriend,
  isMessageHiddenForUser,
  isMessengerSchemaMissingError,
  MAX_PINNED_MESSAGES,
  parseFriendQrPayload,
  uploadChatImageDetailed,
} from "@/lib/messenger-utils";

const SEEN_REACTIONS_STORAGE_KEY = "ber_messenger_seen_reactions";
const SEEN_REACTIONS_EVENT = "ber-messenger-seen-reactions-updated";

function readSeenReactionsMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SEEN_REACTIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function markFriendReactionsAsSeen(friendId: string, seenAtIso?: string) {
  if (typeof window === "undefined" || !friendId) return;
  try {
    const map = readSeenReactionsMap();
    const nextIso = seenAtIso || new Date().toISOString();
    const prevTs = map[friendId] ? new Date(map[friendId]).getTime() : 0;
    const nextTs = new Date(nextIso).getTime();
    if (!Number.isNaN(nextTs) && nextTs <= prevTs) return;
    map[friendId] = nextIso;
    localStorage.setItem(SEEN_REACTIONS_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(SEEN_REACTIONS_EVENT));
  } catch {}
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project")
  );
}

// Bộ quản lý singleton ref-counted cho kênh Realtime messenger-network
// Tránh mở trùng tên channel khi nhiều component (Header, Sidebar, MessengerPage) cùng gọi useMessengerNetwork()
const networkChannelRegistry = new Map<
  string,
  { channel: any; refCount: number }
>();

export function useMessengerNetwork() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [seenReactionMap, setSeenReactionMap] = useState<Record<string, string>>(() =>
    readSeenReactionsMap()
  );

  // Đồng bộ trạng thái đã xem cảm xúc giữa AppHeader, DesktopSidebar và MessengerPage
  useEffect(() => {
    const syncSeen = () => setSeenReactionMap(readSeenReactionsMap());
    window.addEventListener(SEEN_REACTIONS_EVENT, syncSeen);
    window.addEventListener("storage", syncSeen);
    return () => {
      window.removeEventListener(SEEN_REACTIONS_EVENT, syncSeen);
      window.removeEventListener("storage", syncSeen);
    };
  }, []);

  // Lấy phiên người dùng hiện tại & đồng bộ khi đổi tài khoản
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setCurrentUserId(data.session?.user?.id || null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setCurrentUserId(session?.user?.id || null);
        queryClient.invalidateQueries({ queryKey: ["messenger-network"] });
        queryClient.invalidateQueries({ queryKey: ["messenger-messages"] });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, queryClient]);

  // Gửi heartbeat định kỳ để cập nhật trạng thái Online cho bạn bè thấy
  useEffect(() => {
    if (!currentUserId || !isSupabaseConfigured()) return;
    const ping = () => {
      (supabase as any).rpc("update_user_heartbeat").then(() => {}, () => {});
    };
    ping();
    const interval = setInterval(ping, 60_000);
    return () => clearInterval(interval);
  }, [currentUserId, supabase]);

  // Truy vấn danh sách bạn bè & lời mời kết bạn
  const {
    data: network = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["messenger-network", currentUserId],
    enabled: Boolean(currentUserId && isSupabaseConfigured()),
    refetchInterval: 30_000,
    queryFn: async (): Promise<FriendNetworkItem[]> => {
      const { data, error } = await (supabase as any).rpc("get_my_friend_network");
      if (error) {
        if (isMessengerSchemaMissingError(error)) {
          setSchemaMissing(true);
          return [];
        }
        throw error;
      }
      setSchemaMissing(false);
      return (data || []).map((row: any) => ({
        ...row,
        unread_count: Number(row.unread_count || 0),
      })) as FriendNetworkItem[];
    },
  });

  // Lắng nghe Realtime cho bảng friendships & messages (dùng singleton ref-counted, không bao giờ trùng channel)
  useEffect(() => {
    if (!currentUserId || !isSupabaseConfigured() || schemaMissing) return;

    const existing = networkChannelRegistry.get(currentUserId);
    if (existing) {
      existing.refCount += 1;
    } else {
      const uniqueName = `messenger-network-${currentUserId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const channel = supabase
        .channel(uniqueName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "friendships" },
          (payload: any) => {
            const row = payload.new || payload.old;
            if (
              !row ||
              row.requester_id === currentUserId ||
              row.addressee_id === currentUserId
            ) {
              queryClient.invalidateQueries({
                queryKey: ["messenger-network", currentUserId],
              });
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload: any) => {
            const row = payload.new || payload.old;
            if (
              !row ||
              row.sender_id === currentUserId ||
              row.receiver_id === currentUserId
            ) {
              queryClient.invalidateQueries({
                queryKey: ["messenger-network", currentUserId],
              });
            }
          }
        )
        .subscribe();

      networkChannelRegistry.set(currentUserId, { channel, refCount: 1 });
    }

    return () => {
      const entry = networkChannelRegistry.get(currentUserId);
      if (!entry) return;
      entry.refCount -= 1;
      if (entry.refCount <= 0) {
        networkChannelRegistry.delete(currentUserId);
        supabase.removeChannel(entry.channel);
      }
    };
  }, [currentUserId, schemaMissing, supabase, queryClient]);

  // Phân loại bạn bè đã chấp nhận, lời mời đến, lời mời đã gửi
  const friends = useMemo(
    () => network.filter((item) => item.status === "accepted"),
    [network]
  );

  const incomingRequests = useMemo(
    () =>
      network.filter(
        (item) => item.status === "pending" && item.addressee_id === currentUserId
      ),
    [network, currentUserId]
  );

  const outgoingRequests = useMemo(
    () =>
      network.filter(
        (item) => item.status === "pending" && item.requester_id === currentUserId
      ),
    [network, currentUserId]
  );

  const unreadReactionFriendIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of friends) {
      if (hasUnreadReactionFromFriend(item, currentUserId, seenReactionMap)) {
        ids.add(item.friend_id);
      }
    }
    return ids;
  }, [friends, currentUserId, seenReactionMap]);

  const totalUnreadMessages = useMemo(
    () =>
      friends.reduce((sum, item) => {
        const msgUnread = item.unread_count || 0;
        const reactUnread =
          msgUnread === 0 && unreadReactionFriendIds.has(item.friend_id) ? 1 : 0;
        return sum + msgUnread + reactUnread;
      }, 0),
    [friends, unreadReactionFriendIds]
  );

  const totalBadgeCount = totalUnreadMessages + incomingRequests.length;

  // Tìm người dùng theo Email hoặc Mã QR cố định
  const searchUserForFriend = useCallback(
    async (rawInput: string): Promise<{ user: FriendSearchResult | null; error?: string }> => {
      if (!isSupabaseConfigured() || !currentUserId) {
        return { user: null, error: "Vui lòng đăng nhập để tìm kiếm bạn bè." };
      }

      const parsed = parseFriendQrPayload(rawInput);
      const queryValue = parsed.value || rawInput.trim();
      if (!queryValue || queryValue.length < 3) {
        return { user: null, error: "Vui lòng nhập email hoặc mã QR hợp lệ." };
      }

      const { data, error } = await (supabase as any).rpc("find_user_for_friend", {
        p_query: queryValue,
      });

      if (error) {
        if (isMessengerSchemaMissingError(error)) {
          setSchemaMissing(true);
          return {
            user: null,
            error: "Hệ thống Messenger chưa được khởi tạo trên Supabase. Vui lòng chạy migration 023.",
          };
        }
        return { user: null, error: error.message || "Không thể tìm kiếm tài khoản." };
      }

      const first = Array.isArray(data) ? data[0] : data;
      return { user: first || null };
    },
    [currentUserId, supabase]
  );

  // Gửi lời mời kết bạn
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error("Bạn chưa đăng nhập.");
      if (targetUserId === currentUserId) {
        throw new Error("Không thể tự kết bạn với chính tài khoản của mình.");
      }

      const { error } = await (supabase as any).from("friendships").insert({
        requester_id: currentUserId,
        addressee_id: targetUserId,
        status: "pending",
      });

      if (error) {
        if (String(error.code) === "23505") {
          throw new Error("Hai bạn đã có lời mời kết bạn hoặc đã là bạn bè.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messenger-network", currentUserId] });
      toast({
        title: "Đã gửi lời mời kết bạn! ✨",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: err?.message || "Không thể gửi lời mời kết bạn",
        variant: "error",
      });
    },
  });

  // Chấp nhận lời mời kết bạn
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await (supabase as any)
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messenger-network", currentUserId] });
      toast({
        title: "Đã chấp nhận kết bạn! Giờ 2 bạn có thể nhắn tin 🎉",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: err?.message || "Không thể chấp nhận lời mời",
        variant: "error",
      });
    },
  });

  // Từ chối lời mời / Hủy lời mời / Hủy kết bạn
  const removeFriendshipMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await (supabase as any)
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messenger-network", currentUserId] });
    },
    onError: (err: any) => {
      toast({
        title: err?.message || "Không thể cập nhật trạng thái kết bạn",
        variant: "error",
      });
    },
  });

  return {
    currentUserId,
    schemaMissing,
    network,
    friends,
    incomingRequests,
    outgoingRequests,
    unreadReactionFriendIds,
    totalUnreadMessages,
    totalBadgeCount,
    isLoading,
    refetch,
    markFriendReactionsAsSeen,
    searchUserForFriend,
    sendFriendRequest: (targetUserId: string) =>
      sendFriendRequestMutation.mutateAsync(targetUserId),
    acceptFriendRequest: (friendshipId: string) =>
      acceptFriendRequestMutation.mutateAsync(friendshipId),
    removeFriendship: (friendshipId: string) =>
      removeFriendshipMutation.mutateAsync(friendshipId),
    isSendingRequest: sendFriendRequestMutation.isPending,
    isAcceptingRequest: acceptFriendRequestMutation.isPending,
    isRemovingFriendship: removeFriendshipMutation.isPending,
  };
}

const MESSAGE_PAGE_SIZE = 100;

/**
 * Hook quản lý luồng nhắn tin thời gian thực giữa currentUserId và 1 người bạn cụ thể
 * Toàn bộ lịch sử tin nhắn & ảnh được đọc/ghi bền vững trực tiếp trên PostgreSQL DB & Supabase Storage
 */
export function useConversation(
  currentUserId: string | null,
  friendId: string | null,
  isAcceptedFriend: boolean
) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const lastTypingEmitRef = useRef<number>(0);

  const queryKey = useMemo(
    () => ["messenger-messages", currentUserId, friendId],
    [currentUserId, friendId]
  );

  const mediaQueryKey = useMemo(
    () => ["messenger-shared-media", currentUserId, friendId],
    [currentUserId, friendId]
  );

  // Reset trạng thái phân trang khi đổi cuộc trò chuyện
  useEffect(() => {
    setHasMoreMessages(false);
    setIsLoadingOlder(false);
  }, [friendId, currentUserId]);

  // Tải 100 tin nhắn MỚI NHẤT giữa 2 người từ DB (tránh mất tin mới khi lịch sử dài > 100 tin)
  const { data: rawMessages = [], isLoading } = useQuery({
    queryKey,
    enabled: Boolean(currentUserId && friendId && isSupabaseConfigured()),
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!currentUserId || !friendId) return [];
      const { data, error } = await (supabase as any)
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: false })
        .limit(MESSAGE_PAGE_SIZE + 1);

      if (error) throw error;
      const rows = (data || []) as ChatMessage[];
      setHasMoreMessages(rows.length > MESSAGE_PAGE_SIZE);
      return rows.slice(0, MESSAGE_PAGE_SIZE).reverse();
    },
  });

  // Lọc bỏ các tin nhắn người dùng hiện tại đã chọn "Xóa chỉ ở phía mình"
  const messages = useMemo(
    () => rawMessages.filter((m) => !isMessageHiddenForUser(m, currentUserId)),
    [rawMessages, currentUserId]
  );

  // Danh sách tin nhắn đã ghim trong cuộc trò chuyện (tối đa 5 tin, sắp xếp mới ghim lên trước)
  const pinnedMessages = useMemo(
    () =>
      messages
        .filter((m) => Boolean(m.is_pinned) && !m.is_recalled)
        .sort(
          (a, b) =>
            new Date(b.pinned_at || b.created_at).getTime() -
            new Date(a.pinned_at || a.created_at).getTime()
        ),
    [messages]
  );

  // Tải thêm các tin nhắn cũ hơn trực tiếp từ DB (phân trang lùi theo created_at)
  const loadOlderMessages = useCallback(async () => {
    if (!currentUserId || !friendId || !isSupabaseConfigured() || isLoadingOlder || !hasMoreMessages) {
      return;
    }
    const oldest = messages.find((m) => !m.optimistic);
    if (!oldest) return;

    setIsLoadingOlder(true);
    try {
      const { data, error } = await (supabase as any)
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`
        )
        .lt("created_at", oldest.created_at)
        .order("created_at", { ascending: false })
        .limit(MESSAGE_PAGE_SIZE + 1);

      if (error) throw error;
      const rows = (data || []) as ChatMessage[];
      setHasMoreMessages(rows.length > MESSAGE_PAGE_SIZE);
      const olderBatch = rows.slice(0, MESSAGE_PAGE_SIZE).reverse();

      queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) => {
        const existingIds = new Set(old.map((m) => m.id));
        const uniqueOlder = olderBatch.filter((m) => !existingIds.has(m.id));
        return [...uniqueOlder, ...old];
      });
    } catch (err: any) {
      toast({
        title: err?.message || "Không thể tải thêm tin nhắn cũ",
        variant: "error",
      });
    } finally {
      setIsLoadingOlder(false);
    }
  }, [currentUserId, friendId, isLoadingOlder, hasMoreMessages, messages, supabase, queryClient, queryKey, toast]);

  // Truy vấn Kho ảnh đã gửi qua lại giữa 2 tài khoản trực tiếp từ DB (loại bỏ ảnh đã thu hồi / đã ẩn ở phía mình)
  const { data: sharedImages = [], isLoading: isLoadingMedia } = useQuery({
    queryKey: mediaQueryKey,
    enabled: Boolean(currentUserId && friendId && isSupabaseConfigured()),
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!currentUserId || !friendId) return [];
      const { data, error } = await (supabase as any)
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`
        )
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(120);

      if (error) return [];
      return ((data || []) as ChatMessage[]).filter(
        (m) => !m.is_recalled && !isMessageHiddenForUser(m, currentUserId)
      );
    },
  });

  // Đánh dấu đã đọc toàn bộ tin nhắn từ người bạn này
  const markAsRead = useCallback(async () => {
    if (!currentUserId || !friendId || !isSupabaseConfigured()) return;
    try {
      await (supabase as any).rpc("mark_conversation_read", {
        p_friend_id: friendId,
      });
      queryClient.invalidateQueries({
        queryKey: ["messenger-network", currentUserId],
      });
    } catch {
      // Bỏ qua lỗi mạng tạm thời
    }
  }, [currentUserId, friendId, supabase, queryClient]);

  // Tự động đánh dấu đã đọc tin nhắn & đã xem cảm xúc khi đang mở khung chat với người bạn này
  useEffect(() => {
    if (!currentUserId || !friendId) return;
    markFriendReactionsAsSeen(friendId);
    if (messages.length === 0) return;
    const hasUnreadFromFriend = messages.some(
      (m) => m.sender_id === friendId && m.receiver_id === currentUserId && !m.is_read
    );
    if (hasUnreadFromFriend) {
      markAsRead();
    }
  }, [currentUserId, friendId, messages, markAsRead]);

  // Đăng ký kênh Realtime cho đoạn chat (Tách riêng kênh DB với tên duy nhất và kênh Broadcast Đang nhập)
  useEffect(() => {
    if (!currentUserId || !friendId || !isSupabaseConfigured()) return;
    const pairKey = [currentUserId, friendId].sort().join("_");
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 1. Kênh Postgres Changes (tên duy nhất tránh xung đột React StrictMode / chuyển phòng nhanh)
    const dbChannel = supabase
      .channel(`chat-db-${pairKey}-${uniqueSuffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload: any) => {
          let msg = payload.new as ChatMessage;
          const isThisConversation =
            (msg.sender_id === currentUserId && msg.receiver_id === friendId) ||
            (msg.sender_id === friendId && msg.receiver_id === currentUserId);

          if (!isThisConversation) return;

          // Bảo vệ trường hợp cột lớn (ví dụ ảnh fallback base64) bị cắt trong payload Realtime TOAST
          if (!msg.content && !msg.image_url && msg.id) {
            const { data: fullRow } = await (supabase as any)
              .from("messages")
              .select("*")
              .eq("id", msg.id)
              .maybeSingle();
            if (fullRow) {
              msg = fullRow as ChatMessage;
            }
          }

          queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) => {
            if (old.some((m) => m.id === msg.id)) return old;
            const cleaned = old.filter(
              (m) =>
                !(
                  m.optimistic &&
                  m.sender_id === msg.sender_id &&
                  m.content === msg.content &&
                  Boolean(m.image_url) === Boolean(msg.image_url)
                )
            );
            return [...cleaned, msg];
          });

          if (msg.image_url) {
            queryClient.invalidateQueries({ queryKey: mediaQueryKey });
          }

          if (msg.sender_id === friendId) {
            setFriendIsTyping(false);
            markAsRead();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload: any) => {
          const updated = payload.new as ChatMessage;
          const isThisConversation =
            (updated.sender_id === currentUserId && updated.receiver_id === friendId) ||
            (updated.sender_id === friendId && updated.receiver_id === currentUserId);
          if (!isThisConversation) return;

          queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
            old.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
          if (friendId) {
            markFriendReactionsAsSeen(friendId, new Date().toISOString());
          }
          if (updated.is_recalled || isMessageHiddenForUser(updated, currentUserId)) {
            queryClient.invalidateQueries({ queryKey: mediaQueryKey });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload: any) => {
          const deleted = payload.old as { id?: string };
          if (!deleted?.id) return;
          queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
            old.filter((m) => m.id !== deleted.id)
          );
          queryClient.invalidateQueries({ queryKey: mediaQueryKey });
        }
      )
      .subscribe();

    // 2. Kênh Broadcast dùng chung topic giữa 2 tài khoản để hiển thị "Đang nhập..."
    const typingChannel = supabase
      .channel(`chat-typing-${pairKey}`)
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (payload?.payload?.userId === friendId) {
          setFriendIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setFriendIsTyping(false);
          }, 2600);
        }
      })
      .subscribe();

    channelRef.current = typingChannel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setFriendIsTyping(false);
      channelRef.current = null;
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [currentUserId, friendId, supabase, queryClient, queryKey, mediaQueryKey, markAsRead]);

  // Phát tín hiệu "Đang nhập..." có throttle 1.5s
  const notifyTyping = useCallback(() => {
    if (!currentUserId || !channelRef.current || !isAcceptedFriend) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 1500) return;
    lastTypingEmitRef.current = now;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }, [currentUserId, isAcceptedFriend]);

  // Gửi tin nhắn văn bản và/hoặc hình ảnh (có hỗ trợ reply_to_id) — LƯU VĨNH VIỄN TRÊN DB
  const sendMessageMutation = useMutation({
    mutationFn: async (params: {
      content?: string;
      imageFile?: File | null;
      replyToId?: string | null;
    }) => {
      if (!currentUserId || !friendId) {
        throw new Error("Chưa chọn người nhận tin nhắn.");
      }
      if (!isAcceptedFriend) {
        throw new Error("Hai bạn cần chấp nhận kết bạn trước khi nhắn tin qua lại.");
      }

      const trimmedText = (params.content || "").trim();
      if (!trimmedText && !params.imageFile) {
        throw new Error("Vui lòng nhập nội dung hoặc chọn ảnh để gửi.");
      }

      const previewBlobUrl = params.imageFile ? URL.createObjectURL(params.imageFile) : null;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const optimisticMsg: ChatMessage = {
        id: tempId,
        sender_id: currentUserId,
        receiver_id: friendId,
        content: trimmedText,
        image_url: previewBlobUrl,
        reply_to_id: params.replyToId || null,
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        optimistic: true,
      };

      // Chèn ngay vào UI để phản hồi tức thì
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) => [...old, optimisticMsg]);

      try {
        let uploadedImage: Awaited<ReturnType<typeof uploadChatImageDetailed>> | null = null;
        if (params.imageFile) {
          uploadedImage = await uploadChatImageDetailed(
            supabase,
            currentUserId,
            params.imageFile
          );
        }

        const insertPayload: Record<string, any> = {
          sender_id: currentUserId,
          receiver_id: friendId,
          content: trimmedText,
          image_url: uploadedImage?.url || null,
          ...(params.replyToId ? { reply_to_id: params.replyToId } : {}),
        };

        let { data, error } = await (supabase as any)
          .from("messages")
          .insert(insertPayload)
          .select("*")
          .single();

        // Fallback tương thích nếu DB chưa chạy migration 024 có cột reply_to_id
        if (error && params.replyToId && (String(error.code) === "42703" || String(error.code) === "PGRST204")) {
          const retry = await (supabase as any)
            .from("messages")
            .insert({
              sender_id: currentUserId,
              receiver_id: friendId,
              content: trimmedText,
              image_url: uploadedImage?.url || null,
            })
            .select("*")
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) {
          if (String(error.code) === "42501") {
            throw new Error("Không thể gửi tin nhắn vì hai tài khoản chưa kết bạn.");
          }
          throw error;
        }

        const savedMsg = data as ChatMessage;
        queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) => {
          const withoutTemp = old.filter((m) => m.id !== tempId);
          if (withoutTemp.some((m) => m.id === savedMsg.id)) return withoutTemp;
          return [...withoutTemp, savedMsg];
        });

        queryClient.invalidateQueries({
          queryKey: ["messenger-network", currentUserId],
        });
        if (savedMsg.image_url) {
          queryClient.invalidateQueries({ queryKey: mediaQueryKey });
        }

        return savedMsg;
      } catch (err) {
        // Xóa tin nháp nếu ghi DB thất bại
        queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
          old.filter((m) => m.id !== tempId)
        );
        throw err;
      } finally {
        if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      }
    },
    onError: (err: any) => {
      toast({
        title: err?.message || "Gửi tin nhắn thất bại",
        variant: "error",
      });
    },
  });

  // 1. Chỉnh sửa tin nhắn của chính mình (lưu DB + đánh dấu edited_at)
  const editMessageMutation = useMutation({
    mutationFn: async (params: { messageId: string; content: string }) => {
      const clean = params.content.trim();
      if (!clean) throw new Error("Nội dung tin nhắn không được để trống.");

      const { data, error } = await (supabase as any).rpc("edit_my_message", {
        p_message_id: params.messageId,
        p_new_content: clean,
      });

      if (error) {
        if (String(error.code) === "42883" || String(error.code) === "PGRST202") {
          throw new Error("Vui lòng chạy migration 024 trên Supabase để dùng tính năng chỉnh sửa tin nhắn.");
        }
        throw error;
      }
      if (data && data.success === false) {
        throw new Error(data.message || "Không thể chỉnh sửa tin nhắn.");
      }
      return data?.data as ChatMessage | undefined;
    },
    onSuccess: (updated, vars) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
        old.map((m) =>
          m.id === vars.messageId
            ? {
                ...m,
                ...(updated || {}),
                content: vars.content.trim(),
                edited_at: updated?.edited_at || new Date().toISOString(),
              }
            : m
        )
      );
      queryClient.invalidateQueries({ queryKey: ["messenger-network", currentUserId] });
      toast({ title: "Đã chỉnh sửa tin nhắn", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Không thể chỉnh sửa tin nhắn", variant: "error" });
    },
  });

  // 2. Thu hồi tin nhắn với MỌI NGƯỜI (chỉ người gửi có quyền)
  const recallForEveryoneMutation = useMutation({
    mutationFn: async (msg: ChatMessage) => {
      const { data, error } = await (supabase as any).rpc("recall_message_for_everyone", {
        p_message_id: msg.id,
      });

      if (error) {
        if (String(error.code) === "42883" || String(error.code) === "PGRST202") {
          throw new Error("Vui lòng chạy migration 024 trên Supabase để dùng tính năng thu hồi với mọi người.");
        }
        throw error;
      }
      if (data && data.success === false) {
        throw new Error(data.message || "Không thể thu hồi tin nhắn.");
      }

      // Dọn file ảnh cũ trên Storage nếu tin thu hồi có ảnh
      const oldUrl = data?.old_image_url || msg.image_url;
      const storagePath =
        msg.image_storage_path ||
        (oldUrl?.includes("/storage/v1/object/public/chat-images/")
          ? decodeURIComponent(
              oldUrl.split("/storage/v1/object/public/chat-images/")[1].split("?")[0]
            )
          : null);
      if (storagePath && supabase?.storage) {
        try {
          await supabase.storage.from("chat-images").remove([storagePath]);
        } catch {}
      }

      return data?.data as ChatMessage | undefined;
    },
    onSuccess: (updated, msg) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
        old.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                ...(updated || {}),
                is_recalled: true,
                content: "",
                image_url: null,
                is_pinned: false,
                reactions: {},
              }
            : m
        )
      );
      queryClient.invalidateQueries({ queryKey: ["messenger-network", currentUserId] });
      queryClient.invalidateQueries({ queryKey: mediaQueryKey });
      toast({ title: "Đã thu hồi tin nhắn với mọi người", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Thu hồi tin nhắn thất bại", variant: "error" });
    },
  });

  // 3. Xóa tin nhắn CHỈ Ở PHÍA MÌNH (áp dụng cho cả tin mình & tin người khác — họ vẫn thấy bình thường)
  const hideForMeMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await (supabase as any).rpc("hide_message_for_me", {
        p_message_id: messageId,
      });

      if (error) {
        if (String(error.code) === "42883" || String(error.code) === "PGRST202") {
          throw new Error("Vui lòng chạy migration 024 trên Supabase để dùng tính năng xóa ở phía bạn.");
        }
        throw error;
      }
      if (data && data.success === false) {
        throw new Error(data.message || "Không thể xóa tin nhắn ở phía bạn.");
      }
      return data?.data as ChatMessage | undefined;
    },
    onSuccess: (_updated, messageId) => {
      if (!currentUserId) return;
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
        old.map((m) =>
          m.id === messageId
            ? {
                ...m,
                hidden_for_user_ids: Array.from(
                  new Set([...(m.hidden_for_user_ids || []), currentUserId])
                ),
              }
            : m
        )
      );
      queryClient.invalidateQueries({ queryKey: ["messenger-network", currentUserId] });
      queryClient.invalidateQueries({ queryKey: mediaQueryKey });
      toast({ title: "Đã xóa tin nhắn ở phía bạn", variant: "success" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Không thể xóa tin nhắn", variant: "error" });
    },
  });

  // 4. Thả / Đổi / Gỡ cảm xúc tin nhắn (Realtime 2 chiều)
  const toggleReactionMutation = useMutation({
    mutationFn: async (params: { messageId: string; emoji: string }) => {
      if (!currentUserId) throw new Error("Bạn chưa đăng nhập.");

      // Optimistic update ngay trên UI
      const prevData = queryClient.getQueryData<ChatMessage[]>(queryKey);
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
        old.map((m) => {
          if (m.id !== params.messageId) return m;
          const nextReactions = { ...(m.reactions || {}) };
          if (nextReactions[currentUserId] === params.emoji) {
            delete nextReactions[currentUserId];
          } else {
            nextReactions[currentUserId] = params.emoji;
          }
          return { ...m, reactions: nextReactions };
        })
      );

      const { data, error } = await (supabase as any).rpc("toggle_message_reaction", {
        p_message_id: params.messageId,
        p_emoji: params.emoji,
      });

      if (error || data?.success === false) {
        if (prevData) queryClient.setQueryData(queryKey, prevData);
        if (error && (String(error.code) === "42883" || String(error.code) === "PGRST202")) {
          throw new Error("Vui lòng chạy migration 024 trên Supabase để thả cảm xúc tin nhắn.");
        }
        throw new Error(data?.message || error?.message || "Không thể thả cảm xúc.");
      }

      return data?.data as ChatMessage | undefined;
    },
    onSuccess: (updated, vars) => {
      if (updated) {
        queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
          old.map((m) => (m.id === vars.messageId ? { ...m, ...updated } : m))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["messenger-network", currentUserId] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Không thể thả cảm xúc", variant: "error" });
    },
  });

  // 5. Ghim / Bỏ ghim tin nhắn (giới hạn nghiêm ngặt tối đa 5 tin nhắn ghim mỗi đoạn chat)
  const togglePinMutation = useMutation({
    mutationFn: async (msg: ChatMessage) => {
      if (!msg.is_pinned && !canPinMoreMessages(pinnedMessages.length)) {
        throw new Error(
          `Chỉ có thể ghim tối đa ${MAX_PINNED_MESSAGES} tin nhắn. Hãy bỏ ghim bớt 1 tin trước.`
        );
      }

      const { data, error } = await (supabase as any).rpc("toggle_pin_message", {
        p_message_id: msg.id,
      });

      if (error) {
        if (String(error.code) === "42883" || String(error.code) === "PGRST202") {
          throw new Error("Vui lòng chạy migration 024 trên Supabase để sử dụng tính năng ghim tin nhắn.");
        }
        throw error;
      }
      if (data && data.success === false) {
        throw new Error(data.message || "Không thể ghim tin nhắn.");
      }
      return data as { pinned: boolean; data?: ChatMessage };
    },
    onSuccess: (res, msg) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
        old.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                ...(res.data || {}),
                is_pinned: res.pinned,
                pinned_at: res.pinned ? res.data?.pinned_at || new Date().toISOString() : null,
                pinned_by: res.pinned ? currentUserId : null,
              }
            : m
        )
      );
      toast({
        title: res.pinned ? "Đã ghim tin nhắn 📌" : "Đã bỏ ghim tin nhắn",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Không thể cập nhật ghim tin nhắn", variant: "error" });
    },
  });

  // 6. Xóa toàn bộ đoạn chat CHỈ Ở PHÍA MÌNH (đối phương vẫn còn nguyên toàn bộ tin nhắn & ảnh)
  const clearConversationForMeMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !friendId) throw new Error("Chưa chọn cuộc trò chuyện.");
      const { data, error } = await (supabase as any).rpc("clear_conversation_for_me", {
        p_friend_id: friendId,
      });

      if (error) {
        if (String(error.code) === "42883" || String(error.code) === "PGRST202") {
          throw new Error(
            "Vui lòng chạy bổ sung hàm clear_conversation_for_me trong migration 024 trên Supabase."
          );
        }
        throw error;
      }
      if (data && data.success === false) {
        throw new Error(data.message || "Không thể xóa đoạn chat.");
      }
      return data;
    },
    onSuccess: () => {
      if (!currentUserId || !friendId) return;
      queryClient.setQueryData<ChatMessage[]>(queryKey, []);
      queryClient.setQueryData<ChatMessage[]>(mediaQueryKey, []);
      setHasMoreMessages(false);
      markFriendReactionsAsSeen(friendId, new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ["messenger-network", currentUserId] });
      toast({
        title: "Đã xóa toàn bộ đoạn chat ở phía bạn",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: err?.message || "Không thể xóa toàn bộ đoạn chat",
        variant: "error",
      });
    },
  });

  return {
    messages,
    pinnedMessages,
    sharedImages,
    isLoading,
    isLoadingMedia,
    hasMoreMessages,
    isLoadingOlder,
    loadOlderMessages,
    friendIsTyping,
    notifyTyping,
    markAsRead,
    sendMessage: (params: {
      content?: string;
      imageFile?: File | null;
      replyToId?: string | null;
    }) => sendMessageMutation.mutateAsync(params),
    isSending: sendMessageMutation.isPending,
    editMessage: (params: { messageId: string; content: string }) =>
      editMessageMutation.mutateAsync(params),
    isEditing: editMessageMutation.isPending,
    recallForEveryone: (msg: ChatMessage) => recallForEveryoneMutation.mutateAsync(msg),
    hideForMe: (messageId: string) => hideForMeMutation.mutateAsync(messageId),
    clearConversationForMe: () => clearConversationForMeMutation.mutateAsync(),
    isClearingConversation: clearConversationForMeMutation.isPending,
    toggleReaction: (params: { messageId: string; emoji: string }) =>
      toggleReactionMutation.mutateAsync(params),
    togglePin: (msg: ChatMessage) => togglePinMutation.mutateAsync(msg),
  };
}
