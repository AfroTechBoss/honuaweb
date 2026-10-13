"use client";
import React from "react";
import { Icon, Logo, Avatar, VerifiedTick, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { AuditLine } from "./admin";
import { listSellerApplications, decideSellerApplication, type AdminSellerApplication, type SellerCounts } from "@/lib/admin-sellers";
import { listProducts, setProductStatus, type AdminProduct, type ProductCounts } from "@/lib/admin-products";

// =====================================================================
// PRODUCTS — platform-wide listing moderation
// =====================================================================
//
// Every row is a products row, read and changed through /api/admin/products.
// It used to be MOCK_ADMIN.products held in the console's React state, and
// "Remove" was a setState — six invented listings, and no way to take a real
// one down. Removing now writes status = 'removed', which migration 014's
// select policy turns into the listing actually leaving the marketplace.
export function AdminProducts({ getToken, log, adminEmail }: any) {
  const app = useApp();
  const [products, setProducts] = React.useState<AdminProduct[]>([]);
  const [counts, setCounts] = React.useState<ProductCounts | null>(null);
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [available, setAvailable] = React.useState(true);
  const [canAct, setCanAct] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;

  const load = React.useCallback(async (status: string, search: string) => {
    setLoading(true);
    const t = await tokenRef.current?.().catch(() => null);
    const res = await listProducts(t ?? null, { status, search });
    setProducts(res.products);
    setCounts(res.counts);
    setAvailable(res.available);
    setCanAct(res.canAct);
    setError(res.error ?? null);
    setLoading(false);
  }, []);

  // Search runs in SQL, so it is debounced rather than fired per keystroke.
  // Filtering the page in the browser would have searched only what had already
  // been fetched and called the rest of the catalogue absent.
  React.useEffect(() => {
    const id = setTimeout(() => load(filter, q.trim()), q ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, filter, q]);

  const act = async (id: string, status: 'live' | 'flagged' | 'removed', title: string) => {
    setBusy(id);
    const t = await tokenRef.current?.().catch(() => null);
    const { product, error: err } = await setProductStatus(t ?? null, id, status, { actorLabel: adminEmail ?? 'Admin' });
    setBusy(null);
    if (err || !product) {
      setError(err ?? 'That listing could not be updated.');
      app.toast?.({ msg: 'Could not update the listing', sub: err ?? undefined, kind: 'error', icon: 'close' });
      return;
    }
    setProducts(list => filter === 'all' || filter === product.status
      ? list.map(p => p.id === id ? product : p)
      : list.filter(p => p.id !== id));
    setCounts(c => {
      if (!c) return c;
      const next = { ...c };
      const from = products.find(p => p.id === id)?.status;
      if (from && from in next) (next as any)[from] = Math.max(0, (next as any)[from] - 1);
      if (status in next) (next as any)[status] = (next as any)[status] + 1;
      return next;
    });
    setError(null);
    log?.(status === 'removed' ? 'removed a product' : status === 'live' ? 'restored a product' : 'flagged a product', title, status === 'removed' ? 'trash' : status === 'live' ? 'check' : 'flame');
    app.toast?.({
      msg: status === 'removed' ? 'Listing removed' : status === 'live' ? 'Listing restored' : 'Listing flagged',
      sub: status === 'removed' ? 'It is no longer visible on the marketplace.' : title,
      kind: status === 'live' ? 'success' : undefined,
      icon: status === 'removed' ? 'trash' : 'check',
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', 'All'], ['flagged', 'Flagged'], ['live', 'Live'], ['removed', 'Removed']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
              {l}{counts && <span style={{ fontFamily: 'JetBrains Mono', opacity: .65 }}> · {(counts as any)[k]}</span>}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products or sellers" style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {!available && !loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', border: '1px dashed var(--line)', borderRadius: 16, fontSize: 13.5, lineHeight: 1.6 }}>
          The catalogue isn&rsquo;t set up on this database yet.<br />
          Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>supabase/migrations/014_marketplace.sql</code> and reload.
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1fr 0.8fr auto', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
            {/* Was FLAGS, showing an invented number. Nothing on the platform
                counts reports against a listing — the report button on a
                product does not write anywhere — so the column now shows stock,
                which is a real column a moderator can act on. */}
            <span>PRODUCT</span><span>SELLER</span><span>STATUS</span><span style={{ textAlign: 'right' }}>STOCK</span><span></span>
          </div>
          {products.map(p => {
            const removed = p.status === 'removed';
            const working = busy === p.id;
            return (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1fr 0.8fr auto', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center', opacity: removed ? 0.45 : working ? 0.6 : 1, background: removed ? 'repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(0,0,0,.02) 8px, rgba(0,0,0,.02) 16px)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  {p.image
                    ? <img src={p.image} alt="" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0, filter: removed ? 'grayscale(1)' : undefined }} />
                    : <span style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: removed ? 'var(--line)' : 'var(--bg-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}><Icon name="bag" size={16} /></span>}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: removed ? 'line-through' : undefined, color: removed ? 'var(--ink-4)' : undefined }}>{p.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{sMoney(p.price, 0)} · {p.category} · {p.listed}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Avatar src={p.sellerAvatar ?? undefined} name={p.seller} size={24} />
                  <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.seller}</span>
                </div>
                <SBadge status={p.status} size="sm" />
                <span className="tabular" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: p.stock !== null && p.stock <= 0 ? 'var(--clay)' : 'var(--ink-4)' }}>
                  {p.type === 'physical' ? (p.stock ?? '—') : '∞'}
                </span>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', opacity: canAct ? 1 : .4, pointerEvents: canAct && !working ? undefined : 'none' }}>
                  {!removed ? (
                    <>
                      {p.status === 'flagged' && <IconBtn icon="check" title="Clear the flag" onClick={() => act(p.id, 'live', p.title)} tone="var(--green)" />}
                      {p.status === 'live' && <IconBtn icon="flame" title="Flag for review" onClick={() => act(p.id, 'flagged', p.title)} tone="var(--sun)" />}
                      <IconBtn icon="trash" title="Remove from the marketplace" onClick={() => act(p.id, 'removed', p.title)} tone="var(--clay)" />
                    </>
                  ) : (
                    <IconBtn icon="repost" title="Restore listing" onClick={() => act(p.id, 'live', p.title)} tone="var(--green)" />
                  )}
                </div>
              </div>
            );
          })}
          {loading && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Loading catalogue…</div>}
          {!loading && products.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>No products match.</div>}
        </div>
      )}
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
export function AdminUsers({ users, loaded = true, onStatus, onRole, canSuspend = true, canBan = true, rosterAvailable = true }) {
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [drawer, setDrawer] = React.useState(null);
  const filtered = users.filter(u =>
    (filter === 'all'
      || (filter === 'flagged' ? u.reports > 0
        : filter === 'verified' ? !!u.verified
        : u.status === filter || u.role === filter)) &&
    (q === '' || u.name.toLowerCase().includes(q.toLowerCase()) || u.handle.toLowerCase().includes(q.toLowerCase()))
  );
  const du = users.find(u => u.id === drawer);

  return (
    <div>
      {!rosterAvailable && (
        // Standing lives in columns migration 041 adds. Without it the roster
        // still lists everyone, but every badge would read "active" whether or
        // not that is true — which is exactly the failure this screen had, so
        // it says so rather than showing it.
        <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--sun)', 10), border: '1px solid ' + sTint('var(--sun)', 30), color: 'var(--ink-2)', fontSize: 13, marginBottom: 16, lineHeight: 1.55 }}>
          Account standing isn't stored on this database yet, so every member below shows as active.
          Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>supabase/migrations/041_account_freeze.sql</code> to turn suspensions on.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['all', 'All'], ['active', 'Active'], ['suspended', 'Suspended'], ['banned', 'Banned'], ['flagged', 'Has reports'], ['verified', 'Verified'], ['Moderator', 'Mods'], ['Admin', 'Admins']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search members" style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.9fr 0.8fr 0.8fr auto', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
          <span>MEMBER</span><span>ROLE</span><span>STATUS</span><span style={{ textAlign: 'right' }}>IMPACT</span><span style={{ textAlign: 'right' }}>REPORTS</span><span></span>
        </div>
        {filtered.map(u => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.9fr 0.8fr 0.8fr auto', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
            <button onClick={() => setDrawer(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              <Avatar src={u.avatar ?? undefined} name={u.name} size={34} />
              <div style={{ minWidth: 0 }}>
                {/* The same tick the profile screen draws, from the same column.
                    A console that couldn't see who was verified had no way to
                    notice a tick granted by mistake. */}
                <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                  {u.verified && <VerifiedTick size={13} />}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{u.handle} · {u.city}</div>
              </div>
            </button>
            <RoleChip role={u.role} />
            <SBadge status={u.status} size="sm" />
            <span className="tabular" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600 }}>{u.impact}</span>
            <span className="tabular" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: u.reports > 0 ? 'var(--clay)' : 'var(--ink-4)' }}>{u.reports || '—'}</span>
            {/* Hidden, not disabled: an analyst holds moderation.view without
                users.suspend, and the server refuses either way. A button that
                is only ever a 403 is worse than no button. */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              {u.status === 'active' ? (
                <>
                  {canSuspend && <IconBtn icon="lock" title="Suspend for 7 days" onClick={() => onStatus(u.id, 'suspended')} tone="var(--sun)" />}
                  {canBan && <IconBtn icon="logout" title="Ban" onClick={() => onStatus(u.id, 'banned')} tone="var(--clay)" />}
                </>
              ) : (
                // Lifting a ban needs users.ban; lifting a suspension does not.
                (u.status === 'banned' ? canBan : canSuspend) &&
                  <IconBtn icon="check" title="Reinstate" onClick={() => onStatus(u.id, 'active')} tone="var(--green)" />
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>
            {!loaded ? 'Loading members…' : users.length === 0 ? 'No members yet.' : 'No members match.'}
          </div>
        )}
      </div>

      {/* detail drawer */}
      {du && <UserDrawer u={du} onClose={() => setDrawer(null)} onStatus={onStatus} onRole={onRole} canSuspend={canSuspend} canBan={canBan} />}
    </div>
  );
};

function UserDrawer({ u, onClose, onStatus, onRole, canSuspend = true, canBan = true }) {
  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,13,11,.34)', zIndex: 80 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '92vw', zIndex: 81, background: 'var(--surface)', borderLeft: '1px solid var(--line)', boxShadow: '-20px 0 50px rgba(0,0,0,.12)', overflow: 'auto', animation: 'slideIn .2s ease' }} className="no-scrollbar">
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em' }}>MEMBER DETAIL</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Icon name="close" size={16} /></button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar src={u.avatar ?? undefined} name={u.name} size={56} />
            <div>
              {/* The tick is not a role, which is why it sits by the name rather
                  than among the chips: RoleChip says what someone does here,
                  this says their identity was checked. */}
              <div className="font-display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                {u.name}{u.verified && <VerifiedTick size={15} />}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{u.handle}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><RoleChip role={u.role} /><SBadge status={u.status} size="sm" /></div>

          {u.verified && (
            <div style={{ marginTop: 12, padding: '10px 13px', borderRadius: 11, background: sTint('var(--sky)', 9), border: '1px solid ' + sTint('var(--sky)', 24), fontSize: 12.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.5 }}>
              <VerifiedTick size={14} />
              <span>
                Verified account{u.verifiedAt ? ' since ' + new Date(u.verifiedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}.
                {' '}Granted and revoked on the Verification page.
              </span>
            </div>
          )}

          {/* The badge says "suspended". This says until when and what for —
              the two things anyone reviewing the decision actually needs. */}
          {(u.status === 'suspended' || u.status === 'banned') && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: sTint(u.status === 'banned' ? 'var(--clay)' : 'var(--sun)', 10), border: '1px solid ' + sTint(u.status === 'banned' ? 'var(--clay)' : 'var(--sun)', 26), fontSize: 13, lineHeight: 1.55 }}>
              <div style={{ fontWeight: 600, color: u.status === 'banned' ? 'var(--clay)' : 'var(--ink-2)' }}>
                {u.status === 'banned'
                  ? 'Banned' + (u.bannedAt ? ' on ' + new Date(u.bannedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
                  : 'Suspended' + (u.suspendedUntil ? ' until ' + new Date(u.suspendedUntil).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '')}
              </div>
              {(u.bannedReason || u.suspendedReason) && (
                <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 3 }}>"{u.bannedReason || u.suspendedReason}"</div>
              )}
              <div style={{ color: 'var(--ink-4)', fontSize: 12, marginTop: 5 }}>
                Cannot post, reply, message, buy, sell or report. Reading still works, and any listings they already have stay live.
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            {[['Impact score', u.impact], ['Posts', u.posts], ['Reports', u.reports], ['Joined', u.joined]].map(([k, v]) => (
              <div key={k} style={{ padding: 13, borderRadius: 12, background: 'var(--bg-2)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{k.toUpperCase()}</div>
                <div className="font-display tabular" style={{ fontSize: 19, fontWeight: 600, marginTop: 2, color: k === 'Reports' && u.reports > 0 ? 'var(--clay)' : 'var(--ink)' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* role control */}
          <div style={{ marginTop: 22 }}>
            <div className="fld-label">Role</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {['Member', 'Moderator', 'Admin'].map(r => (
                <button key={r} onClick={() => onRole(u.id, r)} className={'chip' + (u.role === r ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{r}</button>
              ))}
            </div>
          </div>

          {/* status actions */}
          <div style={{ marginTop: 22, display: 'grid', gap: 8 }}>
            {u.status === 'active' ? (
              <>
                {canSuspend && <button className="btn btn-ghost" onClick={() => { onStatus(u.id, 'suspended'); onClose(); }} style={{ justifyContent: 'center', color: 'var(--sun)', borderColor: sTint('var(--sun)', 30) }}><Icon name="lock" size={15} /> Suspend for 7 days</button>}
                {canBan && <button className="btn btn-ghost" onClick={() => { onStatus(u.id, 'banned'); onClose(); }} style={{ justifyContent: 'center', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}><Icon name="logout" size={15} /> Ban permanently</button>}
                {!canSuspend && !canBan && <div style={{ padding: 13, borderRadius: 12, background: 'var(--bg-2)', fontSize: 12.5, color: 'var(--ink-4)', textAlign: 'center' }}>Your role cannot change account standing.</div>}
              </>
            ) : (u.status === 'banned' ? canBan : canSuspend) ? (
              <button className="btn btn-green" onClick={() => { onStatus(u.id, 'active'); onClose(); }} style={{ justifyContent: 'center' }}><Icon name="check" size={15} /> Reinstate account</button>
            ) : (
              <div style={{ padding: 13, borderRadius: 12, background: 'var(--bg-2)', fontSize: 12.5, color: 'var(--ink-4)', textAlign: 'center' }}>
                Lifting a ban is an owner or admin action.
              </div>
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
//
// Every application here is a row in seller_applications, read and decided
// through /api/admin/sellers. What was here before could not have worked: it
// queried the table from the browser, where the console's Privy session leaves
// `auth.uid()` null and migration 017's policies match nothing. The queue was
// unreadable, not empty — and it padded that emptiness with MOCK_APPLICATIONS
// plus a fake row synthesised from the signed-in admin's own localStorage, so
// a reviewer could approve four shops that did not exist and their own.
export function AdminSellers({ getToken, log, adminEmail }: any) {
  const app = useApp();
  const [apps, setApps] = React.useState<AdminSellerApplication[]>([]);
  const [counts, setCounts] = React.useState<SellerCounts | null>(null);
  const [filter, setFilter] = React.useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = React.useState(true);
  const [available, setAvailable] = React.useState(true);
  const [canReview, setCanReview] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sel, setSel] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  // Declining opens the note field rather than acting immediately: the reason
  // is shown to the applicant, and the route refuses a decline without one.
  const [declining, setDeclining] = React.useState(false);
  const [note, setNote] = React.useState('');

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;

  const load = React.useCallback(async (status: typeof filter) => {
    setLoading(true);
    const t = await tokenRef.current?.().catch(() => null);
    const res = await listSellerApplications(t ?? null, status);
    setApps(res.applications);
    setCounts(res.counts);
    setAvailable(res.available);
    setCanReview(res.canReview);
    setError(res.error ?? null);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(filter); setSel(null); }, [load, filter]);

  const selApp = apps.find(a => a.id === sel) ?? apps[0] ?? null;
  React.useEffect(() => { setDeclining(false); setNote(''); }, [selApp?.id]);

  const decide = async (decision: 'approve' | 'decline') => {
    if (!selApp || busy) return;
    if (decision === 'decline' && !note.trim()) { setDeclining(true); return; }
    setBusy(true);
    const t = await tokenRef.current?.().catch(() => null);
    const { application, error: err } = await decideSellerApplication(t ?? null, selApp.id, decision, note.trim(), adminEmail ?? 'Admin');
    setBusy(false);
    if (err || !application) {
      // Nothing moves unless the server says it moved. The old version dropped
      // the row from the list either way, so a write that matched zero rows
      // still looked like an approval until the next reload.
      setError(err ?? 'That application could not be updated.');
      app.toast?.({ msg: 'Could not update the application', sub: err ?? undefined, kind: 'error', icon: 'close' });
      // A 409 means someone else decided it — reload so the queue agrees.
      if (err && /already|someone else/i.test(err)) load(filter);
      return;
    }
    // If the reviewer decided their own application, the screen they see as a
    // seller has to agree with the one they see as an admin.
    if (application.userId && application.userId === app.user?.id) {
      app.setState?.((s: any) => ({ ...s, sellerStatus: decision === 'approve' ? 'approved' : 'rejected' }));
    }
    setApps(list => filter === 'all'
      ? list.map(a => a.id === application.id ? application : a)
      : list.filter(a => a.id !== application.id));
    setCounts(c => c && ({ ...c, pending: Math.max(0, c.pending - 1), [decision === 'approve' ? 'approved' : 'rejected']: c[decision === 'approve' ? 'approved' : 'rejected'] + 1 }));
    setSel(null);
    setError(null);
    setNote('');
    setDeclining(false);
    log?.(decision === 'approve' ? 'approved a seller' : 'declined a seller application', application.shop, decision === 'approve' ? 'check' : 'close');
    app.toast?.(decision === 'approve'
      ? { msg: 'Seller approved', sub: application.shop, kind: 'success', icon: 'check' }
      : { msg: 'Application declined', sub: application.shop, icon: 'close' });
  };

  const FILTERS: [typeof filter, string][] = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Declined'], ['all', 'All']];

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 4 }}>SELLERS</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Seller applications</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Approving opens a shopfront on the marketplace. A decline needs a reason — the applicant is shown it and can revise and re-apply.</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
            {l}
            {counts && k !== 'all' && <span style={{ marginLeft: 4, fontFamily: 'JetBrains Mono', opacity: .7 }}>· {counts[k]}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ color: 'var(--ink-3)', padding: 40, textAlign: 'center' }}>Loading applications…</div>
      ) : !available ? (
        // "Queue is clear" is a claim about the platform, and it cannot be made
        // when the table was never there to ask.
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', border: '1px dashed var(--line)', borderRadius: 16, fontSize: 13.5, lineHeight: 1.6 }}>
          Seller applications aren&rsquo;t set up on this database yet.<br />
          Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>supabase/migrations/017_seller_applications.sql</code> and reload.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Applications</span>
              <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{apps.length}</span>
            </div>
            <div style={{ maxHeight: 560, overflow: 'auto' }} className="no-scrollbar">
              {apps.map(a => {
                const on = a.id === selApp?.id;
                return (
                  <button key={a.id} onClick={() => setSel(a.id)} style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', padding: '14px 16px', cursor: 'pointer', border: 'none', borderBottom: '1px solid var(--line)', borderLeft: '3px solid ' + (on ? 'var(--green)' : 'transparent'), background: on ? 'var(--green-tint)' : 'transparent' }}>
                    <Avatar src={a.avatar ?? undefined} name={a.applicant} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.shop}</span>
                        {a.verified && <VerifiedTick size={12} />}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{a.applicant} · {a.country}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {a.submitted}
                        {a.userId === app.user?.id && <span style={{ color: 'var(--sky)' }}>· yours</span>}
                        {a.status !== 'pending' && <SBadge status={a.status} size="sm" />}
                      </div>
                    </div>
                  </button>
                );
              })}
              {apps.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                  {filter === 'pending' ? 'Queue is clear' : 'Nothing here'}
                </div>
              )}
            </div>
          </div>

          {selApp ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <Avatar src={selApp.avatar ?? undefined} name={selApp.applicant} size={56} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 className="font-display" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{selApp.shop}</h2>
                    <SBadge status={selApp.status} />
                    {selApp.verified && <VerifiedTick size={15} />}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 3 }}>{selApp.applicant} · @{selApp.handle} · {selApp.country} · {selApp.submitted}</div>
                  {selApp.tagline && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, fontStyle: 'italic' }}>&ldquo;{selApp.tagline}&rdquo;</div>}
                </div>
              </div>

              {/* Standing is not a detail. Approving a suspended account into a
                  shopfront may still be the right call, but it should be a call. */}
              {selApp.accountStatus !== 'active' && (
                <div style={{ marginTop: 14, padding: '10px 13px', borderRadius: 11, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 26), fontSize: 12.5, color: 'var(--clay)', lineHeight: 1.5 }}>
                  This account is currently <strong>{selApp.accountStatus}</strong>. Approving it opens a shop for a member who cannot post.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 22 }}>
                <SField label="Sells" value={selApp.categories.length ? selApp.categories.join(', ') : '—'} />
                <SField label="Offering type" value={selApp.type} />
                <SField label="Ships to" value={selApp.shipsTo || '—'} />
                <SField label="Business" value={[selApp.legalName, selApp.bizType].filter(Boolean).join(' · ') || '—'} />
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="fld-label">Sustainability story</div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, padding: 14, background: 'var(--bg-2)', borderRadius: 12, whiteSpace: 'pre-wrap' }}>{selApp.impact}</p>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                {selApp.practices.length > 0 && (
                  <div>
                    <div className="fld-label">Practices</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{selApp.practices.map(p => <span key={p} className="chip chip-green" style={{ fontSize: 11 }}>{p}</span>)}</div>
                  </div>
                )}
                {selApp.certs.length > 0 && (
                  <div>
                    <div className="fld-label">Certifications</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{selApp.certs.map(c => <span key={c} className="chip chip-sky" style={{ fontSize: 11 }}>{c}</span>)}</div>
                  </div>
                )}
              </div>

              {selApp.status === 'pending' ? (
                <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
                  {declining && (
                    <div style={{ marginBottom: 14 }}>
                      <div className="fld-label">Why is this being declined?</div>
                      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} autoFocus
                        placeholder="The applicant reads this, and can revise and re-apply."
                        style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg-2)', fontSize: 13.5, lineHeight: 1.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="btn btn-green" disabled={busy || !canReview} onClick={() => decide('approve')} style={{ padding: '11px 22px', opacity: (busy || !canReview) ? .5 : 1, cursor: (busy || !canReview) ? 'not-allowed' : 'pointer' }}>
                      <Icon name="check" size={16} stroke={2.4} /> {busy ? 'Saving…' : 'Approve seller'}
                    </button>
                    <button className="btn btn-ghost" disabled={busy || !canReview || (declining && !note.trim())} onClick={() => decide('decline')} style={{ padding: '11px 20px', color: 'var(--clay)', borderColor: sTint('var(--clay)', 30), opacity: (busy || !canReview || (declining && !note.trim())) ? .5 : 1 }}>
                      {declining ? 'Confirm decline' : 'Decline'}
                    </button>
                    {declining && <button className="btn btn-ghost" disabled={busy} onClick={() => { setDeclining(false); setNote(''); }} style={{ padding: '11px 16px' }}>Cancel</button>}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                  {selApp.status === 'approved' ? 'Approved' : 'Declined'}
                  {selApp.reviewedAt ? ' on ' + new Date(selApp.reviewedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}.
                  {selApp.notes && <div style={{ marginTop: 8, padding: 12, borderRadius: 11, background: 'var(--bg-2)', color: 'var(--ink-2)' }}>{selApp.notes}</div>}
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 60, textAlign: 'center', color: 'var(--ink-4)' }}>
              <Icon name="check" size={32} /><div style={{ marginTop: 10, fontSize: 14 }}>Queue is clear — no applications waiting.</div>
            </div>
          )}
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
