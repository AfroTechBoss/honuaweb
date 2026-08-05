// Client half of the admin console's numbers.
//
// Everything goes through /api/admin/metrics and /api/admin/activity, which
// verify the caller's Privy token before touching the database with the
// service-role key. Querying Supabase directly from the console doesn't work:
// an admin authenticated with Privy has no Supabase session, so `auth.uid()` is
// null and RLS matches nothing — which is why the overview's GMV tile was
// quietly reporting $0 against a label that said "from real orders".

export type Trend = number | null;

export type OverviewMetrics = {
  // False when the aggregation functions aren't there yet, so the console can
  // tell "no sales" apart from "the query never ran" — both arrive as 0.
  available: boolean;
  gmv: { total: number; series: number[]; trend: Trend };
  members: { total: number; series: number[]; trend: Trend };
  posts: number;
  pendingApplications: number;
  /** products.status = 'flagged', counted in SQL — the console holds no catalogue. */
  flaggedProducts: number;
  /** Distinct posts/comments/profiles/listings with an unanswered report (046). */
  openReports: number;
};

export type AnalyticsMetrics = {
  // False when the aggregation functions aren't there — see OverviewMetrics.
  available: boolean;
  // False until the first pageview is recorded. The difference between "no
  // traffic yet" and "a quiet week" matters, and a chart can't show it.
  collecting: boolean;
  pageViews: { value: number; trend: Trend };
  session: { seconds: number; trend: Trend };
  retention: { pct: number | null; base: number };
  conversion: { pct: number | null; trend: Trend; orders: number };
  traffic: number[];
  topPages: { path: string; views: number; pct: number }[];
  sources: { source: string; sessions: number; pct: number }[];
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  kind: string;
  at: string;
};

// One distinct failure, with the newest occurrence as the sample. Grouped in
// Postgres by a fingerprint the writer computes — see lib/error-sink.ts — so
// one bug is one row here however many times it fired.
export type ErrorGroup = {
  fingerprint: string;
  scope: string;
  message: string;
  errorMessage: string | null;
  stack: string | null;
  requestId: string | null;
  path: string | null;
  occurrences: number;
  unseen: number;
  firstSeen: string;
  lastSeen: string;
};

export type ErrorFeed = {
  // False when migration 034 hasn't been applied. An empty list means "nothing
  // has failed", which is a much stronger claim than "we couldn't ask".
  available: boolean;
  groups: ErrorGroup[];
  unseen: number;
};

async function call(token: string | null, url: string, method = 'GET', body?: any): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: 'Your admin session has expired — sign in again' };
  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { error: payload?.error ?? `Request failed (${res.status})` };
    return { data: payload };
  } catch {
    return { error: 'Could not reach the server' };
  }
}

export async function fetchOverviewMetrics(token: string | null): Promise<{ metrics?: OverviewMetrics; error?: string }> {
  const { data, error } = await call(token, '/api/admin/metrics?scope=overview');
  if (error) return { error };
  return { metrics: data as OverviewMetrics };
}

export async function fetchAnalyticsMetrics(token: string | null): Promise<{ metrics?: AnalyticsMetrics; error?: string }> {
  const { data, error } = await call(token, '/api/admin/metrics?scope=analytics');
  if (error) return { error };
  return { metrics: data?.analytics as AnalyticsMetrics };
}

export async function fetchActivity(token: string | null, limit = 50): Promise<{ entries?: AuditEntry[]; error?: string }> {
  const { data, error } = await call(token, `/api/admin/activity?limit=${limit}`);
  if (error) return { error };
  // The route can return entries *and* a soft error (the table isn't there
  // yet), so hand both back and let the caller decide what to show.
  return { entries: (data?.entries ?? []) as AuditEntry[], error: data?.error };
}

export async function recordActivity(
  token: string | null,
  entry: { action: string; target?: string; kind?: string; actorLabel?: string },
): Promise<{ id?: string; at?: string; error?: string }> {
  const { data, error } = await call(token, '/api/admin/activity', 'POST', entry);
  if (error) return { error };
  return { id: data?.id, at: data?.at, error: data?.error };
}

export async function fetchErrors(token: string | null, days = 7): Promise<{ feed?: ErrorFeed; error?: string }> {
  const { data, error } = await call(token, `/api/admin/errors?days=${days}&limit=50`);
  if (error) return { error };
  return { feed: { available: !!data?.available, groups: data?.groups ?? [], unseen: data?.unseen ?? 0 } };
}

export type ErrorOccurrence = {
  id: string;
  scope: string;
  message: string;
  errorMessage: string | null;
  stack: string | null;
  requestId: string | null;
  path: string | null;
  at: string;
};

/** The occurrences behind one request id — the code failure() hands the user. */
export async function lookupError(token: string | null, requestId: string): Promise<{ occurrences: ErrorOccurrence[]; error?: string }> {
  const { data, error } = await call(token, `/api/admin/errors?requestId=${encodeURIComponent(requestId)}`);
  if (error) return { occurrences: [], error };
  return { occurrences: data?.occurrences ?? [] };
}

/** Mark one group seen, or everything. Clears the rail badge. */
export async function markErrorsSeen(token: string | null, fingerprint?: string): Promise<{ error?: string }> {
  const { error } = await call(token, '/api/admin/errors', 'PATCH',
    fingerprint ? { fingerprint } : { all: true });
  return { error };
}

/** "2m ago" / "3h ago" / "4d ago" — the format AuditLine already renders. */
export function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d ago`;
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** 278 → "4m 38s". Seconds alone below a minute, because "0m 41s" reads oddly. */
export function duration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  if (whole < 60) return `${whole}s`;
  return `${Math.floor(whole / 60)}m ${whole % 60}s`;
}

// The routes people recognise, named the way they're named in the product.
// Anything unmapped falls back to the path itself rather than a guess.
const PAGE_LABELS: Record<string, string> = {
  '/': 'Home feed',
  '/explore': 'Explore',
  '/marketplace': 'Marketplace',
  '/marketplace/:id': 'Product page',
  '/communities': 'Communities',
  '/communities/:id': 'Community page',
  '/communities/post/:id': 'Community post',
  '/profile': 'Your profile',
  '/profile/:id': 'Member profile',
  '/shop/:id': 'Seller shop',
  '/post/:id': 'Post detail',
  '/challenges': 'Challenges',
  '/impact': 'Impact',
  '/carbon': 'Carbon market',
  '/map': 'Map',
  '/messages': 'Messages',
  '/notifications': 'Notifications',
  '/search': 'Search',
  '/settings': 'Settings',
  '/checkout': 'Checkout',
  '/orders': 'Orders',
  '/orders/:id': 'Order detail',
  '/login': 'Sign in',
  '/sell': 'Sell',
  '/seller': 'Seller dashboard',
  '/bookmarks': 'Bookmarks',
};

export const pageLabel = (path: string) => PAGE_LABELS[path] ?? path;

export const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  direct: { label: 'Direct', color: 'var(--green)' },
  search: { label: 'Search', color: 'var(--sky)' },
  social: { label: 'Social', color: 'var(--sun)' },
  referral: { label: 'Referral', color: 'var(--clay)' },
};
