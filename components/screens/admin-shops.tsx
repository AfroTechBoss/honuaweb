"use client";
import React from "react";
import { Icon, Avatar, VerifiedTick, useApp, sTint, sMoney, formatCount } from "@/components/shared";
import { listShops, type AdminShop, type ShopCounts, type ShopFilter } from "@/lib/admin-shops";

// =====================================================================
// SHOPS — the register of storefronts on Honua
// =====================================================================
//
// The console could review an application and moderate a listing, but there was
// nowhere to see a shop: the thing in between had no page. Approving an
// application dropped it into the "Approved" tab of a review queue, and that
// was the last the platform ever said about the business it had just opened.
//
// Read-only by design. Every action on a shop already lives somewhere with a
// permission attached — Products takes listings down, Users suspends the owner,
// Sellers decides the application. This page is the view those three lack.
//
// See app/api/admin/shops for why a shop is two things at once (an approved
// application, and separately a seller with listings) and why both are shown.

export function AdminShops({ getToken, onSection }: { getToken?: any; onSection?: (s: string) => void }) {
  const app = useApp();
  const [shops, setShops] = React.useState<AdminShop[] | null>(null);
  const [counts, setCounts] = React.useState<ShopCounts | null>(null);
  const [filter, setFilter] = React.useState<ShopFilter>('all');
  const [q, setQ] = React.useState('');
  const [available, setAvailable] = React.useState(true);
  const [truncated, setTruncated] = React.useState(false);
  const [salesReadable, setSalesReadable] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sel, setSel] = React.useState<string | null>(null);

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;

  const load = React.useCallback(async (f: ShopFilter, search: string) => {
    const t = await tokenRef.current?.().catch(() => null);
    const res = await listShops(t ?? null, f, search);
    setShops(res.shops);
    // Counts describe the register, not the filtered page, so they survive a
    // search — the tabs would otherwise all read the same number as the results.
    if (res.counts) setCounts(res.counts);
    setAvailable(res.available);
    setTruncated(res.truncated);
    setSalesReadable(res.salesReadable);
    setError(res.error ?? null);
  }, []);

  // Search is applied server-side against the whole register rather than to
  // the rows already fetched, so it is debounced instead of per-keystroke.
  React.useEffect(() => {
    const id = setTimeout(() => load(filter, q.trim()), q ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, filter, q]);

  const selShop = shops?.find(s => s.ownerId === sel) ?? shops?.[0] ?? null;

  const TABS: [ShopFilter, string][] = [
    ['all', 'All shops'], ['trading', 'Trading'], ['dormant', 'Dormant'], ['unapproved', 'Unapproved'],
  ];

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 4 }}>MARKETPLACE</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Shops</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, maxWidth: 640, lineHeight: 1.55 }}>
          Every storefront open on Honua, with what it has actually listed and sold. Read-only —
          listings come down under Products, an owner is suspended under Users, and an application is decided under Sellers.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => { setFilter(k); setSel(null); }} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
              {l}{counts && <span style={{ fontFamily: 'JetBrains Mono', opacity: .65 }}> · {counts[k]}</span>}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search shops or owners" style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}
      {truncated && (
        <div style={{ padding: '10px 14px', borderRadius: 11, background: sTint('var(--sun)', 12), border: '1px solid ' + sTint('var(--sun)', 30), color: 'var(--ink-2)', fontSize: 12.5, marginBottom: 16 }}>
          Showing the first 300 shops. Narrow it with search.
        </div>
      )}
      {!salesReadable && shops && shops.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 11, background: sTint('var(--sun)', 12), border: '1px solid ' + sTint('var(--sun)', 30), color: 'var(--ink-2)', fontSize: 12.5, marginBottom: 16 }}>
          Sales could not be read, so orders and revenue are blank rather than zero.
        </div>
      )}

      {!available && shops ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', border: '1px dashed var(--line)', borderRadius: 16, fontSize: 13.5, lineHeight: 1.6 }}>
          Seller applications aren&rsquo;t set up on this database yet.<br />
          Apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>supabase/migrations/017_seller_applications.sql</code> and reload.
        </div>
      ) : shops === null ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 74, borderRadius: 14, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />)}
        </div>
      ) : shops.length === 0 ? (
        <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-3)', border: '1px dashed var(--line)', borderRadius: 16, lineHeight: 1.6 }}>
          <Icon name="store" size={30} />
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>
            {q ? 'No shop matches that' : filter === 'all' ? 'No shops on Honua yet' : 'Nothing in this state'}
          </div>
          <div style={{ marginTop: 4, fontSize: 13 }}>
            {filter === 'all' && !q ? 'A shop opens the moment a seller application is approved.' : 'Try another filter.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Register</span>
              <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{shops.length}</span>
            </div>
            <div style={{ maxHeight: 620, overflow: 'auto' }} className="no-scrollbar">
              {shops.map(s => {
                const on = s.ownerId === selShop?.ownerId;
                return (
                  <button key={s.ownerId} onClick={() => setSel(s.ownerId)} style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', alignItems: 'center', padding: '13px 16px', cursor: 'pointer', border: 'none', borderBottom: '1px solid var(--line)', borderLeft: '3px solid ' + (on ? 'var(--green)' : 'transparent'), background: on ? 'var(--green-tint)' : 'transparent' }}>
                    <ShopMark shop={s} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        {s.verified && <VerifiedTick size={12} />}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.owner}{s.handle ? ` · @${s.handle}` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{s.live ?? '—'} live</span>
                        <span>·</span>
                        <span>{salesReadable ? sMoney(s.gross ?? 0, 0) : '—'}</span>
                        <ShopFlags shop={s} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selShop && <ShopDetail shop={selShop} salesReadable={salesReadable} onSection={onSection} app={app} />}
        </div>
      )}
    </div>
  );
}

