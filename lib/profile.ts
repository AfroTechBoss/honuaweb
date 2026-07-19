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

export async function getProfilePosts(userId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url, verified),
      original:original_post_id (
        *,
        profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url, verified)
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
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
