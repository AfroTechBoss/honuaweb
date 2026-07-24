"use client";
import React from "react";
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

  const fetchPosts = React.useCallback(async (supabase: any) => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, created_at, post_type, post_kind, image_url, likes_count, comments_count, profiles!posts_user_id_fkey(full_name, handle, avatar_url)')
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
                {['Recent', 'Top', 'Q&A', 'Resources'].map(t => (
                  <button key={t} className={feedTab === t ? 'active' : ''} onClick={() => setFeedTab(t)}>{t}</button>
                ))}
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 12px', flexShrink: 0 }} onClick={() => app.openModal?.('compose', { community: community.name, communityId: community.id })}>
                <Icon name="plus" size={13} /> Post
              </button>
            </div>

            {migrationPending ? (
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
              filtered.map((p) => {
                const profile = p.profiles as any;
                const kind = p.post_kind || p.post_type || 'post';
                const kindColors: Record<string, string> = { tip: 'var(--green)', question: 'var(--sky)', win: '#f59e0b', discussion: 'var(--ink-2)', post: 'var(--ink-3)' };
                const kc = kindColors[kind] || 'var(--ink-3)';
                const ago = (() => { const s = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s/60)}m` : s < 86400 ? `${Math.floor(s/3600)}h` : `${Math.floor(s/86400)}d`; })();
                return (
                  <div key={p.id} className="row-hover" onClick={() => onNav?.('post', { id: p.id })} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 16, marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      {kind !== 'post' && <span style={{ background: kc + '20', color: kc, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700, textTransform: 'uppercase' }}>{kind}</span>}
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
                        {profile ? `@${profile.handle}` : 'unknown'} · {ago}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.55, color: 'var(--ink)' }}>{p.content}</p>
                    {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 300, objectFit: 'cover' }} />}
                    <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--ink-3)' }}>
                      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="heart" size={13} /> {p.likes_count ?? 0}</span>
                      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Icon name="comment" size={13} /> {p.comments_count ?? 0}</span>
                    </div>
                  </div>
                );
              })
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
            </div>
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

// =============== Desktop Bookmarks ===============
import { getBookmarks, getCollectionCounts, deleteCollection } from "@/lib/bookmarks";

function BookmarkPostCard({ post, onNav }: { post: any; onNav: any }) {
  const app = useApp();
  const profile = post.profile;
  const liked = app.like?.has(post.id);
  const timeAgo = (ts: string) => { const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000); if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`; };
  return (
    <div onClick={() => onNav?.('post', { id: post.id })} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <Avatar src={profile?.avatar_url} name={profile?.full_name} size={32} verified={profile?.verified} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.full_name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{profile?.handle} · {timeAgo(post.created_at)}</div>
        </div>
      </div>
      {post.content && <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>}
      {post.image_url && <img src={post.image_url} style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 180, marginBottom: 10 }} />}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-3)' }}>
        <ActionBtn icon="heart" count={(post.likes_count ?? 0) + (liked ? 1 : 0)} active={liked} activeColor="var(--clay)" onClick={() => app.like?.toggle(post.id)} />
        <ActionBtn icon="comment" count={post.comments_count} onClick={() => onNav?.('post', { id: post.id })} />
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

// Hashtag pool — seeded from MOCK trends + common sustainability tags
const HASHTAG_POOL = [
  'SolarPanels', 'ClimateStrike', 'ZeroWaste', 'UrbanGardening', 'CarbonOffsets',
  'GreenEnergy', 'ClimateAction', 'Sustainability', 'EcoFriendly', 'NetZero',
  'RenewableEnergy', 'CleanEnergy', 'PlantBased', 'CompostLife', 'BikeToWork',
  'PublicTransit', 'ElectricVehicle', 'WildlifeConservation', 'TreePlanting', 'OceanCleanup',
  'CircularEconomy', 'FoodWaste', 'SlowFashion', 'GreenBuilding', 'CarbonNeutral',
  'Rewilding', 'SustainableAg', 'WaterConservation', 'AirQuality', 'GreenTech',
  'ClimateJustice', 'EnergyEfficiency', 'CommunityGarden', 'LocalFood', 'Beekeeping',
  'SeedSwap', 'PollinatorGarden', 'SolarCoOp', 'GreenPoints', 'ImpactLedger',
];

// --- Compose post ---
export function MCompose({ close, data }: { close: () => void; data?: { community?: string; communityId?: string } }) {
  const app = useApp();
  const [text, setText] = React.useState('');
  const [cat, setCat] = React.useState('Energy');
  const [postKind, setPostKind] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [publishing, setPublishing] = React.useState(false);
  // Hashtag autocomplete
  const [tagSuggestions, setTagSuggestions] = React.useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = React.useState(0);
  const [hashQuery, setHashQuery] = React.useState('');
  const [hashStart, setHashStart] = React.useState(-1);
  const [allTags, setAllTags] = React.useState<string[]>(HASHTAG_POOL);
  // Mention autocomplete
  const [mentionSuggestions, setMentionSuggestions] = React.useState<any[]>([]);
  const [activeMention, setActiveMention] = React.useState(0);
  const [mentionQuery, setMentionQuery] = React.useState('');
  const [mentionStart, setMentionStart] = React.useState(-1);
  const mentionTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const imgRef = React.useRef<HTMLInputElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // Fetch existing tags from DB and merge with static pool
  React.useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('posts').select('tags').not('tags', 'is', null).limit(500)
        .then(({ data }) => {
          if (!data) return;
          const dbTags = [...new Set(data.flatMap((p: any) => p.tags || []))] as string[];
          setAllTags(prev => [...new Set([...prev, ...dbTags])]);
        });
    });
  }, []);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const fetchMentions = (q: string) => {
    if (mentionTimer.current) clearTimeout(mentionTimer.current);
    if (!q) { setMentionSuggestions([]); return; }
    mentionTimer.current = setTimeout(async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.from('profiles').select('id, handle, full_name, avatar_url')
        .ilike('handle', `${q}%`).limit(6);
      setMentionSuggestions(data ?? []);
      setActiveMention(0);
    }, 180);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);

    // Check @ first (mention takes priority when both could match)
    const mentionMatch = before.match(/@(\w*)$/);
    if (mentionMatch) {
      const q = mentionMatch[1];
      setMentionQuery(q);
      setMentionStart(cursor - mentionMatch[0].length);
      fetchMentions(q);
      // Clear hash state
      setTagSuggestions([]);
      setHashQuery('');
      setHashStart(-1);
      return;
    }
    setMentionSuggestions([]);
    setMentionQuery('');
    setMentionStart(-1);

    // Then check # (hashtag)
    const hashMatch = before.match(/#(\w*)$/);
    if (hashMatch) {
      const q = hashMatch[1];
      setHashQuery(q);
      setHashStart(cursor - hashMatch[0].length);
      const lower = q.toLowerCase();
      const hits = allTags.filter(t => t.toLowerCase().startsWith(lower) && t.toLowerCase() !== lower).slice(0, 6);
      setTagSuggestions(hits);
      setActiveSuggestion(0);
    } else {
      setTagSuggestions([]);
      setHashQuery('');
      setHashStart(-1);
    }
  };

  const acceptSuggestion = (tag: string) => {
    if (hashStart < 0) return;
    const cursor = taRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, hashStart);
    const after = text.slice(cursor);
    const newText = before + '#' + tag + ' ' + after;
    setText(newText);
    setTagSuggestions([]);
    setHashQuery('');
    setHashStart(-1);
    setTimeout(() => {
      taRef.current?.focus();
      const pos = (before + '#' + tag + ' ').length;
      taRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const acceptMention = (profile: any) => {
    if (mentionStart < 0) return;
    const cursor = taRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart);
    const after = text.slice(cursor);
    const newText = before + '@' + profile.handle + ' ' + after;
    setText(newText);
    setMentionSuggestions([]);
    setMentionQuery('');
    setMentionStart(-1);
    setTimeout(() => {
      taRef.current?.focus();
      const pos = (before + '@' + profile.handle + ' ').length;
      taRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveMention(i => Math.min(i + 1, mentionSuggestions.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveMention(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptMention(mentionSuggestions[activeMention]); }
      if (e.key === 'Escape')    { setMentionSuggestions([]); }
      return;
    }
    if (!tagSuggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestion(i => Math.min(i + 1, tagSuggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveSuggestion(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptSuggestion(tagSuggestions[activeSuggestion]); }
    if (e.key === 'Escape')    { setTagSuggestions([]); }
  };

  const publish = async () => {
    if (!text.trim() || !app.user?.id) return;
    setPublishing(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { notifyMentioned } = await import('@/lib/notifications');
      let image_url: string | null = null;
      if (imageFile) {
        const { uploadFile } = await import('@/lib/storage');
        image_url = await uploadFile('posts', app.user.id, imageFile);
      }
      const tags = [...new Set((text.match(/#(\w+)/g) || []).map(t => t.slice(1)))];
      const content = text.trim();
      const payload: Record<string, any> = {
        user_id: app.user.id,
        content,
        image_url,
        post_type: cat.toLowerCase(),
        ...(postKind ? { post_kind: postKind } : {}),
        ...(data?.communityId ? { community_id: data.communityId } : {}),
      };
      // Try full payload; progressively strip optional columns that may not exist yet.
      // community_id is ALWAYS kept — it's essential for community posts.
      const fullPayload = { ...payload, tags };
      console.log('[publish] attempting with community_id:', payload.community_id);
      let result = await supabase.from('posts').insert(fullPayload).select('id').single();
      if ((result as any).error) {
        console.log('[publish] full payload failed:', (result as any).error.message, '— retrying without tags');
        const { tags: _t, ...noTags } = fullPayload as any;
        result = await supabase.from('posts').insert(noTags).select('id').single();
      }
      if ((result as any).error) {
        console.log('[publish] no-tags failed:', (result as any).error.message, '— retrying without post_kind');
        const { post_kind: _pk, tags: _t2, ...noKind } = fullPayload as any;
        result = await supabase.from('posts').insert(noKind).select('id').single();
      }
      if ((result as any).error) {
        console.log('[publish] no-kind failed:', (result as any).error.message, '— retrying bare minimum');
        result = await supabase.from('posts').insert({
          user_id: payload.user_id,
          content: payload.content,
          image_url: payload.image_url,
          post_type: payload.post_type,
          ...(payload.community_id ? { community_id: payload.community_id } : {}),
        }).select('id').single();
      }
      console.log('[publish] final result:', (result as any).data, (result as any).error);
      const { data: post, error } = result as any;
      if (error) throw error;
      // Notify mentioned users
      if (post?.id) {
        notifyMentioned({ postId: post.id, content, actorId: app.user.id, body: 'mentioned you in a post' });
      }
      app.toast?.({ kind: 'success', msg: 'Post published', sub: 'Your update is live on the feed.', icon: 'check' });
      close();
    } catch (err: any) {
      app.toast?.({ kind: 'error', msg: 'Failed to publish', sub: err.message, icon: 'bolt' });
    } finally {
      setPublishing(false);
    }
  };

  const showDropdown = mentionSuggestions.length > 0 || tagSuggestions.length > 0;

  return (
    <Modal onClose={close} width={560}>
      <ModalHead icon="pencil" title="New post" sub="Share an action, idea, or win with the community." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar src={app.user?.avatar} name={app.user?.name || 'You'} size={40} />
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea ref={taRef} className="fld" autoFocus value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="What did you do for the planet today? Use #hashtags and @mentions."
              style={{ minHeight: 110, width: '100%' }}
            />
            {showDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,.12)', overflow: 'hidden', marginTop: 4,
              }}>
                {mentionSuggestions.length > 0 && mentionSuggestions.map((p, i) => (
                  <button key={p.id} onMouseDown={e => { e.preventDefault(); acceptMention(p); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '8px 14px', background: i === activeMention ? 'var(--surface)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={() => setActiveMention(i)}
                  >
                    <Avatar src={p.avatar_url} name={p.full_name || p.handle} size={28} />
                    <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{p.full_name}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{p.handle}</span>
                  </button>
                ))}
                {tagSuggestions.length > 0 && tagSuggestions.map((tag, i) => (
                  <button key={tag} onMouseDown={e => { e.preventDefault(); acceptSuggestion(tag); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '9px 14px', background: i === activeSuggestion ? 'var(--surface)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      fontSize: 14, color: 'var(--ink)',
                    }}
                    onMouseEnter={() => setActiveSuggestion(i)}
                  >
                    <span style={{ color: 'var(--sky)', fontWeight: 600 }}>#</span>
                    <span>
                      <span style={{ color: 'var(--ink-3)' }}>{tag.slice(0, hashQuery.length)}</span>
                      <span style={{ fontWeight: 600 }}>{tag.slice(hashQuery.length)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {imagePreview && (
          <div style={{ marginTop: 12, position: 'relative' }}>
            <img src={imagePreview} style={{ width: '100%', borderRadius: 10, maxHeight: 220, objectFit: 'cover' }} />
            <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff', fontSize: 14 }}>✕</button>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <span className="fld-label">Post type <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(optional)</span></span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { kind: 'tip', label: '💡 Tip', color: 'var(--green)' },
              { kind: 'question', label: '❓ Question', color: 'var(--sky)' },
              { kind: 'win', label: '🏆 Win', color: '#f59e0b' },
              { kind: 'discussion', label: '💬 Discussion', color: 'var(--ink-2)' },
            ].map(({ kind, label, color }) => (
              <button key={kind} onClick={() => setPostKind(postKind === kind ? null : kind)}
                className="chip"
                style={{ cursor: 'pointer', background: postKind === kind ? color + '20' : undefined, color: postKind === kind ? color : undefined, border: postKind === kind ? `1px solid ${color}40` : undefined, fontWeight: postKind === kind ? 700 : undefined }}>
                {label}
              </button>
            ))}
          </div>
        </div>
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
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>{gp}</span>
            </button>
          ))}
        </div>
        <span className="fld-label">What did you do?</span>
        <input className="fld" autoFocus value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Biked to work instead of driving (8 km)" />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.openModal('celebrate', { title: `Action logged · ${opts[sel][2]}`, sub: `Nice work. That's another entry in your verified impact ledger — streak now at 13 days.` }); }}>Log action</button>
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
  const [date, setDate] = React.useState('');
  const [location, setLocation] = React.useState('');
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
          <div>
            <span className="fld-label">Date &amp; time</span>
            <input
              className="fld"
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ colorScheme: 'light dark' }}
            />
          </div>
          <div><span className="fld-label">Location</span><input className="fld" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Brooklyn, NY" /></div>
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
  const [desc, setDesc] = React.useState('');
  const [cat, setCat] = React.useState('Energy');
  const [days, setDays] = React.useState(30);
  const [reward, setReward] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !app.user?.id) return;
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('challenges').insert({
        title: title.trim(),
        description: desc.trim() || null,
        category: cat,
        days,
        reward: reward.trim() || null,
        status: 'pending',
        submitted_by: app.user.id,
      });
      if (error) throw error;
      close();
      app.toast({ kind: 'success', msg: 'Challenge submitted!', sub: 'Our team will review it and publish if approved.', icon: 'flame' });
    } catch {
      app.toast({ msg: 'Could not submit challenge', kind: 'error', icon: 'close' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={520}>
      <ModalHead icon="flame" iconColor="var(--clay)" title="Submit a challenge" sub="Our team reviews submissions before they go live." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Challenge title</span>
        <input className="fld" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Car-free fortnight" style={{ marginBottom: 14 }} />
        <span className="fld-label">Description <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></span>
        <textarea className="fld" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's the goal and why does it matter?" rows={2} style={{ marginBottom: 14, resize: 'none' }} />
        <span className="fld-label">Category</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['Energy', 'Transport', 'Food', 'Waste', 'Nature', 'Lifestyle'].map(c => (
            <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>
          ))}
        </div>
        <span className="fld-label">Duration</span>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[7, 14, 21, 30].map(d => (
            <button key={d} onClick={() => setDays(d)} className={'chip ' + (days === d ? 'chip-green' : '')} style={{ cursor: 'pointer', border: days === d ? 'none' : undefined }}>{d} days</button>
          ))}
        </div>
        <span className="fld-label">Suggested reward <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></span>
        <input className="fld" value={reward} onChange={e => setReward(e.target.value)} placeholder="e.g. 120 GP + Cyclist badge" style={{ marginBottom: 4 }} />
        <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>Final rewards are set by admins.</div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleSubmit} disabled={!title.trim() || loading} style={{ opacity: title.trim() && !loading ? 1 : .5 }}>
          {loading ? 'Submitting…' : 'Submit for review'}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Edit community ---
export function MEditCommunity({ close, data }: { close: () => void; data?: { community: any; onSaved?: (c: any) => void } }) {
  const community = data?.community;
  const app = useApp();
  const [name, setName] = React.useState(community?.name ?? '');
  const [desc, setDesc] = React.useState(community?.description ?? '');
  const [cat, setCat] = React.useState(community?.cat ?? 'Environment');
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState(community?.coverUrl ?? '');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState(community?.avatarUrl ?? '');
  const [loading, setLoading] = React.useState(false);
  const coverRef = React.useRef<HTMLInputElement>(null);
  const avatarRef = React.useRef<HTMLInputElement>(null);

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setCoverFile(file); setCoverPreview(URL.createObjectURL(file));
  }
  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file));
  }

  const handleSave = async () => {
    if (!name.trim() || !app.user?.id || !community?.id) return;
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { uploadFile } = await import('@/lib/storage');
      const [cover_url, avatar_url] = await Promise.all([
        coverFile ? uploadFile('covers', app.user.id, coverFile) : Promise.resolve(community.coverUrl || null),
        avatarFile ? uploadFile('avatars', app.user.id, avatarFile) : Promise.resolve(community.avatarUrl || null),
      ]);
      const { data: row, error } = await supabase.from('communities')
        .update({ name: name.trim(), description: desc.trim() || null, category: cat, cover_url, avatar_url })
        .eq('id', community.id)
        .select('id, name, slug, description, category, member_count, cover_url, avatar_url, created_by')
        .single();
      if (error) throw error;
      close();
      app.toast({ kind: 'success', msg: 'Community updated', icon: 'users' });
      data?.onSaved?.({ ...row, cat: row.category, coverUrl: row.cover_url ?? '', avatarUrl: row.avatar_url ?? '', createdBy: row.created_by });
    } catch {
      app.toast({ msg: 'Could not save changes', kind: 'error', icon: 'close' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={500}>
      <ModalHead icon="edit" title="Edit community" sub="Changes are visible to all members immediately." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickCover} />
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickAvatar} />
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <div onClick={() => coverRef.current?.click()} style={{ width: '100%', height: 110, borderRadius: 12, cursor: 'pointer', background: coverPreview ? `url(${coverPreview}) center/cover` : 'var(--bg-2)', border: '1.5px dashed var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'var(--ink-3)', fontSize: 13, fontWeight: 500 }}>
            {!coverPreview && <><Icon name="image" size={20} />Cover photo</>}
          </div>
          <div onClick={() => avatarRef.current?.click()} style={{ position: 'absolute', bottom: -28, left: 16, width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--surface)', cursor: 'pointer', background: avatarPreview ? `url(${avatarPreview}) center/cover` : 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}>
            {!avatarPreview && <Icon name="image" size={16} color="var(--ink-3)" />}
          </div>
        </div>
        <span className="fld-label">Community name</span>
        <input className="fld" autoFocus value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 14 }} />
        <span className="fld-label">Focus area</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {COMMUNITY_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>
          ))}
        </div>
        <span className="fld-label">Description</span>
        <textarea className="fld" value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ resize: 'none' }} />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleSave} disabled={!name.trim() || loading} style={{ opacity: !name.trim() || loading ? .5 : 1 }}>
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </ModalFoot>
    </Modal>
  );
}

// --- Create community ---
const COMMUNITY_CATEGORIES = ['Environment', 'Energy', 'Food', 'Transport', 'Waste', 'Nature', 'Policy', 'Education', 'Other'];

export function MCreateCommunity({ close, data }: { close: () => void; data?: { onCreated?: (c: any) => void } }) {
  const onCreated = data?.onCreated;
  const app = useApp();
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [cat, setCat] = React.useState('Environment');
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState('');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const coverRef = React.useRef<HTMLInputElement>(null);
  const avatarRef = React.useRef<HTMLInputElement>(null);

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  const handleCreate = async () => {
    if (!name.trim() || !app.user?.id) return;
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { uploadFile } = await import('@/lib/storage');
      const [cover_url, avatar_url] = await Promise.all([
        coverFile ? uploadFile('covers', app.user.id, coverFile) : Promise.resolve(null),
        avatarFile ? uploadFile('avatars', app.user.id, avatarFile) : Promise.resolve(null),
      ]);
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data: row, error } = await supabase.from('communities').insert({
        name: name.trim(), slug,
        description: desc.trim() || null,
        category: cat, cover_url, avatar_url,
        created_by: app.user.id,
      }).select('id, name, slug, description, category, member_count, cover_url, avatar_url, created_by').single();
      if (error) throw error;
      await supabase.from('community_members').insert({ community_id: row.id, user_id: app.user.id });
      // Mark as joined in app context immediately
      app.community?.add(row.name);
      close();
      app.toast({ kind: 'success', msg: `${name.trim()} created!`, sub: 'Your community is live.', icon: 'users' });
      onCreated?.({ ...row, members: 1, cat: row.category, coverUrl: row.cover_url ?? '', avatarUrl: row.avatar_url ?? '', createdBy: row.created_by });
    } catch {
      app.toast({ msg: 'Could not create community', kind: 'error', icon: 'close' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={500}>
      <ModalHead icon="users" title="Create a community" sub="Bring people together around a shared goal." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>

        {/* Cover + avatar pickers */}
        <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickCover} />
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickAvatar} />
        <div style={{ position: 'relative', marginBottom: 32 }}>
          {/* Cover banner */}
          <div
            onClick={() => coverRef.current?.click()}
            style={{
              width: '100%', height: 110, borderRadius: 12, cursor: 'pointer',
              background: coverPreview ? `url(${coverPreview}) center/cover` : 'var(--bg-2)',
              border: '1.5px dashed var(--line)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 5, color: 'var(--ink-3)', fontSize: 13, fontWeight: 500,
            }}
          >
            {!coverPreview && <><Icon name="image" size={20} />Cover photo</>}
          </div>
          {/* Avatar circle overlapping bottom of cover */}
          <div
            onClick={() => avatarRef.current?.click()}
            style={{
              position: 'absolute', bottom: -28, left: 16,
              width: 56, height: 56, borderRadius: '50%',
              border: '3px solid var(--surface)', cursor: 'pointer',
              background: avatarPreview ? `url(${avatarPreview}) center/cover` : 'var(--bg-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            }}
          >
            {!avatarPreview && <Icon name="image" size={16} color="var(--ink-3)" />}
          </div>
        </div>

        <span className="fld-label">Community name</span>
        <input className="fld" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Solar Street Team" style={{ marginBottom: 14 }} />
        <span className="fld-label">Focus area</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {COMMUNITY_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>
          ))}
        </div>
        <span className="fld-label">Description <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></span>
        <textarea className="fld" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this community about?" rows={3} style={{ resize: 'none' }} />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleCreate} disabled={!name.trim() || loading} style={{ opacity: !name.trim() || loading ? .5 : 1 }}>
          {loading ? 'Creating…' : 'Create community'}
        </button>
      </ModalFoot>
    </Modal>
  );
}

