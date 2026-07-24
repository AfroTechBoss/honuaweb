"use client";
// v2
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { AdminProducts, AdminUsers, AdminSellers, AdminActivity } from "./admin-manage";
import { useAdminUser } from "@/components/admin-auth";

// =====================================================================
// Desktop Admin Console â€” platform owner / moderator workspace
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
      ['appeals', 'Appeals', 'flag'],
      ['products', 'Products', 'bag'],
      ['users', 'Users', 'users'],
      ['sellers', 'Sellers', 'leaf'],
      ['payouts', 'Payouts', 'coin'],
    ],
  },
  {
    label: 'System',
    items: [
      ['notifications', 'Notifications', 'bell'],
      ['roles', 'Roles', 'award'],
      ['activity', 'Activity', 'clock'],
      ['settings', 'Settings', 'settings'],
    ],
  },
];

// ---- Mock payout requests ----
const MOCK_PAYOUTS = [
  { id: 'pw001', seller: 'Loom & Linen', handle: 'loomlinen', amount: 1240.50, available: 1800.00, requestedAt: '2h ago', status: 'pending', destination: 'GTBank â€¢â€¢4521', trustScore: 92, openDisputes: 0, accountAge: '8 months' },
  { id: 'pw002', seller: 'Volt Garage', handle: 'voltgarage', amount: 580.00, available: 580.00, requestedAt: '5h ago', status: 'pending', destination: 'Stripe â€¢â€¢7834', trustScore: 88, openDisputes: 0, accountAge: '5 months' },
  { id: 'pw003', seller: 'Rootbound', handle: 'rootbound', amount: 3100.00, available: 3100.00, requestedAt: '1d ago', status: 'pending', destination: 'Wise â€¢â€¢2290', trustScore: 74, openDisputes: 1, accountAge: '2 months' },
  { id: 'pw004', seller: 'Pelagic Goods', handle: 'pelagic', amount: 420.00, available: 680.00, requestedAt: '2d ago', status: 'approved', destination: 'GTBank â€¢â€¢9912', trustScore: 95, openDisputes: 0, accountAge: '14 months' },
  { id: 'pw005', seller: 'Terra Bloom', handle: 'terrabloom', amount: 2200.00, available: 2200.00, requestedAt: '3d ago', status: 'rejected', destination: 'Stripe â€¢â€¢1103', trustScore: 61, openDisputes: 2, accountAge: '3 weeks', rejectReason: 'Open disputes must be resolved before withdrawal.' },
  { id: 'pw006', seller: 'Safi Studio', handle: 'safistudio', amount: 890.00, available: 890.00, requestedAt: '4d ago', status: 'on_hold', destination: 'Payoneer â€¢â€¢6647', trustScore: 70, openDisputes: 0, accountAge: '6 months' },
];

const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap(g => g.items);

// ---- Mock appeals ----
const MOCK_APPEALS = [
  { id: 'ap001', type: 'Post removal', entity: '"Organic Cotton Wrap Dress"', user: 'sophiamade', userName: 'Sophia Adeyemi', submittedAt: '1h ago', status: 'open', originalAction: 'Post removed for misleading sustainability claims', userReason: 'My product is certified GOTS â€” every claim is accurate and documented. I can provide the certificate number.' },
  { id: 'ap002', type: 'Account suspension', entity: '@voltgarage', user: 'voltgarage', userName: 'Volt Garage', submittedAt: '4h ago', status: 'open', originalAction: 'Suspended for spam behaviour', userReason: 'I was posting product launch updates, not spam. My followers opted in and I have engagement metrics to prove it.' },
  { id: 'ap003', type: 'Seller rejection', entity: 'Green Roots Co.', user: 'greenroots', userName: 'Ama Osei', submittedAt: '7h ago', status: 'open', originalAction: 'Application rejected â€” insufficient certification', userReason: "I've uploaded my Fair Trade certificate directly to my profile. Please review the updated documents and reconsider." },
  { id: 'ap004', type: 'Post removal', entity: '"Bamboo Desk Set"', user: 'tidyterra', userName: 'Tidy Terra', submittedAt: '1d ago', status: 'upheld', originalAction: 'Removed â€” prohibited item category', userReason: 'This is FSC-certified bamboo, not a prohibited material.', resolution: 'Reviewed: products in this category require FSC certification uploaded at listing time â€” not retroactively. Decision upheld.', resolvedBy: 'admin@honua.co', resolvedAt: '20h ago' },
  { id: 'ap005', type: 'Account suspension', entity: '@rootbound', user: 'rootbound', userName: 'Rootbound', submittedAt: '2d ago', status: 'overturned', originalAction: 'Suspended following harassment report', userReason: 'The report was filed by a competing seller. I have screenshots showing they initiated contact and fabricated the incident.', resolution: 'After full review the original suspension was issued in error. Account reinstated and reporter flagged for bad-faith reporting.', resolvedBy: 'admin@honua.co', resolvedAt: '1d ago' },
];

// ---- Admin team (roles) ----
const MOCK_ADMIN_TEAM_INIT = [
  { id: 'r1', name: 'Chidi Okafor', email: 'chidi@honua.co', role: 'owner', since: 'Jan 2024' },
  { id: 'r2', name: 'Amara Singh', email: 'amara@honua.co', role: 'admin', since: 'Mar 2024' },
  { id: 'r3', name: 'Lena MÃ¼ller', email: 'lena@honua.co', role: 'moderator', since: 'Jun 2024' },
  { id: 'r4', name: 'Kwame Asante', email: 'kwame@honua.co', role: 'analyst', since: 'Sep 2024' },
];

