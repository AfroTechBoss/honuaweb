import { supabase } from "./supabase";

export async function getProfile(handleOrId: string) {
  // Try handle first, fall back to id
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`handle.eq.${handleOrId},id.eq.${handleOrId}`)
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
      profile:profiles(id, handle, full_name, avatar_url, verified),
      original:original_post_id (
        *,
        profile:profiles(id, handle, full_name, avatar_url, verified)
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
