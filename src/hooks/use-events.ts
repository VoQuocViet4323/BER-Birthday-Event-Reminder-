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

function enrichEvent(ev: EventRow, today: Date = new Date()): EventWithMeta {
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
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data, error } = await (supabase as any)
            .from("events")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false });

          if (!error && data) {
            const today = new Date();
            return data.map((ev: any) => enrichEvent(ev, today));
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
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { id: _ignore, ...eventPayload } = newEvent;
          let insertPayload: any = { ...eventPayload, user_id: session.user.id };
          if (!schemaSupportsCustomType) delete insertPayload.custom_type;
          if (!schemaSupportsCustomGroup) delete insertPayload.custom_group;
          if (!schemaSupportsRemindTime) delete insertPayload.remind_time;
          
          let { data, error } = await (supabase as any)
            .from("events")
            .insert(insertPayload)
            .select()
            .single();

          if (isSchemaColumnError(error)) {
            schemaSupportsCustomType = false;
            schemaSupportsCustomGroup = false;
            schemaSupportsRemindTime = false;
            delete insertPayload.custom_type;
            delete insertPayload.custom_group;
            delete insertPayload.remind_time;

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
                .eq("user_id", session.user.id);
            } catch (syncErr) {
              console.warn("Không thể đồng bộ remind_time sang user_settings:", syncErr);
            }
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
    },
  });

  // 2. Sửa sự kiện (Optimistic UI)
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EventFormValues }) => {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
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

        if (!schemaSupportsCustomType) delete updatePayload.custom_type;
        if (!schemaSupportsCustomGroup) delete updatePayload.custom_group;
        if (!schemaSupportsRemindTime) delete updatePayload.remind_time;

        let { data, error } = await (supabase as any)
          .from("events")
          .update(updatePayload)
          .eq("id", id)
          .select()
          .single();

        if (isSchemaColumnError(error)) {
          schemaSupportsCustomType = false;
          schemaSupportsCustomGroup = false;
          schemaSupportsRemindTime = false;
          delete updatePayload.custom_type;
          delete updatePayload.custom_group;
          delete updatePayload.remind_time;

          const retryRes = await (supabase as any)
            .from("events")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single();
          data = retryRes.data;
          error = retryRes.error;
        }
        if (error) throw error;

        // Đồng bộ giờ nhắc sang user_settings
        if (values.remind_time) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await (supabase as any)
                .from("user_settings")
                .update({ remind_time: values.remind_time })
                .eq("user_id", session.user.id);
            }
          } catch (syncErr) {
            console.warn("Không thể đồng bộ remind_time sang user_settings:", syncErr);
          }
        }

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
    },
  });

  // 3. Xóa sự kiện với Hoàn tác (Undo) tức thì
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
        const { error } = await (supabase as any).from("events").delete().eq("id", id);
        if (error) throw error;
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

      return { previousEvents };
    },
    onSuccess: () => {
      const deletedItem = lastDeletedRef.current;
      toast({
        title: `Đã xóa "${deletedItem?.name || "sự kiện"}"`,
        duration: 5000,
        action: {
          label: "Hoàn tác",
          onClick: () => {
            if (deletedItem) {
              // Khôi phục lại bản ghi
              const local = getLocalEvents();
              saveLocalEvents([deletedItem, ...local]);
              queryClient.invalidateQueries({ queryKey });
              toast({
                title: `Đã khôi phục "${deletedItem.name}"`,
                variant: "success",
              });
            }
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
        await (supabase as any).from("events").update({ enabled } as any).eq("id", id);
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
