import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyPrivyToken } from "@/lib/privy-verify";
import { CREDIT_TAGS } from "@/lib/admin-carbon";
import { enforce } from "@/lib/rate-limit";
import { gateRole, type Permission } from "@/lib/admin-role";

// Admin CRUD for the carbon market's listings.
//
// This lives on the server because the admin console authenticates with Privy,
// so an admin's browser has no Supabase session and the "admins manage credits"
// RLS policy (migration 016) can never match them. The service-role client
// bypasses RLS, so every handler below is gated on a verified Privy token first.
//
// The same reason makes this the only place that can read the retirement
// history: `carbon_purchases` is readable only by its own buyer under RLS.

export const runtime = 'nodejs';

async function authed(req: NextRequest, permission: Permission): Promise<{ db: any; fail: NextResponse | null }> {
  // Before the token check: verifyPrivyToken is a network round trip, so an
  // unauthenticated flood costs money and latency even though it all 401s.
  const limited = enforce(req, { name: 'admin-carbon', limit: 60, windowMs: 60_000 });
  if (limited) return { db: null, fail: limited };

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const admin = await verifyPrivyToken(token);
  if (!admin) return { db: null, fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const db = getSupabaseAdmin();
  if (!db) return { db: null, fail: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 }) };

  // GET is gated the same as the writes, which is stricter than it looks. The
  // read is not just the catalog — it joins carbon_purchases, which RLS
  // otherwise shows only to the buyer. The Roles page draws one "Carbon catalog"
  // row; gating every verb on it is what makes that row true.
  const denied = await gateRole(db, admin.userId, permission);
  if (denied) return { db: null, fail: denied };

  return { db, fail: null };
}

const str = (v: any) => typeof v === 'string' ? v.trim() : '';

// Returns the columns present in `body`, coerced and validated. `require` makes
// the fields a listing can't exist without mandatory (create); without it an
// absent key means "leave this column alone" (patch).
function fields(body: any, { require: required }: { require: boolean }): { values?: any; error?: string } {
  const out: any = {};

  if (required || 'name' in body) {
    const name = str(body.name);
    if (!name) return { error: 'Name is required' };
    out.name = name;
  }
  if (required || 'price_cents' in body) {
    const price = Number(body.price_cents);
    if (!Number.isFinite(price) || !Number.isInteger(price) || price <= 0) {
      return { error: 'Price must be a whole number of cents above zero' };
    }
    out.price_cents = price;
  }
  if (required || 'volume_t' in body) {
    const volume = Number(body.volume_t);
    if (!Number.isFinite(volume) || volume < 0) return { error: 'Available volume must be zero or more' };
    out.volume_t = volume;
  }
  if (required || 'tag' in body) {
    const tag = str(body.tag) || 'Verified';
    if (!CREDIT_TAGS.includes(tag)) return { error: `Tag must be one of ${CREDIT_TAGS.join(', ')}` };
    out.tag = tag;
  }
  for (const col of ['region', 'type', 'verifier', 'vintage']) {
    if (required || col in body) out[col] = str(body[col]) || null;
  }
  if ('active' in body) out.active = !!body.active;

  return { values: out };
}

// GET — every listing, active or not, each with what has actually been retired
// against it. Admins need the hidden and sold-out ones too; the public market
// query deliberately filters them out.
export async function GET(req: NextRequest) {
  const { db, fail } = await authed(req, 'carbon.manage');
  if (fail) return fail;

  const [{ data: credits, error }, { data: purchases }] = await Promise.all([
    db.from('carbon_credits').select('*').order('created_at', { ascending: true }),
    db.from('carbon_purchases').select('credit_id, tonnes, total_cents'),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const retired = new Map<string, { tonnes: number; cents: number; orders: number }>();
  for (const p of purchases ?? []) {
    if (!p.credit_id) continue; // pre-registry purchase — no listing to attribute it to
    const row = retired.get(p.credit_id) ?? { tonnes: 0, cents: 0, orders: 0 };
    row.tonnes += Number(p.tonnes ?? 0);
    row.cents += Number(p.total_cents ?? 0);
    row.orders += 1;
    retired.set(p.credit_id, row);
  }

  return NextResponse.json({
    credits: (credits ?? []).map((c: any) => {
      const r = retired.get(c.id);
      return {
        ...c,
        volume_t: Number(c.volume_t ?? 0),
        retired_t: r?.tonnes ?? 0,
        revenue_cents: r?.cents ?? 0,
        orders: r?.orders ?? 0,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const { db, fail } = await authed(req, 'carbon.manage');
  if (fail) return fail;

  const body = await req.json().catch(() => ({}));
  const { values, error } = fields(body, { require: true });
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { data, error: dbError } = await db
    .from('carbon_credits')
    .insert({ ...values, active: values.active ?? true })
    .select()
    .single();
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ credit: data });
}

export async function PATCH(req: NextRequest) {
  const { db, fail } = await authed(req, 'carbon.manage');
  if (fail) return fail;

  const body = await req.json().catch(() => ({}));
  const id = str(body?.id);
  if (!id) return NextResponse.json({ error: 'Missing credit id' }, { status: 400 });

  const { values, error } = fields(body, { require: false });
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!Object.keys(values).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { data, error: dbError } = await db
    .from('carbon_credits')
    .update(values)
    .eq('id', id)
    .select()
    .single();
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ credit: data });
}

// DELETE — only for listings nobody has retired against. Once a purchase exists
// the row is part of a retirement record, and dropping it would null out the
// link the certificate depends on. Deactivating takes it off the market instead.
export async function DELETE(req: NextRequest) {
  const { db, fail } = await authed(req, 'carbon.manage');
  if (fail) return fail;

  const body = await req.json().catch(() => ({}));
  const id = str(body?.id);
  if (!id) return NextResponse.json({ error: 'Missing credit id' }, { status: 400 });

  const { count } = await db
    .from('carbon_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('credit_id', id);
  if ((count ?? 0) > 0) {
    return NextResponse.json({
      error: `${count} retirement${count === 1 ? '' : 's'} reference this credit. Hide it instead of deleting it.`,
    }, { status: 409 });
  }

  const { error } = await db.from('carbon_credits').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
