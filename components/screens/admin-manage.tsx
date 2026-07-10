"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { AuditLine } from "./admin";

// =====================================================================
// PRODUCTS — platform-wide listing moderation
// =====================================================================
export function AdminProducts({ products, onStatus }) {
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const filtered = products.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (q === '' || p.title.toLowerCase().includes(q.toLowerCase()) || p.seller.toLowerCase().includes(q.toLowerCase()))
  );
  const counts = {
    all: products.length,
    flagged: products.filter(p => p.status === 'flagged').length,
    live: products.filter(p => p.status === 'live').length,
    removed: products.filter(p => p.status === 'removed').length,
  };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', 'All'], ['flagged', 'Flagged'], ['live', 'Live'], ['removed', 'Removed']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
              {l} <span style={{ fontFamily: 'Geist Mono', opacity: .65 }}>· {counts[k]}</span>
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products or sellers" style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1fr 0.8fr auto', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'Geist Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
          <span>PRODUCT</span><span>SELLER</span><span>STATUS</span><span style={{ textAlign: 'right' }}>FLAGS</span><span></span>
        </div>
        {filtered.map(p => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1fr 0.8fr auto', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <span style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}><Icon name="bag" size={16} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono' }}>{sMoney(p.price, 0)} · {p.category}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Avatar name={p.seller} size={24} />
              <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.seller}</span>
            </div>
            <SBadge status={p.status} size="sm" />
            <span className="tabular" style={{ textAlign: 'right', fontFamily: 'Geist Mono', fontSize: 13, fontWeight: 600, color: p.flags > 0 ? 'var(--clay)' : 'var(--ink-4)' }}>{p.flags || '—'}</span>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              {p.status !== 'removed' ? (
                <>
                  {p.status === 'flagged' && <IconBtn icon="check" title="Approve / restore" onClick={() => onStatus(p.id, 'live')} tone="var(--green)" />}
                  {p.status === 'live' && <IconBtn icon="flame" title="Flag" onClick={() => onStatus(p.id, 'flagged')} tone="var(--sun)" />}
                  <IconBtn icon="trash" title="Remove" onClick={() => onStatus(p.id, 'removed')} tone="var(--clay)" />
                </>
              ) : (
                <IconBtn icon="repost" title="Restore" onClick={() => onStatus(p.id, 'live')} tone="var(--green)" />
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>No products match.</div>}
      </div>
    </div>
  );
};

function IconBtn({ icon, title, onClick, tone = 'var(--ink-3)' }) {
  return (
    <button title={title} onClick={onClick} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', color: tone, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
      <Icon name={icon} size={15} />
    </button>
  );
}

