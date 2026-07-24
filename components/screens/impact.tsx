"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { getAllLogs, computeStreak, ImpactLog } from "@/lib/impact";

type DayBucket = { date: string; t: number; e: number; f: number; o: number };

function groupByDateCategory(logs: ImpactLog[], days = 30): DayBucket[] {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().substring(0, 10);
  const map: Record<string, DayBucket> = {};
  for (const l of logs) {
    const d = l.logged_at?.substring(0, 10) ?? '';
    if (d < cutoff) continue;
    if (!map[d]) map[d] = { date: d, t: 0, e: 0, f: 0, o: 0 };
    const kg = Number(l.co2_saved_kg ?? 0);
    const cat = l.category ?? '';
    if (cat === 'Transport') map[d].t += kg;
    else if (cat === 'Energy') map[d].e += kg;
    else if (cat === 'Food') map[d].f += kg;
    else map[d].o += kg;
  }
  const result: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().substring(0, 10);
    result.push(map[d] ?? { date: d, t: 0, e: 0, f: 0, o: 0 });
  }
  return result;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy === 1) return 'Yesterday';
  return `${dy}d ago`;
}

const CAT_ICON: Record<string, string> = {
  Transport: 'leaf', Energy: 'bolt', Food: 'plant', Waste: 'repost',
  Ocean: 'droplet', Policy: 'comment', Education: 'bookmark', Lifestyle: 'sparkles', General: 'leaf',
};

