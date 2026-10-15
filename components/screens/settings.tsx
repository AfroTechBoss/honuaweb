"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { Toggle, ModalFoot, MProject, MCredit, MChallenge, MCelebrate, MWallet, MList } from "./desktop-misc";
import { KpiCard } from "./impact";
import { useWalletSummary } from "./misc-modals";
import { logImpact, TASK_IMPACTS } from "@/lib/impact";
import { getMyVerificationRequest, type VerificationRequest } from "@/lib/verification";
import { VERIFICATION_SLA } from "@/lib/verification-copy";

export function DesktopSettings({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [sec, setSec] = React.useState('Account');
  // /settings?sec=Privacy opens a section directly (follow-request notifications link here).
  React.useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('sec') || (typeof params?.sec === 'string' ? params.sec : null);
    if (want) setSec(want);
  }, [params?.sec]);
  const nav = [
    ['Account', 'user'], ['Profile', 'user'], ['Privacy', 'lock'], ['Muted & Blocked', 'lock'],
    ['Notifications', 'bell'], ['Wallet & rewards', 'sparkles'],
    ['Appearance', 'sparkles'], ['Help & support', 'comment'],
  ];
  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="settings" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 240, borderRight: '1px solid var(--line)', background: 'var(--surface)', padding: '24px 16px', overflow: 'auto' }} className="no-scrollbar settings-nav">
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

// Real balances only: Green Points from the user's impact_logs, carbon from
// their paid carbon_purchases. The old cards were fixed numbers (1,240 GP,
// 24 IT, 0 HONUA) beside a "Connect Celo wallet" button that only toasted.
function WalletSettings({ app }) {
  const w = useWalletSummary();
  const tonnes = w ? (w.tonnes % 1 === 0 ? w.tonnes : w.tonnes.toFixed(1)) : '–';
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
      <KpiCard label="Green Points" value={w ? w.pts.toLocaleString() : '–'} unit="GP" delta={w ? `+${w.monthPts.toLocaleString()} this month` : 'loading'} color="var(--green)" icon="sparkles" />
      <KpiCard label="Carbon retired" value={tonnes} unit="t" delta={w ? `$${(w.totalCents / 100).toFixed(2)} spent` : 'loading'} color="var(--sky)" icon="leaf" />
    </div>
    <div style={{ display: 'flex', gap: 10 }}>
      <button className="btn btn-primary" onClick={() => app.openModal('wallet')}>Open wallet</button>
    </div>
  </>;
}

export function SettingsSection({ sec, app, onNav }) {
  const head = {
    'Account': 'Manage your sign-in, identity, and verified-impact wallet.',
    'Profile': 'Control how you appear to the community.',
    'Privacy': 'Decide who can see and reach you.',
    'Muted & Blocked': 'Manage users you have muted or blocked.',
    'Notifications': 'Choose what reaches you, and how.',
    'Wallet & rewards': 'Your Green Points and the carbon you have retired.',
    'Appearance': 'Make Honua yours.',
    'Help & support': 'Guides, contact, and account tools.',
  }[sec];
  return (
    <>
      <h1 className="font-display" style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{sec}</h1>
      <p style={{ margin: '0 0 24px', color: 'var(--ink-3)', fontSize: 14 }}>{head}</p>

      {sec === 'Account' && <>
        <Section title="Identity">
          <Field label="Display name" v={app.user?.name || '—'} />
          <Field label="Username" v={app.user?.handle ? `@${app.user.handle}` : '—'} />
          <Field label="Email" v={app.user?.email || '—'} />
        </Section>
        <VerificationSection app={app} />
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
          <Field label="Display name" v={app.user?.name || '—'} />
          <Field label="Username" v={app.user?.handle ? `@${app.user.handle}` : '—'} />
          <Field label="Email" v={app.user?.email || '—'} />
        </Section>
        <button className="btn btn-green" onClick={() => app.openModal('editprofile')}><Icon name="edit" size={14} /> Edit profile</button>
      </>}

      {sec === 'Privacy' && <PrivacySection app={app} onNav={onNav} />}

      {sec === 'Muted & Blocked' && <MutedBlockedSection app={app} />}

      {sec === 'Notifications' && (
        <Section title="In-app notifications">
          <NotifPrefs />
        </Section>
      )}

      {sec === 'Wallet & rewards' && <WalletSettings app={app} />}

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

      {sec === 'Help & support' && <HelpSupport app={app} onNav={onNav} />}
    </>
  );
};

