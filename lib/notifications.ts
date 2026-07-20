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
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    actor_id: actorId ?? null,
    type,
    post_id: postId ?? null,
    body,
    badge_name: badgeName ?? null,
    community_id: communityId ?? null,
  });
  if (error) console.error('[notifications] insert failed:', error.message, error.details);
}

export async function getNotifications(userId: string) {
  // Fetch notifications without join first (FK may not exist on pre-existing table)
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) { console.error('[notifications] getNotifications failed:', error.message); return []; }
  if (!data?.length) return [];

  // Fetch actor profiles separately
  const actorIds = [...new Set(data.map((n: any) => n.actor_id).filter(Boolean))];
  let actorMap: Record<string, any> = {};
  if (actorIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url")
      .in("id", actorIds);
    (profiles ?? []).forEach((p: any) => { actorMap[p.id] = p; });
  }

  return data.map((n: any) => ({ ...n, actor: actorMap[n.actor_id] ?? null }));
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
