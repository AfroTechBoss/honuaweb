"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { getNotifications, markAllRead } from "@/lib/notifications";


// =============== Desktop Marketplace ===============
export function DesktopMarketplace({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [mob, setMob] = React.useState(false);
  const [dbProducts, setDbProducts] = React.useState<any[]>([]);
  // 'loading' until the first answer; 'error' when the catalogue could not be
  // read. Either way the grid says so instead of showing invented products.
  const [load, setLoad] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [cat, setCat] = React.useState('All');
  React.useEffect(() => {
    const check = () => setMob(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Real products only. This used to fall back to a demo catalogue whenever the
  // table was empty or slow, so a new marketplace showed products nobody sells.
  React.useEffect(() => {
    import('@/lib/market').then(({ getProducts }) => getProducts())
      .then(rows => { setDbProducts(rows); setLoad('ready'); })
      .catch(() => setLoad('error'));
  }, []);
  const featured = dbProducts.find((p: any) => p.featured) ?? null;
  const gridProducts = dbProducts.filter((p: any) => !p.featured);
  const shownProducts = cat === 'All' ? gridProducts : gridProducts.filter((p: any) => (p.category ?? 'Home') === cat);

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="marketplace" onNav={onNav} />
      <main style={{ flex: 1, padding: mob ? '16px' : '24px 32px', overflowY: 'auto', overflowX: 'hidden', height: '100%', paddingBottom: mob ? 80 : 32 }} className="no-scrollbar">

        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>MARKETPLACE</div>
          <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: mob ? 20 : 36, fontWeight: 600, letterSpacing: mob ? '-0.01em' : '-0.03em', lineHeight: 1.2 }}>Sustainable goods, vouched by humans.</h1>
          <p style={{ margin: '4px 0 10px', color: 'var(--ink-3)', fontSize: 14 }}>Every product carries an impact label and a real review from someone on Honua.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {app.state?.sellerStatus === 'approved'
              ? <button className="btn btn-ghost" onClick={() => onNav?.('seller')} style={{ color: 'var(--green)', borderColor: 'var(--green-3)', fontSize: 13 }}><Icon name="bag" size={14} /> Seller dashboard</button>
              : <button className="btn btn-ghost" onClick={() => onNav?.('sell')} style={{ color: 'var(--green)', borderColor: 'var(--green-3)', fontSize: 13 }}><Icon name="bag" size={14} /> Sell on Honua</button>}
            <button className="btn btn-ghost" onClick={() => app.openModal?.('list', { title: 'Your wishlist', icon: 'bookmark', sub: (app.state.wishlist.length || 'No') + ' saved items', items: app.state.wishlist.length ? app.state.wishlist.map(n => ({ icon: 'bag', title: n, sub: 'tap a product to add to cart' })) : [{ icon: 'bookmark', title: 'Nothing saved yet', sub: 'tap the bookmark on any product' }] })} style={{ fontSize: 13 }}><Icon name="bookmark" size={14} /> Wishlist</button>
            <button className="btn btn-primary" onClick={() => app.openCart?.()} style={{ fontSize: 13 }}><Icon name="bag" size={14} /> Cart · {app.cartCount}</button>
          </div>
        </div>

        {/* Feature banner — only for a product a seller actually marked featured */}
        {featured && (
        <div style={{
          background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)',
          overflow: 'hidden', display: 'grid', gridTemplateColumns: mob ? '1fr' : '1.3fr 1fr', marginBottom: 20,
        }}>
          <div style={{ padding: mob ? 18 : 28 }}>
            <span className="chip chip-green">Featured</span>
            <h2 className="font-display" style={{ margin: '10px 0 8px', fontSize: mob ? 20 : 30, fontWeight: 600, letterSpacing: '-0.02em' }}>{featured.name}.</h2>
            {featured.description && <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6 }}>{featured.description}</p>}
            <div style={{ display: 'flex', gap: 14, marginTop: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 600, fontFamily: 'Lora' }}>{featured.price}</span>
              {featured.compare_at_cents && <span style={{ fontSize: 14, color: 'var(--ink-3)', textDecoration: 'line-through' }}>${(featured.compare_at_cents / 100).toFixed(0)}</span>}
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => {
                const item = { id: featured.id, name: featured.name, price: featured.price, brand: featured.brand, tag: featured.tag, imgUrl: featured.imgUrl, quantity: 1 };
                app.addToCart(item);
                app.toast?.({ msg: 'Added to cart', sub: `${item.name} · ${item.price}`, kind: 'success', icon: 'cart' });
              }}>Add to cart</button>
            </div>
          </div>
          {!mob && <ImagePlaceholder label={featured.name} height={280} src={featured.imgUrl} />}
        </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ minWidth: 0, flex: 1 }}><MarketFilters active={cat} onChange={setCat} /></div>
          {!mob && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="chip">Made in EU</span>
              <span className="chip">Carbon-neg</span>
              <span className="chip">Repairable</span>
              <span className="chip">+ filter</span>
            </div>
          )}
        </div>

        {/* Product grid */}
        <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: mob ? 10 : 14 }}>
          {shownProducts.map((p: any, i: number) => {
            const productId = p.id;
            const wished = app.wishlist?.has(productId) || app.wishlist?.has(p.name);
            return (
            <div key={productId} className="post-card" onClick={() => app.nav?.('product', { id: productId })} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ position: 'relative' }}>
                <ImagePlaceholder label={p.img} height={mob ? 140 : 200} src={p.imgUrl} />
                <span className="chip chip-green" style={{ position: 'absolute', top: 8, left: 8, fontSize: 10 }}>{p.tag}</span>
                <button onClick={(e) => { e.stopPropagation(); app.wishlist.toggle(productId); app.toast?.(wished ? { msg: 'Removed from wishlist', icon: 'bookmark' } : { msg: 'Saved to wishlist', kind: 'success', icon: 'bookmark' }); }} style={{
                  position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--surface)', border: '1px solid var(--line)', cursor: 'pointer',
                  display: 'grid', placeItems: 'center', color: wished ? 'var(--green)' : 'var(--ink-3)',
                }}><Icon name="bookmark" size={13} stroke={wished ? 2.4 : 1.75} /></button>
              </div>
              <div style={{ padding: mob ? 10 : 14 }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {p.sellerLogo && <img src={p.sellerLogo} alt="" style={{ width: 14, height: 14, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.brand.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: mob ? 13 : 14, fontWeight: 600, marginTop: 3 }}>{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Lora' }}>{p.price}</span>
                  <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); app.addToCart({ ...p, id: productId, quantity: 1 }); app.toast?.({ msg: 'Added to cart', sub: p.name, kind: 'success', icon: 'cart' }); }} style={{ padding: '4px 10px', fontSize: 12 }}>Add</button>
                </div>
                {!mob && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
                      {p.review_count > 0 ? `★ ${p.rating} · ${p.review_count}` : 'New listing'}
                    </div>
                    {p.sellerHandle && (
                      <button onClick={(e) => { e.stopPropagation(); app.nav?.('messages', { handle: p.sellerHandle, shop: 1 }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--sky)', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Icon name="msg" size={11} /> Ask
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
        {shownProducts.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6 }}>
            {load === 'loading' ? 'Loading products…'
              : load === 'error' ? "The marketplace couldn't be loaded. Check your connection and try again."
              : dbProducts.length === 0 ? 'No products are listed yet. Sellers are being onboarded — check back soon.'
              : `Nothing in ${cat} yet.`}
          </div>
        )}
      </main>
    </div>
  );
};

export function MarketFilters({ active: controlled, onChange }: { active?: string; onChange?: (t: string) => void } = {}) {
  const [local, setLocal] = React.useState('All');
  const active = controlled ?? local;
  const set = onChange ?? setLocal;
  return (
    <div className="pill-nav">
      {['All', 'Home', 'Food', 'Style', 'Energy', 'Outdoors', 'Books'].map((t) => (
        <button key={t} className={active === t ? 'active' : ''} onClick={() => set(t)}>{t}</button>
      ))}
    </div>
  );
};

// =============== Desktop Messages ===============
