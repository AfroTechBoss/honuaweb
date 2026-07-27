"use client";
import React from "react";
import { createPortal } from "react-dom";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { Toggle, ModalFoot, MProject, MArticle, MProduct, MCredit, MChallenge, MDiscussion, MBadge, MCelebrate, MWallet, MList, MCommunityAbout } from "./desktop-misc";
import { KpiCard } from "./impact";
import { logImpact, TASK_IMPACTS } from "@/lib/impact";


// =============== Desktop Forum / Communities ===============
const COMMUNITY_POSTS: Record<string, any[]> = {
  'Urban gardeners': [
    { title: 'Sharing my balcony irrigation schematic — feedback welcome', user: 'maya', time: '2h', replies: 24, votes: 42, kind: 'discussion' },
    { title: 'PSA: Aphids love nasturtiums — use them as a trap crop', user: 'sarah', time: '5h', replies: 41, votes: 68, kind: 'tip' },
    { title: 'Anyone in Brooklyn want to swap seedlings this weekend?', user: 'marcus', time: '8h', replies: 12, votes: 29, kind: 'meetup' },
    { title: 'Soil test results came back — silty loam, what should I plant?', user: 'tara', time: '1d', replies: 18, votes: 35, kind: 'question' },
    { title: 'Cherry tomato yield: 4.2 kg from 2 sq meters this season', user: 'okafor', time: '2d', replies: 78, votes: 91, kind: 'win' },
  ],
  'Solar DIY': [
    { title: 'My 400W off-grid van build — full wiring diagram', user: 'marcus', time: '3h', replies: 52, votes: 118, kind: 'discussion' },
    { title: 'Which MPPT controller for a 2-panel + LiFePO4 setup?', user: 'tara', time: '6h', replies: 33, votes: 47, kind: 'question' },
    { title: 'Battery degradation after 2 years — real data, not marketing', user: 'greentech', time: '1d', replies: 28, votes: 84, kind: 'tip' },
    { title: 'Weekend workshop in Portland — learn to wire your own panels', user: 'sarah', time: '2d', replies: 14, votes: 31, kind: 'meetup' },
    { title: 'Finally grid-independent — cost breakdown and lessons', user: 'can', time: '3d', replies: 97, votes: 203, kind: 'win' },
  ],
  'Ocean cleanup crew': [
    { title: 'Last weekend: 340 kg removed from Coogee beach', user: 'can', time: '1h', replies: 86, votes: 142, kind: 'win' },
    { title: 'How do we handle microplastics — current tech vs gaps', user: 'okafor', time: '4h', replies: 39, votes: 67, kind: 'discussion' },
    { title: 'Joining a cleanup — what to bring, what to expect', user: 'sarah', time: '9h', replies: 22, votes: 55, kind: 'tip' },
    { title: 'Data: which beach zones collect the most debris per hour?', user: 'marcus', time: '2d', replies: 18, votes: 43, kind: 'question' },
    { title: 'Monthly volunteer meet — Cape Town, August 3rd', user: 'maya', time: '3d', replies: 11, votes: 28, kind: 'meetup' },
  ],
  'Climate policy nerds': [
    { title: 'Analysis: the new EU carbon border tax — who wins?', user: 'okafor', time: '2h', replies: 44, votes: 89, kind: 'discussion' },
    { title: 'Submitting a public comment to EPA — step by step', user: 'can', time: '5h', replies: 31, votes: 76, kind: 'tip' },
    { title: 'What did COP30 actually deliver?', user: 'greentech', time: '1d', replies: 67, votes: 134, kind: 'discussion' },
    { title: 'Best primer on Article 6 carbon markets?', user: 'tara', time: '2d', replies: 19, votes: 38, kind: 'question' },
    { title: 'My city adopted a climate action plan — here\'s what I pushed for', user: 'sarah', time: '4d', replies: 28, votes: 62, kind: 'win' },
  ],
  'Zero-waste households': [
    { title: 'Grocery zero-waste: what I could and couldn\'t swap', user: 'sarah', time: '1h', replies: 33, votes: 78, kind: 'tip' },
    { title: 'Worm bin started smelling — what am I doing wrong?', user: 'marcus', time: '6h', replies: 41, votes: 29, kind: 'question' },
    { title: 'Monthly waste audit: down to a single sandwich bag', user: 'maya', time: '2d', replies: 54, votes: 116, kind: 'win' },
    { title: 'Bulk store map — crowd-sourcing stores by city', user: 'can', time: '3d', replies: 22, votes: 88, kind: 'discussion' },
    { title: 'Plastic-free bathroom: a 6-month review', user: 'tara', time: '5d', replies: 37, votes: 95, kind: 'tip' },
  ],
  'EV owners': [
    { title: 'Home charging setup cost in 2026 — real numbers', user: 'marcus', time: '2h', replies: 28, votes: 74, kind: 'discussion' },
    { title: 'Road trip: London → Edinburgh on one charge?', user: 'greentech', time: '5h', replies: 49, votes: 61, kind: 'question' },
    { title: 'Software update bricked my range — manufacturer response', user: 'tara', time: '1d', replies: 88, votes: 113, kind: 'discussion' },
    { title: 'Battery swap at 3 years — here\'s what I learned', user: 'sarah', time: '2d', replies: 33, votes: 86, kind: 'tip' },
    { title: 'My annual emissions vs ICE equivalent: 2.1t saved', user: 'okafor', time: '4d', replies: 14, votes: 59, kind: 'win' },
  ],
};

const COMMUNITY_META: Record<string, { desc: string; tags: string[]; resources: string[]; event?: { title: string; sub: string } }> = {
  'Urban gardeners': {
    desc: 'For anyone growing food, herbs, or pollinator habitat in cities. Beginners welcome. Be kind.',
    tags: ['#balcony', '#vertical-farm', '#pollinators', '#compost', '#tools'],
    resources: ['Starter guide for balcony growing', 'Tool library — borrow & lend', 'Soil testing — DIY', 'Pollinator-friendly plant list'],
    event: { title: 'Seedling swap · Saturday', sub: '14 members already going. Bring 5+ to share.' },
  },
  'Solar DIY': {
    desc: 'Practical solar for homes, vans, and off-grid builds. Share schematics, ask questions, celebrate wins.',
    tags: ['#offgrid', '#van-life', '#lifepo4', '#mppt', '#wiring'],
    resources: ['Beginner wiring guide', 'Panel sizing calculator', 'Battery chemistry explained', 'Inverter comparison 2026'],
    event: { title: 'Panel sizing workshop · Sunday', sub: 'Bring your consumption data and get sized right.' },
  },
  'Ocean cleanup crew': {
    desc: 'Volunteers, researchers, and policy advocates working to reduce ocean plastic. Data-driven. Action-first.',
    tags: ['#microplastics', '#beach-cleanup', '#marine-debris', '#citizen-science'],
    resources: ['Cleanup protocol guide', 'Debris tracking app', 'Grant finder for crews', 'Partner organisations'],
    event: { title: 'Global Beach Day · August 10', sub: '3,200 beaches, 60 countries. Register your site.' },
  },
  'Climate policy nerds': {
    desc: 'Deep dives into legislation, carbon markets, and advocacy. We read the fine print so you don\'t have to.',
    tags: ['#carbon-markets', '#legislation', '#cop', '#advocacy', '#un'],
    resources: ['Article 6 explainer', 'Public comment templates', 'Policy tracker dashboard', 'Reading list — 2026'],
  },
  'Zero-waste households': {
    desc: 'Practical tips for reducing household waste — from swaps to systems. No purity culture here.',
    tags: ['#bulk', '#compost', '#reusable', '#packaging', '#worm-bin'],
    resources: ['Zero-waste starter pack', 'Bulk store directory', 'Waste audit template', 'What actually gets recycled'],
    event: { title: 'Swap meetup · Aug 9', sub: 'Bring unwanted items, take what you need. Zero money changes hands.' },
  },
  'EV owners': {
    desc: 'Real talk about EV ownership: range, charging, costs, and the software that runs your car.',
    tags: ['#charging', '#range', '#battery', '#v2g', '#insurance'],
    resources: ['Home charger buying guide', 'Charging network map', 'Battery care tips', 'Software update tracker'],
  },
};