const FAQ_ITEMS = [
  { q: 'How do I verify my impact actions?', a: 'Log the action from the Impact page, ideally with a photo as proof. Other members can vouch for it, and once 3 people have vouched it counts as verified.' },
  { q: 'What are Green Points?', a: 'Green Points (GP) are earned for the sustainable actions you log — commuting by bike, reducing energy use, and so on. Your total appears under Wallet & rewards and on your public profile.' },
  { q: 'How do I join or create a community?', a: 'Open the Communities tab in the sidebar. Browse featured communities or search by topic. To create one, tap "+ New community" and fill in the name, description, and focus area.' },
  { q: 'How do I edit my profile?', a: 'Go to Settings → Profile and tap "Edit profile", or tap your avatar anywhere it appears and select Edit. You can update your display name, handle, bio, avatar, and cover photo.' },
  { q: 'How do I report a post or user?', a: 'Tap the "…" menu on a post or visit a user\'s profile and tap "Report." Select a reason and submit. Our moderation team reviews reports within 24 hours.' },
  { q: 'Why was my post removed?', a: 'Posts may be removed for violating our Community Guidelines — misinformation about climate science, hate speech, spam, or prohibited commercial promotion. You\'ll receive a notification with the reason.' },
  { q: 'How do I delete my account?', a: 'Go to Settings → Account → Danger zone and tap "Delete account." You\'ll be asked to confirm. Deletion is immediate and permanent: your profile, posts and activity are removed. It waits until any orders you bought or sold are delivered or cancelled, payouts have been sent and seller earnings withdrawn. Transaction records (orders, payouts, carbon retirements) and the identity details on them are kept for 10 years, as EU accounting and tax law requires, then deleted. They are locked away and used only for tax and legal requests.' },
  { q: 'Is my data shared with third parties?', a: 'Honua never sells your personal data. The impact you log is used only to show your progress and rank on the leaderboards. Read our full Privacy Policy under Terms & privacy.' },
];

export function HelpSupport({ app, onNav }: { app: any; onNav?: any }) {
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);
  const [view, setView] = React.useState<'home' | 'contact' | 'report'>('home');
  const [form, setForm] = React.useState({ subject: '', message: '' });
  const [report, setReport] = React.useState({ category: 'Bug', description: '' });
  const [sending, setSending] = React.useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)',
    background: 'var(--bg)', color: 'var(--ink)', fontSize: 13, fontFamily: 'Satoshi',
    outline: 'none', boxSizing: 'border-box',
  };

  async function handleContact(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    setSending(false);
    setForm({ subject: '', message: '' });
    setView('home');
    app.toast({ msg: 'Message sent', sub: 'We\'ll get back to you within 2 business days.', icon: 'msg', kind: 'success' });
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    setSending(false);
    setReport({ category: 'Bug', description: '' });
    setView('home');
    app.toast({ msg: 'Report submitted', sub: 'Thanks — we\'ll investigate shortly.', icon: 'bolt', kind: 'success' });
  }

  if (view === 'contact') return (
    <>
      <button onClick={() => setView('home')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 20 }}>
        <Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} /> Back
      </button>
      <h2 className="font-display" style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600 }}>Contact support</h2>
      <p style={{ margin: '0 0 20px', color: 'var(--ink-3)', fontSize: 13 }}>We typically respond within 2 business days.</p>
      <form onSubmit={handleContact} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</label>
          <input required style={inputStyle} placeholder="e.g. Can't connect my utility provider" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message</label>
          <textarea required rows={5} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe your issue in as much detail as possible…" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
        </div>
        <button className="btn btn-green" type="submit" disabled={sending} style={{ alignSelf: 'flex-start' }}>
          {sending ? 'Sending…' : <><Icon name="msg" size={14} /> Send message</>}
        </button>
      </form>
    </>
  );

  if (view === 'report') return (
    <>
      <button onClick={() => setView('home')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 20 }}>
        <Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} /> Back
      </button>
      <h2 className="font-display" style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600 }}>Report a problem</h2>
      <p style={{ margin: '0 0 20px', color: 'var(--ink-3)', fontSize: 13 }}>Help us make Honua better for everyone.</p>
      <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</label>
          <select style={inputStyle} value={report.category} onChange={e => setReport(r => ({ ...r, category: e.target.value }))}>
            {['Bug', 'Incorrect impact data', 'Missing feature', 'Account issue', 'Safety concern', 'Other'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
          <textarea required rows={5} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What happened? What did you expect instead?" value={report.description} onChange={e => setReport(r => ({ ...r, description: e.target.value }))} />
        </div>
        <button className="btn btn-green" type="submit" disabled={sending} style={{ alignSelf: 'flex-start' }}>
          {sending ? 'Submitting…' : <><Icon name="bolt" size={14} /> Submit report</>}
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Quick actions */}
      <Section title="Get in touch">
        {([
          ['Contact support', 'msg', 'contact', 'Questions, billing, or account issues'] as const,
          ['Report a problem', 'bolt', 'report', 'Bugs, incorrect data, safety concerns'] as const,
        ]).map(([label, icon, target, sub]) => (
          <button key={label} onClick={() => setView(target as any)} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 10px', margin: '0 -10px', border: 'none', borderTop: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={icon} size={16} color="var(--green)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
            </div>
            <Icon name="arrow" size={15} color="var(--ink-4)" />
          </button>
        ))}
        <a href="/terms" onClick={e => { e.preventDefault(); onNav?.('terms'); }} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 10px', margin: '0 -10px', borderTop: '1px solid var(--line)', textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="lock" size={16} color="var(--green)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Terms & privacy</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Community guidelines, ToS and Privacy Policy</div>
          </div>
          <Icon name="arrow" size={15} color="var(--ink-4)" />
        </a>
      </Section>

      {/* FAQ */}
      <Section title="Frequently asked questions">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>{item.q}</span>
              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: openFaq === i ? 'var(--green)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: openFaq === i ? '#fff' : 'var(--ink-3)', transition: 'background 0.15s' }}>
                {openFaq === i ? '−' : '+'}
              </span>
            </button>
            {openFaq === i && (
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65, paddingRight: 32 }}>{item.a}</p>
            )}
          </div>
        ))}
      </Section>
    </>
  );
}

