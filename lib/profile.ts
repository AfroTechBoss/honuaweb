import { supabase } from "./supabase";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProfile(handleOrId: string) {
  const col = UUID_RE.test(handleOrId) ? "id" : "handle";
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq(col, handleOrId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export type HandleChange = { old_handle: string; new_handle: string; changed_at: string };

// Every rename this account has been through, newest first. Written only by the
// trigger in migration 029 — if that migration hasn't been applied yet the
// table is missing, and an unknown history is better shown as none than as an
// error on someone's profile.
export async function getHandleHistory(userId: string): Promise<HandleChange[]> {
  const { data, error } = await supabase
    .from("handle_history")
    .select("old_handle, new_handle, changed_at")
    .eq("user_id", userId)
    .order("changed_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as HandleChange[];
}

// Case-insensitive, because profiles.handle is unique but not citext — without
// the ilike, "Chidile" would pass this check and then fail on the constraint.
export async function isHandleAvailable(handle: string, currentUserId?: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("handle", handle)
    .limit(1);
  if (error) throw error;
  const taken = (data ?? []).filter((r: any) => r.id !== currentUserId);
  return taken.length === 0;
}

export async function getProfilePosts(userId: string) {
  const postSelect = `
    *,
    profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url, verified),
    original:original_post_id (
      *,
      profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url, verified)
    )
  `;

  // Own posts
  const { data: ownPosts, error } = await supabase
    .from("posts")
    .select(postSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Posts the user has reposted (from post_reposts table)
  const { data: repostRows } = await supabase
    .from("post_reposts")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  let repostedPosts: any[] = [];
  if (repostRows && repostRows.length > 0) {
    const ids = repostRows.map((r: any) => r.post_id);
    const { data: originals } = await supabase
      .from("posts")
      .select(postSelect)
      .in("id", ids);
    if (originals) {
      repostedPosts = originals.map((p: any) => ({
        ...p,
        is_repost: true,
        reposted_at: repostRows.find((r: any) => r.post_id === p.id)?.created_at,
        original: p,
      }));
    }
  }

  return [...(ownPosts ?? []), ...repostedPosts];
}

export async function getFollowerCount(userId: string) {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);
  return count ?? 0;
}

export async function getFollowingCount(userId: string) {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);
  return count ?? 0;
}

export type FollowUser = {
  id: string;
  handle: string;
  full_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  bio: string | null;
  impact_score: number | null;
  followed_at: string;
};

// One row per edge, with the profile on the far side of it already embedded —
// the alternative is a second round trip per person in the list.
async function followEdge(column: "follower_id" | "following_id", userId: string): Promise<FollowUser[]> {
  // Reading followers means joining to whoever is on the *other* end.
  const join = column === "following_id" ? "follows_follower_id_fkey" : "follows_following_id_fkey";
  const { data, error } = await supabase
    .from("follows")
    .select(`created_at, profile:profiles!${join}(id, handle, full_name, avatar_url, verified, bio, impact_score)`)
    .eq(column, userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((r: any) => (r.profile ? { ...r.profile, followed_at: r.created_at } : null))
    .filter(Boolean) as FollowUser[];
}

export const getFollowers = (userId: string) => followEdge("following_id", userId);
export const getFollowing = (userId: string) => followEdge("follower_id", userId);

export async function getAchievements(userId: string) {
  const { data } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });
  return data ?? [];
}

export async function getProjects(userId: string) {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getImpactLogs(userId: string) {
  const { data } = await supabase
    .from("impact_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });
  return data ?? [];
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

export async function toggleFollow(followerId: string, followingId: string, currently: boolean) {
  if (currently) {
    await supabase.from("follows").delete()
      .eq("follower_id", followerId).eq("following_id", followingId);
  } else {
    await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
  }
}
