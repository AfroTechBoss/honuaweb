import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyPrivyToken } from "@/lib/privy-verify";
import { enforce } from "@/lib/rate-limit";
import { logWarn, requestId, failure } from "@/lib/observability";

// Who is signed into the console, in Honua terms.
//
// The admin panel knows one thing about the person using it: the email address
// they signed into Privy with. That is enough to render "chidile@…" in the
// sidebar and nothing else — which is why the account chip has always shown a
// green circle with a letter in it instead of a face.
//
// Resolving the address to a profile has to happen here, on the server, for a
// reason that isn't laziness: profiles has no email column. Addresses live in
// auth.users, which PostgREST does not expose to any key, so there is no query
// the browser could make even with a Supabase session — and the console doesn't
// have one.
//
// POST, not GET, so the address stays out of the URL and therefore out of
// access logs and referrers. It's a read; the method is about where the
// argument goes.
//
// A verified Privy token is required, and any allowlisted admin can look up any
// address. That grants nothing new: /api/admin/verification already returns
// every account's email alongside its profile.

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limited = enforce(req, { name: 'admin-profile', limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const admin = await verifyPrivyToken(token);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 });

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    if (!email || !email.includes('@')) return NextResponse.json({ profile: null });

    const { data, error } = await db.rpc('admin_profile_by_email', { addr: email });

    if (error) {
      // No such function means 039 hasn't been applied. The console falls back
      // to the initial-letter avatar it has always drawn, which is a cosmetic
      // loss — not worth failing the request over, but worth naming the fix.
      logWarn('admin/profile', 'admin_profile_by_email unavailable', {
        fix: 'apply supabase/migrations/039_order_admin.sql', requestId: id, reason: error.message,
      });
      return NextResponse.json({ profile: null, available: false });
    }

    // No match is the ordinary case, not an error: an admin allowlisted in
    // Privy needn't have signed up to Honua with the same address, or at all.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return NextResponse.json({ profile: null });

    return NextResponse.json({
      profile: {
        id: row.id,
        handle: row.handle ?? null,
        name: row.full_name ?? null,
        avatarUrl: row.avatar_url ?? null,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/profile', err, id, 'Could not look that account up.');
  }
}
