"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, PostCardSkeleton, ActionBtn, ShareSheet, BookmarkSheet, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { ImageLightbox } from "@/components/post-card";

// =============== Story data ===============
const STORY_KEYS = ["sarah", "marcus", "maya", "okafor", "greentech", "can", "tara"];
const STORY_CONTENT: Record<string, { caption: string; bg: [string, string] }> = {
  sarah:    { caption: "First sun on the 20 new panels — co-op is officially off coal.", bg: ["#1f6f3f", "#2e9a5b"] },
  marcus:   { caption: "Week 3, zero-waste. The compost is finally cooking.", bg: ["#6b4f2a", "#9c7a3c"] },
  maya:     { caption: "Two more pollinators today. Tiny balcony, big week.", bg: ["#2e7d32", "#7cb342"] },
  okafor:   { caption: "New blade design hit 40% efficiency in testing. Paper Monday.", bg: ["#13315c", "#2a6fae"] },
  greentech:{ caption: "Prototype #7 is on the truck. Field trial starts Thursday.", bg: ["#0d3b66", "#1d6dc4"] },
  can:      { caption: "47 cities confirmed for Friday. Find yours on the map.", bg: ["#3a1c71", "#6d3bbf"] },
  tara:     { caption: "Repaired instead of replaced. 5th item this month.", bg: ["#7a3b2e", "#c4623a"] },
};
const DURATION = 4500;

