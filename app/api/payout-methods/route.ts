import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { enforce } from "@/lib/rate-limit";
import { isMissingTable } from "@/lib/pg-errors";
import { logWarn, requestId, failure } from "@/lib/observability";
import { validateMethod, labelFor, currencyFor, countryFor, PAYOUT_KINDS, type MethodDraft, type PayoutKind } from "@/lib/payout-methods";

// A seller's connected payout destinations (migration 042).
//
// GET                                  their methods, labels only
// POST   { kind, ...fields, makePrimary? }   connect one
// PATCH  { id, isPrimary }             make one primary
// DELETE { id }                        disconnect one
//
// Authenticated as the *seller*, not as an admin: this is the one payout surface
// that belongs to the person being paid. The token is verified against Supabase
// rather than decoded here, because an unverified `sub` would let anyone
// redirect someone else's earnings to their own account — which is the single
// highest-value thing to get wrong in this codebase.
//
// Written with the service-role key even though migration 042 gives the table
// correct owner-scoped RLS, for two reasons the client cannot do itself: the
// display label is derived on the server so it always matches what the admin
// queue renders, and making a method primary means clearing the previous one
// first, which has to happen in a known order against the partial unique index.
//
// Because the service role bypasses RLS, it also bypasses migration 041's
// freeze — so this route checks account standing itself, below. Changing where
// your money goes while suspended for fraud is exactly the move the freeze
// exists to stop.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/042_payout_methods.sql';

const clean = (v: unknown, max = 200) => typeof v === 'string' ? v.trim().slice(0, max) : '';

const shape = (r: any) => ({
  id: r.id,
  kind: r.kind,
  label: r.label,
  isPrimary: r.is_primary,
  status: r.status,
  bankCountry: r.bank_country ?? null,
  bankCurrency: r.bank_currency ?? null,
  createdAt: r.created_at,
  // Whether an admin pressing Send can actually reach this destination, which is
  // narrower than "the kind has an API". A stripe row only qualifies when this
  // platform opened the account through Connect (`stripe_onboarded_at`) *and*
  // Stripe currently accepts transfers into it — the same two conditions
  // migration 045's dispatch claim checks. Undefined before 045, hence the
  // explicit `=== true`: an unapplied migration reads as manual, not automatic.
  automatic: r.kind === 'paypal'
    ? true
    : r.kind === 'stripe' && !!r.stripe_onboarded_at && r.stripe_transfers_enabled === true,
});

/**
 * Verified caller, service-role client, and their account standing.
 *
 * Standing is read here rather than left to RLS because every write below runs
 * as the service role. See the header.
 */
async function seller(req: NextRequest, gate: { name: string; limit: number }): Promise<
  { ctx: { db: any; userId: string }; fail: null } | { ctx: null; fail: NextResponse }
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

  return { ctx: { db, userId: data.user.id }, fail: null };
}

