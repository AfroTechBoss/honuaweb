"use client";
import React from "react";
import { Icon, Logo, Avatar, VerifiedTick, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { getNotifications, markAllRead } from "@/lib/notifications";

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
      <span style={{ minWidth: 56, textAlign: 'center', fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 14 }}>{value}{suffix}</span>
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
  const isDbProject = /^[0-9a-f-]{36}$/.test(String(data.id));
  const handleRsvp = () => {
    app.community.toggle('proj-' + data.id);
    // Real RSVP for DB projects — keeps going_count accurate for everyone
    if (isDbProject && app.user?.id) {
      import('@/lib/market').then(({ toggleRsvp }) => toggleRsvp(app.user.id, data.id, going)).catch(() => {});
    }
    app.toast(going ? { msg: 'RSVP cancelled', icon: 'close' } : { msg: "You're going!", sub: `${data.t} · ${data.when}`, kind: 'success', icon: 'check' });
  };
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
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="pin" size={14} /> {data.locationName || 'Near you'}</span>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
          Hosted by <strong>{data.host}</strong>. {data.description || 'Bring gloves and a refillable bottle — tools and refreshments provided. All skill levels welcome; this is a great first action if you\'re new to the neighborhood crew.'}
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
        <button className={going ? 'btn btn-ghost' : 'btn btn-green'} onClick={handleRsvp}>
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
            <div style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>May 19 · 4.2k reads</div>
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
  return { background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontFamily: 'JetBrains Mono', fontWeight: 600, color: active ? col : 'var(--ink-3)' };
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
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{data.brand.toUpperCase()}</div>
          <h2 className="font-display" style={{ margin: '6px 0 8px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{data.name}</h2>
          <span className="chip chip-green">{data.tag}</span>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12, fontFamily: 'JetBrains Mono' }}>★★★★★ 4.8 · 214 reviews</div>
          <p style={{ margin: '14px 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>Vouched by 38 people on Honua. Ships plastic-free and carbon-neutral. Repairable and backed by a 5-year warranty.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0' }}>
            <span style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Lora' }}>{data.price}</span>
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
  const [buying, setBuying] = React.useState(false);
  const unit = parseFloat(String(data.price).replace(/[^0-9.]/g, '')) || 20;

  const handleBuy = async () => {
    setBuying(true);
    try {
      // A retirement is only recordable against a credit that exists in the registry.
      // Without an id there is nothing to retire, so don't write a record or claim one.
      if (!data.id) {
        app.toast?.({ msg: 'This credit is no longer listed', kind: 'error', icon: 'leaf' });
        close();
        return;
      }
      if (app.user?.id) {
        const { purchaseCredit } = await import('@/lib/market');
        await purchaseCredit(app.user.id, { id: data.id, name: data.name }, qty, Math.round(unit * qty * 100));
        window.dispatchEvent(new Event('honua:offset-purchased'));
      }
      close();
      app.openModal('celebrate', { title: `Offset ${qty} t CO₂`, sub: `You retired ${qty} tonne${qty > 1 ? 's' : ''} via ${data.name}. Certificate added to your wallet.` });
    } finally { setBuying(false); }
  };
  return (
    <Modal onClose={close} width={560}>
      <ModalHead icon="leaf" title={data.name} sub={`${data.type} · ${data.region} · vintage ${data.vintage}`} onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <ImagePlaceholder label={`${data.region} ${data.type.toLowerCase()} project`} height={150} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '16px 0' }}>
          {[['VERIFIER', data.verifier], ['AVAILABLE', data.volume], ['SPOT PRICE', data.price + ' /t']].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3, fontFamily: 'JetBrains Mono' }}>{v}</div>
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
            <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>${(unit * qty).toFixed(2)}</div>
          </div>
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleBuy} disabled={buying}>
          {buying ? 'Processing…' : `Buy ${qty} t · $${(unit * qty).toFixed(2)}`}
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
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <ModalFoot>
        {joined && <button className="btn btn-ghost" onClick={() => { close(); app.openModal('celebrate', { title: 'Logged for today!', sub: `Your ${data.title} streak continues. Keep it going.` }); }}>Log today</button>}
        <button className={joined ? 'btn btn-ghost' : 'btn btn-green'} onClick={() => { app.challenge.toggle(data.id); app.toast(joined ? { msg: 'Left challenge', icon: 'close' } : { msg: 'Joined!', sub: data.title, kind: 'success', icon: 'flame' }); if (joined) close(); }}>
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
              <Avatar src={cu.avatar} name={cu.name} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><strong>{cu.name}</strong>{cu.verified && <VerifiedTick size={12} />} <span style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>· {t}</span></div>
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
        <div className="celebrate-pop" style={{ width: 96, height: 96, borderRadius: 26, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', border: '1px solid var(--green-3)' }}><Icon name="award" size={40} color="var(--green)" /></div>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--green)', letterSpacing: '.08em' }}>BADGE EARNED</div>
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
        <div className="celebrate-pop" style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--green-tint)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}><Icon name="check" size={44} color="var(--green)" stroke={2} /></div>
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
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', opacity: .85 }}>GREEN POINTS</div>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Lora' }}>1,240</div>
          </div>
          <div style={{ background: 'var(--ink-solid)', color: '#fff', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', opacity: .7 }}>IMPACT TOKENS</div>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Lora' }}>24 <span style={{ fontSize: 14, opacity: .6 }}>IT</span></div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', margin: '18px 0 6px', letterSpacing: '.05em' }}>RECENT TRANSACTIONS</div>
        {[['Renewable plan switch', '+200 GP', 'May 18'], ['Offset purchase · Mau Forest', '−4 IT', 'May 16'], ['Bike commute streak', '+24 GP', 'May 15'], ['Compost log', '+18 GP', 'May 14']].map(([t, a, d], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div><div style={{ fontSize: 13.5, fontWeight: 500 }}>{t}</div><div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{d}</div></div>
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 13, color: a.startsWith('+') ? 'var(--green)' : 'var(--clay)' }}>{a}</span>
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
              {it.sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{it.sub}</div>}
            </div>
            {it.right && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{it.right}</span>}
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