// =============== Story viewer ===============
function StoryViewer({ keys, start, onClose, onNav }: { keys: string[]; start: number; onClose: () => void; onNav: any }) {
  const app = useApp();
  const [idx, setIdx] = React.useState(start);
  const [prog, setProg] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [liked, setLiked] = React.useState(false);
  const [reply, setReply] = React.useState('');
  const shouldClose = React.useRef(false);

  React.useEffect(() => {
    if (shouldClose.current) { shouldClose.current = false; onClose(); }
  });

  const next = React.useCallback(() => {
    setIdx(i => {
      if (i >= keys.length - 1) { shouldClose.current = true; return i; }
      setProg(0); setLiked(false); return i + 1;
    });
  }, [keys.length]);
  const prev = () => setIdx(i => { setProg(0); setLiked(false); return Math.max(0, i - 1); });

  React.useEffect(() => {
    setProg(0);
    let raf: number;
    const t0 = Date.now();
    const tick = () => {
      if (paused) { raf = requestAnimationFrame(tick); return; }
      const p = (Date.now() - t0) / DURATION;
      if (p >= 1) next();
      else { setProg(p); raf = requestAnimationFrame(tick); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx, paused, next]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, onClose]);

  const key = keys[idx];
  const u = MOCK.users[key] || { name: key, handle: key, verified: false };
  const content = STORY_CONTENT[key] || { caption: '', bg: ['#1f6f3f', '#2e9a5b'] as [string, string] };

  const sendReply = () => {
    if (!reply.trim()) return;
    app.toast?.({ msg: `Reply sent to ${u.name.split(' ')[0]}`, icon: 'msg' });
    setReply('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0a0d0b', display: 'flex', flexDirection: 'column' }}>
      {/* Progress bars */}
      <div style={{ display: 'flex', gap: 4, padding: '20px 20px 8px' }}>
        {keys.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 999, background: '#fff', width: `${(i < idx ? 1 : i === idx ? prog : 0) * 100}%`, transition: i === idx ? 'none' : undefined }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px' }}>
        <span onClick={() => { onClose(); onNav?.('profile', { handle: u.handle }); }} style={{ cursor: 'pointer' }}>
          <Avatar src={u.avatar} name={u.name} size={36} verified={u.verified} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{u.name}</div>
          <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 11, fontFamily: 'JetBrains Mono' }}>@{u.handle} · {2 + idx}h</div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', padding: 6 }}>
          <Icon name="close" size={20} />
        </button>
      </div>

      {/* Media area */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${content.bg[0]}, ${content.bg[1]})`,
      }}>
        {/* Placeholder image label */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,.4)', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{key} · story image</span>
        </div>

        {/* Tap zones */}
        <div onClick={prev} onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '32%', cursor: 'pointer' }} />
        <div onClick={next} onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
          style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '68%', cursor: 'pointer' }} />

        {/* Caption + reply */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 100%)',
          padding: '48px 20px 28px',
        }}>
          <p style={{ color: '#fff', fontSize: 17, lineHeight: 1.5, margin: '0 0 14px', fontWeight: 500 }}>{content.caption}</p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              value={reply} onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendReply(); }}
              onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
              placeholder={`Reply to ${u.name.split(' ')[0]}…`}
              style={{
                flex: 1, border: '1px solid rgba(255,255,255,.45)', background: 'transparent',
                color: '#fff', borderRadius: 999, padding: '10px 16px', fontSize: 14,
                outline: 'none', fontFamily: 'Satoshi',
              }}
            />
            <button onClick={() => setLiked(v => !v)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Icon name="heart" size={26} color={liked ? 'var(--clay)' : '#fff'} stroke={liked ? 2.4 : 1.8} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============== Status compose picker (desktop) ===============
const BG_PRESETS: [string, string][] = [
  ["#1f6f3f", "#2e9a5b"], ["#13315c", "#2a6fae"], ["#6b4f2a", "#9c7a3c"],
  ["#3a1c71", "#6d3bbf"], ["#7a3b2e", "#c4623a"], ["#0d3b66", "#1d6dc4"],
];

function StatusComposePicker({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = React.useState<'pick' | 'media' | 'text'>('pick');
  const [caption, setCaption] = React.useState('');
  const [mediaType, setMediaType] = React.useState<'photo' | 'video'>('photo');
  const [picked, setPicked] = React.useState(false);
  const [text, setText] = React.useState('');
  const [bgIdx, setBgIdx] = React.useState(0);

  const publish = () => {
    onClose();
  };

  if (mode === 'pick') return (
    <Modal onClose={onClose}>
      <ModalHead title="New status" onClose={onClose} />
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>What kind of status do you want to share?</p>
        {/* Media card */}
        <button onClick={() => setMode('media')} className="btn btn-ghost" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 16, textAlign: 'left', background: 'linear-gradient(135deg, #1f6f3f22, var(--surface))' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--green-tint)', display: 'grid', placeItems: 'center' }}><Icon name="image" size={24} color="var(--green)" /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>Media</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>Share a photo or short video (max 1 minute).</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ background: 'var(--bg-2)', borderRadius: 999, padding: '4px 10px', fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon name="image" size={11} /> Photo</span>
            <span style={{ background: 'var(--bg-2)', borderRadius: 999, padding: '4px 10px', fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon name="bolt" size={11} /> Video · max 1 min</span>
          </div>
        </button>
        {/* Text card */}
        <button onClick={() => setMode('text')} className="btn btn-ghost" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 16, textAlign: 'left', background: 'linear-gradient(135deg, var(--sky)22, var(--surface))' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'color-mix(in srgb, var(--sky) 15%, transparent)', display: 'grid', placeItems: 'center' }}><Icon name="pencil" size={24} color="var(--sky)" /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>Text</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>Write a short update with a coloured background.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ background: 'var(--bg-2)', borderRadius: 999, padding: '4px 10px', fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon name="pencil" size={11} /> Up to 280 chars</span>
            <span style={{ background: 'var(--bg-2)', borderRadius: 999, padding: '4px 10px', fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon name="sparkles" size={11} /> Custom background</span>
          </div>
        </button>
      </div>
    </Modal>
  );

  if (mode === 'media') return (
    <Modal onClose={onClose}>
      <ModalHead title="Media status" onClose={() => setMode('pick')} />
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: 12, padding: 4 }}>
          {(['photo', 'video'] as const).map(t => (
            <button key={t} onClick={() => setMediaType(t)} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14, textTransform: 'capitalize', background: mediaType === t ? 'var(--surface)' : 'transparent', color: mediaType === t ? 'var(--ink)' : 'var(--ink-3)' }}>{t}</button>
          ))}
        </div>
        {/* Upload area */}
        <div onClick={() => setPicked(true)} style={{ height: 220, borderRadius: 16, border: `2px dashed ${picked ? 'var(--green)' : 'var(--line-2)'}`, display: 'grid', placeItems: 'center', cursor: 'pointer', background: picked ? 'var(--green-tint)' : 'var(--bg-2)', transition: 'all .2s' }}>
          {picked ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Icon name="check" size={36} color="var(--green)" stroke={2} />
              <span style={{ fontWeight: 600, color: 'var(--green)' }}>{mediaType === 'photo' ? 'Photo' : 'Video'} ready</span>
              {mediaType === 'video' && <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>max 1:00</span>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Icon name={mediaType === 'photo' ? 'image' : 'bolt'} size={32} color="var(--ink-4)" stroke={1.5} />
              <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>Click to {mediaType === 'photo' ? 'choose a photo' : 'pick a video'}</span>
              {mediaType === 'video' && <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>Maximum 1 minute</span>}
            </div>
          )}
        </div>
        <div>
          <label style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>CAPTION (OPTIONAL)</label>
          <textarea value={caption} onChange={e => setCaption(e.target.value.slice(0, 150))} placeholder="Add a caption…" rows={3} style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--ink)', resize: 'none', fontFamily: 'Satoshi', boxSizing: 'border-box' }} />
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{caption.length}/150</div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setMode('pick')}>Back</button>
          <button className="btn btn-primary" onClick={publish}>Post status</button>
        </div>
      </div>
    </Modal>
  );

  const bg = BG_PRESETS[bgIdx];
  return (
    <Modal onClose={onClose}>
      <ModalHead title="Text status" onClose={() => setMode('pick')} />
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Live preview */}
        <div style={{ height: 200, borderRadius: 16, background: `linear-gradient(135deg, ${bg[0]}, ${bg[1]})`, display: 'grid', placeItems: 'center', padding: 24 }}>
          <p style={{ margin: 0, color: text ? '#fff' : 'rgba(255,255,255,.4)', fontSize: text.length > 80 ? 18 : 22, fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>
            {text || 'Your text will appear here…'}
          </p>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value.slice(0, 280))} placeholder="What's on your mind?" rows={4} autoFocus style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontSize: 15, color: 'var(--ink)', resize: 'none', fontFamily: 'Satoshi', boxSizing: 'border-box' }} />
        <div style={{ textAlign: 'right', fontSize: 11, fontFamily: 'JetBrains Mono', color: text.length > 240 ? 'var(--clay)' : 'var(--ink-4)', marginTop: -10 }}>{text.length}/280</div>
        <div>
          <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginBottom: 10 }}>BACKGROUND</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {BG_PRESETS.map(([a, b], i) => (
              <button key={i} onClick={() => setBgIdx(i)} style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${a}, ${b})`, border: bgIdx === i ? '3px solid var(--ink)' : '2px solid transparent', cursor: 'pointer', transition: 'border .15s' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setMode('pick')}>Back</button>
          <button className="btn btn-primary" onClick={publish} disabled={!text.trim()}>Post status</button>
        </div>
      </div>
    </Modal>
  );
}

