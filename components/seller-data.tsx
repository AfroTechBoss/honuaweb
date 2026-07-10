"use client";
import React from "react";
import { Icon } from "./icons";

// =====================================================================
// Seller flow — shared mock data, status meta, and small UI helpers
// Used by both desktop and mobile seller screens.
// =====================================================================

// ---- Status metadata (single color token → label + computed tint) ----
export const S_STATUS = {
  active:      { label: 'Active',     color: 'var(--green)' },
  inactive:    { label: 'Inactive',   color: 'var(--ink-3)' },
  draft:       { label: 'Draft',      color: 'var(--sun)'  },
  pending:     { label: 'Pending',    color: 'var(--sun)'  },
  'in-review': { label: 'In review',  color: 'var(--sky)'  },
  approved:    { label: 'Approved',   color: 'var(--green)' },
  rejected:    { label: 'Declined',   color: 'var(--clay)' },
  processing:  { label: 'Processing', color: 'var(--sun)'  },
  confirmed:   { label: 'Confirmed',  color: 'var(--green)' },
  shipped:     { label: 'Shipped',    color: 'var(--sky)'  },
  delivered:   { label: 'Delivered',  color: 'var(--green)' },
  cancelled:   { label: 'Cancelled',  color: 'var(--clay)' },
  'low-stock': { label: 'Low stock',  color: 'var(--clay)' },
};

export function sTint(color, pct = 14) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
};

// Status badge -------------------------------------------------------
export function SBadge({ status, dot = true, size = 'md' }) {
  const meta = S_STATUS[status] || { label: status, color: 'var(--ink-3)' };
  const pad = size === 'sm' ? '2px 8px 2px 7px' : '4px 11px 4px 9px';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: pad, borderRadius: 999,
      background: sTint(meta.color), color: meta.color,
      fontSize: size === 'sm' ? 11 : 12, fontWeight: 600,
      fontFamily: 'Geist Mono', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />}
      {meta.label}
    </span>
  );
};

// Money formatter ----------------------------------------------------
export function sMoney(n, dp = 2) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
};

// Stat card ----------------------------------------------------------
export function SStat({ label, value, sub, icon, accent = 'var(--green)', trend }: { label: any; value: any; sub?: any; icon?: any; accent?: string; trend?: number }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
        {icon && (
          <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center',
            background: sTint(accent), color: accent }}>
            <Icon name={icon} size={15} stroke={2} />
          </span>
        )}
      </div>
      <div className="font-display tabular" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 10 }}>{value}</div>
      {(sub || trend) && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {trend != null && (
            <span style={{ color: trend >= 0 ? 'var(--green)' : 'var(--clay)', fontWeight: 600, fontFamily: 'Geist Mono' }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub}
        </div>
      )}
    </div>
  );
};

