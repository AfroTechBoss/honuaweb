import { supabase } from "./supabase";
import { createNotification } from "./notifications";

// Client side of the privacy settings in migration 051. The database enforces
// every rule here on its own; these helpers exist so the UI can say what is
// going on instead of failing silently against RLS.

export type FollowState = "none" | "following" | "requested";

export async function getFollowState(viewerId: string, targetId: string): Promise<FollowState> {
  const [{ data: f }, { data: r }] = await Promise.all([
    supabase.from("follows").select("follower_id").eq("follower_id", viewerId).eq("following_id", targetId).maybeSingle(),
    supabase.from("follow_requests").select("requester_id").eq("requester_id", viewerId).eq("target_id", targetId).maybeSingle(),
  ]);
  return f ? "following" : r ? "requested" : "none";
}

// Follows a public account, or sends a request to a private one. Returns the
// state the viewer ends up in.
export async function followOrRequest(viewerId: string, targetId: string, targetIsPrivate: boolean): Promise<FollowState> {
  if (targetIsPrivate) {
    const { error } = await supabase.from("follow_requests").insert({ requester_id: viewerId, target_id: targetId });
    if (error && error.code !== "23505") throw error; // 23505: already requested
    await createNotification({ userId: targetId, actorId: viewerId, type: "follow_request", body: "requested to follow you" });
    return "requested";
  }
  const { error } = await supabase.from("follows").insert({ follower_id: viewerId, following_id: targetId });
  if (error && error.code !== "23505") throw error;
  await createNotification({ userId: targetId, actorId: viewerId, type: "follow", body: "started following you" });
  return "following";
}

export async function unfollowOrCancel(viewerId: string, targetId: string, state: FollowState) {
  if (state === "requested") {
    await supabase.from("follow_requests").delete().match({ requester_id: viewerId, target_id: targetId });
  } else {
    await supabase.from("follows").delete().match({ follower_id: viewerId, following_id: targetId });
  }
}

// ── Activity status ─────────────────────────────────────────────────────────

export async function touchPresence() {
  await supabase.rpc("touch_presence");
}

// Null when the user hides their activity (RLS returns no row) or has never
// been seen.
export async function getLastSeen(userId: string): Promise<Date | null> {
  const { data } = await supabase.from("user_presence").select("last_seen_at").eq("user_id", userId).maybeSingle();
  return data?.last_seen_at ? new Date(data.last_seen_at) : null;
}

export function lastSeenLabel(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5 * 60) return "Active now";
  if (s < 3600) return `Active ${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `Active ${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `Active ${Math.floor(s / 86400)}d ago`;
  return "Active over a week ago";
}

// ── Messaging ───────────────────────────────────────────────────────────────

// Mirrors public.can_message() so the UI can explain a refusal up front.
export async function messageBlockReason(viewerId: string, target: { id: string; message_permission?: string | null; full_name?: string | null; handle?: string | null }): Promise<string | null> {
  const name = target.full_name || (target.handle ? `@${target.handle}` : "This member");
  const perm = target.message_permission ?? "everyone";
  if (perm === "nobody") return `${name} isn't accepting new messages.`;
  if (perm === "following") {
    const { data } = await supabase.from("follows").select("follower_id").eq("follower_id", target.id).eq("following_id", viewerId).maybeSingle();
    if (!data) return `${name} only accepts messages from people they follow.`;
  }
  return null;
}