// controlled toggle row for settings
function MutedBlockedSection({ app }: { app: any }) {
  const [mutedProfiles, setMutedProfiles] = React.useState<any[]>([]);
  const [blockedProfiles, setBlockedProfiles] = React.useState<any[]>([]);

  React.useEffect(() => {
    const userId = app.user?.id;
    if (!userId) return;
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('muted_users').select('muted_id').eq('user_id', userId).then(({ data: mutes }: any) => {
        const ids = (mutes ?? []).map((m: any) => m.muted_id);
        if (!ids.length) { setMutedProfiles([]); return; }
        supabase.from('profiles').select('id, handle, full_name, avatar_url').in('id', ids).then(({ data }: any) => setMutedProfiles(data ?? []));
      });
      supabase.from('blocked_users').select('blocked_id').eq('user_id', userId).then(({ data: blocks }: any) => {
        const ids = (blocks ?? []).map((b: any) => b.blocked_id);
        if (!ids.length) { setBlockedProfiles([]); return; }
        supabase.from('profiles').select('id, handle, full_name, avatar_url').in('id', ids).then(({ data }: any) => setBlockedProfiles(data ?? []));
      });
    });
  }, [app.user?.id]);

  const handleUnmute = async (targetId: string) => {
    await app.unmuteUser?.(targetId);
    setMutedProfiles(p => p.filter(u => u.id !== targetId));
  };
  const handleUnblock = async (targetId: string) => {
    await app.unblockUser?.(targetId);
    setBlockedProfiles(p => p.filter(u => u.id !== targetId));
  };

  return (
    <>
      <Section title="Muted users" sub="Muted users' posts are hidden from your feed. They don't know they're muted.">
        {mutedProfiles.length === 0
          ? <div style={{ fontSize: 14, color: 'var(--ink-4)', padding: '12px 0' }}>No muted users.</div>
          : mutedProfiles.map(u => (
            <UserRow key={u.id} user={u} actionLabel="Unmute" onAction={() => handleUnmute(u.id)} />
          ))
        }
      </Section>
      <Section title="Blocked users" sub="Blocked users can't see your posts or profile.">
        {blockedProfiles.length === 0
          ? <div style={{ fontSize: 14, color: 'var(--ink-4)', padding: '12px 0' }}>No blocked users.</div>
          : blockedProfiles.map(u => (
            <UserRow key={u.id} user={u} actionLabel="Unblock" onAction={() => handleUnblock(u.id)} actionColor="var(--clay)" />
          ))
        }
      </Section>
    </>
  );
}

