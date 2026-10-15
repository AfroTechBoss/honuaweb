"use client";
import React from "react";
import { Icon, Logo, Avatar, VerifiedTick, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { getAllLogs, getImpactLeaderboard, computeStreak, localDay, ImpactLog, LeaderRow } from "@/lib/impact";

// Distinct colour per category, used by the chart + legend.
export const CAT_COLORS: Record<string, string> = {
  Transport: 'var(--green)',
  Energy:    '#84cc16', // lime
  Food:      'var(--sky)',
  Waste:     'var(--sun)',
  Ocean:     '#06b6d4', // cyan
  Lifestyle: '#a855f7', // purple
  Policy:    '#f43f5e', // rose
  Education: '#14b8a6', // teal
  General:   'var(--ink-4)',
};
export const CAT_ORDER = ['Transport', 'Energy', 'Food', 'Waste', 'Ocean', 'Lifestyle', 'Policy', 'Education', 'General'];

type DayBucket = { date: string; byCatKg: Record<string, number>; byCatGp: Record<string, number> };

// Bucket logs into local calendar days, tracking both CO₂ (kg) and GP per
// category. Local days avoid the UTC off-by-one that shifted logs a day.
function groupByDateCategory(logs: ImpactLog[], days = 30): DayBucket[] {
  const map: Record<string, DayBucket> = {};
  for (const l of logs) {
    if (!l.logged_at) continue;
    const key = localDay(new Date(l.logged_at));
    if (!map[key]) map[key] = { date: key, byCatKg: {}, byCatGp: {} };
    const cat = l.category ?? 'General';
    map[key].byCatKg[cat] = (map[key].byCatKg[cat] ?? 0) + Number(l.co2_saved_kg ?? 0);
    map[key].byCatGp[cat] = (map[key].byCatGp[cat] ?? 0) + Number(l.points ?? 0);
  }
  const result: DayBucket[] = [];
  const base = new Date(); base.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const key = localDay(d);
    result.push(map[key] ?? { date: key, byCatKg: {}, byCatGp: {} });
  }
  return result;
}

