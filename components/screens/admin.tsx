"use client";
// v2
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { AdminProducts, AdminUsers, AdminSellers, AdminActivity } from "./admin-manage";
import { AdminShops } from "./admin-shops";
import { AdminCarbonCredits } from "./admin-carbon";
import { AdminVerification } from "./admin-verification";
import { AdminSupport } from "./admin-support";
import { AdminOrders } from "./admin-orders";
import { AdminRoles } from "./admin-roles";
import { AdminTax } from "./admin-tax";
import { listTickets } from "@/lib/admin-support";
import { listOrders, fetchAdminProfile } from "@/lib/admin-orders";
import {
  listReports, resolveReport, listMembers, setAccountStatus, setMemberRole, suspensionRemaining,
  type CommunityReport, type ReportStatus,
} from "@/lib/admin-moderation";
import {
  listContentReports, decideContentReport,
  type ReportedTarget, type ContentReportCounts,
} from "@/lib/admin-content-reports";
import { VerifiedTick } from "@/components/primitives";
import { useAdminUser } from "@/components/admin-auth";
import {
  fetchOverviewMetrics, fetchAnalyticsMetrics, fetchActivity, recordActivity,
  fetchErrors, markErrorsSeen, lookupError,
  relativeTime, duration, pageLabel, SOURCE_LABELS,
  type OverviewMetrics, type AnalyticsMetrics, type AuditEntry, type ErrorFeed,
} from "@/lib/admin-metrics";
import {
  listPayouts, reviewPayout, markPayoutPaid, revealDestination, dispatchPayout,
  type PayoutRow, type PayoutDestination,
} from "@/lib/admin-payouts";
import { listAppeals, resolveAppeal as resolveAppealCall, type Appeal } from "@/lib/admin-appeals";
import { appealKindLabel, APPEAL_KIND_SHORT } from "@/lib/appeals";
import { getSettings, saveSettings, clearReports } from "@/lib/admin-settings";
import { listBroadcasts, sendBroadcast, type BroadcastHistory } from "@/lib/admin-notifications";
import {
  DEFAULT_MAINTENANCE_MESSAGE, DEFAULT_REGISTRATION_NOTE, type PlatformSettings,
} from "@/lib/platform";
import {
  unresolvedTokens, outcomeLine, audienceLabel, channelLabel, RESOLVED_TOKENS, MAX_IN_APP,
  type Audience, type Channel, type BroadcastRecord,
} from "@/lib/broadcast";

// =====================================================================
// Desktop Admin Console — platform owner / moderator workspace
// Own shell (left rail + topbar), six sections.
// =====================================================================

const ADMIN_NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      ['overview', 'Overview', 'home'],
      ['analytics', 'Analytics', 'bolt'],
    ],
  },
  {
    label: 'Management',
    items: [
      ['moderation', 'Moderation', 'flame'],
      ['support', 'Support', 'msg'],
      ['orders', 'Orders', 'package'],
      ['verification', 'Verification', 'check'],
      ['community-reports', 'Community Reports', 'users'],
      ['appeals', 'Appeals', 'flag'],
      ['challenges', 'Challenges', 'award'],
      ['products', 'Products', 'bag'],
      ['carbon', 'Carbon Credits', 'co2'],
      ['users', 'Users', 'users'],
      // Sellers is the application queue; Shops is what the approved ones
      // became. Next to each other because that is the order they happen in.
      ['sellers', 'Sellers', 'leaf'],
      ['shops', 'Shops', 'store'],
      ['payouts', 'Payouts', 'coin'],
      // DAC7 and the other platform-reporting regimes; sits with payouts
      // because it's the same money, counted for the tax office.
      ['tax', 'Tax reporting', 'flag'],
    ],
  },
  {
    label: 'System',
    items: [
      ['notifications', 'Notifications', 'bell'],
      ['roles', 'Roles', 'award'],
      ['activity', 'Activity', 'clock'],
      ['errors', 'Errors', 'alert'],
      ['settings', 'Settings', 'settings'],
    ],
  },
];

const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap(g => g.items);

// The payout queue used to be six invented sellers here, each with a trust score
// and dispute count that were literals in this file, and Approve moved a row in
// React state. It is now payout_requests through /api/admin/payouts — see
// AdminPayouts below.
//
// The appeals queue used to be five invented appeals here, and resolving one
// changed nothing anywhere. It is now the appeals table (migration 043) through
// /api/admin/appeals — see AdminAppeals below.

// The admin team used to be four invented people here. It is now the
// admin_members table (migration 040), read through /api/admin/members — see
// ./admin-roles.tsx.
//
// The sent-notification history used to be four invented rows here, with a
// hardcoded "3h ago" that stayed three hours ago forever. It is now
// admin_broadcasts (migration 044) through /api/admin/notifications, and it
// records what a send achieved rather than what it attempted.
//
// The settings screen used to be five booleans in React state that nothing read.
// It is now platform_settings (migration 044) through /api/admin/settings, and
// every switch left on it has a reader named in lib/platform.ts.

// ---- Notification templates ----
//
// Starting points for the composer, not sendable as they stand. Only
// {{user.name}} and {{user.handle}} are filled in by the server (per recipient,
// in SQL for the in-app half); every other slot below is a blank the admin has
// to write over, and the composer refuses to send while one is left. See
// RESOLVED_TOKENS in lib/broadcast.ts.
const NOTIFICATION_TEMPLATES = [
  { id: 'account.suspension.temporary', name: 'Temporary Suspension', subject: 'Your account has been temporarily suspended', body: 'Hi {{user.name}},\n\nYour account has been temporarily suspended for the following reason: {{suspension_reason}}.\n\nThis will be reviewed within {{review_days}} business days. If you believe this is an error, you may submit an appeal from your account settings.\n\nHonua Trust & Safety' },
  { id: 'account.suspension.permanent', name: 'Permanent Ban', subject: 'Your account has been permanently suspended', body: 'Hi {{user.name}},\n\nAfter a thorough review, your account has been permanently suspended for violating our community guidelines.\n\nHonua Trust & Safety' },
  { id: 'content.post.removed', name: 'Post Removed', subject: 'A post has been removed', body: 'Hi {{user.name}},\n\nYour post "{{post_title}}" was removed for: {{violation_reason}}.\n\nYou may request a reconsideration within 14 days.\n\nHonua Trust & Safety' },
  { id: 'appeal.decision.approved', name: 'Appeal Overturned', subject: 'Your appeal has been approved', body: 'Hi {{user.name}},\n\nWe reviewed your appeal regarding {{entity}} and have overturned our earlier decision.\n\n{{resolution_note}}\n\nThank you for reaching out.\n\nHonua Trust & Safety' },
  { id: 'appeal.decision.denied', name: 'Appeal Upheld', subject: 'Update on your appeal', body: 'Hi {{user.name}},\n\nWe reviewed your appeal regarding {{entity}} and have upheld our earlier decision.\n\n{{resolution_note}}\n\nHonua Trust & Safety' },
  { id: 'seller.application.approved', name: 'Seller Approved', subject: 'Welcome to Honua as a seller!', body: 'Hi {{user.name}},\n\nYour seller application has been approved. You can now list products on Honua.\n\nKeep your sustainability certifications current — we review these periodically.\n\nWelcome aboard!\n\nThe Honua Team' },
  { id: 'seller.application.rejected', name: 'Seller Rejected', subject: 'Update on your seller application', body: 'Hi {{user.name}},\n\nAfter reviewing your application we are unable to approve it at this time.\n\nReason: {{rejection_reason}}\n\nYou may reapply once the issue is addressed.\n\nThe Honua Team' },
  { id: 'seller.certification.expiry', name: 'Cert Expiry Warning', subject: 'Your sustainability certification is expiring soon', body: 'Hi {{user.name}},\n\nYour {{cert_name}} certification expires on {{expiry_date}}. Please upload a renewed certificate before then to avoid a listing hold.\n\nThe Honua Team' },
  { id: 'admin.custom_message', name: 'Custom Message', subject: '', body: '' },
];