// =============== Story rail ===============
function StoryRail({ onOpen, onNav, onAddStatus }: { onOpen: (i: number) => void; onNav: any; onAddStatus: () => void }) {
  const app = useApp();
  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 12, marginBottom: 4 }} className="no-scrollbar">
      {/* Your story bubble */}
      <div onClick={onAddStatus} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--green-tint)', border: '2px dashed var(--green)', display: 'grid', placeItems: 'center', color: 'var(--green)' }}>
          <Icon name="plus" size={20} stroke={2} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Add</span>
      </div>

      {STORY_KEYS.map((k, i) => {
        const u = MOCK.users[k];
        const bg = STORY_CONTENT[k]?.bg[0] ?? 'var(--green)';
        return (
          <div key={k} onClick={() => onOpen(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ padding: 2, borderRadius: '50%', background: `linear-gradient(135deg, ${bg}, ${STORY_CONTENT[k]?.bg[1] ?? bg})`, display: 'flex' }}>
              <div style={{ padding: 2, borderRadius: '50%', background: 'var(--bg)', display: 'flex' }}>
                <Avatar src={u.avatar} name={u.name} size={44} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

// =============== Desktop Home ===============
export function DesktopHome({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const [tab, setTab] = React.useState('foryou');
  const [story, setStory] = React.useState<number | null>(null);
  const [statusCompose, setStatusCompose] = React.useState(false);
  const [dbPosts, setDbPosts] = React.useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = React.useState(true);
  const app = useApp();

  // Fetch real posts from Supabase
  const fetchFeed = React.useCallback(async () => {
    setLoadingFeed(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      let query = supabase
        .from('posts')
        .select(`*, profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url, verified), original:original_post_id(*, profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url, verified))`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (tab === 'verified') query = query.eq('is_repost', false).gt('co2_saved_kg', 0);
      const { data } = await query;
      setDbPosts(data ?? []);
    } catch {}
    setLoadingFeed(false);
  }, [tab]);

  React.useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // Merge real DB posts with MOCK posts for a richer feed while DB is empty
  const feed = dbPosts.length > 0 ? dbPosts : MOCK.posts;
  const joinedChallenge = app.challenge?.has('week19');
  return (
    <>
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="home" onNav={onNav} />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        {/* Feed column */}
        <div style={{
          flex: '1 1 auto', maxWidth: 660, padding: '20px 28px',
          borderRight: '1px solid var(--line)', height: '100%', overflow: 'auto',
        }} className="no-scrollbar feed-col">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 18,
          }}>
            <h1 className="font-display" style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em' }}>Home</h1>
            <div className="pill-nav">
              <button className={tab === 'foryou' ? 'active' : ''} onClick={() => setTab('foryou')}>For you</button>
              <button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>Following</button>
              <button className={tab === 'verified' ? 'active' : ''} onClick={() => setTab('verified')}>Verified impact</button>
            </div>
          </div>

          {/* Story rail */}
          <StoryRail onOpen={setStory} onNav={onNav} onAddStatus={() => setStatusCompose(true)} />

          {/* Composer prompt */}
          <div onClick={() => { app.openModal?.('compose'); }} style={{
            background: 'var(--surface)', borderRadius: 16,
            border: '1px solid var(--line)', padding: 16, marginBottom: 12,
            display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer',
          }}>
            <Avatar src={app.user?.avatar} name={app.user?.name || 'You'} size={40} />
            <span style={{ flex: 1, fontSize: 15, color: 'var(--ink-4)', fontFamily: 'Satoshi' }}>Share an action, idea, or update…</span>
            <span style={{ color: 'var(--ink-3)', display: 'inline-flex' }}><Icon name="image" size={16} /></span>
            <span style={{ color: 'var(--ink-3)', display: 'inline-flex' }}><Icon name="pin" size={16} /></span>
            <button className="btn btn-primary" style={{ padding: '7px 14px' }} onClick={(e) => { e.stopPropagation(); app.openModal?.('compose'); }}>Post</button>
          </div>


          {loadingFeed ? (
            <>{[1,2,3,4,5].map(i => <PostCardSkeleton key={i} />)}</>
          ) : feed.length > 0 ? (
            <>
              {feed.map(p => dbPosts.length > 0
                ? <RealFeedCard key={p.id} post={p} onNav={onNav} onRefresh={fetchFeed} />
                : <PostCard key={p.id} post={p} />
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--ink-4)' }}><Icon name={tab === 'verified' ? 'leaf' : 'users'} size={26} /></div>
              <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink-2)' }}>{tab === 'following' ? 'Nothing here yet' : 'No posts yet'}</div>
              <p style={{ fontSize: 14, maxWidth: 320, margin: '6px auto 0', lineHeight: 1.5 }}>{tab === 'following' ? 'Follow people to see their updates in this tab.' : 'Be the first to post something!'}</p>
              {tab === 'following' && <button className="btn btn-green" style={{ marginTop: 16 }} onClick={() => setTab('foryou')}>Discover people →</button>}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{
          width: 340, padding: 20, height: '100%', overflow: 'auto',
          flexShrink: 0,
        }} className="no-scrollbar right-panel">
          {/* Search */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 999, padding: '10px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="search" size={16} color="var(--ink-3)" />
            <input placeholder="Search posts, people, projects" style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, fontFamily: 'Satoshi',
            }} />
            <span style={{
              padding: '2px 6px', border: '1px solid var(--line)',
              borderRadius: 4, fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)',
            }}>/</span>
          </div>
          <MyImpactCard />
          <TrendingPanel />
          <SuggestedFollows />
          <div style={{ padding: '12px 4px', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', lineHeight: 1.7 }}>
            ABOUT · HELP · API · PRIVACY · TERMS<br/>
            © 2026 honua coop
          </div>
        </div>
      </main>
    </div>
    {story !== null && <StoryViewer keys={STORY_KEYS} start={story} onClose={() => setStory(null)} onNav={onNav} />}
    {statusCompose && <StatusComposePicker onClose={() => setStatusCompose(false)} />}
    </>
  );
};

// =============== Real feed card (DB posts) ===============
function RealFeedCard({ post, onNav, onRefresh }: { post: any; onNav: any; onRefresh: () => void }) {
  const app = useApp();
  const profile = post.profile;
  const original = post.original;
  const liked = app.like?.has(post.id);
  const [showShare, setShowShare] = React.useState(false);
  const [showBookmark, setShowBookmark] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<string | null>(null);
  const [showMenu, setShowMenu] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');
  const [reportSubmitted, setReportSubmitted] = React.useState(false);

  const REPORT_OPTIONS = [
    'Spam or misleading',
    'Hate speech or harassment',
    'Violence or dangerous content',
    'False information',
    'Nudity or sexual content',
    'Intellectual property violation',
    'Other',
  ];

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setReportSubmitted(false);
    setReportReason('');
    setShowReport(true);
  };

  const submitReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reportReason) return;
    setReportSubmitted(true);
    setTimeout(() => { setShowReport(false); setReportSubmitted(false); }, 1800);
    app.toast?.({ msg: 'Report submitted', sub: 'Thanks for helping keep Honua safe.', icon: 'check', kind: 'success' });
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    app.toast?.({ msg: `@${displayProfile?.handle} muted`, sub: "You won't see their posts in your feed.", icon: 'bell' });
  };

  const timeAgo = (ts: string) => {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  const displayContent = post.is_repost && original ? original.content : post.content;
  const displayImage = post.is_repost && original ? original.image_url : post.image_url;
  const displayProfile = profile;
  const tags: string[] = post.tags ?? [];

  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  return (
    <article onClick={() => onNav?.('post', { id: post.id })} style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 20, marginBottom: 12, cursor: 'pointer' }}>
      {post.is_repost && original && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="repost" size={13} /> Reposted from <strong>@{original.profile?.handle}</strong>
        </div>
      )}
      <header style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <span style={{ cursor: 'pointer' }} onClick={stop(() => onNav?.('profile', { handle: displayProfile?.handle }))}>
          <Avatar src={displayProfile?.avatar_url} name={displayProfile?.full_name} size={42} verified={displayProfile?.verified} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }} onClick={stop(() => onNav?.('profile', { handle: displayProfile?.handle }))}>{displayProfile?.full_name}</span>
            {displayProfile?.verified && <span style={{ background: 'var(--sky)', color: '#fff', width: 14, height: 14, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', fontSize: 9 }}>✓</span>}
            <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{displayProfile?.handle}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>· {timeAgo(post.created_at)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{post.post_type}</div>
        </div>
        {/* ··· menu */}
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); setShowMenu(m => !m); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: '4px 6px', borderRadius: 8, display: 'grid', placeItems: 'center' }}><Icon name="more" size={16} /></button>
          {showMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 100, minWidth: 180, overflow: 'hidden' }}>
                <button onClick={handleMute} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)', textAlign: 'left' }}>
                  <Icon name="bell" size={15} /> Mute @{displayProfile?.handle}
                </button>
                <button onClick={handleReport} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--clay)', textAlign: 'left', borderTop: '1px solid var(--line)' }}>
                  <Icon name="flag" size={15} /> Report post
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Report modal */}
      {showReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); setShowReport(false); }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, width: 380, maxWidth: '90vw', boxShadow: '0 16px 48px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
            {reportSubmitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Report submitted</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>Thanks for keeping Honua safe.</div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Report post</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>Why are you reporting this post?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {REPORT_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setReportReason(opt)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${reportReason === opt ? 'var(--green)' : 'var(--line)'}`, background: reportReason === opt ? 'var(--green-tint)' : 'var(--bg)', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)', textAlign: 'left', fontWeight: reportReason === opt ? 600 : 400 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${reportReason === opt ? 'var(--green)' : 'var(--line-2)'}`, background: reportReason === opt ? 'var(--green)' : 'transparent', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                        {reportReason === opt && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowReport(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)' }}>Cancel</button>
                  <button onClick={submitReport} disabled={!reportReason} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: reportReason ? 'var(--clay)' : 'var(--line)', cursor: reportReason ? 'pointer' : 'not-allowed', fontSize: 14, color: '#fff', fontWeight: 600 }}>Submit report</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {displayContent && (
        <p style={{ margin: '0 0 10px', fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)' }}>
          {displayContent.split(/(\s+)/).map((word: string, i: number) => {
            const match = word.match(/^(#\w+)(.*)/);
            if (match) return <React.Fragment key={i}><span onClick={stop(() => onNav?.('explore', { tag: match[1].slice(1) }))} style={{ color: 'var(--sky)', fontWeight: 500, cursor: 'pointer' }}>{match[1]}</span>{match[2]}</React.Fragment>;
            return word;
          })}
        </p>
      )}

      {lightbox && <ImageLightbox label={lightbox} onClose={() => setLightbox(null)} />}
      {displayImage && (
        <img src={displayImage} alt="" onClick={stop(() => setLightbox(displayImage))} style={{ width: '100%', borderRadius: 12, marginBottom: 12, objectFit: 'cover', maxHeight: 340, cursor: 'zoom-in' }} />
      )}

      <footer onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 24, color: 'var(--ink-3)' }}>
        <ActionBtn icon="heart" count={(post.likes_count ?? 0) + (app.realtimeDeltas?.[post.id]?.likes ?? 0)} active={liked} activeColor="var(--clay)" onClick={() => app.like?.toggle(post.id)} />
        <ActionBtn icon="comment" count={post.comments_count} onClick={() => onNav?.('post', { id: post.id })} />
        <ActionBtn icon="repost" count={(post.reposts_count ?? 0) + (app.realtimeDeltas?.[post.id]?.reposts ?? 0)} active={app.repost?.has(post.id)} activeColor="var(--green)" onClick={() => { app.repost?.toggle(post.id); app.toast?.({ msg: app.repost?.has(post.id) ? 'Repost removed' : 'Reposted to your followers', icon: 'repost' }); }} />
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <ActionBtn icon="bookmark" active={app.save?.has(post.id)} onClick={() => setShowBookmark(true)} />
          <ActionBtn icon="share" onClick={() => setShowShare(true)} />
        </span>
      </footer>
      {showBookmark && (
        <BookmarkSheet
          postId={post.id}
          saved={!!app.save?.has(post.id)}
          onSave={(colId, colName) => { app.save?.addToCollection(post.id, colId); app.toast?.({ msg: `Saved to "${colName}"`, kind: 'success', icon: 'bookmark' }); setShowBookmark(false); }}
          onRemove={() => { app.save?.toggle(post.id); app.toast?.({ msg: 'Removed from bookmarks', icon: 'bookmark' }); setShowBookmark(false); }}
          onClose={() => setShowBookmark(false)}
        />
      )}
      {showShare && (
        <ShareSheet
          url={typeof window !== 'undefined' ? window.location.origin + '/post/' + post.id : '/post/' + post.id}
          text={post.content ? post.content.slice(0, 100) : 'Check this out on Honua'}
          onClose={() => setShowShare(false)}
        />
      )}
    </article>
  );
}