// ---- Notification templates ----
const NOTIFICATION_TEMPLATES = [
  { id: 'account.suspension.temporary', name: 'Temporary Suspension', subject: 'Your account has been temporarily suspended', body: 'Hi {{user.name}},\n\nYour account has been temporarily suspended for the following reason: {{suspension_reason}}.\n\nThis will be reviewed within {{review_days}} business days. If you believe this is an error, you may submit an appeal from your account settings.\n\nHonua Trust & Safety' },
  { id: 'account.suspension.permanent', name: 'Permanent Ban', subject: 'Your account has been permanently suspended', body: 'Hi {{user.name}},\n\nAfter a thorough review, your account has been permanently suspended for violating our community guidelines.\n\nHonua Trust & Safety' },
  { id: 'content.post.removed', name: 'Post Removed', subject: 'A post has been removed', body: 'Hi {{user.name}},\n\nYour post "{{post_title}}" was removed for: {{violation_reason}}.\n\nYou may request a reconsideration within 14 days.\n\nHonua Trust & Safety' },
  { id: 'appeal.decision.approved', name: 'Appeal Overturned', subject: 'Your appeal has been approved', body: 'Hi {{user.name}},\n\nWe reviewed your appeal regarding {{entity}} and have overturned our earlier decision.\n\n{{resolution_note}}\n\nThank you for reaching out.\n\nHonua Trust & Safety' },
  { id: 'appeal.decision.denied', name: 'Appeal Upheld', subject: 'Update on your appeal', body: 'Hi {{user.name}},\n\nWe reviewed your appeal regarding {{entity}} and have upheld our earlier decision.\n\n{{resolution_note}}\n\nHonua Trust & Safety' },
  { id: 'seller.application.approved', name: 'Seller Approved', subject: 'Welcome to Honua as a seller!', body: 'Hi {{user.name}},\n\nYour seller application has been approved. You can now list products on Honua.\n\nKeep your sustainability certifications current â€” we review these periodically.\n\nWelcome aboard!\n\nThe Honua Team' },
  { id: 'seller.application.rejected', name: 'Seller Rejected', subject: 'Update on your seller application', body: 'Hi {{user.name}},\n\nAfter reviewing your application we are unable to approve it at this time.\n\nReason: {{rejection_reason}}\n\nYou may reapply once the issue is addressed.\n\nThe Honua Team' },
  { id: 'seller.certification.expiry', name: 'Cert Expiry Warning', subject: 'Your sustainability certification is expiring soon', body: 'Hi {{user.name}},\n\nYour {{cert_name}} certification expires on {{expiry_date}}. Please upload a renewed certificate before then to avoid a listing hold.\n\nThe Honua Team' },
  { id: 'admin.custom_message', name: 'Custom Message', subject: '', body: '' },
];

const MOCK_SENT_NOTIFICATIONS = [
  { id: 'n1', template: 'Temporary Suspension', target: '@voltgarage', sentAt: '3h ago', channel: 'email + in-app', sentBy: 'admin@honua.co' },
  { id: 'n2', template: 'Post Removed', target: '@sophiamade', sentAt: '1d ago', channel: 'in-app', sentBy: 'admin@honua.co' },
  { id: 'n3', template: 'Seller Approved', target: '@loomlinen', sentAt: '2d ago', channel: 'email + in-app', sentBy: 'admin@honua.co' },
  { id: 'n4', template: 'Custom Message', target: 'All sellers (12)', sentAt: '4d ago', channel: 'email', sentBy: 'admin@honua.co' },
];

