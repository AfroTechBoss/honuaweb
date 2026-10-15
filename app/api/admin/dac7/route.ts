import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-role";
import { isMissingTable, isMissingFunction } from "@/lib/pg-errors";
import { requestId, failure, logError } from "@/lib/observability";
import { regimeFor, EU_COUNTRIES, EXCLUSION_MAX_SALES, EXCLUSION_MAX_EUR, type TaxRegime } from "@/lib/tax";

// Platform tax reporting — DAC7 in the EU, the OECD model rules in the UK,
// Canada, Australia and New Zealand, and the US numbers for 1099-K.
//
// GET  ?view=report&year=2026&scope=dac7|oecd|us|all&eurPerUsd=0.92[&format=csv]
//        Per-seller, per-quarter totals from dac7_report() (058), with who is
//        reportable. format=csv is the file to hand to an accountant or to load
//        into the tax office's portal; the JSON is what the panel draws.
// GET  ?view=profiles&status=submitted|verified|rejected|all
//        Sellers' tax details, for review.
// PATCH { sellerId, action: 'verify' | 'reject', note? }
// PATCH { sellerId, action: 'check_vat' }   asks the EU's VIES service whether
//        the VAT number is valid. Read-only.
//
// Gated on `tax.report` (owner and admin). This route hands out every seller's
// tax ID, date of birth and bank details in one file, so every export is
// written to the audit log.
//
// What it does not do: produce the DPI XML the tax offices accept, or file
// anything. The CSV has every field the XML needs; turning it into XML is the
// next step once the registration country is settled (Estonia's e-MTA and
// Italy's Agenzia delle Entrate each publish their own schema).

export const runtime = 'nodejs';

// Same rate as SALE_FEE in lib/market.ts, which can't be imported here (it
// pulls in the browser Supabase client). Keep the two in step.
const SALE_FEE = 0.05;

const MISSING_MIGRATION = 'apply supabase/migrations/058_dac7_seller_tax.sql';

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';

type Row = {
  seller_id: string;
  deleted: boolean;
  account: any;
  tax: any;
  payout_accounts: any[];
  q_sales: number[];
  q_gross_cents: number[];
  q_refund_cents: number[];
  q_fee_cents: number[];
  q_net_cents: number[];
};

const sum = (a: (number | string)[] | null | undefined) => (a ?? []).reduce<number>((s, v) => s + Number(v ?? 0), 0);

// The account the money went to. DAC7 asks for it "insofar as available";
// the primary method is the one payouts default to.
function financialAccount(methods: any[]): { identifier: string; holder: string } {
  const m = (methods ?? []).find((x: any) => x.is_primary) ?? (methods ?? [])[0];
  if (!m) return { identifier: '', holder: '' };
  switch (m.kind) {
    // bank_extra is the IBAN, sort code or routing number.
    case 'bank': return { identifier: [m.bank_country, m.bank_name, m.bank_extra, m.bank_account_number].filter(Boolean).join(' '), holder: m.bank_account_name ?? '' };
    case 'paypal': return { identifier: `PayPal ${m.paypal_email ?? ''}`.trim(), holder: '' };
    case 'stripe': return { identifier: `Stripe ${m.stripe_account_id ?? ''}`.trim(), holder: '' };
    case 'uglycash': return { identifier: `UglyCash $${m.uglycash_handle ?? ''}`, holder: '' };
    default: return { identifier: m.label ?? '', holder: '' };
  }
}

