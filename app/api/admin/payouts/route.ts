import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-role";
import { isMissingFunction, isMissingTable } from "@/lib/pg-errors";
import { logWarn, logError, requestId, failure } from "@/lib/observability";
import { paypalConfig, sendPayout } from "@/lib/paypal";
import { stripeConfig, sendTransfer } from "@/lib/stripe-connect";

// The payout queue (migrations 022 + 042).
//
// GET   ?status=&limit=                          the queue
// PATCH { id, status, note?, actorLabel? }        approve, reject or hold
// POST  { id, action: 'paid', reference }         record that money was sent
// POST  { id, action: 'reveal' }                  full destination, audited
//
// Everything gated on `payouts.manage`, held by owner and admin only — a
// moderator can suspend an account but cannot move money out of it.
//
// POST  { id, action: 'dispatch' }              send it through the provider
//
// Approving still does not send money, and that separation is the point.
// `status` records the decision; `paid_at` records that money moved. Three
// things can set it, and each is an explicit act:
//
//   admin_mark_payout_paid   a person sent it and typed the reference. The only
//                            path for UglyCash and bank transfers, and the only
//                            path anywhere the credentials below are absent.
//   'dispatch' + Stripe      a transfer succeeded, which means the money is the
//                            seller's at that moment.
//   'dispatch' + PayPal      submitted; the row sits in 'processing' and the
//                            webhook settles it. Submitted is not arrived.
//
// Dispatch never runs off the back of approval. It is a second button, pressed
// deliberately, gated on the same `payouts.manage` — because the failure mode of
// getting this wrong is money leaving the account, and an automatic step is one
// nobody chose to take.
//
// The queue never carries a full account number. `destination` is the masked
// label; the real details are a separate POST that writes an audit line in the
// same transaction as the read.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/042_payout_methods.sql';
const MISSING_DISPATCH = 'apply supabase/migrations/045_payout_dispatch.sql';

const DECISIONS = new Set(['approved', 'rejected', 'on_hold']);
const STATUSES = new Set(['pending', 'approved', 'rejected', 'on_hold', 'processing', 'paid']);

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const num = (v: any) => typeof v === 'number' && Number.isFinite(v) ? v : 0;