/** The shop's own logo when it has one, the owner's avatar when it does not. */
function ShopMark({ shop, size }: { shop: AdminShop; size: number }) {
  if (shop.logo) {
    return <span style={{ width: size, height: size, borderRadius: size * 0.28, background: `url(${shop.logo}) center/cover`, flexShrink: 0, border: '1px solid var(--line)' }} />;
  }
  return <Avatar src={shop.avatar ?? undefined} name={shop.name} size={size} />;
}

/** The two states worth seeing without opening the shop. */
function ShopFlags({ shop }: { shop: AdminShop }) {
  return (
    <>
      {!shop.approved && <span style={{ color: 'var(--sun)' }}>· unapproved</span>}
      {shop.ownerStatus !== 'active' && <span style={{ color: 'var(--clay)' }}>· owner {shop.ownerStatus}</span>}
      {(shop.flagged ?? 0) > 0 && <span style={{ color: 'var(--clay)' }}>· {shop.flagged} flagged</span>}
    </>
  );
}

function ShopDetail({ shop, salesReadable, onSection, app }: { shop: AdminShop; salesReadable: boolean; onSection?: (s: string) => void; app: any }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <ShopMark shop={shop} size={58} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{shop.name}</h2>
            {shop.verified && <VerifiedTick size={15} />}
            {shop.approved
              ? <span className="chip chip-green" style={{ fontSize: 11 }}>Open{shop.opened ? ` · ${shop.opened}` : ''}</span>
              : <span className="chip" style={{ fontSize: 11, background: sTint('var(--sun)', 16), color: 'var(--ink-2)' }}>No approved application</span>}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 4 }}>
            {shop.owner}{shop.handle ? ` · @${shop.handle}` : ''}{shop.country ? ` · ${shop.country}` : ''}
            {shop.shopHandle ? ` · honua.green/shop/${shop.shopHandle}` : ''}
          </div>
          {shop.tagline && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, fontStyle: 'italic' }}>&ldquo;{shop.tagline}&rdquo;</div>}
        </div>
      </div>

      {/* The two things about a shop that should never need looking for. */}
      {shop.ownerStatus !== 'active' && (
        <div style={{ marginTop: 14, padding: '10px 13px', borderRadius: 11, background: sTint('var(--clay)', 10), border: '1px solid ' + sTint('var(--clay)', 26), fontSize: 12.5, color: 'var(--clay)', lineHeight: 1.5 }}>
          The owner of this shop is <strong>{shop.ownerStatus}</strong>. Their listings stay live — suspension does not close a shop.
        </div>
      )}
      {!shop.approved && (
        <div style={{ marginTop: 14, padding: '10px 13px', borderRadius: 11, background: sTint('var(--sun)', 12), border: '1px solid ' + sTint('var(--sun)', 30), fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          This seller has listings but no approved application behind them — a seeded catalogue row, or listings that outlived a
          decision. Worth reconciling under Sellers.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
        <Cell label="Revenue" value={salesReadable ? sMoney(shop.gross ?? 0, 2) : '—'} sub={salesReadable ? `${formatCount(shop.orders ?? 0)} items sold` : 'unreadable'} />
        <Cell label="Units" value={salesReadable ? formatCount(shop.units ?? 0) : '—'} sub={(shop.cancelled ?? 0) > 0 ? `${shop.cancelled} cancelled` : 'none cancelled'} />
        <Cell label="Live listings" value={shop.live == null ? '—' : formatCount(shop.live)} sub={shop.products == null ? '' : `${shop.products} total`} />
        <Cell label="Last sale" value={shop.lastSale ?? 'Never'} sub={shop.lastSale ? '' : 'no orders yet'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 22 }}>
        <Field label="Sells" value={shop.categories.length ? shop.categories.join(', ') : '—'} />
        <Field label="Offering type" value={shop.type || '—'} />
        <Field label="Ships to" value={shop.shipsTo || '—'} />
        <Field label="Business" value={[shop.legalName, shop.bizType].filter(Boolean).join(' · ') || '—'} />
        <Field
          label="Primary payout"
          // Named, never detailed. Full bank details go through the audited
          // reveal in migration 042, not a register anyone can scroll.
          value={shop.payout ? `${shop.payout.kind} · ${shop.payout.label}` : 'Not connected'}
          tone={shop.payout ? undefined : 'var(--ink-4)'}
        />
        <Field label="Listing states" value={shop.products == null ? '—'
          : [`${shop.live} live`, (shop.unlisted ?? 0) > 0 && `${shop.unlisted} unlisted`, (shop.flagged ?? 0) > 0 && `${shop.flagged} flagged`, (shop.removed ?? 0) > 0 && `${shop.removed} removed`].filter(Boolean).join(' · ')} />
      </div>

      {shop.recent.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="fld-label">Latest listings</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {shop.recent.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 11, background: 'var(--bg-2)' }}>
                {p.image
                  ? <span style={{ width: 30, height: 30, borderRadius: 8, background: `url(${p.image}) center/cover`, flexShrink: 0 }} />
                  : <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--line)', flexShrink: 0 }} />}
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontSize: 12.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>{sMoney(p.price, 2)}</span>
                <span className="chip" style={{ fontSize: 10.5, background: p.status === 'live' ? 'var(--green-tint)' : sTint('var(--clay)', 12), color: p.status === 'live' ? 'var(--green)' : 'var(--clay)' }}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--line)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" style={{ padding: '9px 16px', fontSize: 13 }} onClick={() => onSection?.('products')}>
          <Icon name="bag" size={15} /> Moderate listings
        </button>
        <button className="btn btn-ghost" style={{ padding: '9px 16px', fontSize: 13 }} onClick={() => onSection?.('users')}>
          <Icon name="user" size={15} /> Owner account
        </button>
        {shop.handle && (
          <button className="btn btn-ghost" style={{ padding: '9px 16px', fontSize: 13 }} onClick={() => {
            navigator.clipboard?.writeText('@' + shop.handle).then(
              () => app.toast?.({ msg: 'Handle copied', sub: '@' + shop.handle, icon: 'check' }),
              () => app.toast?.({ msg: 'Could not copy', kind: 'error', icon: 'close' }),
            );
          }}>
            <Icon name="check" size={15} /> Copy @handle
          </button>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 13, background: 'var(--bg-2)' }}>
      <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 5, letterSpacing: '-0.01em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: any; tone?: string }) {
  return (
    <div>
      <div className="fld-label">{label}</div>
      <div style={{ fontSize: 14, color: tone ?? 'var(--ink-2)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}