function assess(r: Row, eurPerUsd: number | null) {
  const tax = r.tax ?? null;
  const country: string = tax?.country ?? '';
  const pe: string[] = Array.isArray(tax?.permanent_establishments) ? tax.permanent_establishments : [];
  let regime: TaxRegime = regimeFor(country);
  // A non-EU business selling through an EU permanent establishment is
  // reported under DAC7 for that establishment.
  if (regime !== 'dac7' && pe.some(c => (EU_COUNTRIES as readonly string[]).includes(c))) regime = 'dac7';

  const sales = sum(r.q_sales);
  const netCents = sum(r.q_net_cents);
  const netEur = eurPerUsd ? Math.round(netCents * eurPerUsd) / 100 : null;

  // 30 sales *and* €2,000 — a seller over either is reported.
  const excluded = sales < EXCLUSION_MAX_SALES && netEur !== null && netEur <= EXCLUSION_MAX_EUR;

  let status: 'reportable' | 'excluded' | 'missing_details' | 'rate_needed' | 'not_in_scope';
  if (!tax) status = 'missing_details';
  else if (regime === 'none') status = 'not_in_scope';
  else if (regime === 'us') status = 'reportable'; // thresholds decided by the accountant / Stripe
  else if (netEur === null) status = sales >= EXCLUSION_MAX_SALES ? 'reportable' : 'rate_needed';
  else status = excluded ? 'excluded' : 'reportable';

  const name = tax
    ? (tax.entity_type === 'entity' ? tax.legal_name : [tax.first_name, tax.last_name].filter(Boolean).join(' '))
    : (r.account?.legal_name || r.account?.full_name || '');

  return { tax, country, regime, sales, netCents, netEur, status, name };
}

// Spreadsheet apps execute a cell that starts with = + - @. Seller-entered
// text goes into this file, so text cells are defused; numbers are written raw.
function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v);
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const money = (cents: number | string) => Math.round(Number(cents ?? 0)) / 100;