// =============== Desktop Explore ===============
export function DesktopExplore({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const incomingTag = params?.tag as string | undefined;
  const [tab, setTab] = React.useState(incomingTag ? 'tags' : 'trending');
  const [activeTag, setActiveTag] = React.useState<string | null>(incomingTag ?? null);
  const [tagPosts, setTagPosts] = React.useState<any[]>([]);
  const [tagLoading, setTagLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<{ users: any[]; posts: any[]; communities: any[] } | null>(null);
  const searchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const app = useApp();
  const openArticle = (a: any) => app.openModal?.('article', a);
  const isSearching = query.trim().length > 0;

  React.useEffect(() => {
    if (incomingTag) { setActiveTag(incomingTag); setTab('tags'); }
  }, [incomingTag]);

  const runSearch = React.useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearching(true);
    const { supabase } = await import('@/lib/supabase');
    const term = q.trim();
    const [{ data: users }, { data: posts }] = await Promise.all([
      supabase.from('profiles').select('id, handle, full_name, avatar_url, verified, bio, impact_score').or(`handle.ilike.%${term}%,full_name.ilike.%${term}%`).limit(6),
      supabase.from('posts').select('*, profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url, verified)').ilike('content', `%${term}%`).order('created_at', { ascending: false }).limit(8),
    ]);
    const communities = MOCK.communities.filter(c => c.name.toLowerCase().includes(term.toLowerCase()) || c.cat.toLowerCase().includes(term.toLowerCase()));
    setSearchResults({ users: users ?? [], posts: posts ?? [], communities });
    setSearching(false);
  }, []);

  const onQueryChange = (v: string) => {
    setQuery(v);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!v.trim()) { setSearchResults(null); setSearching(false); return; }
    setSearching(true);
    searchDebounce.current = setTimeout(() => runSearch(v), 400);
  };
  const clearSearch = () => { setQuery(''); setSearchResults(null); setSearching(false); searchRef.current?.focus(); };
  const totalResults = searchResults ? searchResults.users.length + searchResults.posts.length + searchResults.communities.length : 0;

  // Fetch posts for the selected tag
  React.useEffect(() => {
    if (tab !== 'tags' || !activeTag) return;
    setTagLoading(true);
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('posts')
        .select('*, profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url, verified)')
        .contains('tags', [activeTag])
        .order('created_at', { ascending: false })
        .limit(30)
        .then(({ data }) => { setTagPosts(data ?? []); setTagLoading(false); });
    });
  }, [activeTag, tab]);

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="explore" onNav={onNav} />
      <main style={{ flex: 1, padding: '20px 28px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        {/* Header */}
        <h1 className="font-display page-title" style={{ margin: '0 0 16px', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em' }}>Explore</h1>

        {/* Search bar */}
        <div style={{ maxWidth: 680, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14, padding: '12px 16px' }}>
            {searching
              ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--green)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              : <Icon name="search" size={18} color="var(--ink-3)" />
            }
            <input
              ref={searchRef}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Search people, posts, communities, #tags..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)' }}
              onKeyDown={e => { if (e.key === 'Escape') clearSearch(); }}
            />
            {query && (
              <button onClick={clearSearch} style={{ background: 'var(--bg-2)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)', flexShrink: 0, fontSize: 13 }}>✕</button>
            )}
          </div>
        </div>

        {/* Tabs — hidden while searching */}
        {!isSearching && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="pill-nav">
              {['Trending', 'Projects', 'People', 'Tags'].map(t => (
                <button key={t} className={tab === t.toLowerCase() ? 'active' : ''} onClick={() => { setTab(t.toLowerCase()); if (t.toLowerCase() !== 'tags') setActiveTag(null); }}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {/* Search results */}
        {isSearching && (
          <div>
            {searching && !searchResults ? (
              <>{[1,2,3,4].map(i => <PostCardSkeleton key={i} />)}</>
            ) : searchResults && totalResults === 0 ? (
              <div style={{ padding: '64px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>No results for &ldquo;{query}&rdquo;</div>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 6 }}>Try different keywords, a username, or a #hashtag</p>
              </div>
            ) : searchResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {searchResults.users.length > 0 && (
                  <section>
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.06em', marginBottom: 12 }}>PEOPLE — {searchResults.users.length} result{searchResults.users.length !== 1 ? 's' : ''}</div>
                    <div className="explore-search-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                      {searchResults.users.map(u => (
                        <div key={u.id} onClick={() => { onNav?.('profile', { handle: u.handle }); clearSearch(); }} className="row-hover"
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, cursor: 'pointer' }}>
                          <Avatar src={u.avatar_url} name={u.full_name} size={48} verified={u.verified} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                              {u.full_name}
                              {u.verified && <span style={{ background: 'var(--sky)', color: '#fff', width: 14, height: 14, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', fontSize: 8 }}>✓</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{u.handle}</div>
                            {u.bio && <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio}</div>}
                          </div>
                          {u.impact_score > 0 && <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--green)', fontWeight: 600, flexShrink: 0 }}>{u.impact_score}</span>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {searchResults.posts.length > 0 && (
                  <section>
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.06em', marginBottom: 12 }}>POSTS — {searchResults.posts.length} result{searchResults.posts.length !== 1 ? 's' : ''}</div>
                    {searchResults.posts.map(p => <RealFeedCard key={p.id} post={p} onNav={onNav} onRefresh={() => {}} />)}
                  </section>
                )}
                {searchResults.communities.length > 0 && (
                  <section>
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.06em', marginBottom: 12 }}>COMMUNITIES — {searchResults.communities.length} result{searchResults.communities.length !== 1 ? 's' : ''}</div>
                    <div className="explore-search-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                      {searchResults.communities.map(c => {
                        const joined = app.community?.has(c.name);
                        return (
                          <div key={c.name} onClick={() => onNav?.('forum')} className="row-hover"
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, cursor: 'pointer' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                              <img src={c.coverUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.members} members · {c.cat}</div>
                            </div>
                            <button className={joined ? 'btn btn-green' : 'btn btn-ghost'}
                              onClick={e => { e.stopPropagation(); app.community?.toggle(c.name); }}
                              style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }}>{joined ? 'Joined' : 'Join'}</button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Tags tab */}
        {!isSearching && tab === 'tags' && (
          <div>
            {!activeTag ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                {MOCK.trends.map(t => (
                  <button key={t.tag} onClick={() => setActiveTag(t.tag)} className="chip" style={{ cursor: 'pointer', fontSize: 14, padding: '8px 16px' }}>
                    #{t.tag} <span style={{ color: 'var(--ink-3)', fontSize: 12, marginLeft: 6 }}>{t.posts}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <button onClick={() => setActiveTag(null)} style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontWeight: 600, cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>← All tags</button>
                {tagLoading ? (
                  <>{[1,2,3].map(i => <PostCardSkeleton key={i} />)}</>
                ) : tagPosts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 12 }}>No posts yet for #{activeTag}</div>
                    <p style={{ fontSize: 14, marginTop: 6 }}>Be the first to use this hashtag!</p>
                  </div>
                ) : (
                  tagPosts.map(p => <RealFeedCard key={p.id} post={p} onNav={onNav} onRefresh={() => {}} />)
                )}
              </>
            )}
          </div>
        )}

        {!isSearching && tab !== 'tags' && (<>

        {/* Hero: editorial featured story */}
        <div className="explore-hero-grid" style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 24,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 20,
            overflow: 'hidden', border: '1px solid var(--line)',
            display: 'grid', gridTemplateRows: '260px 1fr', cursor: 'pointer',
          }} className="post-card" onClick={() => openArticle({ tag: 'Energy', title: 'How a Nairobi co-op put 4,200 homes on solar in 18 months', author: 'Dr. Adaeze Okafor', img: 'hero · solar farm at dawn' })}>
            <ImagePlaceholder label="hero · solar farm at dawn" height={260} />
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <span className="chip chip-green">Editor's pick</span>
                <span className="chip">Energy</span>
                <span className="chip">12 min read</span>
              </div>
              <h2 className="font-display" style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>How a Nairobi co-op put 4,200 homes on solar in 18 months</h2>
              <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6 }}>A community-funded model that beat the utility on price, ran on local labor, and is now being replicated in three more cities.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <Avatar src={MOCK.users.okafor.avatar} name="Dr. Okafor" size={32} verified />
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>Dr. Adaeze Okafor</span>
                  <span style={{ color: 'var(--ink-3)' }}> · May 19</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { tag: 'Policy', t: 'EU Carbon Border Adjustment — what it means for steel', a: 'Climate Action Net.', img: 'steel mill' },
              { tag: 'Energy', t: 'Heat pumps overtook gas boilers in 9 European markets', a: 'GreenTech', img: 'heat pump unit' },
              { tag: 'Ocean', t: 'Inside the 2026 North Sea kelp restoration trial', a: 'Sea Forests', img: 'kelp underwater' },
            ].map((s, i) => (
              <div key={i} className="row-hover" onClick={() => openArticle({ tag: s.tag, title: s.t, author: s.a, img: s.img })} style={{
                background: 'var(--surface)', borderRadius: 14,
                border: '1px solid var(--line)', padding: 14,
                display: 'grid', gridTemplateColumns: '92px 1fr', gap: 14, cursor: 'pointer',
              }}>
                <ImagePlaceholder label={s.img} height={84} />
                <div>
                  <span className="chip chip-green" style={{ marginBottom: 6 }}>{s.tag}</span>
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35, marginTop: 6 }}>{s.t}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'JetBrains Mono' }}>by {s.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories strip */}
        <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>Browse by category</h2>
        <div className="explore-cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            ['Energy', 'leaf', '#1f6f3f'],
            ['Water', 'droplet', '#1d6dc4'],
            ['Food', 'plant', '#2e9a5b'],
            ['Waste', 'repost', '#c4623a'],
            ['Transport', 'bolt', '#e6b450'],
            ['Policy', 'globe', '#5c635e'],
          ].map(([label, icon, col]) => (
            <div key={label} onClick={() => app.openModal?.('list', { title: label + ' on Honua', icon, sub: 'Recent posts and projects in this category', items: MOCK.posts.slice(0, 4).map(p => ({ icon, title: p.content.slice(0, 48) + '…', sub: '@' + MOCK.users[p.user].handle + ' · ' + p.time })) })} style={{
              background: 'var(--surface)', borderRadius: 14, padding: 16,
              border: '1px solid var(--line)', cursor: 'pointer',
            }} className="post-card">
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: col + '18',
                color: col, display: 'grid', placeItems: 'center', marginBottom: 10,
              }}>
                <Icon name={icon} size={18} stroke={2} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                {Math.floor(Math.random() * 9 + 2)}.{Math.floor(Math.random() * 9)}k posts
              </div>
            </div>
          ))}
        </div>

        {/* Communities grid */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Communities you might love</h2>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontWeight: 500, cursor: 'pointer', fontSize: 13 }} onClick={() => onNav?.('forum')}>See all →</button>
        </div>
        <div className="explore-community-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {MOCK.communities.slice(0, 3).map(c => {
            const joined = app.community?.has(c.name);
            return (
            <div key={c.name} onClick={() => onNav?.('forum')} className="post-card" style={{
              background: 'var(--surface)', borderRadius: 16,
              border: '1px solid var(--line)', overflow: 'hidden', cursor: 'pointer',
            }}>
              <ImagePlaceholder label={c.cover} height={120} />
              <div style={{ padding: 14 }}>
                <span className="chip">{c.cat}</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: 16, fontWeight: 600 }}>{c.name}</h3>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{c.members} members</div>
                <button className={joined ? 'btn btn-green' : 'btn btn-ghost'} onClick={(e) => { e.stopPropagation(); app.community.toggle(c.name); app.toast?.(joined ? { msg: `Left ${c.name}`, icon: 'users' } : { msg: `Joined ${c.name}`, kind: 'success', icon: 'users' }); }} style={{ marginTop: 10, padding: '6px 12px', fontSize: 12 }}>{joined ? 'Joined ✓' : 'Join community'}</button>
              </div>
            </div>
            );
          })}
        </div>

        {/* Project map preview */}
        <div className="explore-map-grid" style={{
          background: 'var(--surface)', borderRadius: 20,
          border: '1px solid var(--line)', overflow: 'hidden',
          display: 'grid', gridTemplateColumns: '1.2fr 1fr',
        }}>
          <MapPreview />
          <div style={{ padding: 24 }}>
            <span className="chip chip-sky">Action map</span>
            <h2 className="font-display" style={{ margin: '10px 0 6px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>147 verified projects near you</h2>
            <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6 }}>Beach cleanups, community gardens, repair cafés, energy co-ops — find something to do this weekend.</p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => onNav?.('map')}>Open map <Icon name="arrow" size={14} /></button>
          </div>
        </div>
        </>)}
      </main>
    </div>
  );
};

