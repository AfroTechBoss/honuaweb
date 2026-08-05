import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { enforce } from "@/lib/rate-limit";
import { isMissingTable } from "@/lib/pg-errors";
import { logWarn, requestId, failure } from "@/lib/observability";
import { labelFor, connectSupports, connectCountryName } from "@/lib/payout-methods";
import {
  stripeConfigured, createExpressAccount, onboardingLink, dashboardLink,
  readAccount, unsupportedCountryMessage, type ConnectAccountState,
} from "@/lib/stripe-connect";

// Stripe Connect onboarding, from the seller's side (migration 045).
//
// GET                          their Connect state, refreshed from Stripe
// POST { country }             open an Express account and start onboarding
// POST { action: 'resume' }    a fresh onboarding link for an unfinished account
// POST { action: 'dashboard' } a login link to their Express dashboard
//
// The account id is issued by Stripe to this platform and written here. It is
// never accepted from the client — that is the entire point of this route
// existing. /api/payout-methods used to take a typed acct_ id, and migration 045
// refuses to auto-dispatch to anything that arrived that way.
//
// Authenticated as the seller against Supabase, same as the sibling route, and
// for the same reason: an unverified `sub` here would let someone redirect
// another seller's earnings into an account they control.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/045_payout_dispatch.sql';

const clean = (v: unknown, max = 200) => typeof v === 'string' ? v.trim().slice(0, max) : '';

/** Where Stripe sends the seller back to. Derived from the request, so dev, preview and production each get their own. */
function baseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  return req.nextUrl.origin;
}

async function seller(req: NextRequest, gate: { name: string; limit: number }): Promise<
  { ctx: { db: any; userId: string; email: string | null }; fail: null } | { ctx: null; fail: NextResponse }
> {
  const limited = enforce(req, { name: gate.name, limit: gate.limit, windowMs: 60_000 });
  if (limited) return { ctx: null, fail: limited };

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ctx: null, fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const db = getSupabaseAdmin();
  if (!db) {
    return { ctx: null, fail: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 }) };
  }

  const { data, error } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).auth.getUser(token);

  if (error || !data?.user) return { ctx: null, fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  return { ctx: { db, userId: data.user.id, email: data.user.email ?? null }, fail: null };
}

/** Null when the account may write, or a response explaining why it may not. */
async function frozenCheck(db: any, userId: string): Promise<NextResponse | null> {
  const { data } = await db.from('profiles').select('suspended_until, banned_at').eq('id', userId).maybeSingle();
  if (!data) return null;
  if (data.banned_at) {
    return NextResponse.json({ error: 'This account is banned. Payout details cannot be changed — appeal at /appeal if you think that is wrong.' }, { status: 403 });
  }
  if (data.suspended_until && new Date(data.suspended_until) > new Date()) {
    return NextResponse.json({ error: 'Payout details are locked while your account is suspended. You can appeal at /appeal.' }, { status: 403 });
  }
  return null;
}

