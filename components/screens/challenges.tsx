"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { Toggle, ModalFoot, MProject, MCredit, MChallenge, MCelebrate, MWallet, MList } from "./desktop-misc";
import { KpiCard } from "./impact";
import { logTaskImpact, taskImpact } from "@/lib/impact";
import { setChallengeJoined, startOfLocalDay, claimChallengeRewards, countLoggedDays } from "@/lib/challenges";

// =============== Desktop Tasks / Challenges ===============
const TODAY_TASKS: string[] = [
  'Bike commute', 'Meatless meal', 'Compost food scraps', '30 min of learning', 'Skip ride-share',
];

export function DesktopTasks({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [dbChallenges, setDbChallenges] = React.useState<any[]>([]);
  const [load, setLoad] = React.useState<'loading' | 'ready' | 'error'>('loading');
  // challenge id -> when this user joined it, for the "Day N of M" line
  const [joinedAt, setJoinedAt] = React.useState<Record<string, string>>({});
  const [loggedToday, setLoggedToday] = React.useState<Set<string>>(new Set());
  // Challenges this user has completed (and been paid for), and their logs
  // since the earliest join, for the progress bars.
  const [completed, setCompleted] = React.useState<Set<string>>(new Set());
  const [windowLogs, setWindowLogs] = React.useState<{ action: string; logged_at: string }[]>([]);

  const loadToday = React.useCallback(async () => {
    if (!app.user?.id) return;
    const { supabase } = await import('@/lib/supabase');
    const { data: todayLogs } = await supabase
      .from('impact_logs')
      .select('action')
      .eq('user_id', app.user.id)
      .gte('logged_at', startOfLocalDay());
    if (todayLogs) setLoggedToday(new Set(todayLogs.map((l: any) => l.action)));
  }, [app.user?.id]);

  React.useEffect(() => { loadToday(); }, [loadToday]);
  // Refresh after logging from the pre-filled modal
  React.useEffect(() => {
    window.addEventListener('honua:impact-logged', loadToday);
    return () => window.removeEventListener('honua:impact-logged', loadToday);
  }, [loadToday]);

  const loadChallenges = React.useCallback(() => {
    if (!app.user?.id) return;
    import('@/lib/supabase').then(async ({ supabase }) => {
      const base = 'id, title, description, category, days, participant_count';
      const [first, { data: joined }, { data: done }] = await Promise.all([
        supabase.from('challenges').select(`${base}, reward_points, required_logs`).order('participant_count', { ascending: false }),
        supabase.from('challenge_participants').select('challenge_id, joined_at').eq('user_id', app.user.id),
        supabase.from('challenge_completions').select('challenge_id').eq('user_id', app.user.id),
      ]);
      // Before migration 056 there are no reward columns, and nothing pays —
      // so no reward is shown rather than the old unpaid text.
      const { data: challs, error } = first.error
        ? await supabase.from('challenges').select(base).order('participant_count', { ascending: false })
        : first;
      if (error) { setLoad('error'); return; }
      setDbChallenges((challs ?? []).map((c: any) => {
        const pts = c.reward_points ?? 0;
        return {
          id: c.id, title: c.title, desc: c.description ?? '', joined: `${(c.participant_count ?? 0).toLocaleString()}`,
          days: c.days, need: c.required_logs ?? c.days, rewardPts: pts, reward: pts > 0 ? `${pts} GP` : '', cat: c.category ?? 'General',
        };
      }));
      setCompleted(new Set((done ?? []).map((d: any) => d.challenge_id)));
      setLoad('ready');
      if (joined) {
        setJoinedAt(Object.fromEntries(joined.map((j: any) => [j.challenge_id, j.joined_at])));
        const earliest = joined.reduce((m: string | null, j: any) => (!m || j.joined_at < m ? j.joined_at : m), null);
        if (earliest) {
          const { data: logs } = await supabase.from('impact_logs').select('action, logged_at')
            .eq('user_id', app.user.id).gte('logged_at', earliest).limit(2000);
          setWindowLogs(logs ?? []);
        } else setWindowLogs([]);
        const joinedSet = new Set(joined.map((j: any) => j.challenge_id));
        // Authoritative both ways — also drops the demo ids (1, 2) older
        // builds saved to this browser.
        const realIds = new Set((challs ?? []).map((c: any) => c.id));
        (challs ?? []).forEach((c: any) => {
          if (joinedSet.has(c.id)) app.challenge.add(c.id);
          else app.challenge.remove(c.id);
        });
        [1, 2].forEach(id => { if (!realIds.has(id)) app.challenge.remove(id); });
      }
    }).catch(() => setLoad('error'));
  }, [app.user?.id]);
  React.useEffect(() => { loadChallenges(); }, [loadChallenges]);

  // Pay out anything now complete. Serialised so the direct call after a log
  // and the honua:impact-logged listener can't both celebrate the same win.
  const claiming = React.useRef<Promise<any[]> | null>(null);
  const runClaim = React.useCallback(async () => {
    if (!app.user?.id) return [];
    if (claiming.current) await claiming.current.catch(() => {});
    const p = claimChallengeRewards();
    claiming.current = p;
    const won = await p;
    claiming.current = null;
    if (won.length) {
      const w = won[0];
      const extra = won.length > 1 ? ` (and ${won.length - 1} more)` : '';
      app.openModal('celebrate', {
        title: 'Challenge complete!',
        sub: w.points > 0 ? `"${w.title}"${extra} finished — +${won.reduce((n, x) => n + (x.points ?? 0), 0)} GP added to your impact.` : `"${w.title}"${extra} finished. Nice work.`,
      });
      loadChallenges();
    }
    return won;
  }, [app.user?.id, loadChallenges]);
  React.useEffect(() => { runClaim(); }, [app.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const onLogged = () => { runClaim(); loadChallenges(); };
    window.addEventListener('honua:impact-logged', onLogged);
    return () => window.removeEventListener('honua:impact-logged', onLogged);
  }, [runClaim, loadChallenges]);
  // Joining from the detail modal changes counts and "Day N" here too.
  React.useEffect(() => {
    window.addEventListener('honua:challenge-changed', loadChallenges);
    return () => window.removeEventListener('honua:challenge-changed', loadChallenges);
  }, [loadChallenges]);
  const [catFilter, setCatFilter] = React.useState('All');

  const handleLogTask = (taskName: string) => {
    if (loggedToday.has(taskName)) {
      app.toast({ msg: `${taskName} — already logged today ✓`, icon: 'check' });
      return;
    }
    // Open the log modal pre-filled — so you can just hit Log, or add a proof
    // photo + share it to the feed for community vouching.
    const im = taskImpact(taskName);
    app.openModal?.('logaction', { category: im.cat, quantity: im.quantity, description: taskName });
  };

  const handleToggleChallenge = async (c: any) => {
    if (!app.user?.id) return;
    const isJoined = app.challenge?.has(c.id);
    app.challenge.toggle(c.id);
    const { error } = await setChallengeJoined(app.user.id, c.id, !isJoined);
    if (error) {
      app.challenge.toggle(c.id);
      app.toast({ msg: isJoined ? 'Could not leave the challenge' : 'Could not join the challenge', kind: 'error', icon: 'close' });
      return;
    }
    app.toast(isJoined ? { msg: 'Left challenge', icon: 'close' } : { msg: 'Joined!', sub: c.title, kind: 'success', icon: 'flame' });
    loadChallenges();
  };

  // Daily log for a joined challenge, once per day like the task cards.
  const handleLogChallenge = async (c: any) => {
    if (!app.user?.id) return;
    if (loggedToday.has(c.title)) {
      app.toast({ msg: `${c.title} — already logged today ✓`, icon: 'check' });
      return;
    }
    const { error } = await logTaskImpact(app.user.id, c.title, c.cat);
    if (error) {
      app.toast({ msg: 'Could not log today', sub: error, kind: 'error', icon: 'close' });
      return;
    }
    const won = await runClaim();
    if (!won.length) {
      const left = Math.max(0, c.need - (c.done + 1));
      app.openModal('celebrate', {
        title: 'Logged for today!',
        sub: left > 0
          ? `"${c.title}" — ${c.done + 1} of ${c.need} days logged.${c.rewardPts ? ` ${left} to go for +${c.rewardPts} GP.` : ''}`
          : `"${c.title}" — day ${c.day} of ${c.days}. Keep it going.`,
      });
    }
    window.dispatchEvent(new Event('honua:impact-logged'));
  };

  const challengeCats = Array.from(new Set(dbChallenges.map(c => c.cat))).sort();
  const allChallenges = catFilter === 'All' ? dbChallenges : dbChallenges.filter(c => c.cat === catFilter);
  const activeChallenges = dbChallenges.filter(c => app.challenge?.has(c.id)).map((c, i) => {
    const since = joinedAt[c.id] ? new Date(joinedAt[c.id]).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - since) / 86_400_000);
    const day = Math.min(c.days, Math.max(1, elapsed + 1));
    const done = joinedAt[c.id] ? countLoggedDays(windowLogs, c.title, joinedAt[c.id], c.days) : 0;
    const isDone = completed.has(c.id);
    const ended = !isDone && elapsed >= c.days;
    return { ...c, day, done, isDone, ended, p: isDone ? 1 : Math.min(1, done / Math.max(1, c.need)), col: i % 2 ? 'var(--sky)' : 'var(--green)' };
  });

  const now = new Date();
  const todayLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  // ISO week number, for the page eyebrow
  const isoWeek = (() => {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dow);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  })();

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="tasks" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>CHALLENGES · WEEK {isoWeek}</div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em' }}>Small streaks. Big swings.</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>Pick a challenge, log daily, watch your numbers move.</p>
          </div>
          <button className="btn btn-primary" onClick={() => app.openModal('createchallenge')}><Icon name="plus" size={14} /> Create challenge</button>
        </div>

        {/* Today's tasks */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Today · {todayLabel}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{loggedToday.size} / {TODAY_TASKS.length} logged</span>
              <div style={{ width: 100, height: 6, background: 'var(--line)', borderRadius: 999 }}>
                <div style={{ width: (loggedToday.size / TODAY_TASKS.length * 100) + '%', height: '100%', background: 'var(--green)', borderRadius: 999 }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {TODAY_TASKS.map((t, i) => {
              const done = loggedToday.has(t);
              const im = taskImpact(t);
              const r = `${im.quantity} ${im.unit} · +${im.pts} GP`;
              const cardStyle: React.CSSProperties = {
                background: done ? 'var(--green-tint)' : 'var(--bg-2)',
                borderRadius: 12, padding: 14, cursor: 'pointer',
                border: done ? '1px solid var(--green-3)' : '1px dashed var(--line-2)',
              };
              const checkStyle: React.CSSProperties = {
                width: 24, height: 24, borderRadius: 8,
                background: done ? 'var(--green)' : 'transparent',
                border: done ? 'none' : '2px solid var(--line-2)',
                display: 'grid', placeItems: 'center', color: '#fff',
                marginBottom: 10,
              };
              return (
                <div key={i} onClick={() => handleLogTask(t)} style={cardStyle}>
                  <div style={checkStyle}>
                    {done && <Icon name="check" size={14} stroke={2.5} />}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{r}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active challenges */}
        <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 14px' }}>Active challenges</h2>
        {activeChallenges.length === 0 ? (
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px dashed var(--line-2)', padding: 20, marginBottom: 24, fontSize: 14, color: 'var(--ink-3)' }}>
            You haven&apos;t joined a challenge yet. Pick one below to start a streak.
          </div>
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
          {activeChallenges.map((c) => (
            <div key={c.id} style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: c.col, color: '#fff', display: 'grid', placeItems: 'center' }}>
                  <Icon name="flame" size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
                    {c.isDone ? 'Completed' : c.ended ? 'Ended' : `Day ${c.day} of ${c.days}`} · {c.joined} joined
                  </div>
                </div>
                {c.isDone
                  ? <span className="chip chip-green" style={{ fontSize: 12 }}><Icon name="award" size={12} /> Completed</span>
                  : c.ended ? null
                  : loggedToday.has(c.title)
                  ? <span className="chip chip-green" style={{ fontSize: 12 }}><Icon name="check" size={12} stroke={2.5} /> Logged today</span>
                  : <button className="btn btn-green" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleLogChallenge(c)}>Log today</button>}
              </div>
              <div style={{ height: 8, background: 'var(--line)', borderRadius: 999, marginBottom: 8 }}>
                <div style={{ width: (c.p * 100) + '%', height: '100%', background: c.col, borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {c.isDone
                  ? <>Finished{c.rewardPts ? <> · <strong style={{ color: 'var(--ink)' }}>+{c.rewardPts} GP</strong> earned</> : ''}</>
                  : c.ended
                  ? <>Window closed with {c.done} of {c.need} days logged.</>
                  : <>{c.done} of {c.need} days logged{c.rewardPts ? <> · <strong style={{ color: 'var(--ink)' }}>{c.reward}</strong> when you finish</> : ''}</>}
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Browse challenges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Browse all challenges</h2>
          {challengeCats.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {['All', ...challengeCats].map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} className={'chip ' + (catFilter === cat ? 'chip-green' : '')}
                  style={{ cursor: 'pointer', border: catFilter === cat ? 'none' : undefined }}>{cat}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {allChallenges.map(c => {
            const joined = app.challenge?.has(c.id);
            return (
            <div key={c.id} className="post-card" onClick={() => app.openModal('challenge', { ...c, completed: completed.has(c.id) })} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="chip chip-green">{c.cat}</span>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>{c.days}d</span>
              </div>
              <h3 style={{ margin: '12px 0 4px', fontSize: 15, fontWeight: 600 }}>{c.title}</h3>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{c.joined} joined{completed.has(c.id) ? ' · completed ✓' : c.reward ? ` · ${c.reward}` : ''}</div>
              <button className={joined ? 'btn btn-green' : 'btn btn-ghost'} onClick={(e) => { e.stopPropagation(); handleToggleChallenge(c); }} style={{ marginTop: 10, padding: '6px 12px', fontSize: 12 }}>{joined ? 'Joined ✓' : 'Join challenge'}</button>
            </div>
            );
          })}
        </div>
        {allChallenges.length === 0 && (
          <div style={{ padding: '28px 0', textAlign: 'center', fontSize: 14, color: 'var(--ink-3)' }}>
            {load === 'ready' && dbChallenges.length > 0 ? 'No challenges in this category.'
              : load === 'loading' ? 'Loading challenges…'
              : load === 'error' ? 'Challenges could not be loaded. Try again in a moment.'
              : 'No challenges yet. Start one with “Create challenge”.'}
          </div>
        )}
      </main>
    </div>
  );
};