// --- New collection ---
const COLLECTION_EMOJIS = ['🔖','📚','💡','🌱','⚡','🌍','🔬','🎯','🛠️','🌿','📋','🏗️'];

export function MNewCollection({ close }) {
  const app = useApp();
  const [name, setName] = React.useState('');
  const [emoji, setEmoji] = React.useState('🔖');
  const [loading, setLoading] = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await app.createColl(name.trim(), emoji);
      close();
      app.toast({ kind: 'success', msg: 'Collection created', sub: `"${name.trim()}" is ready for bookmarks.`, icon: 'bookmark' });
    } catch {
      app.toast({ msg: 'Could not create collection', kind: 'error', icon: 'close' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={440}>
      <ModalHead icon="bookmark" title="New collection" sub="Group your saved posts, articles and products." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Emoji</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {COLLECTION_EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{ width: 36, height: 36, fontSize: 18, borderRadius: 8, border: emoji === e ? '2px solid var(--green)' : '2px solid var(--line)', background: emoji === e ? 'var(--green-tint)' : 'var(--surface)', cursor: 'pointer' }}>
              {e}
            </button>
          ))}
        </div>
        <span className="fld-label">Collection name</span>
        <input className="fld" autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="e.g. Weekend reading" />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleCreate} disabled={!name.trim() || loading} style={{ opacity: name.trim() && !loading ? 1 : .5 }}>
          {loading ? 'Creating…' : 'Create'}
        </button>
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
  const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 13px', fontSize: 14, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none' };
  const lab: React.CSSProperties = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', display: 'block', marginBottom: 5 };

  return (
    <Modal onClose={close} width={560}>
      <ModalHead icon="edit" title="Edit profile" sub="Update how you appear across Honua." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>

        {/* Cover photo */}
        <div style={{ position: 'relative', marginBottom: 48 }}>
          <div style={{
            height: 110, borderRadius: 12, overflow: 'hidden', position: 'relative',
            background: coverSrc ? `url(${coverSrc}) center/cover` : 'linear-gradient(135deg,#1f6f3f,#2e9a5b)',
          }}>
            <button onClick={() => coverRef.current?.click()} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
              {coverSrc ? 'Change cover' : '+ Add cover'}
            </button>
            <input ref={coverRef} type="file" accept="image/*" onChange={pickCover} style={{ display: 'none' }} />
          </div>

          {/* Avatar — sits below cover, no longer clipped by overflow:hidden */}
          <div style={{ position: 'absolute', bottom: -36, left: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, border: '4px solid var(--surface)', overflow: 'hidden', background: 'var(--green)', position: 'relative', cursor: 'pointer' }} onClick={() => avatarRef.current?.click()}>
              {avatarSrc
                ? <img src={avatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 28, color: '#fff', fontFamily: 'Lora' }}>{fullName.charAt(0) || '?'}</div>
              }
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', opacity: 0, transition: 'opacity .15s' }} className="avatar-edit-overlay">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Fields */}
        <div className="edit-profile-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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
              <span style={{ fontSize: 20, fontWeight: 600, fontFamily: 'Lora' }}>{a}</span>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>IT</span>
            </button>
          ))}
        </div>
        <input className="fld" type="number" value={amt} onChange={e => setAmt(Math.max(1, +e.target.value || 1))} />
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, fontFamily: 'JetBrains Mono' }}>Your balance: 24 IT</div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.openModal('celebrate', { title: `Tipped ${amt} IT`, sub: `${u.name} will be notified of your support. Thank you for backing real impact.` }); }}>Send {amt} IT</button>
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
          <div style={{ fontSize: 40, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>$14<span style={{ fontSize: 16 }}>/mo</span></div>
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
        <button className="btn btn-green" onClick={() => { close(); app.toast({ kind: 'success', msg: 'Auto-offset active', sub: '$14/mo · first credit retires Jun 1. Manage in Settings.', icon: 'leaf' }); }}>Subscribe · $14/mo</button>
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
          <span style={{ fontSize: 46, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>1.4 t</span>
          <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>CO₂ to offset</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}>
          <span style={{ color: 'var(--ink-3)' }}>1.4 t × $24.10 spot</span><span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>$33.74</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 16, fontWeight: 600 }}>
          <span>Total</span><span style={{ fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>$33.74</span>
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.openModal('celebrate', { title: 'Year offset — you\'re net zero!', sub: '1.4 t CO₂ retired across your project mix. Certificate added to your wallet.' }); }}>Offset 1.4 t · $33.74</button>
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
  const [loading, setLoading] = React.useState(false);
  const ok = v.trim().toLowerCase() === 'delete my account';

  const handleDelete = async () => {
    if (!ok) return;
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      // Refresh to ensure we have a non-expired token
      const { data: refreshData } = await supabase.auth.refreshSession();
      const session = refreshData.session ?? (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error('Not signed in');
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Deletion failed');
      }
      close();
      app.toast({ kind: 'success', msg: 'Account deleted', sub: 'Your account and all data have been permanently removed.', icon: 'trash', duration: 6000 });
      await app.logout?.();
    } catch (err: any) {
      app.toast({ kind: 'error', msg: 'Could not delete account', sub: err.message, icon: 'bolt' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={460}>
      <ModalHead icon="trash" iconColor="var(--clay)" title="Final confirmation" sub="To confirm, type 'delete my account' in the field below." onClose={close} />
      <div style={{ padding: "18px 24px 0" }}>
        <input className="fld" autoFocus value={v} onChange={e => setV(e.target.value)} placeholder="delete my account" style={{ borderColor: ok ? "var(--clay)" : undefined }} />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close} disabled={loading}>Cancel</button>
        <button className="btn" disabled={!ok || loading} style={{ background: ok ? "var(--clay)" : "var(--line-2)", color: "#fff", opacity: (ok && !loading) ? 1 : .7, cursor: (ok && !loading) ? "pointer" : "not-allowed" }} onClick={handleDelete}>
          {loading ? "Deleting…" : "Delete forever"}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// =============== Dispatcher ===============
export function ModalContent({ type, data, close }) {
  const map = {
    compose: MCompose, logaction: MLogAction, export: MExport, startproject: MStartProject,
    createchallenge: MCreateChallenge, createcommunity: MCreateCommunity, editcommunity: MEditCommunity, newcollection: MNewCollection, editprofile: MEditProfile,
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
