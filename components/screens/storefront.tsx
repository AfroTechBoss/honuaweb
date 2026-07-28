"use client";
import React from "react";
import { Icon, Avatar, ImagePlaceholder, DesktopSidebar, useApp } from "@/components/shared";
import type { Storefront } from "@/lib/market";

// =====================================================================
// Public storefront — a seller's shop page with all their live products
// =====================================================================
export function DesktopStorefront({ handle, onNav }: { handle: string; onNav: any }) {
  const app = useApp();
  const [shop, setShop] = React.useState<Storefront | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mob, setMob] = React.useState(false);

  React.useEffect(() => {
    const check = () => setMob(window.innerWidth <= 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    import('@/lib/market').then(({ getStorefront }) => getStorefront(handle)).then(s => {
      if (alive) { setShop(s); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [handle]);

  const isOwn = shop?.ownerId && shop.ownerId === app.user?.id;

  if (loading) return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="marketplace" onNav={onNav} />
      <main style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Loading storefront…</main>
    </div>
  );

  if (!shop) return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="marketplace" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--ink-3)' }}>
        <Icon name="bag" size={40} />
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-2)' }}>Shop not found</div>
        <button className="btn btn-ghost" onClick={() => onNav?.('marketplace')}>Back to marketplace</button>
      </main>
    </div>
  );

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="marketplace" onNav={onNav} />
      <main style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
        {/* Cover + header */}
        <div style={{ height: mob ? 100 : 150, background: 'linear-gradient(120deg, var(--green-3), var(--green-tint))' }} />
        <div style={{ padding: mob ? '0 16px 24px' : '0 32px 32px', maxWidth: 1100 }}>
          <div style={{ marginTop: mob ? -32 : -40, display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ width: mob ? 72 : 96, height: mob ? 72 : 96, borderRadius: 22, overflow: 'hidden', border: '3px solid var(--bg)', background: 'var(--green)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 32, fontWeight: 700, flexShrink: 0 }}>
              {shop.logo ? <img src={shop.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : shop.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 200, paddingBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 className="font-display" style={{ margin: 0, fontSize: mob ? 24 : 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{shop.name}</h1>
                <span className="verified-impact">verified shop</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 3 }}>honua.green/shop/{shop.handle}{shop.location ? ` · ${shop.location}` : ''}</div>
              {shop.tagline && <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 560 }}>{shop.tagline}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, paddingBottom: 6 }}>
              {isOwn
                ? <button className="btn btn-green" onClick={() => onNav?.('seller')} style={{ padding: '9px 16px' }}><Icon name="bag" size={14} /> Manage shop</button>
                : <button className="btn btn-primary" onClick={() => onNav?.('messages', { handle: shop.products[0]?.sellerHandle, shop: 1 })} disabled={!shop.products[0]?.sellerHandle} style={{ padding: '9px 16px' }}><Icon name="msg" size={14} /> Message shop</button>}
            </div>
          </div>

          {/* Products */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', marginBottom: 14 }}>
              {shop.products.length} PRODUCT{shop.products.length === 1 ? '' : 'S'}
            </div>
            {shop.products.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                {isOwn ? 'You haven\'t listed any products yet.' : 'This shop has no products listed yet.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: mob ? 10 : 14 }}>
                {shop.products.map(p => (
                  <div key={p.id} className="post-card" onClick={() => onNav?.('product', { id: p.id })} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ position: 'relative' }}>
                      <ImagePlaceholder label={p.name} height={mob ? 140 : 190} src={p.imgUrl ?? undefined} />
                      {p.tag && <span className="chip chip-green" style={{ position: 'absolute', top: 8, left: 8, fontSize: 10 }}>{p.tag}</span>}
                    </div>
                    <div style={{ padding: mob ? 10 : 14 }}>
                      <div style={{ fontSize: mob ? 13 : 14, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Lora' }}>{p.price}</span>
                        <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); app.addToCart({ id: p.id, name: p.name, price: p.price, brand: p.brand, tag: p.tag, imgUrl: p.imgUrl, quantity: 1 }); app.toast?.({ msg: 'Added to cart', sub: p.name, kind: 'success', icon: 'cart' }); }} style={{ padding: '4px 10px', fontSize: 12 }}>Add</button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 8 }}>
                        {p.review_count > 0 ? `★ ${p.rating} · ${p.review_count}` : 'New listing'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
