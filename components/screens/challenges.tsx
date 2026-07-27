"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { Toggle, ModalFoot, MProject, MArticle, MProduct, MCredit, MChallenge, MDiscussion, MBadge, MCelebrate, MWallet, MList, MCommunityAbout } from "./desktop-misc";
import { KpiCard } from "./impact";
import { logImpact, TASK_IMPACTS } from "@/lib/impact";

// =============== Desktop Tasks / Challenges ===============
const TODAY_TASKS: [string, string][] = [
  ['Bike commute', '+24 GP'],
  ['Meatless meal', '+12 GP'],
  ['Compost food scraps', '+18 GP'],
  ['10 min education', '+50 GP'],
  ['Skip ride-share', '+30 GP'],
];

export function DesktopTasks({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [dbChallenges, setDbChallenges] = React.useState<any[]>([]);
  const [dbLoaded, setDbLoaded] = React.useState(false);
  const [loggedToday, setLoggedToday] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!app.user?.id) return;
    const todayStr = new Date().toISOString().substring(0, 10);
    import('@/lib/supabase').then(async ({ supabase }) => {
      const { data: todayLogs } = await supabase
        .from('impact_logs')
        .select('action')
        .eq('user_id', app.user.id)
        .gte('logged_at', todayStr);
      if (todayLogs) {
        setLoggedToday(new Set(todayLogs.map((l: any) => l.action)));
      }
    }).catch(() => {});
  }, [app.user?.id]);

  React.useEffect(() => {
    if (!app.user?.id) return;
    import('@/lib/supabase').then(async ({ supabase }) => {
      const [{ data: challs, error }, { data: joined }] = await Promise.all([
        supabase.from('challenges').select('id, title, description, category, days, reward, participant_count').order('participant_count', { ascending: false }),
        supabase.from('challenge_participants').select('challenge_id').eq('user_id', app.user.id),
      ]);
      if (!error && challs && challs.length > 0) {
        setDbChallenges(challs.map((c: any) => ({
          id: c.id, title: c.title, joined: `${(c.participant_count ?? 0).toLocaleString()}`,
          days: c.days, reward: c.reward ?? '', cat: c.category ?? 'General',
        })));
        setDbLoaded(true);
        if (joined) {
          const joinedSet = new Set(joined.map((j: any) => j.challenge_id));
          challs.forEach((c: any) => {
            if (joinedSet.has(c.id) && !app.challenge.has(c.id)) app.challenge.add(c.id);
          });
        }
      }
    }).catch(() => {});
  }, [app.user?.id]);

  const handleLogTask = async (taskName: string) => {
    if (loggedToday.has(taskName)) {
      app.toast({ msg: `${taskName} — already logged today ✓`, icon: 'check' });
      return;
    }
    const impact = TASK_IMPACTS[taskName] ?? { co2: 0.5, pts: 10, cat: 'General' };
    setLoggedToday(prev => new Set([...prev, taskName]));
    app.toast({ msg: `${taskName} logged!`, sub: `+${impact.pts} GP · −${impact.co2} kg CO₂`, kind: 'success', icon: 'check' });
    if (app.user?.id) {
      await logImpact({ user_id: app.user.id, action: taskName, category: impact.cat, co2_saved_kg: impact.co2, points: impact.pts });
    }
  };

  const handleToggleChallenge = async (c: any) => {
    const isJoined = app.challenge?.has(c.id);
    app.challenge.toggle(c.id);
    app.toast(isJoined ? { msg: 'Left challenge', icon: 'close' } : { msg: 'Joined!', sub: c.title, kind: 'success', icon: 'flame' });
    if (typeof c.id === 'string' && app.user?.id) {
      const { supabase } = await import('@/lib/supabase');
      if (isJoined) {
        await supabase.from('challenge_participants').delete().match({ challenge_id: c.id, user_id: app.user.id });
      } else {
        await supabase.from('challenge_participants').insert({ challenge_id: c.id, user_id: app.user.id });
      }
    }
  };

  const allChallenges = dbLoaded ? dbChallenges : MOCK.challenges.concat([
    { id: 5, title: "Repair, don't replace", joined: '6.2k', days: 30, reward: '180 GP', cat: 'Waste' },
    { id: 6, title: 'Library card month', joined: '15.4k', days: 30, reward: '90 GP', cat: 'Consume' },
  ]);

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="tasks" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>CHALLENGES · WEEK 19</div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em' }}>Small streaks. Big swings.</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>Pick a challenge, log daily, watch your numbers move. Community multipliers stack with personal streaks.</p>
          </div>
          <button className="btn btn-primary" onClick={() => app.openModal('createchallenge')}><Icon name="plus" size={14} /> Create challenge</button>
        </div>

        {/* Today's tasks */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 22, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Today · Thursday May 22</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{loggedToday.size} / {TODAY_TASKS.length} logged</span>
              <div style={{ width: 100, height: 6, background: 'var(--line)', borderRadius: 999 }}>
                <div style={{ width: (loggedToday.size / TODAY_TASKS.length * 100) + '%', height: '100%', background: 'var(--green)', borderRadius: 999 }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {TODAY_TASKS.map(([t, r], i) => {
              const done = loggedToday.has(t);
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { t: 'Bike-to-work week', sub: 'Day 4 of 7', p: 0.57, joined: '12.4k', reward: '+120 GP + Cyclist badge', col: 'var(--green)' },
            { t: '30-day plastic free', sub: 'Day 18 of 30', p: 0.6, joined: '38.2k', reward: '+50 GP /wk · 2× streak', col: 'var(--sky)' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: c.col, color: '#fff', display: 'grid', placeItems: 'center' }}>
                  <Icon name="flame" size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{c.t}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{c.sub} · {c.joined} joined</div>
                </div>
                <button className="btn btn-green" style={{ padding: '6px 12px', fontSize: 12 }} onClick={async () => {
                  app.openModal('celebrate', { title: 'Logged for today!', sub: `Your "${c.t}" streak continues — ${c.sub.toLowerCase()}. Keep it going.` });
                  if (app.user?.id) {
                    const cat = c.col === 'var(--green)' ? 'Transport' : 'Lifestyle';
                    await logImpact({ user_id: app.user.id, action: c.t, category: cat, co2_saved_kg: 1.5, points: 20 });
                  }
                }}>Log today</button>
              </div>
              <div style={{ height: 8, background: 'var(--line)', borderRadius: 999, marginBottom: 8 }}>
                <div style={{ width: (c.p * 100) + '%', height: '100%', background: c.col, borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Reward at finish: <strong style={{ color: 'var(--ink)' }}>{c.reward}</strong></div>
            </div>
          ))}
        </div>

        {/* Browse challenges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Browse all challenges</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="chip chip-green">Featured</span>
            <span className="chip">Energy</span>
            <span className="chip">Transport</span>
            <span className="chip">Food</span>
            <span className="chip">Waste</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {allChallenges.map(c => {
            const joined = app.challenge?.has(c.id);
            return (
            <div key={c.id} className="post-card" onClick={() => app.openModal('challenge', c)} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="chip chip-green">{c.cat}</span>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>{c.days}d</span>
              </div>
              <h3 style={{ margin: '12px 0 4px', fontSize: 15, fontWeight: 600 }}>{c.title}</h3>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{c.joined} joined · earn {c.reward}</div>
              <button className={joined ? 'btn btn-green' : 'btn btn-ghost'} onClick={(e) => { e.stopPropagation(); handleToggleChallenge(c); }} style={{ marginTop: 10, padding: '6px 12px', fontSize: 12 }}>{joined ? 'Joined ✓' : 'Join challenge'}</button>
            </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
