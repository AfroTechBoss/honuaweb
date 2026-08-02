import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { enforce } from "@/lib/rate-limit";
import { logWarn } from "@/lib/observability";

// Pageview ingest.
//
// analytics_events has RLS on with no policies, so no browser can insert into
// it directly. Everything arrives here instead, which is what makes it possible
// to guarantee what the table contains: the path is normalised and the referrer
// is reduced to one of four words *before* the row is written, so URLs carrying
// handles, search terms, or recovery tokens can't accumulate in the database
// even if the client sends them.
//
// It is also the app's only unauthenticated write endpoint, hence the ceiling
// below.

export const runtime = 'nodejs';

const MAX_PATH = 120;

// Routes whose second segment is a handle, slug, or order id. Left alone,
// "Top pages" would be a list of individual profiles rather than a list of
// pages, so everything below the parent collapses to one entry.
const DYNAMIC = new Set(['profile', 'shop', 'marketplace', 'communities', 'post', 'orders', 'followers', 'following']);

const SEARCH_HOSTS = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|qwant|startpage|brave|search)\./;
const SOCIAL_HOSTS = /(^|\.)(facebook|instagram|twitter|x|t|linkedin|reddit|tiktok|youtube|youtu|pinterest|threads|whatsapp|telegram|mastodon|bsky|discord)\./;

function normalizePath(raw: string): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > 512) return null;

  // Parse against a throwaway origin so the query string and hash come off
  // structurally rather than by regex.
  let pathname: string;
  try { pathname = new URL(raw, 'http://local').pathname; } catch { return null; }

  const segs = pathname.split('/').filter(Boolean).map(s => s.toLowerCase());
  if (!segs.length) return '/';

  let out: string;
  if (segs[0] === 'communities' && segs[1] === 'post') out = '/communities/post/:id';
  else if (DYNAMIC.has(segs[0]) && segs.length > 1) out = `/${segs[0]}/:id`;
  else out = '/' + segs.slice(0, 2).join('/');

  // Anything that survived normalisation but still doesn't look like a route
  // is dropped rather than stored — a path is a low-value field to let arbitrary
  // text into, and the console renders it.
  if (!/^\/[a-z0-9/:_-]*$/.test(out) || out.length > MAX_PATH) return null;
  return out;
}

function classify(referrer: string, host: string | null): string {
  if (!referrer) return 'direct';
  let refHost: string;
  try { refHost = new URL(referrer).hostname.toLowerCase(); } catch { return 'direct'; }
  // The Host header carries the port, URL.hostname doesn't. Comparing them raw
  // means "localhost:3000" never equals "localhost", so on any origin with an
  // explicit port every internal link would be counted as a referral from
  // ourselves. Strip it — and the brackets IPv6 literals arrive in.
  const self = host?.toLowerCase().replace(/:\d+$/, '').replace(/^\[|\]$/g, '') ?? '';
  // Our own pages aren't an acquisition source — that's someone already here.
  if (self && (refHost === self || refHost === `www.${self}` || `www.${refHost}` === self)) return 'direct';
  // The regexes want a trailing dot to match a bare host like "x.com".
  const probe = refHost + '.';
  if (SEARCH_HOSTS.test(probe)) return 'search';
  if (SOCIAL_HOSTS.test(probe)) return 'social';
  return 'referral';
}

const ID = /^[a-z0-9]{8,64}$/i;

// The table only exists once migration 033 is applied. Without this flag a
// missing table would log once per pageview, which is the fastest way to make
// a log drain useless.
let warned = false;

export async function POST(req: NextRequest) {
  // Generous, because it counts real browsing: someone clicking through the
  // marketplace fires one of these per route change.
  const limited = enforce(req, { name: 'track', limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  let body: any;
  try { body = await req.json(); } catch { return new NextResponse(null, { status: 204 }); }

  const path = normalizePath(body?.path);
  const visitorId = typeof body?.visitorId === 'string' ? body.visitorId : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!path || !ID.test(visitorId) || !ID.test(sessionId)) {
    return new NextResponse(null, { status: 204 });
  }

  const db = getSupabaseAdmin();
  if (!db) return new NextResponse(null, { status: 204 });

  const source = classify(
    typeof body?.referrer === 'string' ? body.referrer.slice(0, 512) : '',
    req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
  );

  const { error } = await db.from('analytics_events').insert({ visitor_id: visitorId, session_id: sessionId, path, source });
  if (error && !warned) {
    warned = true;
    logWarn('api/track', 'pageview insert failed — analytics will read zero', {
      fix: 'apply supabase/migrations/033_admin_activity_and_analytics.sql',
      reason: error.message,
    });
  }

  // 204 either way. Nothing on the page reads this response, and a browser
  // console full of failed beacons is noise a visitor can do nothing about.
  return new NextResponse(null, { status: 204 });
}
