import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { enforce } from "@/lib/rate-limit";
import { isMissingFunction, isMissingTable } from "@/lib/pg-errors";

// GET  — what deleting would lose, and anything that blocks it right now.
// POST — delete the account, after running the same checks again.
//
// The person is erased; the books are not. GDPR lets us keep what a legal
// obligation requires (art. 17(3)(b)) — EU accounting, VAT and DAC7 rules
// require transaction records for up to 10 years. So before anything is
// deleted, retain_account_identity() (migration 057) copies the identity those
// records need into a service-only vault, which the daily /api/cron/prune job
// empties when the retention period ends. Orders, order items, payouts and
// carbon retirements stay, detached from the profile. What can't be detached cleanly is
// anything still moving: an order not yet delivered, a payout not yet sent,
// a card payment not yet confirmed, or seller earnings not yet withdrawn.
// Those block deletion until they settle, so nobody loses money because
// someone else pressed a button.

const IN_FLIGHT_ITEMS = ["processing", "confirmed", "shipped"];
const OPEN_PAYOUTS = ["pending", "approved", "on_hold", "processing"];
// A checkout row with a payment intent attached and no outcome yet. Past a day
// it is abandoned (Stripe cancels uncaptured intents long before), not pending.
const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

type Blocker = { kind: string; message: string };

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function authed(request: NextRequest, db: SupabaseClient) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data: { user }, error } = await db.auth.getUser(token);
  return error || !user ? null : user;
}

const count = async (q: PromiseLike<{ count: number | null; error: any }>) => {
  const { count: n, error } = await q;
  // A table from a migration that hasn't run can't hold anything to protect.
  if (error && !isMissingTable(error)) throw error;
  return n ?? 0;
};

async function deletionCheck(db: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - PAYMENT_WINDOW_MS).toISOString();
  const head = { count: "exact" as const, head: true };

  const [profile, buying, selling, payouts, orderPay, carbonPay, ledger] = await Promise.all([
    db.from("profiles").select("impact_score").eq("id", userId).maybeSingle(),
    count(db.from("order_items").select("id", head).eq("buyer_id", userId).in("status", IN_FLIGHT_ITEMS)),
    count(db.from("order_items").select("id", head).eq("seller_id", userId).in("status", IN_FLIGHT_ITEMS)),
    count(db.from("payout_requests").select("id", head).eq("seller_id", userId).in("status", OPEN_PAYOUTS)),
    count(db.from("checkout_intents").select("id", head).eq("user_id", userId).eq("status", "open").not("payment_intent_id", "is", null).gte("created_at", since)),
    count(db.from("carbon_checkouts").select("id", head).eq("user_id", userId).eq("status", "open").not("payment_intent_id", "is", null).gte("created_at", since)),
    db.rpc("seller_payout_ledger", { p_seller: userId }),
  ]);

  const available = Number((Array.isArray(ledger.data) ? ledger.data[0] : ledger.data)?.available_cents ?? 0);
  const blockers: Blocker[] = [];
  const s = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

  if (buying) blockers.push({ kind: "buying", message: `${s(buying, "item")} you bought ${buying === 1 ? "hasn't" : "haven't"} been delivered yet. Wait for delivery, or cancel from Orders.` });
  if (selling) blockers.push({ kind: "selling", message: `${s(selling, "order item")} you sold still ${selling === 1 ? "needs" : "need"} to be shipped, delivered or cancelled.` });
  if (payouts) blockers.push({ kind: "payouts", message: `${s(payouts, "payout")} ${payouts === 1 ? "is" : "are"} still being processed. Wait until ${payouts === 1 ? "it's" : "they're"} paid.` });
  if (available > 0) blockers.push({ kind: "balance", message: `You have $${(available / 100).toFixed(2)} in seller earnings. Withdraw it first, or contact support.` });
  if (orderPay + carbonPay) blockers.push({ kind: "payment", message: "A card payment is still being confirmed. Try again in a few minutes." });

  return { impactScore: profile.data?.impact_score ?? 0, sellerBalanceCents: Math.max(0, available), blockers };
}