/** Null when the account may write, or a response explaining why it may not. */
async function frozenCheck(db: any, userId: string): Promise<NextResponse | null> {
  const { data } = await db
    .from('profiles')
    .select('suspended_until, banned_at')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  if (data.banned_at) {
    return NextResponse.json(
      { error: 'This account is banned. Payout details cannot be changed — appeal at /appeal if you think that is wrong.' },
      { status: 403 },
    );
  }
  if (data.suspended_until && new Date(data.suspended_until) > new Date()) {
    return NextResponse.json(
      { error: 'Payout details are locked while your account is suspended. You can appeal at /appeal.' },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { ctx, fail } = await seller(req, { name: 'payout-methods', limit: 60 });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const { data, error } = await ctx.db
      .from('payout_methods')
      .select('*')
      .eq('seller_id', ctx.userId)
      .neq('status', 'disabled')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTable(error)) {
        logWarn('payout-methods', 'table missing', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ methods: [], available: false }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    return NextResponse.json(
      { methods: (data ?? []).map(shape), available: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return failure('payout-methods', err, id, 'Could not load your payout methods.');
  }
}

export async function POST(req: NextRequest) {
  // Ten a minute. Connecting a destination is a rare, deliberate act; anything
  // near this ceiling is a script probing account-number formats.
  const { ctx, fail } = await seller(req, { name: 'payout-methods-write', limit: 10 });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const frozen = await frozenCheck(ctx.db, ctx.userId);
    if (frozen) return frozen;

    const body = await req.json().catch(() => ({}));
    const kind = clean(body?.kind, 20) as PayoutKind;
    if (!(PAYOUT_KINDS as readonly string[]).includes(kind)) {
      return NextResponse.json({ error: 'Pick how you want to be paid.' }, { status: 400 });
    }

    // Stripe destinations do not come from here any more. This route used to
    // accept an acct_ id the seller typed and check only that it started with
    // acct_ — which proved nothing about whose account it was. Harmless while
    // every payout went out by hand; a way to be paid another seller's earnings
    // the moment transfers.create was wired. /api/payout-methods/connect creates
    // the account instead, so the id is one Stripe issued to this platform.
    if (kind === 'stripe') {
      return NextResponse.json(
        { error: 'Stripe accounts are connected through Stripe rather than entered by hand — use the Connect with Stripe button.' },
        { status: 400 },
      );
    }

    const draft: MethodDraft = {
      kind,
      paypalEmail: clean(body?.paypalEmail, 254).toLowerCase(),
      stripeAccountId: clean(body?.stripeAccountId, 64),
      uglycashHandle: clean(body?.uglycashHandle, 40).replace(/^\$/, ''),
      bankCountry: clean(body?.bankCountry, 2).toUpperCase(),
      bankName: clean(body?.bankName, 120),
      bankAccountName: clean(body?.bankAccountName, 120),
      bankAccountNumber: clean(body?.bankAccountNumber, 40).replace(/\s/g, ''),
      bankExtra: clean(body?.bankExtra, 64),
    };

    // The same function the form ran before submitting. Run again here because
    // the form's copy is a convenience and this one is the rule.
    const invalid = validateMethod(draft);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    // Derived, never taken from the request. The currency follows from the
    // country, and the label is what the admin queue renders — a client-supplied
    // label would let a seller write whatever they liked onto the screen of the
    // person approving their payout.
    const country = countryFor(draft.bankCountry ?? '');

    const row: Record<string, any> = {
      seller_id: ctx.userId,
      kind,
      label: labelFor(draft),
      paypal_email: kind === 'paypal' ? draft.paypalEmail : null,
      // Always null here. A Stripe destination is only ever created by
      // /api/payout-methods/connect, against an account id Stripe issued to this
      // platform — see the refusal above and migration 045.
      stripe_account_id: null,
      uglycash_handle: kind === 'uglycash' ? draft.uglycashHandle : null,
      bank_country: kind === 'bank' ? draft.bankCountry : null,
      bank_currency: kind === 'bank' ? currencyFor(draft.bankCountry ?? '') : null,
      bank_name: kind === 'bank' ? draft.bankName : null,
      bank_account_name: kind === 'bank' ? draft.bankAccountName : null,
      bank_account_number: kind === 'bank' ? draft.bankAccountNumber : null,
      bank_extra: kind === 'bank' ? draft.bankExtra : null,
    };

    // The first method connected becomes primary without being asked. A seller
    // with exactly one destination and no primary is a seller whose payout
    // request cannot be approved, and nothing on screen would say why.
    const { count } = await ctx.db
      .from('payout_methods')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', ctx.userId)
      .neq('status', 'disabled');

    const wantsPrimary = body?.makePrimary === true || (count ?? 0) === 0;
    if (wantsPrimary && (count ?? 0) > 0) {
      // Cleared before the insert, not after: the partial unique index allows
      // one primary per seller, and inserting a second would be rejected.
      await ctx.db.from('payout_methods').update({ is_primary: false }).eq('seller_id', ctx.userId).eq('is_primary', true);
    }
    row.is_primary = wantsPrimary;

    const { data, error } = await ctx.db.from('payout_methods').insert(row).select('*').single();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ error: `Payouts are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'You have already connected that one.' }, { status: 409 });
      }
      // The CHECK in 042 that requires each kind to carry its own fields. If it
      // fires, something above let an incomplete draft through.
      if (error.code === '23514') {
        return NextResponse.json({ error: 'Some details are missing for that payout method.' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ method: shape(data) });
  } catch (err) {
    return failure('payout-methods', err, id, 'Could not save that payout method.');
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await seller(req, { name: 'payout-methods-write', limit: 30 });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const frozen = await frozenCheck(ctx.db, ctx.userId);
    if (frozen) return frozen;

    const body = await req.json().catch(() => ({}));
    const target = clean(body?.id, 40);
    if (!target) return NextResponse.json({ error: 'Which method?' }, { status: 400 });
    if (body?.isPrimary !== true) {
      // There is no "unset primary". A seller with methods and no primary
      // cannot be paid, so the only move is to promote a different one.
      return NextResponse.json({ error: 'To change your primary method, choose the one you want instead.' }, { status: 400 });
    }

    // Ownership is checked by the filter, not by trusting the id. Every query
    // below carries `.eq('seller_id', ctx.userId)` for that reason.
    const { data: existing } = await ctx.db
      .from('payout_methods')
      .select('id')
      .eq('id', target)
      .eq('seller_id', ctx.userId)
      .neq('status', 'disabled')
      .maybeSingle();

    if (!existing) return NextResponse.json({ error: 'That payout method is not on your account.' }, { status: 404 });

    // Two statements rather than one, because a single UPDATE flipping both
    // rows can trip the partial unique index mid-statement. Clearing first means
    // the worst case is briefly having no primary, which the next line fixes and
    // which the screen would show honestly if it didn't.
    await ctx.db.from('payout_methods').update({ is_primary: false }).eq('seller_id', ctx.userId).eq('is_primary', true);

    const { data, error } = await ctx.db
      .from('payout_methods')
      .update({ is_primary: true, updated_at: new Date().toISOString() })
      .eq('id', target)
      .eq('seller_id', ctx.userId)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ method: shape(data) });
  } catch (err) {
    return failure('payout-methods', err, id, 'Could not change your primary payout method.');
  }
}

export async function DELETE(req: NextRequest) {
  const { ctx, fail } = await seller(req, { name: 'payout-methods-write', limit: 30 });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const frozen = await frozenCheck(ctx.db, ctx.userId);
    if (frozen) return frozen;

    const body = await req.json().catch(() => ({}));
    const target = clean(body?.id, 40);
    if (!target) return NextResponse.json({ error: 'Which method?' }, { status: 400 });

    // A payout waiting on this destination must not lose it. The FK is
    // `on delete set null`, so removing the method would leave a request with
    // nowhere to send money — and admin_review_payout would then refuse to
    // approve it, with the seller having no idea why.
    const { count } = await ctx.db
      .from('payout_requests')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', ctx.userId)
      .eq('method_id', target)
      .in('status', ['pending', 'approved']);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'A payout is still waiting on this method. It can be removed once that has been sent or cancelled.' },
        { status: 409 },
      );
    }

    const { data: existing } = await ctx.db
      .from('payout_methods')
      .select('id, is_primary')
      .eq('id', target)
      .eq('seller_id', ctx.userId)
      .maybeSingle();

    if (!existing) return NextResponse.json({ error: 'That payout method is not on your account.' }, { status: 404 });

    const { error } = await ctx.db.from('payout_methods').delete().eq('id', target).eq('seller_id', ctx.userId);
    if (error) throw error;

    // Removing the primary leaves the seller unable to request a payout, so the
    // oldest remaining method is promoted rather than leaving them in a state
    // whose only symptom is a disabled button.
    let promoted: any = null;
    if (existing.is_primary) {
      const { data: next } = await ctx.db
        .from('payout_methods')
        .select('id')
        .eq('seller_id', ctx.userId)
        .neq('status', 'disabled')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (next) {
        const { data } = await ctx.db
          .from('payout_methods')
          .update({ is_primary: true, updated_at: new Date().toISOString() })
          .eq('id', next.id)
          .select('*')
          .single();
        promoted = data ? shape(data) : null;
      }
    }

    return NextResponse.json({ ok: true, promoted });
  } catch (err) {
    return failure('payout-methods', err, id, 'Could not remove that payout method.');
  }
}
