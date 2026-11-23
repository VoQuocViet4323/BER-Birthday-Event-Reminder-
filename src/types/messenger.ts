export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface FriendNetworkItem {
  friendship_id: string;
  status: FriendshipStatus;
  requester_id: string;
  addressee_id: string;
  created_at: string;
  updated_at: string;
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  friend_code: string;
  last_seen_at: string | null;
  last_message_content: string | null;
  last_message_image_url: string | null;
  last_message_sender_id: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface FriendSearchResult {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  friend_code: string;
  last_seen_at: string | null;
  friendship_id: string | null;
  friendship_status: FriendshipStatus | null;
  is_requester: boolean | null;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url: string | null;
  image_storage_path?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  image_size_bytes?: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  /** Cờ cục bộ cho Optimistic UI */
  optimistic?: boolean;
  failed?: boolean;
}
