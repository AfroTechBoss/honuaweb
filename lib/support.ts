// Client half of the support form. Ships in the public bundle — the admin
// counterpart lives in lib/admin-support.ts and must stay out of here.
//
// The categories are exported rather than inlined in the page because the
// server validates against this same list. A category the API rejects is a
// dropdown option that silently loses someone's message, so there is exactly
// one place it can be edited.

export const SUPPORT_CATEGORIES = [
  'Order issue',
  'Payment problem',
  'Return or refund',
  'Product not as described',
  'Delivery delay',
  'Account question',
  'Other',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

// /report's own list. A separate constant rather than an extension of the one
// above because these two forms are answered by different people: the ones
// below go to Trust & Safety and several of them are allegations about a
// seller, not questions about an order.
export const REPORT_CATEGORIES = [
  'Item not as described',
  'Item not received',
  'Damaged on arrival',
  'Wrong item sent',
  'Counterfeit product',
  'Seller not responding',
  'Payment problem',
  'Suspected fraud',
  'Other',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_SEVERITIES = ['low', 'medium', 'high'] as const;
export type ReportSeverity = (typeof REPORT_SEVERITIES)[number];

export type TicketKind = 'support' | 'report';

// Mirrors the column widths in migration 037's validation on the route. Kept
// here so the textarea can show a count before the request is made rather than
// after it is refused.
export const SUPPORT_LIMITS = { subject: 200, message: 5000, orderRef: 64, email: 254 };

export type SubmitFields = {
  email: string;
  category: string;
  subject: string;
  message: string;
  orderRef?: string;
  // Defaults to 'support' on the server. /report passes 'report', which is what
  // routes it to the Safety queue in the console and makes severity meaningful.
  kind?: TicketKind;
  severity?: ReportSeverity;
};

/**
 * Files a support ticket.
 *
 * `token` is the submitter's Supabase access token when they have one, so the
 * ticket can be tied to their account. It is optional by design: /support is a
 * public route because the people most likely to need it are the ones who
 * cannot sign in.
 *
 * Returns the ticket reference on success, or the reason it failed. Never
 * throws — a form that reports success on a network error is the bug this
 * whole path exists to fix.
 */
export async function submitSupportTicket(
  fields: SubmitFields,
  token?: string | null,
): Promise<{ ref?: string; error?: string }> {
  try {
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(fields),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { error: payload?.error ?? `Couldn't send this (${res.status})` };
    return { ref: payload?.ref };
  } catch {
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }
}