function UserRow({ user, actionLabel, onAction, actionColor }: { user: any; actionLabel: string; onAction: () => void; actionColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
      <span style={{ width: 40, height: 40, borderRadius: '50%', background: user.avatar_url ? `url(${user.avatar_url}) center/cover` : 'var(--green-tint)', display: 'inline-block', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{user.handle}</div>
      </div>
      <button className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 14px', color: actionColor, borderColor: actionColor }} onClick={onAction}>{actionLabel}</button>
    </div>
  );
}

export function ToggleC2({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', gap: 16 }}>
      <div><div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>{sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}</div>
      <ToggleC on={on} onChange={onChange} />
    </div>
  );
};

// Each of these is enforced in the database (migration 051), not just here:
//   is_private         — posts, comments and stories are hidden by RLS from
//                        anyone who doesn't follow you; following needs a request
//   show_location      — while off, location is moved out of the public profile
//   show_activity      — gates who can read your user_presence row
//   allow_tips         — the Tip button and tip sheet honour it
//   message_permission — checked when someone opens a conversation with you
type PrivacyFlags = { is_private: boolean; show_location: boolean; show_activity: boolean; allow_tips: boolean; message_permission: 'everyone' | 'following' | 'nobody' };

function PrivacySection({ app, onNav }) {
  const userId = app.user?.id;
  const [flags, setFlags] = React.useState<PrivacyFlags | null>(null);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const loadRequests = React.useCallback(async () => {
    if (!userId) return;
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.from('follow_requests')
      .select('requester_id, created_at, requester:profiles!follow_requests_requester_id_fkey(id, handle, full_name, avatar_url)')
      .eq('target_id', userId).order('created_at', { ascending: false });
    setRequests(data ?? []);
  }, [userId]);

  React.useEffect(() => {
    if (!userId) return;
    import('@/lib/supabase').then(async ({ supabase }) => {
      const { data } = await supabase.from('profiles')
        .select('is_private, show_location, show_activity, allow_tips, message_permission')
        .eq('id', userId).maybeSingle();
      setFlags({
        is_private: !!data?.is_private,
        show_location: data?.show_location !== false,
        show_activity: data?.show_activity !== false,
        allow_tips: data?.allow_tips !== false,
        message_permission: data?.message_permission ?? 'everyone',
      });
    });
    loadRequests();
  }, [userId, loadRequests]);

  const save = async (patch: Partial<PrivacyFlags>) => {
    if (!flags || !userId) return;
    const prev = flags;
    setFlags({ ...flags, ...patch });
    try {
      const { updateProfile } = await import('@/lib/profile');
      await updateProfile(userId, patch);
      // Going public lets everyone who was waiting in (a trigger does it).
      if (patch.is_private === false) loadRequests();
    } catch (e: any) {
      setFlags(prev);
      app.toast?.({ kind: 'error', msg: "Couldn't save that setting", sub: e?.message, icon: 'lock' });
    }
  };

  const approve = async (requesterId: string) => {
    setBusy(requesterId);
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.rpc('approve_follow_request', { p_requester: requesterId });
    setBusy(null);
    if (error) { app.toast?.({ kind: 'error', msg: "Couldn't approve", sub: error.message, icon: 'user' }); return; }
    setRequests(r => r.filter(x => x.requester_id !== requesterId));
  };
  const decline = async (requesterId: string) => {
    setBusy(requesterId);
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('follow_requests').delete().match({ requester_id: requesterId, target_id: userId });
    setBusy(null);
    if (error) { app.toast?.({ kind: 'error', msg: "Couldn't decline", sub: error.message, icon: 'user' }); return; }
    setRequests(r => r.filter(x => x.requester_id !== requesterId));
  };

  if (!userId) return <Section title="Visibility" sub="Sign in to manage your privacy." />;
  if (!flags) return <Section title="Visibility" sub="Loading…" />;

  const MSG_OPTIONS: [PrivacyFlags['message_permission'], string][] = [['everyone', 'Everyone'], ['following', 'People I follow'], ['nobody', 'No one']];
  return <>
    <Section title="Visibility">
      <ToggleC2 label="Private account" sub="Only approved followers see your posts, comments and stories. New followers have to send a request." on={flags.is_private} onChange={v => save({ is_private: v })} />
      <ToggleC2 label="Show my location" sub="While off, your location is removed from your public profile. Turn it back on to restore it." on={flags.show_location} onChange={v => save({ show_location: v })} />
      <ToggleC2 label="Show activity status" sub="Let others see when you were last active." on={flags.show_activity} onChange={v => save({ show_activity: v })} />
      <ToggleC2 label="Allow tips" sub="Shows the Tip button on your profile once tipping launches." on={flags.allow_tips} onChange={v => save({ allow_tips: v })} />
      <div style={{ padding: '10px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Who can message me</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Applies to new conversations. Chats you&apos;ve already accepted carry on, and buyers can still reach your shop.</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {MSG_OPTIONS.map(([v, l]) => (
            <button key={v} className={flags.message_permission === v ? 'btn btn-green' : 'btn btn-ghost'} style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => flags.message_permission !== v && save({ message_permission: v })}>{l}</button>
          ))}
        </div>
      </div>
    </Section>
    {(flags.is_private || requests.length > 0) && (
      <Section title="Follow requests" sub={requests.length ? `${requests.length} waiting` : 'No one is waiting right now.'}>
        {requests.map(r => (
          <div key={r.requester_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => r.requester?.handle && onNav?.('profile', { handle: r.requester.handle })}><Avatar src={r.requester?.avatar_url} name={r.requester?.full_name || r.requester?.handle || '?'} size={36} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{r.requester?.full_name || r.requester?.handle}</div>
              {r.requester?.handle && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{r.requester.handle}</div>}
            </div>
            <button className="btn btn-green" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={busy === r.requester_id} onClick={() => approve(r.requester_id)}>Approve</button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={busy === r.requester_id} onClick={() => decline(r.requester_id)}>Decline</button>
          </div>
        ))}
      </Section>
    )}
  </>;
}

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