function toCsv(rows: Row[], eurPerUsd: number | null, year: number): string {
  const head = [
    'seller_id', 'account_deleted', 'regime', 'status',
    'entity_type', 'first_name', 'last_name', 'legal_name', 'date_of_birth', 'birth_city', 'birth_country',
    'address_line1', 'address_line2', 'city', 'region', 'postal_code', 'residence_country',
    'tin', 'tin_issued_by', 'no_tin', 'vat_number', 'business_reg_number', 'permanent_establishments',
    'financial_account', 'account_holder', 'email', 'shop_name', 'tax_details_status',
    'sales_q1', 'sales_q2', 'sales_q3', 'sales_q4',
    'consideration_q1', 'consideration_q2', 'consideration_q3', 'consideration_q4',
    'fees_q1', 'fees_q2', 'fees_q3', 'fees_q4',
    'refunds_q1', 'refunds_q2', 'refunds_q3', 'refunds_q4',
    'total_sales', 'total_consideration', 'currency', 'total_consideration_eur', 'eur_per_usd', 'year',
  ];
  const lines = [head.join(',')];
  for (const r of rows) {
    const a = assess(r, eurPerUsd);
    const t = a.tax ?? {};
    const fa = financialAccount(r.payout_accounts);
    const q = (arr: (number | string)[] | null | undefined, i: number) => Number(arr?.[i] ?? 0);
    lines.push([
      r.seller_id, r.deleted ? 'yes' : 'no', a.regime, a.status,
      t.entity_type, t.first_name, t.last_name, t.legal_name ?? (a.tax ? '' : r.account?.legal_name), t.date_of_birth, t.birth_city, t.birth_country,
      t.address_line1, t.address_line2, t.city, t.region, t.postal_code, a.country,
      t.tin, t.tin_country, t.no_tin ? 'yes' : (a.tax ? 'no' : ''), t.vat_number, t.business_reg_number, (t.permanent_establishments ?? []).join(' '),
      fa.identifier, fa.holder, r.account?.email, r.account?.shop_name, t.status,
      q(r.q_sales, 0), q(r.q_sales, 1), q(r.q_sales, 2), q(r.q_sales, 3),
      money(q(r.q_net_cents, 0)), money(q(r.q_net_cents, 1)), money(q(r.q_net_cents, 2)), money(q(r.q_net_cents, 3)),
      money(q(r.q_fee_cents, 0)), money(q(r.q_fee_cents, 1)), money(q(r.q_fee_cents, 2)), money(q(r.q_fee_cents, 3)),
      money(q(r.q_refund_cents, 0)), money(q(r.q_refund_cents, 1)), money(q(r.q_refund_cents, 2)), money(q(r.q_refund_cents, 3)),
      a.sales, money(a.netCents), 'USD', a.netEur ?? '', eurPerUsd ?? '', year,
    ].map(cell).join(','));
  }
  // BOM so Excel opens accented names (Estonian, Italian) correctly.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

const SCOPES = new Set(['dac7', 'oecd', 'us', 'all']);

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-dac7', limit: 30, permission: 'tax.report' });
  if (fail) return fail;

  const id = requestId(req);
  const sp = req.nextUrl.searchParams;
  const view = sp.get('view') ?? 'report';

  try {
    if (view === 'profiles') {
      const status = sp.get('status') ?? 'submitted';
      let q = ctx.db.from('seller_tax_profiles').select('*').order('updated_at', { ascending: false }).limit(200);
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) {
        if (isMissingTable(error)) return NextResponse.json({ profiles: [], available: false, fix: MISSING_MIGRATION });
        throw error;
      }
      const ids = (data ?? []).map((r: any) => r.seller_id);
      const { data: people } = ids.length
        ? await ctx.db.from('profiles').select('id, handle, full_name').in('id', ids)
        : { data: [] };
      const byId = new Map((people ?? []).map((p: any) => [p.id, p]));
      return NextResponse.json({
        available: true,
        profiles: (data ?? []).map((r: any) => ({ ...r, handle: (byId.get(r.seller_id) as any)?.handle ?? null })),
      });
    }

    const year = Number(sp.get('year') ?? new Date().getUTCFullYear() - 1);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ error: 'Choose a year between 2020 and 2100.' }, { status: 400 });
    }
    const scope = sp.get('scope') ?? 'dac7';
    if (!SCOPES.has(scope)) return NextResponse.json({ error: 'Unknown scope.' }, { status: 400 });
    // EUR per USD, for the €2,000 test. The ECB publishes a yearly average; the
    // accountant picks the rate, so it is an input rather than a constant here.
    const rateRaw = sp.get('eurPerUsd');
    const eurPerUsd = rateRaw ? Number(rateRaw) : null;
    if (eurPerUsd !== null && (!Number.isFinite(eurPerUsd) || eurPerUsd <= 0 || eurPerUsd > 10)) {
      return NextResponse.json({ error: 'Enter the exchange rate as euros per US dollar, e.g. 0.92.' }, { status: 400 });
    }

    const { data, error } = await ctx.db.rpc('dac7_report', { p_year: year, p_fee_rate: SALE_FEE });
    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        return NextResponse.json({ available: false, fix: MISSING_MIGRATION, rows: [], totals: null });
      }
      throw error;
    }

    const all = (data ?? []) as Row[];
    // Sellers with no tax details stay in every scope: until they say where
    // they live, nobody can say they're out of it.
    const rows = all.filter(r => {
      if (scope === 'all') return true;
      const a = assess(r, eurPerUsd);
      return a.status === 'missing_details' || a.regime === scope;
    });

    if (sp.get('format') === 'csv') {
      const { error: auditErr } = await ctx.db.from('admin_audit_log').insert({
        actor_id: ctx.adminId,
        actor_label: str(sp.get('actorLabel'), 80) || 'Admin',
        action: 'Exported tax report',
        target: `${scope.toUpperCase()} ${year}`,
        kind: 'lock',
        meta: { year, scope, eurPerUsd, sellers: rows.length },
      });
      if (auditErr) logError('admin/dac7', 'audit write failed', auditErr, { requestId: id });

      return new NextResponse(toCsv(rows, eurPerUsd, year), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="honua-${scope}-${year}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const shaped = rows.map(r => {
      const a = assess(r, eurPerUsd);
      return {
        sellerId: r.seller_id,
        deleted: r.deleted,
        name: a.name || r.account?.handle || r.seller_id.slice(0, 8),
        handle: r.account?.handle ?? null,
        country: a.country || null,
        regime: a.regime,
        status: a.status,
        taxStatus: a.tax?.status ?? null,
        sales: a.sales,
        netCents: a.netCents,
        feeCents: sum(r.q_fee_cents),
        netEur: a.netEur,
        quarters: [0, 1, 2, 3].map(i => ({ sales: Number(r.q_sales?.[i] ?? 0), netCents: Number(r.q_net_cents?.[i] ?? 0) })),
      };
    });
    const count = (s: string) => shaped.filter(r => r.status === s).length;

    return NextResponse.json({
      available: true,
      year, scope, eurPerUsd,
      rows: shaped,
      totals: {
        sellers: shaped.length,
        reportable: count('reportable'),
        excluded: count('excluded'),
        missingDetails: count('missing_details'),
        rateNeeded: count('rate_needed'),
        netCents: shaped.reduce((s, r) => s + r.netCents, 0),
      },
    });
  } catch (err) {
    return failure('admin/dac7', err, id, 'Could not build the tax report.');
  }
}