// kg up to a tonne, then tonnes — a five-figure kg number in a narrow column
// reads as noise.
function co2Label(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${Math.round(kg)} kg`;
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
  const [chartMode, setChartMode] = React.useState<'co2' | 'gp'>('co2');
  // null = still loading; [] = loaded and genuinely empty.
  const [leaders, setLeaders] = React.useState<LeaderRow[] | null>(null);

  const reload = React.useCallback(() => {
    getImpactLeaderboard(app.user?.id).then(setLeaders).catch(() => setLeaders([]));
    if (!app.user?.id) { setLoading(false); return; }
    getAllLogs(app.user.id).then(data => {
      setLogs(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [app.user?.id]);

  React.useEffect(() => { reload(); }, [reload]);

  // Refresh immediately when an action is logged from the modal
  React.useEffect(() => {
    window.addEventListener('honua:impact-logged', reload);
    return () => window.removeEventListener('honua:impact-logged', reload);
  }, [reload]);

  const totalCo2 = logs.reduce((s, l) => s + Number(l.co2_saved_kg ?? 0), 0);
  const verifiedCo2 = logs.filter(l => l.status === 'verified').reduce((s, l) => s + Number(l.co2_saved_kg ?? 0), 0);
  const pendingCount = logs.filter(l => l.status === 'pending').length;
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
          <KpiCard label="CO₂ avoided" value={totalCo2 >= 1000 ? (totalCo2 / 1000).toFixed(2) : Math.round(totalCo2).toString()} unit={totalCo2 >= 1000 ? 't' : 'kg'} delta={verifiedCo2 > 0 ? `✓ ${Math.round(verifiedCo2)} kg community-verified${pendingCount ? ` · ${pendingCount} pending` : ''}` : pendingCount ? `${pendingCount} action${pendingCount === 1 ? '' : 's'} awaiting vouches` : isVerified ? '✓ Verified impact' : 'share actions to get them verified'} color="var(--green)" icon="leaf" big />
          <KpiCard label="Green points" value={formatCount(totalPts)} unit="GP" delta={`${logs.length} action${logs.length === 1 ? '' : 's'} logged`} color="var(--green-2)" icon="award" />
          <KpiCard label="Current streak" value={streak.toString()} unit={streak === 1 ? 'day' : 'days'} delta={streak >= 30 ? '30-day streak reached' : `${30 - streak} days to a 30-day streak`} color="var(--sky)" icon="flame" />
          <KpiCard label="Impact level" value={(Math.floor(totalPts / 200) + 1).toString()} unit="" delta={`${totalPts % 200} / 200 GP to next`} color="var(--sun)" icon="bolt" />
        </div>

        {/* Main chart + streak */}
        <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginBottom: 18 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{chartMode === 'co2' ? 'CO₂ ledger' : 'Green Points'}</h2>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{chartMode === 'co2' ? 'Daily avoided emissions' : 'Daily points earned (all categories)'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div className="pill-nav">
                  <button className={chartMode === 'co2' ? 'active' : ''} onClick={() => setChartMode('co2')}>CO₂</button>
                  <button className={chartMode === 'gp' ? 'active' : ''} onClick={() => setChartMode('gp')}>GP</button>
                </div>
                <div className="pill-nav">
                  {([7, 30, 90] as const).map(d => (
                    <button key={d} className={chartDays === d ? 'active' : ''} onClick={() => setChartDays(d)}>{d}d</button>
                  ))}
                </div>
              </div>
            </div>
            <BarChart data={chartData} mode={chartMode} />
            {(() => {
              // Legend lists exactly the categories present in view
              const present = new Set<string>();
              for (const day of chartData) {
                for (const c of CAT_ORDER) {
                  if ((chartMode === 'co2' ? day.byCatKg[c] : day.byCatGp[c]) > 0) present.add(c);
                }
              }
              const shown = CAT_ORDER.filter(c => present.has(c));
              return (
                <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
                  {shown.length === 0
                    ? <span>No actions in this range yet.</span>
                    : shown.map(c => <Legend key={c} color={CAT_COLORS[c]} label={c} />)}
                </div>
              );
            })()}
            {chartMode === 'co2' && (
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>Advocacy, education & cleanup earn Green Points but no CO₂ — switch to <b>GP</b> to see them.</div>
            )}
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
                {streak >= 30 ? '🎉 30 days in a row. Keep it going!' : streak > 0 ? 'Log something every day to keep it alive.' : 'Log an action today to start a streak.'}
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
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {log.logged_at ? timeAgo(log.logged_at) : ''} · {log.category}
                    {log.quantity != null && log.unit && <span>· {log.quantity} {log.unit}</span>}
                    {log.status === 'verified' && <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓ verified</span>}
                    {log.status === 'pending' && <span style={{ color: 'var(--sun)', fontWeight: 700 }}>{log.vouch_count ?? 0}/3 vouches</span>}
                  </div>
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
              <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Impact leaderboard</h2>
              <span className="chip">Community</span>
            </div>
            {leaders === null ? (
              <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>Loading the ranking…</div>
            ) : leaders.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
                No one has logged CO₂ yet. Log an action and you'll take the top spot.
              </div>
            ) : leaders.map((row, i) => {
              // A gap in rank means the viewer's row was appended from further
              // down the table — mark the jump instead of implying they're next.
              const gap = i > 0 && row.rank > leaders[i - 1].rank + 1;
              return (
                <React.Fragment key={row.userId}>
                  {gap && <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', fontSize: 12, padding: '2px 0' }}>⋯</div>}
                  <div
                    onClick={() => row.handle && onNav?.('profile', { handle: row.handle })}
                    className={row.handle ? 'row-hover' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: row.isYou ? 'var(--green-tint)' : 'transparent',
                      margin: row.isYou ? '0 -8px' : 0,
                      padding: row.isYou ? '10px 8px' : '10px 0',
                      borderRadius: row.isYou ? 10 : 0,
                      cursor: row.handle ? 'pointer' : 'default',
                    }}>
                    <span style={{ width: 22, fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{row.rank}</span>
                    <Avatar src={row.avatar ?? undefined} name={row.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                        {row.verified && <VerifiedTick size={12} />}
                        {row.isYou && <span style={{ color: 'var(--green)', fontSize: 11, flexShrink: 0 }}>(you)</span>}
                      </div>
                      {row.handle && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{row.handle}</div>}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>−{co2Label(row.co2)}</div>
                  </div>
                </React.Fragment>
              );
            })}
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

const round2 = (n: number) => Math.round(n * 100) / 100;

function ChartTooltip({ day, leftPct }: { day: DayBucket; leftPct: number }) {
  const cats = CAT_ORDER.filter(c => (day.byCatKg[c] ?? 0) > 0 || (day.byCatGp[c] ?? 0) > 0);
  const totalKg = Object.values(day.byCatKg).reduce((s, v) => s + v, 0);
  const totalGp = Object.values(day.byCatGp).reduce((s, v) => s + v, 0);
  const left = Math.min(86, Math.max(14, leftPct));
  return (
    <div style={{ position: 'absolute', top: 0, left: left + '%', transform: 'translate(-50%,-100%)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.16)', padding: '9px 11px', minWidth: 158, zIndex: 5, pointerEvents: 'none' }}>
      <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginBottom: 6 }}>{formatDateLabel(day.date)}</div>
      {cats.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>No actions logged</div>
      ) : cats.map(c => (
        <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[c], flexShrink: 0 }} />
          <span style={{ flex: 1, color: 'var(--ink-2)' }}>{c}</span>
          <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--ink)' }}>
            {(day.byCatKg[c] ?? 0) > 0 ? `${round2(day.byCatKg[c])} kg` : `+${day.byCatGp[c]} GP`}
          </span>
        </div>
      ))}
      {cats.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 5, paddingTop: 5, display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700 }}>
          <span>Total</span>
          <span style={{ fontFamily: 'JetBrains Mono' }}>{round2(totalKg)} kg · {totalGp} GP</span>
        </div>
      )}
    </div>
  );
}

export function BarChart({ data, mode = 'co2' }: { data?: DayBucket[]; mode?: 'co2' | 'gp' }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const chartData: DayBucket[] = data ?? [];
  const days = chartData.length || 30;
  const catsOf = (d: DayBucket) => (mode === 'co2' ? d.byCatKg : d.byCatGp);
  const totalOf = (d: DayBucket) => Object.values(catsOf(d)).reduce((s, v) => s + v, 0);

  const max = Math.max(...chartData.map(totalOf), mode === 'co2' ? 1 : 10);
  const barW = Math.max(6, Math.floor(560 / Math.max(days, 1)) - 2);
  const totalW = days * (barW + 2);
  const H = 180;

  const labelIdxs = days <= 7
    ? Array.from({ length: days }, (_, i) => i)
    : [0, Math.floor(days / 4), Math.floor(days / 2), Math.floor(3 * days / 4), days - 1];

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${totalW} 200`} width="100%" height="220" style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1="0" x2={totalW} y1={200 - p * H} y2={200 - p * H} stroke="var(--line)" strokeWidth="1" strokeDasharray={p === 0 ? '' : '2 4'} />
        ))}
        {chartData.map((d, i) => {
          const x = i * (barW + 2);
          const scale = H / max;
          const cats = catsOf(d);
          let y = 200;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: 'pointer' }}>
              {/* full-height transparent hover target */}
              <rect x={x - 1} y={20} width={barW + 2} height={H} fill={hover === i ? 'var(--bg-2)' : 'transparent'} opacity={0.6} />
              {CAT_ORDER.filter(c => (cats[c] ?? 0) > 0).map(c => {
                const h = cats[c] * scale;
                if (h < 0.4) return null;
                y -= h;
                return <rect key={c} x={x} y={y} width={barW} height={Math.max(0.6, h - 0.5)} fill={CAT_COLORS[c]} rx="1" />;
              })}
            </g>
          );
        })}
        {labelIdxs.map(i => (i < chartData.length ? (
          <text key={i} x={i * (barW + 2) + barW / 2} y="218" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle" fill="var(--ink-4)">
            {formatDateLabel(chartData[i].date)}
          </text>
        ) : null))}
      </svg>
      {hover != null && chartData[hover] && (
        <ChartTooltip day={chartData[hover]} leftPct={((hover + 0.5) / days) * 100} />
      )}
    </div>
  );
};
