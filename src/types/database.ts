export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          timezone: string;
          onboarded: boolean;
          role?: "user" | "admin";
          username?: string | null;
          email?: string | null;
          provider?: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          onboarded?: boolean;
          role?: "user" | "admin";
          username?: string | null;
          email?: string | null;
          provider?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          onboarded?: boolean;
          role?: "user" | "admin";
          username?: string | null;
          email?: string | null;
          provider?: string | null;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          email_enabled: boolean;
          default_remind_days: number[];
          remind_time: string;
          extra_emails: string[] | null;
          email_template: Json | null;
          leap_day_rule: "feb28" | "mar01";
          theme: "light" | "dark" | "system";
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email_enabled?: boolean;
          default_remind_days?: number[];
          remind_time?: string;
          extra_emails?: string[] | null;
          email_template?: Json | null;
          leap_day_rule?: "feb28" | "mar01";
          theme?: "light" | "dark" | "system";
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email_enabled?: boolean;
          default_remind_days?: number[];
          remind_time?: string;
          extra_emails?: string[] | null;
          email_template?: Json | null;
          leap_day_rule?: "feb28" | "mar01";
          theme?: "light" | "dark" | "system";
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          event_type: "birthday" | "anniversary" | "memorial" | "other";
          event_day: number;
          event_month: number;
          event_year: number | null;
          is_lunar: boolean;
          group_name: "Gia đình" | "Bạn bè" | "Đồng nghiệp" | "Khác";
          note: string | null;
          gift_idea: string | null;
          avatar_url: string | null;
          repeat_yearly: boolean;
          remind_days: number[] | null;
          remind_time?: string | null;
          custom_type?: string | null;
          custom_group?: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          event_type?: "birthday" | "anniversary" | "memorial" | "other";
          event_day: number;
          event_month: number;
          event_year?: number | null;
          is_lunar?: boolean;
          group_name?: "Gia đình" | "Bạn bè" | "Đồng nghiệp" | "Khác";
          note?: string | null;
          gift_idea?: string | null;
          avatar_url?: string | null;
          repeat_yearly?: boolean;
          remind_days?: number[] | null;
          remind_time?: string | null;
          custom_type?: string | null;
          custom_group?: string | null;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          event_type?: "birthday" | "anniversary" | "memorial" | "other";
          event_day?: number;
          event_month?: number;
          event_year?: number | null;
          is_lunar?: boolean;
          group_name?: "Gia đình" | "Bạn bè" | "Đồng nghiệp" | "Khác";
          note?: string | null;
          gift_idea?: string | null;
          avatar_url?: string | null;
          repeat_yearly?: boolean;
          remind_days?: number[] | null;
          remind_time?: string | null;
          custom_type?: string | null;
          custom_group?: string | null;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_logs: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          remind_offset: number;
          occurrence_date: string;
          channel: "email" | "telegram" | "push";
          status: "sent" | "failed" | "pending";
          error: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          remind_offset: number;
          occurrence_date: string;
          channel?: "email" | "telegram" | "push";
          status?: "sent" | "failed" | "pending";
          error?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          remind_offset?: number;
          occurrence_date?: string;
          channel?: "email" | "telegram" | "push";
          status?: "sent" | "failed" | "pending";
          error?: string | null;
          sent_at?: string;
        };
      };
      diaries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          title: string | null;
          content: string;
          mood: "happy" | "calm" | "excited" | "sad" | "grateful" | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          entry_date: string;
          title?: string | null;
          content: string;
          mood?: "happy" | "calm" | "excited" | "sad" | "grateful" | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_date?: string;
          title?: string | null;
          content?: string;
          mood?: "happy" | "calm" | "excited" | "sad" | "grateful" | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
