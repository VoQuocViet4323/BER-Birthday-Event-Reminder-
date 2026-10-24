"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { DiaryEntry, DiaryFormValues } from "@/types/diary";
import { useToast } from "@/components/ui/toast";

const STORAGE_KEY = "ber-local-diaries";

export const normalizeDateKey = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, "0");
    const d = String(dateInput.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(dateInput).split("T")[0].trim();
};

function getLocalDiaries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to parse local diaries", err);
    return [];
  }
}

function saveLocalDiaries(diaries: DiaryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diaries));
  } catch (err) {
    console.error("Failed to save local diaries", err);
  }
}

export function useDiaries() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { toast } = useToast();

  const diariesQuery = useQuery({
    queryKey: ["diaries"],
    queryFn: async (): Promise<DiaryEntry[]> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return getLocalDiaries();
        }

        const { data, error } = await (supabase as any)
          .from("diaries")
          .select("*")
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Supabase diaries query error, using local fallback:", error.message);
          return getLocalDiaries();
        }

        const entries: DiaryEntry[] = (data || []).map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          entry_date: normalizeDateKey(row.entry_date),
          title: row.title,
          content: row.content,
          mood: row.mood,
          tags: row.tags || [],
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));

        saveLocalDiaries(entries);
        return entries;
      } catch (err) {
        console.error("Failed to fetch diaries:", err);
        return getLocalDiaries();
      }
    },
    staleTime: 1000 * 30,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; values: DiaryFormValues }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const localList = getLocalDiaries();
      const cleanDate = normalizeDateKey(payload.values.entry_date);

      const entryPayload: any = {
        entry_date: cleanDate,
        title: payload.values.title || null,
        content: payload.values.content,
        mood: payload.values.mood || null,
        tags: payload.values.tags || [],
        updated_at: new Date().toISOString(),
      };

      let savedEntry: DiaryEntry = {
        id: payload.id || crypto.randomUUID(),
        user_id: session?.user?.id || "local_user",
        ...entryPayload,
        created_at: new Date().toISOString(),
      };

      if (session) {
        if (payload.id) {
          // CẬP NHẬT (UPDATE) bản ghi đã tồn tại theo ID và user_id
          const { data, error } = await (supabase as any)
            .from("diaries")
            .update(entryPayload)
            .eq("id", payload.id)
            .eq("user_id", session.user.id)
            .select()
            .single();

          if (error) {
            console.error("Supabase update error:", error);
            throw error;
          }

          if (data) {
            savedEntry = {
              id: data.id,
              user_id: data.user_id,
              entry_date: normalizeDateKey(data.entry_date),
              title: data.title,
              content: data.content,
              mood: data.mood,
              tags: data.tags || [],
              created_at: data.created_at,
              updated_at: data.updated_at,
            };
          }
        } else {
          // THÊM MỚI (INSERT) một bài nhật ký mới
          const insertPayload = {
            ...entryPayload,
            user_id: session.user.id,
          };

          const { data, error } = await (supabase as any)
            .from("diaries")
            .insert(insertPayload)
            .select()
            .single();

          if (error) {
            console.error("Supabase insert error:", error);
            throw error;
          }

          if (data) {
            savedEntry = {
              id: data.id,
              user_id: data.user_id,
              entry_date: normalizeDateKey(data.entry_date),
              title: data.title,
              content: data.content,
              mood: data.mood,
              tags: data.tags || [],
              created_at: data.created_at,
              updated_at: data.updated_at,
            };
          }
        }
      }

      // Cập nhật localStorage
      const existingIdx = localList.findIndex((d) => d.id === savedEntry.id);
      let updatedLocal: DiaryEntry[];
      if (existingIdx >= 0) {
        updatedLocal = [...localList];
        updatedLocal[existingIdx] = savedEntry;
      } else {
        updatedLocal = [savedEntry, ...localList];
      }
      saveLocalDiaries(updatedLocal);

      return savedEntry;
    },
    onSuccess: (savedEntry) => {
      queryClient.setQueryData<DiaryEntry[]>(["diaries"], (old = []) => {
        const existingIdx = old.findIndex((d) => d.id === savedEntry.id);
        if (existingIdx >= 0) {
          const next = [...old];
          next[existingIdx] = savedEntry;
          return next;
        }
        return [savedEntry, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ["diaries"] });
      toast({
        title: "Đã lưu nhật ký!",
        description: "Nội dung nhật ký đã được cập nhật thành công lên cơ sở dữ liệu.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      console.error("Save diary error:", err);
      toast({
        title: "Lỗi lưu nhật ký",
        description: err?.message || "Không thể lưu nhật ký lúc này.",
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, entry_date }: { id?: string; entry_date?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const cleanDate = entry_date ? normalizeDateKey(entry_date) : undefined;

      if (session) {
        let query = (supabase as any)
          .from("diaries")
          .delete()
          .eq("user_id", session.user.id);

        if (id) {
          query = query.eq("id", id);
        } else if (cleanDate) {
          query = query.eq("entry_date", cleanDate);
        }
        const { error } = await query;
        if (error) {
          console.error("Supabase delete error:", error);
          throw error;
        }
      }

      // Xóa trong localStorage
      const localList = getLocalDiaries();
      const updated = localList.filter((d) => {
        if (id && d.id === id) return false;
        return true;
      });
      saveLocalDiaries(updated);

      return { id, entry_date: cleanDate };
    },
    onSuccess: ({ id }) => {
      queryClient.setQueryData<DiaryEntry[]>(["diaries"], (old = []) => {
        return old.filter((d) => {
          if (id && d.id === id) return false;
          return true;
        });
      });
      queryClient.invalidateQueries({ queryKey: ["diaries"] });
      toast({
        title: "Đã xóa nhật ký",
        description: "Nhật ký đã được xóa hoàn toàn khỏi cơ sở dữ liệu.",
        variant: "default",
      });
    },
    onError: (err: any) => {
      console.error("Delete diary error:", err);
      toast({
        title: "Lỗi xóa nhật ký",
        description: err?.message || "Không thể xóa nhật ký lúc này.",
        variant: "error",
      });
    },
  });

  const getDiariesForDate = (dateStr: string): DiaryEntry[] => {
    const cleanTarget = normalizeDateKey(dateStr);
    return (diariesQuery.data || [])
      .filter((d) => normalizeDateKey(d.entry_date) === cleanTarget)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  };

  const getDiaryForDate = (dateStr: string): DiaryEntry | undefined => {
    return getDiariesForDate(dateStr)[0];
  };

  return {
    diaries: diariesQuery.data || [],
    isLoading: diariesQuery.isLoading,
    getDiariesForDate,
    getDiaryForDate,
    saveDiary: (payload: { id?: string; values: DiaryFormValues }) =>
      saveMutation.mutateAsync(payload),
    deleteDiary: (target: { id?: string; entry_date?: string } | string) => {
      const payload = typeof target === "string" ? { id: target } : target;
      return deleteMutation.mutateAsync(payload);
    },
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
