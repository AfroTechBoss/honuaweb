"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { Toggle, ModalFoot, MProject, MArticle, MProduct, MCredit, MChallenge, MDiscussion, MBadge, MCelebrate, MWallet, MList, MCommunityAbout } from "./desktop-misc";
import { KpiCard } from "./impact";
import { logImpact, TASK_IMPACTS } from "@/lib/impact";
import { getMyVerificationRequest, type VerificationRequest } from "@/lib/verification";
import { VERIFICATION_SLA } from "@/lib/verification-copy";

export function DesktopSettings({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [sec, setSec] = React.useState('Account');
  const nav = [
    ['Account', 'user'], ['Profile', 'user'], ['Privacy', 'lock'], ['Muted & Blocked', 'lock'],
    ['Notifications', 'bell'], ['Impact tracking', 'leaf'], ['Wallet & rewards', 'sparkles'],
    ['Appearance', 'sparkles'], ['Connected apps', 'bolt'], ['Help & support', 'comment'],
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

export function SettingsSection({ sec, app, onNav }) {
  const head = {
    'Account': 'Manage your sign-in, identity, and verified-impact wallet.',
    'Profile': 'Control how you appear to the community.',
    'Privacy': 'Decide who can see and reach you.',
    'Muted & Blocked': 'Manage users you have muted or blocked.',
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
          <Field label="Display name" v={app.user?.name || '—'} />
          <Field label="Username" v={app.user?.handle ? `@${app.user.handle}` : '—'} />
          <Field label="Email" v={app.user?.email || '—'} />
        </Section>
        <VerificationSection app={app} />
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
          <Field label="Display name" v={app.user?.name || '—'} />
          <Field label="Username" v={app.user?.handle ? `@${app.user.handle}` : '—'} />
          <Field label="Email" v={app.user?.email || '—'} />
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

      {sec === 'Muted & Blocked' && <MutedBlockedSection app={app} />}

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

      {sec === 'Help & support' && <HelpSupport app={app} onNav={onNav} />}
    </>
  );
};

const FAQ_ITEMS = [
  { q: 'How do I verify my impact actions?', a: 'Go to Settings → Impact tracking and connect your data sources (utility provider, transit app, or bank). Once connected, Honua pulls your activity automatically and awards Green Points after verification.' },
  { q: 'What are Green Points and Impact Tokens?', a: 'Green Points (GP) are earned for verified sustainable actions — commuting by bike, reducing energy use, etc. Impact Tokens (IT) are milestone rewards. Both appear in your Wallet & rewards and on your public profile.' },
  { q: 'How do I join or create a community?', a: 'Open the Communities tab in the sidebar. Browse featured communities or search by topic. To create one, tap "+ New community" and fill in the name, description, and focus area.' },
  { q: 'Can I make my account private?', a: 'Yes. Go to Settings → Privacy and toggle "Private account" on. Only approved followers will see your posts and profile details.' },
  { q: 'How do I edit my profile?', a: 'Go to Settings → Profile and tap "Edit profile", or tap your avatar anywhere it appears and select Edit. You can update your display name, handle, bio, avatar, and cover photo.' },
  { q: 'How does the tipping system work?', a: 'Tap the coin icon on any post to send a tip. Tips are sent in Impact Tokens and go directly to the creator. You can disable incoming tips under Settings → Privacy.' },
  { q: 'How do I report a post or user?', a: 'Tap the "…" menu on a post or visit a user\'s profile and tap "Report." Select a reason and submit. Our moderation team reviews reports within 24 hours.' },
  { q: 'Why was my post removed?', a: 'Posts may be removed for violating our Community Guidelines — misinformation about climate science, hate speech, spam, or prohibited commercial promotion. You\'ll receive a notification with the reason.' },
  { q: 'How do I delete my account?', a: 'Go to Settings → Account → Danger zone and tap "Delete account." You\'ll be asked to confirm. Deletion is permanent and removes all your data within 30 days.' },
  { q: 'Is my data shared with third parties?', a: 'Honua never sells your personal data. Impact data from connected apps is processed only to calculate your verified actions. Read our full Privacy Policy under Terms & privacy.' },
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
