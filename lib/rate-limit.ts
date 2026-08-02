import { NextResponse } from "next/server";

// Fixed-window request counter, held in process memory.
//
// Be clear about what this is and isn't. On Vercel every serverless instance
// keeps its own Map, so the true ceiling is (limit × live instances) and a cold
// start wipes the counters. That makes it near-useless against a distributed
// flood — and entirely adequate against the thing that actually happens to an
// app this size: one script, one IP, hammering one endpoint until something
// gives. It costs nothing, needs no account, and adds no network hop.
//
// The network-layer version is Vercel's firewall (Project → Firewall → rate
// limit rules), which sees every instance at once and rejects before a function
// ever boots. Worth turning on. This is the floor underneath it, not a
// replacement, and it keeps working in local dev where the firewall doesn't
// exist.
//
// When there is a Redis to point at, swap the body of `hit()` for an atomic
// INCR + EXPIRE. Nothing outside this file needs to change.

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

// A limiter that leaks memory is worse than no limiter, so the map is bounded.
// Above this many live windows, expired entries are swept; if that isn't enough
// the oldest are dropped. Dropping a window is a fail-open — the caller gets a
// fresh allowance — which is the right way to fail for an abuse control that
// sits in front of legitimate traffic.
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  for (const [k, w] of buckets) if (w.resetAt <= now) buckets.delete(k);
  if (buckets.size <= MAX_BUCKETS) return;
  const overflow = buckets.size - MAX_BUCKETS;
  let i = 0;
  for (const k of buckets.keys()) {
    if (i++ >= overflow) break;
    buckets.delete(k);
  }
}

// Behind Vercel the client address is the first entry in x-forwarded-for; the
// rest of the chain is proxies. Take only that one — trusting the last entry
// lets a caller prepend a fake address and get a fresh bucket per request.
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export type LimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

export type LimitOptions = {
  /** Distinguishes one endpoint's budget from another's. */
  name: string;
  limit: number;
  windowMs: number;
  /**
   * What is being counted. Defaults to the caller's IP; pass a user id where
   * one is known, so a signed-in user behind a shared NAT isn't throttled by
   * their neighbours.
   */
  subject?: string;
};

export function rateLimit(req: Request, opts: LimitOptions): LimitResult {
  const { name, limit, windowMs } = opts;
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) sweep(now);

  const key = `${name}:${opts.subject || clientIp(req)}`;
  const existing = buckets.get(key);
  const window = existing && existing.resetAt > now
    ? existing
    : { count: 0, resetAt: now + windowMs };

  window.count++;
  buckets.set(key, window);

  return {
    ok: window.count <= limit,
    limit,
    remaining: Math.max(0, limit - window.count),
    resetAt: window.resetAt,
    retryAfter: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
  };
}

// The 429 itself. Retry-After is the one header clients actually honour; the
// RateLimit-* trio is the draft standard and costs nothing to send.
export function tooMany(result: LimitResult, message = "Too many requests — slow down.") {
  return NextResponse.json({ error: message }, {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfter),
      "RateLimit-Limit": String(result.limit),
      "RateLimit-Remaining": "0",
      "RateLimit-Reset": String(result.retryAfter),
      "Cache-Control": "no-store",
    },
  });
}

/**
 * The common shape: check, and get back a ready-made 429 if the caller is over.
 *
 *   const limited = enforce(req, { name: 'og', limit: 30, windowMs: 60_000 });
 *   if (limited) return limited;
 */
export function enforce(req: Request, opts: LimitOptions, message?: string) {
  const result = rateLimit(req, opts);
  return result.ok ? null : tooMany(result, message);
}