/** The seller's Connect-created method row, if they have one. */
async function connectRow(db: any, userId: string) {
  const { data, error } = await db
    .from('payout_methods')
    .select('*')
    .eq('seller_id', userId)
    .eq('kind', 'stripe')
    .not('stripe_onboarded_at', 'is', null)
    .neq('status', 'disabled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Mirror Stripe's view of the account onto the row. The row never leads. */
async function persist(db: any, methodId: string, state: ConnectAccountState) {
  // 'verified' means Stripe will accept a transfer. Nothing else in this
  // codebase gets to decide that, and a seller cannot set it by any route.
  const status = state.transfersEnabled ? 'verified' : 'unverified';
  await db.from('payout_methods').update({
    stripe_transfers_enabled: state.transfersEnabled,
    stripe_payouts_enabled: state.payoutsEnabled,
    stripe_charges_enabled: state.chargesEnabled,
    stripe_requirements: state.requirements,
    stripe_country: state.country,
    stripe_synced_at: new Date().toISOString(),
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', methodId);
}

/** What the seller's screen renders. Capability flags, never raw Stripe objects. */
const shapeState = (row: any, state: ConnectAccountState | null) => ({
  methodId: row?.id ?? null,
  accountId: row?.stripe_account_id ?? null,
  country: state?.country ?? row?.stripe_country ?? null,
  isPrimary: row?.is_primary === true,
  // The one that matters: can this platform send them money.
  canReceive: state ? state.transfersEnabled : row?.stripe_transfers_enabled === true,
  // Can Stripe then move it to their bank. False here is not a blocker for the
  // transfer, but it is worth telling them — money would sit in their Stripe
  // balance until they finish.
  canPayOut: state ? state.payoutsEnabled : row?.stripe_payouts_enabled === true,
  requirementsDue: ((state?.requirements as any)?.currently_due ?? []) as string[],
  disabledReason: state?.disabledReason ?? null,
  syncedAt: row?.stripe_synced_at ?? null,
});

export async function GET(req: NextRequest) {
  const { ctx, fail } = await seller(req, { name: 'payout-connect', limit: 40 });
  if (fail) return fail;

  const id = requestId(req);
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        { connected: false, available: false, reason: 'Stripe is not configured on this server.' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    let row: any;
    try {
      row = await connectRow(ctx.db, ctx.userId);
    } catch (err: any) {
      // The column only exists after 045. Treated as "no Connect account" rather
      // than as an error, so the rest of the payout screen still works.
      if (isMissingTable(err) || err?.code === '42703') {
        logWarn('payout-connect', 'connect columns missing', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ connected: false, available: false, reason: `Not set up yet — ${MISSING_MIGRATION}.` }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw err;
    }

    if (!row) {
      return NextResponse.json({ connected: false, available: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Read-through rather than trusting the stored flags. This endpoint is what
    // the seller lands on coming back from onboarding, and at that moment the
    // row is always stale — the webhook may be seconds behind.
    const fresh = await readAccount(row.stripe_account_id);
    if ('error' in fresh) {
      // Stripe unreachable is not "not connected". Serving the stored flags with
      // the error attached beats blanking a screen that was correct a minute ago.
      return NextResponse.json(
        { connected: true, available: true, state: shapeState(row, null), staleReason: fresh.error },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    await persist(ctx.db, row.id, fresh.state);
    return NextResponse.json(
      { connected: true, available: true, state: shapeState(row, fresh.state) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return failure('payout-connect', err, id, 'Could not read your Stripe connection.');
  }
}

export async function POST(req: NextRequest) {
  // Low ceiling: each call may create a Stripe account. Onboarding is a handful
  // of clicks over a few minutes, never dozens.
  const { ctx, fail } = await seller(req, { name: 'payout-connect-write', limit: 8 });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const frozen = await frozenCheck(ctx.db, ctx.userId);
    if (frozen) return frozen;

    if (!stripeConfigured()) {
      return NextResponse.json({ error: 'Stripe is not configured on this server, so accounts cannot be connected yet.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action, 20);
    const base = baseUrl(req);
    const returnUrl = `${base}/seller?connect=return`;
    const refreshUrl = `${base}/seller?connect=refresh`;

    let row: any;
    try {
      row = await connectRow(ctx.db, ctx.userId);
    } catch (err: any) {
      if (isMissingTable(err) || err?.code === '42703') {
        return NextResponse.json({ error: `Stripe connections are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      throw err;
    }

    // ── An account they already have ──────────────────────────────────────
    if (row) {
      if (action === 'dashboard') {
        const link = await dashboardLink(row.stripe_account_id);
        if ('error' in link) return NextResponse.json({ error: link.error }, { status: 502 });
        return NextResponse.json({ url: link.url });
      }

      // 'resume', or a plain POST from a seller who never finished. Either way a
      // fresh link, because account links are single-use and expire in minutes.
      const link = await onboardingLink({ accountId: row.stripe_account_id, refreshUrl, returnUrl });
      if ('error' in link) return NextResponse.json({ error: link.error }, { status: 502 });
      return NextResponse.json({ url: link.url, accountId: row.stripe_account_id, resumed: true });
    }

    if (action === 'dashboard' || action === 'resume') {
      return NextResponse.json({ error: 'You have not connected Stripe yet.' }, { status: 404 });
    }

    // ── A new account ─────────────────────────────────────────────────────
    const country = clean(body?.country, 2).toUpperCase();
    if (!country) return NextResponse.json({ error: 'Which country is your bank account in?' }, { status: 400 });

    // Checked before Stripe is called. A seller in Lagos should be told here,
    // in a sentence naming the alternative that does work for them — not after
    // filling in a Stripe form that rejects them at the end.
    if (!connectSupports(country)) {
      return NextResponse.json({ error: unsupportedCountryMessage(connectCountryName(country)) }, { status: 400 });
    }

    const created = await createExpressAccount({ sellerId: ctx.userId, email: ctx.email, country });
    if ('error' in created) return NextResponse.json({ error: created.error }, { status: 502 });

    const state = created.state;
    const nowIso = new Date().toISOString();

    // Whether this becomes primary follows the sibling route's rule: the first
    // destination a seller connects becomes primary, because a seller with one
    // method and no primary cannot be paid and nothing on screen says why.
    const { count } = await ctx.db
      .from('payout_methods')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', ctx.userId)
      .neq('status', 'disabled');

    const wantsPrimary = body?.makePrimary === true || (count ?? 0) === 0;
    if (wantsPrimary && (count ?? 0) > 0) {
      await ctx.db.from('payout_methods').update({ is_primary: false }).eq('seller_id', ctx.userId).eq('is_primary', true);
    }

    const { data: inserted, error: insertErr } = await ctx.db
      .from('payout_methods')
      .insert({
        seller_id: ctx.userId,
        kind: 'stripe',
        label: labelFor({ kind: 'stripe', stripeAccountId: state.accountId }),
        stripe_account_id: state.accountId,
        // Written here, at creation, and nowhere else — this is the record that
        // the platform opened this account rather than a seller naming one.
        // migration 045's dispatch claim refuses any row where it is null.
        stripe_onboarded_at: nowIso,
        stripe_transfers_enabled: state.transfersEnabled,
        stripe_payouts_enabled: state.payoutsEnabled,
        stripe_charges_enabled: state.chargesEnabled,
        stripe_requirements: state.requirements,
        stripe_country: state.country,
        stripe_synced_at: nowIso,
        // Onboarding has not happened yet — the seller is about to be sent to it.
        status: state.transfersEnabled ? 'verified' : 'unverified',
        is_primary: wantsPrimary,
      })
      .select('*')
      .single();

    if (insertErr) {
      if (isMissingTable(insertErr)) {
        return NextResponse.json({ error: `Payouts are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      throw insertErr;
    }

    const link = await onboardingLink({ accountId: state.accountId, refreshUrl, returnUrl });
    if ('error' in link) {
      // The account exists at Stripe and is recorded here, so this is recoverable
      // — the seller presses the button again and takes the `resumed` path above.
      return NextResponse.json(
        { error: `Your Stripe account was created but the onboarding link could not be opened: ${link.error}`, accountId: state.accountId },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: link.url, accountId: state.accountId, methodId: inserted.id });
  } catch (err) {
    return failure('payout-connect', err, id, 'Could not start Stripe onboarding.');
  }
}
