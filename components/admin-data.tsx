"use client";
import React from "react";
import { Icon } from "./icons";
import { S_STATUS, sTint } from "./seller-data";

// =====================================================================
// Admin console — shared mock data, extra status tokens, helpers
// =====================================================================

// Extend the shared status meta with moderation / account states
Object.assign(S_STATUS, {
  live:        { label: 'Live',       color: 'var(--green)' },
  flagged:     { label: 'Flagged',    color: 'var(--clay)' },
  removed:     { label: 'Removed',    color: 'var(--ink-3)' },
  open:        { label: 'Open',       color: 'var(--sun)'  },
  resolved:    { label: 'Resolved',   color: 'var(--green)' },
  closed:      { label: 'Closed',     color: 'var(--ink-3)' },
  // Support tickets waiting on the sender. A separate key from the existing
  // 'pending' because that one is already the seller/payout token and means
  // "waiting on us" — reusing it would flip the meaning of every badge in the
  // payouts and verification tables.
  'awaiting-reply': { label: 'Waiting on them', color: 'var(--sky)' },
  // Payment state, which is a different axis from fulfilment state — an order
  // can be 'shipped' and 'refunded' at the same time, and both badges have to
  // be able to sit on the same row without one overwriting the other's meaning.
  paid:        { label: 'Paid',       color: 'var(--green)' },
  unpaid:      { label: 'Unpaid',     color: 'var(--ink-3)' },
  failed:      { label: 'Payment failed', color: 'var(--clay)' },
  refunded:    { label: 'Refunded',   color: 'var(--sky)'  },
  dismissed:   { label: 'Dismissed',  color: 'var(--ink-3)' },
  escalated:   { label: 'Escalated',  color: 'var(--clay)' },
  suspended:   { label: 'Suspended',  color: 'var(--sun)'  },
  banned:      { label: 'Banned',     color: 'var(--clay)' },
  active:      { label: 'Active',     color: 'var(--green)' },
  revoked:     { label: 'Revoked',    color: 'var(--ink-3)' },
});

// Account-role chip colours
export const ADMIN_ROLES = {
  Admin:     'var(--clay)',
  Moderator: 'var(--sky)',
  Seller:    'var(--green)',
  Member:    'var(--ink-3)',
};

export function RoleChip({ role }) {
  const c = ADMIN_ROLES[role] || 'var(--ink-3)';
  return <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono', color: c, background: sTint(c), padding: '2px 8px', borderRadius: 6 }}>{role}</span>;
};

export const REPORT_REASONS = ['Spam', 'Harassment or bullying', 'Hateful content', 'Misinformation', 'Malicious content', 'Inappropriate content', 'Copyright violation', 'Other'];