export function DesktopAdmin({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const { email: adminEmail, logout: adminLogout, getAccessToken: adminToken } = useAdminUser();
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  if (isMobile) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: 32, textAlign: 'center', gap: 20, background: 'var(--bg)' }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="settings" size={32} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Desktop only</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: 280 }}>
          The admin panel is designed for larger screens.<br />Please access it from a desktop or laptop.
        </div>
      </div>
    </div>
  );
  const getHashSection = () => {
    const h = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    return ADMIN_NAV.some(n => n[0] === h) ? h : 'overview';
  };
  const [section, setSection] = React.useState(getHashSection);
  const [collapsed, setCollapsed] = React.useState(false);

  // keep URL hash in sync so refresh restores position
  React.useEffect(() => {
    window.location.hash = section;
  }, [section]);
  React.useEffect(() => {
    const onHash = () => setSection(getHashSection());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // ----- live, mutable platform data (session only) -----
  // The report queue used to live here as MOCK_ADMIN.reports. It belongs to
  // AdminModeration now, which reads /api/admin/content-reports — the shell
  // keeps only the count the rail badge draws, reported up by the panel.
  // Real members only, from /api/admin/users. This used to open with
  // MOCK_ADMIN.users — invented accounts listed beside real ones, whose
  // buttons answered "Demo account — nothing was stored".
  const [users, setUsers] = React.useState<any[]>([]);
  const [usersLoaded, setUsersLoaded] = React.useState(false);
  const [openReports, setOpenReports] = React.useState<number | null>(null);
  // Starts empty and fills from admin_audit_log. It used to start as eight
  // invented entries about people who don't work here, and every real action an
  // admin took was appended to that list and then lost on refresh.
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);
  // Payouts and appeals own their own data now; the rail only needs the counts,
  // which the panels report up so the badge and the panel can't disagree.
  const [pendingPayouts, setPendingPayouts] = React.useState(0);
  const [pendingAppeals, setPendingAppeals] = React.useState(0);
  const [dbChallenges, setDbChallenges] = React.useState<any[]>([]);
  const [pendingChallenges, setPendingChallenges] = React.useState<any[]>([]);
  const [challengesLoaded, setChallengesLoaded] = React.useState(false);

  // Privy hands back a fresh function every render; the ref keeps the loaders
  // below from re-firing on each one.
  const tokenRef = React.useRef(adminToken);
  tokenRef.current = adminToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    try { return await tokenRef.current(); } catch { return null; }
  }, []);

  // Challenges go through /api/admin/challenges: RLS only lets the service role
  // publish or change one, and since 056 the reward a challenge pays can only be
  // set there. These used to be browser writes that RLS refused without a word.
  const challengeApi = React.useCallback(async (method: 'GET' | 'POST' | 'PATCH', body?: any): Promise<{ data?: any; error?: string }> => {
    try {
      const t = await token();
      const res = await fetch('/api/admin/challenges', {
        method,
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      return res.ok ? { data } : { error: data?.error ?? `Request failed (${res.status})` };
    } catch {
      return { error: 'Network error' };
    }
  }, [token]);

  const loadChallenges = React.useCallback(async () => {
    const { data } = await challengeApi('GET');
    if (data) {
      setDbChallenges(data.active ?? []);
      setPendingChallenges(data.pending ?? []);
    }
    setChallengesLoaded(true);
  }, [challengeApi]);

  React.useEffect(() => { loadChallenges(); }, [loadChallenges]);

  // realtime: refresh challenges when any row changes
  React.useEffect(() => {
    let channel: any;
    import('@/lib/supabase').then(({ supabase }) => {
      channel = supabase.channel('admin-challenges')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => loadChallenges())
        .subscribe();
    });
    return () => { channel?.unsubscribe(); };
  }, [loadChallenges]);

  const challengeFailed = (msg: string, error: string) => {
    app.toast?.({ msg, sub: error, kind: 'error', icon: 'close' });
    return false;
  };

  const approveChallenge = async (id: string, reward: { rewardPoints: number; requiredLogs: number | null }) => {
    const c = pendingChallenges.find(x => x.id === id);
    const { data, error } = await challengeApi('PATCH', { id, action: 'approve', ...reward });
    if (error) return challengeFailed('Could not approve challenge', error);
    setPendingChallenges(p => p.filter(x => x.id !== id));
    setDbChallenges(a => [data.challenge, ...a]);
    log('approved challenge', c?.title ?? '', 'check');
    app.toast?.({ msg: 'Challenge approved', sub: c?.title, kind: 'success', icon: 'check' });
    return true;
  };

  const updateChallengeReward = async (id: string, reward: { rewardPoints: number; requiredLogs: number | null }) => {
    const c = dbChallenges.find(x => x.id === id);
    const { data, error } = await challengeApi('PATCH', { id, action: 'update', ...reward });
    if (error) return challengeFailed('Could not update reward', error);
    setDbChallenges(a => a.map(x => x.id === id ? data.challenge : x));
    log('updated challenge reward', c?.title ?? '', 'check');
    app.toast?.({ msg: 'Reward updated', sub: c?.title, kind: 'success', icon: 'check' });
    return true;
  };

  const rejectChallenge = async (id: string, reason: string) => {
    const c = pendingChallenges.find(x => x.id === id);
    const { error } = await challengeApi('PATCH', { id, action: 'reject', reason });
    if (error) return challengeFailed('Could not reject challenge', error);
    setPendingChallenges(p => p.filter(x => x.id !== id));
    log('rejected challenge', c?.title ?? '', 'close');
    app.toast?.({ msg: 'Challenge rejected', sub: c?.title, icon: 'close' });
    return true;
  };

  const archiveChallenge = async (id: string) => {
    const c = dbChallenges.find(x => x.id === id);
    const { error } = await challengeApi('PATCH', { id, action: 'archive' });
    if (error) return challengeFailed('Could not archive challenge', error);
    setDbChallenges(a => a.filter(x => x.id !== id));
    log('archived challenge', c?.title ?? '', 'trash');
    app.toast?.({ msg: 'Challenge archived', sub: c?.title, icon: 'trash' });
    return true;
  };

  const createAdminChallenge = async (body: any) => {
    const { data, error } = await challengeApi('POST', body);
    if (error) return challengeFailed('Could not create challenge', error);
    setDbChallenges(a => [data.challenge, ...a]);
    log('created challenge', body.title, 'check');
    app.toast?.({ msg: 'Challenge created', sub: body.title, kind: 'success', icon: 'award' });
    return true;
  };

  const loadAudit = React.useCallback(async () => {
    const { entries } = await fetchActivity(await token(), 50);
    if (entries?.length) setAudit(entries);
  }, [token]);

  React.useEffect(() => { loadAudit(); }, [loadAudit]);

  // Real members.
  //
  // Through /api/admin/users rather than a browser query on profiles, because
  // standing is not a public column: suspended_until and banned_at are readable
  // by the service role only. The browser version had no way to ask, so it
  // hardcoded `status: 'active'` for every real member — a suspended account
  // displayed as active, on the screen whose job is to show you which accounts
  // are not.
  const [rosterAvailable, setRosterAvailable] = React.useState(true);
  const [canSuspend, setCanSuspend] = React.useState(true);
  const [canBan, setCanBan] = React.useState(true);

  const loadUsers = React.useCallback(async () => {
    const res = await listMembers(await token());
    setUsersLoaded(true);
    if (res.error) return;
    setRosterAvailable(res.available);
    setCanSuspend(res.canSuspend);
    setCanBan(res.canBan);
    setUsers(res.users);
  }, [token]);

  React.useEffect(() => { loadUsers(); }, [loadUsers]);

  // Held here rather than inside AdminOverview because the left rail's seller
  // badge reads the same number. Fetched twice it would drift, and the console
  // was already showing "4" in the rail beside a "0" in the panel.
  const [metrics, setMetrics] = React.useState<OverviewMetrics | null>(null);
  const [metricsError, setMetricsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { metrics: m, error } = await fetchOverviewMetrics(await token());
      setMetrics(m ?? null);
      setMetricsError(error ?? null);
    })();
  }, [token]);

  // Unread server errors, for the rail badge. Fetched here so the count is
  // visible from every section — the whole point of a badge is that you don't
  // have to be looking at the Errors page to find out something broke.
  const [unseenErrors, setUnseenErrors] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    const poll = async () => {
      const { feed } = await fetchErrors(await token(), 1);
      if (alive) setUnseenErrors(feed?.unseen ?? 0);
    };
    poll();
    // Slow on purpose. This is a "something broke while you had the tab open"
    // signal, not a live tail — a tighter interval would spend the route's rate
    // limit on a number that changes a few times a week.
    const t = setInterval(poll, 120_000);
    return () => { alive = false; clearInterval(t); };
  }, [token]);

  // Open support tickets, same idea. Someone waiting for a reply is the one
  // queue where the delay itself is the harm, so the count has to be visible
  // from whatever section you happen to be standing in.
  const [openTickets, setOpenTickets] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    const poll = async () => {
      const { counts } = await listTickets(await token(), { limit: 1 });
      // The rollup, not one queue — the badge stands for everything waiting.
      if (alive) setOpenTickets(counts?.all.open ?? 0);
    };
    poll();
    const t = setInterval(poll, 120_000);
    return () => { alive = false; clearInterval(t); };
  }, [token]);

  // Orders whose payment failed. Deliberately not "orders needing fulfilment" —
  // that queue belongs to the seller, and badging it here would put a permanent
  // number on the rail that nobody in this console is meant to clear. A payment
  // that didn't go through is the opposite: nobody owns it until an admin looks.
  // Reported up from the panel when it's open, polled here when it isn't.
  const [failedPayments, setFailedPayments] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    const poll = async () => {
      const { counts } = await listOrders(await token(), { payment: 'failed', limit: 1 });
      if (alive) setFailedPayments(counts?.paymentFailed ?? 0);
    };
    poll();
    const t = setInterval(poll, 120_000);
    return () => { alive = false; clearInterval(t); };
  }, [token]);

  // The face behind the address in the sidebar. Privy only knows the email; the
  // avatar lives on a Honua profile, and matching the two takes a service-role
  // read of auth.users that can only happen server-side. Null is fine and
  // common — an allowlisted admin needn't have a Honua account at all — and the
  // chip falls back to the initial it has always drawn.
  const [adminProfile, setAdminProfile] = React.useState<{ name: string | null; avatarUrl: string | null } | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const p = await fetchAdminProfile(await token(), adminEmail);
      if (alive) setAdminProfile(p);
    })();
    return () => { alive = false; };
  }, [token, adminEmail]);

  /**
   * Records an admin action, both on screen and in the database.
   *
   * The optimistic entry goes in first so the console stays responsive, then
   * the write happens. If the write fails the line is still on screen for this
   * session but won't survive a refresh — the action itself already succeeded,
   * and blocking the UI on the bookkeeping would be the wrong trade. The server
   * logs the failure with the action name attached.
   */
  const log = (action, target, kind = 'check') => {
    const at = new Date().toISOString();
    const optimistic: AuditEntry = { id: 'pending-' + Date.now(), actor: 'You', action, target, kind, at };
    setAudit(a => [optimistic, ...a]);
    token()
      .then(t => recordActivity(t, { action, target, kind, actorLabel: adminEmail ?? 'Admin' }))
      .then(({ id }) => { if (id) setAudit(a => a.map(e => e.id === optimistic.id ? { ...e, id } : e)); })
      .catch(() => {});
  };

  // Report handling used to live here: resolveReport moved a mock row between
  // statuses and matched a product by *title* to mark it removed, and
  // suspendFromReport suspended a mock user by handle. Both wrote to React
  // state only. They are now one PATCH to /api/admin/content-reports, made by
  // the panel, which is the only place that can see a real report.

  // Product moderation used to live here as a setState over MOCK_ADMIN.products.
  // It now belongs to AdminProducts, which goes through /api/admin/products —
  // the shell has no product state left to change.

  // user moderation
  //
  // This used to be setUsers() and nothing else. The badge changed colour, an
  // audit line was written describing a suspension that had not happened, and a
  // refresh put the account back to active — there was no column to store it in.
  // Now it goes to /api/admin/users, which writes profiles.suspended_until or
  // banned_at, and migration 041's restrictive policies make those two columns
  // stop the account writing anything anywhere.
  const setUserStatus = async (id, status) => {
    const u = users.find(x => x.id === id);
    if (!u) return;

    const action = status === 'suspended' ? 'suspend' : status === 'banned' ? 'ban' : 'reinstate';
    const { user, error } = await setAccountStatus(await token(), {
      id, action, actorLabel: adminEmail ?? 'Admin',
    });

    if (error || !user) {
      app.toast?.({ msg: 'Could not change that account', sub: error, kind: 'error', icon: 'close' });
      return;
    }

    // Server's answer, not the requested one. A ban that the RPC refused —
    // because the target is a console member, say — must not leave the roster
    // showing "banned".
    setUsers(us => us.map(x => x.id === id ? { ...x, status: user.status, suspendedUntil: user.suspendedUntil ?? null } : x));

    const verb = user.status === 'suspended' ? 'suspended account' : user.status === 'banned' ? 'banned account' : 'reinstated account';
    // The audit row is written inside the same transaction as the status
    // change (041 §5), so nothing is logged here — doing both would double it.
    setAudit(a => [{ id: 'pending-' + Date.now(), actor: 'You', action: verb, target: '@' + (u?.handle || ''), kind: user.status === 'active' ? 'check' : 'lock', at: new Date().toISOString() }, ...a]);
    app.toast?.({
      msg: verb.charAt(0).toUpperCase() + verb.slice(1),
      sub: '@' + u?.handle + (user.suspendedUntil ? ' · ' + (suspensionRemaining(user.suspendedUntil) ?? '') : ''),
      kind: user.status === 'active' ? 'success' : undefined,
      icon: user.status === 'active' ? 'check' : 'lock',
    });
  };
  // Same story as setUserStatus. This one wrote profiles.role straight from the
  // browser with the anon key — and the console signs in with Privy, so
  // auth.uid() is null on that connection and the owner-scoped policy matched no
  // rows. The update returned without error, changed nothing, and the toast said
  // "Role updated". Now it goes through /api/admin/users on roles.manage.
  const setUserRole = async (id, role) => {
    const u = users.find(x => x.id === id);

    // Only the three roles the profiles CHECK accepts can be stored. Anything
    // else ("Seller", say) is a label this screen draws, so it is refused
    // rather than shown as changed.
    if (!u) return;
    if (!['Member', 'Moderator', 'Admin'].includes(role)) {
      app.toast?.({ msg: `"${role}" is not a role that can be assigned`, sub: 'Members can be Member, Moderator or Admin.', kind: 'error', icon: 'lock' });
      return;
    }

    const { user, error } = await setMemberRole(await token(), {
      id, role, actorLabel: adminEmail ?? 'Admin',
    });

    if (error || !user) {
      app.toast?.({ msg: 'Could not change that role', sub: error, kind: 'error', icon: 'close' });
      return;
    }

    setUsers(us => us.map(x => x.id === id ? { ...x, role: user.role } : x));
    // The route writes its own audit row, so this only mirrors it on screen.
    setAudit(a => [{ id: 'pending-' + Date.now(), actor: 'You', action: 'changed role to ' + user.role, target: '@' + (u?.handle || ''), kind: 'award', at: new Date().toISOString() }, ...a]);
    app.toast?.({ msg: 'Role updated', sub: '@' + u?.handle + ' → ' + user.role, kind: 'success', icon: 'award' });
  };

  // Distinct pieces of content with an unanswered report. Comes from SQL via
  // /api/admin/metrics on first paint, then from the panel once it has loaded,
  // so acting on a report updates the badge without a refetch.
  const openCount = openReports ?? metrics?.openReports ?? 0;
  // Counted in SQL by /api/admin/metrics. Counting it from a list the console
  // holds would only ever have counted the mock catalogue.
  const flaggedCount = metrics?.flaggedProducts ?? 0;
  const pendingSellers = metrics?.pendingApplications ?? 0;
  const badges ={ moderation: openCount, support: openTickets, orders: failedPayments, appeals: pendingAppeals, challenges: pendingChallenges.length, products: flaggedCount, sellers: pendingSellers, payouts: pendingPayouts, errors: unseenErrors };

  const W = collapsed ? 68 : 232;

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      {/* ---- Admin left rail ---- */}
      <aside style={{
        width: W, flexShrink: 0,
        background: 'var(--ink-solid)', color: '#fff',
        display: 'flex', flexDirection: 'column',
        padding: collapsed ? '16px 10px' : '16px 12px',
        transition: 'width .2s ease, padding .2s ease',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', marginBottom: 20, minHeight: 36 }}>
          {!collapsed && (
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '-0.01em' }}>Honua</div>
              <div style={{ fontSize: 9.5, opacity: .4, fontFamily: 'JetBrains Mono', letterSpacing: '.1em', whiteSpace: 'nowrap', marginTop: 1 }}>ADMIN CONSOLE</div>
            </div>
          )}
          {collapsed && (
            <span style={{ fontFamily: 'Lora, Georgia, serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>H</span>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} title="Collapse sidebar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', padding: 4, borderRadius: 7, display: 'flex', flexShrink: 0 }}>
              <Icon name="chevron" size={15} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} title="Expand sidebar" style={{ background: 'rgba(255,255,255,.08)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', padding: '6px', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}

        {/* Nav groups */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: collapsed ? 4 : 0, overflowY: 'auto', overflowX: 'hidden' }} className="no-scrollbar">
          {ADMIN_NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: collapsed ? 0 : 18 }}>
              {!collapsed && (
                <div style={{ fontSize: 9.5, fontFamily: 'JetBrains Mono', letterSpacing: '.12em', color: 'rgba(255,255,255,.3)', padding: '0 10px', marginBottom: 4 }}>
                  {group.label.toUpperCase()}
                </div>
              )}
              <div style={{ display: 'grid', gap: 2 }}>
                {group.items.map(([k, label, icon]) => {
                  const on = section === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setSection(k as string)}
                      title={collapsed ? label as string : undefined}
                      style={{
                        display: 'flex', alignItems: 'center',
                        gap: collapsed ? 0 : 11,
                        padding: collapsed ? '10px 0' : '9px 10px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        borderRadius: 10, cursor: 'pointer',
                        border: 'none', textAlign: 'left',
                        fontFamily: 'Satoshi', fontSize: 13.5, fontWeight: on ? 600 : 500,
                        background: on ? 'rgba(255,255,255,.13)' : 'transparent',
                        color: on ? '#fff' : 'rgba(255,255,255,.55)',
                        position: 'relative',
                        transition: 'background .12s, color .12s',
                      }}
                    >
                      {/* Active accent bar */}
                      {on && (
                        <span style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: 3, borderRadius: '0 3px 3px 0', background: 'var(--green)' }} />
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, flexShrink: 0 }}>
                        <Icon name={icon as string} size={17} stroke={on ? 2.2 : 1.7} />
                      </span>
                      {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{label as string}</span>}
                      {!collapsed && (badges as any)[k] > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
                          background: k === 'sellers' ? 'var(--sun)' : 'var(--clay)',
                          color: '#fff', fontSize: 10.5, fontWeight: 700,
                          fontFamily: 'JetBrains Mono', display: 'grid', placeItems: 'center',
                        }}>{(badges as any)[k]}</span>
                      )}
                      {collapsed && (badges as any)[k] > 0 && (
                        <span style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 8, height: 8, borderRadius: '50%',
                          background: k === 'sellers' ? 'var(--sun)' : 'var(--clay)',
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: profile + back */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 12 }}>
          {/* Admin profile */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '8px 0' : '8px 10px',
            borderRadius: 10,
            background: 'rgba(255,255,255,.06)',
          }}>
            <Avatar src={adminProfile?.avatarUrl ?? undefined} name={adminProfile?.name ?? adminEmail ?? 'Admin'} size={30} noBorder />
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{adminEmail ?? 'Admin'}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>Owner</div>
              </div>
            )}
            {!collapsed && (
              <button onClick={adminLogout} title="Sign out" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0 }}>
                <Icon name="logout" size={14} />
              </button>
            )}
          </div>

          {/* Back to app */}
          <button
            onClick={() => onNav?.('home')}
            title={collapsed ? 'Back to app' : undefined}
            style={{
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 9,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '9px 0' : '9px 10px',
              borderRadius: 10, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,.1)',
              background: 'transparent',
              color: 'rgba(255,255,255,.55)',
              fontSize: 13, fontWeight: 500,
              transition: 'background .12s, color .12s',
            }}
          >
            <span style={{ transform: 'rotate(180deg)', display: 'inline-flex', flexShrink: 0 }}><Icon name="arrow" size={14} /></span>
            {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Back to app</span>}
          </button>
        </div>
      </aside>

      {/* ---- Main panel ---- */}
      <main style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
        {/* topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em' }}>ADMIN / {section.toUpperCase()}</div>
            <h1 className="font-display" style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{ADMIN_NAV.find(n => n[0] === section)[1]}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {openCount > 0 && (
              <button onClick={() => setSection('moderation')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 999, border: 'none', cursor: 'pointer', background: sTint('var(--clay)', 12), color: 'var(--clay)', fontSize: 12.5, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--clay)' }} /> {openCount} need review
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Avatar src={adminProfile?.avatarUrl ?? undefined} name={adminProfile?.name ?? adminEmail ?? 'Admin'} size={32} />
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: 13, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminEmail ?? 'Admin'}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>Owner</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 28px 60px' }}>
          {section === 'overview' && <AdminOverview openReports={openCount} users={users} flaggedProducts={flaggedCount} audit={audit} openAppeals={pendingAppeals} pendingChallenges={pendingChallenges.length} onSection={setSection} metrics={metrics} metricsError={metricsError} />}
          {section === 'moderation' && <AdminModeration getToken={adminToken} log={log} adminEmail={adminEmail} onCount={setOpenReports} />}
          {section === 'support' && <AdminSupport getToken={adminToken} log={log} onCounts={setOpenTickets} />}
          {section === 'orders' && <AdminOrders getToken={adminToken} log={log} onAttention={setFailedPayments} />}
          {section === 'verification' && <AdminVerification getToken={adminToken} log={log} />}
          {section === 'community-reports' && <AdminCommunityReports getToken={adminToken} log={log} adminEmail={adminEmail} />}
          {section === 'appeals' && <AdminAppeals getToken={adminToken} log={log} adminEmail={adminEmail} onCounts={setPendingAppeals} />}
          {section === 'challenges' && <AdminChallenges active={dbChallenges} pending={pendingChallenges} loaded={challengesLoaded} onApprove={approveChallenge} onUpdateReward={updateChallengeReward} onReject={rejectChallenge} onArchive={archiveChallenge} onCreate={createAdminChallenge} />}
          {section === 'products' && <AdminProducts getToken={adminToken} log={log} adminEmail={adminEmail} />}
          {section === 'carbon' && <AdminCarbonCredits getToken={adminToken} log={log} />}
          {section === 'users' && <AdminUsers users={users} loaded={usersLoaded} onStatus={setUserStatus} onRole={setUserRole} canSuspend={canSuspend} canBan={canBan} rosterAvailable={rosterAvailable} />}
          {section === 'sellers' && <AdminSellers getToken={adminToken} log={log} adminEmail={adminEmail} />}
          {section === 'shops' && <AdminShops getToken={adminToken} onSection={setSection} />}
          {section === 'payouts' && <AdminPayouts getToken={adminToken} log={log} adminEmail={adminEmail} onCounts={setPendingPayouts} />}
          {section === 'tax' && <AdminTax getToken={adminToken} adminEmail={adminEmail} />}
          {section === 'notifications' && <AdminNotifications getToken={adminToken} log={log} adminEmail={adminEmail} />}
          {section === 'roles' && <AdminRoles getToken={adminToken} log={log} adminEmail={adminEmail} />}
          {section === 'activity' && <AdminActivity audit={audit} />}
          {section === 'analytics' && <AdminAnalytics getToken={adminToken} />}
          {section === 'errors' && <AdminErrors getToken={adminToken} unseen={unseenErrors} onSeen={setUnseenErrors} />}
          {section === 'settings' && <AdminSettings getToken={adminToken} log={log} adminEmail={adminEmail} />}
        </div>
      </main>
    </div>
  );
};

// =====================================================================
// OVERVIEW
// =====================================================================
// Every figure here comes from /api/admin/metrics, fetched by the shell above.
// It used to query Supabase straight from the browser, which silently returned
// nothing for orders and seller applications — the console has a Privy session,
// not a Supabase one, so `auth.uid()` is null and no RLS policy on those tables
// can match.
function AdminOverview({ openReports, users, flaggedProducts, audit, openAppeals, pendingChallenges, onSection, metrics, metricsError }) {
  // Counted in SQL. It used to be `reports.filter(...)` over a mock array, so
  // the attention row reported on eight invented reports about nobody.
  const openCount = openReports ?? 0;
  const suspended = users.filter(u => u.status !== 'active').length;

  // A dash while loading or after a failure. Zero is a measurement and this
  // isn't one — showing it would be the same lie in a smaller font.
  const num = (v: number | undefined) => metrics ? (v ?? 0).toLocaleString() : '—';
  // Posts and the seller queue are plain table counts, so they're real either
  // way; GMV and member growth come from the aggregation functions and are only
  // meaningful once those exist.
  const agg = metrics?.available ? metrics : null;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {metricsError && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 12.5 }}>
          {metricsError}
        </div>
      )}

      {metrics && !metrics.available && (
        <div style={{ padding: '12px 16px', borderRadius: 14, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 30), fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)' }}>
          <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Sales and member figures are unavailable.</strong> Apply{' '}
          <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>033_admin_activity_and_analytics.sql</code> and they'll fill in on the next load.
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Members" value={agg ? agg.members.total.toLocaleString() : '—'} icon="users" sub="live count" trend={agg?.members.trend ?? undefined} />
        <SStat label="Posts" value={num(metrics?.posts)} icon="leaf" sub="live count" />
        <SStat label="GMV · 30d" value={agg ? sMoney(agg.gmv.total, 0) : '—'} icon="coin" accent="var(--sun)" sub="paid orders" trend={agg?.gmv.trend ?? undefined} />
        <SStat label="Seller queue" value={num(metrics?.pendingApplications)} icon="bolt" accent="var(--sky)" sub="pending review" />
      </div>

      {/* charts + attention */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>Gross marketplace volume</div>
              <div className="font-display tabular" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 2 }}>{agg ? sMoney(agg.gmv.total, 0) : '—'}</div>
            </div>
            <TrendTag value={agg?.gmv.trend} />
          </div>
          <div style={{ marginTop: 14 }}><Series data={metrics ? (agg?.gmv.series ?? null) : undefined} color="var(--green)" w={620} h={120} empty="No paid orders in the last 30 days" /></div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Needs your attention</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <AttnRow icon="flame" color="var(--clay)" label="Open reports" value={openCount} onClick={() => onSection('moderation')} />
            <AttnRow icon="flag" color="var(--sky)" label="Open appeals" value={openAppeals} onClick={() => onSection('appeals')} />
            <AttnRow icon="award" color="var(--sun)" label="Pending challenges" value={pendingChallenges ?? 0} onClick={() => onSection('challenges')} />
            <AttnRow icon="bag" color="var(--sun)" label="Flagged products" value={flaggedProducts} onClick={() => onSection('products')} />
            <AttnRow icon="leaf" color="var(--sky)" label="Seller applications" value={metrics?.pendingApplications ?? 0} onClick={() => onSection('sellers')} />
            <AttnRow icon="lock" color="var(--ink-3)" label="Suspended / banned" value={suspended} onClick={() => onSection('users')} />
          </div>
        </div>
      </div>

      {/* member growth + recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Member growth · 30 days</div>
          <div style={{ marginTop: 14 }}><Series data={metrics ? (agg?.members.series ?? null) : undefined} color="var(--sky)" w={420} h={90} empty="No members yet" /></div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Recent activity</span>
            <button onClick={() => onSection('activity')} style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>View log →</button>
          </div>
          <div style={{ display: 'grid', gap: 2 }}>
            {audit.length === 0
              ? <EmptyNote>No admin actions recorded yet</EmptyNote>
              : audit.slice(0, 5).map(a => <AuditLine key={a.id} a={a} compact />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// A dimmed line of plain text where a number or a chart would go. Used
// wherever the honest answer is "nothing has happened here yet" — an empty
// state that says so beats a chart flatlining at zero, which reads as a
// measurement of quiet rather than an absence of data.
function EmptyNote({ children, height }: { children: React.ReactNode; height?: number }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: height ?? 48, padding: '10px 0', fontSize: 12.5, color: 'var(--ink-4)', textAlign: 'center' }}>
      {children}
    </div>
  );
}

// Renders nothing when there's no comparison to make. A trend needs a previous
// window with something in it; the route sends null when there isn't one, and
// an arrow drawn anyway would be pointing at a number nobody measured.
function TrendTag({ value, invert }: { value?: number | null; invert?: boolean }) {
  if (value == null || !Number.isFinite(value)) return null;
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600, color: good ? 'var(--green)' : 'var(--clay)' }}>
      {value >= 0 ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

// SSpark interpolates across `data.length - 1`, so a single point divides by
// zero and draws NaN into the path. Anything under two points, or a series
// that's entirely zero, gets the empty note instead of a line.
//
// The three states are distinct on purpose: undefined is still loading, null is
// "we couldn't ask", and an empty or flat array is a real measurement of
// nothing. Collapsing the middle one into either of the others is how a chart
// ends up asserting something nobody counted.
function Series({ data, color, w, h, empty }: { data?: number[] | null; color: string; w: number; h: number; empty: string }) {
  if (data === undefined) return <EmptyNote height={h}>Loading…</EmptyNote>;
  if (data === null) return <EmptyNote height={h}>Not available yet</EmptyNote>;
  if (data.length < 2 || data.every(v => !v)) return <EmptyNote height={h}>{empty}</EmptyNote>;
  return <SSpark data={data} color={color} w={w} h={h} />;
}

function AttnRow({ icon, color, label, value, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg-2)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: sTint(color), color, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={icon} size={16} /></span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{label}</span>
      <span className="font-display tabular" style={{ fontSize: 19, fontWeight: 600, color: value > 0 ? 'var(--ink)' : 'var(--ink-4)' }}>{value}</span>
      <Icon name="chevron" size={15} color="var(--ink-4)" />
    </button>
  );
}

// shared audit line (used by overview + activity)
export function AuditLine({ a, compact }) {
  const tone = { trash: 'var(--clay)', lock: 'var(--sun)', flame: 'var(--clay)', check: 'var(--green)', close: 'var(--ink-3)', logout: 'var(--clay)', coin: 'var(--sun)', award: 'var(--sky)', send: 'var(--sky)' }[a.kind] || 'var(--ink-3)';
  // Derived at render rather than stored, so a console left open overnight
  // doesn't still claim the top entry happened "2m ago".
  const when = a.at ? relativeTime(a.at) : (a.time ?? '');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: compact ? '8px 0' : '12px 4px', borderBottom: compact ? 'none' : '1px solid var(--line)' }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: sTint(tone), color: tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={a.kind} size={15} /></span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.4 }}>
        <span style={{ fontWeight: 600 }}>{a.actor}</span> <span style={{ color: 'var(--ink-3)' }}>{a.action}</span> <span style={{ fontWeight: 500 }}>{a.target}</span>
      </div>
      <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{when}</span>
    </div>
  );
};

// =====================================================================
// MODERATION
// =====================================================================
// The content report queue: posts, comments, profiles and listings that
// members have reported from the feed.
//
// Everything here was mock. `reports` was MOCK_ADMIN.reports — eight invented
// rows about people who don't exist — and the three buttons were setState:
// "Remove content" matched a product by *title* and marked it removed in a
// local array, "Suspend author" edited a mock user by handle. Nothing left the
// browser, and there was nothing to leave with: the three report modals in the
// app wrote nowhere either, so a real report had no path to this screen at all.
//
// Migration 046 is the table those modals now write to. This reads it through
// /api/admin/content-reports, which is a server route for the usual reason —
// the console's Privy session leaves auth.uid() null, so the reporter-scoped
// policies on content_reports match nothing from here.
//
// Distinct from the Community Reports section next to it, which is migration
// 009's table and has a community owner in the escalation path. This one is
// the platform feed: no owner in between.
function AdminModeration({ getToken, log, adminEmail, onCount }: any) {
  const app = useApp();
  const [queue, setQueue] = React.useState<ReportedTarget[]>([]);
  const [counts, setCounts] = React.useState<ContentReportCounts | null>(null);
  const [filter, setFilter] = React.useState<'pending' | 'actioned' | 'dismissed' | 'all'>('pending');
  const [sel, setSel] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [available, setAvailable] = React.useState(true);
  const [canAct, setCanAct] = React.useState(false);
  const [canSuspend, setCanSuspend] = React.useState(false);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState('');
  const [removing, setRemoving] = React.useState(false);
  const [note, setNote] = React.useState('');

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;

  const load = React.useCallback(async (status: typeof filter) => {
    setLoading(true);
    setError('');
    const t = await tokenRef.current?.();
    const res = await listContentReports(t ?? null, status);
    setQueue(res.queue);
    setCounts(res.counts);
    setAvailable(res.available);
    setCanAct(res.canAct);
    setCanSuspend(res.canSuspend);
    if (res.error) setError(res.error);
    // Reported up so the rail badge and this screen cannot disagree. `open`
    // counts distinct targets, which is what the queue shows.
    if (res.counts) onCount?.(res.counts.open);
    setLoading(false);
  }, [onCount]);

  React.useEffect(() => { load(filter); }, [filter, load]);

  const selT = queue.find(q => q.key === sel) || queue[0] || null;

  React.useEffect(() => { setNote(''); setRemoving(false); }, [selT?.key]);

  const decide = async (decision: 'remove' | 'restore' | 'dismiss') => {
    if (!selT || busy) return;
    // A removal is appealable under migration 043 and the author reads the
    // reason, so the reason is not optional. The button asks for it rather
    // than the server rejecting an empty one after the fact.
    if (decision === 'remove' && !note.trim()) { setRemoving(true); return; }

    setBusy(decision);
    setError('');
    const t = await tokenRef.current?.();
    const { target, closed, error: err } = await decideContentReport(t ?? null, {
      targetType: selT.targetType,
      targetId: selT.targetId,
      decision,
      note: note.trim(),
      actorLabel: adminEmail ?? 'Admin',
    });
    setBusy('');

    if (err || !target) {
      setError(err || 'That could not be actioned.');
      return;
    }

    // Only now, and only from what the server said. The screen this replaces
    // moved cards on its own say-so and was wrong every time.
    setQueue(qs => qs.map(q => q.key === selT.key
      ? { ...q, status: target.status, pending: 0, removed: target.removed ?? q.removed, adminNote: target.adminNote, adminLabel: adminEmail ?? 'Admin', adminActionedAt: new Date().toISOString() }
      : q));
    setCounts(c => c ? {
      ...c,
      pending: Math.max(0, c.pending - (closed ?? 0)),
      open: Math.max(0, c.open - (selT.pending ? 1 : 0)),
      actioned: c.actioned + (target.status === 'actioned' ? (closed ?? 0) : 0),
      dismissed: c.dismissed + (target.status === 'dismissed' ? (closed ?? 0) : 0),
    } : c);
    if (counts && selT.pending) onCount?.(Math.max(0, counts.open - 1));
    setNote('');
    setRemoving(false);

    const what = selT.targetType;
    log?.(
      decision === 'remove' ? `removed a reported ${what}` : decision === 'restore' ? `restored a ${what}` : 'dismissed reports',
      selT.title,
      decision === 'remove' ? 'trash' : decision === 'restore' ? 'check' : 'close',
    );
    app.toast?.(decision === 'remove'
      ? { msg: 'Content removed', sub: `${closed ?? 0} report${closed === 1 ? '' : 's'} closed`, kind: 'success', icon: 'trash' }
      : decision === 'restore'
        ? { msg: 'Content restored', sub: 'It is visible again', kind: 'success', icon: 'check' }
        : { msg: 'Reports dismissed', sub: 'No action taken', icon: 'close' });
  };

  const suspendAuthor = async () => {
    if (!selT?.author || busy) return;
    setBusy('suspend');
    setError('');
    const t = await tokenRef.current?.();
    const { user, error: err } = await setAccountStatus(t ?? null, {
      id: selT.author.id,
      action: 'suspend',
      days: 7,
      reason: note.trim() || `Reported ${selT.targetType}: ${selT.reasons[0] ?? 'content policy'}`,
      actorLabel: adminEmail ?? 'Admin',
    });
    setBusy('');
    if (err || !user) { setError(err || 'Could not suspend that account.'); return; }

    setQueue(qs => qs.map(q => q.author?.id === selT.author!.id
      ? { ...q, author: { ...q.author!, status: 'suspended' as const } }
      : q));
    log?.('suspended account', '@' + (user.handle ?? selT.author.handle ?? ''), 'lock');
    app.toast?.({ msg: 'Account suspended', sub: '@' + (user.handle ?? selT.author.handle ?? '') + ' · 7 days', icon: 'lock' });
  };

  const TYPE_ICON: Record<string, string> = { post: 'edit', comment: 'msg', profile: 'user', product: 'bag' };
  const sevColor = (n: number) => n >= 5 ? 'var(--clay)' : n >= 2 ? 'var(--sun)' : 'var(--ink-3)';
  const when = (iso: string) => iso ? relativeTime(iso) : '';

  // Migration 046 missing is a different thing from a clear queue, and saying
  // "nothing to review" when the table isn't there is the exact failure this
  // rewrite exists to stop.
  if (!available && !loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--line-2)', borderRadius: 18, color: 'var(--ink-3)' }}>
        <Icon name="flame" size={26} color="var(--ink-4)" />
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12, color: 'var(--ink-2)' }}>Content reports aren’t set up yet</div>
        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
          Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>supabase/migrations/046_content_reports.sql</code> in the Supabase SQL editor.
          <br />Until then the report modals in the app have nowhere to write, and this queue can’t say whether it’s empty.
        </div>
        {error && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--clay)' }}>{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {([['pending', 'Open'], ['actioned', 'Actioned'], ['dismissed', 'Dismissed'], ['all', 'All']] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setFilter(k); setSel(null); }} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
            {l}
            {counts && k !== 'all' && (
              <span style={{ fontFamily: 'JetBrains Mono', opacity: .7 }}> · {k === 'pending' ? counts.pending : k === 'actioned' ? counts.actioned : counts.dismissed}</span>
            )}
          </button>
        ))}
        {counts && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
            {counts.open} {counts.open === 1 ? 'thing' : 'things'} awaiting a decision
          </span>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '11px 14px', borderRadius: 12, background: sTint('var(--clay)', 10), color: 'var(--clay)', fontSize: 13 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Loading the queue…</div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 16, alignItems: 'start' }}>
        {/* queue */}
        <div style={{ display: 'grid', gap: 10 }}>
          {queue.map(r => {
            const on = r.key === selT?.key;
            return (
              <button key={r.key} onClick={() => setSel(r.key)} style={{
                display: 'block', textAlign: 'left', width: '100%', cursor: 'pointer', padding: 16, borderRadius: 16,
                border: '1px solid ' + (on ? 'var(--green)' : 'var(--line)'), background: on ? 'var(--green-tint)' : 'var(--surface)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor(r.reports), flexShrink: 0 }} />
                  <span className="chip" style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', padding: '2px 7px' }}>{r.targetType}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--clay)' }}>{r.reasons[0]}</span>
                  {r.reasons.length > 1 && <span style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>+{r.reasons.length - 1}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{when(r.lastAt)}</span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em', opacity: r.exists ? 1 : .6 }}>
                  {r.excerpt || r.title}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  {r.author ? <><Avatar src={r.author.avatar ?? undefined} name={r.author.name} size={18} /> @{r.author.handle ?? '—'}</> : <span>author unknown</span>}
                  <span>· {r.reports} report{r.reports === 1 ? '' : 's'}</span>
                  {r.removed && <span className="chip" style={{ fontSize: 10.5, color: 'var(--clay)' }}>removed</span>}
                  {/* The status word straight from the table. S_STATUS has no
                      entry for these two, so SBadge renders them grey with the
                      real word rather than one of its own. */}
                  {r.status !== 'pending' && <SBadge status={r.status} size="sm" />}
                </div>
              </button>
            );
          })}
          {queue.length === 0 && (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14, border: '1px dashed var(--line-2)', borderRadius: 16 }}>
              {filter === 'pending' ? 'Nothing here — queue is clear' : 'No ' + filter + ' reports'}
            </div>
          )}
        </div>

        {/* detail */}
        {selT ? (
          <div style={{ position: 'sticky', top: 88, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: sTint('var(--clay)', 12), color: 'var(--clay)', display: 'grid', placeItems: 'center' }}>
                <Icon name={TYPE_ICON[selT.targetType] ?? 'flame'} size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{selT.reasons.join(' · ')}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                  {selT.targetType} · {selT.reports} report{selT.reports === 1 ? '' : 's'} · {when(selT.lastAt)}
                </div>
              </div>
              {selT.status !== 'pending' && <SBadge status={selT.status} />}
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>
                REPORTED {selT.targetType.toUpperCase()}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{selT.title}</div>

              {!selT.exists && (
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-2)', fontSize: 12.5, color: 'var(--ink-3)' }}>
                  This has since been deleted. The reports are still here so they can be closed.
                </div>
              )}

              {selT.excerpt && (
                <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: 'var(--bg-2)', borderLeft: '3px solid var(--clay)', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, fontStyle: 'italic' }}>
                  {selT.excerpt}
                </div>
              )}

              {selT.removed && (
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: sTint('var(--clay)', 8), fontSize: 12.5, color: 'var(--clay)', lineHeight: 1.5 }}>
                  Removed{selT.removedReason ? ' — ' + selT.removedReason : ''}. Only its author can still see it, so they can appeal.
                </div>
              )}

              {/* author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                <Avatar src={selT.author?.avatar ?? undefined} name={selT.author?.name ?? 'Member'} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {selT.author?.name ?? 'Unknown author'}
                    {selT.author?.verified && <VerifiedTick size={13} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{selT.author?.handle ?? '—'}</div>
                </div>
                {selT.author && selT.author.status !== 'active' && <SBadge status={selT.author.status} size="sm" />}
              </div>

              {/* who reported it, and anything they typed */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 8 }}>REPORTED BY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selT.reporters.map(p => (
                    <span key={p.id} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <Avatar src={p.avatar ?? undefined} name={p.name} size={16} /> @{p.handle ?? '—'}
                    </span>
                  ))}
                  {selT.reporters.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>reporter no longer has an account</span>}
                </div>
                {selT.notes.map((n, i) => (
                  <div key={i} style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, paddingLeft: 10, borderLeft: '2px solid var(--line-2)' }}>{n}</div>
                ))}
              </div>

              {selT.adminNote && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--bg-2)', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--ink-2)' }}>{selT.adminLabel ?? 'Admin'}</strong>: {selT.adminNote}
                </div>
              )}

              {/* actions */}
              {!canAct ? (
                <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: 'var(--bg-2)', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                  Your role can read this queue but not act on it.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
                  {/* The note is the reason on the audit line and the thing the
                      author reads if they appeal — it is required for a removal. */}
                  {(removing || selT.status === 'pending') && selT.removable && !selT.removed && (
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder={removing ? 'Why is this being removed? The author can appeal and will read this.' : 'Note (required to remove, optional otherwise)'}
                      rows={removing ? 3 : 2}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + (removing && !note.trim() ? 'var(--clay)' : 'var(--line)'), background: 'var(--bg)', fontSize: 13, color: 'var(--ink-1)', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  )}

                  {selT.removable && !selT.removed && (
                    <button className="btn btn-green" disabled={!!busy} onClick={() => decide('remove')} style={{ justifyContent: 'center', padding: 12, opacity: busy ? .6 : 1 }}>
                      <Icon name="trash" size={15} /> {busy === 'remove' ? 'Removing…' : removing ? 'Confirm removal' : 'Remove content'}
                    </button>
                  )}
                  {selT.removable && selT.removed && (
                    <button className="btn btn-ghost" disabled={!!busy} onClick={() => decide('restore')} style={{ justifyContent: 'center', padding: 12 }}>
                      <Icon name="check" size={15} /> {busy === 'restore' ? 'Restoring…' : 'Put it back'}
                    </button>
                  )}
                  {!selT.removable && (
                    <div style={{ padding: '11px 14px', borderRadius: 10, background: 'var(--bg-2)', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                      An account isn’t content — there’s nothing here to take down. Suspend it instead, or leave it and dismiss.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    {selT.author && canSuspend && selT.author.status === 'active' && (
                      <button className="btn btn-ghost" disabled={!!busy} onClick={suspendAuthor} style={{ flex: 1, justifyContent: 'center', color: 'var(--sun)', borderColor: sTint('var(--sun)', 30) }}>
                        <Icon name="lock" size={15} /> {busy === 'suspend' ? 'Suspending…' : 'Suspend author'}
                      </button>
                    )}
                    {selT.pending > 0 && (
                      <button className="btn btn-ghost" disabled={!!busy} onClick={() => decide('dismiss')} style={{ flex: 1, justifyContent: 'center' }}>
                        {busy === 'dismiss' ? 'Dismissing…' : 'Dismiss'}
                      </button>
                    )}
                  </div>

                  {selT.pending === 0 && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-4)', textAlign: 'center', paddingTop: 4 }}>
                      Every report about this has been answered.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      )}
    </div>
  );
}

// =====================================================================
// ANALYTICS
// =====================================================================
// Everything here is measured from analytics_events, which the app writes to on
// every pageview (lib/analytics.ts → /api/track). Until migration 033 is applied
// there is nowhere to write, so the page will read empty — which is the true
// state of a platform that has never counted a visit, and the state the numbers
// that used to sit here were hiding.
function AdminAnalytics({ getToken }) {
  const [a, setA] = React.useState<AnalyticsMetrics | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  React.useEffect(() => {
    (async () => {
      let t: string | null = null;
      try { t = await tokenRef.current(); } catch {}
      const { metrics, error: err } = await fetchAnalyticsMetrics(t);
      setA(metrics ?? null);
      setError(err ?? null);
    })();
  }, []);

  const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 } as const;
  // Loaded, and with at least one pageview behind it. Short of that the tiles
  // show a dash — a "0" here would be read as a count, and nothing was counted.
  const m = a?.collecting ? a : null;
  const dash = (v: React.ReactNode) => m ? v : '—';

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {a && !a.available && (
        <div style={{ ...card, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: sTint('var(--sun)'), color: 'var(--sun)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="bolt" size={17} /></span>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-3)' }}>
            <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Analytics aren't set up yet.</strong> Apply{' '}
            <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>033_admin_activity_and_analytics.sql</code> in Supabase — until then there's
            nowhere to record visits, so nothing on this page can be measured.
          </div>
        </div>
      )}

      {a && a.available && !a.collecting && (
        <div style={{ ...card, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: sTint('var(--sky)'), color: 'var(--sky)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="bolt" size={17} /></span>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-3)' }}>
            <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>No pageviews recorded yet.</strong> Collection is live — these fill in as people
            visit. Admin pages aren't counted, and visitors with Do Not Track on are skipped.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Page views · 7d" value={dash(m?.pageViews.value.toLocaleString())} icon="bolt" accent="var(--sky)" trend={m?.pageViews.trend ?? undefined} sub="vs previous 7 days" />
        <SStat label="Avg. session" value={dash(m ? duration(m.session.seconds) : '')} icon="clock" trend={m?.session.trend ?? undefined} sub="time between first and last view" />
        {/* Retention has no trend: comparing it to a prior window needs two full
            30-day cohorts, and the number is meaningless until one exists. */}
        <SStat label="Retention · 30d" value={dash(m?.retention.pct == null ? '—' : `${m.retention.pct}%`)} icon="users" accent="var(--green)"
               sub={m?.retention.base ? `of ${m.retention.base.toLocaleString()} returning` : 'no prior cohort yet'} />
        {/* Paid orders are counted from the orders table, so that figure stands
            on its own even with no traffic data to divide it by. */}
        <SStat label="Conversion" value={dash(m?.conversion.pct == null ? '—' : `${m.conversion.pct.toFixed(1)}%`)} icon="leaf" accent="var(--sun)"
               trend={m?.conversion.trend ?? undefined} sub={a?.available ? `${a.conversion.orders.toLocaleString()} paid orders` : 'paid orders per session'} />
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Traffic · 30 days</div>
        <Series data={a ? (a.available ? a.traffic : null) : undefined} color="var(--sky)" w={900} h={120} empty="No pageviews recorded in the last 30 days" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Top pages</div>
          {!a?.topPages.length
            ? <EmptyNote>{!a ? 'Loading…' : a.available ? 'No pageviews in the last 30 days' : 'Not available yet'}</EmptyNote>
            : a.topPages.map(p => (
              <div key={p.path} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ flex: 1, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.path}>{pageLabel(p.path)}</span>
                <div style={{ width: 120, height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ width: `${p.pct}%`, height: '100%', borderRadius: 999, background: 'var(--green)' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', width: 36, textAlign: 'right', flexShrink: 0 }}>{p.pct}%</span>
              </div>
            ))}
        </div>
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Acquisition sources</div>
          {!a?.sources.length
            ? <EmptyNote>{!a ? 'Loading…' : a.available ? 'No sessions in the last 30 days' : 'Not available yet'}</EmptyNote>
            : a.sources.map(src => {
              const meta = SOURCE_LABELS[src.source] ?? { label: src.source, color: 'var(--ink-3)' };
              return (
                <div key={src.source} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{meta.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{src.pct}%</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// ERRORS
// =====================================================================
// Server failures, from public.error_log (migration 034).
//
// Only logError() lands here — not logInfo, not logWarn. Those stay on the
// console, where volume costs nothing; a row per request would make Postgres
// the busiest thing in the stack and, on a bad day, the thing that falls over
// because something else already had.
//
// Two things this shows that a log drain makes tedious: how many times a
// failure has happened rather than just that it happened, and a lookup by
// request id — the code failure() already returns to the browser and puts in
// the x-request-id header. Someone reports "it broke", reads out six
// characters, and this finds the line.
//
// Everything on this page is the detail failure() deliberately withholds from
// users: driver messages naming tables and columns, stacks naming file paths.
// That is the point of the page, and the reason the route behind it is gated
// on a verified Privy token.
function AdminErrors({ getToken, unseen, onSeen }) {
  const [feed, setFeed] = React.useState<ErrorFeed | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [days, setDays] = React.useState(7);
  const [open, setOpen] = React.useState<string | null>(null);
  const [lookup, setLookup] = React.useState('');
  const [found, setFound] = React.useState<any[] | null>(null);
  const app = useApp();

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    try { return await tokenRef.current(); } catch { return null; }
  }, []);

  const load = React.useCallback(async () => {
    const { feed: f, error: err } = await fetchErrors(await token(), days);
    setFeed(f ?? null);
    setError(err ?? null);
    onSeen?.(f?.unseen ?? 0);
  }, [token, days, onSeen]);

  React.useEffect(() => { load(); }, [load]);

  const markSeen = async (fingerprint?: string) => {
    const { error: err } = await markErrorsSeen(await token(), fingerprint);
    if (err) { app.toast?.({ msg: "Couldn't update", sub: err, kind: 'error', icon: 'close' }); return; }
    load();
  };

  const search = async () => {
    const id = lookup.trim();
    if (!id) { setFound(null); return; }
    const { occurrences } = await lookupError(await token(), id);
    setFound(occurrences);
  };

  const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 } as const;
  const groups = feed?.groups ?? [];
  const total = groups.reduce((n, g) => n + g.occurrences, 0);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {feed && !feed.available && (
        <div style={{ ...card, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: sTint('var(--sun)'), color: 'var(--sun)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="alert" size={17} /></span>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-3)' }}>
            <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>The error log isn't set up yet.</strong> Apply{' '}
            <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>034_error_log.sql</code> in Supabase. Until then failures still go to the
            server console and Vercel's log drain — there's just nowhere to keep them.
          </div>
        </div>
      )}

      {/* Tiles. A zero here is a real measurement — unlike Analytics, where
          nothing recorded and nothing happened are different facts, an error
          log with no rows genuinely means nothing failed. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <SStat label="Unread" value={feed ? (feed.unseen ?? 0).toLocaleString() : '—'} icon="alert"
               accent={feed?.unseen ? 'var(--clay)' : 'var(--green)'} sub="across all time" />
        <SStat label={`Distinct failures · ${days}d`} value={feed ? groups.length.toLocaleString() : '—'} icon="flame" accent="var(--sun)" sub="grouped by cause" />
        <SStat label={`Occurrences · ${days}d`} value={feed ? total.toLocaleString() : '—'} icon="clock" accent="var(--sky)" sub="every time one fired" />
      </div>

      {/* Lookup by request id — the reason the id is in the error response. */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Find by request id</span>
        <input
          value={lookup}
          onChange={e => setLookup(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(); }}
          placeholder="e.g. k3f9a2mx7q"
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink)', fontFamily: 'JetBrains Mono', fontSize: 13 }}
        />
        <button className="btn btn-ghost" onClick={search}><Icon name="search" size={13} /> Look up</button>
        {found != null && <button className="btn btn-ghost" onClick={() => { setFound(null); setLookup(''); }}>Clear</button>}
        <div style={{ flexBasis: '100%', fontSize: 12, color: 'var(--ink-4)' }}>
          Every failed request returns this code to the browser and in an <code style={{ fontFamily: 'JetBrains Mono' }}>x-request-id</code> header.
        </div>
      </div>

      {found != null && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
            {found.length ? `${found.length} occurrence${found.length === 1 ? '' : 's'} for that id` : 'Nothing logged under that id'}
          </div>
          {found.map(o => <ErrorDetail key={o.id} scope={o.scope} message={o.message} errorMessage={o.errorMessage} stack={o.stack} path={o.path} requestId={o.requestId} at={o.at} />)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 7, 30].map(d => (
            <button key={d} onClick={() => setDays(d)} className="btn btn-ghost"
                    style={days === d ? { background: sTint('var(--green)'), color: 'var(--green)' } : undefined}>
              {d === 1 ? '24h' : `${d}d`}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={load}>Refresh</button>
        {!!feed?.unseen && (
          <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => markSeen()}>
            <Icon name="check" size={13} /> Mark all read
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!feed
          ? <div style={card}><EmptyNote>Loading…</EmptyNote></div>
          : !feed.available
            ? null
            : !groups.length
              ? <div style={card}><EmptyNote height={90}>Nothing has failed in the last {days === 1 ? '24 hours' : `${days} days`}.</EmptyNote></div>
              : groups.map(g => (
                <div key={g.fingerprint} style={{ background: 'var(--surface)', border: '1px solid ' + (g.unseen ? sTint('var(--clay)', 40) : 'var(--line)'), borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '15px 18px' }}>
                    <span style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: sTint('var(--clay)'), color: 'var(--clay)' }}>
                      <Icon name="alert" size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', background: 'var(--bg-2)', padding: '2px 7px', borderRadius: 6 }}>{g.scope}</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{g.message}</span>
                        {!!g.unseen && (
                          <span style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--clay)', background: sTint('var(--clay)'), padding: '2px 7px', borderRadius: 6 }}>NEW</span>
                        )}
                      </div>
                      {g.errorMessage && (
                        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.errorMessage}>
                          {g.errorMessage}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>
                        {g.occurrences.toLocaleString()}× · last {relativeTime(g.lastSeen)} · first {relativeTime(g.firstSeen)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost" onClick={() => setOpen(open === g.fingerprint ? null : g.fingerprint)}>
                        {open === g.fingerprint ? 'Hide' : 'Details'}
                      </button>
                      {!!g.unseen && (
                        <button className="btn btn-ghost" onClick={() => markSeen(g.fingerprint)}>
                          <Icon name="check" size={13} /> Read
                        </button>
                      )}
                    </div>
                  </div>
                  {open === g.fingerprint && (
                    <div style={{ borderTop: '1px solid var(--line)', padding: '14px 18px' }}>
                      <ErrorDetail scope={g.scope} message={g.message} errorMessage={g.errorMessage} stack={g.stack} path={g.path} requestId={g.requestId} at={g.lastSeen} latest />
                    </div>
                  )}
                </div>
              ))}
      </div>
    </div>
  );
}

// One occurrence, expanded. Shared by the grouped list and the request-id
// lookup so a stack reads the same either way.
function ErrorDetail({ scope, message, errorMessage, stack, path, requestId, at, latest }: any) {
  const row = (label: string, value: React.ReactNode) => value ? (
    <div style={{ display: 'flex', gap: 10, fontSize: 12.5, marginBottom: 5 }}>
      <span style={{ color: 'var(--ink-4)', width: 82, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--ink-2)', wordBreak: 'break-all' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ marginBottom: 12 }}>
      {latest && <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 8 }}>Most recent occurrence</div>}
      {row('Scope', scope)}
      {row('Message', message)}
      {row('Error', errorMessage)}
      {row('Path', path)}
      {row('Request id', requestId)}
      {row('When', at ? new Date(at).toLocaleString() : null)}
      {stack && (
        <pre style={{
          marginTop: 10, padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--line)',
          fontFamily: 'JetBrains Mono', fontSize: 11.5, lineHeight: 1.6, color: 'var(--ink-3)',
          overflowX: 'auto', whiteSpace: 'pre', margin: '10px 0 0',
        }}>{stack}</pre>
      )}
    </div>
  );
}

// =====================================================================
// PAYOUTS
// =====================================================================
// Real payout_requests through /api/admin/payouts, gated on `payouts.manage`.
//
// Two things this screen is careful about, both because it is the screen where
// money leaves:
//
//   · Approve and "record as sent" are separate. Approving records the
//     decision; nothing in this codebase can move funds — there are no PayPal
//     API credentials and no Stripe Connect onboarding — so a person sends
//     every transfer and comes back to record the reference. A single green
//     button that implied the money had gone would be the most expensive lie
//     this console could tell.
//   · The account details are not in the queue payload. Revealing them is a
//     separate request that writes an audit line in the same transaction.
//
// What it replaces: six invented sellers with literal trust scores and dispute
// counts, where Approve moved a row in React state and nothing else.
const PAYOUT_STATUS_COLOR: Record<string, string> = {
  pending: 'var(--sun)', approved: 'var(--green)', rejected: 'var(--clay)', on_hold: 'var(--ink-3)',
  // Blue-ish rather than green: 'Sending' must not read as a settlement at a
  // glance, because it isn't one.
  processing: 'var(--sky)', paid: 'var(--green)',
};
const PAYOUT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', on_hold: 'On hold',
  processing: 'Sending', paid: 'Sent',
};
// Cents everywhere until the last moment — sMoney takes dollars.
const pMoney = (cents: number, dp?: number) => sMoney((cents ?? 0) / 100, dp);

const METHOD_WORD: Record<string, string> = {
  paypal: 'PayPal', stripe: 'Stripe', uglycash: 'UglyCash', bank: 'bank transfer',
};

function DestLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--ink-4)' }}>{label}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 600, wordBreak: 'break-all', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function AdminPayouts({ getToken, log, adminEmail, onCounts }: any) {
  const app = useApp();
  const [rows, setRows] = React.useState<PayoutRow[]>([]);
  const [available, setAvailable] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('pending');
  const [sel, setSel] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [rejectModal, setRejectModal] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [paidModal, setPaidModal] = React.useState<string | null>(null);
  const [reference, setReference] = React.useState('');
  const [destination, setDestination] = React.useState<PayoutDestination | null>(null);
  // Sending has its own confirmation because it is the one button on this screen
  // that moves money without a person doing anything else afterwards.
  const [sendModal, setSendModal] = React.useState<string | null>(null);

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    return (await tokenRef.current?.().catch(() => null)) ?? null;
  }, []);

  // The whole queue in one request, filtered here — the chips need counts for
  // every status, and the rail badge needs the unfiltered pending count.
  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listPayouts(await token(), { limit: 300 });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setError(null);
    setAvailable(res.available !== false);
    setRows(res.payouts ?? []);
    if (typeof res.pending === 'number') onCounts?.(res.pending);
  }, [token, onCounts]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(p => filter === 'all' ? true : p.status === filter);
  const selP = filtered.find(p => p.id === sel) ?? filtered[0] ?? null;

  // The reveal is per-payout and audited, so it is dropped the moment the
  // selection moves rather than left on screen against the next seller's row.
  React.useEffect(() => { setDestination(null); }, [selP?.id]);

  const pendingRows = rows.filter(p => p.status === 'pending');
  const approvedRows = rows.filter(p => p.status === 'approved');
  const sendingRows = rows.filter(p => p.status === 'processing');
  const totalPending = pendingRows.reduce((s, p) => s + p.amountCents, 0);
  const totalApproved = approvedRows.reduce((s, p) => s + p.netCents, 0);

  const decide = async (id: string, status: 'approved' | 'rejected' | 'on_hold', note?: string) => {
    setBusy(true);
    const row = rows.find(p => p.id === id) ?? null;
    const { payout, error: err } = await reviewPayout(await token(), id, status, note, adminEmail ?? 'Admin');
    setBusy(false);
    if (err || !payout) {
      // The balance guard, the frozen-account guard, the no-method guard and
      // "already sent" all come back here in the database's own words, naming
      // the numbers — so "why can't I approve this" is answered on screen.
      setError(err ?? 'That payout could not be updated.');
      app.toast?.({ msg: 'Could not update that payout', sub: err ?? undefined, kind: 'error', icon: 'close' });
      return;
    }
    setError(null);
    setRows(ps => ps.map(p => p.id === id ? { ...p, ...payout } as PayoutRow : p));
    onCounts?.(rows.filter(p => p.id !== id && p.status === 'pending').length);
    log?.(
      status === 'approved' ? 'approved a payout' : status === 'rejected' ? 'rejected a payout' : 'put a payout on hold',
      row?.seller.handle ? '@' + row.seller.handle : '',
      status === 'approved' ? 'coin' : status === 'rejected' ? 'close' : 'lock',
    );
    app.toast?.({
      msg: status === 'approved' ? 'Approved — not sent yet' : status === 'rejected' ? 'Payout rejected' : 'Payout on hold',
      sub: status === 'approved' ? 'Send the transfer, then record the reference.' : pMoney(row?.amountCents ?? 0, 0),
      kind: status === 'approved' ? 'success' : 'error',
      icon: status === 'approved' ? 'coin' : status === 'rejected' ? 'close' : 'lock',
    });
  };

  const reveal = async () => {
    if (!selP) return;
    setBusy(true);
    const { destination: d, error: err } = await revealDestination(await token(), selP.id, adminEmail ?? 'Admin');
    setBusy(false);
    if (err || !d) {
      app.toast?.({ msg: 'Could not open the details', sub: err ?? undefined, kind: 'error', icon: 'close' });
      return;
    }
    setDestination(d);
  };

  const markSent = async () => {
    if (!paidModal || !reference.trim()) return;
    setBusy(true);
    const row = rows.find(p => p.id === paidModal) ?? null;
    const { payout, error: err } = await markPayoutPaid(await token(), paidModal, reference.trim(), adminEmail ?? 'Admin');
    setBusy(false);
    if (err || !payout) {
      app.toast?.({ msg: 'Could not record that', sub: err ?? undefined, kind: 'error', icon: 'close' });
      return;
    }
    setRows(ps => ps.map(p => p.id === paidModal ? { ...p, ...payout } as PayoutRow : p));
    log?.('recorded a payout as sent', row?.seller.handle ? '@' + row.seller.handle : '', 'coin');
    app.toast?.({ msg: 'Recorded as sent', sub: pMoney(row?.netCents ?? 0) + ' · ref ' + reference.trim(), kind: 'success', icon: 'coin' });
    setPaidModal(null);
    setReference('');
  };

  // Send it through Stripe or PayPal. The three outcomes are kept apart on
  // screen exactly as they are kept apart in the database: Stripe transferred it
  // and the money is gone; PayPal took it and will confirm later; it failed and
  // the payout is back to approved with the reason on the row.
  const send = async () => {
    if (!sendModal) return;
    const row = rows.find(p => p.id === sendModal) ?? null;
    setBusy(true);
    const res = await dispatchPayout(await token(), sendModal, adminEmail ?? 'Admin');
    setBusy(false);
    setSendModal(null);

    if (res.error) {
      setError(res.error);
      app.toast?.({ msg: 'Not sent', sub: res.error, kind: 'error', icon: 'close' });
      // The row moved server-side either way — back to approved, with the
      // provider's reason stored on it — so the queue is refetched rather than
      // patched from a response that carried no row.
      load();
      return;
    }

    setError(null);
    if (res.payout) setRows(ps => ps.map(p => p.id === sendModal ? { ...p, ...res.payout } as PayoutRow : p));

    const who = row?.seller.handle ? '@' + row.seller.handle : '';
    if (res.sent) {
      log?.('sent a payout', who, 'coin');
      app.toast?.({ msg: 'Sent', sub: res.message ?? pMoney(row?.netCents ?? 0), kind: 'success', icon: 'coin' });
    } else {
      log?.(res.duplicate ? 'found a payout already with PayPal' : 'submitted a payout to PayPal', who, 'send');
      app.toast?.({
        msg: res.duplicate ? 'Already with PayPal' : 'Submitted — not settled yet',
        sub: res.message,
        kind: res.duplicate ? 'error' : 'success',
        icon: 'send',
      });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !rejectModal) return;
    await decide(rejectModal, 'rejected', rejectReason.trim());
    setRejectModal(null);
    setRejectReason('');
  };

  // Not the same as an empty queue, and the difference matters: "no one is
  // waiting to be paid" is a claim about the platform, and it can't be made
  // when the table the question would be asked of doesn't exist.
  if (!available) {
    return (
      <div style={{ padding: '16px 20px', borderRadius: 16, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 30), fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-3)' }}>
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>The payout queue isn&rsquo;t set up on this database yet.</strong><br />
        Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>supabase/migrations/042_payout_methods.sql</code> and reload.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13 }}>{error}</div>
      )}

      {/* Summary row. Every figure counts real rows. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Pending requests" value={pendingRows.length} icon="clock" accent="var(--sun)" sub="awaiting a decision" />
        <SStat label="Pending volume" value={pMoney(totalPending, 0)} icon="coin" accent="var(--sun)" sub="not yet decided" />
        <SStat label="Approved, unsent" value={approvedRows.length} icon="check" accent="var(--green)" sub={pMoney(totalApproved, 0) + ' to transfer'} />
        {/* With a provider and not yet confirmed. Shown in place of "On hold"
            only when there is something in it — an always-zero tile teaches
            people to stop reading the row. */}
        {sendingRows.length > 0 ? (
          <SStat label="With the provider" value={sendingRows.length} icon="send" accent="var(--sky)" sub="submitted, not confirmed" />
        ) : (
          <SStat label="On hold" value={rows.filter(p => p.status === 'on_hold').length} icon="lock" accent="var(--ink-3)" sub="under review" />
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[['pending', 'Pending'], ['approved', 'Approved'], ['processing', 'Sending'], ['on_hold', 'On hold'], ['rejected', 'Rejected'], ['paid', 'Sent'], ['all', 'All']].map(([k, l]) => (
          <button key={k} onClick={() => { setFilter(k); setSel(null); }} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
            {l}
            {k === 'pending' && pendingRows.length > 0 && <span style={{ fontFamily: 'JetBrains Mono', opacity: .7 }}> · {pendingRows.length}</span>}
            {k === 'approved' && approvedRows.length > 0 && <span style={{ fontFamily: 'JetBrains Mono', opacity: .7 }}> · {approvedRows.length}</span>}
            {k === 'processing' && sendingRows.length > 0 && <span style={{ fontFamily: 'JetBrains Mono', opacity: .7 }}> · {sendingRows.length}</span>}
          </button>
        ))}
        <button onClick={load} className="chip" style={{ cursor: 'pointer', marginLeft: 'auto' }}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 16, alignItems: 'start' }}>
        {/* Queue */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr .9fr 1.1fr .9fr', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            <span>Seller</span><span>Amount</span><span>Destination</span><span>Status</span>
          </div>
          {filtered.map(p => {
            const on = p.id === selP?.id;
            return (
              <button key={p.id} onClick={() => setSel(p.id)} style={{
                display: 'grid', gridTemplateColumns: '1.8fr .9fr 1.1fr .9fr', gap: 12, width: '100%', textAlign: 'left',
                padding: '14px 18px', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', alignItems: 'center',
                background: on ? 'var(--green-tint)' : 'transparent',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <Avatar src={p.seller.avatarUrl ?? undefined} name={p.seller.name ?? p.seller.handle ?? 'Seller'} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.seller.name ?? 'Seller'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{relativeTime(p.createdAt)}</div>
                  </div>
                </span>
                <span className="tabular" style={{ fontSize: 14, fontWeight: 700 }}>{pMoney(p.amountCents, 0)}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.destination}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: sTint(PAYOUT_STATUS_COLOR[p.status], 14), color: PAYOUT_STATUS_COLOR[p.status], fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                    {PAYOUT_STATUS_LABEL[p.status]}
                  </span>
                  {p.seller.frozen && <Icon name="lock" size={12} color="var(--clay)" />}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>
              {loading ? 'Loading…' : 'No requests in this view'}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selP && (
          <div style={{ position: 'sticky', top: 88, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar src={selP.seller.avatarUrl ?? undefined} name={selP.seller.name ?? 'Seller'} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selP.seller.name ?? 'Seller'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                  @{selP.seller.handle ?? '—'}{selP.seller.since ? ' · joined ' + new Date(selP.seller.since).toLocaleDateString() : ''}
                </div>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 7, background: sTint(PAYOUT_STATUS_COLOR[selP.status], 14), color: PAYOUT_STATUS_COLOR[selP.status], fontFamily: 'JetBrains Mono' }}>
                {PAYOUT_STATUS_LABEL[selP.status]}
              </span>
            </div>

            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              {selP.seller.frozen && (
                <div style={{ padding: '11px 14px', borderRadius: 11, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 24), fontSize: 12.5, color: 'var(--clay)', lineHeight: 1.5 }}>
                  This account is suspended or banned right now. Approval is refused while that holds.
                </div>
              )}

              {/* Amount breakdown */}
              <div style={{ background: 'var(--bg-2)', borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Requested amount</span>
                  <span className="font-display tabular" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>{pMoney(selP.amountCents)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>
                  <span>Withdrawal fee</span><span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>−{pMoney(selP.feeCents)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>
                  <span>Seller receives</span><span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{pMoney(selP.netCents)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
                  <span>Destination</span><span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{selP.destination}</span>
                </div>
              </div>

              {/* What the seller has actually earned, computed in SQL from
                  delivered items minus what is already committed — the same
                  numbers the approval guard uses, so a refusal is visible
                  before the button is pressed rather than after. */}
              <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>CLEARED BALANCE</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>
                  <span>Earned on delivered orders</span><span style={{ color: 'var(--ink-2)' }}>{pMoney(selP.ledger.earnedCents)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>
                  <span>Already approved or sent</span><span style={{ color: 'var(--ink-2)' }}>−{pMoney(selP.ledger.committedCents)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono', paddingTop: 6, borderTop: '1px solid var(--line)', color: selP.ledger.availableCents < selP.amountCents ? 'var(--clay)' : 'var(--green)' }}>
                  <span>Available to approve</span><span>{pMoney(selP.ledger.availableCents)}</span>
                </div>
              </div>

              {/* Signals — counted rows, not a score someone made up. */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>DELIVERED</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{selP.signals.deliveredItems}</div>
                </div>
                <div style={{ background: selP.signals.refundedOrders > 0 ? sTint('var(--clay)', 12) : 'var(--bg-2)', border: selP.signals.refundedOrders > 0 ? '1px solid ' + sTint('var(--clay)', 28) : '1px solid transparent', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 10.5, color: selP.signals.refundedOrders > 0 ? 'var(--clay)' : 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>REFUNDED</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: selP.signals.refundedOrders > 0 ? 'var(--clay)' : 'var(--ink)' }}>{selP.signals.refundedOrders}</div>
                </div>
                <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>PAID BEFORE</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{selP.signals.priorPayouts}</div>
                </div>
              </div>

              {selP.rejectReason && (
                <div style={{ padding: '11px 14px', borderRadius: 11, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 24), fontSize: 13, color: 'var(--clay)', lineHeight: 1.5 }}>
                  <strong>Rejection reason:</strong> {selP.rejectReason}
                </div>
              )}
              {selP.adminNote && !selP.rejectReason && (
                <div style={{ padding: '11px 14px', borderRadius: 11, background: 'var(--bg-2)', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--ink-2)' }}>Note:</strong> {selP.adminNote}
                </div>
              )}

              {selP.status === 'pending' && (
                <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                  <button className="btn btn-green" disabled={busy} onClick={() => decide(selP.id, 'approved')} style={{ justifyContent: 'center', padding: '12px', opacity: busy ? .6 : 1 }}>
                    <Icon name="check" size={15} /> Approve · {pMoney(selP.amountCents, 0)}
                  </button>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', textAlign: 'center', lineHeight: 1.45 }}>
                    Approving clears it for transfer. It does not send the money.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" disabled={busy} onClick={() => decide(selP.id, 'on_hold')} style={{ flex: 1, justifyContent: 'center', color: 'var(--ink-3)' }}>
                      <Icon name="lock" size={14} /> Hold
                    </button>
                    <button className="btn btn-ghost" disabled={busy} onClick={() => { setRejectModal(selP.id); setRejectReason(''); }} style={{ flex: 1, justifyContent: 'center', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
                      <Icon name="close" size={14} /> Reject
                    </button>
                  </div>
                </div>
              )}

              {selP.status === 'on_hold' && (
                <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-2)', fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center' }}>
                    This payout is on hold. Review and approve or reject.
                  </div>
                  <button className="btn btn-green" disabled={busy} onClick={() => decide(selP.id, 'approved')} style={{ justifyContent: 'center', padding: '12px' }}>
                    <Icon name="check" size={15} /> Approve · {pMoney(selP.amountCents, 0)}
                  </button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => { setRejectModal(selP.id); setRejectReason(''); }} style={{ justifyContent: 'center', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
                    <Icon name="close" size={14} /> Reject
                  </button>
                </div>
              )}

              {selP.status === 'approved' && (
                <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                  <div style={{ padding: '11px 14px', borderRadius: 11, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 26), fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                    Cleared for transfer, <strong style={{ color: 'var(--ink-2)' }}>not sent yet</strong>.{' '}
                    {selP.dispatchable
                      ? <>Send {pMoney(selP.netCents)} through {METHOD_WORD[selP.methodKind ?? ''] ?? 'the provider'} below, or do it by hand and record the reference.</>
                      : <>Open the details, send {pMoney(selP.netCents)} by {METHOD_WORD[selP.methodKind ?? ''] ?? 'the seller’s chosen method'}, then record the reference.</>}
                  </div>

                  {/* The last attempt's reason, kept on the row by
                      admin_dispatch_settle. Shown before the button rather than
                      in a toast that has already gone. */}
                  {selP.dispatchError && (
                    <div style={{ padding: '11px 14px', borderRadius: 11, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 24), fontSize: 12.5, color: 'var(--clay)', lineHeight: 1.55 }}>
                      <strong>Last attempt failed:</strong> {selP.dispatchError}
                    </div>
                  )}

                  {destination ? (
                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-2)', display: 'grid', gap: 6, fontSize: 12.5, fontFamily: 'JetBrains Mono' }}>
                      {destination.paypalEmail && <DestLine label="PayPal" value={destination.paypalEmail} />}
                      {destination.stripeAccountId && <DestLine label="Stripe account" value={destination.stripeAccountId} />}
                      {destination.uglycashHandle && <DestLine label="UglyCash" value={'$' + destination.uglycashHandle} />}
                      {destination.bankName && <DestLine label="Bank" value={destination.bankName} />}
                      {destination.bankAccountName && <DestLine label="Account name" value={destination.bankAccountName} />}
                      {destination.bankAccountNumber && <DestLine label="Account number" value={destination.bankAccountNumber} />}
                      {destination.bankExtra && <DestLine label="Routing / sort / IBAN" value={destination.bankExtra} />}
                      {destination.bankCountry && <DestLine label="Country" value={destination.bankCountry + (destination.bankCurrency ? ' · ' + destination.bankCurrency : '')} />}
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, fontFamily: 'inherit', lineHeight: 1.5 }}>
                        Opening these was recorded against your account.
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-ghost" disabled={busy} onClick={reveal} style={{ justifyContent: 'center' }}>
                      <Icon name="lock" size={14} /> Show account details
                    </button>
                  )}

                  {/* Two buttons, and the difference between them is the whole
                      design. Send calls the provider. Record as sent asserts a
                      human already did. Neither is ever the other's side effect.

                      `dispatchable` is decided in SQL, not here, so a button that
                      is enabled and a route that refuses can't disagree. When it
                      is false the reason takes the button's place rather than
                      leaving something dead to click. */}
                  {selP.dispatchable ? (
                    <button className="btn btn-green" disabled={busy} onClick={() => setSendModal(selP.id)} style={{ justifyContent: 'center', padding: '12px' }}>
                      <Icon name="send" size={15} /> {selP.dispatchError ? 'Try sending again' : 'Send'} {pMoney(selP.netCents)} via {METHOD_WORD[selP.provider ?? selP.methodKind ?? ''] ?? 'the provider'}
                    </button>
                  ) : selP.dispatchBlocker ? (
                    <div style={{ padding: '11px 14px', borderRadius: 11, background: 'var(--bg-2)', fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.55 }}>
                      <strong style={{ color: 'var(--ink-3)' }}>Can&rsquo;t send from here:</strong> {selP.dispatchBlocker}
                    </div>
                  ) : null}

                  <button className={selP.dispatchable ? 'btn btn-ghost' : 'btn btn-green'} disabled={busy} onClick={() => { setPaidModal(selP.id); setReference(''); }} style={{ justifyContent: 'center', padding: '12px' }}>
                    <Icon name="coin" size={15} /> Record as sent{selP.dispatchable ? ' by hand' : ''}
                  </button>
                </div>
              )}

              {/* With the provider, not settled. Everything on this branch exists
                  to stop the same money going out a second time by hand while
                  PayPal is still holding the first one. */}
              {selP.status === 'processing' && (
                <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: sTint('var(--sky)', 10), border: '1px solid ' + sTint('var(--sky)', 26), fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--ink-2)' }}>
                      {pMoney(selP.netCents)} is with {METHOD_WORD[selP.provider ?? ''] ?? 'the provider'}
                    </strong>
                    {selP.dispatchAttemptedAt ? ', sent ' + relativeTime(selP.dispatchAttemptedAt) : ''}. It has not settled.
                    <div style={{ marginTop: 6 }}>
                      Don&rsquo;t send it again by hand until this clears — {METHOD_WORD[selP.provider ?? ''] ?? 'the provider'} may still confirm it.
                    </div>
                  </div>

                  {(selP.providerRef || selP.providerStatus) && (
                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-2)', display: 'grid', gap: 6, fontSize: 12.5, fontFamily: 'JetBrains Mono' }}>
                      {selP.providerRef && <DestLine label={selP.provider === 'stripe' ? 'Transfer' : 'Batch'} value={selP.providerRef} />}
                      {selP.providerStatus && <DestLine label="Provider says" value={selP.providerStatus} />}
                    </div>
                  )}

                  {/* A retry is only offered when the last attempt actually
                      failed. Without that, a second Send against a batch PayPal
                      already holds is exactly the mistake this state prevents. */}
                  {selP.dispatchError && (
                    <>
                      <div style={{ padding: '11px 14px', borderRadius: 11, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 24), fontSize: 12.5, color: 'var(--clay)', lineHeight: 1.55 }}>
                        <strong>Provider reported a problem:</strong> {selP.dispatchError}
                      </div>
                      {selP.dispatchable && (
                        <button className="btn btn-ghost" disabled={busy} onClick={() => setSendModal(selP.id)} style={{ justifyContent: 'center', padding: '12px' }}>
                          <Icon name="send" size={15} /> Try sending again
                        </button>
                      )}
                    </>
                  )}

                  <button className="btn btn-ghost" disabled={busy} onClick={() => { setPaidModal(selP.id); setReference(''); }} style={{ justifyContent: 'center', padding: '12px' }}>
                    <Icon name="coin" size={15} /> Confirm it landed
                  </button>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', textAlign: 'center', lineHeight: 1.45 }}>
                    Use this when the provider&rsquo;s dashboard shows it settled and the webhook never arrived.
                  </div>
                </div>
              )}

              {selP.status === 'paid' && (
                <div style={{ padding: 14, borderRadius: 12, background: sTint('var(--green)', 10), border: '1px solid ' + sTint('var(--green)', 26), fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                  Sent{selP.paidAt ? ' ' + relativeTime(selP.paidAt) : ''}
                  {/* `paid_by` is the admin's label for a hand transfer and the
                      system's for a dispatched one — naming the provider is the
                      only way to tell those apart afterwards. */}
                  {selP.provider ? ' through ' + (METHOD_WORD[selP.provider] ?? selP.provider) : ''}
                  {selP.paidBy ? ' by ' + selP.paidBy : ''}.
                  {selP.paymentReference && (
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>Ref {selP.paymentReference}</div>
                  )}
                </div>
              )}

              {selP.status === 'rejected' && (
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-2)', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                  This request was <strong style={{ color: 'var(--ink-2)' }}>rejected</strong>. No further action.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <Modal onClose={() => setRejectModal(null)} width={460}>
          <ModalHead icon="close" title="Reject withdrawal" sub="The seller is shown your reason." onClose={() => setRejectModal(null)} />
          <div style={{ padding: '18px 24px 0' }}>
            <label>
              <span className="fld-label">Reason for rejection</span>
              <textarea className="fld" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Open dispute must be resolved before withdrawal can be processed." style={{ resize: 'none' }} />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
            <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
            <button className="btn btn-ghost" disabled={busy || !rejectReason.trim()} onClick={handleReject} style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30), opacity: rejectReason.trim() ? 1 : .5 }}>
              <Icon name="close" size={14} /> Reject request
            </button>
          </div>
        </Modal>
      )}

      {/* Mark-sent modal. The reference is the only record that money moved. */}
      {paidModal && (
        <Modal onClose={() => setPaidModal(null)} width={460}>
          <ModalHead icon="coin" title="Record as sent" sub="Only after the transfer has actually gone out." onClose={() => setPaidModal(null)} />
          <div style={{ padding: '18px 24px 0' }}>
            <label>
              <span className="fld-label">Transfer reference</span>
              <input className="fld" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. PayPal 8XK92834ND, or the bank's reference" />
            </label>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8, lineHeight: 1.5 }}>
              This is what the seller — and any later dispute — will be checked against. It can&rsquo;t be changed afterwards.
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
            <button className="btn btn-ghost" onClick={() => setPaidModal(null)}>Cancel</button>
            <button className="btn btn-green" disabled={busy || !reference.trim()} onClick={markSent} style={{ opacity: reference.trim() ? 1 : .5 }}>
              <Icon name="check" size={14} /> Confirm sent
            </button>
          </div>
        </Modal>
      )}

      {/* Send modal. The one confirmation in the console that stands between a
          click and money actually leaving, so it states the amount, the
          destination and the provider, and does not pretend the two providers
          behave the same — Stripe settles on the spot, PayPal answers later. */}
      {sendModal && (() => {
        const p = rows.find(r => r.id === sendModal);
        if (!p) return null;
        const via = METHOD_WORD[p.provider ?? p.methodKind ?? ''] ?? 'the provider';
        return (
          <Modal onClose={() => setSendModal(null)} width={470}>
            <ModalHead icon="send" title={'Send ' + pMoney(p.netCents)} sub={'This moves money out of the platform account.'} onClose={() => setSendModal(null)} />
            <div style={{ padding: '18px 24px 0', display: 'grid', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-2)', display: 'grid', gap: 6, fontSize: 12.5, fontFamily: 'JetBrains Mono' }}>
                <DestLine label="To" value={p.seller.handle ? '@' + p.seller.handle : (p.seller.name ?? 'seller')} />
                <DestLine label="Via" value={via} />
                <DestLine label="Destination" value={p.destination} />
                <DestLine label="Amount" value={pMoney(p.netCents)} />
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                {p.provider === 'stripe'
                  ? <>Stripe transfers this immediately. Once it goes through there is no undo here — a reversal has to be done in the Stripe dashboard.</>
                  : <>PayPal will accept this and confirm separately, so it will sit as <strong style={{ color: 'var(--ink-2)' }}>Sending</strong> until it does. Don&rsquo;t also send it by hand while it&rsquo;s there.</>}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
              <button className="btn btn-ghost" onClick={() => setSendModal(null)}>Cancel</button>
              <button className="btn btn-green" disabled={busy} onClick={send} style={{ opacity: busy ? .6 : 1 }}>
                <Icon name="send" size={14} /> {busy ? 'Sending…' : 'Send ' + pMoney(p.netCents)}
              </button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

// =====================================================================
// SETTINGS (stub)
// =====================================================================
// Every switch on this screen is a column in platform_settings (migration 044)
// and every one of them has a reader: the middleware redirects to /maintenance,
// the profiles insert trigger refuses a sign-up when registration is closed,
// and POST /api/support decides whether to email an alert. The screen this
// replaced held five booleans in React state that nothing anywhere read.
//
// Toggles save on the flip and roll back if the write fails — a switch that
// looks thrown but isn't is the exact failure this page existed to demonstrate.
// The text fields save on a button, because saving per keystroke would put a
// half-typed maintenance notice in front of everyone on the platform.
function AdminSettings({ getToken, log, adminEmail }: any) {
  const app = useApp();
  const [settings, setSettings] = React.useState<PlatformSettings | null>(null);
  const [available, setAvailable] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState({ maintenanceMessage: '', registrationNote: '', alertEmail: '' });
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [clearNote, setClearNote] = React.useState('');

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    return (await tokenRef.current?.().catch(() => null)) ?? null;
  }, []);

  const adopt = React.useCallback((s: PlatformSettings) => {
    setSettings(s);
    setNotes({
      maintenanceMessage: s.maintenanceMessage ?? '',
      registrationNote: s.registrationNote ?? '',
      alertEmail: s.alertEmail ?? '',
    });
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await getSettings(await token());
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setError(null);
    setAvailable(res.available !== false);
    if (res.settings) adopt(res.settings);
  }, [token, adopt]);

  React.useEffect(() => { load(); }, [load]);

  const save = async (key: keyof PlatformSettings, value: any, what: string) => {
    if (!settings) return;
    const before = settings;
    setBusy(key);
    // Optimistic so the switch moves under the finger; put back below if the
    // server disagrees.
    setSettings({ ...settings, [key]: value } as PlatformSettings);
    const { settings: next, error: err } = await saveSettings(await token(), { [key]: value }, adminEmail ?? 'Admin');
    setBusy(null);
    if (err || !next) {
      setSettings(before);
      app.toast?.({ kind: 'error', msg: 'Not saved', sub: err ?? 'The change did not go through.', icon: 'alert' });
      return;
    }
    adopt(next);
    log?.('changed ' + what, typeof value === 'boolean' ? (value ? 'on' : 'off') : 'updated', 'settings');
    app.toast?.({ kind: 'success', msg: 'Saved', sub: what, icon: 'check' });
  };

  const executeClearReports = async () => {
    setBusy('clear');
    const { dismissed, error: err } = await clearReports(await token(), { note: clearNote.trim() || undefined, actorLabel: adminEmail ?? 'Admin' });
    setBusy(null);
    setConfirmClear(false);
    setClearNote('');
    if (err) {
      app.toast?.({ kind: 'error', msg: 'Reports not cleared', sub: err, icon: 'alert' });
      return;
    }
    const n = dismissed ?? 0;
    log?.('cleared the report queue', n + (n === 1 ? ' report' : ' reports'), 'trash');
    app.toast?.({
      kind: 'success',
      msg: n ? n + (n === 1 ? ' report dismissed' : ' reports dismissed') : 'Nothing to clear',
      sub: n ? 'The moderation queue is empty.' : 'There were no open reports.',
      icon: 'check',
    });
  };

  const Row = ({ label, sub, checked, onChange, k }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line)', gap: 20 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      <div style={{ opacity: busy === k ? 0.5 : 1, pointerEvents: busy ? 'none' : 'auto', flexShrink: 0 }}>
        <ToggleC checked={checked} onChange={onChange} />
      </div>
    </div>
  );

  // A note field and its save button. `dirty` compares against the stored row,
  // so the button is only live when there is something to actually write.
  const NoteField = ({ k, label, hint, placeholder, rows = 3 }: any) => {
    const stored = ((settings?.[k as keyof PlatformSettings] as string | null) ?? '');
    const value = notes[k as keyof typeof notes];
    const dirty = value.trim() !== stored;
    return (
      <div style={{ display: 'grid', gap: 6, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
        <span className="fld-label">{label}</span>
        {rows > 1 ? (
          <textarea className="fld" rows={rows} value={value} placeholder={placeholder}
            onChange={e => setNotes(n => ({ ...n, [k]: e.target.value }))}
            style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
        ) : (
          <input className="fld" value={value} placeholder={placeholder}
            onChange={e => setNotes(n => ({ ...n, [k]: e.target.value }))} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.5 }}>{hint}</span>
          <button className="btn btn-ghost" disabled={!dirty || !!busy}
            onClick={() => save(k, value.trim(), label.toLowerCase())}
            style={{ opacity: dirty && !busy ? 1 : 0.4, flexShrink: 0, fontSize: 12.5, padding: '6px 12px' }}>
            {busy === k ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  };

  // Not the same as "everything is off". An unreadable settings row means the
  // platform is running on the permissive defaults in lib/platform.ts, and
  // drawing those as if they were saved choices would be the same lie the old
  // screen told.
  if (!available) {
    return (
      <div style={{ padding: '16px 20px', borderRadius: 16, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 30), fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-3)', maxWidth: 720 }}>
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Platform settings aren&rsquo;t set up on this database yet.</strong><br />
        Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>supabase/migrations/044_platform_settings.sql</code> and reload. Until then the platform runs open: registration on, no maintenance page.
      </div>
    );
  }

  if (loading && !settings) return <EmptyNote height={220}>Loading platform settings…</EmptyNote>;

  if (!settings) {
    return (
      <div style={{ padding: '16px 20px', borderRadius: 16, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-3)', maxWidth: 720 }}>
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Couldn&rsquo;t read the platform settings.</strong><br />
        {error ?? 'The request came back empty.'}
        <div><button className="btn btn-ghost" onClick={load} style={{ marginTop: 12, fontSize: 12.5, padding: '6px 12px' }}>Try again</button></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 720 }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13 }}>{error}</div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: '6px 22px 16px' }}>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.07em', padding: '14px 0 10px' }}>PLATFORM</div>
        <Row k="registrationOpen" label="Open registration" checked={settings.registrationOpen}
          sub="When off, the sign-up screen explains why instead of collecting details, and the database refuses new profiles outright."
          onChange={() => save('registrationOpen', !settings.registrationOpen, 'open registration')} />
        <NoteField k="registrationNote" label="Sign-ups paused notice" rows={2}
          placeholder={DEFAULT_REGISTRATION_NOTE}
          hint="Shown on the sign-up screen while registration is closed." />
        <Row k="maintenanceMode" label="Maintenance mode" checked={settings.maintenanceMode}
          sub="Redirects every page to a maintenance notice, signed in or not. The admin console stays reachable — including this switch."
          onChange={() => save('maintenanceMode', !settings.maintenanceMode, 'maintenance mode')} />
        <NoteField k="maintenanceMessage" label="Maintenance notice" rows={3}
          placeholder={DEFAULT_MAINTENANCE_MESSAGE}
          hint="Shown on the maintenance page. Line breaks are kept." />
        {settings.maintenanceMode && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 25), fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            Honua is in maintenance mode. The middleware caches this for 15 seconds, so a page loaded a moment ago may still be up — it will bounce on the next navigation.
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: '6px 22px 16px' }}>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.07em', padding: '14px 0 10px' }}>ALERTS</div>
        <Row k="adminEmailAlerts" label="Admin email alerts" checked={settings.adminEmailAlerts}
          sub="Emails you when a support ticket or a content report is filed."
          onChange={() => save('adminEmailAlerts', !settings.adminEmailAlerts, 'admin email alerts')} />
        <NoteField k="alertEmail" label="Alert address" rows={1}
          placeholder="alerts@honua.green"
          hint="Where those alerts go. Leave it empty and none are sent." />
        {settings.adminEmailAlerts && !settings.alertEmail && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 25), fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            Alerts are on but there is no address to send them to, so nothing is being sent.
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.07em', marginBottom: 6 }}>DANGER ZONE</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, lineHeight: 1.6 }}>Dismisses every pending and escalated community report in one action. The reports stay in the table with your name on the dismissal — nothing is deleted — but they leave the moderation queue.</div>
        <button className="btn btn-ghost" onClick={() => setConfirmClear(true)} disabled={!!busy} style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
          <Icon name="trash" size={14} /> Clear all reports
        </button>
      </div>

      {settings.updatedAt && (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
          Last changed {relativeTime(settings.updatedAt)}{settings.updatedLabel ? ' by ' + settings.updatedLabel : ''}
        </div>
      )}

      {confirmClear && (
      <Modal onClose={() => setConfirmClear(false)} width={460}>
        <ModalHead icon="trash" title="Clear the report queue?" onClose={() => setConfirmClear(false)} sub="Every pending and escalated report is dismissed at once." />
        <div style={{ padding: '0 24px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: sTint('var(--clay)', 12), border: '1px solid ' + sTint('var(--clay)', 30), borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--clay)', lineHeight: 1.6 }}>
            Each open report is marked dismissed by you, with the note below. Reports already resolved are untouched and nothing leaves the database — but the queue will be empty and there is no undo.
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="fld-label">Why (optional)</span>
            <input className="fld" value={clearNote} onChange={e => setClearNote(e.target.value)} placeholder="e.g. spam wave, handled at source" autoFocus />
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
          <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
          <button className="btn btn-ghost" onClick={executeClearReports} disabled={busy === 'clear'} style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30), opacity: busy === 'clear' ? 0.5 : 1 }}>
            <Icon name="trash" size={14} /> {busy === 'clear' ? 'Clearing…' : 'Yes, clear the queue'}
          </button>
        </div>
      </Modal>
      )}
    </div>
  );
}

// =====================================================================
// CHALLENGES
// =====================================================================
const CAT_COLORS: Record<string, string> = {
  Transport: 'var(--green)', Energy: 'var(--sun)', Food: 'var(--sky)',
  Waste: 'var(--clay)', Nature: 'var(--green-2)', Lifestyle: 'var(--ink-3)', General: 'var(--ink-3)',
};

// Reward fields, shared by create, approve and edit. `logs` blank = every day.
type RewardDraft = { points: string; logs: string };
const rewardBody = (d: RewardDraft) => ({
  rewardPoints: Math.max(0, Math.round(Number(d.points) || 0)),
  requiredLogs: d.logs.trim() === '' ? null : Math.round(Number(d.logs)),
});
const rewardSummary = (c: any) => {
  const need = c.required_logs ?? c.days;
  const pts = c.reward_points ?? 0;
  return `${pts > 0 ? `${pts} GP` : 'No reward'} · log ${need === c.days ? 'every day' : `${need} of ${c.days} days`}`;
};

function RewardFields({ draft, setDraft, days }: { draft: RewardDraft; setDraft: (d: RewardDraft) => void; days: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div>
        <span className="fld-label">Reward (GP)</span>
        <input className="fld" type="number" min={0} max={2000} value={draft.points} onChange={e => setDraft({ ...draft, points: e.target.value })} placeholder="0" />
      </div>
      <div>
        <span className="fld-label">Days to log</span>
        <input className="fld" type="number" min={1} max={days} value={draft.logs} onChange={e => setDraft({ ...draft, logs: e.target.value })} placeholder={`${days} (every day)`} />
      </div>
    </div>
  );
}

function AdminChallenges({ active, pending, loaded, onApprove, onUpdateReward, onReject, onArchive, onCreate }) {
  const app = useApp();
  const [tab, setTab] = React.useState<'pending' | 'active' | 'create'>(pending.length > 0 ? 'pending' : 'active');
  const [rejectModal, setRejectModal] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [form, setForm] = React.useState({ title: '', description: '', category: 'Energy', days: 30 });
  const [formReward, setFormReward] = React.useState<RewardDraft>({ points: '', logs: '' });
  const [creating, setCreating] = React.useState(false);
  // The reward being set for a pending approval or an active edit.
  const [rewardFor, setRewardFor] = React.useState<{ id: string; mode: 'approve' | 'edit'; draft: RewardDraft } | null>(null);
  const [savingReward, setSavingReward] = React.useState(false);

  const openReward = (c: any, mode: 'approve' | 'edit') => {
    const suggested = mode === 'approve' ? (String(c.reward ?? '').match(/^\s*(\d+)\s*GP/i)?.[1] ?? '') : String(c.reward_points ?? '');
    setRewardFor({ id: c.id, mode, draft: { points: suggested === '0' ? '' : suggested, logs: c.required_logs ? String(c.required_logs) : '' } });
  };
  const saveReward = async () => {
    if (!rewardFor) return;
    setSavingReward(true);
    const fn = rewardFor.mode === 'approve' ? onApprove : onUpdateReward;
    const ok = await fn(rewardFor.id, rewardBody(rewardFor.draft));
    setSavingReward(false);
    if (ok) setRewardFor(null);
  };

  React.useEffect(() => {
    if (pending.length > 0 && tab === 'active') setTab('pending');
  }, [pending.length]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    const ok = await onCreate({ title: form.title.trim(), description: form.description.trim() || null, category: form.category, days: form.days, ...rewardBody(formReward) });
    setCreating(false);
    if (!ok) return;
    setForm({ title: '', description: '', category: 'Energy', days: 30 });
    setFormReward({ points: '', logs: '' });
    setTab('active');
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await onReject(rejectModal, rejectReason.trim());
    setRejectModal(null);
    setRejectReason('');
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['pending', 'active', 'create'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--line)',
            background: tab === t ? 'var(--ink-solid)' : 'var(--surface)',
            color: tab === t ? '#fff' : 'var(--ink-2)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Satoshi',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            {t === 'pending' ? 'Approval queue' : t === 'active' ? 'Active challenges' : 'Create challenge'}
            {t === 'pending' && pending.length > 0 && (
              <span style={{ background: 'var(--clay)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, fontFamily: 'JetBrains Mono' }}>{pending.length}</span>
            )}
            {t === 'active' && (
              <span style={{ background: 'var(--green)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, fontFamily: 'JetBrains Mono' }}>{active.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Approval queue */}
      {tab === 'pending' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
          {!loaded && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Loading…</div>
          )}
          {loaded && pending.length === 0 && (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <Icon name="check" size={28} color="var(--green)" />
              <div style={{ marginTop: 10, fontWeight: 600 }}>All caught up</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>No pending challenge submissions.</div>
            </div>
          )}
          {pending.map((c, i) => (
            <div key={c.id} style={{ padding: '18px 22px', borderTop: i === 0 ? 'none' : '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="chip" style={{ background: (CAT_COLORS[c.category] ?? 'var(--ink-3)') + '18', color: CAT_COLORS[c.category] ?? 'var(--ink-3)', border: 'none', fontSize: 11 }}>{c.category}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-4)' }}>{c.days}d</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-4)' }}>· submitted {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'recently'}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                {c.description && <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>{c.description}</div>}
                {c.reward && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, fontFamily: 'JetBrains Mono' }}>Suggested reward: {c.reward}</div>}
                {rewardFor?.id === c.id && (
                  <div style={{ marginTop: 12, maxWidth: 360 }}>
                    <RewardFields draft={rewardFor.draft} setDraft={d => setRewardFor({ ...rewardFor, draft: d })} days={c.days} />
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 6 }}>Paid once, when someone logs the required days within {c.days} days of joining.</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-ghost" onClick={() => { setRejectModal(c.id); setRejectReason(''); }} style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30), fontSize: 12, padding: '6px 12px' }}>
                  Reject
                </button>
                {rewardFor?.id === c.id ? (
                  <>
                    <button className="btn btn-ghost" onClick={() => setRewardFor(null)} style={{ fontSize: 12, padding: '6px 12px' }}>Cancel</button>
                    <button className="btn btn-green" onClick={saveReward} disabled={savingReward} style={{ fontSize: 12, padding: '6px 12px', opacity: savingReward ? .5 : 1 }}>
                      {savingReward ? 'Publishing…' : 'Publish'}
                    </button>
                  </>
                ) : (
                  <button className="btn btn-green" onClick={() => openReward(c, 'approve')} style={{ fontSize: 12, padding: '6px 12px' }}>
                    Approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active challenges */}
      {tab === 'active' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
          {!loaded && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Loading…</div>}
          {loaded && active.length === 0 && (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <Icon name="award" size={28} color="var(--ink-3)" />
              <div style={{ marginTop: 10, fontWeight: 600 }}>No active challenges</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Create one from the Create tab or approve a submission.</div>
            </div>
          )}
          {/* Table header */}
          {active.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 120px 80px', gap: 12, padding: '12px 22px', borderBottom: '1px solid var(--line)', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em' }}>
              <span>CHALLENGE</span><span>CATEGORY</span><span>DURATION</span><span>PARTICIPANTS</span><span></span>
            </div>
          )}
          {active.map((c, i) => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 120px 80px', gap: 12, padding: '14px 22px', borderTop: i === 0 ? 'none' : '1px solid var(--line)', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                  {rewardSummary(c)} · <button onClick={() => openReward(c, 'edit')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--green)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>edit</button>
                </div>
                {rewardFor?.id === c.id && (
                  <div style={{ marginTop: 10, maxWidth: 360 }}>
                    <RewardFields draft={rewardFor.draft} setDraft={d => setRewardFor({ ...rewardFor, draft: d })} days={c.days} />
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', margin: '6px 0 8px' }}>Changes apply to anyone who hasn't completed it yet.</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost" onClick={() => setRewardFor(null)} style={{ fontSize: 12, padding: '5px 10px' }}>Cancel</button>
                      <button className="btn btn-green" onClick={saveReward} disabled={savingReward} style={{ fontSize: 12, padding: '5px 10px', opacity: savingReward ? .5 : 1 }}>{savingReward ? 'Saving…' : 'Save'}</button>
                    </div>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 12, color: CAT_COLORS[c.category] ?? 'var(--ink-3)', fontWeight: 600 }}>{c.category}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--ink-3)' }}>{c.days}d</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600 }}>{(c.participant_count ?? 0).toLocaleString()}</span>
                <div style={{ flex: 1, height: 4, background: 'var(--line)', borderRadius: 999, minWidth: 40 }}>
                  <div style={{ width: Math.min((c.participant_count ?? 0) / 500 * 100, 100) + '%', height: '100%', background: 'var(--green)', borderRadius: 999 }} />
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => onArchive(c.id)} style={{ fontSize: 11, padding: '5px 10px', color: 'var(--ink-3)' }}>Archive</button>
            </div>
          ))}
        </div>
      )}

      {/* Create challenge (admin — goes live immediately) */}
      {tab === 'create' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, maxWidth: 560 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>New challenge <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}>— publishes immediately</span></div>
          <span className="fld-label">Title</span>
          <input className="fld" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Bike-to-work week" style={{ marginBottom: 14 }} />
          <span className="fld-label">Description <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></span>
          <textarea className="fld" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's the challenge about?" rows={2} style={{ marginBottom: 14, resize: 'none' }} />
          <span className="fld-label">Category</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {['Energy', 'Transport', 'Food', 'Waste', 'Nature', 'Lifestyle'].map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, category: c }))} className={'chip ' + (form.category === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: form.category === c ? 'none' : undefined }}>{c}</button>
            ))}
          </div>
          <span className="fld-label">Duration</span>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[7, 14, 21, 30].map(d => (
              <button key={d} onClick={() => setForm(f => ({ ...f, days: d }))} className={'chip ' + (form.days === d ? 'chip-green' : '')} style={{ cursor: 'pointer', border: form.days === d ? 'none' : undefined }}>{d} days</button>
            ))}
          </div>
          <RewardFields draft={formReward} setDraft={setFormReward} days={form.days} />
          <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', margin: '6px 0 20px' }}>Paid once, when someone logs the required days within the duration. Leave days blank for every day.</div>
          <button className="btn btn-green" onClick={handleCreate} disabled={!form.title.trim() || creating} style={{ opacity: form.title.trim() && !creating ? 1 : .5 }}>
            <Icon name="plus" size={14} /> {creating ? 'Creating…' : 'Publish challenge'}
          </button>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <Modal onClose={() => { setRejectModal(null); setRejectReason(''); }} width={440}>
          <ModalHead icon="close" title="Reject challenge?" onClose={() => { setRejectModal(null); setRejectReason(''); }} sub="The submitter won't be notified automatically." />
          <div style={{ padding: '0 24px 4px' }}>
            <span className="fld-label">Reason <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></span>
            <textarea className="fld" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Too similar to an existing challenge." rows={3} autoFocus style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
            <button className="btn btn-ghost" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancel</button>
            <button className="btn btn-ghost" onClick={handleReject} style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>Reject submission</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// APPEALS
