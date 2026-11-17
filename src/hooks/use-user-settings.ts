"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Profile, UserSettings, UserSettingsFormValues } from "@/types/events";
import { initialMockProfile, initialMockSettings } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

const SETTINGS_KEY = "ber-user-settings";
const PROFILE_KEY = "ber-user-profile";

function getLocalSettings(): UserSettings {
  if (typeof window === "undefined") return initialMockSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : initialMockSettings;
  } catch {
    return initialMockSettings;
  }
}

function getLocalProfile(): Profile {
  if (typeof window === "undefined") return initialMockProfile;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : initialMockProfile;
  } catch {
    return initialMockProfile;
  }
}

export function useUserSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();

  const queryKey = ["user-settings-and-profile"];

  // Lắng nghe thay đổi phiên đăng nhập để làm mới cache ngay lập tức
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["user-settings-and-profile"] });
        queryClient.invalidateQueries({ queryKey: ["events"] });
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, queryClient]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<{ settings: UserSettings; profile: Profile }> => {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const [settingsRes, profileRes]: [any, any] = await Promise.all([
            (supabase as any).from("user_settings").select("*").eq("user_id", session.user.id).maybeSingle(),
            (supabase as any).from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
          ]);

          if (profileRes.data) {
            const currentProfile = {
              ...profileRes.data,
              email: profileRes.data.email || session.user.email || null,
              provider: session.user.app_metadata?.provider || (session.user.app_metadata?.providers?.[0] ?? "email"),
            } as Profile;
            const currentSettings = (settingsRes.data || {
              ...initialMockSettings,
              user_id: session.user.id,
            }) as UserSettings;

            if (typeof window !== "undefined") {
              localStorage.setItem(PROFILE_KEY, JSON.stringify(currentProfile));
              localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
            }

            return {
              settings: currentSettings,
              profile: currentProfile,
            };
          }

          // Trường hợp session tồn tại nhưng profile chưa kịp nạp, dùng metadata của chính user đó
          const fallbackProfile: Profile = {
            id: session.user.id,
            display_name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.username ||
              session.user.email?.split("@")[0] ||
              "Người dùng",
            avatar_url: session.user.user_metadata?.avatar_url || null,
            timezone: "Asia/Ho_Chi_Minh",
            onboarded: true,
            role: (session.user.user_metadata?.role as any) || "user",
            email: session.user.email || null,
            provider: session.user.app_metadata?.provider || (session.user.app_metadata?.providers?.[0] ?? "email"),
            created_at: new Date().toISOString(),
          };

          return {
            settings: { ...initialMockSettings, user_id: session.user.id },
            profile: fallbackProfile,
          };
        }
      }

      return {
        settings: getLocalSettings(),
        profile: getLocalProfile(),
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: Partial<UserSettingsFormValues> & { silent?: boolean }) => {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy-project");

      if (isConfigured) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          if (
            values.display_name !== undefined ||
            values.timezone !== undefined ||
            values.avatar_url !== undefined
          ) {
            const profilePayload: any = {};
            if (values.display_name !== undefined) profilePayload.display_name = values.display_name;
            if (values.timezone !== undefined) profilePayload.timezone = values.timezone;
            if (values.avatar_url !== undefined) profilePayload.avatar_url = values.avatar_url;

            await (supabase as any)
              .from("profiles")
              .update(profilePayload)
              .eq("id", session.user.id);

            // Đồng bộ trực tiếp metadata sang auth.users của Supabase Authentication
            const authMetaPayload: any = {};
            if (values.display_name !== undefined) {
              authMetaPayload.full_name = values.display_name;
              authMetaPayload.display_name = values.display_name;
              authMetaPayload.name = values.display_name;
            }
            if (values.avatar_url !== undefined) {
              authMetaPayload.avatar_url = values.avatar_url;
              authMetaPayload.picture = values.avatar_url;
            }
            if (Object.keys(authMetaPayload).length > 0) {
              try {
                await supabase.auth.updateUser({
                  data: authMetaPayload,
                });
              } catch (authErr) {
                console.warn("Lỗi đồng bộ metadata sang auth.users:", authErr);
              }
            }
          }

          const hasSettingsFields =
            values.email_enabled !== undefined ||
            values.default_remind_days !== undefined ||
            values.remind_time !== undefined ||
            values.extra_emails !== undefined ||
            values.leap_day_rule !== undefined ||
            values.theme !== undefined;

          if (hasSettingsFields) {
            await (supabase as any)
              .from("user_settings")
              .update({
                email_enabled: values.email_enabled,
                default_remind_days: values.default_remind_days,
                remind_time: values.remind_time,
                extra_emails: values.extra_emails,
                leap_day_rule: values.leap_day_rule,
                theme: values.theme,
              })
              .eq("user_id", session.user.id);
          }
        }
      }

      // Local storage fallback
      const curSettings = getLocalSettings();
      const curProfile = getLocalProfile();

      const newSettings = {
        ...curSettings,
        ...(values.email_enabled !== undefined && { email_enabled: values.email_enabled }),
        ...(values.default_remind_days !== undefined && { default_remind_days: values.default_remind_days }),
        ...(values.remind_time !== undefined && { remind_time: values.remind_time }),
        ...(values.extra_emails !== undefined && { extra_emails: values.extra_emails }),
        ...(values.leap_day_rule !== undefined && { leap_day_rule: values.leap_day_rule }),
        ...(values.theme !== undefined && { theme: values.theme }),
      };

      const newProfile = {
        ...curProfile,
        ...(values.display_name !== undefined && { display_name: values.display_name }),
        ...(values.timezone !== undefined && { timezone: values.timezone }),
        ...(values.avatar_url !== undefined && { avatar_url: values.avatar_url }),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      }

      return { settings: newSettings, profile: newProfile };
    },
    onSuccess: (newData, variables) => {
      queryClient.setQueryData(queryKey, newData);
      if (!variables?.silent) {
        toast({
          title: "Đã lưu cài đặt thành công! ✨",
          variant: "success",
        });
      }
    },
    onError: () => {
      toast({
        title: "Không thể lưu cài đặt",
        variant: "error",
      });
    },
  });

  return {
    settings: data?.settings || initialMockSettings,
    profile: data?.profile || initialMockProfile,
    isLoading,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
