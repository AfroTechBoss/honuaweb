import { supabase } from "./supabase";

export type NotifType =
  | "like" | "follow" | "comment" | "reply"
  | "community_invite" | "badge" | "level_up";

export async function createNotification({
  userId, actorId, type, postId, body, badgeName, communityId,
}: {
  userId: string;
  actorId?: string;
  type: NotifType;
  postId?: string;
  body: string;
  badgeName?: string;
  communityId?: string;
}) {
  if (!userId || userId === actorId) return; // never notify yourself
  await supabase.from("notifications").insert({
    user_id: userId,
    actor_id: actorId ?? null,
    type,
    post_id: postId ?? null,
    body,
    badge_name: badgeName ?? null,
    community_id: communityId ?? null,
  });
}

export async function getNotifications(userId: string) {
  const { data } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(id, handle, full_name, avatar_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  return data ?? [];
}

export async function markAllRead(userId: string) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
}

export async function getUnreadCount(userId: string) {
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return count ?? 0;
}
