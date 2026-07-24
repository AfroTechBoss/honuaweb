"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";


// =====================================================================
// DesktopSellerDashboard — the approved seller's control panel
// =====================================================================
const SELLER_TABS = [
  ['overview',  'Overview',   'home'],
  ['products',  'Products',   'bag'],
  ['orders',    'Orders',     'cart'],
  ['analytics', 'Analytics',  'leaf'],
  ['payouts',   'Payouts',    'coin'],
  ['customers', 'Customers',  'users'],
  ['messages',  'Messages',   'msg'],
  ['storefront','Storefront', 'settings'],
];

const MOCK_PAYOUT_HISTORY = [
  { id: 'pw-s001', amount: 820.00, destination: 'GTBank ••4521', requestedAt: '2 days ago', status: 'approved' },
  { id: 'pw-s002', amount: 1540.00, destination: 'GTBank ••4521', requestedAt: '2 weeks ago', status: 'approved' },
  { id: 'pw-s003', amount: 290.00, destination: 'GTBank ••4521', requestedAt: '1 month ago', status: 'rejected', rejectReason: 'Open dispute pending resolution.' },
  { id: 'pw-s004', amount: 600.00, destination: 'GTBank ••4521', requestedAt: '6 weeks ago', status: 'approved' },
];

export function DesktopSellerDashboard({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const approved = app.state?.sellerStatus === 'approved';
  const [tab, setTab] = React.useState('overview');
  const [products, setProducts] = React.useState(MOCK_SELLER.products);
  const [orders, setOrders] = React.useState(MOCK_SELLER.orders);
  const [editing, setEditing] = React.useState(null); // product being edited / 'new'

  if (!approved) return <DashGate onNav={onNav} status={app.state?.sellerStatus} />;

  const shop = app.state?.sellerShop?.name ? { ...MOCK_SELLER.shop, name: app.state.sellerShop.name, handle: app.state.sellerShop.handle || MOCK_SELLER.shop.handle } : MOCK_SELLER.shop;

  const saveProduct = (p) => {
    setProducts(list => {
      const exists = list.some(x => x.id === p.id);
      return exists ? list.map(x => x.id === p.id ? p : x) : [{ ...p, id: 'p' + Date.now() }, ...list];
    });
    app.toast?.({ msg: editing === 'new' ? 'Product published' : 'Product updated', sub: p.title, kind: 'success', icon: 'check' });
    setEditing(null);
  };
  const removeProduct = (id) => { setProducts(l => l.filter(x => x.id !== id)); app.toast?.({ msg: 'Product removed', icon: 'trash' }); };
  const advanceOrder = (id) => {
    const flow = { processing: 'confirmed', confirmed: 'shipped', shipped: 'delivered' };
    setOrders(list => list.map(o => o.id === id && flow[o.status] ? { ...o, status: flow[o.status] } : o));
    app.toast?.({ msg: 'Order updated', sub: id, kind: 'success', icon: 'cart' });
  };

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Seller header strip */}
        <div style={{ padding: '18px 32px 0', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={shop.name} size={46} verified />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{shop.name}</h1>
                <span className="verified-impact">verified · {shop.impactScore} impact</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>honua.green/shop/{shop.handle} · ★ {shop.rating} ({shop.reviews})</div>
            </div>
            <button className="btn btn-ghost" onClick={() => onNav?.('marketplace')} style={{ padding: '8px 14px' }}>View storefront <Icon name="arrow" size={14} /></button>
            <button className="btn btn-green" onClick={() => setEditing('new')} style={{ padding: '8px 16px' }}><Icon name="plus" size={15} stroke={2.4} /> Add product</button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginTop: 14, overflowX: 'auto' }} className="no-scrollbar">
            {SELLER_TABS.map(([k, label, ic]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13.5, fontWeight: tab === k ? 600 : 500, color: tab === k ? 'var(--ink)' : 'var(--ink-3)',
                borderBottom: '2px solid ' + (tab === k ? 'var(--green)' : 'transparent'), whiteSpace: 'nowrap',
              }}>
                <Icon name={ic} size={15} stroke={tab === k ? 2 : 1.75} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }} className="no-scrollbar">
          {tab === 'overview'  && <OverviewTab products={products} orders={orders} onTab={setTab} />}
          {tab === 'products'  && <ProductsTab products={products} onEdit={setEditing} onRemove={removeProduct} onToggle={(id, st) => setProducts(l => l.map(p => p.id === id ? { ...p, status: st } : p))} />}
          {tab === 'orders'    && <OrdersTab orders={orders} onAdvance={advanceOrder} />}
          {tab === 'analytics' && <AnalyticsTab products={products} />}
          {tab === 'customers' && <CustomersTab />}
          {tab === 'messages'  && <MessagesTab />}
          {tab === 'payouts'   && <PayoutsTab orders={orders} />}
          {tab === 'storefront'&& <StorefrontTab shop={shop} />}
        </div>
      </main>

      {editing && <ProductEditor product={editing === 'new' ? null : products.find(p => p.id === editing)} onSave={saveProduct} onClose={() => setEditing(null)} />}
    </div>
  );
};