export function MapPreview({ height = 320 }) {
  // Decorative map placeholder — toned earthy
  return (
    <div style={{
      height, position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, #e6f0fa 0%, #ecf5ee 60%, #f4f3ee 100%)',
    }}>
      <svg viewBox="0 0 600 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0v40" fill="none" stroke="rgba(0,0,0,.04)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="600" height="400" fill="url(#grid)"/>
        {/* Land masses */}
        <path d="M50 200 Q150 100 280 140 T520 180 Q540 280 400 320 T100 300 Z" fill="#ecf5ee" stroke="#c8e6cf" strokeWidth="1"/>
        <path d="M380 60 Q450 50 510 90 T560 200 Q500 220 440 180 T380 60 Z" fill="#ecf5ee" stroke="#c8e6cf" strokeWidth="1"/>
        {/* Roads */}
        <path d="M0 220 Q200 180 400 230 T600 200" fill="none" stroke="#fff" strokeWidth="3" opacity=".7"/>
        <path d="M120 0 Q140 150 200 250 T280 400" fill="none" stroke="#fff" strokeWidth="2" opacity=".5"/>
        {/* Markers */}
        {[
          [180, 180, '#1f6f3f'],
          [240, 230, '#1d6dc4'],
          [340, 160, '#e6b450'],
          [420, 220, '#c4623a'],
          [290, 290, '#1f6f3f'],
          [150, 280, '#2e9a5b'],
          [460, 280, '#1d6dc4'],
        ].map(([cx, cy, c], i) => (
          <g key={i}>
            <circle cx={String(cx)} cy={String(cy)} r="14" fill={String(c)} opacity=".18"/>
            <circle cx={String(cx)} cy={String(cy)} r="6" fill={String(c)} stroke="#fff" strokeWidth="2"/>
          </g>
        ))}
      </svg>
    </div>
  );
};

