"use client";
import React from "react";
import { Icon, Logo, Avatar, VerifiedTick, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, useApp, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { getNotifications, markAllRead } from "@/lib/notifications";
import { CarbonPayment } from "@/components/carbon-payment";
import { PhotoViewer } from "@/components/photo-viewer";
import type { Retirement } from "@/lib/market";

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
// The number is a text field: typing is how you enter 1,000; the buttons only
// nudge by one. The draft is kept as text so the field can be emptied while
// typing; a number above max snaps to max as you type, and anything below min
// is corrected on blur / Enter.
export function QtyStepper({ value, set, min = 1, max = 99, suffix }: { value: number; set: React.Dispatch<React.SetStateAction<number>>; min?: number; max?: number; suffix?: string | number }) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => { setDraft(String(value)); }, [value]);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.floor(n)));
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.replace(/[^0-9]/g, '');
    setDraft(text);
    const n = parseInt(text, 10);
    if (n > max) { set(max); setDraft(String(max)); }
    else if (n >= min) set(n);
  };
  const commit = () => {
    const n = parseInt(draft, 10);
    const next = Number.isFinite(n) ? clamp(n) : value;
    set(next);
    setDraft(String(next));
  };
  const btn: React.CSSProperties = { width: 36, height: 38, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', color: 'var(--ink-2)', display: 'grid', placeItems: 'center' };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => set(Math.max(min, value - 1))} style={{ ...btn, opacity: value <= min ? .45 : 1 }}><Icon name="minus" size={15} /></button>
      <label style={{ minWidth: 56, padding: '0 8px', display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center', cursor: 'text', fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 14 }}>
        <input
          type="text" inputMode="numeric" pattern="[0-9]*" aria-label="Quantity"
          value={draft} onChange={onChange} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          onFocus={e => e.currentTarget.select()}
          style={{ width: `${Math.max(2, draft.length) + 0.5}ch`, border: 'none', outline: 'none', background: 'transparent', textAlign: 'center', font: 'inherit', color: 'inherit', padding: 0 }}
        />
        {suffix != null && <span style={{ marginLeft: 4 }}>{String(suffix).trim()}</span>}
      </label>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => set(Math.min(max, value + 1))} style={{ ...btn, opacity: value >= max ? .45 : 1 }}><Icon name="plus" size={15} /></button>
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
// Everything here comes from the project row and its RSVPs. It used to say
// "Marcus, Maya & N others are going" for every project, show a striped
// "project photo" placeholder, fill an empty description with invented
// copy, and its Share button toasted "Link copied" without copying anything.
export function MProject({ data, close }) {
  const app = useApp();
  const going = app.community?.has('proj-' + data.id);
  const isDbProject = /^[0-9a-f-]{36}$/.test(String(data.id));
  const [count, setCount] = React.useState<number>(data.going ?? 0);
  const [attendees, setAttendees] = React.useState<any[]>([]);
  const [hostHandle, setHostHandle] = React.useState<string | null>(null);
  const isHost = !!app.user?.id && data.userId === app.user.id;
  const photos: string[] = data.imageUrls?.length ? data.imageUrls : (data.coverUrl ? [data.coverUrl] : []);
  // The viewer shows the uncropped originals when the project has them (054).
  const fullPhotos: string[] = data.originalUrls?.length === photos.length ? data.originalUrls : photos;
  const [photo, setPhoto] = React.useState(0);
  const [viewing, setViewing] = React.useState(false);

  React.useEffect(() => {
    if (!isDbProject) return;
    let live = true;
    import('@/lib/supabase').then(async ({ supabase }) => {
      const [{ data: rsvps }, host] = await Promise.all([
        supabase.from('project_rsvps').select('user_id').eq('project_id', data.id).limit(50),
        data.userId
          ? supabase.from('profiles').select('handle').eq('id', data.userId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!live) return;
      setHostHandle((host as any)?.data?.handle ?? null);
      const ids = (rsvps ?? []).map((r: any) => r.user_id);
      setCount(ids.length);
      if (!ids.length) { setAttendees([]); return; }
      const { data: profiles } = await supabase.from('profiles')
        .select('id, handle, full_name, avatar_url').in('id', ids.slice(0, 4));
      if (live) setAttendees(profiles ?? []);
    }).catch(() => {});
    return () => { live = false; };
  }, [data.id, data.userId, going]);

  const handleRsvp = () => {
    app.community.toggle('proj-' + data.id);
    setCount(c => Math.max(0, c + (going ? -1 : 1)));
    // Real RSVP for DB projects — keeps going_count accurate for everyone
    if (isDbProject && app.user?.id) {
      import('@/lib/market').then(({ toggleRsvp }) => toggleRsvp(app.user.id, data.id, going)).catch(() => {});
    }
    app.toast(going ? { msg: 'RSVP cancelled', icon: 'close' } : { msg: "You're going!", sub: `${data.t} · ${data.when}`, kind: 'success', icon: 'check' });
  };
  const share = async () => {
    const url = `${window.location.origin}/map?project=${encodeURIComponent(data.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      app.toast({ msg: 'Link copied', sub: 'Anyone with the link can open this project.', icon: 'share' });
    } catch {
      app.toast({ msg: "Couldn't copy the link", sub: url, icon: 'share' });
    }
  };
  const names = attendees.map(a => (a.full_name || a.handle || '').split(' ')[0]).filter(Boolean);
  const goingLine = count === 0
    ? 'No one has RSVPed yet — be the first.'
    : names.length === 0
      ? `${count} going`
      : count <= names.length
        ? `${names.join(names.length === 2 ? ' & ' : ', ')} ${count === 1 ? 'is' : 'are'} going`
        : `${names.slice(0, 2).join(', ')} & ${count - Math.min(2, names.length)} ${count - Math.min(2, names.length) === 1 ? 'other' : 'others'} are going`;
  return (
    <Modal onClose={close} width={560}>
      <div onClick={photos.length ? () => setViewing(true) : undefined} title={photos.length ? 'View full photo' : undefined}
        style={{ height: photos.length ? 240 : 180, position: 'relative', cursor: photos.length ? 'zoom-in' : 'default', background: photos.length ? `url(${photos[photo] ?? photos[0]}) center/cover` : (data.color || 'var(--green)') }}>
        <button onClick={e => { e.stopPropagation(); close(); }} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="close" size={16} /></button>
        <span className="chip chip-green" style={{ position: 'absolute', bottom: 14, left: 16 }}>{data.cat}</span>
      </div>
      {viewing && (
        <PhotoViewer photos={fullPhotos} index={Math.min(photo, photos.length - 1)} onIndex={setPhoto} onClose={() => setViewing(false)} alt={data.t} />
      )}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 22px 0', overflowX: 'auto' }}>
          {photos.map((src, i) => (
            <button key={src} onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`} style={{
              flexShrink: 0, width: 56, height: 56, borderRadius: 8, padding: 0, cursor: 'pointer',
              border: i === photo ? '2px solid var(--green)' : '1px solid var(--line)',
              background: `url(${src}) center/cover`,
            }} />
          ))}
        </div>
      )}
      <div style={{ padding: 22 }}>
        <h2 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{data.t}</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-3)' }}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="calendar" size={14} /> {data.when}</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="users" size={14} /> {count} going</span>
          {data.locationName && <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="pin" size={14} /> {data.locationName}</span>}
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
          Hosted by <strong>{data.host}</strong>.{data.description ? ' ' + data.description : ''}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: 14, background: 'var(--bg-2)', borderRadius: 12 }}>
          {attendees.length > 0 && (
            <div style={{ display: 'flex' }}>
              {attendees.map((a, i) => (
                <span key={a.id} style={{ marginLeft: i ? -8 : 0, borderRadius: '50%', border: '2px solid var(--surface)', display: 'inline-flex' }}>
                  <Avatar src={a.avatar_url} name={a.full_name || a.handle} size={28} noBorder />
                </span>
              ))}
            </div>
          )}
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{goingLine}</span>
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={share}><Icon name="share" size={14} /> Share</button>
        {hostHandle && !isHost && (
          <button className="btn btn-ghost" onClick={() => { close(); app.nav('messages', { handle: hostHandle }); }}><Icon name="msg" size={14} /> Message host</button>
        )}
        <button className={going ? 'btn btn-ghost' : 'btn btn-green'} onClick={handleRsvp}>
          {going ? 'Going ✓ — cancel' : "I'm going"}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Carbon credit detail / buy ---
