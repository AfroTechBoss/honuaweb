// What each admin role is allowed to do — the single source of truth.
//
// This file is imported by two places that must never disagree: the server
// routes that enforce a permission, and the Roles page that draws the matrix
// claiming it is enforced. When those two drift, the console lies — it tells an
// owner that their analyst cannot issue refunds while the refund route happily
// takes the analyst's token. Keeping one table and deriving both sides from it
// is the whole point.
//
// Deliberately dependency-free so a client component can import it. Nothing
// here is a secret: it is the same matrix the page already rendered, except now
// something reads it.

// Named CONSOLE_ROLES, not ADMIN_ROLES: components/shared already exports an
// ADMIN_ROLES, and it is a different thing entirely — a colour map for the
// account-level Admin/Moderator/Seller/Member chip. These are console access
// roles. Two exports one import away from each other under the same name is a
// collision waiting to be imported by accident.
export const CONSOLE_ROLES = ['owner', 'admin', 'moderator', 'analyst'] as const;
export type AdminRole = (typeof CONSOLE_ROLES)[number];

export const isAdminRole = (v: unknown): v is AdminRole =>
  typeof v === 'string' && (CONSOLE_ROLES as readonly string[]).includes(v);

export type Permission =
  // moderation
  | 'moderation.view'
  | 'moderation.act'
  | 'users.suspend'
  | 'users.ban'
  | 'appeals.resolve'
  // commerce
  | 'orders.view'
  | 'orders.manage'
  | 'orders.refund'
  | 'sellers.review'
  | 'payouts.manage'
  | 'carbon.manage'
  // operations
  | 'support.handle'
  | 'notifications.send'
  | 'analytics.view'
  | 'errors.view'
  // platform
  | 'settings.manage'
  | 'roles.manage'
  | 'roles.assign_limited';

// Roles are additive, not hierarchical — there is no "owner inherits admin"
// chain to reason about. Every role lists exactly what it holds, so reading one
// line tells you the whole of someone's access.
const GRANTS: Record<AdminRole, readonly Permission[]> = {
  owner: [
    'moderation.view', 'moderation.act', 'users.suspend', 'users.ban', 'appeals.resolve',
    'orders.view', 'orders.manage', 'orders.refund', 'sellers.review', 'payouts.manage', 'carbon.manage',
    'support.handle', 'notifications.send', 'analytics.view', 'errors.view',
    // roles.assign_limited is the lesser half of roles.manage, listed explicitly
    // because these grants are flat rather than hierarchical — without it an
    // owner would fail a check an admin passes.
    'settings.manage', 'roles.manage', 'roles.assign_limited',
  ],
  // Everything operational. The two it lacks are the two that can lock the
  // owner out of their own platform: changing what the platform is, and
  // changing who can change it. `roles.assign_limited` is the compromise the
  // original matrix drew — an admin can staff up moderators and analysts
  // without being able to mint another admin or touch the owner.
  admin: [
    'moderation.view', 'moderation.act', 'users.suspend', 'users.ban', 'appeals.resolve',
    'orders.view', 'orders.manage', 'orders.refund', 'sellers.review', 'payouts.manage', 'carbon.manage',
    'support.handle', 'notifications.send', 'analytics.view', 'errors.view',
    'roles.assign_limited',
  ],
  // Day-to-day Trust & Safety. Can suspend, cannot ban: a permanent ban is the
  // one moderation action with no practical undo, so it sits a rung up.
  // Sees orders because support tickets are usually about one.
  moderator: [
    'moderation.view', 'moderation.act', 'users.suspend', 'appeals.resolve',
    'orders.view', 'sellers.review', 'support.handle',
  ],
  // Read-only. Present so someone can be given numbers without being given
  // the ability to change anything that produces them.
  analyst: ['moderation.view', 'orders.view', 'analytics.view'],
};

export function can(role: AdminRole | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  return GRANTS[role]?.includes(perm) ?? false;
}

export const permissionsFor = (role: AdminRole): readonly Permission[] => GRANTS[role] ?? [];

/**
 * Which roles a given role is allowed to hand out. An owner can set anything;
 * an admin can staff up the two junior roles; nobody else can assign at all.
 * Used by both the members route and the buttons on the Roles page.
 */
