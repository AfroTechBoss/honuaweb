"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { AdminProducts, AdminUsers, AdminSellers, AdminActivity } from "./admin-manage";

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
      ['products', 'Products', 'bag'],
      ['users', 'Users', 'users'],
      ['sellers', 'Sellers', 'leaf'],
    ],
  },
  {
    label: 'System',
    items: [
      ['activity', 'Activity', 'clock'],
      ['settings', 'Settings', 'settings'],
    ],
  },
];

const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap(g => g.items);

export function DesktopAdmin({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [section, setSection] = React.useState('overview');
  const [collapsed, setCollapsed] = React.useState(false);

  // ----- live, mutable platform data (session only) -----
  const [reports, setReports] = React.useState(MOCK_ADMIN.reports);
  const [products, setProducts] = React.useState(MOCK_ADMIN.products);
  const [users, setUsers] = React.useState(MOCK_ADMIN.users);
  const [audit, setAudit] = React.useState(MOCK_ADMIN.audit);

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
    app.toast?.({ msg: 'Role updated', sub: '@' + u?.handle + ' → ' + role, kind: 'success', icon: 'award' });
  };

  const openCount = reports.filter(r => r.status === 'open').length;
  const flaggedCount = products.filter(p => p.status === 'flagged').length;
  const pendingSellers = (app.state?.sellerStatus === 'pending' ? 1 : 0) + MOCK_APPLICATIONS.length;
  const badges = { moderation: openCount, products: flaggedCount, sellers: pendingSellers };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Logo size={16} /></span>
              <div style={{ lineHeight: 1.1 }}>
                <div className="font-display" style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>Honua</div>
                <div style={{ fontSize: 9.5, opacity: .45, fontFamily: 'JetBrains Mono', letterSpacing: '.1em', whiteSpace: 'nowrap' }}>ADMIN CONSOLE</div>
              </div>
            </div>
          )}
          {collapsed && (
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green)', display: 'grid', placeItems: 'center' }}><Logo size={16} /></span>
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
            <Avatar src={app.user?.avatar} name={app.user?.name || 'Admin'} size={30} noBorder />
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.user?.name || 'Admin'}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>Owner</div>
              </div>
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
              <Avatar name="Admin" size={32} />
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>You</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>Owner</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 28px 60px' }}>
          {section === 'overview' && <AdminOverview reports={reports} users={users} products={products} audit={audit} onSection={setSection} />}
          {section === 'moderation' && <AdminModeration reports={reports} onResolve={resolveReport} onSuspend={suspendFromReport} />}
          {section === 'products' && <AdminProducts products={products} onStatus={setProductStatus} />}
          {section === 'users' && <AdminUsers users={users} onStatus={setUserStatus} onRole={setUserRole} />}
          {section === 'sellers' && <AdminSellers onNav={onNav} />}
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
function AdminOverview({ reports, users, products, audit, onSection }) {
  const s = MOCK_ADMIN.stats;
  const openCount = reports.filter(r => r.status === 'open').length;
  const suspended = users.filter(u => u.status !== 'active').length;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Members" value={s.members.toLocaleString()} icon="users" trend={s.membersTrend} sub="vs last month" />
        <SStat label="Active sellers" value={s.sellers} icon="leaf" trend={s.sellersTrend} sub="vs last month" />
        <SStat label="GMV · 30d" value={sMoney(s.gmv, 0)} icon="coin" trend={s.gmvTrend} accent="var(--sun)" />
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
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>↑ {s.gmvTrend}%</span>
          </div>
          <div style={{ marginTop: 14 }}><SSpark data={MOCK_ADMIN.gmvSeries} color="var(--green)" w={620} h={120} /></div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Needs your attention</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <AttnRow icon="flame" color="var(--clay)" label="Open reports" value={openCount} onClick={() => onSection('moderation')} />
            <AttnRow icon="bag" color="var(--sun)" label="Flagged products" value={products.filter(p => p.status === 'flagged').length} onClick={() => onSection('products')} />
            <AttnRow icon="leaf" color="var(--sky)" label="Seller applications" value={MOCK_APPLICATIONS.length} onClick={() => onSection('sellers')} />
            <AttnRow icon="lock" color="var(--ink-3)" label="Suspended / banned" value={suspended} onClick={() => onSection('users')} />
          </div>
        </div>
      </div>

      {/* member growth + recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Member growth · 30 days</div>
          <div style={{ marginTop: 14 }}><SSpark data={MOCK_ADMIN.memberSeries} color="var(--sky)" w={420} h={90} /></div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Recent activity</span>
            <button onClick={() => onSection('activity')} style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>View log →</button>
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
            {l} {k === 'open' && <span style={{ fontFamily: 'JetBrains Mono', opacity: .7 }}>· {reports.filter(r => r.status === 'open').length}</span>}
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
                  <Avatar name={r.authorName} size={18} /> @{r.author} · {r.reporters} report{r.reporters > 1 ? 's' : ''}
                  {r.status !== 'open' && <SBadge status={r.status} size="sm" />}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14, border: '1px dashed var(--line-2)', borderRadius: 16 }}>Nothing here — queue is clear</div>}
        </div>

        {/* detail */}
        {selR ? (
          <div style={{ position: 'sticky', top: 88, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: sTint('var(--clay)', 12), color: 'var(--clay)', display: 'grid', placeItems: 'center' }}><Icon name="flame" size={18} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{selR.reason}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{selR.type} · {selR.reporters} reporter{selR.reporters > 1 ? 's' : ''} · {selR.time}</div>
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
        <SStat label="Page views · 7d" value="84.2K" icon="bolt" trend={12} accent="var(--sky)" />
        <SStat label="Avg. session" value="4m 38s" icon="clock" trend={5} />
        <SStat label="Retention · 30d" value="61%" icon="users" trend={3} accent="var(--green)" />
        <SStat label="Conversion" value="3.4%" icon="leaf" trend={-1} accent="var(--sun)" />
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Traffic · 30 days</div>
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
// SETTINGS (stub)
// =====================================================================
function AdminSettings() {
  const [emailNotifs, setEmailNotifs] = React.useState(true);
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [registrationOpen, setRegistrationOpen] = React.useState(true);
  const [reviewRequired, setReviewRequired] = React.useState(false);

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
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.07em', marginBottom: 14 }}>DANGER ZONE</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
            <Icon name="trash" size={14} /> Clear all reports
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
            <Icon name="lock" size={14} /> Lock platform
          </button>
        </div>
      </div>
    </div>
  );
}
