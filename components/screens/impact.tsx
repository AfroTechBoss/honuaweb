"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";


// =============== Desktop Impact Dashboard (NEW) ===============
export function DesktopImpact({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="impact" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        {/* Header */}
        <div className="page-header-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>YOUR IMPACT · MAY 2026</div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em' }}>You're offsetting <span style={{ color: 'var(--green)' }}>1.4 tonnes</span> of CO₂ this year.</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>That's the equivalent of taking a car off the road for 3.5 months. Keep going.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => app.openModal?.('export')}>Export report</button>
            <button className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={() => app.openModal?.('logaction')}>Log an action</button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          <KpiCard label="CO₂ avoided" value="164" unit="kg" delta="+12% vs Apr" color="var(--green)" icon="leaf" big />
          <KpiCard label="Trees funded" value="42" unit="trees" delta="+8 this month" color="var(--green-2)" icon="plant" />
          <KpiCard label="Water saved" value="3,840" unit="liters" delta="+220 L" color="var(--sky)" icon="droplet" />
          <KpiCard label="Energy cut" value="284" unit="kWh" delta="−18% vs Apr" color="var(--sun)" icon="bolt" />
        </div>

        {/* Main chart + breakdown */}
        <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginBottom: 18 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>CO₂ ledger</h2>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Daily avoided emissions, last 30 days</div>
              </div>
              <div className="pill-nav">
                <button>7d</button>
                <button className="active">30d</button>
                <button>1y</button>
                <button>All</button>
              </div>
            </div>
            <BarChart />
            <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
              <Legend color="var(--green)" label="Transport" />
              <Legend color="var(--green-2)" label="Energy" />
              <Legend color="var(--sky)" label="Food" />
              <Legend color="var(--sun)" label="Other" />
            </div>
          </div>

          {/* Streak + level */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'linear-gradient(135deg, #1f6f3f, #2e9a5b)',
              borderRadius: 16, padding: 22, color: '#fff', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', opacity: .85, letterSpacing: '.05em' }}>CURRENT STREAK</div>
              <div style={{ fontSize: 56, fontWeight: 600, fontFamily: 'Lora', letterSpacing: '-0.04em', lineHeight: 1 }}>
                12<span style={{ fontSize: 24, opacity: .7 }}> days</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ width: 14, height: 28, borderRadius: 4, background: i < 11 ? '#fff' : 'rgba(255,255,255,.35)' }} />
                ))}
              </div>
              <div style={{ fontSize: 12, marginTop: 14, opacity: .9 }}>Hit 30 days for a 2× point multiplier.</div>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>Level 7 · Composter</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>1240 / 2000 GP</span>
              </div>
              <div style={{ height: 8, background: 'var(--line)', borderRadius: 999 }}>
                <div style={{ width: '62%', height: '100%', background: 'var(--green)', borderRadius: 999 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 14 }}>
                {['leaf', 'leaf', 'tree', 'award'].map((icon, i) => (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: 10,
                    border: '1px dashed var(--line-2)',
                    display: 'grid', placeItems: 'center',
                    opacity: i < 2 ? 1 : 0.3,
                  }}><Icon name={icon} size={20} color="var(--green)" /></div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>2 of 4 badges this season</div>
            </div>
          </div>
        </div>

        {/* Recent actions + leaderboard */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Recent actions</h2>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontWeight: 500, cursor: 'pointer', fontSize: 13 }} onClick={() => app.openModal?.('list', { title: 'All logged actions', icon: 'leaf', sub: 'Your verified impact ledger · May 2026', items: [['leaf', 'Biked to work (8.4km)', 'Today · 7:42', '+24 GP'], ['plant', 'Composted food waste', 'Yesterday', '+18 GP'], ['bolt', 'Switched to renewable plan', 'May 18', '+200 GP'], ['droplet', 'Low-flow shower head', 'May 16', '+80 GP'], ['repost', 'Donated to repair café', 'May 14', '+60 GP'], ['leaf', 'Carpooled to market', 'May 12', '+16 GP'], ['plant', 'Planted balcony herbs', 'May 10', '+22 GP']].map(([ic, t, w, r]) => ({ icon: ic, title: t, sub: w, right: r })) })}>See all →</button>
            </div>
            {[
              ['leaf', 'Biked to work (8.4km)', 'Today · 7:42', '+24 GP', '−1.8 kg CO₂', true],
              ['plant', 'Composted week of food waste', 'Yesterday', '+18 GP', '−2.1 kg CO₂', true],
              ['bolt', 'Switched to renewable plan', 'May 18', '+200 GP', '−42 kg CO₂', true],
              ['droplet', 'Installed low-flow shower head', 'May 16', '+80 GP', '20 L /day', false],
              ['repost', 'Donated 12 items to repair café', 'May 14', '+60 GP', '−6.4 kg waste', false],
            ].map(([icon, t, when, gp, im, verified], i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: 'var(--green-tint)',
                  color: 'var(--green)', display: 'grid', placeItems: 'center',
                }}>
                  <Icon name={icon} size={18} stroke={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{t}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{when}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>{gp}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{im}</div>
                </div>
                {verified && <VerifiedImpact value="✓" unit="" />}
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Neighborhood ranking</h2>
              <span className="chip">Brooklyn</span>
            </div>
            {[
              ['1', 'Sarah Green', '@sarahgreen', '482 kg', 1, true],
              ['2', 'Tara Lin', '@tara_l', '364 kg', 2, false],
              ['3', 'You', '@you', '164 kg', 3, false],
              ['4', 'Marcus J.', '@ecomarcus', '142 kg', 4, false],
              ['5', 'Maya Patel', '@urbangrower', '128 kg', 5, false],
            ].map(([rank, n, h, v, _, isYou]) => (
              <div key={String(rank)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: isYou ? 'var(--green-tint)' : 'transparent',
                margin: isYou ? '0 -8px' : 0,
                padding: isYou ? '10px 8px' : '10px 0',
                borderRadius: isYou ? 10 : 0,
              }}>
                <span style={{ width: 22, fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{rank}</span>
                <Avatar name={n} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n} {isYou && <span style={{ color: 'var(--green)', fontSize: 11 }}>(you)</span>}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{h}</div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>−{v}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export function KpiCard({ label, value, unit, delta, color, icon, big }: { label: string; value: string | number; unit: string; delta: string; color: string; icon: string; big?: boolean }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16,
      border: '1px solid var(--line)', padding: 18,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 16, right: 16,
        width: 32, height: 32, borderRadius: 10, background: color + '18', color,
        display: 'grid', placeItems: 'center',
      }}>
        <Icon name={icon} size={16} stroke={2} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', letterSpacing: '.05em' }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: big ? 38 : 32, fontWeight: 600, fontFamily: 'Lora', letterSpacing: '-0.03em', marginTop: 6 }}>
        {value}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}> {unit}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4, fontFamily: 'JetBrains Mono' }}>↗ {delta}</div>
    </div>
  );
};

