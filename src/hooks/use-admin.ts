"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { EventRow, EventWithMeta, EventFormValues, Profile } from "@/types/events";
import {
  calculateNextOccurrence,
  calculateDaysRemaining,
  calculateUpcomingAge,
  formatEventDateDisplay,
} from "@/lib/date-utils";
import { initialMockEvents } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

export interface AdminEventWithMeta extends EventWithMeta {
  owner_name?: string;
}

export interface AdminUserItem extends Profile {
  email?: string;
  events_count?: number;
  last_seen_at?: string | null;
  banned_until?: string | null;
  ban_reason?: string | null;
}

export function useAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();

  const isConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

  // 1. Query danh sách tất cả sự kiện trong toàn hệ thống
  const {
    data: allEvents = [],
    isLoading: isLoadingEvents,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["admin-all-events"],
    queryFn: async (): Promise<AdminEventWithMeta[]> => {
      const today = new Date();

      if (isConfigured) {
        let rawEvents: any[] = [];

        // 1.1 Ưu tiên gọi RPC get_all_events_for_admin (Security Definer - Lấy 100% sự kiện toàn hệ thống)
        try {
          const rpcRes = await (supabase as any).rpc("get_all_events_for_admin");
          if (rpcRes.data && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
            rawEvents = rpcRes.data;
          }
        } catch {
          // Tiếp tục fallback tầng 2
        }

        // 1.2 Nếu RPC chưa có, thử query trực tiếp từ bảng events kèm profiles
        if (rawEvents.length === 0) {
          try {
            const { data, error } = await (supabase as any)
              .from("events")
              .select("*, profiles:user_id(display_name)")
              .order("created_at", { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
              rawEvents = data.map((ev: any) => ({
                ...ev,
                owner_name: ev.profiles?.display_name || "Người dùng",
              }));
            }
          } catch (err) {
            console.warn("Direct query events error:", err);
          }
        }

        // 1.3 TẦNG BẢO HIỂM THỨ 3: Fallback qua cron_get_active_events_and_settings
        // Đảm bảo Admin luôn thấy đầy đủ 100% sự kiện ngay cả khi hàm is_admin() chưa tồn tại trên DB
        if (rawEvents.length === 0) {
          try {
            const cronRes = await (supabase as any).rpc("cron_get_active_events_and_settings");
            if (cronRes.data && Array.isArray(cronRes.data) && cronRes.data.length > 0) {
              const extracted: any[] = [];
              cronRes.data.forEach((item: any) => {
                const ownerName = item.profile?.display_name || "Người dùng";
                (item.events || []).forEach((ev: any) => {
                  extracted.push({
                    ...ev,
                    owner_name: ownerName,
                  });
                });
              });
              if (extracted.length > 0) {
                rawEvents = extracted;
              }
            }
          } catch (cronErr) {
            console.warn("Fallback cron events error:", cronErr);
          }
        }

        if (rawEvents.length > 0) {
          return rawEvents.map((ev: any) => {
            const nextOccurrence = calculateNextOccurrence(ev, today);
            const daysRemaining = calculateDaysRemaining(nextOccurrence, today);
            const upcomingAge = calculateUpcomingAge(ev.event_year, nextOccurrence.getFullYear());
            const displayDate = formatEventDateDisplay(
              ev.event_day,
              ev.event_month,
              ev.event_year,
              ev.is_lunar
            );

            return {
              ...ev,
              owner_name: ev.owner_name || ev.profiles?.display_name || "Người dùng",
              nextOccurrence,
              daysRemaining,
              upcomingAge,
              displayDate,
            };
          });
        }
      }

      // Local storage fallback
      const raw = typeof window !== "undefined" ? localStorage.getItem("ber-local-events") : null;
      const list: EventRow[] = raw ? JSON.parse(raw) : initialMockEvents;

      return list.map((ev) => {
        const nextOccurrence = calculateNextOccurrence(ev, today);
        const daysRemaining = calculateDaysRemaining(nextOccurrence, today);
        const upcomingAge = calculateUpcomingAge(ev.event_year, nextOccurrence.getFullYear());
        const displayDate = formatEventDateDisplay(
          ev.event_day,
          ev.event_month,
          ev.event_year,
          ev.is_lunar
        );

        return {
          ...ev,
          owner_name: "Tài khoản mẫu",
          nextOccurrence,
          daysRemaining,
          upcomingAge,
          displayDate,
        };
      });
    },
  });

  // 2. Query danh sách tất cả người dùng trong hệ thống trực tiếp từ DB
  const {
    data: allUsers = [],
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async (): Promise<AdminUserItem[]> => {
      if (isConfigured) {
        const eventsByUser: Record<string, number> = {};
        let profilesList: any[] = [];

        // 2.1 Truy vấn danh sách người dùng từ bảng profiles và events
        try {
          const [profilesRes, eventsRes] = await Promise.all([
            (supabase as any).from("profiles").select("*"),
            (supabase as any).from("events").select("id, user_id"),
          ]);

          if (eventsRes.data) {
            eventsRes.data.forEach((e: any) => {
              eventsByUser[e.user_id] = (eventsByUser[e.user_id] || 0) + 1;
            });
          }

          if (profilesRes.data && Array.isArray(profilesRes.data)) {
            profilesList = [...profilesRes.data];
          }
        } catch (err) {
          console.warn("Direct query profiles error:", err);
        }

        // 2.2 Nếu RLS profiles chỉ trả về 1 tài khoản (chính admin), thử gọi RPC get_all_users_for_admin
        if (profilesList.length <= 1) {
          try {
            const rpcRes = await (supabase as any).rpc("get_all_users_for_admin");
            if (rpcRes.data && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
              profilesList = rpcRes.data;
            }
          } catch {
            // Tiếp tục fallback tầng 3
          }
        }

        // 2.3 TẦNG BẢO HIỂM THỨ 3: Nếu vẫn <= 1 (do hàm is_admin() chưa tồn tại trên DB khiến RPC trên lỗi),
        // tự động đọc từ cron_get_active_events_and_settings (đã hoạt động ổn định 100%)
        if (profilesList.length <= 1) {
          try {
            const cronRes = await (supabase as any).rpc("cron_get_active_events_and_settings");
            if (cronRes.data && Array.isArray(cronRes.data) && cronRes.data.length > 0) {
              cronRes.data.forEach((item: any) => {
                if (item.profile && item.profile.id) {
                  const existingIndex = profilesList.findIndex((p: any) => p.id === item.profile.id);
                  const isMasterAdmin =
                    item.profile.email === "admin@ber-app.com" ||
                    item.profile.display_name === "Admin" ||
                    item.profile.display_name === "Quản Trị Hệ Thống";
                  const profileData = {
                    id: item.profile.id,
                    display_name: item.profile.display_name || (isMasterAdmin ? "Quản Trị Hệ Thống" : "Người dùng"),
                    username: item.profile.email ? item.profile.email.split("@")[0] : (isMasterAdmin ? "admin" : "user"),
                    email: item.profile.email,
                    timezone: item.profile.timezone || "Asia/Ho_Chi_Minh",
                    role: isMasterAdmin ? "admin" : (item.profile.role || "user"),
                    onboarded: true,
                    created_at: new Date().toISOString(),
                    last_seen_at: item.profile.last_seen_at || null,
                    banned_until: item.profile.banned_until || null,
                    ban_reason: item.profile.ban_reason || null,
                  };

                  if (existingIndex >= 0) {
                    profilesList[existingIndex] = { ...profilesList[existingIndex], ...profileData };
                  } else {
                    profilesList.push(profileData);
                  }

                  if (item.events && Array.isArray(item.events)) {
                    eventsByUser[item.profile.id] = (eventsByUser[item.profile.id] || 0) + item.events.length;
                  }
                }
              });
            }
          } catch (cronErr) {
            console.warn("Fallback cron users error:", cronErr);
          }
        }

        const userMap = new Map<string, AdminUserItem>();
        profilesList.forEach((p: any) => {
          const email = p.email || (p.username ? `${p.username}@ber-app.com` : "");
          const username = p.username || (email ? email.split("@")[0] : "");
          userMap.set(p.id, {
            id: p.id,
            display_name: p.display_name || username || "Người dùng",
            username,
            role: p.role || "user",
            email,
            timezone: p.timezone || "Asia/Ho_Chi_Minh",
            avatar_url: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username || p.id}`,
            onboarded: p.onboarded ?? true,
            created_at: p.created_at || new Date().toISOString(),
            events_count: eventsByUser[p.id] || 0,
            last_seen_at: p.last_seen_at || null,
            banned_until: p.banned_until || null,
            ban_reason: p.ban_reason || null,
          });
        });

        if (userMap.size > 0) {
          return Array.from(userMap.values()).sort((a, b) => {
            // Admin lên đầu, sau đó sắp xếp theo ngày tạo mới nhất
            if (a.role === "admin" && b.role !== "admin") return -1;
            if (a.role !== "admin" && b.role === "admin") return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
        }
      }

      // Local storage fallback
      return [
        {
          id: "admin-user-id",
          display_name: "Quản Trị Hệ Thống",
          username: "admin",
          email: "admin@ber-app.com",
          avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=Admin",
          timezone: "Asia/Ho_Chi_Minh",
          onboarded: true,
          role: "admin",
          created_at: new Date().toISOString(),
          events_count: allEvents.length,
        },
      ];
    },
  });

  // 3. Sửa sự kiện (Admin Action - Có Optimistic UI + RPC Security Definer)
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EventFormValues }) => {
      const payload = {
        name: values.name,
        event_type: values.event_type,
        event_day: values.event_day,
        event_month: values.event_month,
        event_year: values.event_year || null,
        is_lunar: values.is_lunar,
        group_name: values.group_name,
        note: values.note || null,
        gift_idea: values.gift_idea || null,
        avatar_url: values.avatar_url || null,
        repeat_yearly: values.repeat_yearly,
        remind_days: values.remind_days || [0],
        remind_time: values.remind_time || "08:00",
        custom_type: values.custom_type || null,
        custom_group: values.custom_group || null,
        enabled: values.enabled,
      };

      if (isConfigured) {
        // Ưu tiên 1: Gọi RPC admin_update_event (Security Definer vượt RLS)
        const { error: rpcError } = await (supabase as any).rpc("admin_update_event", {
          p_event_id: id,
          p_payload: payload,
        });

        if (rpcError) {
          // Ưu tiên 2: Direct update trên bảng events (không dùng .single() để tránh PGRST116)
          const { data: updatedRows, error: updateError } = await (supabase as any)
            .from("events")
            .update(payload as any)
            .eq("id", id)
            .select();

          if (updateError) throw updateError;
          if (!updatedRows || updatedRows.length === 0) {
            throw new Error(
              "Chưa kích hoạt quyền sửa sự kiện cho Admin trên Database. Vui lòng chạy file SQL Migration 020 trong Supabase SQL Editor!"
            );
          }
          return updatedRows[0];
        }
        return { id, ...payload };
      }

      // Local storage
      const raw = typeof window !== "undefined" ? localStorage.getItem("ber-local-events") : null;
      const list: EventRow[] = raw ? JSON.parse(raw) : initialMockEvents;
      const updated = list.map((e) =>
        e.id === id
          ? {
              ...e,
              ...payload,
              updated_at: new Date().toISOString(),
            }
          : e
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("ber-local-events", JSON.stringify(updated));
      }
      return updated.find((e) => e.id === id);
    },
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-all-events"] });
      const prevEvents = queryClient.getQueryData<AdminEventWithMeta[]>(["admin-all-events"]);
      if (prevEvents) {
        const today = new Date();
        queryClient.setQueryData<AdminEventWithMeta[]>(
          ["admin-all-events"],
          prevEvents.map((ev) => {
            if (ev.id !== id) return ev;
            const merged = { ...ev, ...values, event_year: values.event_year || null };
            const nextOccurrence = calculateNextOccurrence(merged as any, today);
            const daysRemaining = calculateDaysRemaining(nextOccurrence, today);
            const upcomingAge = calculateUpcomingAge(merged.event_year, nextOccurrence.getFullYear());
            const displayDate = formatEventDateDisplay(
              merged.event_day,
              merged.event_month,
              merged.event_year,
              merged.is_lunar
            );
            return {
              ...merged,
              nextOccurrence,
              daysRemaining,
              upcomingAge,
              displayDate,
            };
          })
        );
      }
      return { prevEvents };
    },
    onError: (err: any, _vars, context) => {
      if (context?.prevEvents) {
        queryClient.setQueryData(["admin-all-events"], context.prevEvents);
      }
      toast({
        title: "Không thể cập nhật sự kiện",
        description: err.message,
        variant: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Admin: Đã cập nhật sự kiện thành công! 🛡️",
        variant: "success",
      });
    },
  });

  // 4. Xóa sự kiện (Admin Action - Có Optimistic UI + RPC Security Definer)
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isConfigured) {
        // Ưu tiên 1: Gọi RPC admin_delete_event (Security Definer vượt RLS)
        const { error: rpcError } = await (supabase as any).rpc("admin_delete_event", {
          p_event_id: id,
        });

        if (rpcError) {
          // Ưu tiên 2: Direct delete kèm .select() để kiểm tra số dòng thực sự bị xóa
          const { data: deletedRows, error: delError } = await (supabase as any)
            .from("events")
            .delete()
            .eq("id", id)
            .select();

          if (delError) throw delError;
          if (!deletedRows || deletedRows.length === 0) {
            throw new Error(
              "Chưa kích hoạt quyền xóa sự kiện cho Admin trên Database. Vui lòng chạy file SQL Migration 020 trong Supabase SQL Editor!"
            );
          }
        }
        return id;
      }

      const raw = typeof window !== "undefined" ? localStorage.getItem("ber-local-events") : null;
      const list: EventRow[] = raw ? JSON.parse(raw) : initialMockEvents;
      const updated = list.filter((e) => e.id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem("ber-local-events", JSON.stringify(updated));
      }
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["admin-all-events"] });
      const prevEvents = queryClient.getQueryData<AdminEventWithMeta[]>(["admin-all-events"]);
      if (prevEvents) {
        queryClient.setQueryData<AdminEventWithMeta[]>(
          ["admin-all-events"],
          prevEvents.filter((ev) => ev.id !== id)
        );
      }
      return { prevEvents };
    },
    onError: (err: any, _id, context) => {
      if (context?.prevEvents) {
        queryClient.setQueryData(["admin-all-events"], context.prevEvents);
      }
      toast({
        title: "Không thể xóa sự kiện",
        description: err.message,
        variant: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Admin: Đã xóa sự kiện khỏi hệ thống! 🗑️",
        variant: "success",
      });
    },
  });

  // 5. Bật / Tắt sự kiện (Admin Action - Có Optimistic UI + RPC Security Definer)
  const toggleEventMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      if (isConfigured) {
        const { error: rpcError } = await (supabase as any).rpc("admin_toggle_event", {
          p_event_id: id,
          p_enabled: enabled,
        });

        if (rpcError) {
          const { data: updatedRows, error: updateError } = await (supabase as any)
            .from("events")
            .update({ enabled } as any)
            .eq("id", id)
            .select();

          if (updateError) throw updateError;
          if (!updatedRows || updatedRows.length === 0) {
            throw new Error("Cần chạy SQL Migration 020 để Admin bật/tắt sự kiện của người dùng khác.");
          }
        }
      } else {
        const raw = typeof window !== "undefined" ? localStorage.getItem("ber-local-events") : null;
        const list: EventRow[] = raw ? JSON.parse(raw) : initialMockEvents;
        const updated = list.map((e) => (e.id === id ? { ...e, enabled } : e));
        if (typeof window !== "undefined") {
          localStorage.setItem("ber-local-events", JSON.stringify(updated));
        }
      }
    },
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-all-events"] });
      const prevEvents = queryClient.getQueryData<AdminEventWithMeta[]>(["admin-all-events"]);
      if (prevEvents) {
        queryClient.setQueryData<AdminEventWithMeta[]>(
          ["admin-all-events"],
          prevEvents.map((ev) => (ev.id === id ? { ...ev, enabled } : ev))
        );
      }
      return { prevEvents };
    },
    onError: (err: any, _vars, context) => {
      if (context?.prevEvents) {
        queryClient.setQueryData(["admin-all-events"], context.prevEvents);
      }
      toast({
        title: "Không thể thay đổi trạng thái sự kiện",
        description: err.message,
        variant: "error",
      });
    },
    onSuccess: (_data, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: enabled ? "Đã bật nhắc nhở sự kiện 🔔" : "Đã tắt nhắc nhở sự kiện 🔕",
        variant: "success",
      });
    },
  });

  // 6. Đổi vai trò người dùng (Promote/Demote role)
  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: "user" | "admin" }) => {
      if (newRole === "user") {
        const target = allUsers.find((u) => u.id === userId);
        if (target?.username === "admin" || target?.display_name === "Hệ Thống Admin") {
          throw new Error("Không thể hạ quyền tài khoản Quản trị viên tối cao (admin)!");
        }
      }

      if (isConfigured) {
        const { error } = await (supabase as any)
          .from("profiles")
          .update({ role: newRole } as any)
          .eq("id", userId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, { newRole }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-settings-and-profile"] });
      toast({
        title: `Đã đổi quyền người dùng thành "${newRole.toUpperCase()}"`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Không thể đổi quyền người dùng",
        description: err.message,
        variant: "error",
      });
    },
  });

  // 7. Xóa người dùng vĩnh viễn khỏi Database (Admin Action)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (isConfigured) {
        const { data, error } = await (supabase as any).rpc("admin_delete_user", {
          p_target_user_id: userId,
        });
        if (error) {
          if (error.code === "PGRST202" || error.message?.includes("admin_delete_user")) {
            throw new Error(
              "Hàm 'admin_delete_user' chưa được tạo trên Supabase. Vui lòng mở Supabase Dashboard > SQL Editor và chạy đoạn mã migration 010_fix_admin_delete_user.sql một lần duy nhất để kích hoạt!"
            );
          }
          throw error;
        }
        if (data && data.success === false) {
          throw new Error(data.message || "Không thể xóa người dùng");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      toast({
        title: "Admin: Đã xóa tài khoản người dùng khỏi hệ thống! 🗑️",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Không thể xóa người dùng",
        description: err.message,
        variant: "error",
      });
    },
  });

  // 8. Đặt lại mật khẩu người dùng (Admin Reset Password Action)
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      if (newPassword.length < 6) {
        throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự!");
      }
      if (isConfigured) {
        const { data, error } = await (supabase as any).rpc("admin_reset_user_password", {
          p_target_user_id: userId,
          p_new_password: newPassword,
        });
        if (error) {
          if (error.message?.includes("schema cache") || error.message?.includes("does not exist")) {
            throw new Error(
              "Hàm admin_reset_user_password chưa được kích hoạt trên Database. Vui lòng chạy Migration 008 trên Supabase SQL Editor!"
            );
          }
          throw error;
        }
        if (data && data.success === false) {
          throw new Error(data.message || "Không thể đặt lại mật khẩu");
        }
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      toast({
        title: "Đã đặt lại mật khẩu thành công! 🔑",
        description: "Mật khẩu mới của người dùng đã được cập nhật trực tiếp trên Database.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Lỗi đặt lại mật khẩu",
        description: err.message,
        variant: "error",
      });
    },
  });

  
  // 8. Cấm (Ban) người dùng
  const banUserMutation = useMutation({
    mutationFn: async ({
      userId,
      bannedUntil,
      reason,
    }: {
      userId: string;
      bannedUntil: string;
      reason?: string;
    }) => {
      if (isConfigured) {
        // Thử gọi qua RPC
        const { error: rpcError } = await (supabase as any).rpc("admin_ban_user", {
          p_user_id: userId,
          p_banned_until: bannedUntil,
          p_ban_reason: reason || "Vi phạm tiêu chuẩn",
        });

        if (rpcError) {
          // Fallback update trực tiếp bảng profiles
          const { error: updateError } = await (supabase as any)
            .from("profiles")
            .update({
              banned_until: bannedUntil,
              ban_reason: reason || "Vi phạm tiêu chuẩn",
            } as any)
            .eq("id", userId);

          if (updateError) throw updateError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      toast({
        title: "Đã cấm người dùng thành công 🚫",
        description: "Tài khoản này đã bị khóa theo thời hạn quy định.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Không thể cấm người dùng",
        description: err.message,
        variant: "error",
      });
    },
  });

  // 9. Mở khóa (Unban) người dùng
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (isConfigured) {
        const { error: rpcError } = await (supabase as any).rpc("admin_unban_user", {
          p_user_id: userId,
        });

        if (rpcError) {
          const { error: updateError } = await (supabase as any)
            .from("profiles")
            .update({
              banned_until: null,
              ban_reason: null,
            } as any)
            .eq("id", userId);

          if (updateError) throw updateError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      toast({
        title: "Đã mở khóa tài khoản thành công! ✨",
        description: "Người dùng hiện có thể sử dụng hệ thống bình thường.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Không thể mở khóa tài khoản",
        description: err.message,
        variant: "error",
      });
    },
  });

  // Thống kê tổng hợp
  const totalEvents = allEvents.length;
  const activeEvents = allEvents.filter((e) => e.enabled).length;
  const lunarEvents = allEvents.filter((e) => e.is_lunar).length;
  const solarEvents = totalEvents - lunarEvents;
  const upcoming7Days = allEvents.filter((e) => e.daysRemaining >= 0 && e.daysRemaining <= 7).length;

  const eventsByType = {
    birthday: allEvents.filter((e) => e.event_type === "birthday").length,
    anniversary: allEvents.filter((e) => e.event_type === "anniversary").length,
    memorial: allEvents.filter((e) => e.event_type === "memorial").length,
    other: allEvents.filter((e) => e.event_type === "other").length,
  };

  return {
    allEvents,
    allUsers,
    isLoading: isLoadingEvents || isLoadingUsers,
    refetchEvents,
    refetchUsers,
    updateEventAsAdmin: updateEventMutation.mutateAsync,
    deleteEventAsAdmin: deleteEventMutation.mutateAsync,
    toggleEventAsAdmin: (id: string, enabled: boolean) =>
      toggleEventMutation.mutateAsync({ id, enabled }),
    toggleUserRole: (userId: string, newRole: "user" | "admin") =>
      toggleRoleMutation.mutateAsync({ userId, newRole }),
    deleteUserAsAdmin: (userId: string) => deleteUserMutation.mutateAsync(userId),
    resetUserPasswordAsAdmin: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      resetPasswordMutation.mutateAsync({ userId, newPassword }),
    banUserAsAdmin: ({ userId, bannedUntil, reason }: { userId: string; bannedUntil: string; reason?: string }) =>
      banUserMutation.mutateAsync({ userId, bannedUntil, reason }),
    unbanUserAsAdmin: (userId: string) => unbanUserMutation.mutateAsync(userId),
    isUpdating:
      updateEventMutation.isPending ||
      deleteEventMutation.isPending ||
      deleteUserMutation.isPending ||
      resetPasswordMutation.isPending || banUserMutation.isPending || unbanUserMutation.isPending,
    stats: {
      totalUsers: allUsers.length,
      adminCount: allUsers.filter((u) => u.role === "admin").length,
      userCount: allUsers.filter((u) => u.role !== "admin").length,
      activeUsersCount: allUsers.filter((u) => {
        if (!u.last_seen_at) return false;
        const diffMinutes = (Date.now() - new Date(u.last_seen_at).getTime()) / (1000 * 60);
        return diffMinutes <= 5;
      }).length,
      totalEvents,
      activeEvents,
      lunarEvents,
      solarEvents,
      upcoming7Days,
      eventsByType,
    },
  };
}