// =====================================================================
// USERS — roster, suspend / ban / reinstate, role, detail drawer
// =====================================================================
export function AdminUsers({ users, onStatus, onRole }) {
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [drawer, setDrawer] = React.useState(null);
  const filtered = users.filter(u =>
    (filter === 'all' || (filter === 'flagged' ? u.reports > 0 : u.status === filter || u.role === filter)) &&
    (q === '' || u.name.toLowerCase().includes(q.toLowerCase()) || u.handle.toLowerCase().includes(q.toLowerCase()))
  );
  const du = users.find(u => u.id === drawer);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['all', 'All'], ['active', 'Active'], ['suspended', 'Suspended'], ['banned', 'Banned'], ['flagged', 'Has reports'], ['Seller', 'Sellers'], ['Moderator', 'Mods']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search members" style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.9fr 0.8fr 0.8fr auto', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'Geist Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
          <span>MEMBER</span><span>ROLE</span><span>STATUS</span><span style={{ textAlign: 'right' }}>IMPACT</span><span style={{ textAlign: 'right' }}>REPORTS</span><span></span>
        </div>
        {filtered.map(u => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.9fr 0.8fr 0.8fr auto', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
            <button onClick={() => setDrawer(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              <Avatar name={u.name} size={34} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono' }}>@{u.handle} · {u.city}</div>
              </div>
            </button>
            <RoleChip role={u.role} />
            <SBadge status={u.status} size="sm" />
            <span className="tabular" style={{ textAlign: 'right', fontFamily: 'Geist Mono', fontSize: 13, fontWeight: 600 }}>{u.impact}</span>
            <span className="tabular" style={{ textAlign: 'right', fontFamily: 'Geist Mono', fontSize: 13, fontWeight: 600, color: u.reports > 0 ? 'var(--clay)' : 'var(--ink-4)' }}>{u.reports || '—'}</span>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              {u.status === 'active' ? (
                <>
                  <IconBtn icon="lock" title="Suspend" onClick={() => onStatus(u.id, 'suspended')} tone="var(--sun)" />
                  <IconBtn icon="logout" title="Ban" onClick={() => onStatus(u.id, 'banned')} tone="var(--clay)" />
                </>
              ) : (
                <IconBtn icon="check" title="Reinstate" onClick={() => onStatus(u.id, 'active')} tone="var(--green)" />
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>No members match.</div>}
      </div>

      {/* detail drawer */}
      {du && <UserDrawer u={du} onClose={() => setDrawer(null)} onStatus={onStatus} onRole={onRole} />}
    </div>
  );
};

function UserDrawer({ u, onClose, onStatus, onRole }) {
  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,13,11,.34)', zIndex: 80 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '92vw', zIndex: 81, background: 'var(--surface)', borderLeft: '1px solid var(--line)', boxShadow: '-20px 0 50px rgba(0,0,0,.12)', overflow: 'auto', animation: 'slideIn .2s ease' }} className="no-scrollbar">
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontFamily: 'Geist Mono', color: 'var(--ink-4)', letterSpacing: '.05em' }}>MEMBER DETAIL</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Icon name="close" size={16} /></button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={u.name} size={56} verified={u.role === 'Seller' || u.role === 'Moderator'} />
            <div>
              <div className="font-display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{u.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono' }}>@{u.handle}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><RoleChip role={u.role} /><SBadge status={u.status} size="sm" /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            {[['Impact score', u.impact], ['Posts', u.posts], ['Reports', u.reports], ['Joined', u.joined]].map(([k, v]) => (
              <div key={k} style={{ padding: 13, borderRadius: 12, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono' }}>{k.toUpperCase()}</div>
                <div className="font-display tabular" style={{ fontSize: 19, fontWeight: 600, marginTop: 2, color: k === 'Reports' && u.reports > 0 ? 'var(--clay)' : 'var(--ink)' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* role control */}
          <div style={{ marginTop: 22 }}>
            <div className="fld-label">Role</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {['Member', 'Seller', 'Moderator', 'Admin'].map(r => (
                <button key={r} onClick={() => onRole(u.id, r)} className={'chip' + (u.role === r ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{r}</button>
              ))}
            </div>
          </div>

          {/* status actions */}
          <div style={{ marginTop: 22, display: 'grid', gap: 8 }}>
            {u.status === 'active' ? (
              <>
                <button className="btn btn-ghost" onClick={() => { onStatus(u.id, 'suspended'); onClose(); }} style={{ justifyContent: 'center', color: 'var(--sun)', borderColor: sTint('var(--sun)', 30) }}><Icon name="lock" size={15} /> Suspend account</button>
                <button className="btn btn-ghost" onClick={() => { onStatus(u.id, 'banned'); onClose(); }} style={{ justifyContent: 'center', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}><Icon name="logout" size={15} /> Ban permanently</button>
              </>
            ) : (
              <button className="btn btn-green" onClick={() => { onStatus(u.id, 'active'); onClose(); }} style={{ justifyContent: 'center' }}><Icon name="check" size={15} /> Reinstate account</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================================
// SELLERS — approval queue (preserves the seller-status loop) + active sellers
// =====================================================================
export function AdminSellers({ onNav }) {
  const app = useApp();
  const userPending = app.state?.sellerStatus === 'pending';
  const userApp: any = userPending ? {
    id: 'me', shop: app.state?.sellerShop?.name || 'Your shop', applicant: 'You', handle: 'you',
    categories: ['Your categories'], type: 'Physical goods', country: '—', submitted: 'just now',
    impact: app.state?.sellerShop?.tagline || 'Your submitted impact story appears here.',
    practices: ['As submitted'], certs: [], status: 'pending', isUser: true,
  } : null;
  const [queue, setQueue] = React.useState(MOCK_APPLICATIONS);
  const [sel, setSel] = React.useState<string | null>(null);
  const all = userApp ? [userApp, ...queue] : queue;
  const selApp = all.find(a => a.id === sel) || all[0];

  const decide = (id: string, decision: string) => {
    if (id === 'me') {
      app.setState?.(s => ({ ...s, sellerStatus: decision === 'approve' ? 'approved' : 'rejected' }));
      app.toast?.(decision === 'approve'
        ? { msg: 'Application approved', sub: 'Seller dashboard unlocked.', kind: 'success', icon: 'check' }
        : { msg: 'Application declined', sub: 'Applicant notified.', icon: 'close' });
    } else {
      setQueue(q => q.filter(a => a.id !== id));
      app.toast?.({ msg: decision === 'approve' ? 'Seller approved' : 'Application declined', sub: selApp?.shop, kind: decision === 'approve' ? 'success' : undefined, icon: decision === 'approve' ? 'check' : 'close' });
      setSel(null);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Applications</span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'Geist Mono' }}>{all.length} pending</span>
        </div>
        <div style={{ maxHeight: 560, overflow: 'auto' }} className="no-scrollbar">
          {all.map(a => {
            const on = a.id === selApp?.id;
            return (
              <button key={a.id} onClick={() => setSel(a.id)} style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', padding: '14px 16px', cursor: 'pointer', border: 'none', borderBottom: '1px solid var(--line)', borderLeft: '3px solid ' + (on ? 'var(--green)' : 'transparent'), background: on ? 'var(--green-tint)' : 'transparent' }}>
                <Avatar name={a.shop} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.shop}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{a.applicant} · {a.country}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono', marginTop: 4 }}>{a.submitted}{a.isUser ? ' · your application' : ''}</div>
                </div>
              </button>
            );
          })}
          {all.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Queue is clear 🎉</div>}
        </div>
      </div>

      {selApp ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <Avatar name={selApp.shop} size={56} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 className="font-display" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{selApp.shop}</h2>
                <SBadge status="pending" />
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 3 }}>{selApp.applicant} · @{selApp.handle} · {selApp.country} · {selApp.submitted}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 22 }}>
            <SField label="Sells" value={selApp.categories.join(', ')} />
            <SField label="Offering type" value={selApp.type} />
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="fld-label">Sustainability story</div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, padding: 14, background: 'var(--bg-2)', borderRadius: 12 }}>{selApp.impact}</p>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <div>
              <div className="fld-label">Practices</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{selApp.practices.map(p => <span key={p} className="chip chip-green" style={{ fontSize: 11 }}>{p}</span>)}</div>
            </div>
            {selApp.certs.length > 0 && (
              <div>
                <div className="fld-label">Certifications</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{selApp.certs.map(c => <span key={c} className="chip chip-sky" style={{ fontSize: 11 }}>{c}</span>)}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
            <button className="btn btn-green" onClick={() => decide(selApp.id, 'approve')} style={{ padding: '11px 22px' }}><Icon name="check" size={16} stroke={2.4} /> Approve seller</button>
            <button className="btn btn-ghost" onClick={() => decide(selApp.id, 'reject')} style={{ padding: '11px 20px', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>Decline</button>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 60, textAlign: 'center', color: 'var(--ink-4)' }}>
          <Icon name="check" size={32} /><div style={{ marginTop: 10, fontSize: 14 }}>Queue is clear — no applications waiting.</div>
        </div>
      )}
    </div>
  );
};

function SField({ label, value }) {
  return (
    <div>
      <div className="fld-label">{label}</div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// =====================================================================
// ACTIVITY — full audit log
// =====================================================================
export function AdminActivity({ audit }: { audit: any[] }) {
  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '4px 18px' }}>
        {audit.map(a => <AuditLine key={a.id} a={a} compact={false} />)}
      </div>
    </div>
  );
};