export function MCredit({ data, close }) {
  const app = useApp();
  const [qty, setQty] = React.useState(1);
  const [paying, setPaying] = React.useState(false);
  // Display only — the server prices the retirement and that is what is charged.
  const unit = parseFloat(String(data.price).replace(/[^0-9.]/g, '')) || 20;
  // Up to what's left on the credit; 100,000 t is the checkout route's own cap.
  const maxTonnes = Math.max(1, Math.min(100000, Math.floor(Number(data.volume_t) || 100000)));

  const handleBuy = () => {
    // A retirement is only recordable against a credit that exists in the registry.
    // Without an id there is nothing to retire, so don't write a record or claim one.
    if (!data.id) {
      app.toast?.({ msg: 'This credit is no longer listed', kind: 'error', icon: 'leaf' });
      close();
      return;
    }
    if (!app.user?.id) {
      app.toast?.({ msg: 'Sign in to retire a credit', kind: 'error', icon: 'leaf' });
      close();
      return;
    }
    setPaying(true);
  };

  const retired = (r: Retirement) => {
    window.dispatchEvent(new Event('honua:offset-purchased'));
    close();
    // Everything shown here is what the database recorded after the payment.
    app.openModal('celebrate', {
      title: `Offset ${r.tonnes} t CO₂`,
      sub: `Retired via ${r.creditName} for $${(r.totalCents / 100).toFixed(2)}. Serial ${r.serial}.`,
    });
  };

  if (paying) {
    return (
      <Modal onClose={close} width={560}>
        <ModalHead icon="leaf" title={`Retire ${qty} t · ${data.name}`} sub="Paid by card. The tonnes are retired once the payment is confirmed." onClose={close} />
        <div style={{ padding: '18px 24px 22px' }}>
          <CarbonPayment creditId={data.id} tonnes={qty} onRetired={retired} onBack={() => setPaying(false)} />
        </div>
      </Modal>
    );
  }

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
        {/* Was "on-chain verified" over a claim of GPS-tagged plots and a
            certificate issued to a wallet. None of that exists. What does
            exist after migration 047 is a retirement serial. */}
        <span className="verified-impact">{data.tag}</span>
        <p style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: '12px 0 0' }}>Listed under {data.verifier || 'its standard'}, vintage {data.vintage || '—'}. Retiring issues a serial you can quote when reconciling against the registry.</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, padding: 14, background: 'var(--green-tint)', borderRadius: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Tonnes of CO₂</div>
            <QtyStepper value={qty} set={setQty} max={maxTonnes} suffix=" t" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Total</div>
            <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>${(unit * qty).toFixed(2)}</div>
          </div>
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleBuy}>
          {`Buy ${qty} t · $${(unit * qty).toFixed(2)}`}
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
// Everything here is the signed-in user's own rows: Green Points are the sum of
// their impact_logs points (the same figure MyImpactCard shows), carbon is their
// paid carbon_purchases. Shared with Settings → Wallet & rewards.
export type WalletEntry = { at: string; label: string; amount: string; positive: boolean };
export type WalletSummary = { pts: number; monthPts: number; tonnes: number; totalCents: number; activity: WalletEntry[] };

