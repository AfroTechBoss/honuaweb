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
      fontFamily: 'JetBrains Mono', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, minWidth: 6, minHeight: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />}
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
            <span style={{ color: trend >= 0 ? 'var(--green)' : 'var(--clay)', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
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
                display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 600, fontFamily: 'JetBrains Mono',
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
        {kicker && <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>{kicker}</div>}
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