export function DesktopAdmin({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const { email: adminEmail, logout: adminLogout } = useAdminUser();
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
  const [section, setSection] = React.useState('overview');
  const [collapsed, setCollapsed] = React.useState(false);

  // ----- live, mutable platform data (session only) -----
  const [reports, setReports] = React.useState(MOCK_ADMIN.reports);
  const [products, setProducts] = React.useState(MOCK_ADMIN.products);
  const [users, setUsers] = React.useState(MOCK_ADMIN.users);
  const [audit, setAudit] = React.useState(MOCK_ADMIN.audit);
  const [payouts, setPayouts] = React.useState(MOCK_PAYOUTS);
  const [appeals, setAppeals] = React.useState(MOCK_APPEALS);
  const [adminTeam, setAdminTeam] = React.useState(MOCK_ADMIN_TEAM_INIT);

  const log = (action, target, kind = 'check') =>
    setAudit(a => [{ id: 'l' + Date.now(), actor: 'You', action, target, time: 'just now', kind }, ...a]);

  // moderation actions
  const resolveReport = (id, outcome) => {
    const r = reports.find(x => x.id === id);
    setReports(rs => rs.map(x => x.id === id ? { ...x, status: outcome } : x));
    if (outcome === 'resolved' && r) {
      setProducts(ps => ps.map(p => p.title === r.target ? { ...p, status: 'removed' } : p));
      log('removed reported ' + r.type.toLowerCase(), r.target, 'trash');
      app.toast?.({ msg: 'Report resolved', sub: r.target + ' removed', kind: 'success', icon: 'check' });
    } else if (outcome === 'dismissed') {
      log('dismissed a report', r?.target || '', 'close');
      app.toast?.({ msg: 'Report dismissed', sub: 'No action taken', icon: 'close' });
    }
  };
  const suspendFromReport = (id) => {
    const r = reports.find(x => x.id === id);
    if (!r) return;
    setUsers(us => us.map(u => u.handle === r.author ? { ...u, status: 'suspended' } : u));
    setReports(rs => rs.map(x => x.id === id ? { ...x, status: 'escalated' } : x));
    log('suspended account', '@' + r.author, 'lock');
    app.toast?.({ msg: 'Account suspended', sub: '@' + r.author, icon: 'lock' });
  };

  // product moderation
  const setProductStatus = (id, status) => {
    const p = products.find(x => x.id === id);
    setProducts(ps => ps.map(x => x.id === id ? { ...x, status, flags: status === 'live' ? 0 : x.flags } : x));
    log(status === 'removed' ? 'removed a product' : status === 'live' ? 'restored a product' : 'flagged a product', p?.title || '', status === 'removed' ? 'trash' : status === 'live' ? 'check' : 'flame');
    app.toast?.({ msg: status === 'removed' ? 'Product removed' : status === 'live' ? 'Product restored' : 'Product flagged', sub: p?.title, kind: status === 'live' ? 'success' : undefined, icon: status === 'removed' ? 'trash' : 'check' });
  };

  // user moderation
  const setUserStatus = (id, status) => {
    const u = users.find(x => x.id === id);
    setUsers(us => us.map(x => x.id === id ? { ...x, status } : x));
    const verb = status === 'suspended' ? 'suspended account' : status === 'banned' ? 'banned account' : 'reinstated account';
    log(verb, '@' + (u?.handle || ''), status === 'active' ? 'check' : 'lock');
    app.toast?.({ msg: verb.charAt(0).toUpperCase() + verb.slice(1), sub: '@' + u?.handle, kind: status === 'active' ? 'success' : undefined, icon: status === 'active' ? 'check' : 'lock' });
  };
  const setUserRole = (id, role) => {
    const u = users.find(x => x.id === id);
    setUsers(us => us.map(x => x.id === id ? { ...x, role } : x));
    log('changed role to ' + role, '@' + (u?.handle || ''), 'award');
    app.toast?.({ msg: 'Role updated', sub: '@' + u?.handle + ' â†’ ' + role, kind: 'success', icon: 'award' });
  };

  // payout actions
  const setPayoutStatus = (id, status, rejectReason?) => {
    setPayouts(ps => ps.map(p => p.id === id ? { ...p, status, ...(rejectReason ? { rejectReason } : {}) } : p));
    const payout = payouts.find(p => p.id === id);
    const verb = status === 'approved' ? 'approved payout' : status === 'rejected' ? 'rejected payout' : 'placed payout on hold';
    log(verb, payout?.seller || '', status === 'approved' ? 'coin' : status === 'rejected' ? 'close' : 'lock');
    app.toast?.({ msg: status === 'approved' ? 'Payout approved' : status === 'rejected' ? 'Payout rejected' : 'Payout on hold', sub: payout?.seller + ' Â· ' + sMoney(payout?.amount ?? 0), kind: status === 'approved' ? 'success' : undefined, icon: status === 'approved' ? 'coin' : status === 'rejected' ? 'close' : 'lock' });
  };

  // appeals actions
  const resolveAppeal = (id, outcome, resolution) => {
    const a = appeals.find(x => x.id === id);
    setAppeals(ap => ap.map(x => x.id === id ? { ...x, status: outcome, resolution, resolvedBy: adminEmail ?? 'Admin', resolvedAt: 'just now' } : x));
    const verb = outcome === 'overturned' ? 'overturned appeal' : 'upheld original decision';
    log(verb, a?.entity || '', outcome === 'overturned' ? 'check' : 'close');
    app.toast?.({ msg: outcome === 'overturned' ? 'Appeal overturned' : 'Decision upheld', sub: a?.entity, kind: outcome === 'overturned' ? 'success' : undefined, icon: outcome === 'overturned' ? 'check' : 'close' });
  };

  // team role change
  const changeTeamRole = (id, role) => {
    const m = adminTeam.find(x => x.id === id);
    setAdminTeam(t => t.map(x => x.id === id ? { ...x, role } : x));
    log('changed role to ' + role, m?.name || '', 'award');
    app.toast?.({ msg: 'Role updated', sub: (m?.name || '') + ' â†’ ' + role, kind: 'success', icon: 'award' });
  };

  const openCount = reports.filter(r => r.status === 'open').length;
  const flaggedCount = products.filter(p => p.status === 'flagged').length;
  const pendingSellers = (app.state?.sellerStatus === 'pending' ? 1 : 0) + MOCK_APPLICATIONS.length;
  const pendingPayouts = payouts.filter(p => p.status === 'pending').length;
  const pendingAppeals = appeals.filter(a => a.status === 'open').length;
  const badges = { moderation: openCount, appeals: pendingAppeals, products: flaggedCount, sellers: pendingSellers, payouts: pendingPayouts };

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
            <Avatar name={adminEmail ?? 'Admin'} size={30} noBorder />
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
              <Avatar name={adminEmail ?? 'Admin'} size={32} />
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: 13, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminEmail ?? 'Admin'}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>Owner</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 28px 60px' }}>
          {section === 'overview' && <AdminOverview reports={reports} users={users} products={products} audit={audit} appeals={appeals} onSection={setSection} />}
          {section === 'moderation' && <AdminModeration reports={reports} onResolve={resolveReport} onSuspend={suspendFromReport} />}
          {section === 'appeals' && <AdminAppeals appeals={appeals} onResolve={resolveAppeal} />}
          {section === 'products' && <AdminProducts products={products} onStatus={setProductStatus} />}
          {section === 'users' && <AdminUsers users={users} onStatus={setUserStatus} onRole={setUserRole} />}
          {section === 'sellers' && <AdminSellers onNav={onNav} />}
          {section === 'payouts' && <AdminPayouts payouts={payouts} onAction={setPayoutStatus} />}
          {section === 'notifications' && <AdminNotifications log={log} />}
          {section === 'roles' && <AdminRoles team={adminTeam} onChangeRole={changeTeamRole} />}
          {section === 'activity' && <AdminActivity audit={audit} />}
          {section === 'analytics' && <AdminAnalytics />}
          {section === 'settings' && <AdminSettings />}
        </div>
      </main>
    </div>
  );
};

