"use client";
import React from "react";
import { Icon } from "./icons";
import { Avatar, ImagePlaceholder, ScorePill, VerifiedImpact } from "./primitives";
import { useApp } from "./app-context";

// =============== Image lightbox ===============
export function ImageLightbox({ label, onClose }: { label: string; onClose: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,.85)', display: 'grid', placeItems: 'center',
      backdropFilter: 'blur(6px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        {label.startsWith('http') ? (
          <img src={label} alt="" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain', display: 'block' }} />
        ) : (
          <ImagePlaceholder label={label} height={560} />
        )}
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, display: 'grid', placeItems: 'center',
          cursor: 'pointer', color: '#fff',
        }}><Icon name="close" size={18} /></button>
      </div>
    </div>
  );
}

// =============== Mock data ===============
export const MOCK = {
  users: {
    sarah:     { name: 'Sarah Green',             handle: 'sarahgreen',   score: 92, verified: true,  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80' },
    marcus:    { name: 'Marcus Johnson',           handle: 'ecomarcus',    score: 78, verified: false, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80' },
    greentech: { name: 'GreenTech Solutions',      handle: 'greentech',    score: 96, verified: true,  avatar: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=200&q=80' },
    maya:      { name: 'Maya Patel',               handle: 'urbangrower',  score: 71, verified: false, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80' },
    can:       { name: 'Climate Action Network',   handle: 'climateactnow',score: 88, verified: true,  avatar: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&q=80' },
    you:       { name: 'You',                      handle: 'you',          score: 86, verified: false, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80' },
    tara:      { name: 'Tara Lin',                 handle: 'tara_l',       score: 64, verified: false, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80' },
    okafor:    { name: 'Dr. Adaeze Okafor',        handle: 'dr_okafor',    score: 94, verified: true,  avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80' },
  },
  posts: [
    {
      id: 1, user: 'sarah',
      content: 'Just installed 20 solar panels on our community center. This cuts our footprint ~80% and saves the co-op $3,000/yr. Small steps, real ledger entries.',
      tags: ['SolarEnergy', 'CommunityAction'],
      location: 'Portland, Oregon',
      category: 'Solar',
      score: 85,
      verified: { value: '1.4t', unit: 'CO₂ /yr' },
      likes: 234, comments: 18, reposts: 45,
      time: '2h',
      image: 'solar panel install — wide shot',
      imageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80',
    },
    {
      id: 2, user: 'marcus',
      content: 'Week 3 of the zero-waste challenge. 90% reduction this week thanks to composting + bulk shopping. Anyone in Austin want to start a neighborhood compost route?',
      tags: ['ZeroWaste', 'Composting'],
      location: 'Austin, TX',
      category: 'Waste',
      score: 72,
      likes: 156, comments: 32, reposts: 28,
      time: '5h',
      image: 'compost bin + jars',
      imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
      image2: 'reusable bag shopping haul',
      image2Url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
    },
    {
      id: 3, user: 'greentech',
      content: 'Our new turbine blade design is 40% more efficient than the 2024 baseline. White paper drops Monday. Pre-print linked below.',
      tags: ['WindPower', 'Research'],
      location: 'Copenhagen, DK',
      category: 'Wind',
      score: 95,
      verified: { value: '12t', unit: 'CO₂ avoided' },
      likes: 892, comments: 67, reposts: 234,
      time: '8h',
      image: 'wind turbine blade prototype',
      imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=80',
    },
    {
      id: 4, user: 'maya',
      content: 'Balcony garden update: 14 species, 2 sq meters, feeds two people half the week. Pollinator visits doubled since week 1.',
      tags: ['UrbanGardening', 'Biodiversity'],
      location: 'Brooklyn, NY',
      category: 'Agriculture',
      score: 68,
      likes: 445, comments: 89, reposts: 67,
      time: '1d',
      image: 'balcony tomatoes close-up',
      imageUrl: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&q=80',
      image2: 'herb pots arranged',
      image2Url: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=800&q=80',
    },
    {
      id: 5, user: 'can',
      content: 'Global Climate Strike, Friday. 47 cities confirmed. Your city probably has one too — find it on the map.',
      tags: ['ClimateStrike'],
      location: 'Global',
      category: 'Activism',
      score: 88,
      likes: 1247, comments: 156, reposts: 567,
      time: '1d',
      image: 'crowd at climate march',
      imageUrl: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=800&q=80',
    },
  ],
  challenges: [
    { id: 1, title: 'Bike-to-work week', joined: '12.4k', days: 7, reward: '120 GP', cat: 'Transport' },
    { id: 2, title: 'No-meat Mondays', joined: '38.2k', days: 30, reward: '50 GP /wk', cat: 'Food' },
    { id: 3, title: 'Plant 5 trees in May', joined: '4.8k', days: 31, reward: '200 GP', cat: 'Nature' },
    { id: 4, title: 'Cut 100kWh this month', joined: '9.1k', days: 30, reward: '150 GP', cat: 'Energy' },
  ],
  communities: [
    { name: 'Urban gardeners',      members: '24.1k', cover: 'urban garden hero',          coverUrl: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&q=80', cat: 'Agriculture' },
    { name: 'Solar DIY',            members: '18.6k', cover: 'solar panels diy',            coverUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80', cat: 'Energy' },
    { name: 'Ocean cleanup crew',   members: '41.3k', cover: 'beach cleanup volunteers',    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', cat: 'Ocean' },
    { name: 'Climate policy nerds', members: '12.9k', cover: 'climate policy paper',        coverUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80', cat: 'Policy' },
    { name: 'Zero-waste households',members: '33.7k', cover: 'mason jars pantry',           coverUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&q=80', cat: 'Waste' },
    { name: 'EV owners',            members: '52.0k', cover: 'EV charging station',         coverUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80', cat: 'Transport' },
  ],
  products: [
    { name: 'Refillable shampoo bar',  price: '$12', brand: 'BareHaus', tag: 'Plastic-free',  img: 'shampoo bar product shot',  imgUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80' },
    { name: 'Solar phone charger',     price: '$48', brand: 'Sunly',    tag: 'Solar',          img: 'solar charger flat lay',    imgUrl: 'https://images.unsplash.com/photo-1620634409738-62a2e2b1a5b7?w=400&q=80' },
    { name: 'Bamboo cutlery set',      price: '$18', brand: 'Forrest',  tag: 'Compostable',    img: 'bamboo cutlery roll',       imgUrl: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&q=80' },
    { name: 'Reusable produce bags',   price: '$16', brand: 'Loop',     tag: 'Zero-waste',     img: 'mesh produce bags',         imgUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&q=80' },
    { name: 'Wool insulation panel',   price: '$89', brand: 'Hjem',     tag: 'Carbon-neg',     img: 'wool insulation roll',      imgUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
    { name: 'Compost starter kit',     price: '$34', brand: 'Soily',    tag: 'Soil',           img: 'compost starter kit',       imgUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80' },
  ],
  trends: [
    { tag: 'SolarPanels', posts: '12.4k' },
    { tag: 'ClimateStrike', posts: '8.9k' },
    { tag: 'ZeroWaste', posts: '6.2k' },
    { tag: 'UrbanGardening', posts: '5.7k' },
    { tag: 'CarbonOffsets', posts: '4.1k' },
  ],
};

// =============== Post card ===============
export function PostCard({ post, dense = false }) {
  const app = useApp();
  const user = MOCK.users[post.user];
  const liked = app.like?.has(post.id);
  const saved = app.save?.has(post.id);
  const [lightbox, setLightbox] = React.useState<string | null>(null);
  const open = () => app.nav?.('post', { id: post.id });
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  return (
    <article onClick={open} className="post-card" style={{
      background: 'var(--surface)', borderRadius: 16,
      border: '1px solid var(--line)', padding: dense ? 16 : 20,
      marginBottom: 12, cursor: 'pointer',
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <span onClick={stop(() => app.nav?.('profile', { handle: user.handle }))}><Avatar src={user.avatar} name={user.name} size={42} verified={user.verified} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span onClick={stop(() => app.nav?.('profile', { handle: user.handle }))} style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{user.name}</span>
            {user.verified && <span style={{
              background: 'var(--sky)', color: '#fff', width: 14, height: 14,
              borderRadius: '50%', display: 'inline-grid', placeItems: 'center', fontSize: 9,
            }}>✓</span>}
            <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>@{user.handle}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>· {post.time}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Icon name="pin" size={11} color="var(--ink-4)" />
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{post.location}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>{post.category}</span>
          </div>
        </div>
        <ScorePill score={post.score} label="" />
      </header>

      <p style={{
        margin: '0 0 12px', fontSize: dense ? 14 : 15, lineHeight: 1.55,
        color: 'var(--ink-2)', textWrap: 'pretty',
      }}>{post.content}</p>

      {post.tags && post.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {post.tags.map(t => (
            <span key={t} onClick={stop(() => app.nav?.('explore', { tag: t }))} style={{
              color: 'var(--sky)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>#{t}</span>
          ))}
        </div>
      )}

      {post.image && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: post.image2 ? '1fr 1fr' : '1fr',
          gap: 6, marginBottom: 12,
        }}>
          <span onClick={stop(() => setLightbox(post.imageUrl || post.image))} style={{ cursor: 'zoom-in', borderRadius: 10, overflow: 'hidden', display: 'block' }}>
            <ImagePlaceholder label={post.image} height={dense ? 200 : 280} src={post.imageUrl} />
          </span>
          {post.image2 && (
            <span onClick={stop(() => setLightbox(post.image2Url || post.image2))} style={{ cursor: 'zoom-in', borderRadius: 10, overflow: 'hidden', display: 'block' }}>
              <ImagePlaceholder label={post.image2} height={dense ? 200 : 280} src={post.image2Url} />
            </span>
          )}
        </div>
      )}
      {lightbox && <ImageLightbox label={lightbox} onClose={() => setLightbox(null)} />}

      {post.verified && (
        <div style={{ marginBottom: 12 }}>
          <VerifiedImpact value={post.verified.value} unit={post.verified.unit} />
        </div>
      )}

      <footer style={{
        display: 'flex', alignItems: 'center', gap: 24,
        paddingTop: 4, color: 'var(--ink-3)',
      }}>
        <ActionBtn icon="heart" count={post.likes + (liked ? 1 : 0)} active={liked} activeColor="var(--clay)" onClick={stop(() => app.like.toggle(post.id))} />
        <ActionBtn icon="comment" count={post.comments} onClick={stop(open)} />
        <ActionBtn icon="repost" count={post.reposts} onClick={stop(() => app.toast?.({ msg: 'Reposted to your followers', icon: 'repost' }))} />
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <ActionBtn icon="bookmark" active={saved} onClick={stop(() => { app.save.toggle(post.id); app.toast?.(saved ? { msg: 'Removed from bookmarks', icon: 'bookmark' } : { msg: 'Saved to bookmarks', kind: 'success', icon: 'bookmark' }); })} />
          <ActionBtn icon="share" onClick={stop(() => app.toast?.({ msg: 'Link copied', sub: 'Post link copied to clipboard.', icon: 'share' }))} />
        </span>
      </footer>
    </article>
  );
};

export function ActionBtn({ icon, count, active, activeColor = 'var(--green)', onClick }: { icon: any; count?: number | string; active?: boolean; activeColor?: string; onClick?: React.MouseEventHandler<HTMLButtonElement> }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      color: active ? activeColor : 'var(--ink-3)', fontSize: 13, fontFamily: 'Geist Mono', fontWeight: 500,
      transition: 'color .12s',
    }}>
      <Icon name={icon} size={18} stroke={active ? 2.2 : 1.7} />
      {count !== undefined && <span>{formatCount(count)}</span>}
    </button>
  );
};

export function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  return String(n);
};

// Right column trending widget for desktop
export function TrendingPanel() {
  const app = useApp();
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16,
      border: '1px solid var(--line)', padding: 18, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Trending now</h3>
        <Icon name="sparkles" size={16} color="var(--green)" />
      </div>
      {MOCK.trends.map((t, i) => (
        <div key={t.tag} onClick={() => app.nav?.('explore')} className="row-hover" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 8px', margin: '0 -8px', borderRadius: 8,
          borderTop: i === 0 ? 'none' : '1px solid var(--line)',
          cursor: 'pointer',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono' }}>#{i + 1} · trending</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>#{t.tag}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t.posts} posts today</div>
          </div>
          <Icon name="arrow" size={16} color="var(--ink-4)" />
        </div>
      ))}
    </div>
  );
};

// Right column streak / impact summary widget
export function MyImpactCard() {
  const app = useApp();
  return (
    <div onClick={() => app.nav?.('impact')} style={{
      background: 'linear-gradient(135deg, #1f6f3f 0%, #2e9a5b 100%)',
      borderRadius: 16, padding: 18, color: '#fff',
      marginBottom: 12, position: 'relative', overflow: 'hidden', cursor: 'pointer',
    }}>
      <div style={{
        position: 'absolute', right: -30, top: -30, width: 140, height: 140,
        borderRadius: '50%', background: 'rgba(255,255,255,.07)',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 12, opacity: .85, fontFamily: 'Geist Mono', letterSpacing: '.05em' }}>YOUR IMPACT · MAY</span>
        <Icon name="leaf" size={18} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Bricolage Grotesque' }}>−164<span style={{ fontSize: 14, opacity: .7 }}> kg</span></div>
          <div style={{ fontSize: 11, opacity: .85 }}>CO₂ avoided</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Bricolage Grotesque' }}>12<span style={{ fontSize: 14, opacity: .7 }}> day</span></div>
          <div style={{ fontSize: 11, opacity: .85 }}>streak 🔥</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 12, opacity: .9 }}>
        <span>1,240 GP</span>
        <span>·</span>
        <span>24 IT</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          See dashboard <Icon name="arrow" size={12} />
        </span>
      </div>
    </div>
  );
};

// Suggested follows
export function SuggestedFollows() {
  const app = useApp();
  const list = ['okafor', 'maya', 'greentech'];
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16,
      border: '1px solid var(--line)', padding: 18,
    }}>
      <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600 }}>People to follow</h3>
      {list.map(k => {
        const u = MOCK.users[k];
        const following = app.follow?.has(u.handle);
        return (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <span onClick={() => app.nav?.('profile', { handle: u.handle })} style={{ cursor: 'pointer' }}><Avatar src={u.avatar} name={u.name} size={36} verified={u.verified} /></span>
            <div onClick={() => app.nav?.('profile', { handle: u.handle })} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                {u.name}
                {u.verified && <span style={{
                  background: 'var(--sky)', color: '#fff', width: 12, height: 12,
                  borderRadius: '50%', fontSize: 8, display: 'inline-grid', placeItems: 'center',
                }}>✓</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>@{u.handle} · {u.score} impact</div>
            </div>
            <button className={following ? 'btn btn-green' : 'btn btn-ghost'} onClick={() => { app.follow.toggle(u.handle); app.toast?.(following ? { msg: `Unfollowed ${u.name}`, icon: 'user' } : { msg: `Following ${u.name}`, kind: 'success', icon: 'user' }); }} style={{ padding: '5px 12px', fontSize: 12 }}>{following ? 'Following' : 'Follow'}</button>
          </div>
        );
      })}
    </div>
  );
};

// =============== Threaded comments (nested, expandable) ===============
let __cid = 9000;
export function makeCommentSeed() {
  return [
    { id: ++__cid, user: 'marcus', text: 'How are you splitting the inverter cost across members?', time: '32m', likes: 12, replies: [
      { id: ++__cid, user: 'sarah', text: 'Per-panel share — everyone pays for what they pull. Happy to send the spreadsheet.', time: '28m', likes: 6, replies: [
        { id: ++__cid, user: 'marcus', text: 'That would be amazing, thank you 🙏', time: '20m', likes: 2, replies: [] },
      ] },
    ] },
    { id: ++__cid, user: 'maya', text: 'Following — we’re trying the same in our building. Any vendor recs?', time: '1h', likes: 8, replies: [
      { id: ++__cid, user: 'greentech', text: 'We can intro you to our installer — DM us.', time: '52m', likes: 4, replies: [] },
    ] },
    { id: ++__cid, user: 'okafor', text: 'Inspiring work. What permitting hurdles did you hit?', time: '2h', likes: 15, replies: [] },
  ];
};

// recursive helpers (immutable)
function __mapNode(list, id, fn) {
  return list.map(n => n.id === id ? fn(n) : { ...n, replies: __mapNode(n.replies || [], id, fn) });
}
function __addReply(list, parentId, node) {
  return list.map(n => n.id === parentId
    ? { ...n, replies: [...(n.replies || []), node] }
    : { ...n, replies: __addReply(n.replies || [], parentId, node) });
}

export function CommentThread({ tree, setTree, dense = false }) {
  const like = (id) => setTree(t => __mapNode(t, id, n => ({ ...n, _liked: !n._liked, likes: n.likes + (n._liked ? -1 : 1) })));
  const reply = (parentId, text) => setTree(t => __addReply(t, parentId, { id: ++__cid, user: 'you', text, time: 'now', likes: 0, replies: [] }));
  return (
    <div>
      {tree.map(n => <CommentNode key={n.id} node={n} depth={0} like={like} reply={reply} dense={dense} defaultOpen />)}
    </div>
  );
};

export function CommentNode({ node, depth, like, reply, dense, defaultOpen }: { node: any; depth: number; like: (id: number) => void; reply: (parentId: number, text: string) => void; dense?: boolean; defaultOpen?: boolean }) {
  const usr = MOCK.users[node.user] || { name: 'You', handle: 'you' };
  const kids = node.replies || [];
  const [open, setOpen] = React.useState(!!defaultOpen && depth < 1);
  const [replying, setReplying] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const send = () => { if (!draft.trim()) return; reply(node.id, draft.trim()); setDraft(''); setReplying(false); setOpen(true); };
  const av = dense ? 32 : 36;
  return (
    <div style={{ display: 'flex', gap: 10, paddingTop: 14 }}>
      <Avatar src={usr.avatar} name={usr.name} size={av} verified={usr.verified} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: dense ? 13 : 13.5, fontWeight: 600 }}>{usr.name}</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'Geist Mono' }}>@{usr.handle} · {node.time}</span>
        </div>
        <p style={{ margin: '3px 0 6px', fontSize: dense ? 13.5 : 14, lineHeight: 1.5, color: 'var(--ink-2)', textWrap: 'pretty' }}>{node.text}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: 'var(--ink-3)' }}>
          <ActionBtn icon="heart" count={node.likes} active={node._liked} activeColor="var(--clay)" onClick={() => like(node.id)} />
          <button onClick={() => setReplying(r => !r)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist Mono', padding: 0 }}>Reply</button>
        </div>

        {replying && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); if (e.key === 'Escape') setReplying(false); }}
              placeholder={`Reply to @${usr.handle}…`} style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--line)', outline: 'none', borderRadius: 999, padding: '8px 13px', fontSize: 13.5, fontFamily: 'Geist', color: 'var(--ink)' }} />
            <button className="btn btn-primary" style={{ padding: '7px 13px', fontSize: 12 }} onClick={send}>Reply</button>
          </div>
        )}

        {kids.length > 0 && (
          <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', padding: '10px 0 0' }}>
            <span style={{ width: 22, height: 1, background: 'var(--line-2)', display: 'inline-block' }} />
            <span style={{ display: 'inline-flex', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><Icon name="chevron" size={13} stroke={2.4} /></span>
            {open ? 'Hide' : `View ${kids.length} ${kids.length === 1 ? 'reply' : 'replies'}`}
          </button>
        )}

        {open && kids.length > 0 && (
          <div style={{ borderLeft: '2px solid var(--line)', paddingLeft: depth < 2 ? 12 : 6, marginLeft: 2, marginTop: 2 }}>
            {kids.map(k => <CommentNode key={k.id} node={k} depth={depth + 1} like={like} reply={reply} dense={dense} />)}
          </div>
        )}
      </div>
    </div>
  );
};