// ---- Gate shown when not approved ----
function DashGate({ onNav, status }) {
  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="" onNav={onNav} />
      <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40 }}>
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <span style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--bg-2)', color: 'var(--ink-3)', display: 'inline-grid', placeItems: 'center' }}><Icon name="lock" size={26} /></span>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 600, margin: '18px 0 0', letterSpacing: '-0.02em' }}>Your dashboard is locked</h1>
          <p style={{ fontSize: 14.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: '10px 0 22px' }}>
            {status === 'pending' ? 'Your application is still in review. We\'ll unlock this the moment you\'re approved.' : 'You need an approved Honua shop to access the seller dashboard.'}
          </p>
          <button className="btn btn-green" onClick={() => onNav?.('sell')} style={{ padding: '11px 20px' }}>{status === 'pending' ? 'Check application status' : 'Apply to sell'}</button>
        </div>
      </main>
    </div>
  );
}

// =====================================================================
// Overview tab
// =====================================================================
function OverviewTab({ products, orders, onTab }) {
  const app = useApp();
  const confirmed = orders.filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status)).reduce((s, o) => s + o.total, 0);
  const pending = orders.filter(o => o.status === 'processing').reduce((s, o) => s + o.total, 0);
  const available = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const net = available * 0.95 * 0.98;
  const lowStock = products.filter(p => p.type === 'physical' && p.stock != null && p.stock <= (p.threshold || 5));
  const openOrders = orders.filter(o => ['processing', 'confirmed'].includes(o.status));

  return (
    <div>
      {lowStock.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, marginBottom: 16,
          background: sTint('var(--clay)', 12), border: '1px solid color-mix(in srgb, var(--clay) 25%, transparent)' }}>
          <Icon name="flame" size={18} color="var(--clay)" />
          <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><strong>{lowStock.length} product{lowStock.length > 1 ? 's' : ''}</strong> running low — {lowStock.map(p => p.title.split(' · ')[0]).join(', ')}.</span>
          <button onClick={() => onTab('products')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--clay)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Restock →</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Revenue · 30d" value={sMoney(confirmed, 0)} icon="coin" trend={18} sub="vs last month" />
        <SStat label="Orders" value={orders.length} icon="cart" trend={9} sub="3 need action" accent="var(--sky)" />
        <SStat label="Pending payout" value={sMoney(pending, 0)} icon="clock" accent="var(--sun)" sub="clears on delivery" />
        <SStat label="Available balance" value={sMoney(net, 0)} icon="leaf" sub="after fees" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>
        {/* Revenue chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Revenue</span>
            <span className="chip" style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>Last 30 days</span>
          </div>
          <div className="font-display tabular" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em' }}>{sMoney(MOCK_SELLER.revenueSeries.reduce((a, b) => a + b, 0), 0)}</div>
          <div style={{ marginTop: 10 }}><SSpark data={MOCK_SELLER.revenueSeries} color="var(--green)" w={520} h={90} /></div>
        </div>

        {/* Payout card */}
        <PayoutCard net={net} onTab={onTab} />
      </div>

      {/* Recent orders + top products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Orders to fulfil</span>
            <button onClick={() => onTab('orders')} style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>All orders →</button>
          </div>
          {openOrders.slice(0, 4).map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
              <Avatar name={o.buyer} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.product}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{o.id} · {o.buyer} · {o.date}</div>
              </div>
              <span className="tabular" style={{ fontSize: 14, fontWeight: 600 }}>{sMoney(o.total, 0)}</span>
              <SBadge status={o.status} size="sm" />
            </div>
          ))}
          {openOrders.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>All caught up</div>}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Top products</span>
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            {[...products].sort((a, b) => b.sales - a.sales).slice(0, 4).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}><ImagePlaceholder label="" height={38} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title.split(' · ')[0]}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{p.sales} sold</div>
                </div>
                <span className="tabular" style={{ fontSize: 13, fontWeight: 600 }}>{sMoney(p.sales * p.price, 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Products tab
// =====================================================================
function ProductsTab({ products, onEdit, onRemove, onToggle }) {
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const filtered = products.filter(p => (filter === 'all' || p.status === filter) && p.title.toLowerCase().includes(q.toLowerCase()));
  const counts = { all: products.length, active: products.filter(p => p.status === 'active').length, draft: products.filter(p => p.status === 'draft').length, inactive: products.filter(p => p.status === 'inactive').length };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="pill-nav">
          {[['all', 'All'], ['active', 'Active'], ['draft', 'Drafts'], ['inactive', 'Inactive']].map(([k, l]) => (
            <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{l} <span style={{ opacity: .5, fontFamily: 'JetBrains Mono', fontSize: 11 }}>{counts[k]}</span></button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', background: 'var(--bg-2)', borderRadius: 999, padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center', width: 260 }}>
          <Icon name="search" size={15} color="var(--ink-3)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }} />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 1fr 0.8fr 90px', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
          <span>Product</span><span>Status</span><span>Price</span><span>Stock</span><span>Sold</span><span></span>
        </div>
        {filtered.map(p => {
          const low = p.type === 'physical' && p.stock != null && p.stock <= (p.threshold || 5);
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 1fr 0.8fr 90px', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><ImagePlaceholder label="" height={44} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', display: 'flex', gap: 8 }}>
                    <span>{p.category}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="heart" size={11} /> {p.likes}</span>
                  </div>
                </div>
              </div>
              <span><SBadge status={p.status} size="sm" /></span>
              <span className="tabular" style={{ fontSize: 13.5, fontWeight: 600 }}>{sMoney(p.price, 0)}</span>
              <span className="tabular" style={{ fontSize: 13, color: low ? 'var(--clay)' : 'var(--ink-2)', fontWeight: low ? 600 : 400 }}>{p.type === 'physical' ? (p.stock + (low ? ' ⚠' : '')) : '—'}</span>
              <span className="tabular" style={{ fontSize: 13 }}>{p.sales}</span>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <IconBtn icon="pencil" onClick={() => onEdit(p.id)} />
                <IconBtn icon={p.status === 'active' ? 'close' : 'check'} title={p.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => onToggle(p.id, p.status === 'active' ? 'inactive' : 'active')} />
                <IconBtn icon="trash" onClick={() => onRemove(p.id)} danger />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>No products here yet.</div>}
      </div>
    </div>
  );
}

function IconBtn({ icon, onClick, danger, title }: { icon: any; onClick?: () => void; danger?: boolean; title?: string }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer',
      display: 'grid', placeItems: 'center', color: danger ? 'var(--clay)' : 'var(--ink-3)' }} className="row-hover">
      <Icon name={icon} size={14} />
    </button>
  );
}

// ---- Product editor modal ----
function ProductEditor({ product, onSave, onClose }) {
  const [f, setF] = React.useState(product || { title: '', price: '', category: SELLER_CATEGORIES[0], type: 'physical', status: 'active', stock: 0, threshold: 5, views: 0, likes: 0, sales: 0, img: '', tag: 'Plastic-free' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const valid = f.title && f.price > 0;
  return (
    <Modal onClose={onClose} width={560}>
      <ModalHead icon="bag" title={product ? 'Edit product' : 'Add a product'} sub={product ? f.title : 'List something new on your storefront.'} onClose={onClose} />
      <div style={{ padding: '18px 24px 0', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ width: 90, height: 90, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px dashed var(--line-2)' }}><ImagePlaceholder label="photo" height={90} /></div>
          <DashFld label="Product title" value={f.title} onChange={v => set('title', v)} placeholder="What are you selling?" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <DashFld label="Price" prefix="$" type="number" value={f.price} onChange={v => set('price', parseFloat(v) || 0)} placeholder="0.00" />
          <label>
            <span className="fld-label">Category</span>
            <select className="fld" value={f.category} onChange={e => set('category', e.target.value)}>{SELLER_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label>
            <span className="fld-label">Type</span>
            <select className="fld" value={f.type} onChange={e => set('type', e.target.value)}><option value="physical">Physical product</option><option value="digital">Digital product</option><option value="service">Service</option></select>
          </label>
          <label>
            <span className="fld-label">Status</span>
            <select className="fld" value={f.status} onChange={e => set('status', e.target.value)}><option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option></select>
          </label>
        </div>
        {f.type === 'physical' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <DashFld label="Stock quantity" type="number" value={f.stock} onChange={v => set('stock', parseInt(v) || 0)} />
            <DashFld label="Low-stock alert at" type="number" value={f.threshold} onChange={v => set('threshold', parseInt(v) || 0)} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-green" disabled={!valid} onClick={() => onSave(f)} style={{ opacity: valid ? 1 : .5, cursor: valid ? 'pointer' : 'not-allowed' }}>{product ? 'Save changes' : 'Publish product'}</button>
      </div>
    </Modal>
  );
}

// DashFld (local copy — desktop-seller.jsx defines its own in module scope) ----
function DashFld({ label, hint, value, onChange, placeholder, prefix, area, type = 'text' }: { label?: string; hint?: string; value?: any; onChange?: (value: any) => void; placeholder?: string; prefix?: string; area?: boolean; type?: string }) {
  return (
    <label style={{ display: 'block', flex: 1 }}>
      {label && <span className="fld-label">{label}</span>}
      {area ? (
        <textarea className="fld" rows={3} value={value} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} />
      ) : (
        <div style={{ position: 'relative' }}>
          {prefix && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', fontSize: 14 }}>{prefix}</span>}
          <input className="fld" type={type} value={value} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} style={{ paddingLeft: prefix ? 24 : 13 }} />
        </div>
      )}
      {hint && <span style={{ fontSize: 11.5, color: 'var(--ink-4)', display: 'block', marginTop: 5 }}>{hint}</span>}
    </label>
  );
}

// =====================================================================
// Orders tab
// =====================================================================
function OrdersTab({ orders, onAdvance }) {
  const [filter, setFilter] = React.useState('all');
  const active = ['processing', 'confirmed', 'shipped'];
  const filtered = orders.filter(o => filter === 'all' ? true : filter === 'open' ? active.includes(o.status) : o.status === filter);
  const nextLabel = { processing: 'Confirm', confirmed: 'Mark shipped', shipped: 'Mark delivered' };
  return (
    <div>
      <div className="pill-nav" style={{ marginBottom: 16 }}>
        {[['all', 'All'], ['open', 'Open'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']].map(([k, l]) => (
          <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.3fr 0.6fr 1fr 1fr 130px', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
          <span>Order</span><span>Product</span><span>Buyer</span><span>Qty</span><span>Total</span><span>Status</span><span></span>
        </div>
        {filtered.map(o => (
          <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.3fr 0.6fr 1fr 1fr 130px', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{o.id}</span>
            <span style={{ fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.product}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><Avatar name={o.buyer} size={26} /><span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.buyer}</span></span>
            <span className="tabular" style={{ fontSize: 13 }}>{o.qty}</span>
            <span className="tabular" style={{ fontSize: 13.5, fontWeight: 600 }}>{sMoney(o.total, 0)}</span>
            <span><SBadge status={o.status} size="sm" /></span>
            <span style={{ textAlign: 'right' }}>
              {nextLabel[o.status]
                ? <button className="btn btn-ghost" onClick={() => onAdvance(o.id)} style={{ padding: '6px 11px', fontSize: 12 }}>{nextLabel[o.status]}</button>
                : <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{o.dateFull}</span>}
            </span>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>No orders in this view.</div>}
      </div>
    </div>
  );
}

// =====================================================================
// Analytics tab
// =====================================================================
function AnalyticsTab({ products }) {
  const totalViews = products.reduce((s, p) => s + p.views, 0);
  const totalSales = products.reduce((s, p) => s + p.sales, 0);
  const conv = ((totalSales / totalViews) * 100).toFixed(1);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <SStat label="Storefront views" value={totalViews.toLocaleString()} icon="leaf" trend={14} sub="30d" />
        <SStat label="Add-to-cart rate" value="6.8%" icon="cart" trend={3} accent="var(--sky)" />
        <SStat label="Conversion" value={conv + '%'} icon="bolt" trend={1.2} accent="var(--sun)" />
        <SStat label="Repeat buyers" value="34%" icon="users" trend={5} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Views · 30 days</span>
          <div style={{ marginTop: 14 }}><SSpark data={MOCK_SELLER.viewsSeries} color="var(--sky)" w={460} h={110} /></div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Revenue · 30 days</span>
          <div style={{ marginTop: 14 }}><SSpark data={MOCK_SELLER.revenueSeries} color="var(--green)" w={460} h={110} /></div>
        </div>
      </div>
      {/* Product performance */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, marginTop: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Product performance</span>
        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          {[...products].sort((a, b) => b.views - a.views).map(p => {
            const pct = Math.round((p.views / totalViews) * 100);
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 200, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{p.title}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--bg-2)', overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: 'var(--green)' }} />
                </div>
                <span className="tabular" style={{ width: 70, textAlign: 'right', fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{p.views.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Customers tab
// =====================================================================
function CustomersTab() {
  const [sel, setSel] = React.useState(null);
  const cust = MOCK_SELLER.customers.find(c => c.handle === sel);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 380px' : '1fr', gap: 16, alignItems: 'start' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
          <span>Customer</span><span>Orders</span><span>Spent</span><span>Location</span><span>Last</span>
        </div>
        {MOCK_SELLER.customers.map(c => (
          <button key={c.handle} onClick={() => setSel(c.handle === sel ? null : c.handle)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr', gap: 12, width: '100%', textAlign: 'left', padding: '14px 18px', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', alignItems: 'center', background: c.handle === sel ? 'var(--green-tint)' : 'transparent' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={c.name} size={32} /><span style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</span></span>
            <span className="tabular" style={{ fontSize: 13 }}>{c.orders}</span>
            <span className="tabular" style={{ fontSize: 13.5, fontWeight: 600 }}>{sMoney(c.spent, 0)}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{c.city}</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{c.last}</span>
          </button>
        ))}
      </div>
      {cust && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={cust.name} size={48} />
            <div><div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>{cust.name}</div><div style={{ fontSize: 12.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{cust.handle} · {cust.city}</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
            <MiniStat label="Lifetime spend" value={sMoney(cust.spent, 0)} />
            <MiniStat label="Orders" value={cust.orders} />
          </div>
          <div style={{ marginTop: 16 }}>
            <span className="fld-label">Recent orders</span>
            {MOCK_SELLER.orders.filter(o => o.handle === cust.handle).slice(0, 3).map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13 }}>{o.product.split(' · ')[0]}</span>
                <SBadge status={o.status} size="sm" />
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}><Icon name="msg" size={14} /> Message {cust.name.split(' ')[0]}</button>
        </div>
      )}
    </div>
  );
}
function MiniStat({ label, value }) {
  return <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 14 }}><div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{label}</div><div className="font-display tabular" style={{ fontSize: 22, fontWeight: 600, marginTop: 3 }}>{value}</div></div>;
}

// =====================================================================
// Messages tab
// =====================================================================
function MessagesTab() {
  const [sel, setSel] = React.useState(MOCK_SELLER.threads[0].handle);
  const [draft, setDraft] = React.useState('');
  const [extra, setExtra] = React.useState({});
  const t = MOCK_SELLER.threads.find(x => x.handle === sel);
  const msgs = [...t.msgs, ...(extra[sel] || []).map(m => ['me', m])];
  const send = () => { if (!draft.trim()) return; setExtra(e => ({ ...e, [sel]: [...(e[sel] || []), draft] })); setDraft(''); };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', height: 540, background: 'var(--surface)' }}>
      <div style={{ borderRight: '1px solid var(--line)', overflow: 'auto' }} className="no-scrollbar">
        {MOCK_SELLER.threads.map(th => (
          <button key={th.handle} onClick={() => setSel(th.handle)} style={{ display: 'flex', gap: 11, width: '100%', textAlign: 'left', padding: '14px 16px', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: sel === th.handle ? 'var(--green-tint)' : 'transparent', alignItems: 'center' }}>
            <span style={{ position: 'relative' }}><Avatar name={th.name} size={38} />{th.online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--surface)' }} />}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{th.name}</span><span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{th.time}</span></div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{th.last}</div>
            </div>
            {th.unread > 0 && <span style={{ background: 'var(--green)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10, fontFamily: 'JetBrains Mono' }}>{th.unread}</span>}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={t.name} size={34} /><div><div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div><div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{t.online ? 'Active now' : 'Offline'}</div></div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }} className="no-scrollbar">
          {msgs.map(([who, text], i) => (
            <div key={i} style={{ alignSelf: who === 'me' ? 'flex-end' : 'flex-start', maxWidth: '70%', padding: '9px 13px', borderRadius: 14,
              background: who === 'me' ? 'var(--green)' : 'var(--bg-2)', color: who === 'me' ? '#fff' : 'var(--ink)', fontSize: 13.5, lineHeight: 1.45 }}>{text}</div>
          ))}
        </div>
        <div style={{ padding: 14, borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Reply…" style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 999, padding: '10px 16px', fontSize: 13.5, outline: 'none', background: 'var(--bg-2)' }} />
          <button className="btn btn-green" onClick={send} style={{ padding: '10px 18px' }}>Send</button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Payout card (overview inline)
// =====================================================================
function PayoutCard({ net, onTab }) {
  const app = useApp();
  const [showRequest, setShowRequest] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleRequest = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || val > net) return;
    setSubmitted(true);
    app.toast?.({ msg: 'Withdrawal request submitted', sub: sMoney(val) + ' · under review', kind: 'success', icon: 'coin' });
    setTimeout(() => { setShowRequest(false); setAmount(''); setSubmitted(false); }, 200);
  };

  return (
    <div style={{ background: 'var(--ink-solid)', color: '#fff', borderRadius: 16, padding: 22 }}>
      <div style={{ fontSize: 13, opacity: .7 }}>Available to withdraw</div>
      <div className="font-display tabular" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 4 }}>{sMoney(net)}</div>
      <div style={{ fontSize: 12, opacity: .5, marginTop: 4, fontFamily: 'JetBrains Mono' }}>Funds clear after buyer protection window</div>

      {!showRequest ? (
        <>
          <button onClick={() => setShowRequest(true)} style={{ background: '#fff', color: 'var(--ink)', width: '100%', justifyContent: 'center', marginTop: 16, fontWeight: 600, padding: '11px', borderRadius: 10, border: 'none', cursor: net > 0 ? 'pointer' : 'not-allowed', opacity: net > 0 ? 1 : 0.5, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="coin" size={15} /> Request Withdrawal
          </button>
          <button onClick={() => onTab('payouts')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 10, padding: '4px 0' }}>
            View payout history →
          </button>
        </>
      ) : (
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ opacity: .6, fontSize: 14 }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={'Max ' + sMoney(net, 0)}
              max={net}
              autoFocus
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'Satoshi', flex: 1, width: 0 }}
            />
          </div>
          {parseFloat(amount) > net && (
            <div style={{ fontSize: 12, color: '#f87171', fontFamily: 'JetBrains Mono' }}>Amount exceeds available balance</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowRequest(false); setAmount(''); }} style={{ flex: 1, background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, padding: '10px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleRequest} disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > net} style={{ flex: 2, background: '#fff', border: 'none', borderRadius: 10, color: 'var(--ink)', fontSize: 13, fontWeight: 700, padding: '10px', cursor: 'pointer', opacity: (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > net) ? 0.4 : 1 }}>Submit Request</button>
          </div>
          <div style={{ fontSize: 11, opacity: .45, textAlign: 'center', fontFamily: 'JetBrains Mono' }}>Reviews take 1–2 business days</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: showRequest ? 10 : 0, fontSize: 12, opacity: .45, fontFamily: 'JetBrains Mono' }}>
        <span>Sale fee 5%</span><span>Withdrawal fee 2%</span>
      </div>
    </div>
  );
}

// =====================================================================
// Payouts tab
// =====================================================================
function PayoutsTab({ orders }) {
  const app = useApp();
  const available = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0) * 0.95 * 0.98;
  const pending = orders.filter(o => o.status !== 'delivered').reduce((s, o) => s + o.total, 0);
  const [history, setHistory] = React.useState(MOCK_PAYOUT_HISTORY);
  const [showRequest, setShowRequest] = React.useState(false);
  const [amount, setAmount] = React.useState('');

  const statusColor = { approved: 'var(--green)', rejected: 'var(--clay)', pending: 'var(--sun)', on_hold: 'var(--ink-3)' };
  const statusLabel = { approved: 'Approved', rejected: 'Rejected', pending: 'Pending review', on_hold: 'On Hold' };

  const handleRequest = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || val > available) return;
    const newReq = { id: 'pw-s' + Date.now(), amount: val, destination: 'GTBank ••4521', requestedAt: 'just now', status: 'pending' };
    setHistory(h => [newReq, ...h]);
    app.toast?.({ msg: 'Withdrawal request submitted', sub: sMoney(val) + ' · under review', kind: 'success', icon: 'coin' });
    setShowRequest(false);
    setAmount('');
  };

  return (
    <div style={{ maxWidth: 800, display: 'grid', gap: 16 }}>
      {/* Balance overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 6 }}>Available to withdraw</div>
          <div className="font-display tabular" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--green)' }}>{sMoney(available)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 4, fontFamily: 'JetBrains Mono' }}>after fees</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 6 }}>Pending clearance</div>
          <div className="font-display tabular" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--sun)' }}>{sMoney(pending)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 4, fontFamily: 'JetBrains Mono' }}>clears on delivery</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 6 }}>Total withdrawn</div>
          <div className="font-display tabular" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>{sMoney(history.filter(h => h.status === 'approved').reduce((s, h) => s + h.amount, 0))}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 4, fontFamily: 'JetBrains Mono' }}>all time</div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--green-tint)', border: '1px solid color-mix(in srgb, var(--green) 25%, transparent)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
        Withdrawals are reviewed by Honua within <strong>1–2 business days</strong>. Funds are released once the review is complete. Minimum withdrawal is <strong>$10.00</strong>.
      </div>

      {/* Request form or button */}
      {showRequest ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New withdrawal request</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <DashFld label="Amount to withdraw" prefix="$" type="number" value={amount} onChange={setAmount} placeholder={`Max ${sMoney(available, 0)}`} />
            {parseFloat(amount) > available && (
              <div style={{ fontSize: 12.5, color: 'var(--clay)', fontFamily: 'JetBrains Mono' }}>Amount exceeds available balance of {sMoney(available)}</div>
            )}
            <DashFld label="Destination account" value="GTBank ••4521" onChange={() => {}} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => { setShowRequest(false); setAmount(''); }}>Cancel</button>
              <button className="btn btn-green" disabled={!amount || parseFloat(amount) < 10 || parseFloat(amount) > available} onClick={handleRequest} style={{ opacity: (!amount || parseFloat(amount) < 10 || parseFloat(amount) > available) ? 0.5 : 1 }}>
                <Icon name="coin" size={14} /> Submit request
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button className="btn btn-green" onClick={() => setShowRequest(true)} disabled={available < 10} style={{ alignSelf: 'start', padding: '11px 20px', opacity: available >= 10 ? 1 : 0.5 }}>
          <Icon name="coin" size={15} /> Request withdrawal
        </button>
      )}

      {/* History */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--line)', fontSize: 14, fontWeight: 600 }}>Payout history</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
          <span>Reference</span><span>Amount</span><span>Destination</span><span>Status</span>
        </div>
        {history.map(h => (
          <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12.5, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{h.id}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{h.requestedAt}</div>
            </div>
            <span className="tabular" style={{ fontSize: 14, fontWeight: 700 }}>{sMoney(h.amount)}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{h.destination}</span>
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: `color-mix(in srgb, ${statusColor[h.status]} 12%, transparent)`, color: statusColor[h.status], fontFamily: 'JetBrains Mono', display: 'inline-block' }}>
                {statusLabel[h.status]}
              </span>
              {h.rejectReason && (
                <div style={{ fontSize: 11.5, color: 'var(--clay)', marginTop: 4, lineHeight: 1.4 }}>{h.rejectReason}</div>
              )}
            </div>
          </div>
        ))}
        {history.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No withdrawal history yet.</div>}
      </div>
    </div>
  );
}

// =====================================================================
// Storefront settings tab
// =====================================================================
function StorefrontTab({ shop }) {
  const app = useApp();
  const [bio, setBio] = React.useState(shop.tagline);
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ height: 120, position: 'relative', background: 'linear-gradient(120deg, var(--green-3), var(--sky-tint))' }}>
          <button className="btn btn-ghost" style={{ position: 'absolute', right: 14, top: 14, background: 'var(--surface)', padding: '6px 12px', fontSize: 12 }}><Icon name="image" size={13} /> Change cover</button>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ marginTop: -32, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <Avatar name={shop.name} size={72} verified />
            <div style={{ paddingBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="font-display" style={{ fontSize: 22, fontWeight: 600 }}>{shop.name}</span>
                <span className="verified-impact">verified shop</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>honua.green/shop/{shop.handle}</div>
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
            <DashFld label="Shop name" value={shop.name} onChange={() => {}} />
            <DashFld label="Tagline" area value={bio} onChange={setBio} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <DashFld label="Location" value={shop.location} onChange={() => {}} />
              <label><span className="fld-label">Primary category</span><select className="fld">{SELLER_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>Joined {shop.joined} · ★ {shop.rating}</span>
            <button className="btn btn-green" onClick={() => app.toast?.({ msg: 'Storefront saved', kind: 'success', icon: 'check' })}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