// ── @mention + #hashtag renderer ─────────────────────────────────────────────
const profileHoverCache: Record<string, any> = {};

function MentionHoverCard({ handle, onNav }: { handle: string; onNav: any }) {
  const [profile, setProfile] = React.useState<any>(profileHoverCache[handle] ?? null);
  React.useEffect(() => {
    if (profile) return;
    import('@/lib/supabase').then(async ({ supabase }) => {
      const { data } = await supabase.from('profiles').select('id, handle, full_name, avatar_url').eq('handle', handle).maybeSingle();
      if (!data) return;
      // followers_count / following_count aren't columns — count from follows
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', data.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', data.id),
      ]);
      const full = { ...data, followers_count: followers ?? 0, following_count: following ?? 0 };
      profileHoverCache[handle] = full; setProfile(full);
    });
  }, [handle]);
  if (!profile) return <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink-3)' }}>Loading…</div>;
  return (
    <div style={{ padding: '14px 16px', minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Avatar src={profile.avatar_url} name={profile.full_name} size={40} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{profile.full_name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{profile.handle}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-2)' }}>
        <span><b style={{ color: 'var(--ink)', fontFamily: 'JetBrains Mono' }}>{profile.followers_count ?? 0}</b> followers</span>
        <span><b style={{ color: 'var(--ink)', fontFamily: 'JetBrains Mono' }}>{profile.following_count ?? 0}</b> following</span>
      </div>
    </div>
  );
}

function MentionSpan({ handle, onNav }: { handle: string; onNav: any }) {
  const [hovered, setHovered] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const ref = React.useRef<HTMLSpanElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
    }
    timerRef.current = setTimeout(() => setHovered(true), 200);
  };
  const onLeave = () => { if (timerRef.current) clearTimeout(timerRef.current); setHovered(false); };

  return (
    <>
      <span ref={ref} onMouseEnter={onEnter} onMouseLeave={onLeave}
        onClick={e => { e.stopPropagation(); onNav?.('profile', { handle }); }}
        style={{ color: 'var(--sky)', fontWeight: 600, cursor: 'pointer' }}>@{handle}</span>
      {hovered && typeof document !== 'undefined' && document.body &&
        createPortal(
          <div onMouseEnter={() => setHovered(true)} onMouseLeave={onLeave}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,.18)', overflow: 'hidden' }}>
            <MentionHoverCard handle={handle} onNav={onNav} />
          </div>,
          document.body
        )
      }
    </>
  );
}