// --- Verification ---
// The only place an account can start a verification application. The badge is
// never granted automatically: this opens a request, an admin reads it, and
// the decision comes back as a notification and an email.
export function VerificationSection({ app }: { app: any }) {
  const userId: string | undefined = app.user?.id;
  const [req, setReq] = React.useState<VerificationRequest | null | undefined>(undefined);

  const load = React.useCallback(() => {
    if (!userId) { setReq(null); return; }
    getMyVerificationRequest(userId).then(setReq);
  }, [userId]);

  React.useEffect(() => { load(); }, [load]);

  const verified = !!app.user?.verified;
  const status = req?.status;
  const loading = req === undefined;

  // Verified accounts still see the decision record — that's where the reason
  // for a revoke would show up if one ever happens.
  const state = verified ? 'verified' : status === 'pending' ? 'pending' : status === 'rejected' ? 'rejected' : 'none';

  const meta: Record<string, { color: string; icon: string; label: string; sub: string }> = {
    verified: { color: 'var(--sky)', icon: 'check', label: 'Verified', sub: 'Your profile carries the tick.' },
    pending:  { color: 'var(--sun)', icon: 'clock', label: 'Under review', sub: `${VERIFICATION_SLA} You'll hear either way.` },
    rejected: { color: 'var(--clay)', icon: 'bolt', label: 'Not approved', sub: req?.reviewer_note || 'No reason was recorded.' },
    none:     { color: 'var(--ink-3)', icon: 'check', label: 'Not verified', sub: 'Verification confirms an account is who it says it is. It is never granted automatically.' },
  };
  const m = meta[state];

  const open = () => app.openModal('verifyrequest', { request: req ?? null, onSubmitted: () => load() });

  return (
    <Section title="Verification">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 0, flex: 1 }}>
          <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: 'var(--bg-2)', color: m.color, display: 'grid', placeItems: 'center', border: '1px solid var(--line)' }}>
            <Icon name={m.icon} size={16} stroke={2.2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              {loading ? 'Checking…' : m.label}
              {state === 'rejected' && req?.reviewed_at && (
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)' }}>
                  {new Date(req.reviewed_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            {!loading && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.55 }}>{m.sub}</div>}
          </div>
        </div>
        {!loading && (
          <button className={state === 'none' || state === 'rejected' ? 'btn btn-green' : 'btn btn-ghost'} style={{ padding: '7px 14px', fontSize: 13, flexShrink: 0 }} onClick={open}>
            {state === 'none' ? 'Apply for verification'
              : state === 'rejected' ? 'Apply again'
              : state === 'pending' ? 'View application'
              : 'What this means'}
          </button>
        )}
      </div>
    </Section>
  );
};

export function Field({ label, v, multiline }: { label: string; v: React.ReactNode; multiline?: boolean }) {
  return (
    <div className="settings-field-row" style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'flex-start', padding: '10px 0' }}>
      <label style={{ fontSize: 13, color: 'var(--ink-3)', paddingTop: 8 }}>{label}</label>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 10, padding: '8px 12px', fontSize: 14,
        minHeight: multiline ? 72 : 'auto', minWidth: 0,
        wordBreak: 'break-word', overflowWrap: 'break-word',
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