// =====================================================================
// Real appeals through /api/admin/appeals, gated on `appeals.resolve`.
//
// What it replaces: five invented appeals in a const, where Overturn moved a
// card in React state and no one anywhere was told anything. There was no
// table, no intake, and no way for a suspended person to file one — the whole
// screen was a drawing of a process.
//
// The original action is read from moderation_actions, not from what the
// appellant typed. Those are different claims and the reviewer needs both.
//
// Overturning does not lift a suspension. Reinstatement is `users.suspend` /
// `users.ban` territory and goes through /api/admin/users on its own gate, so
// this screen offers it as a separate, separately-refused button rather than
// quietly doing it — a moderator holding only `appeals.resolve` can decide an
// appeal but cannot use that decision as a way around the account gate.
const APPEAL_KIND_COLOR: Record<string, string> = {
  suspension: 'var(--clay)',
  ban: 'var(--clay)',
  post_removal: 'var(--sun)',
  product_removal: 'var(--sun)',
  seller_rejection: 'var(--sky)',
  other: 'var(--ink-3)',
};

function AdminAppeals({ getToken, log, adminEmail, onCounts }: any) {
  const app = useApp();
  const [appeals, setAppeals] = React.useState<Appeal[]>([]);
  const [available, setAvailable] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('open');
  const [sel, setSel] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [modal, setModal] = React.useState<{ id: string; outcome: 'overturned' | 'upheld' } | null>(null);
  const [resolution, setResolution] = React.useState('');

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    return (await tokenRef.current?.().catch(() => null)) ?? null;
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listAppeals(await token(), { limit: 300 });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setError(null);
    setAvailable(res.available !== false);
    setAppeals(res.appeals ?? []);
    if (typeof res.open === 'number') onCounts?.(res.open);
  }, [token, onCounts]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = appeals.filter(a => filter === 'all' ? true : a.status === filter);
  const selA = filtered.find(a => a.id === sel) ?? filtered[0] ?? null;
  const openCount = appeals.filter(a => a.status === 'open').length;

  const handleResolve = async () => {
    if (!modal || !resolution.trim()) return;
    setBusy(true);
    const row = appeals.find(a => a.id === modal.id) ?? null;
    const { appeal, error: err } = await resolveAppealCall(await token(), modal.id, modal.outcome, resolution.trim(), adminEmail ?? 'Admin');
    setBusy(false);
    if (err || !appeal) {
      // The old version moved the card regardless of what happened, because
      // nothing happened. Nothing moves now unless the server says it did.
      setError(err ?? 'That appeal could not be decided.');
      app.toast?.({ msg: 'Could not record that decision', sub: err ?? undefined, kind: 'error', icon: 'close' });
      return;
    }
    setError(null);
    setAppeals(as => as.map(a => a.id === modal.id ? { ...a, ...appeal } as Appeal : a));
    onCounts?.(appeals.filter(a => a.id !== modal.id && a.status === 'open').length);
    log?.(
      modal.outcome === 'overturned' ? 'overturned an appeal' : 'upheld a decision on appeal',
      row?.user.handle ? '@' + row.user.handle : (row?.ref ?? ''),
      modal.outcome === 'overturned' ? 'check' : 'close',
    );
    app.toast?.({
      msg: modal.outcome === 'overturned' ? 'Appeal overturned' : 'Original decision upheld',
      sub: modal.outcome === 'overturned' && row?.user.suspendedUntil ? 'The account is still restricted — reinstate it separately.' : (row?.ref ?? undefined),
      kind: 'success',
      icon: modal.outcome === 'overturned' ? 'check' : 'close',
    });
    setModal(null);
    setResolution('');
  };

  // Separate action, separate gate. A 403 here is the correct outcome for a
  // moderator, and its message says so.
  const reinstate = async (a: Appeal) => {
    if (!a.user.id) return;
    setBusy(true);
    const { user, error: err } = await setAccountStatus(await token(), {
      id: a.user.id, action: 'reinstate', reason: 'Appeal ' + a.ref + ' overturned', actorLabel: adminEmail ?? 'Admin',
    });
    setBusy(false);
    if (err || !user) {
      app.toast?.({ msg: 'Could not reinstate the account', sub: err ?? undefined, kind: 'error', icon: 'close' });
      return;
    }
    setAppeals(as => as.map(x => x.user.id === a.user.id ? { ...x, user: { ...x.user, suspendedUntil: null, bannedAt: null } } : x));
    log?.('reinstated account', a.user.handle ? '@' + a.user.handle : '', 'check');
    app.toast?.({ msg: 'Account reinstated', sub: a.user.handle ? '@' + a.user.handle : undefined, kind: 'success', icon: 'check' });
  };

  // Not the same as an empty queue: "nobody has appealed" is a claim, and it
  // can't be made when the table it would be read from doesn't exist.
  if (!available) {
    return (
      <div style={{ padding: '16px 20px', borderRadius: 16, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 30), fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-3)' }}>
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Appeals aren&rsquo;t set up on this database yet.</strong><br />
        Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>supabase/migrations/043_appeals.sql</code> and reload.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13 }}>{error}</div>
      )}

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Open appeals" value={openCount} icon="flag" accent="var(--sky)" sub="awaiting review" />
        <SStat label="Overturned" value={appeals.filter(a => a.status === 'overturned').length} icon="check" accent="var(--green)" sub="original reversed" />
        <SStat label="Upheld" value={appeals.filter(a => a.status === 'upheld').length} icon="close" accent="var(--clay)" sub="original confirmed" />
        <SStat label="Total appeals" value={appeals.length} icon="clock" sub="all time" />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[['open', 'Open'], ['overturned', 'Overturned'], ['upheld', 'Upheld'], ['all', 'All']].map(([k, l]) => (
          <button key={k} onClick={() => { setFilter(k); setSel(null); }} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
            {l}{k === 'open' && openCount > 0 && <span style={{ fontFamily: 'JetBrains Mono', opacity: .7 }}> · {openCount}</span>}
          </button>
        ))}
        <button onClick={load} className="chip" style={{ cursor: 'pointer', marginLeft: 'auto' }}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 16, alignItems: 'start' }}>
        {/* Queue */}
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(a => {
            const on = a.id === selA?.id;
            const accent = APPEAL_KIND_COLOR[a.kind] ?? 'var(--sky)';
            return (
              <button key={a.id} onClick={() => setSel(a.id)} style={{
                display: 'block', textAlign: 'left', width: '100%', cursor: 'pointer', padding: 16, borderRadius: 16,
                border: '1px solid ' + (on ? 'var(--sky)' : 'var(--line)'), background: on ? sTint('var(--sky)', 8) : 'var(--surface)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span className="chip" style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', padding: '2px 7px', background: sTint(accent, 14), color: accent, border: 'none' }}>
                    {APPEAL_KIND_SHORT[a.kind] ?? 'Appeal'}
                  </span>
                  {!a.seen && a.status === 'open' && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sky)' }} />
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{relativeTime(a.createdAt)}</span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4 }}>
                  {a.target || appealKindLabel(a.kind)}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar src={a.user.avatarUrl ?? undefined} name={a.user.name ?? a.user.handle ?? 'User'} size={18} />
                  {a.user.handle ? '@' + a.user.handle : (a.user.email ?? 'Signed out')}
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-4)' }}>{a.ref}</span>
                  {a.status !== 'open' && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: a.status === 'overturned' ? sTint('var(--green)', 14) : sTint('var(--clay)', 14), color: a.status === 'overturned' ? 'var(--green)' : 'var(--clay)', fontFamily: 'JetBrains Mono' }}>
                      {a.status === 'overturned' ? 'Overturned' : 'Upheld'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14, border: '1px dashed var(--line-2)', borderRadius: 16 }}>
              {loading ? 'Loading…' : 'No appeals in this view'}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selA && (
          <div style={{ position: 'sticky', top: 88, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar src={selA.user.avatarUrl ?? undefined} name={selA.user.name ?? selA.user.handle ?? 'User'} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selA.user.name ?? selA.user.handle ?? 'Appellant'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selA.user.handle ? '@' + selA.user.handle + ' · ' : ''}{selA.user.email ?? '—'} · {selA.ref}
                </div>
              </div>
              {selA.status !== 'open' && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: selA.status === 'overturned' ? sTint('var(--green)', 14) : sTint('var(--clay)', 14), color: selA.status === 'overturned' ? 'var(--green)' : 'var(--clay)', fontFamily: 'JetBrains Mono' }}>
                  {selA.status === 'overturned' ? 'Overturned' : 'Upheld'}
                </span>
              )}
            </div>

            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              {/* Live standing, not what the appeal claims. An appeal filed
                  three weeks ago may be about a suspension that has lapsed. */}
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-2)', fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="lock" size={13} color={selA.user.bannedAt || suspensionRemaining(selA.user.suspendedUntil) ? 'var(--clay)' : 'var(--green)'} />
                {selA.user.bannedAt
                  ? <>Banned {relativeTime(selA.user.bannedAt)} — still in force.</>
                  : suspensionRemaining(selA.user.suspendedUntil)
                    ? <>Suspended — {suspensionRemaining(selA.user.suspendedUntil)}.</>
                    : <>Account is in good standing right now.</>}
              </div>

              <div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>APPEALING</div>
                <div style={{ padding: '11px 14px', borderRadius: 10, background: 'var(--bg-2)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  {appealKindLabel(selA.kind)}
                  {selA.target && <div style={{ marginTop: 4, fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--ink-3)', wordBreak: 'break-all' }}>{selA.target}</div>}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>ORIGINAL ACTION</div>
                {selA.originalAction ? (
                  <div style={{ padding: '11px 14px', borderRadius: 10, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 20), fontSize: 13, color: 'var(--clay)', lineHeight: 1.5 }}>
                    <strong style={{ textTransform: 'capitalize' }}>{selA.originalAction.kind}</strong>
                    {selA.originalAction.reason ? ' — ' + selA.originalAction.reason : ''}
                    <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                      {relativeTime(selA.originalAction.at)}{selA.originalAction.by ? ' · ' + selA.originalAction.by : ''}
                    </div>
                  </div>
                ) : (
                  // Said plainly rather than left blank: the reviewer is deciding
                  // on the appellant's account alone, and should know that.
                  <div style={{ padding: '11px 14px', borderRadius: 10, background: 'var(--bg-2)', fontSize: 12.5, color: 'var(--ink-4)', lineHeight: 1.5 }}>
                    No matching record. Either this isn&rsquo;t an account action, or it predates the moderation log.
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>WHAT THEY SAY</div>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-2)', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selA.reason}</div>
              </div>

              {selA.resolution && (
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>RESOLUTION</div>
                  <div style={{ padding: '11px 14px', borderRadius: 10, background: sTint('var(--green)', 8), border: '1px solid ' + sTint('var(--green)', 20), fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {selA.resolution}
                    <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                      {selA.resolvedLabel ?? 'Admin'}{selA.resolvedAt ? ' · ' + relativeTime(selA.resolvedAt) : ''}
                    </div>
                  </div>
                </div>
              )}

              {selA.status === 'open' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn btn-green" disabled={busy} onClick={() => { setModal({ id: selA.id, outcome: 'overturned' }); setResolution(''); }} style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>
                    <Icon name="check" size={14} /> Overturn
                  </button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => { setModal({ id: selA.id, outcome: 'upheld' }); setResolution(''); }} style={{ flex: 1, justifyContent: 'center', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
                    <Icon name="close" size={14} /> Uphold original
                  </button>
                </div>
              )}

              {/* Offered only when overturning has left a restriction standing —
                  which is exactly when it is easy to forget. */}
              {selA.status === 'overturned' && selA.user.id && (selA.user.bannedAt || suspensionRemaining(selA.user.suspendedUntil)) && (
                <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 26), fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                    You overturned this, but the restriction is still on the account. Lifting it is a separate permission.
                  </div>
                  <button className="btn btn-green" disabled={busy} onClick={() => reinstate(selA)} style={{ justifyContent: 'center', padding: '11px' }}>
                    <Icon name="check" size={14} /> Reinstate the account
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resolution modal */}
      {modal && (
        <Modal onClose={() => setModal(null)} width={480}>
          <ModalHead
            icon={modal.outcome === 'overturned' ? 'check' : 'close'}
            title={modal.outcome === 'overturned' ? 'Overturn decision' : 'Uphold original decision'}
            sub="The appellant is sent this, word for word."
            onClose={() => setModal(null)}
          />
          <div style={{ padding: '18px 24px 0' }}>
            <label>
              <span className="fld-label">Resolution note</span>
              <textarea className="fld" rows={4} value={resolution} onChange={e => setResolution(e.target.value)} placeholder={modal.outcome === 'overturned' ? 'e.g. On review the original action was issued in error. The restriction is being lifted.' : 'e.g. We reviewed the appeal and the original decision stands, because…'} style={{ resize: 'none' }} />
            </label>
            {modal.outcome === 'overturned' && (
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8, lineHeight: 1.5 }}>
                Overturning records the decision. It does not lift a suspension — do that separately once this is saved.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button
              className={modal.outcome === 'overturned' ? 'btn btn-green' : 'btn btn-ghost'}
              disabled={busy || !resolution.trim()}
              onClick={handleResolve}
              style={{ opacity: resolution.trim() ? 1 : 0.5, ...(modal.outcome === 'upheld' ? { color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) } : {}) }}
            >
              {modal.outcome === 'overturned' ? <><Icon name="check" size={14} /> Confirm overturn</> : <><Icon name="close" size={14} /> Confirm uphold</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// NOTIFICATIONS
// =====================================================================
// The compose screen, wired to POST /api/admin/notifications — which checks
// `notifications.send`, resolves the audience in SQL, writes the in-app rows and
// posts the emails, then records what actually happened in admin_broadcasts.
//
// Two things this screen does that the mock version could not, and both matter
// more than the layout: it refuses to send while the message still holds a slot
// the server cannot fill ({{post_title}} is the admin's to write, not ours), and
// it shows the recorded outcome instead of the intention. "Sent" and "delivered
// to nobody because RESEND_API_KEY is unset" are different sentences.
function AdminNotifications({ getToken, log, adminEmail }: any) {
  const app = useApp();
  const [tab, setTab] = React.useState<'compose' | 'templates' | 'history'>('compose');
  const [selectedTemplate, setSelectedTemplate] = React.useState(NOTIFICATION_TEMPLATES[NOTIFICATION_TEMPLATES.length - 1]);
  const [audience, setAudience] = React.useState<Audience>('user');
  const [handle, setHandle] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [channel, setChannel] = React.useState<Channel>('both');
  const [history, setHistory] = React.useState<BroadcastHistory | null>(null);
  const [available, setAvailable] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [outcome, setOutcome] = React.useState<string | null>(null);

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    return (await tokenRef.current?.().catch(() => null)) ?? null;
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listBroadcasts(await token(), 60);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setError(null);
    setAvailable(res.available !== false);
    setHistory(res.history ?? null);
  }, [token]);

  React.useEffect(() => { load(); }, [load]);

  const applyTemplate = (tpl: typeof NOTIFICATION_TEMPLATES[number]) => {
    setSelectedTemplate(tpl);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setTab('compose');
  };

  // Slots the server cannot fill. Checked here so the composer can say which
  // ones are still open before anyone clicks send; the route checks again,
  // because this one is only a keystroke away from being edited out.
  const unresolved = unresolvedTokens(subject + '\n' + body);
  const ready = Boolean(subject.trim() && body.trim() && !unresolved.length && (audience !== 'user' || handle.trim()));

  // Two figures, deliberately. The audience is everyone who gets the in-app
  // notice; `mailable` is the much smaller set with an address and email updates
  // on. Showing only the first would make the outcome line look like a fault.
  const size = audience === 'user' ? 1 : (history?.audiences?.[audience] ?? null);
  const mailable = audience === 'user' ? null : (history?.emailable?.[audience] ?? null);
  const emailConfigured = history?.emailConfigured !== false;
  const maxEmails = history?.maxEmails ?? 200;
  const willEmail = channel !== 'in_app';

  const send = async () => {
    setConfirm(false);
    setSending(true);
    setOutcome(null);
    const { result, error: err, unresolved: serverUnresolved } = await sendBroadcast(await token(), {
      subject: subject.trim(),
      body: body.trim(),
      audience,
      ...(audience === 'user' ? { targetHandle: handle.trim().replace(/^@/, '') } : {}),
      channel,
      templateId: selectedTemplate.id,
      actorLabel: adminEmail ?? 'Admin',
    });
    setSending(false);

    if (err || !result) {
      const sub = serverUnresolved?.length ? err + ' (' + serverUnresolved.join(', ') + ')' : err;
      app.toast?.({ kind: 'error', msg: 'Not sent', sub: sub ?? 'The send did not go through.', icon: 'alert' });
      return;
    }

    const where = audienceLabel(audience, handle.trim().replace(/^@/, ''));
    const line = result.broadcast ? outcomeLine(result.broadcast)
      : [channel !== 'email' ? result.inAppCreated + ' in-app' : null,
         channel !== 'in_app' ? result.emailsSent + ' email' + (result.emailsSent === 1 ? '' : 's') : null]
        .filter(Boolean).join(' · ');

    setOutcome(
      where + ' · ' + line
      // Only worth saying when email was actually attempted — on an in-app-only
      // send nobody was skipped, they just weren't emailed by design.
      + (willEmail && result.optedOut ? ' · ' + result.optedOut + ' not emailed (no address, or email updates off)' : '')
      + (result.emailError ? ' · ' + result.emailError : '')
      + (result.warning ? ' · ' + result.warning : '')
    );

    log?.('sent a notification: "' + subject.trim() + '"', where, 'bell');
    app.toast?.({
      kind: result.emailsFailed || result.emailError ? undefined : 'success',
      msg: result.emailsFailed || result.emailError ? 'Sent, with problems' : 'Notification sent',
      sub: where + ' · ' + line,
      icon: result.emailsFailed || result.emailError ? 'alert' : 'check',
    });

    setSubject('');
    setBody('');
    load();
  };

  const audienceOptions: { value: Audience; label: string }[] = [
    { value: 'user', label: 'One member' },
    { value: 'all_sellers', label: 'All sellers' },
    { value: 'all_users', label: 'Everyone' },
  ];

  if (!available) {
    return (
      <div style={{ padding: '16px 20px', borderRadius: 16, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 30), fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-3)', maxWidth: 720 }}>
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Broadcasts aren&rsquo;t set up on this database yet.</strong><br />
        Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>supabase/migrations/044_platform_settings.sql</code> and reload.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start', maxWidth: 1000 }}>
      {/* Left: tabs */}
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['compose', 'templates', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={'chip' + (tab === t ? ' chip-green' : '')} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13 }}>{error}</div>
        )}

        {tab === 'compose' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22, display: 'grid', gap: 16 }}>
            {/* Audience */}
            <div>
              <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 8 }}>SEND TO</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {audienceOptions.map(o => (
                  <button key={o.value} onClick={() => setAudience(o.value)} className={'chip' + (audience === o.value ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
                    {o.label}
                    {o.value !== 'user' && history?.audiences?.[o.value] != null && (
                      <span style={{ opacity: 0.65, marginLeft: 6 }}>{history.audiences[o.value]}</span>
                    )}
                  </button>
                ))}
              </div>
              {audience === 'user' && (
                <input className="fld" style={{ marginTop: 10 }} placeholder="@handle" value={handle} onChange={e => setHandle(e.target.value)} />
              )}
              {audience !== 'user' && size != null && (
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.6 }}>
                  {size} {size === 1 ? 'person' : 'people'} right now — all of them get the in-app notice.
                  {willEmail && mailable != null && (
                    <> {mailable === 0
                      ? 'None of them have email updates turned on, so no email will go out.'
                      : mailable + (mailable === 1 ? ' has' : ' have') + ' email updates turned on, so that is how many emails go out.'}</>
                  )}
                </div>
              )}
            </div>

            {/* Channel */}
            <div>
              <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 8 }}>CHANNEL</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['both', 'Email + In-app'], ['email', 'Email only'], ['in_app', 'In-app only']] as [Channel, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setChannel(v)} className={'chip' + (channel === v ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
              {willEmail && !emailConfigured && (
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 25), fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                  Email isn&rsquo;t configured on this server (<code style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5 }}>RESEND_API_KEY</code> is unset), so the email half will fail. The in-app half still works.
                </div>
              )}
            </div>

            {/* Subject */}
            <label>
              <span className="fld-label">Subject</span>
              <input className="fld" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Your account has been reviewed" />
            </label>

            {/* Body */}
            <label>
              <span className="fld-label">Message</span>
              <textarea className="fld" rows={7} value={body} onChange={e => setBody(e.target.value)} placeholder={'Write your message…\n\n{{user.name}} and {{user.handle}} are filled in per person.'} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
            </label>

            {unresolved.length > 0 && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.65 }}>
                <strong style={{ color: 'var(--clay)', fontWeight: 600 }}>Fill these in before sending:</strong>{' '}
                {unresolved.map(t => '{{' + t + '}}').join(', ')}.<br />
                Only <code style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5 }}>{'{{user.name}}'}</code> and <code style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5 }}>{'{{user.handle}}'}</code> are filled in by the server — the rest are yours to write.
              </div>
            )}

            {outcome && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--green)', 10), border: '1px solid ' + sTint('var(--green)', 25), fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                {outcome}
              </div>
            )}

            <button className="btn btn-green" disabled={!ready || sending} onClick={() => setConfirm(true)}
              style={{ justifyContent: 'center', padding: '12px', opacity: ready && !sending ? 1 : 0.5 }}>
              <Icon name="bell" size={15} /> {sending ? 'Sending…' : 'Send notification'}
            </button>
          </div>
        )}

        {tab === 'templates' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {NOTIFICATION_TEMPLATES.map(tpl => (
              <button key={tpl.id} onClick={() => applyTemplate(tpl)} style={{
                textAlign: 'left', padding: '14px 18px', borderRadius: 14,
                border: '1px solid ' + (selectedTemplate.id === tpl.id ? 'var(--green)' : 'var(--line)'),
                background: selectedTemplate.id === tpl.id ? 'var(--green-tint)' : 'var(--surface)',
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{tpl.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', letterSpacing: '.02em' }}>{tpl.id}</div>
                {tpl.subject && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 5 }}>{tpl.subject}</div>}
              </button>
            ))}
            <div style={{ fontSize: 12.5, color: 'var(--ink-4)', padding: '6px 2px', lineHeight: 1.6 }}>Click a template to load it into the composer. Most of them leave slots for you to fill in — the composer will not send until they are gone.</div>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.1fr .8fr', padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', textTransform: 'uppercase', gap: 12 }}>
              <span>Subject</span><span>Sent to</span><span>Outcome</span><span>When</span>
            </div>
            {loading && !history ? (
              <EmptyNote height={140}>Loading…</EmptyNote>
            ) : !history?.broadcasts.length ? (
              <EmptyNote height={140}>Nothing has been sent yet.</EmptyNote>
            ) : history.broadcasts.map((n: BroadcastRecord) => (
              <div key={n.id} style={{ padding: '13px 18px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.1fr .8fr', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.subject || '(no subject)'}</span>
                  <span style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{n.audienceLabel || audienceLabel(n.audience)}</span>
                  <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{outcomeLine(n)} <span style={{ color: 'var(--ink-4)' }}>· {channelLabel(n.channel)}</span></span>
                  <span style={{ color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', fontSize: 11.5 }}>{relativeTime(n.createdAt)}</span>
                </div>
                {(n.emailError || n.sentLabel) && (
                  <div style={{ marginTop: 5, fontSize: 11.5, color: n.emailError ? 'var(--clay)' : 'var(--ink-4)', lineHeight: 1.5 }}>
                    {n.sentLabel ? 'by ' + n.sentLabel : ''}{n.sentLabel && n.emailError ? ' · ' : ''}{n.emailError ?? ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: template sidebar (only on compose) */}
      {tab === 'compose' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 12 }}>QUICK TEMPLATES</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {NOTIFICATION_TEMPLATES.filter(t => t.id !== 'admin.custom_message').slice(0, 5).map(tpl => (
                <button key={tpl.id} onClick={() => applyTemplate(tpl)} style={{
                  textAlign: 'left', padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid ' + (selectedTemplate.id === tpl.id ? 'var(--green)' : 'var(--line)'),
                  background: selectedTemplate.id === tpl.id ? 'var(--green-tint)' : 'var(--bg-2)',
                  fontSize: 13, fontWeight: 500,
                }}>
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Two variables, not ten. The old list advertised eight the server has
              never been able to fill. */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 10 }}>FILLED IN PER PERSON</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {RESOLVED_TOKENS.map(v => (
                <div key={v} style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--sky)', background: sTint('var(--sky)', 10), borderRadius: 6, padding: '4px 9px', width: 'fit-content' }}>{'{{' + v + '}}'}</div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 10, lineHeight: 1.55 }}>
              Anything else in double braces is left for you to replace. The composer blocks the send until none are left.
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.6 }}>
            Up to {maxEmails} emails and {MAX_IN_APP.toLocaleString()} in-app notices per send. A larger audience is refused outright rather than half-delivered.
          </div>
        </div>
      )}

      {/* A broadcast cannot be unsent, so the size of it is stated once more,
          in numbers, before the button that does it. */}
      {confirm && (
      <Modal onClose={() => setConfirm(false)} width={460}>
        <ModalHead icon="bell" title="Send this notification?" onClose={() => setConfirm(false)}
          sub={audienceLabel(audience, handle.trim().replace(/^@/, '')) + ' · ' + channelLabel(channel)} />
        <div style={{ padding: '0 24px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{subject.trim()}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto' }}>{body.trim()}</div>
          </div>
          {audience !== 'user' && (
            <div style={{ background: sTint('var(--clay)', 12), border: '1px solid ' + sTint('var(--clay)', 30), borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--clay)', lineHeight: 1.6 }}>
              This goes to {size == null ? 'every account in that audience' : size + (size === 1 ? ' person' : ' people')} at once and cannot be recalled.
              {willEmail && mailable != null && mailable > 0 && ' ' + mailable + ' of them by email.'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
          <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
          <button className="btn btn-green" onClick={send} disabled={sending} style={{ opacity: sending ? 0.5 : 1 }}>
            <Icon name="bell" size={14} /> {sending ? 'Sending…' : 'Send it'}
          </button>
        </div>
      </Modal>
      )}
    </div>
  );
}

// =====================================================================
// COMMUNITY REPORTS (admin view — all community + escalated comment reports)
// =====================================================================
function AdminCommunityReports({ getToken, log, adminEmail }: any) {
  const app = useApp();
  const [reports, setReports] = React.useState<CommunityReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [available, setAvailable] = React.useState(true);
  const [canAct, setCanAct] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<string>('pending');
  const [sel, setSel] = React.useState<string | null>(null);

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;

  // The whole queue in one request, then filtered here. The chips need counts
  // for every status, so fetching one status at a time would mean five requests
  // to draw the row of buttons above the list.
  const load = React.useCallback(async () => {
    const t = await tokenRef.current?.().catch(() => null);
    const res = await listReports(t ?? null, 'all');
    setReports(res.reports);
    setAvailable(res.available);
    setCanAct(res.canAct);
    setError(res.error ?? null);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // The realtime subscription that used to be here has been removed rather than
  // ported. It listened for postgres_changes on community_reports through the
  // browser's anon Supabase client, and Realtime applies RLS to what it
  // delivers — with no policy matching an anon reader, it could never have
  // fired. Reloading after acting is what actually kept the list current.

  const act = async (id: string, status: ReportStatus, note?: string) => {
    setBusy(id);
    const t = await tokenRef.current?.().catch(() => null);
    const { report, error: err } = await resolveReport(t ?? null, { id, status, note, actorLabel: adminEmail ?? 'Admin' });
    setBusy(null);
    if (err || !report) {
      // The old version moved the card regardless — the update it sent matched
      // zero rows under RLS and returned no error, so the queue disagreed with
      // the database until the next refresh. Nothing moves now unless the
      // server says it did.
      setError(err ?? 'That report could not be updated.');
      app.toast?.({ msg: 'Could not update the report', sub: err ?? undefined, kind: 'error', icon: 'close' });
      return;
    }
    setReports(rs => rs.map(r => r.id === id ? { ...r, status: report.status, adminNote: note ?? r.adminNote } : r));
    setSel(null);
    setError(null);
    log?.(status === 'dismissed' ? 'dismissed a community report' : 'resolved a community report', note ?? '', status === 'dismissed' ? 'close' : 'check');
    app.toast?.({ msg: status === 'dismissed' ? 'Report dismissed' : 'Report resolved', kind: 'success', icon: 'check' });
  };

  const statusColor: Record<string, string> = { pending: 'var(--sun)', owner_actioned: 'var(--sky)', escalated: 'var(--clay)', admin_resolved: 'var(--green)', dismissed: 'var(--ink-3)' };
  const FILTERS = [['pending', 'Pending'], ['escalated', 'Escalated'], ['owner_actioned', 'Owner actioned'], ['admin_resolved', 'Resolved'], ['all', 'All']];
  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const selR = filtered.find(r => r.id === sel) ?? filtered[0] ?? null;

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const escalatedCount = reports.filter(r => r.status === 'escalated').length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 4 }}>COMMUNITY REPORTS</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Community &amp; reply reports</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Community-level reports go straight to admin. Reply reports go to the community owner first — escalated ones land here too.</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 18px', fontSize: 13 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 700, color: pendingCount > 0 ? 'var(--sun)' : 'var(--ink-3)' }}>{pendingCount}</span>
            <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>pending</span>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 18px', fontSize: 13 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 700, color: escalatedCount > 0 ? 'var(--clay)' : 'var(--ink-3)' }}>{escalatedCount}</span>
            <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>escalated</span>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 18px', fontSize: 13 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 700, color: 'var(--ink-2)' }}>{reports.length}</span>
            <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>total</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => { setFilter(k); setSel(null); }} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
            {l}
            {(k === 'pending' && pendingCount > 0) && <span style={{ marginLeft: 4, fontFamily: 'JetBrains Mono', opacity: .7 }}>· {pendingCount}</span>}
            {(k === 'escalated' && escalatedCount > 0) && <span style={{ marginLeft: 4, fontFamily: 'JetBrains Mono', color: 'var(--clay)', opacity: .9 }}>· {escalatedCount}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ color: 'var(--ink-3)', padding: 40, textAlign: 'center' }}>Loading reports…</div>
      ) : !available ? (
        // Not the same as an empty queue, and the difference is the whole point:
        // "no reports" is a claim about the platform, and it can't be made when
        // the question was never asked.
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', border: '1px dashed var(--line)', borderRadius: 16, fontSize: 13.5, lineHeight: 1.6 }}>
          The moderation queue isn't set up on this database yet.<br />
          Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>supabase/migrations/041_account_freeze.sql</code> and reload.
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-4)', border: '1px dashed var(--line)', borderRadius: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🛡️</div>
          <div style={{ fontSize: 14 }}>No {filter === 'all' ? '' : filter} reports</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16, alignItems: 'start' }}>
          {/* Queue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((r) => {
              const on = r.id === selR?.id;
              const community = r.community;
              const reporter = r.reporter;
              const ago = (() => { const s = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 1000); return s < 3600 ? `${Math.floor(s/60)}m ago` : s < 86400 ? `${Math.floor(s/3600)}h ago` : `${Math.floor(s/86400)}d ago`; })();
              return (
                <button key={r.id} onClick={() => setSel(r.id)} style={{ display: 'block', textAlign: 'left', width: '100%', cursor: 'pointer', padding: 16, borderRadius: 16, border: '1px solid ' + (on ? 'var(--green)' : 'var(--line)'), background: on ? 'var(--green-tint)' : 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[r.status] ?? 'var(--ink-3)', flexShrink: 0 }} />
                    <span className="chip" style={{ fontSize: 10, fontFamily: 'JetBrains Mono', padding: '2px 7px', background: r.type === 'community' ? 'var(--green-tint)' : 'var(--sky-tint)', color: r.type === 'community' ? 'var(--green)' : 'var(--sky)' }}>{r.type}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--clay)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{ago}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{community?.name ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar name={reporter?.name ?? undefined} src={reporter?.avatarUrl ?? undefined} size={16} />
                    @{reporter?.handle ?? '?'}
                    {r.status !== 'pending' && <span style={{ marginLeft: 4, fontSize: 10, padding: '1px 6px', borderRadius: 5, background: (statusColor[r.status] ?? 'var(--ink-3)') + '20', color: statusColor[r.status] ?? 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{r.status.replace('_', ' ')}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {selR && (() => {
            const community = selR.community;
            const reporter = selR.reporter;
            const comment = selR.comment;
            return (
              <div style={{ position: 'sticky', top: 88, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: sTint('var(--clay)', 12), color: 'var(--clay)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="flag" size={18} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{selR.reason}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                      {selR.type} · {community?.name ?? '—'} · {(() => { const s = Math.floor((Date.now() - new Date(selR.createdAt).getTime()) / 1000); return s < 3600 ? `${Math.floor(s/60)}m ago` : s < 86400 ? `${Math.floor(s/3600)}h ago` : `${Math.floor(s/86400)}d ago`; })()}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: (statusColor[selR.status] ?? 'var(--ink-3)') + '18', color: statusColor[selR.status] ?? 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                    {selR.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ padding: 20 }}>
                  {comment?.body ? (
                    <>
                      <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>REPORTED REPLY</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>@{comment.author ?? '?'}</div>
                      <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg)', borderLeft: '3px solid var(--clay)', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, fontStyle: 'italic', marginBottom: 14 }}>{comment.body}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>REPORTED COMMUNITY</div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{community?.name ?? '—'}</div>
                    </>
                  )}
                  {selR.note && <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, marginBottom: 14 }}>"{selR.note}"</div>}
                  {selR.ownerAction && (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg)', fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Owner action:</span> {selR.ownerAction}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', marginBottom: 18 }}>
                    <Avatar name={reporter?.name ?? undefined} size={32} src={reporter?.avatarUrl ?? undefined} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{reporter?.name ?? 'User'}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{reporter?.handle ?? '?'}</div>
                    </div>
                    <span className="chip" style={{ marginLeft: 'auto', fontSize: 11 }}>reporter</span>
                  </div>
                  {(selR.status === 'pending' || selR.status === 'escalated') ? (
                    canAct ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <button className="btn btn-green" disabled={busy === selR.id} onClick={() => act(selR.id, 'admin_resolved')} style={{ justifyContent: 'center', padding: 12 }}><Icon name="check" size={15} /> Resolve — no action needed</button>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost" disabled={busy === selR.id} onClick={() => act(selR.id, 'admin_resolved', 'Content removed by admin')} style={{ flex: 1, justifyContent: 'center', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}><Icon name="trash" size={14} /> Remove content</button>
                          <button className="btn btn-ghost" disabled={busy === selR.id} onClick={() => act(selR.id, 'dismissed')} style={{ flex: 1, justifyContent: 'center' }}>Dismiss</button>
                        </div>
                      </div>
                    ) : (
                      // An analyst holds moderation.view and not moderation.act.
                      // The buttons are hidden rather than shown-and-rejected,
                      // because a control that always fails is worse than no
                      // control.
                      <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg)', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                        Your role can read the queue but not action it.
                      </div>
                    )
                  ) : (
                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg)', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                      Status: <strong style={{ color: 'var(--ink-2)' }}>{selR.status.replace('_', ' ')}</strong>
                      {selR.adminNote && <div style={{ marginTop: 6, fontStyle: 'italic' }}>"{selR.adminNote}"</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
