import { OPEN_PLATFORM, shapeSettings, publicPart, type PublicPlatform, type PlatformSettings } from "@/lib/platform";

// Reads platform_settings for the two callers that are not the admin console:
// the middleware, on every navigation, and the support intake route.
//
// Plain fetch against PostgREST rather than supabase-js on purpose. The
// middleware runs on the Edge runtime, where pulling in the full client (and
// realtime with it) is both unnecessary and a bundle it does not need — this is
// one POST to one RPC.
//
// Three properties this has to hold, in order of how badly each one bites:
//
//  1. It fails open. Every error path returns OPEN_PLATFORM. A settings read
//     that times out must not put the site into maintenance mode, which is the
//     one failure here that would look exactly like a real outage while being
//     entirely self-inflicted.
//
//  2. It is capped in time. 1.5s, aborted. This sits in front of every page
//     navigation; a slow database is allowed to make the site slow, not to make
//     it unreachable.
//
//  3. It is cached. 15 seconds, per isolate. Long enough that a normal browse
//     is not one extra round trip per click, short enough that flipping
//     maintenance mode on in the console takes effect while the person who
//     flipped it is still looking at the screen. The TTL is the whole
//     invalidation story — the console's save runs in a different runtime from
//     the middleware, so there is no cache to reach across and clear, and a
//     function that pretended otherwise would be worse than the wait.

const TTL_MS = 15_000;
const TIMEOUT_MS = 1_500;

let cache: { at: number; value: PublicPlatform } | null = null;

async function rpc(name: string): Promise<any | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
      signal: abort.signal,
    });
    if (!res.ok) return null;
    const body = await res.json();
    return Array.isArray(body) ? body[0] ?? null : body;
  } catch {
    // Includes the abort. Deliberately silent: this runs on every navigation,
    // and a database that is down would otherwise write a log line per request.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The public half, cached. Never throws; never returns a locked platform on error. */
export async function readPlatform(): Promise<PublicPlatform> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const row = await rpc('admin_settings_get');
  // A null row means the settings could not be read *or* migration 044 has not
  // been applied. Both answer the same way, and the same way as an outage:
  // everything stays open.
  const value = row ? publicPart(shapeSettings(row)) : OPEN_PLATFORM;

  cache = { at: Date.now(), value };
  return value;
}

/**
 * The full row, uncached, for server code that needs the fields a visitor never
 * sees — currently only the support route's alert address. Returns null when
 * the settings cannot be read, so the caller can tell "alerts are off" from
 * "we could not find out", which are different things when the consequence is
 * a safety report nobody is told about.
 */
export async function readPlatformFull(): Promise<PlatformSettings | null> {
  const row = await rpc('admin_settings_get');
  return row ? shapeSettings(row) : null;
}