// VIES uses EL for Greece; everything else is the ISO code.
const viesCountry = (iso: string) => iso === 'GR' ? 'EL' : iso;

async function checkVat(vat: string, residence: string): Promise<{ valid: boolean | null; name?: string; address?: string; error?: string }> {
  const clean = vat.replace(/[\s.\-]/g, '').toUpperCase();
  const prefixed = /^[A-Z]{2}/.test(clean) ? clean.slice(0, 2) : null;
  const cc = prefixed ?? viesCountry(residence);
  const number = prefixed ? clean.slice(2) : clean;
  if (!(EU_COUNTRIES as readonly string[]).map(viesCountry).includes(cc)) {
    return { valid: null, error: 'VIES only checks EU VAT numbers.' };
  }
  try {
    const res = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${cc}/vat/${encodeURIComponent(number)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || body?.userError && body.userError !== 'VALID' && body.userError !== 'INVALID') {
      return { valid: null, error: `VIES couldn't answer (${body?.userError ?? res.status}). Try again later.` };
    }
    return { valid: !!body?.isValid, name: body?.name && body.name !== '---' ? body.name : undefined, address: body?.address && body.address !== '---' ? body.address : undefined };
  } catch {
    return { valid: null, error: 'VIES did not respond. It is often down for maintenance; try again later.' };
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-dac7-write', limit: 30, permission: 'tax.report' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => null);
    const sellerId = str(body?.sellerId, 64);
    const action = str(body?.action, 20);
    if (!sellerId) return NextResponse.json({ error: 'sellerId is required.' }, { status: 400 });

    const { data: current, error: readErr } = await ctx.db
      .from('seller_tax_profiles').select('*').eq('seller_id', sellerId).maybeSingle();
    if (readErr) {
      if (isMissingTable(readErr)) return NextResponse.json({ error: MISSING_MIGRATION }, { status: 503 });
      throw readErr;
    }
    if (!current) return NextResponse.json({ error: 'That seller has no tax details.' }, { status: 404 });

    if (action === 'check_vat') {
      if (!current.vat_number) return NextResponse.json({ error: 'No VAT number on file.' }, { status: 400 });
      return NextResponse.json({ vat: await checkVat(current.vat_number, current.country) });
    }

    if (action !== 'verify' && action !== 'reject') {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    const note = str(body?.note, 500);
    if (action === 'reject' && !note) {
      return NextResponse.json({ error: 'Say what needs correcting — the seller sees this note.' }, { status: 400 });
    }

    // Matched on updated_at so a seller's edit made while the reviewer was
    // looking isn't verified unseen.
    const { data, error } = await ctx.db
      .from('seller_tax_profiles')
      .update({
        status: action === 'verify' ? 'verified' : 'rejected',
        review_note: action === 'reject' ? note : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: ctx.adminId,
      })
      .eq('seller_id', sellerId)
      .eq('updated_at', current.updated_at)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'The seller changed these details a moment ago. Reload and check again.' }, { status: 409 });

    const { error: auditErr } = await ctx.db.from('admin_audit_log').insert({
      actor_id: ctx.adminId,
      actor_label: str(body?.actorLabel, 80) || 'Admin',
      action: action === 'verify' ? 'Verified tax details' : 'Rejected tax details',
      target: current.legal_name || [current.first_name, current.last_name].filter(Boolean).join(' ') || sellerId,
      kind: action === 'verify' ? 'check' : 'close',
      meta: { sellerId, note: note || null },
    });
    if (auditErr) logError('admin/dac7', 'audit write failed', auditErr, { requestId: id, sellerId });

    // A rejection stops their withdrawals (058's payout gate), so they're told
    // why. The note is also on their Payouts tab next to the form.
    if (action === 'reject') {
      const { error: notifErr } = await ctx.db.from('notifications').insert({
        user_id: sellerId, actor_id: null, type: 'tax_details_rejected',
        body: `Your tax details need correcting before you can withdraw: ${note}`,
      });
      if (notifErr) logError('admin/dac7', 'notification insert failed', notifErr, { requestId: id, sellerId });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    return failure('admin/dac7', err, id, 'Could not update those tax details.');
  }
}