export function useWalletSummary(): WalletSummary | null {
  const app = useApp();
  const [summary, setSummary] = React.useState<WalletSummary | null>(null);
  const load = React.useCallback(() => {
    if (!app.user?.id) return;
    Promise.all([import('@/lib/impact'), import('@/lib/market')]).then(async ([{ getAllLogs }, { getMyOffsets }]) => {
      const [logs, offsets] = await Promise.all([getAllLogs(app.user.id), getMyOffsets(app.user.id)]);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const monthKey = monthStart.toISOString();
      const activity: WalletEntry[] = [
        ...logs.filter(l => Number(l.points ?? 0) > 0).map(l => ({
          at: l.logged_at ?? '', label: l.action || l.category || 'Logged action',
          amount: `+${Number(l.points).toLocaleString()} GP`, positive: true,
        })),
        ...offsets.purchases.map((p: any) => ({
          at: p.created_at ?? '', label: `Carbon retired${p.credit_name ? ' · ' + p.credit_name : ''}`,
          amount: `${Number(p.tonnes ?? 0)} t · $${((p.total_cents ?? 0) / 100).toFixed(2)}`, positive: false,
        })),
      ].sort((x, y) => (y.at > x.at ? 1 : y.at < x.at ? -1 : 0));
      setSummary({
        pts: logs.reduce((t, l) => t + Number(l.points ?? 0), 0),
        monthPts: logs.filter(l => (l.logged_at ?? '') >= monthKey).reduce((t, l) => t + Number(l.points ?? 0), 0),
        tonnes: offsets.tonnes, totalCents: offsets.totalCents, activity,
      });
    }).catch(() => setSummary({ pts: 0, monthPts: 0, tonnes: 0, totalCents: 0, activity: [] }));
  }, [app.user?.id]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    window.addEventListener('honua:impact-logged', load);
    window.addEventListener('honua:offset-purchased', load);
    return () => {
      window.removeEventListener('honua:impact-logged', load);
      window.removeEventListener('honua:offset-purchased', load);
    };
  }, [load]);
  return summary;
}

