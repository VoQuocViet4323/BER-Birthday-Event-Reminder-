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
        // Query toàn bộ events cùng với profiles liên quan
        const { data, error } = await (supabase as any)
          .from("events")
          .select("*, profiles:user_id(display_name)")
          .order("created_at", { ascending: false });

        if (!error && data) {
          return data.map((ev: any) => {
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
              owner_name: ev.profiles?.display_name || "Người dùng",
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
        // Truy vấn danh sách người dùng trực tiếp từ bảng profiles (được bảo vệ bởi RLS cho Admin)
        // và bảng events để đếm số lượng sự kiện
        const [profilesRes, eventsRes] = await Promise.all([
          (supabase as any).from("profiles").select("*"),
          (supabase as any).from("events").select("id, user_id"),
        ]);

        const eventsByUser: Record<string, number> = {};
        if (eventsRes.data) {
          eventsRes.data.forEach((e: any) => {
            eventsByUser[e.user_id] = (eventsByUser[e.user_id] || 0) + 1;
          });
        }

        let profilesList: any[] = profilesRes.data || [];
        // Nếu RLS profiles chưa đủ quyền, thử gọi fallback qua RPC bảo mật get_all_users_for_admin
        if (profilesList.length <= 1) {
          try {
            const rpcRes = await (supabase as any).rpc("get_all_users_for_admin");
            if (rpcRes.data && rpcRes.data.length > 0) {
              profilesList = rpcRes.data;
            }
          } catch {
            // Giữ nguyên profilesList
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

  // 3. Sửa sự kiện (Admin Action)
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EventFormValues }) => {
      if (isConfigured) {
        const { data, error } = await (supabase as any)
          .from("events")
          .update({
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
            remind_days: values.remind_days || null,
            enabled: values.enabled,
          } as any)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Local storage
      const raw = typeof window !== "undefined" ? localStorage.getItem("ber-local-events") : null;
      const list: EventRow[] = raw ? JSON.parse(raw) : initialMockEvents;
      const updated = list.map((e) =>
        e.id === id
          ? {
              ...e,
              ...values,
              event_year: values.event_year || null,
              updated_at: new Date().toISOString(),
            }
          : e
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("ber-local-events", JSON.stringify(updated));
      }
      return updated.find((e) => e.id === id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Admin: Đã cập nhật sự kiện thành công! 🛡️",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Lỗi cập nhật sự kiện",
        description: err.message,
        variant: "error",
      });
    },
  });

  // 4. Xóa sự kiện (Admin Action)
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isConfigured) {
        const { error } = await (supabase as any).from("events").delete().eq("id", id);
        if (error) throw error;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Admin: Đã xóa sự kiện khỏi hệ thống! 🗑️",
        variant: "success",
      });
    },
  });

  // 5. Bật / Tắt sự kiện (Admin Action)
  const toggleEventMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      if (isConfigured) {
        await (supabase as any).from("events").update({ enabled } as any).eq("id", id);
      } else {
        const raw = typeof window !== "undefined" ? localStorage.getItem("ber-local-events") : null;
        const list: EventRow[] = raw ? JSON.parse(raw) : initialMockEvents;
        const updated = list.map((e) => (e.id === id ? { ...e, enabled } : e));
        if (typeof window !== "undefined") {
          localStorage.setItem("ber-local-events", JSON.stringify(updated));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
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
    isUpdating:
      updateEventMutation.isPending ||
      deleteEventMutation.isPending ||
      deleteUserMutation.isPending ||
      resetPasswordMutation.isPending,
    stats: {
      totalUsers: allUsers.length,
      adminCount: allUsers.filter((u) => u.role === "admin").length,
      userCount: allUsers.filter((u) => u.role !== "admin").length,
      activeUsersCount: allUsers.filter((u) => (u.events_count ?? 0) > 0 || u.onboarded).length,
      totalEvents,
      activeEvents,
      lunarEvents,
      solarEvents,
      upcoming7Days,
      eventsByType,
    },
  };
}
