"use client";
import React from "react";
import { Icon, Logo, Avatar, VerifiedTick, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { Toggle, ModalFoot, MProject, MCredit, MChallenge, MCelebrate, MWallet, MList } from "./desktop-misc";
import { KpiCard } from "./impact";
import { logImpact, TASK_IMPACTS } from "@/lib/impact";
import { getBookmarks, getCollectionCounts, deleteCollection } from "@/lib/bookmarks";

function BookmarkPostCard({ post, onNav }: { post: any; onNav: any }) {
  const app = useApp();
  const profile = post.profile;
  const liked = app.like?.has(post.id);
  const community = post.community as any;
  const isCommunityPost = !!community;
  const kind = post.post_kind;
  const kindColors: Record<string, string> = { tip: 'var(--green)', question: 'var(--sky)', win: '#f59e0b', discussion: 'var(--ink-2)' };
  const timeAgo = (ts: string) => { const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000); if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; };
  const handleClick = () => isCommunityPost
    ? onNav?.('post', { id: post.id, slug: community.slug || community.name })
    : onNav?.('post', { id: post.id });

  if (isCommunityPost) {
    return (
      <div onClick={handleClick} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', borderLeft: '3px solid var(--green)' }}>
        {/* Community header strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 0', marginBottom: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--green)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono', letterSpacing: '.04em', textTransform: 'uppercase' }}>{community.name}</span>
          {kind && <span style={{ background: (kindColors[kind] ?? 'var(--ink-3)') + '18', color: kindColors[kind] ?? 'var(--ink-3)', padding: '1px 7px', borderRadius: 5, fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700, textTransform: 'uppercase', marginLeft: 'auto' }}>{kind}</span>}
        </div>
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 8 }}>
            <Avatar src={profile?.avatar_url} name={profile?.full_name} size={28} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                {profile?.full_name}
                {profile?.verified && <VerifiedTick size={12} />}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{profile?.handle} · {timeAgo(post.created_at)}</div>
            </div>
          </div>
          {post.content && <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>}
          {post.image_url && <img src={post.image_url} style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 140, marginBottom: 10 }} />}
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--ink-3)', alignItems: 'center' }}>
            <ActionBtn icon="heart" count={(post.likes_count ?? 0) + (liked ? 1 : 0)} active={liked} activeColor="var(--clay)" onClick={() => app.like?.toggle(post.id)} />
            <ActionBtn icon="comment" count={post.comments_count} onClick={handleClick} />
            <span style={{ flex: 1 }} />
            <button onClick={() => { const s = community.slug || community.name; const url = `${window.location.origin}/communities/post/${encodeURIComponent(s)}/${post.id}`; navigator.clipboard.writeText(url); app.toast?.({ msg: 'Link copied!', icon: 'check', kind: 'success' }); }} title="Share" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, display: 'inline-flex' }}>
              <Icon name="share" size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={handleClick} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <Avatar src={profile?.avatar_url} name={profile?.full_name} size={32} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            {profile?.full_name}
            {profile?.verified && <VerifiedTick size={12} />}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{profile?.handle} · {timeAgo(post.created_at)}</div>
        </div>
      </div>
      {post.content && <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>}
      {post.image_url && <img src={post.image_url} style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 180, marginBottom: 10 }} />}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-3)' }}>
        <ActionBtn icon="heart" count={(post.likes_count ?? 0) + (liked ? 1 : 0)} active={liked} activeColor="var(--clay)" onClick={() => app.like?.toggle(post.id)} />
        <ActionBtn icon="comment" count={post.comments_count} onClick={handleClick} />
      </div>
    </div>
  );
}

export function DesktopBookmarks({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [activeId, setActiveId] = React.useState<string | null>(null); // null = all
  const [bookmarks, setBookmarks] = React.useState<any[]>([]);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const collections: any[] = app.collections ?? [];

  const load = React.useCallback(async () => {
    if (!app.user?.id) { setLoading(false); return; }
    setLoading(true);
    const [bms, cnts] = await Promise.all([
      getBookmarks(app.user.id, activeId ?? undefined),
      getCollectionCounts(app.user.id),
    ]);
    setBookmarks(bms);
    setCounts(cnts);
    setLoading(false);
  }, [app.user?.id, activeId]);

  React.useEffect(() => { load(); }, [load]);

  const handleDeleteCollection = async (id: string) => {
    await deleteCollection(id);
    app.refreshCollections?.(app.user.id);
    if (activeId === id) setActiveId(null);
    load();
  };

  const activeName = activeId ? (collections.find(c => c.id === activeId)?.name ?? 'Collection') : 'All bookmarks';
  const posts = bookmarks.map((b: any) => b.post).filter(Boolean);

  const collectionOptions = [{ id: null, name: 'All bookmarks', emoji: '🔖' }, ...collections.map(c => ({ id: c.id, name: c.name, emoji: c.emoji }))];

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="bookmarks" onNav={onNav} />
      <main style={{ flex: 1, padding: 'clamp(16px, 4vw, 32px)', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>BOOKMARKS</div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: 600, letterSpacing: '-0.03em' }}>
              {activeId ? activeName : 'Saved for later.'}
            </h1>
          </div>
          <button className="btn btn-ghost" onClick={() => app.openModal('newcollection')}>
            <Icon name="plus" size={14} /> New collection
          </button>
        </div>

        {/* Mobile: collection picker as horizontal scroll chips */}
        <div className="bookmark-mobile-collections" style={{ display: 'none', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {collectionOptions.map(col => (
            <button key={col.id ?? '__all__'} onClick={() => setActiveId(col.id)}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: '1px solid', borderColor: activeId === col.id ? 'var(--green)' : 'var(--line)', background: activeId === col.id ? 'var(--green-tint)' : 'var(--surface)', color: activeId === col.id ? 'var(--green)' : 'var(--ink-2)', fontSize: 13, fontWeight: activeId === col.id ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <span>{col.emoji}</span> {col.name}
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)' }}>{col.id === null ? (counts.__all__ ?? 0) : (counts[col.id] ?? 0)}</span>
            </button>
          ))}
        </div>

        <div className="bookmark-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Collections sidebar — hidden on mobile */}
          <div className="bookmark-sidebar">
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '.05em' }}>COLLECTIONS</div>
            <button onClick={() => setActiveId(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 12px', borderRadius: 10, background: activeId === null ? 'var(--green-tint)' : 'transparent', border: 'none', color: activeId === null ? 'var(--green)' : 'var(--ink-2)', fontSize: 13, fontWeight: activeId === null ? 600 : 500, cursor: 'pointer', marginBottom: 2 }}>
              <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}><Icon name="bookmark" size={15} /> All bookmarks</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-3)' }}>{counts.__all__ ?? 0}</span>
            </button>
            {collections.map(col => {
              const active = activeId === col.id;
              return (
                <div key={col.id} style={{ position: 'relative' }} className="group">
                  <button onClick={() => setActiveId(col.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 12px', borderRadius: 10, background: active ? 'var(--green-tint)' : 'transparent', border: 'none', color: active ? 'var(--green)' : 'var(--ink-2)', fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer', marginBottom: 2 }}>
                    <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}><span style={{ fontSize: 15 }}>{col.emoji}</span> {col.name}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-3)' }}>{counts[col.id] ?? 0}</span>
                  </button>
                  <button onClick={() => handleDeleteCollection(col.id)} title="Delete collection" style={{ position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, opacity: 0, transition: 'opacity .15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}>
                    <Icon name="close" size={12} />
                  </button>
                </div>
              );
            })}
            {collections.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-3)', padding: '8px 12px', margin: 0 }}>No collections yet.</p>}
          </div>

          {/* Bookmark grid */}
          <div>
            {loading ? (
              <div className="bookmark-grid">
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ width: '60%', height: 12, borderRadius: 6, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                        <div style={{ width: '40%', height: 10, borderRadius: 6, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 100, borderRadius: 10, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--ink-3)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔖</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Nothing saved here yet</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Tap the bookmark icon on any post to save it.</div>
              </div>
            ) : (
              <div className="bookmark-grid">
                {posts.map((p: any) => <BookmarkPostCard key={p.id} post={p} onNav={onNav} />)}
              </div>
            )}
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
