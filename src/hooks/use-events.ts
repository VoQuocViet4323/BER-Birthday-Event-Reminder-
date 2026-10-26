"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { EventRow, EventWithMeta, EventFormValues } from "@/types/events";
import {
  calculateNextOccurrence,
  calculateDaysRemaining,
  calculateUpcomingAge,
  formatEventDateDisplay,
} from "@/lib/date-utils";
import { initialMockEvents } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";
import { useRef } from "react";

const STORAGE_KEY = "ber-local-events";

function getLocalEvents(): EventRow[] {
  if (typeof window === "undefined") return initialMockEvents;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockEvents));
      return initialMockEvents;
    }
    return JSON.parse(raw);
  } catch {
    return initialMockEvents;
  }
}

function saveLocalEvents(events: EventRow[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error("Failed to save local events", err);
  }
}

const CUSTOM_GROUPS_STORAGE_KEY = "ber_custom_groups";

export function getLocalCustomGroups(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CUSTOM_GROUPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setLocalCustomGroup(eventId: string, customGroup: string | null | undefined) {
  if (typeof window === "undefined" || !eventId) return;
  try {
    const map = getLocalCustomGroups();
    if (customGroup && customGroup.trim()) {
      map[eventId] = customGroup.trim();
    } else {
      delete map[eventId];
    }
    localStorage.setItem(CUSTOM_GROUPS_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn("Lỗi lưu local custom group:", err);
  }
}

function enrichEvent(ev: EventRow, today: Date = new Date()): EventWithMeta {
  const localMap = getLocalCustomGroups();
  const customGroup = ev.custom_group || localMap[ev.id] || null;

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
    custom_group: customGroup,
    nextOccurrence,
    daysRemaining,
    upcomingAge,
    displayDate,
  };
}

// Bộ nhớ đệm kiểm tra tính tương thích cột của bảng events trên Supabase Cloud
let schemaSupportsCustomType = true;
let schemaSupportsRemindTime = true;
let schemaSupportsCustomGroup = true;

const isSchemaColumnError = (err: any) =>
  err &&
  (err.code === "PGRST204" ||
    err.code === "42703" ||
    (typeof err.message === "string" &&
      (err.message.toLowerCase().includes("column") ||
        err.message.includes("custom_type") ||
        err.message.includes("custom_group") ||
        err.message.includes("remind_time"))));

export function useEvents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const lastDeletedRef = useRef<EventRow | null>(null);

  const getAuthUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) return session.user;
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    } catch {
      return null;
    }
  };

  const queryKey = ["events"];

  const {
    data: events = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<EventWithMeta[]> => {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
        const user = await getAuthUser();

        if (user) {
          const { data, error } = await (supabase as any)
            .from("events")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (!error && data) {
            const today = new Date();
            const localMap = getLocalCustomGroups();
            return data.map((ev: any) => {
              if (ev.custom_group !== undefined && ev.custom_group !== null) {
                setLocalCustomGroup(ev.id, ev.custom_group);
              }
              const effectiveCustomGroup =
                ev.custom_group !== undefined && ev.custom_group !== null
                  ? ev.custom_group
                  : (localMap[ev.id] || null);

              return enrichEvent(
                {
                  ...ev,
                  custom_group: effectiveCustomGroup,
                },
                today
              );
            });
          }
        }
      }

      // Fallback local storage với rich demo data
      const local = getLocalEvents();
      const today = new Date();
      return local.map((ev) => enrichEvent(ev, today));
    },
  });

  // 1. Thêm sự kiện (Optimistic UI)
  const addMutation = useMutation({
    mutationFn: async (values: EventFormValues): Promise<EventRow> => {
      const newEvent: EventRow = {
        id: "ev-" + Math.random().toString(36).substring(2, 9),
        user_id: "current-user",
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
        remind_days: values.remind_days || [],
        remind_time: values.remind_time || "08:00",
        custom_type: values.custom_type || null,
        custom_group: values.custom_group || null,
        enabled: values.enabled,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
        const user = await getAuthUser();
        if (user) {
          const { id: _ignore, ...eventPayload } = newEvent;
          let insertPayload: any = { ...eventPayload, user_id: user.id };
          
          let { data, error } = await (supabase as any)
            .from("events")
            .insert(insertPayload)
            .select()
            .single();

          if (isSchemaColumnError(error)) {
            if (error?.message?.includes("custom_group") || error?.code === "42703") {
              delete insertPayload.custom_group;
            }
            if (error?.message?.includes("custom_type")) {
              delete insertPayload.custom_type;
            }
            if (error?.message?.includes("remind_time")) {
              delete insertPayload.remind_time;
            }

            const retryRes = await (supabase as any)
              .from("events")
              .insert(insertPayload)
              .select()
              .single();
            data = retryRes.data;
            error = retryRes.error;
          }
          if (error) throw error;

          // Đồng bộ giờ nhắc sang user_settings để cron job gửi đúng giờ
          if (values.remind_time) {
            try {
              await (supabase as any)
                .from("user_settings")
                .update({ remind_time: values.remind_time })
                .eq("user_id", user.id);
            } catch (syncErr) {
              console.warn("Không thể đồng bộ remind_time sang user_settings:", syncErr);
            }
          }

          if (data?.id) {
            setLocalCustomGroup(data.id, values.custom_group);
          }

          return {
            ...data,
            custom_type: values.custom_type || null,
            custom_group: values.custom_group || null,
          } as any;
        }
      }

      // Local storage
      const local = getLocalEvents();
      const updated = [newEvent, ...local];
      saveLocalEvents(updated);
      return newEvent;
    },
    onMutate: async (newValues) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEvents = queryClient.getQueryData<EventWithMeta[]>(queryKey) || [];

      const tempEvent: EventRow = {
        id: "temp-" + Date.now(),
        user_id: "current-user",
        name: newValues.name,
        event_type: newValues.event_type,
        event_day: newValues.event_day,
        event_month: newValues.event_month,
        event_year: newValues.event_year || null,
        is_lunar: newValues.is_lunar,
        group_name: newValues.group_name,
        note: newValues.note || null,
        gift_idea: newValues.gift_idea || null,
        avatar_url: newValues.avatar_url || null,
        repeat_yearly: newValues.repeat_yearly,
        remind_days: newValues.remind_days || null,
        remind_time: newValues.remind_time || "08:00",
        custom_type: newValues.custom_type || null,
        custom_group: newValues.custom_group || null,
        enabled: newValues.enabled,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<EventWithMeta[]>(queryKey, [
        enrichEvent(tempEvent),
        ...previousEvents,
      ]);

      return { previousEvents };
    },
    onError: (_err, _newValues, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(queryKey, context.previousEvents);
      }
      toast({
        title: "Có lỗi khi thêm sự kiện",
        description: "Vui lòng kiểm tra lại thông tin.",
        variant: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Đã thêm sự kiện thành công! 🎉",
        variant: "success",
      });
      // Kích hoạt ngay lập tức quét nhắc nhở cho sự kiện vừa tạo nếu trùng ngày hôm nay
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trigger-reminder-check"));
      }
    },
  });

  // 2. Sửa sự kiện (Optimistic UI)
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EventFormValues }) => {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
        const user = await getAuthUser();
        const updatePayload: any = {
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
          remind_days: values.remind_days || [],
          remind_time: values.remind_time || "08:00",
          custom_type: values.custom_type || null,
          custom_group: values.custom_group || null,
          enabled: values.enabled,
        };

        let query = (supabase as any).from("events").update(updatePayload).eq("id", id);
        if (user) query = query.eq("user_id", user.id);

        let { data, error } = await query
          .select()
          .single();

        if (isSchemaColumnError(error)) {
          if (error?.message?.includes("custom_group") || error?.code === "42703") {
            delete updatePayload.custom_group;
          }
          if (error?.message?.includes("custom_type")) {
            delete updatePayload.custom_type;
          }
          if (error?.message?.includes("remind_time")) {
            delete updatePayload.remind_time;
          }

          let retryQuery = (supabase as any).from("events").update(updatePayload).eq("id", id);
          if (user) retryQuery = retryQuery.eq("user_id", user.id);
          const retryRes = await retryQuery
            .select()
            .single();
          data = retryRes.data;
          error = retryRes.error;
        }
        if (error) throw error;

        // Đồng bộ giờ nhắc sang user_settings
        if (values.remind_time && user) {
          try {
            await (supabase as any)
              .from("user_settings")
              .update({ remind_time: values.remind_time })
              .eq("user_id", user.id);
          } catch (syncErr) {
            console.warn("Không thể đồng bộ remind_time sang user_settings:", syncErr);
          }
        }

        setLocalCustomGroup(id, values.custom_group);

        return {
          ...data,
          custom_type: values.custom_type || null,
          custom_group: values.custom_group || null,
        } as any;
      }

      // Local storage
      const local = getLocalEvents();
      const updated = local.map((e) =>
        e.id === id
          ? {
              ...e,
              ...values,
              event_year: values.event_year || null,
              updated_at: new Date().toISOString(),
            }
          : e
      );
      saveLocalEvents(updated);
      return updated.find((e) => e.id === id);
    },
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEvents = queryClient.getQueryData<EventWithMeta[]>(queryKey) || [];

      queryClient.setQueryData<EventWithMeta[]>(
        queryKey,
        previousEvents.map((e) =>
          e.id === id
            ? enrichEvent({
                ...e,
                ...values,
                event_year: values.event_year || null,
                updated_at: new Date().toISOString(),
              })
            : e
        )
      );

      return { previousEvents };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(queryKey, context.previousEvents);
      }
      toast({
        title: "Không thể cập nhật sự kiện",
        variant: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Đã cập nhật sự kiện",
        variant: "success",
      });
      // Kích hoạt ngay lập tức quét nhắc nhở nếu mốc nhắc đã đến hoặc trùng hôm nay
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trigger-reminder-check"));
      }
    },
  });

  // 3. Xóa sự kiện với Hoàn tác (Undo) tức thì
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
        const user = await getAuthUser();
        let query = (supabase as any).from("events").delete().eq("id", id);
        if (user) query = query.eq("user_id", user.id);
        const { error } = await query;
        if (error) throw error;
        setLocalCustomGroup(id, null);
        const local = getLocalEvents();
        saveLocalEvents(local.filter((e) => e.id !== id));
        return id;
      }

      const local = getLocalEvents();
      const target = local.find((e) => e.id === id);
      if (target) lastDeletedRef.current = target;
      const updated = local.filter((e) => e.id !== id);
      saveLocalEvents(updated);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEvents = queryClient.getQueryData<EventWithMeta[]>(queryKey) || [];
      const target = previousEvents.find((e) => e.id === id);
      if (target) lastDeletedRef.current = target;

      // Xóa lạc quan trên UI ngay lập tức!
      queryClient.setQueryData<EventWithMeta[]>(
        queryKey,
        previousEvents.filter((e) => e.id !== id)
      );

      return { previousEvents, target };
    },
    onError: (err: any, _id, context) => {
      console.error("Lỗi xóa sự kiện:", err);
      if (context?.previousEvents) {
        queryClient.setQueryData(queryKey, context.previousEvents);
      }
      toast({
        title: "Lỗi xóa sự kiện",
        description: err?.message || "Không thể xóa sự kiện trên máy chủ.",
        variant: "error",
      });
    },
    onSuccess: (_data, _id, context) => {
      const deletedItem = context?.target || lastDeletedRef.current;
      if (!deletedItem) return;

      toast({
        title: `Đã xóa "${deletedItem.name || "sự kiện"}"`,
        duration: 6000,
        action: {
          label: "Hoàn tác",
          onClick: async () => {
            // 1. Phục hồi lạc quan ngay lập tức trên UI
            queryClient.setQueryData<EventWithMeta[]>(queryKey, (old = []) => {
              if (old.some((e) => e.id === deletedItem.id)) return old;
              return [enrichEvent(deletedItem), ...old];
            });

            const isConfigured =
              process.env.NEXT_PUBLIC_SUPABASE_URL &&
              !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

            // 2. Nếu có cấu hình Supabase, phục hồi lại dữ liệu vào database
            if (isConfigured) {
              try {
                const user = await getAuthUser();
                if (user) {
                  const {
                    nextOccurrence: _1,
                    daysRemaining: _2,
                    upcomingAge: _3,
                    displayDate: _4,
                    ...pureEvent
                  } = deletedItem as any;

                  const isUuid =
                    typeof deletedItem.id === "string" &&
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                      deletedItem.id
                    );

                  let restorePayload: any = {
                    name: pureEvent.name,
                    event_type: pureEvent.event_type || "birthday",
                    event_day: pureEvent.event_day,
                    event_month: pureEvent.event_month,
                    event_year: pureEvent.event_year || null,
                    is_lunar: Boolean(pureEvent.is_lunar),
                    group_name: pureEvent.group_name || "Gia đình",
                    note: pureEvent.note || null,
                    gift_idea: pureEvent.gift_idea || null,
                    avatar_url: pureEvent.avatar_url || null,
                    repeat_yearly: pureEvent.repeat_yearly !== false,
                    remind_days: pureEvent.remind_days
                      ? (pureEvent.remind_days as any[])
                          .map(Number)
                          .filter((n) => !isNaN(n))
                      : null,
                    remind_time: pureEvent.remind_time || "08:00",
                    custom_type: pureEvent.custom_type || null,
                    custom_group: pureEvent.custom_group || null,
                    enabled: pureEvent.enabled !== false,
                    user_id: user.id,
                  };

                  if (isUuid) {
                    restorePayload.id = deletedItem.id;
                  }

                  let { data, error } = await (supabase as any)
                    .from("events")
                    .insert(restorePayload)
                    .select()
                    .single();

                  if (isSchemaColumnError(error)) {
                    if (
                      error?.message?.includes("custom_group") ||
                      error?.code === "42703"
                    ) {
                      delete restorePayload.custom_group;
                    }
                    if (error?.message?.includes("custom_type")) {
                      delete restorePayload.custom_type;
                    }
                    if (error?.message?.includes("remind_time")) {
                      delete restorePayload.remind_time;
                    }

                    const retryRes = await (supabase as any)
                      .from("events")
                      .insert(restorePayload)
                      .select()
                      .single();
                    data = retryRes.data;
                    error = retryRes.error;
                  }

                  if (error) {
                    console.error("Lỗi hoàn tác sự kiện trên Supabase:", error);
                    toast({
                      title: "Lỗi hoàn tác",
                      description:
                        error?.message ||
                        "Không thể khôi phục sự kiện lên cơ sở dữ liệu.",
                      variant: "error",
                    });
                    queryClient.invalidateQueries({ queryKey });
                    return;
                  }

                  const restoredId = data?.id || deletedItem.id;
                  if (deletedItem.custom_group) {
                    setLocalCustomGroup(restoredId, deletedItem.custom_group);
                  }

                  // Cập nhật fallback localStorage
                  const local = getLocalEvents();
                  const restoredEvent: EventRow = {
                    ...deletedItem,
                    id: restoredId,
                  };
                  saveLocalEvents([
                    restoredEvent,
                    ...local.filter((e) => e.id !== restoredId),
                  ]);

                  // Đồng bộ lại toàn bộ cache từ DB
                  await queryClient.invalidateQueries({ queryKey });

                  // Kích hoạt ngay lập tức quét nhắc nhở cho sự kiện vừa khôi phục
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("trigger-reminder-check")
                    );
                  }

                  toast({
                    title: `Đã khôi phục "${deletedItem.name}"`,
                    description: "Sự kiện đã được phục hồi thành công.",
                    variant: "success",
                  });
                  return;
                }
              } catch (err: any) {
                console.error("Lỗi xử lý hoàn tác sự kiện:", err);
                toast({
                  title: "Lỗi hoàn tác",
                  description:
                    err?.message || "Đã xảy ra lỗi khi khôi phục sự kiện.",
                  variant: "error",
                });
                queryClient.invalidateQueries({ queryKey });
                return;
              }
            }

            // Fallback khi không dùng Supabase (Offline / Local storage)
            const local = getLocalEvents();
            if (!local.some((e) => e.id === deletedItem.id)) {
              saveLocalEvents([deletedItem, ...local]);
            }
            if (deletedItem.custom_group) {
              setLocalCustomGroup(deletedItem.id, deletedItem.custom_group);
            }
            queryClient.invalidateQueries({ queryKey });

            toast({
              title: `Đã khôi phục "${deletedItem.name}"`,
              description: "Sự kiện đã được phục hồi thành công.",
              variant: "success",
            });
          },
        },
      });
    },
  });

  // 4. Bật / Tắt nhắc nhở nhanh
  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
        const user = await getAuthUser();
        let query = (supabase as any).from("events").update({ enabled } as any).eq("id", id);
        if (user) query = query.eq("user_id", user.id);
        const { error } = await query;
        if (error) throw error;
      } else {
        const local = getLocalEvents();
        const updated = local.map((e) => (e.id === id ? { ...e, enabled } : e));
        saveLocalEvents(updated);
      }
    },
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEvents = queryClient.getQueryData<EventWithMeta[]>(queryKey) || [];

      queryClient.setQueryData<EventWithMeta[]>(
        queryKey,
        previousEvents.map((e) => (e.id === id ? { ...e, enabled } : e))
      );

      return { previousEvents };
    },
    onSuccess: (_data, { enabled }) => {
      toast({
        title: enabled ? "Đã bật nhắc nhở sự kiện" : "Đã tắt nhắc nhở sự kiện",
        duration: 3000,
      });
      if (enabled) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("trigger-reminder-check"));
        }
      }
    },
  });

  return {
    events,
    isLoading,
    isError,
    refetch,
    addEvent: addMutation.mutateAsync,
    updateEvent: updateMutation.mutateAsync,
    deleteEvent: (id: string) => deleteMutation.mutateAsync(id),
    toggleEventEnabled: (id: string, enabled: boolean) =>
      toggleEnabledMutation.mutateAsync({ id, enabled }),
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
