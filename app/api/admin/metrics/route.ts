import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyPrivyToken } from "@/lib/privy-verify";
import { enforce } from "@/lib/rate-limit";
import { gateRole, type Permission } from "@/lib/admin-role";
import { logWarn, requestId, failure } from "@/lib/observability";

// Every number on the admin overview and analytics pages.
//
// This has to be a server route for the same reason the carbon and verification
// routes are: the console authenticates with Privy, so an admin's browser has
// no Supabase session and `auth.uid()` is null inside every policy. The
// overview's own "GMV · 30d" tile demonstrated it — it queried `orders` from
// the browser, matched the "users see own orders" policy against a null uid,
// got zero rows back, and displayed the resulting $0 under the label "from
// real orders".
//
// The aggregation itself is in Postgres (migration 033). Summing thirty days
// of orders by fetching every order row and adding them up in JavaScript is
// the same mistake migration 032 removed from the verification queue.

export const runtime = 'nodejs';

async function authed(req: NextRequest, permission: Permission | null): Promise<{ db: any; fail: NextResponse | null }> {
  // Ahead of the token check: verifyPrivyToken is a network round trip, so an
  // unauthenticated flood costs money and latency even when it all 401s.
  const limited = enforce(req, { name: 'admin-metrics', limit: 60, windowMs: 60_000 });
  if (limited) return { db: null, fail: limited };

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const admin = await verifyPrivyToken(token);
  if (!admin) return { db: null, fail: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const db = getSupabaseAdmin();
  if (!db) return { db: null, fail: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 }) };

  // `null` is a deliberate choice, not a missing gate — see the call site.
  if (permission) {
    const denied = await gateRole(db, admin.userId, permission);
    if (denied) return { db: null, fail: denied };
  }

  return { db, fail: null };
}

// Every RPC here arrived in migration 033. On a database that hasn't had it
// applied the call fails, and the honest answer is "no data" — an empty series
// the console renders as a dash. Substituting a plausible-looking number is
// exactly what this whole change is undoing.
async function series(db: any, fn: string, args: Record<string, unknown>, missing: { flagged: boolean }): Promise<any[]> {
  const { data, error } = await db.rpc(fn, args);
  if (!error && Array.isArray(data)) return data;
  if (!missing.flagged) {
    missing.flagged = true;
    logWarn('admin/metrics', `${fn} unavailable — the console will show no data`, {
      fix: 'apply supabase/migrations/033_admin_activity_and_analytics.sql',
      reason: error?.message,
    });
  }
  return [];
}