// =============== Desktop Impact Dashboard ===============
export function DesktopImpact({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [logs, setLogs] = React.useState<ImpactLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [chartDays, setChartDays] = React.useState(30);

  React.useEffect(() => {
    if (!app.user?.id) { setLoading(false); return; }
    getAllLogs(app.user.id).then(data => {
      setLogs(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [app.user?.id]);

  const totalCo2 = logs.reduce((s, l) => s + Number(l.co2_saved_kg ?? 0), 0);
  const totalPts = logs.reduce((s, l) => s + Number(l.points ?? 0), 0);
  const streak = computeStreak(logs);
  const chartData = groupByDateCategory(logs, chartDays);
  const recentLogs = logs.slice(0, 8);
  const isVerified = (app.user as any)?.verified || totalCo2 >= 500;

  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="impact" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        {/* Header */}
        <div className="page-header-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>YOUR IMPACT · {monthLabel}</div>
            {loading ? (
              <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink-3)' }}>Loading your impact…</h1>
            ) : totalCo2 === 0 ? (
              <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em' }}>Start your impact journey.</h1>
            ) : (
              <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em' }}>
                You've avoided <span style={{ color: 'var(--green)' }}>{totalCo2 >= 1000 ? (totalCo2 / 1000).toFixed(1) + ' tonnes' : Math.round(totalCo2) + ' kg'}</span> of CO₂.
              </h1>
            )}
            <p style={{ margin: '6px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>
              {totalCo2 > 0
                ? `That's the equivalent of taking a car off the road for ${(totalCo2 / 400).toFixed(1)} weeks. Keep going.`
                : 'Log your first action to start tracking your environmental impact.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => app.openModal?.('export')}>Export report</button>
            <button className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={() => app.openModal?.('logaction')}>Log an action</button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          <KpiCard label="CO₂ avoided" value={totalCo2 >= 1000 ? (totalCo2 / 1000).toFixed(2) : Math.round(totalCo2).toString()} unit={totalCo2 >= 1000 ? 't' : 'kg'} delta={isVerified ? '✓ Verified impact' : `${Math.max(0, Math.round(500 - totalCo2))} kg to verified`} color="var(--green)" icon="leaf" big />
          <KpiCard label="Green points" value={formatCount(totalPts)} unit="GP" delta={`${logs.length} action${logs.length === 1 ? '' : 's'} logged`} color="var(--green-2)" icon="award" />
          <KpiCard label="Current streak" value={streak.toString()} unit={streak === 1 ? 'day' : 'days'} delta={streak >= 30 ? '2× multiplier active!' : `${30 - streak} days to 2×`} color="var(--sky)" icon="flame" />
          <KpiCard label="Impact level" value={(Math.floor(totalPts / 200) + 1).toString()} unit="" delta={`${totalPts % 200} / 200 GP to next`} color="var(--sun)" icon="bolt" />
        </div>

        {/* Main chart + streak */}
        <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginBottom: 18 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>CO₂ ledger</h2>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Daily avoided emissions</div>
              </div>
              <div className="pill-nav">
                {([7, 30, 90] as const).map(d => (
                  <button key={d} className={chartDays === d ? 'active' : ''} onClick={() => setChartDays(d)}>{d}d</button>
                ))}
              </div>
            </div>
            <BarChart data={chartData} />
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
                {streak}<span style={{ fontSize: 24, opacity: .7 }}> {streak === 1 ? 'day' : 'days'}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' }}>
                {Array.from({ length: Math.min(Math.max(streak + 2, 7), 20) }).map((_, i) => (
                  <div key={i} style={{ width: 14, height: 28, borderRadius: 4, background: i < streak ? '#fff' : 'rgba(255,255,255,.25)' }} />
                ))}
              </div>
              <div style={{ fontSize: 12, marginTop: 14, opacity: .9 }}>
                {streak >= 30 ? '🎉 2× point multiplier active!' : `Hit 30 days for a 2× point multiplier.`}
              </div>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>Level {Math.floor(totalPts / 200) + 1}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{totalPts % 200} / 200 GP</span>
              </div>
              <div style={{ height: 8, background: 'var(--line)', borderRadius: 999 }}>
                <div style={{ width: ((totalPts % 200) / 200 * 100) + '%', height: '100%', background: 'var(--green)', borderRadius: 999 }} />
              </div>
              {isVerified ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 12px', background: 'var(--green-tint)', borderRadius: 10, border: '1px solid var(--green-3)' }}>
                  <Icon name="check" size={16} color="var(--green)" stroke={2.5} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Verified Impact</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>500 kg CO₂ threshold reached</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>
                  Log {Math.max(0, Math.round(500 - totalCo2))} more kg CO₂ to earn the verified badge.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent actions + leaderboard */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Recent actions</h2>
              {logs.length > 0 && <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{logs.length} total</span>}
            </div>
            {recentLogs.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>
                <Icon name="leaf" size={28} color="var(--green)" />
                <div style={{ marginTop: 8 }}>No actions logged yet.</div>
                <button className="btn btn-green" style={{ marginTop: 12, padding: '8px 16px' }} onClick={() => app.openModal?.('logaction')}>Log your first action</button>
              </div>
            )}
            {recentLogs.map((log, i) => (
              <div key={log.id ?? i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: 'var(--green-tint)',
                  color: 'var(--green)', display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <Icon name={CAT_ICON[log.category] ?? 'leaf'} size={18} stroke={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.action}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{log.logged_at ? timeAgo(log.logged_at) : ''} · {log.category}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>+{log.points} GP</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>−{log.co2_saved_kg} kg</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Neighborhood ranking</h2>
              <span className="chip">Community</span>
            </div>
            {[
              ['1', 'Sarah Green', '@sarahgreen', '482 kg', false],
              ['2', 'Tara Lin', '@tara_l', '364 kg', false],
              ['3', app.user?.name || 'You', '@' + ((app.user as any)?.handle || 'you'), `${Math.round(totalCo2)} kg`, true],
              ['4', 'Marcus J.', '@ecomarcus', '142 kg', false],
              ['5', 'Maya Patel', '@urbangrower', '128 kg', false],
            ].map(([rank, n, h, v, isYou]) => (
              <div key={String(rank)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: isYou ? 'var(--green-tint)' : 'transparent',
                margin: isYou ? '0 -8px' : 0,
                padding: isYou ? '10px 8px' : '10px 0',
                borderRadius: isYou ? 10 : 0,
              }}>
                <span style={{ width: 22, fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{rank}</span>
                <Avatar name={String(n)} size={32} />
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

export function BarChart({ data }: { data?: DayBucket[] }) {
  const days = data?.length ?? 30;
  const chartData: DayBucket[] = data ?? Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().substring(0, 10);
    return { date: d, t: 3 + Math.sin(i * 0.4) * 2 + Math.random() * 2, e: 2 + Math.cos(i * 0.3) * 1.5 + Math.random() * 1.5, f: 1 + Math.random() * 2, o: Math.random() * 1.5 };
  });

  const max = Math.max(...chartData.map(d => d.t + d.e + d.f + d.o), 1);
  const barW = Math.max(6, Math.floor(560 / Math.max(days, 1)) - 2);
  const totalW = days * (barW + 2);

  const labelIdxs = days <= 7
    ? Array.from({ length: days }, (_, i) => i)
    : [0, Math.floor(days / 4), Math.floor(days / 2), Math.floor(3 * days / 4), days - 1];

  return (
    <svg viewBox={`0 0 ${totalW} 200`} width="100%" height="220" style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1="0" x2={totalW} y1={200 - p * 180} y2={200 - p * 180} stroke="var(--line)" strokeWidth="1" strokeDasharray={p === 0 ? '' : '2 4'} />
      ))}
      {chartData.map((d, i) => {
        const x = i * (barW + 2);
        const scale = 180 / max;
        let y = 200;
        const parts: [keyof DayBucket, string][] = [['t', 'var(--green)'], ['e', 'var(--green-2)'], ['f', 'var(--sky)'], ['o', 'var(--sun)']];
        return (
          <g key={i}>
            {parts.map(([k, c]) => {
              const h = (d[k] as number) * scale;
              if (h < 0.5) return null;
              y -= h;
              return <rect key={k} x={x} y={y} width={barW} height={h - 0.5} fill={c} rx="1" />;
            })}
          </g>
        );
      })}
      {labelIdxs.map(i => {
        if (i >= chartData.length) return null;
        return (
          <text key={i} x={i * (barW + 2) + barW / 2} y="218" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" fill="var(--ink-4)">
            {formatDateLabel(chartData[i].date)}
          </text>
        );
      })}
    </svg>
  );
};