function renderContent(text: string, onNav: any): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(@\w+|#\w+)/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) return <MentionSpan key={i} handle={part.slice(1)} onNav={onNav} />;
    if (/^#\w+$/.test(part)) return <span key={i} style={{ color: 'var(--sky)', fontWeight: 500 }}>{part}</span>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ── Quote card (shown in feed and inside composer preview) ────────────────────
export function QuoteCard({ post, onNav, compact = false }: { post: any; post_id?: string; onNav: any; compact?: boolean }) {
  const profile = post.profiles ?? post.profile;
  const ago = (() => { const s = Math.floor((Date.now() - new Date(post.created_at).getTime()) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s/60)}m ago` : s < 86400 ? `${Math.floor(s/3600)}h ago` : `${Math.floor(s/86400)}d ago`; })();
  return (
    <div onClick={e => { e.stopPropagation(); onNav?.('post', { id: post.id }); }}
      style={{ border: '1px solid var(--line)', borderRadius: 12, padding: compact ? '10px 12px' : '12px 14px', cursor: 'pointer', background: 'var(--bg)', marginTop: compact ? 0 : 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <Avatar src={profile?.avatar_url} name={profile?.full_name} size={20} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{profile?.full_name}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{profile?.handle} · {ago}</span>
      </div>
      {post.title && <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{post.title}</p>}
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{post.content}</p>
      {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 8, maxHeight: 120, objectFit: 'cover', marginTop: 8 }} />}
    </div>
  );
}

function CommunityPostCard({ p, community, onNav, onReport }: { p: any; community: any; onNav: any; onReport: (p: any) => void }) {
  const app = useApp();
  const profile = p.profiles as any;
  const kind = p.post_kind || p.post_type || 'post';
  const kindColors: Record<string, string> = { tip: 'var(--green)', question: 'var(--sky)', win: '#f59e0b', discussion: 'var(--ink-2)', post: 'var(--ink-3)' };
  const kc = kindColors[kind] || 'var(--ink-3)';
  const ago = (() => { const s = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s/60)}m` : s < 86400 ? `${Math.floor(s/3600)}h` : `${Math.floor(s/86400)}d`; })();
  const liked = app.like?.has(p.id);
  const [likeCount, setLikeCount] = React.useState(p.likes_count ?? 0);
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [comments, setComments] = React.useState<any[]>([]);
  const [commentsLoaded, setCommentsLoaded] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [replyImageFile, setReplyImageFile] = React.useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = React.useState<string | null>(null);
  const replyImgRef = React.useRef<HTMLInputElement>(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [bookmarkOpen, setBookmarkOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [bookmarked, setBookmarked] = React.useState(false);
  const shareRef = React.useRef<HTMLDivElement>(null);
  const bookmarkRef = React.useRef<HTMLDivElement>(null);
  const moreRef = React.useRef<HTMLDivElement>(null);
  const collections: any[] = app.collections ?? [];

  // close popovers on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
      if (bookmarkRef.current && !bookmarkRef.current.contains(e.target as Node)) setBookmarkOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // check if already bookmarked
  React.useEffect(() => {
    if (!app.user?.id) return;
    import('@/lib/bookmarks').then(({ getBookmarkedPostIds }) =>
      getBookmarkedPostIds(app.user!.id).then(ids => setBookmarked(ids.includes(p.id)))
    );
  }, [p.id, app.user?.id]);

  const handleLike = () => {
    if (!app.user?.id) return;
    const wasLiked = app.like?.has(p.id);
    app.like?.toggle(p.id);
    setLikeCount((c: number) => c + (wasLiked ? -1 : 1));
  };

  const toggleComments = async () => {
    setCommentOpen(o => !o);
    if (!commentsLoaded) {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.from('comments').select('*, profiles!comments_user_id_fkey(full_name, handle, avatar_url)').eq('post_id', p.id).order('created_at', { ascending: true });
      setComments(data ?? []);
      setCommentsLoaded(true);
    }
  };

  const submitReply = async () => {
    if (!replyText.trim() && !replyImageFile) return;
    if (!app.user?.id) return;
    const { supabase } = await import('@/lib/supabase');
    let image_url: string | null = null;
    if (replyImageFile) {
      const { uploadFile } = await import('@/lib/storage');
      image_url = await uploadFile('comments', app.user.id, replyImageFile);
    }
    const { data } = await supabase.from('comments').insert({ post_id: p.id, user_id: app.user.id, content: replyText.trim(), image_url }).select('*, profiles!comments_user_id_fkey(full_name, handle, avatar_url)').single();
    if (data) { setComments(c => [...c, data]); setReplyText(''); setReplyImageFile(null); setReplyImagePreview(null); }
  };

  const bookmarkToCollection = async (collectionId?: string) => {
    if (!app.user?.id) return;
    const { addBookmark, removeBookmark } = await import('@/lib/bookmarks');
    if (bookmarked && !collectionId) { await removeBookmark(app.user.id, p.id); setBookmarked(false); app.toast?.({ msg: 'Bookmark removed', icon: 'bookmark' }); }
    else { await addBookmark(app.user.id, p.id, collectionId); setBookmarked(true); app.toast?.({ msg: collectionId ? 'Added to collection!' : 'Bookmarked!', icon: 'bookmark', kind: 'success' }); }
    setBookmarkOpen(false);
  };

  const postUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/communities/post/${encodeURIComponent(community.slug || community.name)}/${p.id}`;
  const truncatedContent = (() => { const words = (p.content ?? '').split(/\s+/); return words.length > 50 ? words.slice(0, 50).join(' ') + '…' : p.content; })();

  const popoverStyle: React.CSSProperties = { position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 50, minWidth: 180, overflow: 'hidden' };
  const popItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--ink-2)', background: 'none', border: 'none', width: '100%', textAlign: 'left' };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', marginBottom: 10, overflow: 'visible' }}>
      {/* Card body — clickable to navigate */}
      <div className="row-hover" onClick={() => onNav?.('post', { id: p.id, slug: community.slug || community.name })} style={{ padding: 16, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {kind !== 'post' && <span style={{ background: kc + '20', color: kc, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700, textTransform: 'uppercase' }}>{kind}</span>}
          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{profile ? `@${profile.handle}` : 'unknown'} · {ago}</span>
          <span style={{ flex: 1 }} />
          {/* More menu */}
          <div ref={moreRef} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setMoreOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: '2px 6px', borderRadius: 6, fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center' }}>···</button>
            {moreOpen && (
              <div style={popoverStyle}>
                <button style={popItemStyle} onClick={() => { navigator.clipboard.writeText(postUrl); app.toast?.({ msg: 'Link copied!', icon: 'check', kind: 'success' }); setMoreOpen(false); }}><Icon name="share" size={14} /> Copy link</button>
                <button style={{ ...popItemStyle, color: 'var(--clay)' }} onClick={() => { setMoreOpen(false); onReport(p); }}><Icon name="flag" size={14} /> Report post</button>
              </div>
            )}
          </div>
        </div>
        {p.title && <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.4 }}>{p.title}</p>}
        <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.55, color: p.title ? 'var(--ink-2)' : 'var(--ink)' }}>{renderContent(truncatedContent, onNav)}</p>
        {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 300, objectFit: 'cover' }} />}
        {p.quote_post && <QuoteCard post={p.quote_post} onNav={onNav} />}
      </div>

      {/* Action bar */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, fontSize: 12, color: 'var(--ink-3)', alignItems: 'center', padding: '0 12px 12px', position: 'relative' }}>
        <ActionBtn icon="heart" count={likeCount} active={liked} activeColor="var(--clay)" onClick={handleLike} />
        <ActionBtn icon="comment" count={p.comments_count} onClick={toggleComments} />
        <span style={{ flex: 1 }} />
        {/* Share popover */}
        <div ref={shareRef} style={{ position: 'relative' }}>
          <button onClick={() => setShareOpen(o => !o)} title="Share" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 6, display: 'inline-flex', alignItems: 'center', borderRadius: 8 }}>
            <Icon name="share" size={14} />
          </button>
          {shareOpen && (
            <div style={popoverStyle}>
              <button style={popItemStyle} onClick={() => { navigator.clipboard.writeText(postUrl); app.toast?.({ msg: 'Link copied!', icon: 'check', kind: 'success' }); setShareOpen(false); }}><Icon name="share" size={14} /> Copy link</button>
              {app.user?.id && (
                <button style={popItemStyle} onClick={async () => { setShareOpen(false); try { const { createStory } = await import('@/lib/stories'); await createStory({ userId: app.user!.id, type: 'post', postId: p.id }); app.toast?.({ msg: 'Added to your story', icon: 'sparkles', kind: 'success' }); } catch { app.toast?.({ msg: 'Failed to share story', icon: 'wifiOff', kind: 'error' }); } }}><Icon name="sparkles" size={14} /> Share to story</button>
              )}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button style={popItemStyle} onClick={() => { navigator.share?.({ title: p.title || p.content?.slice(0, 60), url: postUrl }); setShareOpen(false); }}><Icon name="external" size={14} /> Share via…</button>
              )}
            </div>
          )}
        </div>
        {/* Bookmark popover */}
        <div ref={bookmarkRef} style={{ position: 'relative' }}>
          <button onClick={() => setBookmarkOpen(o => !o)} title="Bookmark" style={{ background: 'none', border: 'none', cursor: 'pointer', color: bookmarked ? 'var(--green)' : 'var(--ink-3)', padding: 6, display: 'inline-flex', alignItems: 'center', borderRadius: 8 }}>
            <Icon name="bookmark" size={14} />
          </button>
          {bookmarkOpen && (
            <div style={popoverStyle}>
              <button style={popItemStyle} onClick={() => bookmarkToCollection()}>{bookmarked ? '✕ Remove bookmark' : '🔖 Save to bookmarks'}</button>
              {collections.length > 0 && <div style={{ borderTop: '1px solid var(--line)', padding: '6px 0' }}>
                <div style={{ padding: '4px 14px 6px', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', letterSpacing: '.04em' }}>COLLECTIONS</div>
                {collections.map((c: any) => (
                  <button key={c.id} style={popItemStyle} onClick={() => bookmarkToCollection(c.id)}>📁 {c.name}</button>
                ))}
              </div>}
            </div>
          )}
        </div>
      </div>

      {/* Inline comment drop-down */}
      {commentOpen && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '12px 16px 14px', background: 'var(--bg)' }}>
          {!commentsLoaded ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : comments.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No replies yet. Be first!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {comments.map((c: any) => {
                const cp = c.profiles as any;
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Avatar src={cp?.avatar_url} name={cp?.full_name} size={26} />
                    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '7px 10px', flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{cp?.full_name ?? 'Unknown'} <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontFamily: 'JetBrains Mono' }}>@{cp?.handle}</span></div>
                      {c.content && <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)' }}>{renderContent(c.content, onNav)}</div>}
                      {c.image_url && <img src={c.image_url} alt="" style={{ width: '100%', borderRadius: 8, maxHeight: 160, objectFit: 'cover', marginTop: 6 }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {app.user && (
            <div>
              {replyImagePreview && (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <img src={replyImagePreview} style={{ width: '100%', borderRadius: 8, maxHeight: 140, objectFit: 'cover' }} />
                  <button onClick={() => { setReplyImageFile(null); setReplyImagePreview(null); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff', fontSize: 12 }}>✕</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <Avatar src={app.profile?.avatar_url} name={app.profile?.full_name} size={26} />
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
                  placeholder="Write a reply…" className="fld" style={{ flex: 1, resize: 'none', fontSize: 13, minHeight: 38, padding: '8px 10px' }} rows={1} />
                <input ref={replyImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setReplyImageFile(f); setReplyImagePreview(URL.createObjectURL(f)); } }} />
                <button onClick={() => replyImgRef.current?.click()} title="Attach image" style={{ background: replyImageFile ? 'var(--green-tint)' : 'transparent', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: replyImageFile ? 'var(--green)' : 'var(--ink-3)', flexShrink: 0 }}>
                  <Icon name="image" size={16} />
                </button>
                <button onClick={submitReply} disabled={!replyText.trim() && !replyImageFile} className="btn btn-primary" style={{ fontSize: 12, padding: '7px 14px', flexShrink: 0 }}>Reply</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommunityFeed({ community: communityProp, onNav, onToggleJoin }: { community: any; onNav?: any; onToggleJoin?: (c: any) => void }) {
  const app = useApp();
  const [community, setCommunity] = React.useState(communityProp);
  React.useEffect(() => { setCommunity(communityProp); }, [communityProp]);
  const [feedTab, setFeedTab] = React.useState('Recent');
  const [realPosts, setRealPosts] = React.useState<any[]>([]);
  const joined = app.community?.has(community.name);
  const meta = COMMUNITY_META[community.name] || { desc: '', tags: [], resources: [] };
  const going = app.community?.has(community.name + '-event');

  const [migrationPending, setMigrationPending] = React.useState(false);
  // null | true (report the community) | { type, targetId } (report a specific post)
  const [reportOpen, setReportOpen] = React.useState<any>(null);
  const isOwner = community.createdBy === app.user?.id || community.created_by === app.user?.id;

  const fetchPosts = React.useCallback(async (supabase: any) => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, content, created_at, post_type, post_kind, image_url, likes_count, comments_count, profiles!posts_user_id_fkey(full_name, handle, avatar_url)')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setMigrationPending(true);
    } else {
      setMigrationPending(false);
      setRealPosts(data ?? []);
    }
  }, [community.id]);

  React.useEffect(() => {
    if (!community.id) return;
    let channel: any;
    import('@/lib/supabase').then(async ({ supabase }) => {
      await fetchPosts(supabase);
      // Realtime: listen for new posts in this community
      channel = supabase
        .channel(`community-posts-${community.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `community_id=eq.${community.id}`,
        }, async () => {
          // Re-fetch to get the full post with profile join
          await fetchPosts(supabase);
        })
        .subscribe();
    });
    return () => { channel?.unsubscribe?.(); };
  }, [community.id, fetchPosts]);
  const kindColor = (k: string) => ({ discussion: 'var(--sky)', tip: 'var(--green)', meetup: 'var(--sun)', question: 'var(--ink-2)', win: 'var(--green)' }[k] || 'var(--ink-3)');

  const sorted = feedTab === 'Top' ? [...realPosts].sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0)) : realPosts;
  const filtered = feedTab === 'Resources' ? [] : sorted;

  return (
    <div style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
      {/* Cover + avatar overlap */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ height: 180, background: community.coverUrl ? `url(${community.coverUrl}) center/cover` : 'var(--green-tint)' }} />
        {/* Avatar sits half-out of the cover at the bottom-left */}
        <div style={{ position: 'absolute', bottom: -40, left: 28, width: 80, height: 80, borderRadius: 18, background: community.avatarUrl ? `url(${community.avatarUrl}) center/cover` : 'var(--green)', border: '4px solid var(--bg)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 34, fontFamily: 'Lora', fontWeight: 600, zIndex: 2 }}>
          {!community.avatarUrl && community.name.charAt(0)}
        </div>
      </div>

      <div style={{ padding: '0 28px', maxWidth: 900 }}>
        {/* Header row: name + action button — pushed down to clear the avatar */}
        <div className="community-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 52, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{community.name}</h1>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{community.members} members · {community.cat}</div>
            {community.description && <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: 560 }}>{community.description}</p>}
          </div>
          {community.createdBy === app.user?.id ? (
            <button className="btn btn-ghost" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => app.openModal?.('editcommunity', { community, onSaved: (updated: any) => setCommunity(updated) })}>
              <Icon name="edit" size={14} /> Edit
            </button>
          ) : (
            <button className={joined ? 'btn btn-primary' : 'btn btn-green'} style={{ flexShrink: 0 }} onClick={() => onToggleJoin ? onToggleJoin(community) : (app.community.toggle(community.name), app.toast(joined ? { msg: `Left ${community.name}`, icon: 'users' } : { msg: `Joined ${community.name}!`, kind: 'success', icon: 'users' }))}>
              {joined ? 'Joined ✓' : 'Join'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, margin: '18px 0', flexWrap: 'wrap' }}>
          {meta.tags.map(t => <span key={t} style={{ color: 'var(--sky)', fontSize: 13, fontWeight: 500 }}>{t}</span>)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, paddingBottom: 40 }} className="two-col-grid">
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="pill-nav">
                {['Recent', 'Top', 'Q&A', 'Resources', ...(isOwner ? ['Reports'] : [])].map(t => (
                  <button key={t} className={feedTab === t ? 'active' : ''} onClick={() => setFeedTab(t)}>{t}</button>
                ))}
              </div>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 12px', flexShrink: 0 }} onClick={() => app.openModal?.('compose', { community: community.name, communityId: community.id, communityAvatar: community.avatarUrl })}>
                <Icon name="plus" size={13} /> Post
              </button>
            </div>

            {feedTab === 'Reports' && isOwner ? (
              <CommunityReportsPanel communityId={community.id} ownerId={app.user?.id} />
            ) : migrationPending ? (
              <div style={{ padding: '24px 20px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ Database migration needed</div>
                <div style={{ marginBottom: 10 }}>Community posts require two SQL migrations to be run in <strong>Supabase Dashboard → SQL Editor</strong>.</div>
                <pre style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 11, fontFamily: 'JetBrains Mono', overflowX: 'auto', margin: 0, color: '#78350f' }}>{`-- Migration 007: link posts to communities
alter table posts add column if not exists community_id uuid references communities(id) on delete set null;
create index if not exists posts_community_id_idx on posts(community_id);

-- Migration 008: post kind badge
alter table posts add column if not exists post_kind text check (post_kind in ('tip','question','win','discussion'));`}</pre>
                <div style={{ marginTop: 10, color: '#78350f' }}>After running both, refresh this page and your posts will appear.</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No posts yet. Be the first to post!</div>
            ) : (
              filtered.map((p) => (
                <CommunityPostCard key={p.id} p={p} community={community} onNav={onNav} onReport={(post) => setReportOpen({ type: 'comment', targetId: post.id })} />
              ))
            )}
          </div>

          <div className="right-panel">
            <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 16, marginBottom: 12 }}>
              <h3 className="font-display" style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>About</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>{meta.desc}</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <Stat n={community.members} l="Members" />
                <Stat n={String(realPosts.reduce((s, p) => s + (p.comments_count ?? 0), 0))} l="Replies" />
              </div>
              {!isOwner && (
                <button onClick={() => setReportOpen(true)} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 12, padding: 0 }}>
                  <Icon name="flag" size={13} /> Report community
                </button>
              )}
            </div>
            {reportOpen && community.id && (
              <ReportModal
                type={typeof reportOpen === 'object' ? reportOpen.type : 'community'}
                targetId={typeof reportOpen === 'object' ? reportOpen.targetId : community.id}
                communityId={community.id}
                onClose={() => setReportOpen(null)}
              />
            )}
            {meta.resources.length > 0 && (
              <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 16, marginBottom: 12 }}>
                <h3 className="font-display" style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600 }}>Pinned resources</h3>
                {meta.resources.slice(0, 3).map((r, i) => (
                  <a key={i} onClick={() => app.toast?.({ msg: r, sub: 'Resource would open here.', icon: 'bookmark' })} style={{ display: 'block', padding: '8px 0', fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>{r}</a>
                ))}
              </div>
            )}
            {meta.event && (
              <div style={{ background: 'var(--green)', color: '#fff', borderRadius: 14, padding: 16 }}>
                <h3 className="font-display" style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>{meta.event.title}</h3>
                <p style={{ margin: '0 0 12px', fontSize: 13, opacity: .9 }}>{meta.event.sub}</p>
                <button className="btn" style={{ background: '#fff', color: 'var(--green)', padding: '6px 12px', fontSize: 12 }} onClick={() => { app.community.toggle(community.name + '-event'); app.toast(going ? { msg: 'RSVP cancelled', icon: 'close' } : { msg: "You're going!", sub: meta.event!.title, kind: 'success', icon: 'check' }); }}>{going ? 'Going ✓' : "I'm going →"}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Report modal (community or comment) ──────────────────────────────────
const REPORT_REASONS_COMMUNITY = ['Spam or self-promotion', 'Hate speech or discrimination', 'Misinformation', 'Harassment or bullying', 'Inappropriate content', 'Other'];
const REPORT_REASONS_COMMENT   = ['Spam', 'Harassment or bullying', 'Hate speech', 'Misinformation', 'Off-topic', 'Other'];

function ReportModal({ type, targetId, communityId, onClose }: { type: 'community' | 'comment'; targetId: string; communityId?: string; onClose: () => void }) {
  const app = useApp();
  const reasons = type === 'community' ? REPORT_REASONS_COMMUNITY : REPORT_REASONS_COMMENT;
  const [reason, setReason] = React.useState('');
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const submit = async () => {
    if (!reason || !app.user?.id) return;
    setSubmitting(true);
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('community_reports').insert({
      type,
      reason,
      note: note.trim() || null,
      community_id: communityId ?? null,
      comment_id: type === 'comment' ? targetId : null,
      reporter_id: app.user.id,
    });
    setDone(true);
    setSubmitting(false);
    setTimeout(onClose, 1600);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,.25)', margin: '0 16px' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Report submitted</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
              {type === 'community' ? 'Our team will review this community.' : 'The community owner has been notified.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Report {type === 'community' ? 'this community' : 'this reply'}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>
              {type === 'community' ? 'Reports go to our admin team for review.' : 'The community owner will review this first. They can escalate to admin if needed.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {reasons.map(r => (
                <button key={r} onClick={() => setReason(r)} style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, border: '1px solid', borderColor: reason === r ? 'var(--green)' : 'var(--line)', background: reason === r ? 'var(--green-tint)' : 'transparent', color: reason === r ? 'var(--green)' : 'var(--ink-2)', fontSize: 14, cursor: 'pointer', fontWeight: reason === r ? 600 : 400, transition: 'all .12s' }}>
                  {r}
                </button>
              ))}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add context (optional)…" className="fld" style={{ width: '100%', minHeight: 72, resize: 'vertical', marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button className="btn btn-green" onClick={submit} disabled={!reason || submitting} style={{ flex: 1, justifyContent: 'center', opacity: reason ? 1 : .5 }}>
                {submitting ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Community owner reports panel ─────────────────────────────────────────
function CommunityReportsPanel({ communityId, ownerId }: { communityId: string; ownerId: string }) {
  const app = useApp();
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'pending' | 'owner_actioned' | 'escalated' | 'all'>('pending');

  const load = React.useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase
      .from('community_reports')
      .select('*, reporter:reporter_id(full_name, handle, avatar_url), comment:comment_id(content, user_id, profiles!comments_user_id_fkey(full_name, handle))')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  }, [communityId]);

  React.useEffect(() => { if (app.user?.id === ownerId) load(); }, [load, app.user?.id, ownerId]);

  const act = async (id: string, action: 'deleted' | 'warned' | 'dismissed' | 'escalated') => {
    const { supabase } = await import('@/lib/supabase');
    const newStatus = action === 'escalated' ? 'escalated' : 'owner_actioned';
    await supabase.from('community_reports').update({ owner_action: action, status: newStatus, owner_actioned_at: new Date().toISOString() }).eq('id', id);
    setReports(rs => rs.map(r => r.id === id ? { ...r, owner_action: action, status: newStatus } : r));
    app.toast?.({ msg: action === 'escalated' ? 'Escalated to admin' : `Marked as ${action}`, icon: 'check', kind: 'success' });
  };

  if (app.user?.id !== ownerId) return null;

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const statusColor: Record<string, string> = { pending: 'var(--sun)', owner_actioned: 'var(--green)', escalated: 'var(--clay)', admin_resolved: 'var(--ink-3)', dismissed: 'var(--ink-3)' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['pending', 'owner_actioned', 'escalated', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={'chip' + (filter === f ? ' chip-green' : '')} style={{ cursor: 'pointer', fontSize: 12 }}>
            {f === 'owner_actioned' ? 'Actioned' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && reports.filter(r => r.status === 'pending').length > 0 && (
              <span style={{ marginLeft: 4, background: 'var(--clay)', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontFamily: 'JetBrains Mono' }}>
                {reports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 14, padding: 20 }}>Loading reports…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🛡️</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>No {filter === 'all' ? '' : filter} reports</div>
        </div>
      ) : filtered.map((r: any) => {
        const comment = r.comment as any;
        const commentProfile = comment?.profiles as any;
        const reporter = r.reporter as any;
        const ago = (() => { const s = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 1000); return s < 3600 ? `${Math.floor(s/60)}m ago` : s < 86400 ? `${Math.floor(s/3600)}h ago` : `${Math.floor(s/86400)}d ago`; })();
        return (
          <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[r.status] ?? 'var(--ink-3)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clay)', flex: 1 }}>{r.reason}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{ago}</span>
            </div>
            {comment?.content && (
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, borderLeft: '3px solid var(--line)', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>@{commentProfile?.handle ?? '?'}</div>
                {comment.content}
              </div>
            )}
            {r.note && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: 10 }}>"{r.note}"</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: r.status === 'pending' ? 12 : 0 }}>
              <Avatar src={reporter?.avatar_url} name={reporter?.full_name} size={20} />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Reported by @{reporter?.handle}</span>
              <span style={{ marginLeft: 'auto' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: (statusColor[r.status] ?? 'var(--ink-3)') + '18', color: statusColor[r.status] ?? 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                  {r.status.replace('_', ' ')}
                </span>
              </span>
            </div>
            {r.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px', color: 'var(--clay)', borderColor: 'var(--clay)20' }} onClick={() => act(r.id, 'deleted')}>Remove reply</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => act(r.id, 'warned')}>Warn author</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => act(r.id, 'dismissed')}>Dismiss</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px', color: 'var(--ink-3)' }} onClick={() => act(r.id, 'escalated')}>↑ Escalate to admin</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Dedicated community post detail — distinct from the global post page
export function CommunityPostDetail({ slug, postId, onNav }: { slug: string; postId: string; onNav: any }) {
  const app = useApp();
  const [post, setPost] = React.useState<any>(null);
  const [community, setCommunity] = React.useState<any>(null);
  const [comments, setComments] = React.useState<any[]>([]);
  const [reply, setReply] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  const [liked, setLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(0);
  const [bookmarked, setBookmarked] = React.useState(false);
  const [reportTarget, setReportTarget] = React.useState<{ commentId: string; communityId: string } | null>(null);

  // Load post + community
  React.useEffect(() => {
    if (!postId) return;
    import('@/lib/supabase').then(async ({ supabase }) => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from('posts').select('*, profiles!posts_user_id_fkey(full_name, handle, avatar_url)').eq('id', postId).single(),
        supabase.from('communities').select('id, name, slug, cover_url, avatar_url, category').or(`slug.eq.${slug},name.eq.${decodeURIComponent(slug)}`).maybeSingle(),
      ]);
      if (p) {
        setPost(p); setLikeCount(p.likes_count ?? 0);
        if (app.user?.id) {
          const { getBookmarkedPostIds } = await import('@/lib/bookmarks');
          const ids = await getBookmarkedPostIds(app.user.id);
          setBookmarked(ids.includes(p.id));
        }
      }
      if (c) setCommunity(c);
    });
  }, [postId, slug]);

  // Load + subscribe to comments
  const loadComments = React.useCallback(async (supabase: any) => {
    const { data } = await supabase.from('comments')
      .select('*, profiles!comments_user_id_fkey(full_name, handle, avatar_url)')
      .eq('post_id', postId).order('created_at', { ascending: true });
    setComments(data ?? []);
  }, [postId]);

  React.useEffect(() => {
    if (!postId) return;
    let ch: any;
    import('@/lib/supabase').then(async ({ supabase }) => {
      await loadComments(supabase);
      ch = supabase.channel(`cp-comments-${postId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
          () => loadComments(supabase))
        .subscribe();
    });
    return () => { ch?.unsubscribe?.(); };
  }, [postId, loadComments]);

  const submitReply = async () => {
    if (!reply.trim() || !app.user?.id) return;
    setPosting(true);
    const text = reply.trim();
    setReply('');
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('comments').insert({ post_id: postId, user_id: app.user.id, content: text });
    setPosting(false);
  };

  const toggleLike = async () => {
    if (!app.user?.id) return;
    const { supabase } = await import('@/lib/supabase');
    if (liked) {
      setLiked(false); setLikeCount(n => n - 1);
      await supabase.from('post_likes').delete().match({ post_id: postId, user_id: app.user.id });
    } else {
      setLiked(true); setLikeCount(n => n + 1);
      await supabase.from('post_likes').insert({ post_id: postId, user_id: app.user.id });
    }
  };

  const profile = post?.profiles as any;
  const kindColors: Record<string, string> = { tip: 'var(--green)', question: 'var(--sky)', win: '#f59e0b', discussion: 'var(--ink-2)' };
  const kind = post?.post_kind;
  const ago = post ? (() => { const s = Math.floor((Date.now() - new Date(post.created_at).getTime()) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s/60)}m ago` : s < 86400 ? `${Math.floor(s/3600)}h ago` : `${Math.floor(s/86400)}d ago`; })() : '';

  const loading = !post;

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <style>{`
        @keyframes cpSkelPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        .cp-skel { background:var(--line); border-radius:6px; animation:cpSkelPulse 1.5s ease-in-out infinite; }
        .cp-sidebar { display:flex; }
        .cp-main { flex:1; overflow:auto; height:100%; }
        .cp-banner { position:relative; height:72px; }
        .cp-content { max-width:680px; margin:0 auto; padding:28px 20px 80px; }
        @media(max-width:680px){
          .cp-sidebar { display:none; }
          .cp-banner { height:90px; }
          .cp-content { padding:16px 12px 100px; }
          .cp-post-card { padding:16px 14px 14px !important; border-radius:14px !important; }
          .cp-reply-box { padding:12px !important; border-radius:12px !important; }
          .cp-reply-box textarea { min-height:60px !important; }
          .cp-comment-row { gap:8px !important; }
        }
      `}</style>
      <div className="cp-sidebar"><DesktopSidebar active="forum" onNav={onNav} /></div>
      <main className="cp-main no-scrollbar">
        {/* Community banner strip — shown while loading too (skeleton) or real */}
        <div className="cp-banner" style={{ background: (!loading && community?.cover_url) ? `url(${community.cover_url}) center/cover` : 'var(--green)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14 }}>
            {loading ? (
              <>
                <div className="cp-skel" style={{ width: 120, height: 32, borderRadius: 8 }} />
                <div className="cp-skel" style={{ width: 80, height: 14, borderRadius: 4, opacity: .6 }} />
              </>
            ) : community ? (
              <>
                <button onClick={() => onNav?.('communities', { slug })} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 500, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ← {community.name}
                </button>
                <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 12 }}>·</span>
                <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 12, fontFamily: 'JetBrains Mono' }}>Community post</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="cp-content">
          {loading ? (
            /* ── Skeleton ─────────────────────────────────── */
            <>
              {/* Post card skeleton */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: '24px 24px 20px', marginBottom: 16 }}>
                <div className="cp-skel" style={{ width: 56, height: 20, marginBottom: 18 }} />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
                  <div className="cp-skel" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="cp-skel" style={{ width: '38%', height: 14 }} />
                    <div className="cp-skel" style={{ width: '22%', height: 11 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  <div className="cp-skel" style={{ width: '95%', height: 14 }} />
                  <div className="cp-skel" style={{ width: '88%', height: 14 }} />
                  <div className="cp-skel" style={{ width: '72%', height: 14 }} />
                </div>
                <div style={{ display: 'flex', gap: 20, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                  <div className="cp-skel" style={{ width: 48, height: 14 }} />
                  <div className="cp-skel" style={{ width: 60, height: 14 }} />
                </div>
              </div>
              {/* Reply box skeleton */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div className="cp-skel" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="cp-skel" style={{ width: '100%', height: 72, borderRadius: 8 }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div className="cp-skel" style={{ width: 64, height: 32, borderRadius: 8 }} />
                  </div>
                </div>
              </div>
              {/* Comment rows skeleton */}
              <div className="cp-skel" style={{ width: 60, height: 11, marginBottom: 14 }} />
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '16px 0', borderTop: '1px solid var(--line)' }}>
                  <div className="cp-skel" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div className="cp-skel" style={{ width: `${28 + i * 6}%`, height: 13 }} />
                      <div className="cp-skel" style={{ width: '16%', height: 11 }} />
                    </div>
                    <div className="cp-skel" style={{ width: `${70 + i * 5}%`, height: 13 }} />
                    {i === 2 && <div className="cp-skel" style={{ width: '55%', height: 13 }} />}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Post */}
              <div className="cp-post-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: '24px 24px 20px', marginBottom: 16 }}>
                {/* Kind badge */}
                {kind && <span style={{ background: (kindColors[kind] ?? 'var(--ink-3)') + '20', color: kindColors[kind] ?? 'var(--ink-3)', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 700, textTransform: 'uppercase', display: 'inline-block', marginBottom: 14 }}>{kind}</span>}

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Avatar src={profile?.avatar_url} name={profile?.full_name} size={44} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{profile?.full_name ?? 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{profile?.handle} · {ago}</div>
                  </div>
                </div>

                {/* Content */}
                {post.title && <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, lineHeight: 1.3, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{post.title}</h1>}
                <p style={{ margin: '0 0 16px', fontSize: 16, lineHeight: 1.65, color: post.title ? 'var(--ink-2)' : 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</p>
                {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 400, objectFit: 'cover' }} />}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 20, paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 14, color: 'var(--ink-3)', alignItems: 'center' }}>
                  <button onClick={toggleLike} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: liked ? 'var(--clay)' : 'var(--ink-3)', fontSize: 14, fontWeight: liked ? 600 : 400, padding: 0 }}>
                    <Icon name="heart" size={17} /> {likeCount}
                  </button>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="comment" size={17} /> {comments.length} {comments.length === 1 ? 'reply' : 'replies'}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => { const url = `${window.location.origin}/communities/post/${encodeURIComponent(slug)}/${postId}`; navigator.clipboard.writeText(url); app.toast?.({ msg: 'Link copied!', icon: 'check', kind: 'success' }); }} title="Copy link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, padding: 0 }}>
                    <Icon name="share" size={16} /> Share
                  </button>
                  <button onClick={async () => { const { addBookmark, removeBookmark } = await import('@/lib/bookmarks'); if (!app.user?.id) return; if (bookmarked) { await removeBookmark(app.user.id, postId); setBookmarked(false); app.toast?.({ msg: 'Removed from bookmarks', icon: 'bookmark' }); } else { await addBookmark(app.user.id, postId); setBookmarked(true); app.toast?.({ msg: 'Bookmarked!', icon: 'bookmark', kind: 'success' }); } }} title="Bookmark" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: bookmarked ? 'var(--green)' : 'var(--ink-3)', fontSize: 13, fontWeight: bookmarked ? 600 : 400, padding: 0 }}>
                    <Icon name="bookmark" size={16} /> {bookmarked ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Reply box */}
              <div className="cp-reply-box" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Avatar src={app.user?.avatar} name={app.user?.name || 'You'} size={36} />
                <div style={{ flex: 1 }}>
                  <textarea value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply(); }}
                    placeholder="Share your thoughts in this community…"
                    className="fld" style={{ width: '100%', minHeight: 72, resize: 'vertical', marginBottom: 10 }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-green" onClick={submitReply} disabled={!reply.trim() || posting} style={{ opacity: reply.trim() ? 1 : .5 }}>
                      {posting ? 'Posting…' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.06em', marginBottom: 12 }}>
                {comments.length} {comments.length === 1 ? 'REPLY' : 'REPLIES'}
              </div>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: 14 }}>No replies yet. Start the conversation.</div>
              ) : comments.map((c: any) => {
                const cp = c.profiles as any;
                const cage = (() => { const s = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s/60)}m` : s < 86400 ? `${Math.floor(s/3600)}h` : `${Math.floor(s/86400)}d`; })();
                return (
                  <div key={c.id} className="cp-comment-row" style={{ display: 'flex', gap: 12, padding: '16px 0', borderTop: '1px solid var(--line)' }}>
                    <Avatar src={cp?.avatar_url} name={cp?.full_name} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{cp?.full_name ?? 'Member'}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{cp?.handle} · {cage}</span>
                        {app.user?.id && c.user_id !== app.user.id && (
                          <button onClick={() => setReportTarget({ commentId: c.id, communityId: community?.id ?? '' })} title="Report reply" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, display: 'inline-flex', opacity: .6 }}>
                            <Icon name="flag" size={13} />
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
        {reportTarget && (
          <ReportModal
            type="comment"
            targetId={reportTarget.commentId}
            communityId={reportTarget.communityId}
            onClose={() => setReportTarget(null)}
          />
        )}
      </main>
    </div>
  );
}

// Standalone page for /communities/[slug]
export function CommunityFeedPage({ slug, onNav }: { slug: string; onNav: any }) {
  const app = useApp();
  const [community, setCommunity] = React.useState<any>(null);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;
    import('@/lib/supabase').then(async ({ supabase }) => {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, slug, description, cover_url, avatar_url, category, member_count, created_by')
        .or(`slug.eq.${slug},name.eq.${decodeURIComponent(slug)}`)
        .maybeSingle();
      if (error || !data) { setNotFound(true); return; }
      setCommunity({
        id: data.id, name: data.name, members: data.member_count ?? 0,
        cat: data.category ?? 'Community', coverUrl: data.cover_url ?? '',
        avatarUrl: data.avatar_url ?? '', createdBy: data.created_by,
        description: data.description,
      });
    });
  }, [slug]);

  const handleToggleJoin = async (c: any) => {
    const isJoined = app.community?.has(c.name);
    app.community.toggle(c.name);
    if (c.id && app.user?.id) {
      const { supabase } = await import('@/lib/supabase');
      if (isJoined) await supabase.from('community_members').delete().match({ community_id: c.id, user_id: app.user.id });
      else await supabase.from('community_members').insert({ community_id: c.id, user_id: app.user.id });
    }
  };

  if (notFound) return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="forum" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--ink-3)' }}>
        <div style={{ fontSize: 40 }}>🌿</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Community not found</div>
        <button className="btn btn-ghost" onClick={() => onNav?.('forum')}>← Back to communities</button>
      </main>
    </div>
  );

  if (!community) return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="forum" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Loading…</main>
    </div>
  );

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="forum" onNav={onNav} />
      <main style={{ flex: 1, overflow: 'hidden', height: '100%' }}>
        <CommunityFeed community={community} onNav={onNav} onToggleJoin={handleToggleJoin} />
      </main>
    </div>
  );
}

function DiscoverView({ onSelect, onNav, communities: communityList, onToggleJoin }: { onSelect: (c: any) => void; onNav?: any; communities?: any[]; onToggleJoin?: (c: any) => void }) {
  const app = useApp();
  const list = communityList ?? MOCK.communities;
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }} className="no-scrollbar">
      <h1 className="font-display" style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>Communities</h1>
      <p style={{ margin: '0 0 28px', color: 'var(--ink-3)', fontSize: 15 }}>Find your people. Join discussions, share wins, organise actions.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="two-col-grid">
        {list.map(c => {
          const joined = app.community?.has(c.name);
          return (
            <div key={c.id ?? c.name} onClick={() => { onSelect(c); if (c.id) onNav?.('communities', { slug: c.slug || c.name }); }} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .15s' }} className="row-hover">
              <div style={{ height: 100, background: `url(${c.coverUrl ?? c.cover_url}) center/cover` }} />
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <h3 className="font-display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{c.name}</h3>
                  <button className={joined ? 'btn btn-primary' : 'btn btn-ghost'} style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); onToggleJoin ? onToggleJoin(c) : (app.community.toggle(c.name), app.toast(joined ? { msg: `Left ${c.name}`, icon: 'users' } : { msg: `Joined ${c.name}!`, kind: 'success', icon: 'users' })); }}>
                    {joined ? 'Joined ✓' : 'Join'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, display: 'flex', gap: 10 }}>
                  <span>{c.members} members</span>
                  <span>·</span>
                  <span style={{ color: 'var(--green)', fontWeight: 500 }}>{c.cat}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  {COMMUNITY_META[c.name]?.desc || ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DesktopForum({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [activeCommunity, setActiveCommunity] = React.useState<any>(null);
  const [communities, setCommunities] = React.useState<any[]>(MOCK.communities);

  // Auto-open community from ?c= URL param
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const autoOpenName = searchParams?.get('c') ?? null;
  React.useEffect(() => {
    if (!autoOpenName || communities.length === 0) return;
    const match = communities.find(c => c.name === decodeURIComponent(autoOpenName));
    if (match) setActiveCommunity(match);
  }, [autoOpenName, communities]);

  React.useEffect(() => {
    if (!app.user?.id) return;
    import('@/lib/supabase').then(async ({ supabase }) => {
      const [{ data: comms, error }, { data: joined }] = await Promise.all([
        supabase.from('communities').select('id, name, slug, description, cover_url, avatar_url, category, member_count, created_by').order('member_count', { ascending: false }),
        supabase.from('community_members').select('community_id').eq('user_id', app.user.id),
      ]);
      if (!error && comms && comms.length > 0) {
        setCommunities(comms.map((c: any) => ({
          id: c.id, name: c.name, members: c.member_count ?? 0,
          cat: c.category ?? 'Community', coverUrl: c.cover_url ?? '', avatarUrl: c.avatar_url ?? '', createdBy: c.created_by,
          description: c.description,
        })));
        if (joined) {
          const joinedSet = new Set(joined.map((j: any) => j.community_id));
          comms.forEach((c: any) => {
            if (joinedSet.has(c.id) && !app.community.has(c.name)) app.community.add(c.name);
          });
        }
      }
    }).catch(() => {});
  }, [app.user?.id]);

  const handleToggleJoin = async (c: any) => {
    const name = c.name;
    const isJoined = app.community?.has(name);
    app.community.toggle(name);
    app.toast(isJoined ? { msg: `Left ${name}`, icon: 'users' } : { msg: `Joined ${name}!`, kind: 'success', icon: 'users' });
    if (c.id && app.user?.id) {
      const { supabase } = await import('@/lib/supabase');
      if (isJoined) {
        await supabase.from('community_members').delete().match({ community_id: c.id, user_id: app.user.id });
      } else {
        await supabase.from('community_members').insert({ community_id: c.id, user_id: app.user.id });
      }
    }
  };

  function communityInitials(name: string) {
    const words = name.trim().split(/\s+/);
    return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
  }

  function CommunityIcon({ c, fallbackBg = 'var(--green)' }: { c: any; fallbackBg?: string }) {
    const img = c.avatarUrl || c.coverUrl;
    return img
      ? <div style={{ width: 22, height: 22, borderRadius: 6, background: `url(${img}) center/cover`, flexShrink: 0 }} />
      : <div style={{ width: 22, height: 22, borderRadius: 6, background: fallbackBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', letterSpacing: '-.3px' }}>{communityInitials(c.name)}</div>;
  }

  const myCommunities = communities.filter(c => c.createdBy === app.user?.id);
  const joinedCommunities = communities.filter(c => app.community?.has(c.name) && c.createdBy !== app.user?.id);
  const discoverCommunities = communities.filter(c => !app.community?.has(c.name) && c.createdBy !== app.user?.id);

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="forum" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Left: communities sidebar */}
        <div style={{ width: 240, borderRight: '1px solid var(--line)', background: 'var(--surface)', padding: '20px 14px', overflow: 'auto', flexShrink: 0 }} className="no-scrollbar community-sidebar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Communities</h2>
          </div>
          <button onClick={() => setActiveCommunity(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: !activeCommunity ? 'var(--green-tint)' : 'transparent', color: !activeCommunity ? 'var(--green)' : 'var(--ink-3)', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            <Icon name="users" size={15} /> Discover all
          </button>
          {myCommunities.length > 0 && <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', margin: '14px 0 6px', letterSpacing: '.05em' }}>MY COMMUNITIES</div>}
          {myCommunities.map(c => {
            const isActive = activeCommunity?.name === c.name;
            return (
              <button key={c.id ?? c.name} onClick={() => { setActiveCommunity(c); onNav?.('communities', { slug: c.slug || c.name }); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: isActive ? 'var(--green-tint)' : 'transparent', border: 'none', color: isActive ? 'var(--green)' : 'var(--ink-2)', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                <CommunityIcon c={c} />
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              </button>
            );
          })}
          {joinedCommunities.length > 0 && <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', margin: '14px 0 6px', letterSpacing: '.05em' }}>JOINED</div>}
          {joinedCommunities.map(c => {
            const isActive = activeCommunity?.name === c.name;
            return (
              <button key={c.id ?? c.name} onClick={() => { setActiveCommunity(c); onNav?.('communities', { slug: c.slug || c.name }); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: isActive ? 'var(--green-tint)' : 'transparent', border: 'none', color: isActive ? 'var(--green)' : 'var(--ink-2)', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                <CommunityIcon c={c} />
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              </button>
            );
          })}
          {discoverCommunities.length > 0 && <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', margin: '18px 0 6px', letterSpacing: '.05em' }}>DISCOVER</div>}
          {discoverCommunities.map(c => (
            <button key={c.id ?? c.name} onClick={() => { setActiveCommunity(c); onNav?.('communities', { slug: c.slug || c.name }); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: activeCommunity?.name === c.name ? 'var(--green-tint)' : 'transparent', border: 'none', color: activeCommunity?.name === c.name ? 'var(--green)' : 'var(--ink-2)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              <CommunityIcon c={c} fallbackBg="var(--bg-2)" />
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            </button>
          ))}
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 14, fontSize: 13 }} onClick={() => app.openModal?.('createcommunity', { onCreated: (c: any) => setCommunities(prev => [c, ...prev]) })}>
            <Icon name="plus" size={14} /> New community
          </button>
        </div>

        {activeCommunity
          ? <CommunityFeed community={activeCommunity} onNav={onNav} onToggleJoin={handleToggleJoin} />
          : <DiscoverView onSelect={setActiveCommunity} onNav={onNav} communities={communities} onToggleJoin={handleToggleJoin} />
        }
      </main>
    </div>
  );
};
