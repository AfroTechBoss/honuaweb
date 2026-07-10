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
  dismissed:   { label: 'Dismissed',  color: 'var(--ink-3)' },
  escalated:   { label: 'Escalated',  color: 'var(--clay)' },
  suspended:   { label: 'Suspended',  color: 'var(--sun)'  },
  banned:      { label: 'Banned',     color: 'var(--clay)' },
  active:      { label: 'Active',     color: 'var(--green)' },
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
  return <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'Geist Mono', color: c, background: sTint(c), padding: '2px 8px', borderRadius: 6 }}>{role}</span>;
};

export const REPORT_REASONS = ['Spam', 'Harassment or bullying', 'Hateful content', 'Misinformation', 'Malicious content', 'Inappropriate content', 'Copyright violation', 'Other'];

// ---- Platform KPIs ----
export const MOCK_ADMIN = {
  stats: {
    members: 48213, membersTrend: 6,
    sellers: 312, sellersTrend: 9,
    openReports: 7,
    suspended: 14,
    gmv: 184920, gmvTrend: 18,
    dau: 11840, dauTrend: 4,
  },
  memberSeries: [320, 360, 340, 410, 460, 500, 540, 600, 640, 700, 760, 820, 900, 980, 1040, 1120, 1180, 1260, 1340, 1420, 1500, 1600, 1700, 1820, 1920, 2040, 2160, 2300, 2440, 2600],
  gmvSeries: [3.1, 3.6, 3.2, 4.0, 4.6, 5.0, 5.4, 5.0, 6.1, 5.8, 5.2, 6.5, 7.2, 6.8, 7.6, 7.2, 8.4, 8.0, 8.8, 9.6, 9.2, 10.1, 9.8, 11.2, 10.8, 12.0, 11.6, 13.2, 12.8, 14.1],

  reports: [
    { id: 'r1', type: 'Product', target: 'Miracle carbon-eraser pendant', excerpt: '"Neutralises 2 tonnes of CO₂ a year just by wearing it." No evidence provided.', author: 'wellnessguru', authorName: 'Wellness Guru', reason: 'Misinformation', reporters: 6, time: '12m ago', status: 'open', severity: 'high' },
    { id: 'r2', type: 'Post', target: 'Comment thread on “Solar payback myths”', excerpt: 'Repeated personal attacks against another member in the replies.', author: 'gridtroll', authorName: 'Anon Grid', reason: 'Harassment or bullying', reporters: 4, time: '47m ago', status: 'open', severity: 'high' },
    { id: 'r3', type: 'Product', target: 'Bulk “offset credits” — $2 each', excerpt: 'Listing links off-platform to an unverified payment page.', author: 'cheapoffsets', authorName: 'Cheap Offsets Co', reason: 'Malicious content', reporters: 3, time: '1h ago', status: 'open', severity: 'high' },
    { id: 'r4', type: 'Post', target: '“DM me for free panels” drop', excerpt: 'Same copy-pasted promo posted across 14 communities.', author: 'panelplug', authorName: 'Panel Plug', reason: 'Spam', reporters: 9, time: '2h ago', status: 'open', severity: 'medium' },
    { id: 'r5', type: 'Comment', target: 'Reply on a wind-turbine build log', excerpt: 'Uses a slur. Auto-flagged by filter, pending human review.', author: 'deleted_user', authorName: 'Removed', reason: 'Hateful content', reporters: 2, time: '3h ago', status: 'open', severity: 'high' },
    { id: 'r6', type: 'Product', target: 'Hand-knit organic beanies', excerpt: 'Reporter claims the listing photos are stolen from another shop.', author: 'cosycaps', authorName: 'Cosy Caps', reason: 'Copyright violation', reporters: 1, time: '5h ago', status: 'open', severity: 'low' },
    { id: 'r7', type: 'Post', target: 'Heated debate in r/climate-policy', excerpt: 'Flagged as misinformation — actually a sourced opinion. Likely dismiss.', author: 'policywonk', authorName: 'Policy Wonk', reason: 'Misinformation', reporters: 1, time: '6h ago', status: 'open', severity: 'low' },
  ],

  // Platform-wide marketplace listings (admin moderation view)
  products: [
    { id: 'ap1', title: 'The repair kit · 92 tools', seller: 'The Fix-it Collective', handle: 'fixit', price: 84, category: 'Home & Garden', status: 'live', flags: 0, views: 4120, img: 'leather tool case' },
    { id: 'ap2', title: 'Miracle carbon-eraser pendant', seller: 'Wellness Guru', handle: 'wellnessguru', price: 129, category: 'Health & Wellness', status: 'flagged', flags: 6, views: 880, img: 'crystal pendant' },
    { id: 'ap3', title: 'Refillable shampoo bar', seller: 'BareHaus', handle: 'barehaus', price: 12, category: 'Beauty & Care', status: 'live', flags: 0, views: 3310, img: 'shampoo bar' },
    { id: 'ap4', title: 'Bulk “offset credits” — $2 each', seller: 'Cheap Offsets Co', handle: 'cheapoffsets', price: 2, category: 'Other', status: 'flagged', flags: 3, views: 540, img: 'certificate' },
    { id: 'ap5', title: 'Solar phone charger', seller: 'Sunly', handle: 'sunly', price: 48, category: 'Electronics', status: 'live', flags: 0, views: 2870, img: 'solar charger' },
    { id: 'ap6', title: 'Hand-knit organic beanies', seller: 'Cosy Caps', handle: 'cosycaps', price: 28, category: 'Sustainable Fashion', status: 'flagged', flags: 1, views: 1290, img: 'wool beanie' },
    { id: 'ap7', title: 'Bamboo cutlery set', seller: 'Forrest', handle: 'forrest', price: 18, category: 'Home & Garden', status: 'live', flags: 0, views: 2040, img: 'bamboo cutlery' },
    { id: 'ap8', title: 'Vintage diesel space heater', seller: 'Anon Grid', handle: 'gridtroll', price: 75, category: 'Home & Garden', status: 'removed', flags: 4, views: 410, img: 'diesel heater' },
    { id: 'ap9', title: 'Compost starter kit', seller: 'Soily', handle: 'soily', price: 34, category: 'Home & Garden', status: 'live', flags: 0, views: 1620, img: 'compost kit' },
    { id: 'ap10', title: 'Wool insulation panel', seller: 'Hjem', handle: 'hjem', price: 89, category: 'Renewable Energy', status: 'live', flags: 0, views: 980, img: 'wool panel' },
  ],

  users: [
    { id: 'u1', name: 'Sarah Green', handle: 'sarahgreen', role: 'Member', status: 'active', impact: 142, joined: 'Jan 2025', posts: 318, reports: 0, city: 'Portland, OR' },
    { id: 'u2', name: 'The Fix-it Collective', handle: 'fixit', role: 'Seller', status: 'active', impact: 92, joined: 'May 2026', posts: 41, reports: 0, city: 'Lisbon, PT' },
    { id: 'u3', name: 'Marcus Johnson', handle: 'marcus', role: 'Member', status: 'active', impact: 88, joined: 'Mar 2025', posts: 204, reports: 1, city: 'Austin, TX' },
    { id: 'u4', name: 'Maya Patel', handle: 'maya', role: 'Moderator', status: 'active', impact: 167, joined: 'Nov 2024', posts: 512, reports: 0, city: 'Austin, TX' },
    { id: 'u5', name: 'Wellness Guru', handle: 'wellnessguru', role: 'Seller', status: 'active', impact: 12, joined: 'Jun 2026', posts: 28, reports: 6, city: 'Unknown' },
    { id: 'u6', name: 'Panel Plug', handle: 'panelplug', role: 'Member', status: 'suspended', impact: 4, joined: 'Jun 2026', posts: 63, reports: 9, city: 'Unknown' },
    { id: 'u7', name: 'Dr. Adaeze Okafor', handle: 'okafor', role: 'Member', status: 'active', impact: 201, joined: 'Aug 2024', posts: 147, reports: 0, city: 'Lagos, NG' },
    { id: 'u8', name: 'Anon Grid', handle: 'gridtroll', role: 'Member', status: 'banned', impact: 0, joined: 'Jun 2026', posts: 19, reports: 11, city: 'Unknown' },
    { id: 'u9', name: 'Cheap Offsets Co', handle: 'cheapoffsets', role: 'Seller', status: 'suspended', impact: 2, joined: 'Jun 2026', posts: 8, reports: 3, city: 'Unknown' },
    { id: 'u10', name: 'Tara Lin', handle: 'tara', role: 'Member', status: 'active', impact: 119, joined: 'Feb 2025', posts: 88, reports: 0, city: 'Seattle, WA' },
    { id: 'u11', name: 'GreenTech Solutions', handle: 'greentech', role: 'Seller', status: 'active', impact: 134, joined: 'Sep 2024', posts: 96, reports: 0, city: 'Berlin, DE' },
    { id: 'u12', name: 'Climate Action Network', handle: 'can', role: 'Member', status: 'active', impact: 178, joined: 'Jul 2024', posts: 233, reports: 0, city: 'Global' },
  ],

  audit: [
    { id: 'l1', actor: 'You', action: 'approved seller application', target: 'Loom & Linen', time: '2m ago', kind: 'check' },
    { id: 'l2', actor: 'Maya Patel', action: 'removed a flagged product', target: 'Vintage diesel space heater', time: '1h ago', kind: 'trash' },
    { id: 'l3', actor: 'System', action: 'auto-flagged a comment', target: 'hateful-content filter', time: '3h ago', kind: 'flame' },
    { id: 'l4', actor: 'You', action: 'suspended account', target: '@panelplug', time: '5h ago', kind: 'lock' },
    { id: 'l5', actor: 'Maya Patel', action: 'dismissed a report', target: 'r/climate-policy thread', time: '6h ago', kind: 'close' },
    { id: 'l6', actor: 'You', action: 'banned account', target: '@gridtroll', time: '1d ago', kind: 'logout' },
    { id: 'l7', actor: 'System', action: 'processed payouts', target: '287 sellers · $46,120', time: '1d ago', kind: 'coin' },
    { id: 'l8', actor: 'Maya Patel', action: 'promoted member to moderator', target: '@okafor', time: '2d ago', kind: 'award' },
  ],
};
