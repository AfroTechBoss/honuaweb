"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { getNotifications, markAllRead } from "@/lib/notifications";

// `verified` is an impact action clearing its vouch threshold; `account_verified`
// is the identity badge. Different things, so they don't share a row style.
const NOTIF_ICON: Record<string, string> = { like: 'heart', follow: 'user', comment: 'comment', reply: 'comment', mention: 'at', community_invite: 'users', badge: 'award', level_up: 'award', verified: 'leaf', milestone: 'flame', project: 'pin', streak_risk: 'flame', streak_ended: 'flame', account_verified: 'check', verification_declined: 'bolt' };
// streak_risk is a warning (still saveable), streak_ended is a loss — different
// colours so the two read apart at a glance in a list of flame icons.
const NOTIF_COLOR: Record<string, string> = { like: 'var(--clay)', follow: 'var(--sky)', comment: 'var(--ink-2)', reply: 'var(--ink-2)', mention: 'var(--sky)', community_invite: 'var(--sky)', badge: 'var(--green)', level_up: 'var(--green)', verified: 'var(--green)', milestone: 'var(--sun)', project: 'var(--green-2)', streak_risk: 'var(--sun)', streak_ended: 'var(--clay)', account_verified: 'var(--sky)', verification_declined: 'var(--ink-3)' };

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function DesktopNotifications({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('All');

  React.useEffect(() => {
    if (!app.user?.id) { setLoading(false); return; }
    getNotifications(app.user.id).then(data => { setItems(data); setLoading(false); });
  }, [app.user?.id, app.unreadNotifs]);

  // Mark all as read when leaving the page
  React.useEffect(() => {
    const userId = app.user?.id;
    if (!userId) return;
    return () => {
      markAllRead(userId);
      app.markAllNotifsRead?.();
    };
  }, [app.user?.id]);

  const handleMarkAllRead = async () => {
    if (!app.user?.id) return;
    await markAllRead(app.user.id);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    app.markAllNotifsRead?.();
    app.toast?.({ msg: 'All caught up', sub: 'Marked all notifications as read.', icon: 'check' });
  };

  const handleClick = (n: any) => {
    // Mark this one read locally
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    switch (n.type) {
      case 'like': case 'comment': case 'reply': case 'mention': return n.post_id && onNav?.('post', { id: n.post_id });
      case 'follow': return n.actor?.handle && onNav?.('profile', { handle: n.actor.handle });
      case 'community_invite': return onNav?.('forum');
      case 'badge': case 'level_up': return onNav?.('profile');
      // Straight to the profile, where the badge either is or isn't.
      case 'account_verified': return onNav?.('profile');
      // The reviewer's reason is on the settings row that offers a re-apply.
      case 'verification_declined': return onNav?.('settings');
      // Straight to the ledger, where the streak counter and "Log an action" are.
      case 'streak_risk': case 'streak_ended': return onNav?.('impact');
      default: return null;
    }
  };

  const TAB_TYPES: Record<string, string[]> = {
    'All': [],
    'Likes': ['like'],
    'Comments': ['comment', 'reply'],
    'Mentions': ['mention'],
    'Follows': ['follow'],
    'Community': ['community_invite'],
    'Badges': ['badge', 'level_up'],
    'Streaks': ['streak_risk', 'streak_ended'],
  };

  const filtered = tab === 'All' ? items : items.filter(n => TAB_TYPES[tab]?.includes(n.type));
  const unread = items.filter(n => !n.read).length;

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="notifications" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto', maxWidth: 760 }} className="no-scrollbar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="font-display" style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>Notifications</h1>
              {unread > 0 && <span style={{ background: 'var(--clay)', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>{unread}</span>}
            </div>
            {unread > 0 && <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={handleMarkAllRead}>Mark all read</button>}
          </div>
          {/* Tab filters */}
          <div className="pill-nav" style={{ marginBottom: 18 }}>
            {Object.keys(TAB_TYPES).map(t => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ width: '60%', height: 13, borderRadius: 6, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                    <div style={{ width: '35%', height: 11, borderRadius: 6, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--ink-3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>No notifications yet</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>When someone likes, comments, or follows you, it shows up here.</div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              {filtered.map((n, i) => {
                const icon = NOTIF_ICON[n.type] || 'bell';
                const col = NOTIF_COLOR[n.type] || 'var(--ink-3)';
                return (
                  <div key={n.id} className="row-hover" onClick={() => handleClick(n)} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
                    borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--line)',
                    background: !n.read ? 'var(--green-tint)' : 'transparent',
                    cursor: 'pointer',
                  }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {n.actor?.avatar_url
                        ? <img src={n.actor.avatar_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 10, background: col + '22', color: col, display: 'grid', placeItems: 'center' }}>
                            <Icon name={icon} size={16} stroke={2} />
                          </div>
                      }
                      {n.actor?.avatar_url && (
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: col + '22', color: col, display: 'grid', placeItems: 'center', border: '2px solid var(--surface)' }}>
                          <Icon name={icon} size={8} stroke={2.5} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                        {n.actor && <strong style={{ color: 'var(--ink)' }}>{n.actor.full_name || `@${n.actor.handle}`} </strong>}
                        {n.body}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{timeAgo(n.created_at)} ago</div>
                    </div>
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', marginTop: 14, flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ width: 320, padding: 24, overflow: 'auto' }} className="no-scrollbar right-panel">
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

