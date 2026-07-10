"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { Toggle, ModalFoot, MProject, MArticle, MProduct, MCredit, MChallenge, MDiscussion, MBadge, MCelebrate, MWallet, MList, MCommunityAbout } from "./desktop-misc";
import { KpiCard } from "./impact";

// =============== Desktop Forum / Communities ===============
export function DesktopForum({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const joined = app.community?.has('Urban gardeners');
  const going = app.community?.has('seedling-swap');
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="forum" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Left: communities sidebar */}
        <div style={{ width: 260, borderRight: '1px solid var(--line)', background: 'var(--surface)', padding: '20px 16px', overflow: 'auto' }} className="no-scrollbar">
          <h2 className="font-display" style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 600 }}>Communities</h2>
          <div style={{ fontSize: 10, fontFamily: 'Geist Mono', color: 'var(--ink-3)', margin: '14px 0 8px', letterSpacing: '.05em' }}>YOUR COMMUNITIES</div>
          {['Urban gardeners', 'Solar DIY', 'Ocean cleanup crew'].map(n => (
            <button key={n} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px 10px', borderRadius: 8, background: n === 'Urban gardeners' ? 'var(--green-tint)' : 'transparent',
              border: 'none', color: n === 'Urban gardeners' ? 'var(--green)' : 'var(--ink-2)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 2,
            }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600 }}>{n.charAt(0)}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{n}</span>
            </button>
          ))}
          <div style={{ fontSize: 10, fontFamily: 'Geist Mono', color: 'var(--ink-3)', margin: '18px 0 8px', letterSpacing: '.05em' }}>DISCOVER</div>
          {MOCK.communities.slice(3).map(c => (
            <button key={c.name} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px 10px', borderRadius: 8, background: 'transparent',
              border: 'none', color: 'var(--ink-2)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: c.coverUrl ? `url(${c.coverUrl}) center/cover` : 'var(--bg-2)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, overflow: 'hidden' }}>{!c.coverUrl && c.name.charAt(0)}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{c.name}</span>
            </button>
          ))}
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 14, fontSize: 13 }} onClick={() => app.toast({ msg: 'New community', sub: 'Community creation form would open here.', icon: 'users' })}>
            <Icon name="plus" size={14} /> New community
          </button>
        </div>

        {/* Main: community feed */}
        <div style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
          {/* Cover */}
          <div style={{ height: 160, background: `url(${MOCK.communities[0].coverUrl}) center/cover`, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.15), rgba(0,0,0,.4))' }} />
          </div>
          <div style={{ padding: '0 28px', maxWidth: 900 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: -36, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 18, background: 'var(--green)',
                border: '6px solid var(--bg)', color: '#fff',
                display: 'grid', placeItems: 'center', fontSize: 34, fontFamily: 'Bricolage Grotesque', fontWeight: 600,
              }}>U</div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <h1 className="font-display" style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>Urban gardeners</h1>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>24.1k members · 12 active rn · founded 2024</div>
              </div>
              <button className="btn btn-ghost" style={{ marginBottom: 4 }} onClick={() => app.openModal('communityabout', { name: 'Urban gardeners' })}>About</button>
              <button className={joined ? 'btn btn-primary' : 'btn btn-green'} style={{ marginBottom: 4 }} onClick={() => { app.community.toggle('Urban gardeners'); app.toast(joined ? { msg: 'Left Urban gardeners', icon: 'users', action: { label: 'Undo', onClick: () => app.community.add('Urban gardeners') } } : { msg: 'Joined Urban gardeners', kind: 'success', icon: 'users' }); }}>{joined ? 'Joined ✓' : 'Join'}</button>
            </div>

            <div style={{ display: 'flex', gap: 6, margin: '18px 0', flexWrap: 'wrap' }}>
              {['#balcony', '#vertical-farm', '#pollinators', '#compost', '#tools'].map(t => (
                <span key={t} style={{ color: 'var(--sky)', fontSize: 13, fontWeight: 500 }}>{t}</span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, paddingBottom: 40 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <div className="pill-nav">
                    <button className="active">Recent</button>
                    <button>Top</button>
                    <button>Q&A</button>
                    <button>Resources</button>
                  </div>
                </div>

                {/* Posts */}
                {[
                  { title: 'Sharing my balcony irrigation schematic — feedback welcome', user: 'maya', time: '2h', replies: 24, kind: 'discussion' },
                  { title: 'PSA: Aphids love nasturtiums — use them as a trap crop', user: 'sarah', time: '5h', replies: 41, kind: 'tip' },
                  { title: 'Anyone in Brooklyn want to swap seedlings this weekend?', user: 'marcus', time: '8h', replies: 12, kind: 'meetup' },
                  { title: 'Soil test results came back — silty loam, what should I plant?', user: 'tara', time: '1d', replies: 18, kind: 'question' },
                  { title: 'Cherry tomato yield: 4.2 kg from 2 sq meters this season', user: 'okafor', time: '2d', replies: 78, kind: 'win' },
                ].map((p, i) => {
                  const u = MOCK.users[p.user];
                  const kindColor = { discussion: 'var(--sky)', tip: 'var(--green)', meetup: 'var(--sun)', question: 'var(--ink-2)', win: 'var(--green-2)' }[p.kind];
                  return (
                    <div key={i} className="row-hover" onClick={() => app.openModal('discussion', p)} style={{
                      background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)',
                      padding: 16, marginBottom: 10, display: 'flex', gap: 14, cursor: 'pointer',
                    }}>
                      <div style={{ width: 30, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Icon name="arrow" size={14} color="var(--ink-3)" />
                        <span style={{ fontSize: 12, fontFamily: 'Geist Mono', fontWeight: 600, margin: '4px 0' }}>{42 + i * 13}</span>
                        <Icon name="arrow" size={14} color="var(--ink-3)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            background: kindColor + '20', color: kindColor, padding: '2px 8px', borderRadius: 6,
                            fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 600, textTransform: 'uppercase',
                          }}>{p.kind}</span>
                          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>by @{u.handle} · {p.time}</span>
                        </div>
                        <h3 style={{ margin: '8px 0 4px', fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{p.title}</h3>
                        <div style={{ display: 'flex', gap: 18, marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="comment" size={13} /> {p.replies} replies</span>
                          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="heart" size={13} /> {p.replies * 3 + 12}</span>
                          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="bookmark" size={13} /></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 16, marginBottom: 12 }}>
                  <h3 className="font-display" style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>About</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                    For anyone growing food, herbs, or pollinator habitat in cities. Beginners welcome. Be kind.
                  </p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                    <Stat n="24.1k" l="Members" />
                    <Stat n="312" l="Posts /wk" />
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 16, marginBottom: 12 }}>
                  <h3 className="font-display" style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600 }}>Pinned resources</h3>
                  {['Starter guide for balcony growing', 'Tool library — borrow & lend', 'Soil testing — DIY', 'Pollinator-friendly plant list'].map((r, i) => (
                    <a key={i} onClick={() => app.toast({ msg: r, sub: 'Pinned resource would open here.', icon: 'bookmark' })} style={{ display: 'block', padding: '8px 0', fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
                      📎 {r}
                    </a>
                  ))}
                </div>
                <div style={{ background: 'var(--green)', color: '#fff', borderRadius: 14, padding: 16 }}>
                  <h3 className="font-display" style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Seedling swap · Saturday</h3>
                  <p style={{ margin: '0 0 12px', fontSize: 13, opacity: .9 }}>14 members already going. Bring 5+ to share.</p>
                  <button className="btn" style={{ background: '#fff', color: 'var(--green)', padding: '6px 12px', fontSize: 12 }} onClick={() => { app.community.toggle('seedling-swap'); app.toast(going ? { msg: 'RSVP cancelled', icon: 'close' } : { msg: "You're going! 🌱", sub: 'Seedling swap · Saturday', kind: 'success', icon: 'check' }); }}>{going ? 'Going ✓' : "I'm going →"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// =============== Desktop Tasks / Challenges ===============
export function DesktopTasks({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="tasks" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>CHALLENGES · WEEK 19</div>
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
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>3 / 5 logged</span>
              <div style={{ width: 100, height: 6, background: 'var(--line)', borderRadius: 999 }}>
                <div style={{ width: '60%', height: '100%', background: 'var(--green)', borderRadius: 999 }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              ['Bike commute', true, '+24 GP'],
              ['Meatless meal', true, '+12 GP'],
              ['Compost food scraps', true, '+18 GP'],
              ['10 min education', false, '+50 GP'],
              ['Skip ride-share', false, '+30 GP'],
            ].map(([t, done, r], i) => (
              <div key={i} onClick={() => app.toast(done ? { msg: `${t} — already logged ✓`, icon: 'check' } : { msg: `${t} logged · ${r}`, kind: 'success', icon: 'check' })} style={{
                background: done ? 'var(--green-tint)' : 'var(--bg-2)',
                borderRadius: 12, padding: 14, cursor: 'pointer',
                border: done ? '1px solid var(--green-3)' : '1px dashed var(--line-2)',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8,
                  background: done ? 'var(--green)' : 'transparent',
                  border: done ? 'none' : '2px solid var(--line-2)',
                  display: 'grid', placeItems: 'center', color: '#fff',
                  marginBottom: 10,
                }}>
                  {done && <Icon name="check" size={14} stroke={2.5} />}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono', marginTop: 4 }}>{r}</div>
              </div>
            ))}
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
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>{c.sub} · {c.joined} joined</div>
                </div>
                <button className="btn btn-green" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => app.openModal('celebrate', { emoji: '🔥', title: 'Logged for today!', sub: `Your "${c.t}" streak continues — ${c.sub.toLowerCase()}. Keep it going.` })}>Log today</button>
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
          {MOCK.challenges.concat([
            { id: 5, title: 'Repair, don\'t replace', joined: '6.2k', days: 30, reward: '180 GP', cat: 'Waste' },
            { id: 6, title: 'Library card month', joined: '15.4k', days: 30, reward: '90 GP', cat: 'Consume' },
          ]).map(c => {
            const joined = app.challenge?.has(c.id);
            return (
            <div key={c.id} className="post-card" onClick={() => app.openModal('challenge', c)} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="chip chip-green">{c.cat}</span>
                <span style={{ fontSize: 11, fontFamily: 'Geist Mono', color: 'var(--ink-3)' }}>{c.days}d</span>
              </div>
              <h3 style={{ margin: '12px 0 4px', fontSize: 15, fontWeight: 600 }}>{c.title}</h3>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>{c.joined} joined · earn {c.reward}</div>
              <button className={joined ? 'btn btn-green' : 'btn btn-ghost'} onClick={(e) => { e.stopPropagation(); app.challenge.toggle(c.id); app.toast(joined ? { msg: 'Left challenge', icon: 'close' } : { msg: 'Joined! 🔥', sub: c.title, kind: 'success', icon: 'flame' }); }} style={{ marginTop: 10, padding: '6px 12px', fontSize: 12 }}>{joined ? 'Joined ✓' : 'Join challenge'}</button>
            </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

// =============== Desktop Bookmarks ===============
export function DesktopBookmarks({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [coll, setColl] = React.useState('All bookmarks');
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="bookmarks" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>BOOKMARKS</div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em' }}>{coll === 'All bookmarks' ? 'Saved for later.' : coll}</h1>
          </div>
          <button className="btn btn-ghost" onClick={() => app.openModal('newcollection')}><Icon name="plus" size={14} /> New collection</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
          {/* Collections */}
          <div>
            <div style={{ fontSize: 10, fontFamily: 'Geist Mono', color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '.05em' }}>COLLECTIONS</div>
            {([
              ['All bookmarks', 84],
              ['Build out solar', 14],
              ['Read this week', 9],
              ['Recipes', 22],
              ['Policy reading', 18],
              ['Project ideas', 21],
            ] as Array<[string, number]>).map(([n, c]) => {
              const active = coll === n;
              return (
              <button key={n} onClick={() => setColl(n)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: active ? 'var(--green-tint)' : 'transparent', border: 'none',
                color: active ? 'var(--green)' : 'var(--ink-2)',
                fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer', marginBottom: 2,
              }}>
                <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                  <Icon name="bookmark" size={15} /> {n}
                </span>
                <span style={{ fontFamily: 'Geist Mono', fontSize: 11, color: 'var(--ink-3)' }}>{c}</span>
              </button>
              );
            })}
          </div>

          {/* Grid */}
          <div>
            <BookmarkTabs />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {(coll === 'Recipes' ? MOCK.posts.slice(1, 3) : coll === 'Read this week' ? MOCK.posts.slice(2, 4) : coll === 'Build out solar' ? MOCK.posts.slice(0, 1) : MOCK.posts.slice(0, 4)).map(p => <PostCard key={p.id} post={p} dense />)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export function BookmarkTabs() {
  const [t, setT] = React.useState('All');
  return (
    <div className="pill-nav" style={{ marginBottom: 14 }}>
      {['All', 'Posts', 'Articles', 'Products', 'People'].map(x => <button key={x} className={t === x ? 'active' : ''} onClick={() => setT(x)}>{x}</button>)}
    </div>
  );
};

// =============== Desktop Settings ===============
export function DesktopSettings({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [sec, setSec] = React.useState('Account');
  const nav = [
    ['Account', 'user'], ['Profile', 'user'], ['Privacy', 'lock'], ['Notifications', 'bell'],
    ['Impact tracking', 'leaf'], ['Wallet & rewards', 'sparkles'], ['Appearance', 'sparkles'],
    ['Connected apps', 'bolt'], ['Help & support', 'comment'],
  ];
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="settings" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 240, borderRight: '1px solid var(--line)', background: 'var(--surface)', padding: '24px 16px', overflow: 'auto' }} className="no-scrollbar">
          <h2 className="font-display" style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 600 }}>Settings</h2>
          {nav.map(([l, i]) => {
            const a = sec === l;
            return (
              <button key={l} onClick={() => setSec(l)} style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '10px 12px', borderRadius: 10,
                background: a ? 'var(--green-tint)' : 'transparent', border: 'none',
                color: a ? 'var(--green)' : 'var(--ink-2)',
                fontSize: 13, fontWeight: a ? 600 : 500, cursor: 'pointer', marginBottom: 2,
              }}>
                <Icon name={i} size={16} /> {l}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto', maxWidth: 720 }} className="no-scrollbar">
          <SettingsSection sec={sec} app={app} onNav={onNav} />
        </div>
      </main>
    </div>
  );
};

export function SettingsSection({ sec, app, onNav }) {
  const head = {
    'Account': 'Manage your sign-in, identity, and verified-impact wallet.',
    'Profile': 'Control how you appear to the community.',
    'Privacy': 'Decide who can see and reach you.',
    'Notifications': 'Choose what reaches you, and how.',
    'Impact tracking': 'Connect data sources so your actions get verified automatically.',
    'Wallet & rewards': 'Your Green Points, Impact Tokens and on-chain rewards.',
    'Appearance': 'Make Honua yours.',
    'Connected apps': 'Apps and services linked to your account.',
    'Help & support': 'Guides, contact, and account tools.',
  }[sec];
  return (
    <>
      <h1 className="font-display" style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{sec}</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--ink-3)', fontSize: 14 }}>{head}</p>

      {sec === 'Account' && <>
        <Section title="Identity">
          <Field label="Display name" v="Sarah Green" />
          <Field label="Username" v="@sarahgreen" />
          <Field label="Email" v="sarah@sunhill.coop" />
          <Field label="Bio" v="Community solar organizer in Cascadia." multiline />
        </Section>
        <Section title="Security">
          <ToggleC2 label="Two-factor authentication" sub="Recommended for active organizers." def />
          <ToggleC2 label="Login alerts" sub="Get notified when a new device signs in." def />
          <ToggleC2 label="Hide my email from search" />
        </Section>
        <Section title="Danger zone">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => app.logout?.()}>
              <Icon name="bolt" size={14} /> Sign out
            </button>
            <button className="btn btn-ghost" style={{ color: 'var(--clay)', borderColor: 'var(--clay)' }} onClick={() => app.openModal('deleteaccount')}>
              <Icon name="trash" size={14} /> Delete account
            </button>
          </div>
        </Section>
      </>}

      {sec === 'Profile' && <>
        <Section title="Public profile">
          <Field label="Display name" v="Sarah Green" />
          <Field label="Username" v="@sarahgreen" />
          <Field label="Bio" v="Community solar organizer in Cascadia." multiline />
          <Field label="Location" v="Portland, OR" />
        </Section>
        <button className="btn btn-green" onClick={() => app.openModal('editprofile')}><Icon name="edit" size={14} /> Edit profile</button>
      </>}

      {sec === 'Privacy' && (
        <Section title="Visibility">
          <ToggleC2 label="Private account" sub="Only approved followers see your posts." />
          <ToggleC2 label="Show my location on posts" def />
          <ToggleC2 label="Show activity status" sub="Let others see when you're active." def />
          <ToggleC2 label="Allow tips from anyone" def />
          <ToggleC2 label="Who can message me — everyone" sub="Off limits it to people you follow." def />
        </Section>
      )}

      {sec === 'Notifications' && (
        <Section title="Push & email">
          <NotifPrefs />
        </Section>
      )}

      {sec === 'Impact tracking' && (
        <Section title="Connected sources" sub="The more you connect, the more actions verify automatically.">
          {([['Utility provider', 'Pull energy use to verify savings', false], ['Transit / maps', 'Auto-detect low-carbon trips', true], ['Banking (Plaid)', 'Spot sustainable purchases', false]] as Array<[string, string, boolean]>).map(([t, s, on]) => (
            <div key={String(t)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--line)' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div><div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s}</div></div>
              <button className={on ? 'btn btn-ghost' : 'btn btn-primary'} style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => app.toast({ msg: on ? 'Disconnected' : 'Connected', sub: t, kind: on ? undefined : 'success', icon: 'bolt' })}>{on ? 'Connected ✓' : 'Connect'}</button>
            </div>
          ))}
        </Section>
      )}

      {sec === 'Wallet & rewards' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <KpiCard label="Green Points" value="1,240" unit="GP" delta="this month" color="var(--green)" icon="sparkles" />
          <KpiCard label="Impact Tokens" value="24" unit="IT" delta="lifetime" color="var(--sky)" icon="leaf" />
          <KpiCard label="Honua Gov" value="0" unit="HONUA" delta="not earned yet" color="var(--ink-3)" icon="award" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => app.openModal('wallet')}>Open wallet</button>
          <button className="btn btn-ghost" onClick={() => app.toast({ msg: 'Connecting wallet…', sub: 'Celo wallet connection (demo).', icon: 'coin' })}>Connect Celo wallet</button>
        </div>
      </>}

      {sec === 'Appearance' && (
        <Section title="Theme">
          <div style={{ display: 'flex', gap: 12 }}>
            {([['Light', false], ['Dark', true]] as Array<[string, boolean]>).map(([l, d]) => (
              <button key={l} onClick={() => { if (!!app.state.dark !== d) app.toggleDark(); }} className={'opt-row ' + (!!app.state.dark === d ? 'sel' : '')} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, width: 160 }}>
                <div style={{ width: '100%', height: 56, borderRadius: 8, background: d ? '#161a17' : '#fafaf7', border: '1px solid var(--line)' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {sec === 'Connected apps' && (
        <Section title="Linked services">
          {([['Strava', 'Bike & run trips', true], ['Google Calendar', 'Sync project events', true], ['Slack', 'Community alerts', false]] as Array<[string, string, boolean]>).map(([t, s, on]) => (
            <div key={String(t)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--line)' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div><div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s}</div></div>
              <button className={on ? 'btn btn-ghost' : 'btn btn-primary'} style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => app.toast({ msg: on ? 'Disconnected ' + t : 'Connected ' + t, kind: on ? undefined : 'success', icon: 'bolt' })}>{on ? 'Disconnect' : 'Connect'}</button>
            </div>
          ))}
        </Section>
      )}

      {sec === 'Help & support' && (
        <Section title="Get help">
          {[['Help center', 'comment', 'Help Center.html'], ['Contact support', 'msg', 'Contact Support.html'], ['Community guidelines', 'users', 'Community Guidelines.html'], ['Report a problem', 'bolt', 'Report a Problem.html'], ['Terms & privacy', 'lock', 'Terms & Privacy.html']].map(([t, ic, file]) => (
            <button key={t} onClick={() => { app.toast?.({ msg: 'Opening…', sub: 'Support docs would open here.', icon: 'comment' }); app.toast({ msg: t, sub: 'Opened in a new tab.', icon: ic }); }} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 10px', margin: '0 -10px', border: 'none', borderTop: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)', fontFamily: 'Geist', textAlign: 'left' }}>
              <Icon name={ic} size={16} color="var(--ink-3)" /> <span style={{ flex: 1 }}>{t}</span> <Icon name="arrow" size={15} color="var(--ink-4)" />
            </button>
          ))}
        </Section>
      )}
    </>
  );
};

// controlled toggle row for settings
export function ToggleC2({ label, sub, def }: { label: string; sub?: string; def?: boolean }) {
  const [on, setOn] = React.useState(!!def);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <div><div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>{sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}</div>
      <ToggleC on={on} onChange={setOn} />
    </div>
  );
};

export function Section({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
      <h2 className="font-display" style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>{title}</h2>
      {sub && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-3)' }}>{sub}</p>}
      {!sub && <div style={{ height: 14 }} />}
      {children}
    </div>
  );
};

export function Field({ label, v, multiline }: { label: string; v: React.ReactNode; multiline?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'flex-start', padding: '10px 0' }}>
      <label style={{ fontSize: 13, color: 'var(--ink-3)', paddingTop: 8 }}>{label}</label>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 10, padding: '8px 12px', fontSize: 14,
        minHeight: multiline ? 72 : 'auto',
      }}>{v}</div>
    </div>
  );
};

export function ToggleRow({ label, sub, on }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <Toggle on={on} />
    </div>
  );
};

// ====================================================================
// Form / action modals  +  ModalContent dispatcher
// ====================================================================

// --- Compose post ---
export function MCompose({ close }) {
  const app = useApp();
  const [text, setText] = React.useState('');
  const [cat, setCat] = React.useState('Energy');
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [publishing, setPublishing] = React.useState(false);
  const imgRef = React.useRef<HTMLInputElement>(null);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const publish = async () => {
    if (!text.trim() || !app.user?.id) return;
    setPublishing(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      let image_url: string | null = null;
      if (imageFile) {
        const { uploadFile } = await import('@/lib/storage');
        image_url = await uploadFile('posts', app.user.id, imageFile);
      }
      // Extract hashtags from text: words starting with #
      const tags = [...new Set((text.match(/#(\w+)/g) || []).map(t => t.slice(1)))];
      const { error } = await supabase.from('posts').insert({
        user_id: app.user.id,
        content: text.trim(),
        image_url,
        post_type: cat.toLowerCase(),
        tags,
      });
      if (error) throw error;
      app.toast?.({ kind: 'success', msg: 'Post published 🌱', sub: 'Your update is live on the feed.', icon: 'check' });
      close();
    } catch (err: any) {
      app.toast?.({ kind: 'error', msg: 'Failed to publish', sub: err.message, icon: 'bolt' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal onClose={close} width={560}>
      <ModalHead icon="pencil" title="New post" sub="Share an action, idea, or win with the community." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar src={app.user?.avatar} name={app.user?.name || 'You'} size={40} />
          <textarea className="fld" autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="What did you do for the planet today? Use #hashtags to tag topics." style={{ minHeight: 110 }} />
        </div>
        {imagePreview && (
          <div style={{ marginTop: 12, position: 'relative' }}>
            <img src={imagePreview} style={{ width: '100%', borderRadius: 10, maxHeight: 220, objectFit: 'cover' }} />
            <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff', fontSize: 14 }}>✕</button>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <span className="fld-label">Category</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Energy', 'Waste', 'Transport', 'Food', 'Nature', 'Policy'].map(c => (
              <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <button onClick={() => imgRef.current?.click()} style={{ background: imageFile ? 'var(--green-tint)' : 'transparent', border: 'none', borderRadius: 8, padding: 7, cursor: 'pointer', color: imageFile ? 'var(--green)' : 'var(--ink-3)' }}><Icon name="image" size={18} /></button>
          <input ref={imgRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close} disabled={publishing}>Cancel</button>
        <button className="btn btn-green" onClick={publish} disabled={!text.trim() || publishing} style={{ opacity: text.trim() ? 1 : .5 }}>
          {publishing ? 'Publishing…' : 'Post'}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Log an action ---
export function MLogAction({ close }) {
  const app = useApp();
  const opts = [['leaf', 'Transport', '+24 GP'], ['plant', 'Food', '+12 GP'], ['bolt', 'Energy', '+200 GP'], ['droplet', 'Water', '+80 GP'], ['repost', 'Waste', '+60 GP'], ['globe', 'Advocacy', '+40 GP']];
  const [sel, setSel] = React.useState(0);
  const [desc, setDesc] = React.useState('');
  return (
    <Modal onClose={close} width={540}>
      <ModalHead icon="plus" title="Log an action" sub="Record a sustainable action to earn points and grow your streak." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Category</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {opts.map(([ic, l, gp], i) => (
            <button key={l} onClick={() => setSel(i)} className={'opt-row ' + (sel === i ? 'sel' : '')} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ color: sel === i ? 'var(--green)' : 'var(--ink-3)' }}><Icon name={ic} size={18} stroke={2} /></span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span>
              <span style={{ fontSize: 11, fontFamily: 'Geist Mono', color: 'var(--green)' }}>{gp}</span>
            </button>
          ))}
        </div>
        <span className="fld-label">What did you do?</span>
        <input className="fld" autoFocus value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Biked to work instead of driving (8 km)" />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.openModal('celebrate', { emoji: '🌱', title: `Action logged · ${opts[sel][2]}`, sub: `Nice work. That's another entry in your verified impact ledger — streak now at 13 days.` }); }}>Log action</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Export report ---
export function MExport({ close }) {
  const app = useApp();
  const [fmt, setFmt] = React.useState('PDF');
  const [range, setRange] = React.useState('This month');
  return (
    <Modal onClose={close} width={460}>
      <ModalHead icon="download" iconColor="var(--sky)" title="Export impact report" sub="Download a verified summary of your impact." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Format</span>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['PDF', 'CSV', 'PNG card'].map(f => <button key={f} onClick={() => setFmt(f)} className={'chip ' + (fmt === f ? 'chip-green' : '')} style={{ cursor: 'pointer', border: fmt === f ? 'none' : undefined }}>{f}</button>)}
        </div>
        <span className="fld-label">Date range</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['This month', 'This year', 'All time'].map(r => <button key={r} onClick={() => setRange(r)} className={'chip ' + (range === r ? 'chip-green' : '')} style={{ cursor: 'pointer', border: range === r ? 'none' : undefined }}>{r}</button>)}
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { close(); app.toast({ kind: 'success', msg: `${fmt} report exported`, sub: `${range} · downloaded to your device.`, icon: 'download' }); }}>Export {fmt}</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Start a project ---
export function MStartProject({ close }) {
  const app = useApp();
  const [name, setName] = React.useState('');
  const [cat, setCat] = React.useState('Cleanup');
  return (
    <Modal onClose={close} width={540}>
      <ModalHead icon="pin" title="Start a project" sub="Rally your neighborhood around a local action." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Project name</span>
        <input className="fld" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Saturday creek cleanup" style={{ marginBottom: 14 }} />
        <span className="fld-label">Type</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['Cleanup', 'Garden', 'Energy', 'Repair', 'Policy', 'Waste'].map(c => <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><span className="fld-label">Date</span><input className="fld" type="text" placeholder="Sat, Jun 7 · 9am" /></div>
          <div><span className="fld-label">Location</span><input className="fld" type="text" placeholder="Brooklyn, NY" /></div>
        </div>
        <div style={{ marginTop: 14 }}><span className="fld-label">Description</span><textarea className="fld" placeholder="What will you do, what to bring…" /></div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.toast({ kind: 'success', msg: 'Project submitted', sub: 'It will appear on the map once verified (usually <1h).', icon: 'pin' }); }} disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : .5 }}>Create project</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Create challenge ---
export function MCreateChallenge({ close }) {
  const app = useApp();
  const [title, setTitle] = React.useState('');
  const [cat, setCat] = React.useState('Energy');
  const [days, setDays] = React.useState(30);
  return (
    <Modal onClose={close} width={520}>
      <ModalHead icon="flame" iconColor="var(--clay)" title="Create a challenge" sub="Design a streak the whole community can join." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Challenge title</span>
        <input className="fld" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Car-free fortnight" style={{ marginBottom: 14 }} />
        <span className="fld-label">Category</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['Energy', 'Transport', 'Food', 'Waste', 'Nature'].map(c => <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>)}
        </div>
        <span className="fld-label">Duration</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 14, 30].map(d => <button key={d} onClick={() => setDays(d)} className={'chip ' + (days === d ? 'chip-green' : '')} style={{ cursor: 'pointer', border: days === d ? 'none' : undefined }}>{d} days</button>)}
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.toast({ kind: 'success', msg: 'Challenge created 🔥', sub: `"${title}" is live — invite your community to join.`, icon: 'flame' }); }} disabled={!title.trim()} style={{ opacity: title.trim() ? 1 : .5 }}>Create</button>
      </ModalFoot>
    </Modal>
  );
};

// --- New collection ---
export function MNewCollection({ close }) {
  const app = useApp();
  const [name, setName] = React.useState('');
  return (
    <Modal onClose={close} width={440}>
      <ModalHead icon="bookmark" title="New collection" sub="Group your saved posts, articles and products." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Collection name</span>
        <input className="fld" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekend reading" />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.toast({ kind: 'success', msg: 'Collection created', sub: `"${name}" is ready for bookmarks.`, icon: 'bookmark' }); }} disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : .5 }}>Create</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Edit profile ---
export function MEditProfile({ close }) {
  const app = useApp();
  const userId = app.user?.id;

  const [fullName, setFullName] = React.useState(app.user?.name || '');
  const [bio, setBio] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [website, setWebsite] = React.useState('');

  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = React.useState<string | null>(null);
  const [currentCover, setCurrentCover] = React.useState<string | null>(null);
  const avatarRef = React.useRef<HTMLInputElement>(null);
  const coverRef = React.useRef<HTMLInputElement>(null);
  const [saving, setSaving] = React.useState(false);

  // Load current profile data
  React.useEffect(() => {
    if (!userId) return;
    import('@/lib/profile').then(({ getProfile }) => {
      getProfile(userId).then(p => {
        if (!p) return;
        setFullName(p.full_name || '');
        setBio(p.bio || '');
        setLocation(p.location || '');
        setWebsite(p.website || '');
        setCurrentAvatar(p.avatar_url || null);
        setCurrentCover(p.cover_url || null);
      }).catch(() => {});
    });
  }, [userId]);

  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { app.toast?.({ msg: 'Image too large', sub: 'Max 5 MB', kind: 'error', icon: 'bolt' }); return; }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const pickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { app.toast?.({ msg: 'Image too large', sub: 'Max 10 MB', kind: 'error', icon: 'bolt' }); return; }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { uploadFile } = await import('@/lib/storage');
      const { updateProfile } = await import('@/lib/profile');
      const updates: Record<string, any> = { full_name: fullName, bio, location, website };

      if (avatarFile) {
        updates.avatar_url = await uploadFile('avatars', userId, avatarFile);
        app.setState?.((s: any) => ({ ...s, user: { ...s.user, avatar: updates.avatar_url } }));
      }
      if (coverFile) {
        updates.cover_url = await uploadFile('covers', userId, coverFile);
      }

      await updateProfile(userId, updates);
      app.toast?.({ msg: 'Profile updated', kind: 'success', icon: 'check' });
      close();
      // Reload the page so profile reflects changes
      window.location.reload();
    } catch (err: any) {
      app.toast?.({ msg: 'Failed to save', sub: err.message, kind: 'error', icon: 'bolt' });
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = avatarPreview || currentAvatar;
  const coverSrc = coverPreview || currentCover;
  const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 13px', fontSize: 14, fontFamily: 'Geist', color: 'var(--ink)', outline: 'none' };
  const lab: React.CSSProperties = { fontSize: 11, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em', display: 'block', marginBottom: 5 };

  return (
    <Modal onClose={close} width={560}>
      <ModalHead icon="edit" title="Edit profile" sub="Update how you appear across Honua." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>

        {/* Cover photo */}
        <div style={{
          height: 110, borderRadius: 12, position: 'relative', marginBottom: 48, overflow: 'hidden',
          background: coverSrc ? `url(${coverSrc}) center/cover` : 'linear-gradient(135deg,#1f6f3f,#2e9a5b)',
        }}>
          <button onClick={() => coverRef.current?.click()} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
            {coverSrc ? 'Change cover' : '+ Add cover'}
          </button>
          <input ref={coverRef} type="file" accept="image/*" onChange={pickCover} style={{ display: 'none' }} />

          {/* Avatar */}
          <div style={{ position: 'absolute', bottom: -36, left: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, border: '4px solid var(--surface)', overflow: 'hidden', background: 'var(--green)', position: 'relative', cursor: 'pointer' }} onClick={() => avatarRef.current?.click()}>
              {avatarSrc
                ? <img src={avatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 28, color: '#fff', fontFamily: 'Bricolage Grotesque' }}>{fullName.charAt(0) || '?'}</div>
              }
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', opacity: 0, transition: 'opacity .15s' }} className="avatar-edit-overlay">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lab}>DISPLAY NAME</label>
            <input style={fld} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label style={lab}>LOCATION</label>
            <input style={fld} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lab}>BIO</label>
          <textarea style={{ ...fld, minHeight: 80, resize: 'vertical' }} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell your story…" />
        </div>
        <div style={{ marginBottom: 4 }}>
          <label style={lab}>WEBSITE</label>
          <input style={fld} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" />
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close} disabled={saving}>Cancel</button>
        <button className="btn btn-green" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Tip a user ---
export function MTip({ data, close }) {
  const app = useApp();
  const u = data.user || MOCK.users.sarah;
  const [amt, setAmt] = React.useState(5);
  return (
    <Modal onClose={close} width={440}>
      <ModalHead icon="gift" iconColor="var(--sun)" title={`Tip ${u.name}`} sub="Send Impact Tokens to support their work." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          {[5, 10, 25].map(a => (
            <button key={a} onClick={() => setAmt(a)} className={'opt-row ' + (amt === a ? 'sel' : '')} style={{ justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 600, fontFamily: 'Bricolage Grotesque' }}>{a}</span>
              <span style={{ fontSize: 11, fontFamily: 'Geist Mono', color: 'var(--ink-3)' }}>IT</span>
            </button>
          ))}
        </div>
        <input className="fld" type="number" value={amt} onChange={e => setAmt(Math.max(1, +e.target.value || 1))} />
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, fontFamily: 'Geist Mono' }}>Your balance: 24 IT</div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.openModal('celebrate', { emoji: '🎁', title: `Tipped ${amt} IT`, sub: `${u.name} will be notified of your support. Thank you for backing real impact.` }); }}>Send {amt} IT</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Auto-offset subscribe ---
export function MAutoOffset({ close }) {
  const app = useApp();
  return (
    <Modal onClose={close} width={480}>
      <ModalHead icon="leaf" title="Start auto-offset" sub="We match your tracked footprint with verified credits, every month." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ background: 'var(--green-tint)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 600, fontFamily: 'Bricolage Grotesque', color: 'var(--green)' }}>$14<span style={{ fontSize: 16 }}>/mo</span></div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>≈ 0.7 t CO₂ retired monthly</div>
        </div>
        <div style={{ marginTop: 16 }}>
          {['Auto-purchase from your chosen project mix', 'Pause or cancel anytime', 'Quarterly receipts emailed to you', 'Counts toward your verified impact'].map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, padding: '6px 0', fontSize: 13.5, color: 'var(--ink-2)' }}><span style={{ color: 'var(--green)' }}><Icon name="check" size={15} stroke={2.2} /></span> {b}</div>
          ))}
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Not now</button>
        <button className="btn btn-green" onClick={() => { close(); app.toast({ kind: 'success', msg: 'Auto-offset active 🌍', sub: '$14/mo · first credit retires Jun 1. Manage in Settings.', icon: 'leaf' }); }}>Subscribe · $14/mo</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Offset my year ---
export function MOffsetYear({ close }) {
  const app = useApp();
  return (
    <Modal onClose={close} width={480}>
      <ModalHead icon="globe" title="Offset your 2026 footprint" sub="Based on your tracked actions, here's your estimated remaining footprint." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'center', padding: '6px 0 14px' }}>
          <span style={{ fontSize: 46, fontWeight: 600, fontFamily: 'Bricolage Grotesque', color: 'var(--green)' }}>1.4 t</span>
          <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>CO₂ to offset</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}>
          <span style={{ color: 'var(--ink-3)' }}>1.4 t × $24.10 spot</span><span style={{ fontFamily: 'Geist Mono', fontWeight: 600 }}>$33.74</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 16, fontWeight: 600 }}>
          <span>Total</span><span style={{ fontFamily: 'Geist Mono', color: 'var(--green)' }}>$33.74</span>
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.openModal('celebrate', { emoji: '🌍', title: 'Year offset — you\'re net zero!', sub: '1.4 t CO₂ retired across your project mix. Certificate added to your wallet.' }); }}>Offset 1.4 t · $33.74</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Delete account (two-step) ---
export function MDeleteAccount({ close }) {
  const app = useApp();
  return (
    <Modal onClose={close} width={460}>
      <ModalHead icon="trash" iconColor="var(--clay)" title="Delete your account?" sub="This is permanent. Your posts, impact ledger, wallet balance and verified history will be erased." onClose={close} />
      <div style={{ padding: '6px 24px 0' }}>
        <div style={{ background: '#fbeae4', border: '1px solid #eccbbd', borderRadius: 12, padding: 14, fontSize: 13, color: '#8a3d1f' }}>
          You have <strong>24 IT</strong> and <strong>1,240 GP</strong> in your wallet. These cannot be recovered after deletion.
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Keep my account</button>
        <button className="btn" style={{ background: 'var(--clay)', color: '#fff' }} onClick={() => app.openModal('deleteaccount2')}>Yes, delete my account</button>
      </ModalFoot>
    </Modal>
  );
};

export function MDeleteAccount2({ close }) {
  const app = useApp();
  const [v, setV] = React.useState('');
  const ok = v.trim().toLowerCase() === 'delete my account';
  return (
    <Modal onClose={close} width={460}>
      <ModalHead icon="trash" iconColor="var(--clay)" title="Final confirmation" sub="To confirm, type “delete my account” below." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <input className="fld" autoFocus value={v} onChange={e => setV(e.target.value)} placeholder="delete my account" style={{ borderColor: ok ? 'var(--clay)' : undefined }} />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn" disabled={!ok} style={{ background: ok ? 'var(--clay)' : 'var(--line-2)', color: '#fff', opacity: ok ? 1 : .7, cursor: ok ? 'pointer' : 'not-allowed' }} onClick={() => { close(); app.toast({ kind: 'error', msg: 'Account deleted', sub: 'Your account has been permanently removed (demo).', icon: 'trash', duration: 6000 }); app.nav('home'); }}>Delete forever</button>
      </ModalFoot>
    </Modal>
  );
};

// =============== Dispatcher ===============
export function ModalContent({ type, data, close }) {
  const map = {
    compose: MCompose, logaction: MLogAction, export: MExport, startproject: MStartProject,
    createchallenge: MCreateChallenge, newcollection: MNewCollection, editprofile: MEditProfile,
    tip: MTip, autooffset: MAutoOffset, offsetyear: MOffsetYear,
    deleteaccount: MDeleteAccount, deleteaccount2: MDeleteAccount2,
    project: MProject, article: MArticle, product: MProduct, credit: MCredit,
    challenge: MChallenge, discussion: MDiscussion, badge: MBadge, celebrate: MCelebrate,
    wallet: MWallet, list: MList, communityabout: MCommunityAbout,
  };
  const C = map[type];
  if (!C) return null;
  return <C data={data} close={close} />;
};


export function ModalRoot() {
  const { modal, closeModal } = useApp();
  if (!modal) return null;
  return <ModalContent type={modal.type} data={modal.data || {}} close={closeModal} />;
}