// Tiny sparkline -----------------------------------------------------
export function SSpark({ data = [], color = 'var(--green)', w = 120, h = 36, fill = true }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const rng = max - min || 1;
  const pts = data.map((d, i) => [ (i / (data.length - 1)) * w, h - ((d - min) / rng) * (h - 4) - 2 ]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${w} ${h} L0 ${h} Z`;
  const id = React.useMemo(() => 'sp' + Math.random().toString(36).slice(2, 7), []);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.22" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Horizontal stepper (apply wizard) ----------------------------------
export function SStepper({ steps, current, onJump, compact }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      {steps.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <React.Fragment key={s}>
            <button onClick={() => done && onJump?.(i)} style={{
              display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none',
              cursor: done ? 'pointer' : 'default', padding: 0, flexShrink: 0,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist Mono',
                background: active ? 'var(--green)' : done ? 'var(--green-tint)' : 'var(--bg-2)',
                color: active ? '#fff' : done ? 'var(--green)' : 'var(--ink-4)',
                border: active ? 'none' : '1px solid var(--line)',
              }}>
                {done ? <Icon name="check" size={14} stroke={2.6} /> : i + 1}
              </span>
              {!compact && (
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 500,
                  color: active ? 'var(--ink)' : done ? 'var(--ink-2)' : 'var(--ink-4)', whiteSpace: 'nowrap' }}>{s}</span>
              )}
            </button>
            {i < steps.length - 1 && (
              <span style={{ flex: 1, height: 1.5, margin: '0 12px', borderRadius: 2, minWidth: 12,
                background: done ? 'var(--green)' : 'var(--line-2)' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Section heading inside dashboards ----------------------------------
export function SHead({ kicker, title, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
      <div>
        {kicker && <div style={{ fontSize: 12, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>{kicker}</div>}
        <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em' }}>{title}</h1>
      </div>
      {children && <div style={{ display: 'flex', gap: 8 }}>{children}</div>}
    </div>
  );
};

// =====================================================================
// Constants reused across application + product forms
// =====================================================================
export const SELLER_CATEGORIES = [
  'Home & Garden', 'Sustainable Fashion', 'Organic Food', 'Electronics',
  'Health & Wellness', 'Renewable Energy', 'Transport', 'Books & Media',
  'Beauty & Care', 'Outdoors', 'Kids & Baby', 'Crafts & Supplies',
];

export const SELLER_PRACTICES = [
  'Made from recycled materials', 'Carbon-neutral shipping', 'Plastic-free packaging',
  'Locally sourced', 'Fair-trade certified', 'Renewable-energy powered',
  'Zero-waste production', 'Organic materials', 'Repairable by design', 'Refillable / reusable',
];

export const SELLER_CERTS = ['B Corp', 'Fair Trade', 'FSC', 'GOTS', 'Climate Neutral', '1% for the Planet'];

// =====================================================================
// The signed-in user's own shop (seeded once approved) + their catalog
// =====================================================================
export const MOCK_SELLER = {
  shop: {
    name: 'The Fix-it Collective',
    handle: 'fixit',
    tagline: 'Tools and kits that keep things out of landfill.',
    location: 'Lisbon, PT',
    impactScore: 92,
    rating: 4.9,
    reviews: 286,
    joined: 'May 2026',
  },
  products: [
    { id: 'p1', title: 'The repair kit · 92 tools', price: 84, category: 'Home & Garden', type: 'physical', status: 'active', stock: 38, threshold: 10, views: 4120, likes: 612, sales: 147, img: 'folded leather tool case open', tag: 'Repairable' },
    { id: 'p2', title: 'Brass darning mushroom', price: 22, category: 'Crafts & Supplies', type: 'physical', status: 'active', stock: 6, threshold: 10, views: 1840, likes: 203, sales: 64, img: 'brass darning mushroom on linen', tag: 'Plastic-free' },
    { id: 'p3', title: 'Bike multi-tool (16 fn)', price: 36, category: 'Transport', type: 'physical', status: 'active', stock: 121, threshold: 15, views: 2960, likes: 388, sales: 92, img: 'steel bike multitool flat lay', tag: 'Repairable' },
    { id: 'p4', title: 'Repair café starter guide', price: 12, category: 'Books & Media', type: 'digital', status: 'active', stock: null, threshold: null, views: 980, likes: 121, sales: 210, img: 'printed zine cover repair cafe', tag: 'Digital' },
    { id: 'p5', title: 'Sharpening service (mail-in)', price: 28, category: 'Health & Wellness', type: 'service', status: 'draft', stock: null, threshold: null, views: 0, likes: 0, sales: 0, img: 'knife sharpening workshop', tag: 'Service' },
    { id: 'p6', title: 'Patch & mend fabric set', price: 19, category: 'Sustainable Fashion', type: 'physical', status: 'inactive', stock: 0, threshold: 8, views: 1420, likes: 167, sales: 53, img: 'denim patches thread spools', tag: 'Zero-waste' },
  ],
  orders: [
    { id: '#HN-4821', product: 'The repair kit · 92 tools', buyer: 'Marcus Johnson', handle: 'marcus', qty: 1, total: 84, status: 'processing', payment: 'paid', date: '2h ago', dateFull: 'Jun 28' },
    { id: '#HN-4820', product: 'Bike multi-tool (16 fn)', buyer: 'Maya Patel', handle: 'maya', qty: 2, total: 72, status: 'processing', payment: 'paid', date: '5h ago', dateFull: 'Jun 28' },
    { id: '#HN-4814', product: 'Repair café starter guide', buyer: 'Dr. Adaeze Okafor', handle: 'okafor', qty: 1, total: 12, status: 'confirmed', payment: 'paid', date: '1d ago', dateFull: 'Jun 27' },
    { id: '#HN-4809', product: 'The repair kit · 92 tools', buyer: 'Sarah Green', handle: 'sarahgreen', qty: 1, total: 84, status: 'shipped', payment: 'paid', date: '2d ago', dateFull: 'Jun 26' },
    { id: '#HN-4795', product: 'Brass darning mushroom', buyer: 'Tara Lin', handle: 'tara', qty: 3, total: 66, status: 'shipped', payment: 'paid', date: '3d ago', dateFull: 'Jun 25' },
    { id: '#HN-4780', product: 'Bike multi-tool (16 fn)', buyer: 'GreenTech Solutions', handle: 'greentech', qty: 1, total: 36, status: 'delivered', payment: 'paid', date: '5d ago', dateFull: 'Jun 23' },
    { id: '#HN-4772', product: 'Patch & mend fabric set', buyer: 'Climate Action Network', handle: 'can', qty: 4, total: 76, status: 'delivered', payment: 'paid', date: '6d ago', dateFull: 'Jun 22' },
    { id: '#HN-4765', product: 'The repair kit · 92 tools', buyer: 'Maya Patel', handle: 'maya', qty: 1, total: 84, status: 'cancelled', payment: 'refunded', date: '1w ago', dateFull: 'Jun 21' },
  ],
  customers: [
    { name: 'Maya Patel', handle: 'maya', orders: 4, spent: 312, last: 'Jun 28', city: 'Austin, TX' },
    { name: 'Sarah Green', handle: 'sarahgreen', orders: 3, spent: 252, last: 'Jun 26', city: 'Portland, OR' },
    { name: 'Marcus Johnson', handle: 'marcus', orders: 2, spent: 168, last: 'Jun 28', city: 'Austin, TX' },
    { name: 'Tara Lin', handle: 'tara', orders: 2, spent: 110, last: 'Jun 25', city: 'Seattle, WA' },
    { name: 'Dr. Adaeze Okafor', handle: 'okafor', orders: 1, spent: 12, last: 'Jun 27', city: 'Lagos, NG' },
  ],
  threads: [
    { handle: 'marcus', name: 'Marcus Johnson', last: 'Is the repair kit restocking soon?', time: '8m', unread: 2, online: true,
      msgs: [ ['them', 'Hey! Love the repair kit — is it restocking soon?'], ['them', 'Want to gift one for a workshop.'] ] },
    { handle: 'maya', name: 'Maya Patel', last: 'Thanks — tracking came through 🙌', time: '2h', unread: 0, online: true,
      msgs: [ ['them', 'Order arrived, the multi-tool is perfect.'], ['me', 'So glad! Tag us if you post a repair 🔧'], ['them', 'Thanks — tracking came through 🙌'] ] },
    { handle: 'tara', name: 'Tara Lin', last: 'Could you do a bulk order of 20?', time: '1d', unread: 1, online: false,
      msgs: [ ['them', 'Could you do a bulk order of 20 darning mushrooms for a mending circle?'] ] },
    { handle: 'okafor', name: 'Dr. Adaeze Okafor', last: 'The guide was super clear, thank you.', time: '2d', unread: 0, online: false,
      msgs: [ ['them', 'The repair café guide was super clear, thank you.'] ] },
  ],
  // 30-day series for charts
  revenueSeries: [180, 210, 165, 240, 300, 280, 360, 320, 410, 380, 300, 450, 520, 480, 540, 500, 610, 580, 640, 700, 660, 720, 690, 780, 740, 820, 800, 910, 880, 960],
  viewsSeries:   [120, 140, 110, 180, 220, 200, 260, 240, 300, 280, 220, 320, 360, 340, 380, 360, 420, 400, 440, 480, 460, 500, 480, 540, 520, 580, 560, 620, 600, 660],
};

// Pending applications for the admin queue ---------------------------
export const MOCK_APPLICATIONS = [
  { id: 'a1', shop: 'Loom & Linen', applicant: 'Priya Raman', handle: 'priya', categories: ['Sustainable Fashion', 'Home & Garden'], type: 'Physical goods', country: 'India', submitted: '3h ago', impact: 'GOTS-certified organic cotton, dyed with plant waste, woven by a 12-person co-op.', practices: ['Organic materials', 'Fair-trade certified', 'Locally sourced'], certs: ['GOTS', 'Fair Trade'], status: 'pending', new: true },
  { id: 'a2', shop: 'Volt Garage', applicant: 'Diego Santos', handle: 'diego', categories: ['Transport', 'Renewable Energy'], type: 'Physical + service', country: 'Portugal', submitted: '6h ago', impact: 'Refurbished e-bike batteries, diverting cells from landfill with a 5-year warranty.', practices: ['Repairable by design', 'Renewable-energy powered'], certs: ['Climate Neutral'], status: 'pending', new: true },
  { id: 'a3', shop: 'Rootbound', applicant: 'Ama Mensah', handle: 'ama', categories: ['Organic Food', 'Home & Garden'], type: 'Physical goods', country: 'Ghana', submitted: '1d ago', impact: 'Heirloom seeds and compost kits from a regenerative urban farm.', practices: ['Zero-waste production', 'Plastic-free packaging', 'Organic materials'], certs: ['1% for the Planet'], status: 'pending', new: false },
  { id: 'a4', shop: 'Pelagic Goods', applicant: 'Noa Adler', handle: 'noa', categories: ['Outdoors', 'Beauty & Care'], type: 'Physical goods', country: 'Israel', submitted: '2d ago', impact: 'Reef-safe sunscreen in refillable aluminium tins, ocean-cleanup partner.', practices: ['Refillable / reusable', 'Carbon-neutral shipping'], certs: ['B Corp'], status: 'pending', new: false },
];