const shape = (r: any) => ({
  id: r.id,
  amountCents: num(r.amount_cents),
  feeCents: num(r.fee_cents),
  netCents: num(r.net_cents),
  status: r.status,
  dispatch: r.dispatch ?? 'manual',
  rejectReason: r.reject_reason ?? null,
  adminNote: r.admin_note ?? null,
  createdAt: r.created_at,
  reviewedAt: r.reviewed_at ?? null,
  reviewedBy: r.reviewed_by ?? null,
  paidAt: r.paid_at ?? null,
  paidBy: r.paid_by ?? null,
  paymentReference: r.payment_reference ?? null,
  destination: r.destination ?? 'No method connected',
  methodId: r.method_id ?? null,
  methodKind: r.method_kind ?? null,
  // Migration 045. Absent until it is applied, which is why every one of these
  // falls back rather than reading undefined — the screen degrades to the manual
  // path it had before instead of showing a Send button that cannot work.
  provider: r.provider ?? null,
  providerRef: r.provider_ref ?? null,
  providerStatus: r.provider_status ?? null,
  dispatchAttemptedAt: r.dispatch_attempted_at ?? null,
  dispatchError: r.dispatch_error ?? null,
  dispatchable: r.dispatchable === true,
  // The sentence explaining why not, computed in SQL so the console and the
  // route cannot disagree about it.
  dispatchBlocker: r.dispatch_blocker ?? null,
  seller: {
    id: r.seller_id,
    name: r.seller_name ?? null,
    handle: r.seller_handle ?? null,
    avatarUrl: r.seller_avatar ?? null,
    since: r.seller_since ?? null,
    frozen: r.seller_frozen === true,
  },
  // Real numbers out of SQL, replacing the invented trustScore and openDisputes
  // the screen used to draw next to an Approve button.
  ledger: {
    earnedCents: Number(r.earned_cents ?? 0),
    committedCents: Number(r.committed_cents ?? 0),
    availableCents: Number(r.available_cents ?? 0),
  },
  signals: {
    deliveredItems: Number(r.delivered_items ?? 0),
    refundedOrders: Number(r.refunded_orders ?? 0),
    priorPayouts: Number(r.prior_payouts ?? 0),
  },
});

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-payouts', limit: 60, permission: 'payouts.manage' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const status = str(req.nextUrl.searchParams.get('status'), 40);
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 200, 1), 500);

    const { data, error } = await ctx.db.rpc('admin_payout_queue', {
      p_status: status && status !== 'all' && STATUSES.has(status) ? status : null,
      p_limit: limit,
    });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        logWarn('admin/payouts', 'queue unavailable', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ payouts: [], available: false }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    const payouts = (data ?? []).map(shape);

    return NextResponse.json({
      payouts,
      available: true,
      // Only meaningful over the unfiltered set — otherwise the rail badge would
      // report the size of whichever chip is selected.
      pending: !status || status === 'all' ? payouts.filter((p: any) => p.status === 'pending').length : null,
      canManage: true,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/payouts', err, id, 'Could not load the payout queue.');
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-payouts-write', limit: 40, permission: 'payouts.manage' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const payout = str(body?.id, 40);
    const status = str(body?.status, 40);
    const note = str(body?.note, 2000);

    if (!payout) return NextResponse.json({ error: 'Which payout?' }, { status: 400 });
    if (!DECISIONS.has(status)) return NextResponse.json({ error: 'Unknown decision.' }, { status: 400 });
    if (status === 'rejected' && !note) {
      return NextResponse.json({ error: 'A rejection needs a reason — the seller is shown it.' }, { status: 400 });
    }

    const { data, error } = await ctx.db.rpc('admin_review_payout', {
      p_actor: ctx.adminId,
      p_label: str(body?.actorLabel, 80) || null,
      p_payout: payout,
      p_status: status,
      p_note: note || null,
    });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        return NextResponse.json({ error: `Payouts are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      if (error.code === 'P0002') return NextResponse.json({ error: 'That payout request no longer exists.' }, { status: 404 });
      // The balance guard, the frozen-seller guard, the no-method guard, and
      // "already sent". All raise 22023 with a message written for the admin
      // reading it, so it is passed through rather than flattened to "Forbidden".
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 409 });
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      payout: {
        id: row?.id ?? payout,
        status: row?.status ?? status,
        rejectReason: row?.reject_reason ?? null,
        adminNote: row?.admin_note ?? null,
        reviewedAt: row?.reviewed_at ?? null,
      },
    });
  } catch (err) {
    return failure('admin/payouts', err, id, 'Could not update that payout.');
  }
}

export async function POST(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-payouts-write', limit: 40, permission: 'payouts.manage' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const payout = str(body?.id, 40);
    const action = str(body?.action, 20);
    const label = str(body?.actorLabel, 80) || null;

    if (!payout) return NextResponse.json({ error: 'Which payout?' }, { status: 400 });

    if (action === 'reveal') {
      const { data, error } = await ctx.db.rpc('admin_payout_destination', {
        p_actor: ctx.adminId, p_label: label, p_payout: payout,
      });

      if (error) {
        if (isMissingFunction(error) || isMissingTable(error)) {
          return NextResponse.json({ error: `Payouts are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
        }
        if (error.code === 'P0002') return NextResponse.json({ error: error.message }, { status: 404 });
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return NextResponse.json({ error: 'That payout method no longer exists.' }, { status: 404 });

      return NextResponse.json({
        destination: {
          kind: row.kind,
          label: row.label,
          status: row.status,
          paypalEmail: row.paypal_email ?? null,
          stripeAccountId: row.stripe_account_id ?? null,
          uglycashHandle: row.uglycash_handle ?? null,
          bankCountry: row.bank_country ?? null,
          bankCurrency: row.bank_currency ?? null,
          bankName: row.bank_name ?? null,
          bankAccountName: row.bank_account_name ?? null,
          bankAccountNumber: row.bank_account_number ?? null,
          bankExtra: row.bank_extra ?? null,
        },
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'paid') {
      const reference = str(body?.reference, 200);
      if (!reference) {
        return NextResponse.json(
          { error: 'Enter the transfer reference — this is the only record that the money was sent.' },
          { status: 400 },
        );
      }

      const { data, error } = await ctx.db.rpc('admin_mark_payout_paid', {
        p_actor: ctx.adminId, p_label: label, p_payout: payout, p_reference: reference,
      });

      if (error) {
        if (isMissingFunction(error) || isMissingTable(error)) {
          return NextResponse.json({ error: `Payouts are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
        }
        if (error.code === 'P0002') return NextResponse.json({ error: 'That payout request no longer exists.' }, { status: 404 });
        // "already recorded as sent", "only an approved payout can be marked
        // sent", "needs a reference".
        if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 409 });
        throw error;
      }

      const row = Array.isArray(data) ? data[0] : data;
      return NextResponse.json({
        payout: {
          id: row?.id ?? payout,
          status: row?.status ?? 'paid',
          paidAt: row?.paid_at ?? null,
          paymentReference: row?.payment_reference ?? reference,
        },
      });
    }

    // Awaited rather than returned: a rejection from a promise returned out of a
    // try block escapes the catch below, and this is the branch whose failures
    // most need the audited 500 rather than an unhandled rejection.
    if (action === 'dispatch') {
      return await dispatch(ctx, { payout, label, requestId: id });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    return failure('admin/payouts', err, id, 'Could not complete that action.');
  }
}

// ── Dispatch ────────────────────────────────────────────────────────────────
//
// Claim, send, settle. Three steps and no shortcuts between them, because the
// middle one moves money and the other two are how we stay honest about whether
// it did.
//
// The claim is what stops a double send. Two admins pressing Send at the same
// instant both reach admin_dispatch_claim; it takes a row lock and flips the
// status, so the second one finds a row that is no longer 'approved' and is
// turned away before it ever gets a provider credential in its hands. The
// idempotency keys in lib/stripe-connect and lib/paypal are the second line —
// they cover a retry of the *same* request after a timeout, which is a different
// failure and needs a different answer.
//
// The settle is unconditional. Every path out of the provider call writes an
// outcome, including the ones where the provider never answered, because a row
// left in 'processing' with no error is a row nobody can retry and nobody can
// mark by hand without wondering what happened.

async function dispatch(
  ctx: { db: any; adminId: string },
  args: { payout: string; label: string | null; requestId: string },
): Promise<NextResponse> {
  const { payout, label } = args;

  // Checked before the claim so that a platform with no provider credentials at
  // all says so plainly, rather than flipping a row to 'processing' and back to
  // explain a configuration problem.
  const paypal = paypalConfig();
  const stripe = stripeConfig();
  if ('error' in paypal && 'error' in stripe) {
    return NextResponse.json({ error: `${stripe.error} ${paypal.error} Send this one by hand and record the reference.` }, { status: 503 });
  }

  const { data: claimed, error: claimError } = await ctx.db.rpc('admin_dispatch_claim', {
    p_actor: ctx.adminId, p_label: label, p_payout: payout,
  });

  if (claimError) {
    if (isMissingFunction(claimError) || isMissingTable(claimError)) {
      return NextResponse.json({ error: `Automatic payouts are not set up yet — ${MISSING_DISPATCH}.` }, { status: 503 });
    }
    if (claimError.code === 'P0002') return NextResponse.json({ error: claimError.message }, { status: 404 });
    // Every refusal in the claim is a sentence written for the admin reading it:
    // already sent, already in flight, not approved, no method, a typed Stripe id,
    // onboarding unfinished, seller suspended since approval.
    if (claimError.code === '22023') return NextResponse.json({ error: claimError.message }, { status: 409 });
    throw claimError;
  }

  const job = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!job) return NextResponse.json({ error: 'That payout could not be claimed for sending.' }, { status: 409 });

  const provider: string = job.provider;
  const cents = Number(job.net_cents ?? 0);
  const currency = str(job.currency, 8) || 'usd';

  // From here on every exit settles the row. `settle` is deliberately tolerant of
  // its own failure: if the provider took the money and the database write then
  // fails, that is worth a loud log, not a thrown error that would tell the admin
  // the payout failed when it did not.
  const settle = async (
    outcome: 'paid' | 'submitted' | 'failed',
    fields: { ref?: string | null; itemRef?: string | null; status?: string | null; error?: string | null } = {},
  ) => {
    const { data, error } = await ctx.db.rpc('admin_dispatch_settle', {
      p_actor: ctx.adminId,
      p_label: label,
      p_payout: payout,
      p_outcome: outcome,
      p_ref: fields.ref ?? null,
      p_item_ref: fields.itemRef ?? null,
      p_status: fields.status ?? null,
      p_error: fields.error ?? null,
    });
    if (error) {
      logError('admin/payouts', 'dispatch settled at the provider but not in the database', error, {
        payout, provider, outcome, ref: fields.ref ?? null, requestId: args.requestId,
      });
      return null;
    }
    return Array.isArray(data) ? data[0] : data;
  };

  const settled = (row: any, extra: Record<string, unknown> = {}) => NextResponse.json({
    payout: {
      id: row?.id ?? payout,
      status: row?.status ?? null,
      paidAt: row?.paid_at ?? null,
      paymentReference: row?.payment_reference ?? null,
      provider: row?.provider ?? provider,
      providerRef: row?.provider_ref ?? null,
      providerStatus: row?.provider_status ?? null,
      dispatchError: row?.dispatch_error ?? null,
    },
    ...extra,
  });

  if (provider === 'stripe') {
    if ('error' in stripe) {
      await settle('failed', { error: stripe.error });
      return NextResponse.json({ error: stripe.error }, { status: 503 });
    }

    const accountId = str(job.stripe_account_id, 60);
    if (!accountId) {
      const message = 'That seller has no connected Stripe account on record.';
      await settle('failed', { error: message });
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const result = await sendTransfer({
      payoutId: payout,
      accountId,
      cents,
      currency,
      sellerHandle: str(job.seller_handle, 60) || null,
    });

    if (result.result === 'failed') {
      const row = await settle('failed', { error: result.error });
      return NextResponse.json({
        error: result.error,
        retryable: result.transient,
        payout: row ? { id: row.id, status: row.status, dispatchError: row.dispatch_error ?? null } : undefined,
      }, { status: 502 });
    }

    // A Stripe transfer succeeding *is* the settlement — the money is in the
    // seller's connected balance at this moment. Stripe's own schedule moves it
    // to their bank afterwards, which is Stripe's business and not a state this
    // platform tracks.
    const row = await settle('paid', {
      ref: result.transfer.transferId,
      status: 'succeeded',
    });
    return settled(row, { sent: true, message: `Sent ${(result.transfer.amountCents / 100).toFixed(2)} ${result.transfer.currency.toUpperCase()} to the seller's Stripe account.` });
  }

  if (provider === 'paypal') {
    if ('error' in paypal) {
      await settle('failed', { error: paypal.error });
      return NextResponse.json({ error: paypal.error }, { status: 503 });
    }

    const email = str(job.paypal_email, 200);
    if (!email) {
      const message = 'That seller has no PayPal address on record.';
      await settle('failed', { error: message });
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const result = await sendPayout({
      payoutId: payout,
      email,
      cents,
      currency,
      note: `Honua seller payout${job.seller_handle ? ` · @${job.seller_handle}` : ''}`,
    });

    // PayPal already has a batch under this reference. Not a failure: the money
    // is with them, and settling this as failed would put a Send button back on
    // screen next to a payout that may already be on its way. It stays in
    // 'processing' until the webhook or a person resolves it.
    //
    // No batch id to record, so the webhook will not match on provider refs. It
    // falls back to sender_item_id — which is this payout's own id — in
    // app/api/paypal/webhook.
    if (result.result === 'duplicate') {
      const row = await settle('submitted', { status: 'DUPLICATE_SUBMISSION' });
      return settled(row, { submitted: true, duplicate: true, message: result.error });
    }

    if (result.result === 'failed') {
      const row = await settle('failed', { error: result.error });
      return NextResponse.json({
        error: result.error,
        retryable: result.transient,
        payout: row ? { id: row.id, status: row.status, dispatchError: row.dispatch_error ?? null } : undefined,
      }, { status: 502 });
    }

    // Submitted, not paid. PayPal answers PENDING and settles later; the webhook
    // is what writes paid_at. Anything that called this 'sent' would be asserting
    // something PayPal has not yet said.
    const row = await settle('submitted', {
      ref: result.submission.batchId,
      status: result.submission.batchStatus,
    });
    return settled(row, {
      submitted: true,
      message: 'Submitted to PayPal. It usually clears within minutes — the queue updates itself when PayPal confirms.',
    });
  }

  // Unreachable via the claim, which refuses every other kind. Kept so that
  // adding a provider to the SQL and forgetting the route fails loudly here
  // rather than leaving a row stuck in 'processing'.
  const message = `No integration for ${provider || 'that method'} — send it by hand and record the reference.`;
  await settle('failed', { error: message });
  return NextResponse.json({ error: message }, { status: 501 });
}
