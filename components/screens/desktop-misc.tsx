"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";


// =============== Desktop Marketplace ===============
export function DesktopMarketplace({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="marketplace" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>MARKETPLACE</div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em' }}>Sustainable goods, vouched by humans.</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>Every product carries an impact label and a real review from someone on Honua.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => onNav?.('sell')} style={{ color: 'var(--green)', borderColor: 'var(--green-3)' }}><Icon name="bag" size={14} /> Sell on Honua</button>
            <button className="btn btn-ghost" onClick={() => app.openModal?.('list', { title: 'Your wishlist', icon: 'bookmark', sub: (app.state.wishlist.length || 'No') + ' saved items', items: app.state.wishlist.length ? app.state.wishlist.map(n => ({ icon: 'bag', title: n, sub: 'tap a product to add to cart' })) : [{ icon: 'bookmark', title: 'Nothing saved yet', sub: 'tap the bookmark on any product' }] })}><Icon name="bookmark" size={14} /> Wishlist</button>
            <button className="btn btn-primary" onClick={() => app.openModal?.('list', { title: 'Your cart', icon: 'cart', sub: app.cartCount + ' item' + (app.cartCount === 1 ? '' : 's'), items: app.cart.length ? app.cart.map(c => ({ icon: 'bag', title: c.name, right: c.price })) : [{ icon: 'cart', title: 'Cart is empty' }] })}><Icon name="bag" size={14} /> Cart · {app.cartCount}</button>
          </div>
        </div>

        {/* Feature banner */}
        <div style={{
          background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--line)',
          overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.3fr 1fr', marginBottom: 24,
        }}>
          <div style={{ padding: 28 }}>
            <span className="chip chip-green">Featured drop · 24h</span>
            <h2 className="font-display" style={{ margin: '12px 0 8px', fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>The repair kit. 92 tools, one foldable case.</h2>
            <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6 }}>By the Fix-it Collective. Every purchase funds a community repair café for a month.</p>
            <div style={{ display: 'flex', gap: 14, marginTop: 18, alignItems: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Bricolage Grotesque' }}>$84</span>
              <span style={{ fontSize: 14, color: 'var(--ink-3)', textDecoration: 'line-through' }}>$120</span>
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { app.addToCart({ name: 'The repair kit', price: '$84' }); app.toast?.({ msg: 'Added to cart', sub: 'The repair kit · $84', kind: 'success', icon: 'cart' }); }}>Add to cart</button>
            </div>
          </div>
          <ImagePlaceholder label="repair kit hero — folded leather case open with tools" height={280} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <MarketFilters />
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="chip">Made in EU</span>
            <span className="chip">Carbon-neg</span>
            <span className="chip">Repairable</span>
            <span className="chip">+ filter</span>
          </div>
        </div>

        {/* Product grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {MOCK.products.map((p, i) => {
            const wished = app.wishlist?.has(p.name);
            return (
            <div key={i} className="post-card" onClick={() => app.openModal?.('product', p)} style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ position: 'relative' }}>
                <ImagePlaceholder label={p.img} height={200} src={p.imgUrl} />
                <span className="chip chip-green" style={{ position: 'absolute', top: 10, left: 10 }}>{p.tag}</span>
                <button onClick={(e) => { e.stopPropagation(); app.wishlist.toggle(p.name); app.toast?.(wished ? { msg: 'Removed from wishlist', icon: 'bookmark' } : { msg: 'Saved to wishlist', kind: 'success', icon: 'bookmark' }); }} style={{
                  position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--surface)', border: '1px solid var(--line)', cursor: 'pointer',
                  display: 'grid', placeItems: 'center', color: wished ? 'var(--green)' : 'var(--ink-3)',
                }}><Icon name="bookmark" size={14} stroke={wished ? 2.4 : 1.75} /></button>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>{p.brand.toUpperCase()}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'Bricolage Grotesque' }}>{p.price}</span>
                  <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); app.addToCart({ name: p.name, price: p.price }); app.toast?.({ msg: 'Added to cart', sub: p.name, kind: 'success', icon: 'cart' }); }} style={{ padding: '5px 11px', fontSize: 12 }}>Add</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, fontFamily: 'Geist Mono' }}>★★★★★ 4.{7 + i % 3} · {120 + i * 14} reviews</div>
              </div>
            </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export function MarketFilters() {
  const [active, setActive] = React.useState('All');
  return (
    <div className="pill-nav">
      {['All', 'Home', 'Food', 'Style', 'Energy', 'Outdoors', 'Books'].map((t) => (
        <button key={t} className={active === t ? 'active' : ''} onClick={() => setActive(t)}>{t}</button>
      ))}
    </div>
  );
};

// =============== Desktop Messages ===============
export function DesktopMessages({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [sent, setSent] = React.useState<string[]>([]);
  const [draft, setDraft] = React.useState('');
  const send = () => { if (!draft.trim()) return; setSent(s => [...s, draft]); setDraft(''); };
  const convos: Array<[string, string, string, string, boolean, number]> = [
    ['sarah', 'Sarah Green', 'Wiring spec doc attached — let me know!', '2m', true, 2],
    ['marcus', 'Marcus Johnson', 'Got it — Saturday works for the compost drop', '14m', true, 0],
    ['greentech', 'GreenTech Solutions', 'Pre-print is live, link below 👇', '1h', false, 0],
    ['maya', 'Maya Patel', 'Mind if I borrow that planter pattern?', '3h', false, 0],
    ['okafor', 'Dr. Adaeze Okafor', 'Thanks for the intro! Setting up a call for Tue.', '1d', false, 0],
    ['can', 'Climate Action Network', 'Friday lineup looking strong 💪', '2d', false, 0],
  ];
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="messages" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 340, borderRight: '1px solid var(--line)', background: 'var(--surface)', overflow: 'auto' }} className="no-scrollbar">
          <div style={{ padding: '24px 20px 14px' }}>
            <h1 className="font-display" style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>Messages</h1>
            <div style={{ marginTop: 12, background: 'var(--bg-2)', borderRadius: 999, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Icon name="search" size={14} color="var(--ink-3)" />
              <input placeholder="Search messages" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }} />
            </div>
          </div>
          {convos.map(([k, n, m, t, on, unread]) => (
            <div key={k} className="row-hover" style={{
              padding: '12px 20px', display: 'flex', gap: 12, cursor: 'pointer',
              background: k === 'sarah' ? 'var(--green-tint)' : 'transparent',
            }}>
              <div style={{ position: 'relative' }}>
                <Avatar src={MOCK.users[k]?.avatar} name={n} size={44} />
                {on && <span style={{
                  position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%',
                  background: '#22c55e', border: '2px solid var(--surface)',
                }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ fontWeight: unread ? 600 : 500 }}>{n}</span>
                  <span style={{ color: 'var(--ink-3)', fontFamily: 'Geist Mono', fontSize: 11 }}>{t}</span>
                </div>
                <div style={{
                  fontSize: 12, color: unread ? 'var(--ink-2)' : 'var(--ink-3)',
                  marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: unread ? 500 : 400,
                }}>{m}</div>
              </div>
              {unread > 0 && <span style={{
                background: 'var(--green)', color: '#fff', padding: '0 7px', borderRadius: 10,
                fontSize: 10, fontFamily: 'Geist Mono', fontWeight: 600, alignSelf: 'center',
              }}>{unread}</span>}
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Avatar src={MOCK.users.sarah.avatar} name="Sarah Green" size={40} verified />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                Sarah Green
                <span style={{ background: 'var(--sky)', color: '#fff', width: 14, height: 14, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', fontSize: 9 }}>✓</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>active now · Portland, OR</div>
            </div>
            <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 13 }} onClick={() => onNav?.('profile', { handle: 'sarahgreen' })}>View profile</button>
          </div>
          <div style={{ flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DayLabel l="Today" />
            <Msg from="them">Hey! Saw your zero-waste post — really impressive.</Msg>
            <Msg from="them">Trying to do something similar at our co-op. Could you share what vendors you used?</Msg>
            <Msg from="me">Of course! Mostly local — I'll send the list.</Msg>
            <Msg from="me">Also worth grabbing our wiring spec doc, saves a ton of permit headache.</Msg>
            <Msg from="them" attach="Sunhill_wiring_v3.pdf · 2.4 MB">Amazing — please send it.</Msg>
            <Msg from="me">Just attached above. Holler if you want to hop on a call.</Msg>
            {sent.map((m, i) => <Msg key={i} from="me">{m}</Msg>)}
          </div>
          <div style={{
            padding: 16, background: 'var(--surface)', borderTop: '1px solid var(--line)',
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <button style={{ background: 'var(--bg-2)', border: 'none', borderRadius: 10, padding: 10, cursor: 'pointer' }}>
              <Icon name="plus" size={18} />
            </button>
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Message Sarah…" style={{
              flex: 1, background: 'var(--bg-2)', border: 'none', outline: 'none',
              padding: '11px 14px', borderRadius: 999, fontSize: 14, fontFamily: 'Geist',
            }} />
            <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={send}>Send</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export function DayLabel({ l }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0', color: 'var(--ink-4)' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      <span style={{ fontSize: 11, fontFamily: 'Geist Mono', letterSpacing: '.05em' }}>{l.toUpperCase()}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
};

export function Msg({ from, children, attach }: { from: string; children: React.ReactNode; attach?: string }) {
  const me = from === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '70%',
        background: me ? 'var(--green)' : 'var(--surface)',
        color: me ? '#fff' : 'var(--ink)',
        border: me ? 'none' : '1px solid var(--line)',
        padding: '10px 14px',
        borderRadius: me ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        fontSize: 14, lineHeight: 1.5,
      }}>
        {attach && (
          <div style={{
            background: me ? 'rgba(255,255,255,.15)' : 'var(--bg-2)',
            padding: '8px 10px', borderRadius: 8, marginBottom: 8,
            fontSize: 12, fontFamily: 'Geist Mono', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            📎 {attach}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

// =============== Desktop Notifications ===============
export function DesktopNotifications({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const items = [
    { type: 'like', who: 'sarah', what: 'liked your post about composting routes', t: '2m', new: true },
    { type: 'verified', what: 'Your action "Switched to renewable plan" was verified · +200 GP · −42 kg CO₂', t: '14m', new: true },
    { type: 'follow', who: 'okafor', what: 'started following you', t: '34m', new: true },
    { type: 'milestone', what: '🎉 You hit a 12-day streak. Keep going for the 30-day badge.', t: '1h', new: true },
    { type: 'comment', who: 'marcus', what: 'replied to your post: "Got it — Saturday works for the compost drop"', t: '2h' },
    { type: 'project', what: '"Prospect Park cleanup" you joined is happening Saturday at 9am.', t: '4h' },
    { type: 'community', who: 'maya', what: 'invited you to "Urban gardeners" community', t: '1d' },
    { type: 'level', what: 'You leveled up to Composter 🌱 — unlocked 4 new badges.', t: '2d' },
  ];
  const handle = (n) => {
    switch (n.type) {
      case 'like': case 'comment': return app.nav('post', { id: 1 });
      case 'follow': return app.nav('profile', { handle: MOCK.users[n.who]?.handle });
      case 'community': return app.nav('forum');
      case 'verified': return app.nav('impact');
      case 'project': return app.nav('map');
      case 'milestone': app.nav('tasks'); return app.openModal('celebrate', { emoji: '🔥', title: '12-day streak!', sub: "You're on fire. Hit 30 days for a 2× point multiplier — keep logging daily." });
      case 'level': app.nav('profile'); return app.openModal('badge', { emoji: '🌱', name: 'Composter', desc: 'Awarded for reaching Level 7 — you composted consistently and diverted ~18 kg from landfill.', perks: ['+200 Green Points', '2× streak multiplier for 7 days', 'Composter flair on your profile'] });
      default: return null;
    }
  };
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="notifications" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto', maxWidth: 760 }} className="no-scrollbar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h1 className="font-display" style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>Notifications</h1>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => app.toast?.({ msg: 'All caught up', sub: 'Marked all notifications as read.', icon: 'check' })}>Mark all read</button>
          </div>
          <NotifTabs />
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
            {items.map((n, i) => {
              const icon = { like: 'heart', verified: 'leaf', follow: 'user', milestone: 'flame', comment: 'comment', project: 'pin', community: 'users', level: 'award' }[n.type];
              const col = { like: 'var(--clay)', verified: 'var(--green)', follow: 'var(--sky)', milestone: 'var(--sun)', comment: 'var(--ink)', project: 'var(--green-2)', community: 'var(--sky)', level: 'var(--green)' }[n.type];
              const u = n.who && MOCK.users[n.who];
              return (
                <div key={i} className="row-hover" onClick={() => handle(n)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
                  borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--line)',
                  background: n.new ? 'var(--green-tint)' : 'transparent',
                  cursor: 'pointer',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: col + '18', color: col, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name={icon} size={16} stroke={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                      {u && <strong style={{ color: 'var(--ink)' }}>{u.name} </strong>}
                      {n.what}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono', marginTop: 4 }}>{n.t} ago</div>
                  </div>
                  {n.new && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', marginTop: 14 }} />}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ width: 320, padding: 24, overflow: 'auto' }} className="no-scrollbar">
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18 }}>
            <h3 className="font-display" style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Notification preferences</h3>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--ink-3)' }}>Stay focused on what matters.</p>
            <NotifPrefs />
          </div>
        </div>
      </main>
    </div>
  );
};

export function NotifTabs() {
  const [t, setT] = React.useState('All');
  return (
    <div className="pill-nav" style={{ marginBottom: 18 }}>
      {['All', 'Mentions', 'Verified impact', 'Projects', 'Community'].map(x => (
        <button key={x} className={t === x ? 'active' : ''} onClick={() => setT(x)}>{x}</button>
      ))}
    </div>
  );
};

export function NotifPrefs() {
  const [prefs, setPrefs] = React.useState({ 'Verified impact': true, 'Mentions & replies': true, 'New followers': true, 'Project invites': false, 'Daily digest': true });
  return (
    <>
      {Object.keys(prefs).map(l => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: 13 }}>{l}</span>
          <ToggleC on={prefs[l]} onChange={(v) => setPrefs(p => ({ ...p, [l]: v }))} />
        </div>
      ))}
    </>
  );
};

export function Toggle({ on }) {
  return (
    <span style={{
      width: 34, height: 20, borderRadius: 999, padding: 2,
      background: on ? 'var(--green)' : 'var(--line-2)',
      display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
      justifyContent: on ? 'flex-end' : 'flex-start',
      transition: 'background .15s',
    }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
    </span>
  );
};

// ====================================================================
// Content / detail modals  (referenced by ModalContent in desktop-rest)
// ====================================================================
export function QtyStepper({ value, set, min = 1, max = 99, suffix }: { value: number; set: React.Dispatch<React.SetStateAction<number>>; min?: number; max?: number; suffix?: string | number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
      <button onClick={() => set(Math.max(min, value - 1))} style={{ width: 36, height: 38, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', color: 'var(--ink-2)', display: 'grid', placeItems: 'center' }}><Icon name="minus" size={15} /></button>
      <span style={{ minWidth: 56, textAlign: 'center', fontFamily: 'Geist Mono', fontWeight: 600, fontSize: 14 }}>{value}{suffix}</span>
      <button onClick={() => set(Math.min(max, value + 1))} style={{ width: 36, height: 38, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', color: 'var(--ink-2)', display: 'grid', placeItems: 'center' }}><Icon name="plus" size={15} /></button>
    </div>
  );
};

export function ModalFoot({ children }) {
  return <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '18px 24px 22px', borderTop: '1px solid var(--line)', marginTop: 20 }}>{children}</div>;
};

export function Confetti() {
  const cols = ['#1f6f3f', '#2e9a5b', '#e6b450', '#1d6dc4', '#c4623a', '#c8e6cf'];
  return (
    <div className="confetti" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 20 }}>
      {Array.from({ length: 28 }).map((_, i) => (
        <i key={i} style={{ left: Math.random() * 100 + '%', background: cols[i % cols.length], animationDelay: (Math.random() * .5) + 's', transform: `rotate(${Math.random() * 360}deg)` }} />
      ))}
    </div>
  );
};

// --- Project detail (action map) ---
export function MProject({ data, close }) {
  const app = useApp();
  const going = app.community?.has('proj-' + data.id);
  return (
    <Modal onClose={close} width={560}>
      <div style={{ height: 180, position: 'relative', background: (data.color || 'var(--green)') }}>
        <ImagePlaceholder label={`${data.cat} project photo`} height={180} />
        <button onClick={close} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="close" size={16} /></button>
        <span className="chip chip-green" style={{ position: 'absolute', bottom: 14, left: 16 }}>{data.cat}</span>
      </div>
      <div style={{ padding: 22 }}>
        <h2 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{data.t}</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-3)' }}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="calendar" size={14} /> {data.when}</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="users" size={14} /> {data.going} going</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="pin" size={14} /> Brooklyn, NY</span>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
          Hosted by <strong>{data.host}</strong>. Bring gloves and a refillable bottle — tools and refreshments provided. All skill levels welcome; this is a great first action if you're new to the neighborhood crew.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: 14, background: 'var(--bg-2)', borderRadius: 12 }}>
          <div style={{ display: 'flex' }}>
            {[0, 1, 2, 3].map(i => <span key={i} style={{ width: 28, height: 28, borderRadius: '50%', marginLeft: i ? -8 : 0, background: ['var(--green)', 'var(--sky)', 'var(--sun)', 'var(--clay)'][i], border: '2px solid var(--surface)' }} />)}
          </div>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Marcus, Maya & {data.going - 2} others are going</span>
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={() => { app.toast({ msg: 'Link copied', sub: 'Project link copied to clipboard.', icon: 'share' }); }}><Icon name="share" size={14} /> Share</button>
        <button className="btn btn-ghost" onClick={() => { close(); app.nav('messages'); }}><Icon name="msg" size={14} /> Message host</button>
        <button className={going ? 'btn btn-ghost' : 'btn btn-green'} onClick={() => { app.community.toggle('proj-' + data.id); app.toast(going ? { msg: 'RSVP cancelled', icon: 'close' } : { msg: "You're going! 🎉", sub: `${data.t} · ${data.when}`, kind: 'success', icon: 'check' }); }}>
          {going ? 'Going ✓ — cancel' : "I'm going"}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Article reader (explore) ---
export function MArticle({ data, close }) {
  const app = useApp();
  const liked = app.like?.has('art-' + data.title);
  const saved = app.save?.has('art-' + data.title);
  return (
    <Modal onClose={close} width={640}>
      <div style={{ position: 'relative' }}>
        <ImagePlaceholder label={data.img || 'article hero'} height={240} />
        <button onClick={close} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="close" size={16} /></button>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span className="chip chip-green">{data.tag}</span>
          <span className="chip">12 min read</span>
        </div>
        <h1 className="font-display" style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{data.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <Avatar src={MOCK.users.okafor.avatar} name={data.author} size={36} />
          <div style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{data.author}</div>
            <div style={{ color: 'var(--ink-3)', fontFamily: 'Geist Mono', fontSize: 11 }}>May 19 · 4.2k reads</div>
          </div>
          <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 13 }} onClick={() => app.toast({ msg: `Following ${data.author}`, icon: 'user' })}>Follow</button>
        </div>
        {[
          'The model is deceptively simple: pool community capital, buy at wholesale, install with local labor, and route the savings back to members rather than shareholders.',
          'In the first 18 months the co-op connected 4,200 homes — beating the incumbent utility on price while keeping every dollar of margin inside the neighborhood. The waitlist now runs three years deep.',
          'What makes it replicable is the financing template, released open-source last month. Three more cities have already forked it, adapting the repayment schedule to local energy prices.',
        ].map((p, i) => <p key={i} style={{ margin: '0 0 14px', fontSize: 15.5, lineHeight: 1.7, color: 'var(--ink-2)', textWrap: 'pretty' }}>{p}</p>)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, paddingTop: 14, borderTop: '1px solid var(--line)', color: 'var(--ink-3)' }}>
          <button className="abtn" onClick={() => app.like.toggle('art-' + data.title)} style={abtn(liked, 'var(--clay)')}><Icon name="heart" size={18} /> {liked ? '341' : '340'}</button>
          <button className="abtn" onClick={() => app.toast({ msg: 'Comments', sub: 'Discussion thread would open here.', icon: 'comment' })} style={abtn(false)}><Icon name="comment" size={18} /> 28</button>
          <button className="abtn" onClick={() => { app.save.toggle('art-' + data.title); app.toast(saved ? { msg: 'Removed from bookmarks', icon: 'bookmark' } : { msg: 'Saved to bookmarks', kind: 'success', icon: 'bookmark' }); }} style={{ ...abtn(saved, 'var(--green)'), marginLeft: 'auto' }}><Icon name="bookmark" size={18} /></button>
          <button className="abtn" onClick={() => app.toast({ msg: 'Link copied', icon: 'share' })} style={abtn(false)}><Icon name="share" size={18} /></button>
        </div>
      </div>
    </Modal>
  );
};
function abtn(active, col = 'var(--green)') {
  return { background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontFamily: 'Geist Mono', fontWeight: 600, color: active ? col : 'var(--ink-3)' };
}

// --- Product detail (marketplace) ---
export function MProduct({ data, close }) {
  const app = useApp();
  const [qty, setQty] = React.useState(1);
  const wished = app.wishlist?.has(data.name);
  return (
    <Modal onClose={close} width={720}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <ImagePlaceholder label={data.img} height={400} src={data.imgUrl} />
        <div style={{ padding: 24, position: 'relative' }}>
          <button onClick={close} style={{ position: 'absolute', top: 18, right: 18, background: 'var(--bg-2)', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}><Icon name="close" size={16} /></button>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>{data.brand.toUpperCase()}</div>
          <h2 className="font-display" style={{ margin: '6px 0 8px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{data.name}</h2>
          <span className="chip chip-green">{data.tag}</span>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12, fontFamily: 'Geist Mono' }}>★★★★★ 4.8 · 214 reviews</div>
          <p style={{ margin: '14px 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>Vouched by 38 people on Honua. Ships plastic-free and carbon-neutral. Repairable and backed by a 5-year warranty.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0' }}>
            <span style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Bricolage Grotesque' }}>{data.price}</span>
            <QtyStepper value={qty} set={setQty} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { for (let i = 0; i < qty; i++) app.addToCart({ name: data.name, price: data.price }); app.toast({ msg: 'Added to cart', sub: `${qty} × ${data.name}`, kind: 'success', icon: 'cart' }); close(); }}>
              <Icon name="cart" size={15} /> Add {qty} to cart
            </button>
            <button className="btn btn-ghost" onClick={() => { app.wishlist.toggle(data.name); app.toast(wished ? { msg: 'Removed from wishlist', icon: 'bookmark' } : { msg: 'Saved to wishlist', kind: 'success', icon: 'bookmark' }); }} style={{ color: wished ? 'var(--green)' : undefined }}>
              <Icon name="bookmark" size={15} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// --- Carbon credit detail / buy ---
export function MCredit({ data, close }) {
  const app = useApp();
  const [qty, setQty] = React.useState(1);
  const unit = parseFloat(String(data.price).replace(/[^0-9.]/g, '')) || 20;
  return (
    <Modal onClose={close} width={560}>
      <ModalHead icon="leaf" title={data.name} sub={`${data.type} · ${data.region} · vintage ${data.vintage}`} onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <ImagePlaceholder label={`${data.region} ${data.type.toLowerCase()} project`} height={150} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '16px 0' }}>
          {[['VERIFIER', data.verifier], ['AVAILABLE', data.volume], ['SPOT PRICE', data.price + ' /t']].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3, fontFamily: 'Geist Mono' }}>{v}</div>
            </div>
          ))}
        </div>
        <span className="verified-impact">on-chain verified · {data.tag}</span>
        <p style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: '12px 0 0' }}>Each tonne is third-party audited and traceable to GPS-tagged plots. Retirement certificate issued to your wallet on purchase.</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, padding: 14, background: 'var(--green-tint)', borderRadius: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Tonnes of CO₂</div>
            <QtyStepper value={qty} set={setQty} suffix=" t" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Total</div>
            <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'Bricolage Grotesque', color: 'var(--green)' }}>${(unit * qty).toFixed(2)}</div>
          </div>
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.openModal('celebrate', { emoji: '🌳', title: `Offset ${qty} t CO₂`, sub: `You retired ${qty} tonne${qty > 1 ? 's' : ''} via ${data.name}. Certificate added to your wallet.` }); }}>
          Buy {qty} t · ${(unit * qty).toFixed(2)}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Challenge detail ---
export function MChallenge({ data, close }) {
  const app = useApp();
  const joined = app.challenge?.has(data.id);
  return (
    <Modal onClose={close} width={520}>
      <ModalHead icon="flame" iconColor="var(--clay)" title={data.title} sub={`${data.cat} · ${data.days}-day challenge · ${data.joined} joined`} onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>Log your progress each day to keep your streak alive. Community multipliers stack with your personal streak — finish to earn <strong>{data.reward}</strong>.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '16px 0' }}>
          {[['DURATION', data.days + ' days'], ['REWARD', data.reward], ['JOINED', data.joined]].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'Geist Mono', color: 'var(--ink-3)' }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <ModalFoot>
        {joined && <button className="btn btn-ghost" onClick={() => { close(); app.openModal('celebrate', { emoji: '🔥', title: 'Logged for today!', sub: `Your ${data.title} streak continues. Keep it going.` }); }}>Log today</button>}
        <button className={joined ? 'btn btn-ghost' : 'btn btn-green'} onClick={() => { app.challenge.toggle(data.id); app.toast(joined ? { msg: 'Left challenge', icon: 'close' } : { msg: 'Joined! 🔥', sub: data.title, kind: 'success', icon: 'flame' }); if (joined) close(); }}>
          {joined ? 'Joined ✓ — leave' : 'Join challenge'}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Forum discussion thread ---
export function MDiscussion({ data, close }) {
  const app = useApp();
  const u = MOCK.users[data.user] || MOCK.users.maya;
  const liked = app.like?.has('disc-' + data.title);
  return (
    <Modal onClose={close} width={620}>
      <ModalHead title={data.title} sub={`by @${u.handle} · ${data.time || '2h'} · ${data.replies || 12} replies`} onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-2)', margin: 0 }}>Sharing what worked for me this season — happy to answer questions in the thread. Photos and the full parts list are attached below. Would love feedback before I scale it up.</p>
        <div style={{ display: 'flex', gap: 20, margin: '16px 0', paddingBottom: 16, borderBottom: '1px solid var(--line)', color: 'var(--ink-3)' }}>
          <button onClick={() => app.like.toggle('disc-' + data.title)} style={abtn(liked, 'var(--clay)')}><Icon name="heart" size={17} /> {(data.replies || 12) * 3 + (liked ? 13 : 12)}</button>
          <button style={abtn(false)}><Icon name="comment" size={17} /> {data.replies || 12}</button>
          <button onClick={() => app.toast({ msg: 'Saved', icon: 'bookmark' })} style={{ ...abtn(false), marginLeft: 'auto' }}><Icon name="bookmark" size={17} /></button>
        </div>
        {[['sarah', 'This is great — the trap-crop trick saved my tomatoes last year.', '1h'], ['marcus', 'Bookmarking. Any idea how it holds up in zone 6?', '40m']].map(([k, c, t], i) => {
          const cu = MOCK.users[k];
          return (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
              <Avatar src={cu.avatar} name={cu.name} size={34} verified={cu.verified} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}><strong>{cu.name}</strong> <span style={{ color: 'var(--ink-3)', fontFamily: 'Geist Mono', fontSize: 11 }}>· {t}</span></div>
                <p style={{ margin: '3px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>{c}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '16px 24px 22px', alignItems: 'center' }}>
        <input className="fld" placeholder="Add a reply…" id="disc-reply" />
        <button className="btn btn-primary" onClick={() => { const el = document.getElementById('disc-reply') as HTMLInputElement | null; if (el) el.value = ''; app.toast({ msg: 'Reply posted', kind: 'success', icon: 'comment' }); }}>Reply</button>
      </div>
    </Modal>
  );
};

// --- Badge detail ---
export function MBadge({ data, close }) {
  return (
    <Modal onClose={close} width={440}>
      <div style={{ padding: '30px 26px 22px', textAlign: 'center', position: 'relative' }}>
        <button onClick={close} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-2)', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}><Icon name="close" size={16} /></button>
        <div className="celebrate-pop" style={{ width: 96, height: 96, borderRadius: 26, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', fontSize: 48, margin: '0 auto 16px', border: '1px solid var(--green-3)' }}>{data.emoji || '🏆'}</div>
        <div style={{ fontSize: 11, fontFamily: 'Geist Mono', color: 'var(--green)', letterSpacing: '.08em' }}>BADGE EARNED</div>
        <h2 className="font-display" style={{ margin: '6px 0 8px', fontSize: 24, fontWeight: 600 }}>{data.name || 'Composter'}</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-3)' }}>{data.desc || 'Awarded for composting food waste for 4 consecutive weeks. You diverted an estimated 18 kg from landfill.'}</p>
        <div style={{ textAlign: 'left', background: 'var(--bg-2)', borderRadius: 12, padding: 16, margin: '18px 0 0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>Perks unlocked</div>
          {(data.perks || ['+200 Green Points', '2× streak multiplier for 7 days', 'Composter flair on your profile']).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '5px 0', fontSize: 13.5, color: 'var(--ink-2)' }}>
              <span style={{ color: 'var(--green)' }}><Icon name="check" size={15} stroke={2.4} /></span> {p}
            </div>
          ))}
        </div>
      </div>
      <ModalFoot><button className="btn btn-green" onClick={close}>Nice!</button></ModalFoot>
    </Modal>
  );
};

// --- Celebration ---
export function MCelebrate({ data, close }) {
  return (
    <Modal onClose={close} width={420}>
      <div style={{ padding: '36px 28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <Confetti />
        <div className="celebrate-pop" style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--green-tint)', display: 'grid', placeItems: 'center', fontSize: 52, margin: '0 auto 18px' }}>{data.emoji || '🎉'}</div>
        <h2 className="font-display" style={{ margin: '0 0 8px', fontSize: 27, fontWeight: 600, letterSpacing: '-0.02em' }}>{data.title || 'Hurray!'}</h2>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-3)' }}>{data.sub}</p>
        <button className="btn btn-green" style={{ marginTop: 22, width: '100%', justifyContent: 'center' }} onClick={close}>Keep going →</button>
      </div>
    </Modal>
  );
};

// --- Wallet ---
export function MWallet({ close }) {
  const app = useApp();
  return (
    <Modal onClose={close} width={500}>
      <ModalHead icon="coin" iconColor="var(--sky)" title="Impact wallet" sub="Your verified-action rewards and carbon balance." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,#1f6f3f,#2e9a5b)', color: '#fff', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'Geist Mono', opacity: .85 }}>GREEN POINTS</div>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Bricolage Grotesque' }}>1,240</div>
          </div>
          <div style={{ background: 'var(--ink-solid)', color: '#fff', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'Geist Mono', opacity: .7 }}>IMPACT TOKENS</div>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Bricolage Grotesque' }}>24 <span style={{ fontSize: 14, opacity: .6 }}>IT</span></div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontFamily: 'Geist Mono', color: 'var(--ink-3)', margin: '18px 0 6px', letterSpacing: '.05em' }}>RECENT TRANSACTIONS</div>
        {[['Renewable plan switch', '+200 GP', 'May 18'], ['Offset purchase · Mau Forest', '−4 IT', 'May 16'], ['Bike commute streak', '+24 GP', 'May 15'], ['Compost log', '+18 GP', 'May 14']].map(([t, a, d], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div><div style={{ fontSize: 13.5, fontWeight: 500 }}>{t}</div><div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>{d}</div></div>
            <span style={{ fontFamily: 'Geist Mono', fontWeight: 600, fontSize: 13, color: a.startsWith('+') ? 'var(--green)' : 'var(--clay)' }}>{a}</span>
          </div>
        ))}
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={() => app.toast({ msg: 'Statement exported', kind: 'success', icon: 'download' })}>Export statement</button>
        <button className="btn btn-primary" onClick={() => app.toast({ msg: 'Top up', sub: 'Wallet funding would open here.', icon: 'coin' })}>Top up IT</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Generic list (see all) ---
export function MList({ data, close }) {
  return (
    <Modal onClose={close} width={520}>
      <ModalHead icon={data.icon || 'leaf'} title={data.title} sub={data.sub} onClose={close} />
      <div style={{ padding: '14px 24px 22px' }}>
        {data.items.map((it, i) => (
          <div key={i} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 10px', margin: '0 -10px', borderRadius: 10, borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-tint)', color: 'var(--green)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={it.icon || 'leaf'} size={17} stroke={2} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{it.title}</div>
              {it.sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>{it.sub}</div>}
            </div>
            {it.right && <span style={{ fontFamily: 'Geist Mono', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{it.right}</span>}
          </div>
        ))}
      </div>
    </Modal>
  );
};

// --- Community about ---
export function MCommunityAbout({ data, close }) {
  return (
    <Modal onClose={close} width={500}>
      <ModalHead title={'About ' + (data.name || 'Urban gardeners')} onClose={close} />
      <div style={{ padding: '16px 24px 22px' }}>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>For anyone growing food, herbs, or pollinator habitat in cities. Beginners welcome. Be kind, cite sources, and share your wins and failures alike.</p>
        <div style={{ display: 'flex', gap: 18, margin: '18px 0' }}>
          <Stat n="24.1k" l="Members" /><Stat n="312" l="Posts /wk" /><Stat n="2024" l="Founded" />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>Community guidelines</div>
        {['Stay on topic — urban growing & sustainability', 'No promotions without mod approval', 'Be generous with knowledge'].map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, padding: '5px 0', fontSize: 13.5, color: 'var(--ink-2)' }}><span style={{ color: 'var(--green)' }}><Icon name="check" size={15} stroke={2.2} /></span> {g}</div>
        ))}
      </div>
    </Modal>
  );
};

// =============== Desktop Auth (login / sign up) ===============
export function DesktopAuth({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [mode, setMode] = React.useState('signin'); // 'signin' | 'signup'
  const signup = mode === 'signup';
  const go = () => { app.toast?.({ msg: signup ? 'Welcome to Honua' : 'Signed in', sub: signup ? 'Account created (demo).' : 'Welcome back.', kind: 'success', icon: 'leaf' }); onNav?.(signup ? 'home' : 'home'); };
  const social = ['Continue with Google', 'Continue with Apple', 'Continue with Celo wallet'];
  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px', fontSize: 15, fontFamily: 'Geist', color: 'var(--ink)', outline: 'none', marginTop: 6 };
  const lab = { fontSize: 11, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em' };
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      {/* Brand panel */}
      <div style={{ flex: '1 1 0', minWidth: 0, position: 'relative', overflow: 'hidden', background: 'linear-gradient(150deg,#1f6f3f 0%,#2e9a5b 55%,#c8e6cf 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48 }} className="auth-brand">
        <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: .5 }}>
          <path d="M0 520 Q150 460 300 510 T600 480 L600 800 0 800Z" fill="rgba(255,255,255,.08)"/>
          <path d="M0 600 Q150 540 300 590 T600 560 L600 800 0 800Z" fill="rgba(255,255,255,.10)"/>
          <circle cx="470" cy="150" r="60" fill="rgba(255,255,255,.12)"/>
        </svg>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: '#fff', color: 'var(--green)', display: 'grid', placeItems: 'center', fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 19, letterSpacing: '-0.05em' }}>h</span>
          <span className="font-display" style={{ color: '#fff', fontWeight: 600, fontSize: 21 }}>honua</span>
        </div>
        <div style={{ position: 'relative', color: '#fff' }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(30px,3.4vw,46px)', fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.03em', margin: 0, maxWidth: '14ch' }}>The social network for people fixing the planet.</h1>
          <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
            {[['2.4M', 'members'], ['18.6M', 'actions logged'], ['142kt', 'CO₂ avoided']].map(([n, l]) => (
              <div key={l}>
                <div className="font-display" style={{ fontSize: 26, fontWeight: 600 }}>{n}</div>
                <div style={{ fontSize: 12, opacity: .85, fontFamily: 'Geist Mono' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(255,255,255,.8)', fontFamily: 'Geist Mono' }}>© 2026 honua coop</div>
      </div>

      {/* Form panel */}
      <div style={{ flex: '0 0 clamp(380px, 38%, 520px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px clamp(24px,4vw,56px)', overflow: 'auto' }} className="no-scrollbar">
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 className="font-display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{signup ? 'Create your account' : 'Welcome back'}</h2>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '6px 0 24px' }}>{signup ? 'Start logging real-world impact in minutes.' : 'Sign in to pick up where you left off.'}</p>

          <div onSubmit={e => e.preventDefault()}>
            {signup && (
              <div style={{ marginBottom: 14 }}>
                <label style={lab}>NAME</label>
                <input style={field} placeholder="Sarah Green" />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={lab}>EMAIL</label>
              <input style={field} defaultValue={signup ? '' : 'sarah@sunhill.coop'} placeholder="you@example.com" />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={lab}>PASSWORD</label>
              <input type="password" style={field} defaultValue="••••••••••" />
            </div>
            {!signup && <div style={{ textAlign: 'right', margin: '8px 0 4px' }}><span onClick={() => app.toast?.({ msg: 'Reset link sent', sub: 'Check your email (demo).', icon: 'msg' })} style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 600, cursor: 'pointer' }}>Forgot password?</span></div>}
            <button className="btn btn-primary" onClick={go} style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15, marginTop: 12 }}>{signup ? 'Create account' : 'Sign in'}</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-4)', margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, fontFamily: 'Geist Mono' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          {social.map(s => (
            <button key={s} className="btn btn-ghost" onClick={go} style={{ width: '100%', justifyContent: 'center', padding: '11px 16px', fontSize: 14, marginBottom: 8 }}>{s}</button>
          ))}

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', marginTop: 20 }}>
            {signup ? 'Already have an account? ' : 'New to Honua? '}
            <span onClick={() => setMode(signup ? 'signin' : 'signup')} style={{ color: 'var(--green)', fontWeight: 600, cursor: 'pointer' }}>{signup ? 'Sign in' : 'Create an account'}</span>
          </p>
          <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 14, lineHeight: 1.5 }}>
            By continuing you agree to our <span onClick={() => app.toast?.({ msg: 'Opening…', sub: 'Support docs would open here.', icon: 'comment' })} style={{ color: 'var(--ink-3)', textDecoration: 'underline', cursor: 'pointer' }}>Terms &amp; privacy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
