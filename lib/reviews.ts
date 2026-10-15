import { supabase } from "./supabase";

// Product reviews live in product_reviews (014). Migration 052 limits writes
// to people with a paid order for the product and keeps stars within 1–5, so
// these helpers only have to read and write the table.

export type ProductReview = {
  userId: string;
  stars: number;
  text: string;
  date: string;
  author: string;
  handle: string | null;
  avatarUrl: string | null;
};

const isUuid = (id: unknown) => /^[0-9a-f-]{36}$/.test(String(id));

export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  if (!isUuid(productId)) return [];
  const { data } = await supabase
    .from("product_reviews")
    .select("user_id, stars, body, created_at, profile:profiles!product_reviews_user_id_fkey(full_name, handle, avatar_url)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    stars: r.stars,
    text: r.body ?? "",
    date: r.created_at,
    author: r.profile?.full_name || (r.profile?.handle ? `@${r.profile.handle}` : "A member"),
    handle: r.profile?.handle ?? null,
    avatarUrl: r.profile?.avatar_url ?? null,
  }));
}

// True when the signed-in user has a paid order containing this product.
export async function hasPurchased(productId: string): Promise<boolean> {
  if (!isUuid(productId)) return false;
  const { data, error } = await supabase.rpc("has_purchased", { p_product: productId });
  return !error && data === true;
}

// One review per user per product; writing again replaces it.
export async function saveReview(userId: string, productId: string, stars: number, text: string, orderId?: string) {
  const { error } = await supabase.from("product_reviews").upsert({
    product_id: productId, user_id: userId, stars, body: text.trim() || null, order_id: orderId ?? null,
  }, { onConflict: "product_id,user_id" });
  if (error) throw error;
}

// The signed-in user's own reviews for a set of products, keyed by product id.
export async function getMyReviews(userId: string, productIds: string[]): Promise<Record<string, { stars: number; text: string }>> {
  const ids = productIds.filter(isUuid);
  if (!ids.length) return {};
  const { data } = await supabase.from("product_reviews").select("product_id, stars, body")
    .eq("user_id", userId).in("product_id", ids);
  const out: Record<string, { stars: number; text: string }> = {};
  for (const r of data ?? []) out[r.product_id] = { stars: r.stars, text: r.body ?? "" };
  return out;
}