// Percentage change between two windows, rounded. Growth from nothing has no
// meaningful percentage — 0 → 5 is not "500% up", it's the first five — so that
// case returns null and the caller omits the arrow rather than inventing one.
function trend(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function split<T>(rows: T[]): { previous: T[]; current: T[] } {
  const half = Math.floor(rows.length / 2);
  return { previous: rows.slice(0, half), current: rows.slice(half) };
}

const sum = (nums: number[]) => nums.reduce((total, n) => total + n, 0);

async function overview(db: any) {
  const missing = { flagged: false };
  // The two head-only counts come through here rather than from the browser
  // for the same reason as everything else: seller_applications is admin-only
  // under RLS, and an admin's browser can't satisfy that policy.
  const [gmvRows, memberRows, posts, applications, flaggedProducts] = await Promise.all([
    series(db, 'admin_gmv_series', { days: 30 }, missing),
    series(db, 'admin_member_series', { days: 30 }, missing),
    db.from('posts').select('*', { count: 'exact', head: true }),
    db.from('seller_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    // Same reason again, plus one of its own: the products select policy hides
    // anything not live, so a browser asking this question would be told there
    // are no flagged listings by the very policy that flagging applies.
    db.from('products').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
  ]);

  // Content reports (migration 046). Deliberately outside the Promise.all
  // above and outside `missing`: this one arrived later than the rest, so a
  // database without 046 should show a zero here and keep every other number
  // on the page rather than marking the whole overview unavailable.
  //
  // The figure is distinct *targets*, not rows — five people reporting one
  // post is one thing for a moderator to decide, and the badge counts
  // decisions waiting.
  let openReports = 0;
  const { data: reportCounts, error: reportErr } = await db.rpc('admin_content_report_counts');
  if (reportErr) {
    logWarn('admin/metrics', 'content report counts unavailable — the badge will read 0', {
      fix: 'apply supabase/migrations/046_content_reports.sql',
      reason: reportErr.message,
    });
  } else {
    const c = Array.isArray(reportCounts) ? reportCounts[0] : reportCounts;
    openReports = Number(c?.open_targets ?? 0);
  }

  const gmv = split(gmvRows.map((r: any) => Number(r.cents ?? 0) / 100));
  const members = split(memberRows.map((r: any) => Number(r.total ?? 0)));

  return {
    // A failed aggregation and a genuinely empty one both produce zeros, and the
    // console must not present the first as the second — "$0 in sales" is a
    // claim, and one we can't make when the query never ran.
    available: !missing.flagged,
    gmv: {
      total: sum(gmv.current),
      series: gmv.current,
      trend: trend(sum(gmv.current), sum(gmv.previous)),
    },
    members: {
      // The last point of a cumulative series is the headcount today; the
      // trend compares new arrivals in the two windows, not the totals, which
      // would flatten to nearly 0% on any established platform.
      total: members.current.length ? members.current[members.current.length - 1] : 0,
      series: members.current,
      trend: trend(
        (members.current[members.current.length - 1] ?? 0) - (members.current[0] ?? 0),
        (members.previous[members.previous.length - 1] ?? 0) - (members.previous[0] ?? 0),
      ),
    },
    posts: posts.count ?? 0,
    pendingApplications: applications.count ?? 0,
    flaggedProducts: flaggedProducts.count ?? 0,
    openReports,
  };
}

async function analytics(db: any) {
  const missing = { flagged: false };
  const [summaryRows, trafficRows, pageRows, sourceRows] = await Promise.all([
    series(db, 'admin_analytics_summary', { short_days: 7, long_days: 30 }, missing),
    series(db, 'admin_traffic_series', { days: 30 }, missing),
    series(db, 'admin_top_pages', { days: 30, lim: 6 }, missing),
    series(db, 'admin_acquisition_sources', { days: 30 }, missing),
  ]);

  const s = summaryRows[0] ?? {};
  const n = (v: any) => Number(v ?? 0);

  const views = n(s.views), prevViews = n(s.prev_views);
  const sessions = n(s.sessions), prevSessions = n(s.prev_sessions);
  const avgSeconds = n(s.avg_seconds), prevAvgSeconds = n(s.prev_avg_seconds);
  const orders = n(s.orders_paid), prevOrders = n(s.prev_orders_paid);
  const retained = n(s.retained), retentionBase = n(s.retention_base);

  // Conversion is a rate, so its trend has to compare the two rates. Comparing
  // order counts would show growth on a week that sold more only because it had
  // far more traffic.
  //
  // The `orders <= sessions` guard isn't defensive rounding — every paid order
  // needs at least one session to have happened in, so more orders than sessions
  // proves the session count is missing some. That's the normal state for a
  // while after switching tracking on, when the orders table already has history
  // and analytics_events doesn't. Reporting "200% conversion" through it would
  // be worse than reporting nothing.
  const rate = (o: number, s: number) => (s && o <= s) ? (o / s) * 100 : null;
  const conversion = rate(orders, sessions);
  const prevConversion = rate(prevOrders, prevSessions);

  const traffic = split(trafficRows.map((r: any) => n(r.views))).current;
  const totalPageViews = sum(pageRows.map((r: any) => n(r.views)));
  const totalSessions = sum(sourceRows.map((r: any) => n(r.sessions)));

  return {
    // Two different nothings, and the console tells them apart: `available` is
    // false when the aggregation functions don't exist, `collecting` is false
    // when they do and have counted nothing. Only the second is a fact about
    // the platform.
    available: !missing.flagged,
    collecting: n(s.total_events) > 0,
    pageViews: { value: views, trend: trend(views, prevViews) },
    session: { seconds: avgSeconds, trend: trend(avgSeconds, prevAvgSeconds) },
    retention: {
      // Null, not zero: with nobody here 30 days ago there is no cohort to
      // have retained, and 0% would read as "everyone left".
      pct: retentionBase ? Math.round((retained / retentionBase) * 100) : null,
      base: retentionBase,
    },
    conversion: {
      pct: conversion,
      trend: conversion != null && prevConversion ? Math.round(conversion - prevConversion) : null,
      orders,
    },
    traffic,
    topPages: pageRows.map((r: any) => ({
      path: r.path,
      views: n(r.views),
      pct: totalPageViews ? Math.round((n(r.views) / totalPageViews) * 100) : 0,
    })),
    sources: sourceRows.map((r: any) => ({
      source: r.source,
      sessions: n(r.sessions),
      pct: totalSessions ? Math.round((n(r.sessions) / totalSessions) * 100) : 0,
    })),
  };
}

export async function GET(req: NextRequest) {
  // One route, two audiences. `?scope=analytics` is the Analytics page and
  // wants analytics.view; the default scope is the counters on the console's
  // landing page, which every role sees the moment they sign in. Gating that
  // would greet a moderator with a permission error on the first screen and
  // tell them nothing useful, so the overview stays open to any verified admin.
  const scope = req.nextUrl.searchParams.get('scope');
  const { db, fail } = await authed(req, scope === 'analytics' ? 'analytics.view' : null);
  if (fail) return fail;

  const id = requestId(req);
  try {
    const data = scope === 'analytics' ? { analytics: await analytics(db) } : await overview(db);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/metrics', err, id, 'Could not load metrics.');
  }
}
