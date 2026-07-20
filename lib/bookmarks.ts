import { supabase } from "./supabase";

const POST_SELECT = `
  *,
  profile:profiles!user_id(id, handle, full_name, avatar_url, verified)
`;

// ── Collections ───────────────────────────────────────────────

export async function getCollections(userId: string) {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) console.error('[bookmarks] getCollections failed:', error.message);
  return data ?? [];
}

export async function createCollection(userId: string, name: string, emoji = "🔖") {
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: userId, name, emoji })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCollection(collectionId: string) {
  await supabase.from("collections").delete().eq("id", collectionId);
}

// ── Bookmarks ─────────────────────────────────────────────────

export async function getBookmarkedPostIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("bookmarks")
    .select("post_id")
    .eq("user_id", userId);
  return [...new Set((data ?? []).map((r: any) => r.post_id))];
}

export async function getBookmarks(userId: string, collectionId?: string) {
  // Fetch bookmark rows first, then join posts manually to avoid FK hint issues
  let q = supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (collectionId) q = q.eq("collection_id", collectionId);
  const { data: bmarks, error } = await q;
  if (error) { console.error('[bookmarks] getBookmarks failed:', error.message); return []; }
  if (!bmarks?.length) return [];

  const postIds = [...new Set(bmarks.map((b: any) => b.post_id))];
  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .in("id", postIds);
  if (postsErr) console.error('[bookmarks] posts fetch failed:', postsErr.message);

  const postMap = Object.fromEntries((posts ?? []).map((p: any) => [p.id, p]));
  return bmarks.map((b: any) => ({ ...b, post: postMap[b.post_id] ?? null }));
}

export async function addBookmark(userId: string, postId: string, collectionId?: string) {
  await supabase.from("bookmarks").insert({
    user_id: userId,
    post_id: postId,
    collection_id: collectionId ?? null,
  });
}

export async function removeBookmark(userId: string, postId: string) {
  // Removes all bookmark rows for this post (across all collections)
  await supabase.from("bookmarks").delete().match({ user_id: userId, post_id: postId });
}

export async function getCollectionCounts(userId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("bookmarks")
    .select("collection_id")
    .eq("user_id", userId);
  const counts: Record<string, number> = { __all__: 0 };
  (data ?? []).forEach((r: any) => {
    counts.__all__++;
    const key = r.collection_id ?? "__uncollected__";
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}
