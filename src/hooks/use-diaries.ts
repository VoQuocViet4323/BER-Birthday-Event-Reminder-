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

  const diariesQuery = useQuery({
    queryKey: ["diaries"],
    queryFn: async (): Promise<DiaryEntry[]> => {
      try {
        const user = await getAuthUser();
        if (!user) {
          return getLocalDiaries();
        }

        const { data, error } = await (supabase as any)
          .from("diaries")
          .select("*")
          .eq("user_id", user.id)
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Supabase diaries query error, using local fallback:", error.message);
          return getLocalDiaries();
        }

        const localCacheMap = new Map(
          getLocalDiaries().map((item) => [item.id, item.images || []])
        );

        const entries: DiaryEntry[] = (data || []).map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          entry_date: normalizeDateKey(row.entry_date),
          title: row.title,
          content: row.content,
          mood: row.mood,
          tags: row.tags || [],
          images: Array.isArray(row.images) ? row.images : (localCacheMap.get(row.id) || []),
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
      const user = await getAuthUser();
      const localList = getLocalDiaries();
      const cleanDate = normalizeDateKey(payload.values.entry_date);

      const entryImages = Array.isArray(payload.values.images) ? payload.values.images : [];

      const entryPayload: any = {
        entry_date: cleanDate,
        title: payload.values.title || null,
        content: payload.values.content,
        mood: payload.values.mood || null,
        tags: payload.values.tags || [],
        images: entryImages,
        updated_at: new Date().toISOString(),
      };

      let savedEntry: DiaryEntry = {
        id: payload.id || crypto.randomUUID(),
        user_id: user?.id || "local_user",
        ...entryPayload,
        created_at: new Date().toISOString(),
      };

      const isMissingImagesColumnError = (err: any) => {
        const msg = String(err?.message || "").toLowerCase();
        return msg.includes("images") && (msg.includes("column") || msg.includes("schema cache"));
      };

      let savedWithoutDbImagesColumn = false;

      if (user) {
        if (payload.id) {
          // CẬP NHẬT (UPDATE) bản ghi đã tồn tại theo ID và user_id
          let { data, error } = await (supabase as any)
            .from("diaries")
            .update(entryPayload)
            .eq("id", payload.id)
            .eq("user_id", user.id)
            .select()
            .single();

          if (error && isMissingImagesColumnError(error)) {
            savedWithoutDbImagesColumn = entryImages.length > 0;
            console.warn("Cột 'images' chưa tồn tại trên Supabase DB. Vui lòng chạy migration 20261120_022_add_diary_images_and_storage.sql.");
            const { images: _ignoredImages, ...fallbackPayload } = entryPayload;
            const retryRes = await (supabase as any)
              .from("diaries")
              .update(fallbackPayload)
              .eq("id", payload.id)
              .eq("user_id", user.id)
              .select()
              .single();
            data = retryRes.data;
            error = retryRes.error;
          }

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
              images: Array.isArray(data.images) ? data.images : entryImages,
              created_at: data.created_at,
              updated_at: data.updated_at,
            };
          }
        } else {
          // THÊM MỚI (INSERT) một bài nhật ký mới
          const insertPayload = {
            ...entryPayload,
            user_id: user.id,
          };

          let { data, error } = await (supabase as any)
            .from("diaries")
            .insert(insertPayload)
            .select()
            .single();

          if (error && isMissingImagesColumnError(error)) {
            savedWithoutDbImagesColumn = entryImages.length > 0;
            console.warn("Cột 'images' chưa tồn tại trên Supabase DB. Vui lòng chạy migration 20261120_022_add_diary_images_and_storage.sql.");
            const { images: _ignoredImages, ...fallbackInsertPayload } = insertPayload;
            const retryRes = await (supabase as any)
              .from("diaries")
              .insert(fallbackInsertPayload)
              .select()
              .single();
            data = retryRes.data;
            error = retryRes.error;
          }

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
              images: Array.isArray(data.images) ? data.images : entryImages,
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

      return { savedEntry, savedWithoutDbImagesColumn };
    },
    onSuccess: ({ savedEntry, savedWithoutDbImagesColumn }) => {
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
      if (savedWithoutDbImagesColumn) {
        toast({
          title: "Đã lưu nội dung, nhưng DB chưa có cột ảnh!",
          description: "Hãy chạy file SQL migration 20261120_022_add_diary_images_and_storage.sql trên Supabase để lưu ảnh lên DB.",
          variant: "error",
          duration: 8000,
        });
      } else {
        toast({
          title: "Đã lưu nhật ký!",
          description: "Nội dung và hình ảnh nhật ký đã được lưu thành công lên cơ sở dữ liệu.",
          variant: "success",
        });
      }
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
      const user = await getAuthUser();
      const cleanDate = entry_date ? normalizeDateKey(entry_date) : undefined;

      if (user) {
        let query = (supabase as any)
          .from("diaries")
          .delete()
          .eq("user_id", user.id);

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

      // Dọn dẹp file ảnh trên Supabase Storage (best-effort) nếu nhật ký có lưu ảnh ở bucket 'diary-images'
      const localList = getLocalDiaries();
      const targetDiary = id ? localList.find((d) => d.id === id) : undefined;
      if (user && targetDiary?.images && targetDiary.images.length > 0 && supabase?.storage) {
        const storagePaths = targetDiary.images
          .map((url) => {
            const marker = "/storage/v1/object/public/diary-images/";
            const idx = url.indexOf(marker);
            return idx >= 0 ? decodeURIComponent(url.slice(idx + marker.length)) : null;
          })
          .filter((p): p is string => Boolean(p));

        if (storagePaths.length > 0) {
          supabase.storage
            .from("diary-images")
            .remove(storagePaths)
            .catch((e: any) => console.warn("Không thể xóa file ảnh cũ trên Storage:", e));
        }
      }

      // Xóa trong localStorage
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