export function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
};

export function BarChart() {
  const days = 30;
  const data = Array.from({ length: days }).map((_, i) => {
    const t = 3 + Math.sin(i * 0.4) * 2 + Math.random() * 2;
    const e = 2 + Math.cos(i * 0.3) * 1.5 + Math.random() * 1.5;
    const f = 1 + Math.random() * 2;
    const o = Math.random() * 1.5;
    return { t, e, f, o };
  });
  const max = 12;
  return (
    <svg viewBox={`0 0 ${days * 16} 200`} width="100%" height="220" style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1="0" x2={days * 16} y1={200 - p * 180} y2={200 - p * 180} stroke="var(--line)" strokeWidth="1" strokeDasharray={p === 0 ? '' : '2 4'} />
      ))}
      {data.map((d, i) => {
        const x = i * 16 + 4;
        const total = d.t + d.e + d.f + d.o;
        const scale = 180 / max;
        let y = 200;
        const parts = [['t', 'var(--green)'], ['e', 'var(--green-2)'], ['f', 'var(--sky)'], ['o', 'var(--sun)']];
        return (
          <g key={i}>
            {parts.map(([k, c]) => {
              const h = d[k] * scale;
              y -= h;
              return <rect key={k} x={x} y={y} width="8" height={h - 1} fill={c} rx="1" />;
            })}
          </g>
        );
      })}
      {[1, 8, 15, 22, 29].map(d => (
        <text key={d} x={d * 16 + 8} y="218" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" fill="var(--ink-4)">May {d}</text>
      ))}
    </svg>
  );
};
