// Client half of the support queue. Every call goes through /api/admin/support,
// which verifies the caller's Privy token before touching the table with the
// service-role key — the admin console has no Supabase session, so it cannot
// read support_tickets directly under any circumstances.
//
// Errors come back as text rather than a boolean, same as lib/admin-carbon.ts:
// a queue that silently fails to load looks exactly like a queue with nothing
// in it, which is the worst possible thing for this particular screen to say.

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketKind = 'support' | 'report';

export const TICKET_STATUSES: TicketStatus[] = ['open', 'pending', 'resolved', 'closed'];

export type SupportTicket = {
  id: string;
  ref: string;
  kind: TicketKind;
  status: TicketStatus;
  category: string;
  subject: string;
  message: string;
  email: string;
  orderRef: string | null;
  userId: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  adminNote: string | null;
  handledBy: string | null;
  resolvedAt: string | null;
  seen: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TicketCounts = {
  total: number; open: number; pending: number; resolved: number;
  closed: number; unseen: number; last24h: number;
};

/**
 * Counts keyed by kind, plus an `all` rollup, as returned by
 * admin_support_counts() (migration 038).
 *
 * Both queues arrive in one response because the console shows them as tabs
 * with their counts on the tab — fetching per tab would mean the number you use
 * to decide whether to switch is the one you can't see until you have.
 */
export type TicketCountsByKind = Record<'all' | TicketKind, TicketCounts>;

export const EMPTY_TICKET_COUNTS: TicketCounts = {
  total: 0, open: 0, pending: 0, resolved: 0, closed: 0, unseen: 0, last24h: 0,
};

export const EMPTY_COUNTS_BY_KIND = (): TicketCountsByKind => ({
  all: { ...EMPTY_TICKET_COUNTS },
  support: { ...EMPTY_TICKET_COUNTS },
  report: { ...EMPTY_TICKET_COUNTS },
});

const ENDPOINT = '/api/admin/support';

async function call(token: string | null, method: string, body?: any, query = ''): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: 'Your admin session has expired — sign in again' };
  try {
    const res = await fetch(ENDPOINT + query, {
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

export async function listTickets(
  token: string | null,
  opts: { status?: string; kind?: string; limit?: number } = {},
): Promise<{
  tickets?: SupportTicket[]; counts?: TicketCountsByKind;
  available?: boolean; countsAvailable?: boolean; error?: string;
}> {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.kind && opts.kind !== 'all') params.set('kind', opts.kind);
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  const { data, error } = await call(token, 'GET', undefined, q ? `?${q}` : '');
  if (error) return { error };
  return {
    tickets: (data?.tickets ?? []) as SupportTicket[],
    counts: (data?.counts ?? EMPTY_COUNTS_BY_KIND()) as TicketCountsByKind,
    available: data?.available !== false,
    countsAvailable: data?.countsAvailable !== false,
  };
}

/**
 * Moves a ticket, annotates it, or marks it read.
 *
 * Every field is optional so the same call serves "mark seen" (which happens on
 * open, silently) and "resolve with a note" (which is a decision). The server
 * stamps handled_by and resolved_at; passing them from here would let the
 * console claim someone else did the work.
 */
export async function updateTicket(
  token: string | null,
  id: string,
  patch: { status?: TicketStatus; adminNote?: string; seen?: boolean },
): Promise<{ ticket?: SupportTicket; error?: string }> {
  const { data, error } = await call(token, 'PATCH', { id, ...patch });
  return error ? { error } : { ticket: data?.ticket as SupportTicket };
}
