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
  isMessengerSchemaMissingError,
  parseFriendQrPayload,
  uploadChatImageDetailed,
} from "@/lib/messenger-utils";

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

  const totalUnreadMessages = useMemo(
    () => friends.reduce((sum, item) => sum + (item.unread_count || 0), 0),
    [friends]
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
    totalUnreadMessages,
    totalBadgeCount,
    isLoading,
    refetch,
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
  const { data: messages = [], isLoading } = useQuery({
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

  // Truy vấn Kho ảnh đã gửi qua lại giữa 2 tài khoản trực tiếp từ DB
  const { data: sharedImages = [], isLoading: isLoadingMedia } = useQuery({
    queryKey: mediaQueryKey,
    enabled: Boolean(currentUserId && friendId && isSupabaseConfigured()),
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!currentUserId || !friendId) return [];
      const { data, error } = await (supabase as any)
        .from("messages")
        .select("id, sender_id, receiver_id, content, image_url, is_read, read_at, created_at")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`
        )
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(120);

      if (error) return [];
      return (data || []) as ChatMessage[];
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

  // Tự động đánh dấu đã đọc khi mở khung chat hoặc có tin nhắn mới đến từ bạn bè
  useEffect(() => {
    if (!currentUserId || !friendId || messages.length === 0) return;
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
          queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
            old.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
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

  // Gửi tin nhắn văn bản và/hoặc hình ảnh — LƯU VĨNH VIỄN TRÊN DB (chỉ cho phép khi đã là bạn bè)
  const sendMessageMutation = useMutation({
    mutationFn: async (params: { content?: string; imageFile?: File | null }) => {
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

        const { data, error } = await (supabase as any)
          .from("messages")
          .insert({
            sender_id: currentUserId,
            receiver_id: friendId,
            content: trimmedText,
            image_url: uploadedImage?.url || null,
          })
          .select("*")
          .single();

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

  // Thu hồi / xóa tin nhắn của chính mình (đồng bộ dọn cả file ảnh trên Storage nếu có)
  const deleteMessageMutation = useMutation({
    mutationFn: async (msg: ChatMessage) => {
      const { error } = await (supabase as any)
        .from("messages")
        .delete()
        .eq("id", msg.id);
      if (error) throw error;

      // Trích đường dẫn file từ image_storage_path hoặc public URL của bucket chat-images để dọn sạch Storage
      const storagePath =
        msg.image_storage_path ||
        (msg.image_url?.includes("/storage/v1/object/public/chat-images/")
          ? decodeURIComponent(
              msg.image_url.split("/storage/v1/object/public/chat-images/")[1].split("?")[0]
            )
          : null);

      if (storagePath && supabase?.storage) {
        try {
          await supabase.storage.from("chat-images").remove([storagePath]);
        } catch {
          // Không chặn flow nếu file đã bị xóa trước đó
        }
      }
    },
    onSuccess: (_data, msg) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) =>
        old.filter((m) => m.id !== msg.id)
      );
      queryClient.invalidateQueries({
        queryKey: ["messenger-network", currentUserId],
      });
      if (msg.image_url) {
        queryClient.invalidateQueries({ queryKey: mediaQueryKey });
      }
    },
  });

  return {
    messages,
    sharedImages,
    isLoading,
    isLoadingMedia,
    hasMoreMessages,
    isLoadingOlder,
    loadOlderMessages,
    friendIsTyping,
    notifyTyping,
    markAsRead,
    sendMessage: (params: { content?: string; imageFile?: File | null }) =>
      sendMessageMutation.mutateAsync(params),
    isSending: sendMessageMutation.isPending,
    deleteMessage: (msg: ChatMessage) => deleteMessageMutation.mutateAsync(msg),
  };
}