export function assignableBy(role: AdminRole | null | undefined): readonly AdminRole[] {
  if (role === 'owner') return CONSOLE_ROLES;
  if (role === 'admin') return ['moderator', 'analyst'];
  return [];
}

// ── The matrix the Roles page draws ─────────────────────────────────────────
//
// `enforced` is the honest bit, and the reason this shape exists rather than a
// grid of booleans. A row is enforced when a server route actually calls can()
// before doing the thing; advisory means the feature still lives in the browser,
// where no gate is possible and a ✓ would be a promise nothing keeps.
//
// Every row is enforced now. The flag stays because the next feature will start
// out advisory too, and the alternative — quietly drawing a check for it — is
// the failure this column was added to make visible.
//
// Marking that difference in the UI is not an apology for it. An owner deciding
// whether to hand someone the moderator role needs to know which of these lines
// is a lock and which is a label.
export type MatrixRow = {
  label: string;
  /** Holding this permission renders a check. */
  full: Permission;
  /** Holding only this renders the chip instead — partial access. */
  partial?: { perm: Permission; label: string };
  enforced: boolean;
  /** Shown under the label. Says where the rule is applied, or why it isn't yet. */
  note: string;
};

export const PERMISSION_MATRIX: readonly MatrixRow[] = [
  { label: 'Content moderation', full: 'moderation.act', partial: { perm: 'moderation.view', label: 'view' }, enforced: true,
    note: 'GET and PATCH /api/admin/community-reports' },
  { label: 'Temporary suspension', full: 'users.suspend', enforced: true,
    note: 'PATCH /api/admin/users. Not just a flag: migration 041 blocks a suspended account from writing to 28 tables. Reading still works.' },
  { label: 'Permanent ban', full: 'users.ban', enforced: true,
    note: 'PATCH /api/admin/users. Also required to lift one — a moderator cannot undo a ban they could not issue.' },
  { label: 'Appeals review', full: 'appeals.resolve', enforced: true,
    note: 'GET and PATCH /api/admin/appeals. Deciding an appeal is not the same as lifting the punishment — reinstatement still needs users.suspend or users.ban.' },

  { label: 'View orders', full: 'orders.view', enforced: true, note: 'GET /api/admin/orders' },
  { label: 'Move orders & add notes', full: 'orders.manage', enforced: true, note: 'PATCH /api/admin/orders' },
  { label: 'Issue refunds', full: 'orders.refund', enforced: true, note: 'POST /api/admin/orders — real money leaves the account here.' },
  { label: 'Seller verification', full: 'sellers.review', enforced: true, note: '/api/admin/verification' },
  { label: 'Carbon catalog', full: 'carbon.manage', enforced: true, note: '/api/admin/carbon-credits' },
  { label: 'Payout management', full: 'payouts.manage', enforced: true,
    note: 'GET, PATCH and POST /api/admin/payouts. Owner and admin only — a moderator can freeze an account but cannot move money out of it. Approving only clears a transfer. Sending it is a second, separate act, whether that is Send (Stripe or PayPal, through the same permission) or recording a hand transfer against a reference.' },

  { label: 'Support tickets', full: 'support.handle', enforced: true, note: '/api/admin/support' },
  { label: 'Send notifications', full: 'notifications.send', enforced: true,
    note: 'GET and POST /api/admin/notifications. The audience is resolved in SQL from a name — the browser never hands over a recipient list — and every send is recorded with the counts it actually achieved.' },
  { label: 'View analytics', full: 'analytics.view', enforced: true,
    note: 'GET /api/admin/metrics?scope=analytics and the audit log. The overview counters stay open to every role — they are the console’s landing page.' },
  { label: 'Error log', full: 'errors.view', enforced: true, note: '/api/admin/errors' },

  { label: 'Platform settings', full: 'settings.manage', enforced: true,
    note: 'GET, PATCH and POST /api/admin/settings. Owner only: maintenance mode takes the whole site offline, and closing registration is enforced by the database trigger behind sign-up.' },
  { label: 'Manage team roles', full: 'roles.manage', partial: { perm: 'roles.assign_limited', label: 'mod/analyst' }, enforced: true,
    note: 'PATCH and DELETE /api/admin/members' },
];