function exportStatement(rows: WalletEntry[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = ['date,description,amount', ...rows.map(r => [r.at.slice(0, 10), esc(r.label), esc(r.amount)].join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = `honua-wallet-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MWallet({ close }) {
  const app = useApp();
  const w = useWalletSummary();
  const tonnes = w ? (w.tonnes % 1 === 0 ? w.tonnes : w.tonnes.toFixed(1)) : '–';
  return (
    <Modal onClose={close} width={500}>
      <ModalHead icon="coin" iconColor="var(--sky)" title="Impact wallet" sub="Your verified-action rewards and carbon balance." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,#1f6f3f,#2e9a5b)', color: '#fff', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', opacity: .85 }}>GREEN POINTS</div>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Lora' }}>{w ? w.pts.toLocaleString() : '–'}</div>
          </div>
          <div style={{ background: 'var(--ink-solid)', color: '#fff', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', opacity: .7 }}>CARBON RETIRED</div>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Lora' }}>{tonnes} <span style={{ fontSize: 14, opacity: .6 }}>t</span></div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', margin: '18px 0 6px', letterSpacing: '.05em' }}>RECENT ACTIVITY</div>
        {w === null && <div style={{ padding: '10px 0', fontSize: 13.5, color: 'var(--ink-3)' }}>Loading…</div>}
        {w && w.activity.length === 0 && (
          <div style={{ padding: '10px 0', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>Nothing yet. Log a sustainable action or retire carbon and it will show up here.</div>
        )}
        {w?.activity.slice(0, 8).map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{r.at ? new Date(r.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</div>
            </div>
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', color: r.positive ? 'var(--green)' : 'var(--ink-2)' }}>{r.amount}</span>
          </div>
        ))}
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" disabled={!w || w.activity.length === 0} onClick={() => w && exportStatement(w.activity)}>Export statement</button>
        <button className="btn btn-primary" onClick={() => { close(); app.nav?.('carbon'); }}>Retire carbon</button>
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