// =====================================================================
// OVERVIEW
// =====================================================================
function AdminOverview({ reports, users, products, audit, appeals, onSection }) {
  const s = MOCK_ADMIN.stats;
  const openCount = reports.filter(r => r.status === 'open').length;
  const suspended = users.filter(u => u.status !== 'active').length;
  const openAppeals = appeals.filter(a => a.status === 'open').length;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Members" value={s.members.toLocaleString()} icon="users" trend={s.membersTrend} sub="vs last month" />
        <SStat label="Active sellers" value={s.sellers} icon="leaf" trend={s.sellersTrend} sub="vs last month" />
        <SStat label="GMV Â· 30d" value={sMoney(s.gmv, 0)} icon="coin" trend={s.gmvTrend} accent="var(--sun)" />
        <SStat label="Daily active" value={s.dau.toLocaleString()} icon="bolt" trend={s.dauTrend} accent="var(--sky)" />
      </div>

      {/* charts + attention */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>Gross marketplace volume</div>
              <div className="font-display tabular" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 2 }}>{sMoney(s.gmv, 0)}</div>
            </div>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>â†‘ {s.gmvTrend}%</span>
          </div>
          <div style={{ marginTop: 14 }}><SSpark data={MOCK_ADMIN.gmvSeries} color="var(--green)" w={620} h={120} /></div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Needs your attention</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <AttnRow icon="flame" color="var(--clay)" label="Open reports" value={openCount} onClick={() => onSection('moderation')} />
            <AttnRow icon="flag" color="var(--sky)" label="Open appeals" value={openAppeals} onClick={() => onSection('appeals')} />
            <AttnRow icon="bag" color="var(--sun)" label="Flagged products" value={products.filter(p => p.status === 'flagged').length} onClick={() => onSection('products')} />
            <AttnRow icon="leaf" color="var(--sky)" label="Seller applications" value={MOCK_APPLICATIONS.length} onClick={() => onSection('sellers')} />
            <AttnRow icon="lock" color="var(--ink-3)" label="Suspended / banned" value={suspended} onClick={() => onSection('users')} />
          </div>
        </div>
      </div>

      {/* member growth + recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Member growth Â· 30 days</div>
          <div style={{ marginTop: 14 }}><SSpark data={MOCK_ADMIN.memberSeries} color="var(--sky)" w={420} h={90} /></div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Recent activity</span>
            <button onClick={() => onSection('activity')} style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>View log â†’</button>
          </div>
          <div style={{ display: 'grid', gap: 2 }}>
            {audit.slice(0, 5).map(a => <AuditLine key={a.id} a={a} compact />)}
          </div>
        </div>
      </div>
    </div>
  );
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
  const tone = { trash: 'var(--clay)', lock: 'var(--sun)', flame: 'var(--clay)', check: 'var(--green)', close: 'var(--ink-3)', logout: 'var(--clay)', coin: 'var(--sun)', award: 'var(--sky)' }[a.kind] || 'var(--ink-3)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: compact ? '8px 0' : '12px 4px', borderBottom: compact ? 'none' : '1px solid var(--line)' }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: sTint(tone), color: tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={a.kind} size={15} /></span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.4 }}>
        <span style={{ fontWeight: 600 }}>{a.actor}</span> <span style={{ color: 'var(--ink-3)' }}>{a.action}</span> <span style={{ fontWeight: 500 }}>{a.target}</span>
      </div>
      <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{a.time}</span>
    </div>
  );
};

// =====================================================================
// MODERATION
// =====================================================================
function AdminModeration({ reports, onResolve, onSuspend }) {
  const [filter, setFilter] = React.useState('open');
  const [sel, setSel] = React.useState(null);
  const filtered = reports.filter(r => filter === 'all' ? true : r.status === filter);
  const selR = filtered.find(r => r.id === sel) || filtered[0];

  const sevColor = { high: 'var(--clay)', medium: 'var(--sun)', low: 'var(--ink-3)' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['open', 'Open'], ['escalated', 'Escalated'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['all', 'All']].map(([k, l]) => (
          <button key={k} onClick={() => { setFilter(k); setSel(null); }} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
            {l} {k === 'open' && <span style={{ fontFamily: 'JetBrains Mono', opacity: .7 }}>Â· {reports.filter(r => r.status === 'open').length}</span>}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 16, alignItems: 'start' }}>
        {/* queue */}
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(r => {
            const on = r.id === selR?.id;
            return (
              <button key={r.id} onClick={() => setSel(r.id)} style={{
                display: 'block', textAlign: 'left', width: '100%', cursor: 'pointer', padding: 16, borderRadius: 16,
                border: '1px solid ' + (on ? 'var(--green)' : 'var(--line)'), background: on ? 'var(--green-tint)' : 'var(--surface)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor[r.severity], flexShrink: 0 }} />
                  <span className="chip" style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', padding: '2px 7px' }}>{r.type}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--clay)' }}>{r.reason}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{r.time}</span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{r.target}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={r.authorName} size={18} /> @{r.author} Â· {r.reporters} report{r.reporters > 1 ? 's' : ''}
                  {r.status !== 'open' && <SBadge status={r.status} size="sm" />}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14, border: '1px dashed var(--line-2)', borderRadius: 16 }}>Nothing here â€” queue is clear</div>}
        </div>

        {/* detail */}
        {selR ? (
          <div style={{ position: 'sticky', top: 88, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: sTint('var(--clay)', 12), color: 'var(--clay)', display: 'grid', placeItems: 'center' }}><Icon name="flame" size={18} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{selR.reason}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{selR.type} Â· {selR.reporters} reporter{selR.reporters > 1 ? 's' : ''} Â· {selR.time}</div>
              </div>
              <SBadge status={selR.status} />
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>REPORTED {selR.type.toUpperCase()}</div>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{selR.target}</div>
              <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: 'var(--bg-2)', borderLeft: '3px solid var(--clay)', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, fontStyle: 'italic' }}>{selR.excerpt}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                <Avatar name={selR.authorName} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selR.authorName}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{selR.author}</div>
                </div>
                <span className="chip" style={{ fontSize: 11 }}>posted the content</span>
              </div>

              {selR.status === 'open' ? (
                <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
                  <button className="btn btn-green" onClick={() => onResolve(selR.id, 'resolved')} style={{ justifyContent: 'center', padding: '12px' }}><Icon name="trash" size={15} /> Remove content</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => onSuspend(selR.id)} style={{ flex: 1, justifyContent: 'center', color: 'var(--sun)', borderColor: sTint('var(--sun)', 30) }}><Icon name="lock" size={15} /> Suspend author</button>
                    <button className="btn btn-ghost" onClick={() => onResolve(selR.id, 'dismissed')} style={{ flex: 1, justifyContent: 'center' }}>Dismiss</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: 'var(--bg-2)', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                  This report is <strong style={{ color: 'var(--ink-2)' }}>{selR.status}</strong>. No further action needed.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// =====================================================================
// ANALYTICS (stub)
// =====================================================================
function AdminAnalytics() {
  const s = MOCK_ADMIN.stats;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Page views Â· 7d" value="84.2K" icon="bolt" trend={12} accent="var(--sky)" />
        <SStat label="Avg. session" value="4m 38s" icon="clock" trend={5} />
        <SStat label="Retention Â· 30d" value="61%" icon="users" trend={3} accent="var(--green)" />
        <SStat label="Conversion" value="3.4%" icon="leaf" trend={-1} accent="var(--sun)" />
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Traffic Â· 30 days</div>
        <SSpark data={MOCK_ADMIN.memberSeries} color="var(--sky)" w={900} h={120} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Top pages</div>
          {[['Home feed', '32%'], ['Explore', '21%'], ['Marketplace', '18%'], ['Profile', '15%'], ['Communities', '14%']].map(([page, pct]) => (
            <div key={page} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ flex: 1, fontSize: 13.5 }}>{page}</span>
              <div style={{ width: 120, height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                <div style={{ width: pct, height: '100%', borderRadius: 999, background: 'var(--green)' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', width: 36, textAlign: 'right' }}>{pct}</span>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Acquisition sources</div>
          {[['Direct', '41%', 'var(--green)'], ['Search', '28%', 'var(--sky)'], ['Social', '19%', 'var(--sun)'], ['Referral', '12%', 'var(--clay)']].map(([src, pct, color]) => (
            <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13.5 }}>{src}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{pct}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// PAYOUTS
// =====================================================================
function AdminPayouts({ payouts, onAction }) {
  const [filter, setFilter] = React.useState('pending');
  const [sel, setSel] = React.useState(null);
  const [rejectModal, setRejectModal] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const filtered = payouts.filter(p => filter === 'all' ? true : p.status === filter);
  const selP = filtered.find(p => p.id === sel) || filtered[0];

  const totalPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalApproved = payouts.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0);

  const statusColor = { pending: 'var(--sun)', approved: 'var(--green)', rejected: 'var(--clay)', on_hold: 'var(--ink-3)' };
  const statusLabel = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', on_hold: 'On Hold' };

  const trustColor = (score) => score >= 85 ? 'var(--green)' : score >= 70 ? 'var(--sun)' : 'var(--clay)';

  const handleReject = () => {
    if (!rejectReason.trim() || !rejectModal) return;
    onAction(rejectModal, 'rejected', rejectReason);
    setRejectModal(null);
    setRejectReason('');
    setSel(null);
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Pending requests" value={payouts.filter(p => p.status === 'pending').length} icon="clock" accent="var(--sun)" sub="awaiting review" />
        <SStat label="Pending volume" value={sMoney(totalPending, 0)} icon="coin" accent="var(--sun)" sub="to be disbursed" />
        <SStat label="Approved Â· 7d" value={payouts.filter(p => p.status === 'approved').length} icon="check" accent="var(--green)" sub={sMoney(totalApproved, 0)} />
        <SStat label="On hold" value={payouts.filter(p => p.status === 'on_hold').length} icon="lock" accent="var(--ink-3)" sub="under review" />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['pending', 'Pending'], ['approved', 'Approved'], ['on_hold', 'On Hold'], ['rejected', 'Rejected'], ['all', 'All']].map(([k, l]) => (
          <button key={k} onClick={() => { setFilter(k); setSel(null); }} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
            {l}{k === 'pending' && payouts.filter(p => p.status === 'pending').length > 0 && (
              <span style={{ fontFamily: 'JetBrains Mono', opacity: .7 }}> Â· {payouts.filter(p => p.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 16, alignItems: 'start' }}>
        {/* Queue */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            <span>Seller</span><span>Amount</span><span>Trust</span><span>Status</span>
          </div>
          {filtered.map(p => {
            const on = p.id === (selP?.id);
            return (
              <button key={p.id} onClick={() => setSel(p.id)} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, width: '100%', textAlign: 'left',
                padding: '14px 18px', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', alignItems: 'center',
                background: on ? 'var(--green-tint)' : 'transparent',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <Avatar name={p.seller} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.seller}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{p.requestedAt}</div>
                  </div>
                </span>
                <span className="tabular" style={{ fontSize: 14, fontWeight: 700 }}>{sMoney(p.amount, 0)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: trustColor(p.trustScore), flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontFamily: 'JetBrains Mono', fontWeight: 600, color: trustColor(p.trustScore) }}>{p.trustScore}</span>
                </span>
                <span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: sTint(statusColor[p.status], 14), color: statusColor[p.status], fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                    {statusLabel[p.status]}
                  </span>
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>No requests in this view</div>}
        </div>

        {/* Detail panel */}
        {selP && (
          <div style={{ position: 'sticky', top: 88, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={selP.seller} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selP.seller}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{selP.handle} Â· {selP.accountAge} old</div>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 7, background: sTint(statusColor[selP.status], 14), color: statusColor[selP.status], fontFamily: 'JetBrains Mono' }}>
                {statusLabel[selP.status]}
              </span>
            </div>

            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              {/* Amount breakdown */}
              <div style={{ background: 'var(--bg-2)', borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Requested amount</span>
                  <span className="font-display tabular" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>{sMoney(selP.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>
                  <span>Available balance</span><span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{sMoney(selP.available)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
                  <span>Destination</span><span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{selP.destination}</span>
                </div>
              </div>

              {/* Risk signals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>TRUST SCORE</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                      <div style={{ width: selP.trustScore + '%', height: '100%', borderRadius: 999, background: trustColor(selP.trustScore) }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: trustColor(selP.trustScore), fontFamily: 'JetBrains Mono' }}>{selP.trustScore}</span>
                  </div>
                </div>
                <div style={{ background: selP.openDisputes > 0 ? sTint('var(--clay)', 12) : 'var(--bg-2)', border: selP.openDisputes > 0 ? '1px solid ' + sTint('var(--clay)', 28) : '1px solid transparent', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: selP.openDisputes > 0 ? 'var(--clay)' : 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>OPEN DISPUTES</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: selP.openDisputes > 0 ? 'var(--clay)' : 'var(--ink)' }}>{selP.openDisputes}</div>
                </div>
              </div>

              {selP.rejectReason && (
                <div style={{ padding: '11px 14px', borderRadius: 11, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 24), fontSize: 13, color: 'var(--clay)', lineHeight: 1.5 }}>
                  <strong>Rejection reason:</strong> {selP.rejectReason}
                </div>
              )}

              {selP.status === 'pending' && (
                <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                  {selP.openDisputes > 0 && (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 24), fontSize: 12.5, color: 'var(--clay)' }}>
                      âš  This seller has {selP.openDisputes} open dispute{selP.openDisputes > 1 ? 's' : ''}. Consider holding until resolved.
                    </div>
                  )}
                  <button className="btn btn-green" onClick={() => onAction(selP.id, 'approved')} style={{ justifyContent: 'center', padding: '12px' }}>
                    <Icon name="check" size={15} /> Approve Â· {sMoney(selP.amount, 0)}
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => onAction(selP.id, 'on_hold')} style={{ flex: 1, justifyContent: 'center', color: 'var(--ink-3)' }}>
                      <Icon name="lock" size={14} /> Hold
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setRejectModal(selP.id); setRejectReason(''); }} style={{ flex: 1, justifyContent: 'center', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
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
                  <button className="btn btn-green" onClick={() => onAction(selP.id, 'approved')} style={{ justifyContent: 'center', padding: '12px' }}>
                    <Icon name="check" size={15} /> Approve Â· {sMoney(selP.amount, 0)}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setRejectModal(selP.id); setRejectReason(''); }} style={{ justifyContent: 'center', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
                    <Icon name="close" size={14} /> Reject
                  </button>
                </div>
              )}

              {(selP.status === 'approved' || selP.status === 'rejected') && (
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-2)', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                  This request is <strong style={{ color: 'var(--ink-2)' }}>{statusLabel[selP.status]}</strong>. No further action.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <Modal onClose={() => setRejectModal(null)} width={460}>
          <ModalHead icon="close" title="Reject withdrawal" sub="The seller will be notified with your reason." onClose={() => setRejectModal(null)} />
          <div style={{ padding: '18px 24px 0' }}>
            <label>
              <span className="fld-label">Reason for rejection</span>
              <textarea className="fld" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Open dispute must be resolved before withdrawal can be processed." style={{ resize: 'none' }} />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
            <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
            <button className="btn btn-ghost" disabled={!rejectReason.trim()} onClick={handleReject} style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30), opacity: rejectReason.trim() ? 1 : 0.5 }}>
              <Icon name="close" size={14} /> Reject request
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// SETTINGS (stub)
// =====================================================================
function AdminSettings() {
  const app = useApp();
  const [emailNotifs, setEmailNotifs] = React.useState(true);
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [registrationOpen, setRegistrationOpen] = React.useState(true);
  const [reviewRequired, setReviewRequired] = React.useState(false);
  const [locked, setLocked] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [confirmLock, setConfirmLock] = React.useState(false);
  const [lockInput, setLockInput] = React.useState('');

  const executeClearReports = () => {
    setConfirmClear(false);
    app.toast?.({ kind: 'success', msg: 'Reports cleared', sub: 'All moderation reports have been archived.', icon: 'check' });
  };

  const executeLockPlatform = () => {
    const next = !locked;
    setLocked(next);
    setMaintenanceMode(next);
    setConfirmLock(false);
    setLockInput('');
    app.toast?.({
      kind: next ? undefined : 'success',
      msg: next ? 'Platform locked' : 'Platform unlocked',
      sub: next ? 'New sign-ins are blocked. Existing sessions still work.' : 'Platform is back to normal operation.',
      icon: next ? 'lock' : 'check',
    });
  };

  const Row = ({ label, sub, checked, onChange }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <ToggleC checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 720 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: '6px 22px 6px' }}>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.07em', padding: '14px 0 10px' }}>PLATFORM</div>
        <Row label="Open registration" sub="Allow new users to sign up" checked={registrationOpen} onChange={() => setRegistrationOpen(v => !v)} />
        <Row label="Maintenance mode" sub="Show a maintenance page to non-admin visitors" checked={maintenanceMode} onChange={() => setMaintenanceMode(v => !v)} />
        <Row label="Seller review required" sub="New seller applications need manual approval" checked={reviewRequired} onChange={() => setReviewRequired(v => !v)} />
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: '6px 22px 6px' }}>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.07em', padding: '14px 0 10px' }}>NOTIFICATIONS</div>
        <Row label="Admin email alerts" sub="Get emailed when reports or seller applications arrive" checked={emailNotifs} onChange={() => setEmailNotifs(v => !v)} />
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.07em', marginBottom: 6 }}>DANGER ZONE</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>These actions are irreversible or have significant platform impact. Proceed with caution.</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setConfirmClear(true)} style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
            <Icon name="trash" size={14} /> Clear all reports
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirmLock(true)} style={{ color: locked ? 'var(--green)' : 'var(--clay)', borderColor: locked ? sTint('var(--green)', 30) : sTint('var(--clay)', 30) }}>
            <Icon name="lock" size={14} /> {locked ? 'Unlock platform' : 'Lock platform'}
          </button>
        </div>
      </div>

      {/* Clear reports confirmation */}
      {confirmClear && (
      <Modal onClose={() => setConfirmClear(false)} width={440}>
        <ModalHead icon="trash" title="Clear all reports?" onClose={() => setConfirmClear(false)} sub="This will permanently archive every open moderation report." />
        <div style={{ padding: '0 24px 4px' }}>
          <div style={{ background: sTint('var(--clay)', 12), border: `1px solid ${sTint('var(--clay)', 30)}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--clay)', lineHeight: 1.6 }}>
            âš  All pending reports will be marked as archived and removed from the moderation queue. This cannot be undone.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
          <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
          <button className="btn btn-ghost" onClick={executeClearReports} style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
            <Icon name="trash" size={14} /> Yes, clear all reports
          </button>
        </div>
      </Modal>
      )}

      {/* Lock / unlock platform confirmation */}
      {confirmLock && (
      <Modal onClose={() => { setConfirmLock(false); setLockInput(''); }} width={460}>
        <ModalHead icon="lock" title={locked ? 'Unlock platform?' : 'Lock platform?'} onClose={() => { setConfirmLock(false); setLockInput(''); }}
          sub={locked ? 'This will restore normal access for all users.' : 'New sign-ins will be blocked immediately.'} />
        <div style={{ padding: '0 24px 4px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: sTint('var(--clay)', 12), border: `1px solid ${sTint('var(--clay)', 30)}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--clay)', lineHeight: 1.6 }}>
            {locked
              ? 'âš  Unlocking will re-enable sign-ins and restore all platform functionality.'
              : 'âš  Locking will prevent any new users from signing in. Existing active sessions are unaffected.'}
          </div>
          {!locked && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Type <strong>LOCK</strong> to confirm</span>
              <input className="fld" value={lockInput} onChange={e => setLockInput(e.target.value)} placeholder="LOCK" autoFocus />
            </label>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
          <button className="btn btn-ghost" onClick={() => { setConfirmLock(false); setLockInput(''); }}>Cancel</button>
          <button className="btn btn-ghost"
            onClick={executeLockPlatform}
            disabled={!locked && lockInput !== 'LOCK'}
            style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30), opacity: (!locked && lockInput !== 'LOCK') ? 0.4 : 1 }}>
            <Icon name="lock" size={14} /> {locked ? 'Yes, unlock platform' : 'Yes, lock platform'}
          </button>
        </div>
      </Modal>
      )}
    </div>
  );
}

// =====================================================================
// APPEALS
// =====================================================================
function AdminAppeals({ appeals, onResolve }) {
  const [filter, setFilter] = React.useState('open');
  const [sel, setSel] = React.useState(null);
  const [modal, setModal] = React.useState<{ id: string; outcome: 'overturned' | 'upheld' } | null>(null);
  const [resolution, setResolution] = React.useState('');

  const filtered = appeals.filter(a => filter === 'all' ? true : a.status === filter);
  const selA = filtered.find(a => a.id === sel) || filtered[0];

  const typeColor = { 'Post removal': 'var(--sun)', 'Account suspension': 'var(--clay)', 'Seller rejection': 'var(--sky)' };

  const handleResolve = () => {
    if (!modal || !resolution.trim()) return;
    onResolve(modal.id, modal.outcome, resolution);
    setModal(null);
    setResolution('');
    setSel(null);
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Open appeals" value={appeals.filter(a => a.status === 'open').length} icon="flag" accent="var(--sky)" sub="awaiting review" />
        <SStat label="Overturned" value={appeals.filter(a => a.status === 'overturned').length} icon="check" accent="var(--green)" sub="original reversed" />
        <SStat label="Upheld" value={appeals.filter(a => a.status === 'upheld').length} icon="close" accent="var(--clay)" sub="original confirmed" />
        <SStat label="Total appeals" value={appeals.length} icon="clock" sub="all time" />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['open', 'Open'], ['overturned', 'Overturned'], ['upheld', 'Upheld'], ['all', 'All']].map(([k, l]) => (
          <button key={k} onClick={() => { setFilter(k); setSel(null); }} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
            {l}{k === 'open' && appeals.filter(a => a.status === 'open').length > 0 && (
              <span style={{ fontFamily: 'JetBrains Mono', opacity: .7 }}> Â· {appeals.filter(a => a.status === 'open').length}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 16, alignItems: 'start' }}>
        {/* Queue */}
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(a => {
            const on = a.id === selA?.id;
            return (
              <button key={a.id} onClick={() => setSel(a.id)} style={{
                display: 'block', textAlign: 'left', width: '100%', cursor: 'pointer', padding: 16, borderRadius: 16,
                border: '1px solid ' + (on ? 'var(--sky)' : 'var(--line)'), background: on ? sTint('var(--sky)', 8) : 'var(--surface)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span className="chip" style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', padding: '2px 7px', background: sTint(typeColor[a.type] || 'var(--sky)', 14), color: typeColor[a.type] || 'var(--sky)', border: 'none' }}>{a.type}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{a.submittedAt}</span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4 }}>{a.entity}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={a.userName} size={18} /> @{a.user}
                  {a.status !== 'open' && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: a.status === 'overturned' ? sTint('var(--green)', 14) : sTint('var(--clay)', 14), color: a.status === 'overturned' ? 'var(--green)' : 'var(--clay)', fontFamily: 'JetBrains Mono' }}>
                      {a.status === 'overturned' ? 'Overturned' : 'Upheld'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14, border: '1px dashed var(--line-2)', borderRadius: 16 }}>No appeals in this view</div>}
        </div>

        {/* Detail panel */}
        {selA && (
          <div style={{ position: 'sticky', top: 88, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={selA.userName} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selA.userName}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{selA.user} Â· {selA.type}</div>
              </div>
              {selA.status !== 'open' && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: selA.status === 'overturned' ? sTint('var(--green)', 14) : sTint('var(--clay)', 14), color: selA.status === 'overturned' ? 'var(--green)' : 'var(--clay)', fontFamily: 'JetBrains Mono' }}>
                  {selA.status === 'overturned' ? 'Overturned' : 'Upheld'}
                </span>
              )}
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>ORIGINAL ACTION</div>
                <div style={{ padding: '11px 14px', borderRadius: 10, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 20), fontSize: 13, color: 'var(--clay)', lineHeight: 1.5 }}>{selA.originalAction}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>USER'S APPEAL</div>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-2)', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, fontStyle: 'italic' }}>"{selA.userReason}"</div>
              </div>
              {selA.resolution && (
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>RESOLUTION</div>
                  <div style={{ padding: '11px 14px', borderRadius: 10, background: sTint('var(--green)', 8), border: '1px solid ' + sTint('var(--green)', 20), fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                    {selA.resolution}
                    <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{selA.resolvedBy} Â· {selA.resolvedAt}</div>
                  </div>
                </div>
              )}
              {selA.status === 'open' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn btn-green" onClick={() => { setModal({ id: selA.id, outcome: 'overturned' }); setResolution(''); }} style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>
                    <Icon name="check" size={14} /> Overturn
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setModal({ id: selA.id, outcome: 'upheld' }); setResolution(''); }} style={{ flex: 1, justifyContent: 'center', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
                    <Icon name="close" size={14} /> Uphold original
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
            sub="Your resolution note will be logged and sent to the user."
            onClose={() => setModal(null)}
          />
          <div style={{ padding: '18px 24px 0' }}>
            <label>
              <span className="fld-label">Resolution note</span>
              <textarea className="fld" rows={3} value={resolution} onChange={e => setResolution(e.target.value)} placeholder={modal.outcome === 'overturned' ? 'e.g. After review the original action was issued in error. Account reinstated.' : 'e.g. We reviewed the appeal and confirm the original decision stands becauseâ€¦'} style={{ resize: 'none' }} />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button
              className={modal.outcome === 'overturned' ? 'btn btn-green' : 'btn btn-ghost'}
              disabled={!resolution.trim()}
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
function AdminNotifications({ log }) {
  const app = useApp();
  const [tab, setTab] = React.useState<'compose' | 'templates' | 'history'>('compose');
  const [selectedTemplate, setSelectedTemplate] = React.useState(NOTIFICATION_TEMPLATES[NOTIFICATION_TEMPLATES.length - 1]);
  const [target, setTarget] = React.useState('all_users');
  const [customTarget, setCustomTarget] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [channel, setChannel] = React.useState<'both' | 'email' | 'in-app'>('both');
  const [sent, setSent] = React.useState(MOCK_SENT_NOTIFICATIONS);

  const applyTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setTab('compose');
  };

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) return;
    const targetLabel = target === 'all_users' ? 'All users' : target === 'all_sellers' ? 'All sellers' : ('@' + customTarget);
    const channelLabel = channel === 'both' ? 'email + in-app' : channel;
    setSent(s => [{ id: 'n' + Date.now(), template: selectedTemplate.name, target: targetLabel, sentAt: 'just now', channel: channelLabel, sentBy: 'admin@honua.co' }, ...s]);
    log('sent notification "' + subject + '"', targetLabel, 'bell');
    app.toast?.({ msg: 'Notification sent', sub: targetLabel + ' Â· ' + channelLabel, kind: 'success', icon: 'check' });
    setSubject('');
    setBody('');
  };

  const targetOptions = [
    { value: 'all_users', label: 'All users' },
    { value: 'all_sellers', label: 'All sellers' },
    { value: 'specific', label: 'Specific user / seller' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start', maxWidth: 1000 }}>
      {/* Left: tabs */}
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['compose', 'templates', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={'chip' + (tab === t ? ' chip-green' : '')} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>

        {tab === 'compose' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22, display: 'grid', gap: 16 }}>
            {/* Target */}
            <div>
              <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 8 }}>SEND TO</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {targetOptions.map(o => (
                  <button key={o.value} onClick={() => setTarget(o.value)} className={'chip' + (target === o.value ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{o.label}</button>
                ))}
              </div>
              {target === 'specific' && (
                <input className="fld" style={{ marginTop: 10 }} placeholder="username or email" value={customTarget} onChange={e => setCustomTarget(e.target.value)} />
              )}
            </div>
            {/* Channel */}
            <div>
              <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 8 }}>CHANNEL</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['both', 'Email + In-app'], ['email', 'Email only'], ['in-app', 'In-app only']].map(([v, l]) => (
                  <button key={v} onClick={() => setChannel(v as any)} className={'chip' + (channel === v ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            </div>
            {/* Subject */}
            <label>
              <span className="fld-label">Subject</span>
              <input className="fld" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Your account has been reviewed" />
            </label>
            {/* Body */}
            <label>
              <span className="fld-label">Message</span>
              <textarea className="fld" rows={7} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your messageâ€¦ Use {{user.name}}, {{suspension_reason}}, etc. for variables." style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
            </label>
            <button className="btn btn-green" disabled={!subject.trim() || !body.trim()} onClick={handleSend} style={{ justifyContent: 'center', padding: '12px', opacity: subject.trim() && body.trim() ? 1 : 0.5 }}>
              <Icon name="bell" size={15} /> Send notification
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
            <div style={{ fontSize: 12.5, color: 'var(--ink-4)', padding: '6px 2px' }}>Click a template to load it into the composer.</div>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', textTransform: 'uppercase', gap: 12 }}>
              <span>Template</span><span>Sent to</span><span>Channel</span><span>When</span>
            </div>
            {sent.map(n => (
              <div key={n.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '13px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center', fontSize: 13, gap: 12 }}>
                <span style={{ fontWeight: 600 }}>{n.template}</span>
                <span style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{n.target}</span>
                <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{n.channel}</span>
                <span style={{ color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', fontSize: 11.5 }}>{n.sentAt}</span>
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
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 10 }}>AVAILABLE VARIABLES</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {['{{user.name}}', '{{suspension_reason}}', '{{review_days}}', '{{post_title}}', '{{violation_reason}}', '{{entity}}', '{{resolution_note}}', '{{cert_name}}', '{{expiry_date}}', '{{rejection_reason}}'].map(v => (
                <div key={v} style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--sky)', background: sTint('var(--sky)', 10), borderRadius: 6, padding: '4px 9px', width: 'fit-content' }}>{v}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// ROLES
// =====================================================================
const ROLE_PERMISSIONS = [
  { label: 'Content moderation', owner: true, admin: true, moderator: true, analyst: 'view' },
  { label: 'Approve / reject content', owner: true, admin: true, moderator: true, analyst: false },
  { label: 'Issue warnings', owner: true, admin: true, moderator: true, analyst: false },
  { label: 'Temporary suspension', owner: true, admin: true, moderator: true, analyst: false },
  { label: 'Permanent ban', owner: true, admin: true, moderator: false, analyst: false },
  { label: 'Seller management', owner: true, admin: true, moderator: 'approve', analyst: false },
  { label: 'Payout management', owner: true, admin: true, moderator: false, analyst: false },
  { label: 'Appeals review', owner: true, admin: true, moderator: true, analyst: false },
  { label: 'Send notifications', owner: true, admin: true, moderator: false, analyst: false },
  { label: 'View analytics', owner: true, admin: true, moderator: false, analyst: true },
  { label: 'Platform settings', owner: true, admin: false, moderator: false, analyst: false },
  { label: 'Manage team roles', owner: true, admin: 'mod/analyst', moderator: false, analyst: false },
];

const ROLE_COLORS = { owner: 'var(--sun)', admin: 'var(--sky)', moderator: 'var(--green)', analyst: 'var(--ink-3)' };

function AdminRoles({ team, onChangeRole }) {
  const [editId, setEditId] = React.useState<string | null>(null);

  const PermCell = ({ val }) => {
    if (val === true) return <span style={{ color: 'var(--green)', fontSize: 13 }}>âœ“</span>;
    if (val === false) return <span style={{ color: 'var(--line-2)', fontSize: 13 }}>â€”</span>;
    return <span style={{ fontSize: 11, color: 'var(--sky)', fontFamily: 'JetBrains Mono', background: sTint('var(--sky)', 12), padding: '2px 6px', borderRadius: 5 }}>{val}</span>;
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Team roster */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Admin team</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 2 }}>{team.length} members with console access</div>
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 13 }}><Icon name="users" size={14} /> Invite admin</button>
        </div>
        {team.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid var(--line)' }}>
            <Avatar name={m.name} size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{m.email} Â· since {m.since}</div>
            </div>
            {editId === m.id ? (
              <div style={{ display: 'flex', gap: 6 }}>
                {(['admin', 'moderator', 'analyst'] as const).filter(r => m.role !== r && m.role !== 'owner').map(r => (
                  <button key={r} onClick={() => { onChangeRole(m.id, r); setEditId(null); }} style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 8, border: '1px solid ' + ROLE_COLORS[r], color: ROLE_COLORS[r], background: sTint(ROLE_COLORS[r], 12), cursor: 'pointer', textTransform: 'capitalize' }}>{r}</button>
                ))}
                <button onClick={() => setEditId(null)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 8, background: sTint(ROLE_COLORS[m.role] || 'var(--ink-3)', 14), color: ROLE_COLORS[m.role] || 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'capitalize' }}>{m.role}</span>
                {m.role !== 'owner' && (
                  <button onClick={() => setEditId(m.id)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}>Change</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Permissions matrix */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', fontSize: 15, fontWeight: 700 }}>Permissions matrix</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 22px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 500, width: '40%' }}>Feature</th>
                {(['owner', 'admin', 'moderator', 'analyst'] as const).map(r => (
                  <th key={r} style={{ textAlign: 'center', padding: '12px 18px', fontSize: 11, fontFamily: 'JetBrains Mono', letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 700, color: ROLE_COLORS[r] }}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_PERMISSIONS.map((row, i) => (
                <tr key={row.label} style={{ borderTop: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-2)' }}>
                  <td style={{ padding: '11px 22px', fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500 }}>{row.label}</td>
                  {(['owner', 'admin', 'moderator', 'analyst'] as const).map(r => (
                    <td key={r} style={{ textAlign: 'center', padding: '11px 18px' }}><PermCell val={row[r]} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