export async function GET(request: NextRequest) {
  const limited = enforce(request, { name: "delete-account-check", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const db = admin();
  const user = await authed(request, db);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await deletionCheck(db, user.id), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not check your account." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Low ceiling on purpose. A real deletion happens once and never repeats, so
  // anything past a couple of attempts is either a stuck client retrying a
  // request that already succeeded, or someone probing with stolen tokens.
  const limited = enforce(request, { name: "delete-account", limit: 3, windowMs: 60_000 });
  if (limited) return limited;

  const adminClient = admin();
  const user = await authed(request, adminClient);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  try {
    const { blockers } = await deletionCheck(adminClient, userId);
    if (blockers.length) return NextResponse.json({ error: blockers[0].message, blockers }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "Could not check your account." }, { status: 500 });
  }

  // Keep what the law requires before deleting anything. Without 057 the old
  // cascades would erase sellers' sales and our own tax records along with
  // this account, so refuse rather than do that.
  const { error: retainErr } = await adminClient.rpc("retain_account_identity", { p_user: userId });
  if (retainErr) {
    return NextResponse.json(
      isMissingFunction(retainErr)
        ? { error: "Account deletion is temporarily unavailable. Please contact support." }
        : { error: "Could not prepare your account for deletion. Nothing was deleted." },
      { status: isMissingFunction(retainErr) ? 503 : 500 },
    );
  }

  // 1. Delete storage assets (avatar + cover)
  try {
    const { data: avatarFiles } = await adminClient.storage.from("avatars").list(userId);
    if (avatarFiles?.length) {
      await adminClient.storage.from("avatars").remove(avatarFiles.map(f => `${userId}/${f.name}`));
    }
    const { data: coverFiles } = await adminClient.storage.from("covers").list(userId);
    if (coverFiles?.length) {
      await adminClient.storage.from("covers").remove(coverFiles.map(f => `${userId}/${f.name}`));
    }
  } catch {
    // best-effort — don't block deletion if bucket doesn't exist
  }

  // 2. Orders stay for the seller's books; the buyer's contact details move to
  // the retention vault (copied above) instead of staying where sellers can
  // read them. Everything left is delivered or cancelled, so nobody needs the
  // address to ship.
  const { error: scrubErr } = await adminClient.from("orders").update({ email: null, address: null }).eq("user_id", userId);
  if (scrubErr) return NextResponse.json({ error: "Could not remove your order details. Nothing was deleted." }, { status: 500 });

  // A deleted seller's listings would otherwise stay live with no seller
  // behind them. Same status the admin removal uses.
  const { error: listErr } = await adminClient.from("products").update({ status: "removed", featured: false }).eq("seller_id", userId);
  if (listErr) return NextResponse.json({ error: "Could not take down your listings. Your account was not deleted." }, { status: 500 });

  // 3. Explicitly delete all user data (belt + suspenders on top of DB cascades)
  await Promise.allSettled([
    adminClient.from("post_likes").delete().eq("user_id", userId),
    adminClient.from("post_reposts").delete().eq("user_id", userId),
    adminClient.from("bookmarks").delete().eq("user_id", userId),
    adminClient.from("collections").delete().eq("user_id", userId),
    adminClient.from("follows").delete().eq("follower_id", userId),
    adminClient.from("follows").delete().eq("following_id", userId),
    adminClient.from("muted_users").delete().eq("user_id", userId),
    adminClient.from("blocked_users").delete().eq("user_id", userId),
    adminClient.from("notifications").delete().eq("user_id", userId),
    adminClient.from("notifications").delete().eq("actor_id", userId),
    adminClient.from("comments").delete().eq("user_id", userId),
    adminClient.from("posts").delete().eq("user_id", userId),
  ]);

  // 4. Delete profile row
  await adminClient.from("profiles").delete().eq("id", userId);

  // 5. Delete auth user — revokes all sessions on all devices
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
