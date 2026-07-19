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
  const [showShare, setShowShare] = React.useState(false);
  const [showBookmark, setShowBookmark] = React.useState(false);
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
            <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{user.handle}</span>
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
        <ActionBtn icon="repost" count={post.reposts + (app.repost?.has(post.id) ? 1 : 0)} active={app.repost?.has(post.id)} activeColor="var(--green)" onClick={stop(() => { app.repost?.toggle(post.id); app.toast?.({ msg: app.repost?.has(post.id) ? 'Repost removed' : 'Reposted to your followers', icon: 'repost' }); })} />
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <ActionBtn icon="bookmark" active={saved} onClick={stop(() => setShowBookmark(true))} />
          <ActionBtn icon="share" onClick={stop(() => setShowShare(true))} />
        </span>
      </footer>
      {showBookmark && (
        <BookmarkSheet
          postId={post.id}
          saved={!!saved}
          onSave={(colId, colName) => { app.save?.addToCollection(post.id, colId) ?? app.save?.toggle(post.id, colId); app.toast?.({ msg: `Saved to "${colName}"`, kind: 'success', icon: 'bookmark' }); setShowBookmark(false); }}
          onRemove={() => { app.save?.toggle(post.id); app.toast?.({ msg: 'Removed from bookmarks', icon: 'bookmark' }); setShowBookmark(false); }}
          onClose={() => setShowBookmark(false)}
        />
      )}
      {showShare && (
        <ShareSheet
          url={typeof window !== 'undefined' ? window.location.origin + '/post/' + post.id : '/post/' + post.id}
          text={post.body ? post.body.slice(0, 100) : 'Check this out on Honua'}
          onClose={() => setShowShare(false)}
        />
      )}
    </article>
  );
};

// =============== Bookmark sheet ===============
export function BookmarkSheet({ postId, saved, onSave, onRemove, onClose }: {
  postId: string; saved: boolean;
  onSave: (collectionId: string | undefined, collectionName: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const app = useApp();
  const collections: any[] = app.collections ?? [];

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', borderRadius: 20, width: 360, padding: '20px 20px 22px', boxShadow: '0 24px 60px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="font-display" style={{ fontSize: 17, fontWeight: 600 }}>Save to collection</span>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: 'none', borderRadius: 9, width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <Icon name="close" size={15} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
          {/* Save without a collection */}
          <button onClick={() => onSave(undefined, 'Bookmarks')} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'transparent', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon name="bookmark" size={16} color="var(--green)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>All bookmarks</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Save without a collection</div>
            </div>
          </button>
          {/* User collections */}
          {collections.map(col => (
            <button key={col.id} onClick={() => onSave(col.id, col.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'transparent', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 18 }}>
                {col.emoji}
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{col.name}</span>
            </button>
          ))}
          {collections.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', padding: '4px 12px', margin: 0 }}>No collections yet — create one below.</p>
          )}
        </div>
        <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, padding: '9px 0', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-3)', fontFamily: 'Satoshi', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
            onClick={() => { app.openModal('newcollection'); onClose(); }}>
            <Icon name="plus" size={13} /> New collection
          </button>
          {saved && (
            <button onClick={onRemove} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: 'var(--clay)', fontFamily: 'Satoshi' }}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============== Share sheet ===============
// SVGs as path strings to avoid module-level JSX (causes Next.js SSR 500)
const SHARE_PLATFORMS: { name: string; bg: string; fg: string; path: string; stroke?: boolean; href: (...args: string[]) => string }[] = [
  { name: 'X / Twitter', bg: '#000', fg: '#fff', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.259 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z', href: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { name: 'WhatsApp', bg: '#25D366', fg: '#fff', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z', href: (url, text) => `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}` },
  { name: 'Telegram', bg: '#2CA5E0', fg: '#fff', path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z', href: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { name: 'Facebook', bg: '#1877F2', fg: '#fff', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z', href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { name: 'LinkedIn', bg: '#0A66C2', fg: '#fff', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z', href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  { name: 'Reddit', bg: '#FF4500', fg: '#fff', path: 'M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z', href: (url, text) => `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}` },
  { name: 'Threads', bg: '#000', fg: '#fff', path: 'M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.851 1.205 8.604.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.02-5.11.895-6.54 2.604C4.366 6.108 3.69 8.418 3.666 12c.024 3.59.698 5.9 2.144 7.271 1.43 1.71 3.63 2.587 6.54 2.6 2.7-.015 4.5-.62 5.74-1.894 1.168-1.197 1.69-2.8 1.689-4.995V14.7h-5.376v-2.17h7.535v2.342c.005 3.016-.722 5.35-2.183 6.865-1.573 1.63-3.872 2.253-6.569 2.263z', href: (url, text) => `https://www.threads.net/intent/post?text=${encodeURIComponent(text + '\n' + url)}` },
  { name: 'Email', bg: 'var(--surface)', fg: 'var(--ink)', path: 'M2 4h20v16H2zM2 7l10 7 10-7', stroke: true, href: (url, text) => `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}` },
];

export function ShareSheet({ url, text, onClose }: { url: string; text: string; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);

  const copyLink = () => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', borderRadius: 20, width: 400, padding: '22px 22px 26px', boxShadow: '0 24px 60px rgba(0,0,0,.18)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>Share</span>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: 'none', borderRadius: 9, width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <Icon name="close" size={15} />
          </button>
        </div>

        {/* Copy link row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', borderRadius: 12, padding: '9px 9px 9px 14px', marginBottom: 22 }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
          <button onClick={copyLink} style={{
            background: copied ? 'var(--green)' : 'var(--ink)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0, fontFamily: 'Satoshi', transition: 'background .2s',
          }}>{copied ? 'Copied!' : 'Copy link'}</button>
        </div>

        {/* Platform grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {SHARE_PLATFORMS.map(p => (
            <a key={p.name} href={p.href(url, text)} target="_blank" rel="noopener noreferrer"
              onClick={onClose}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, textDecoration: 'none', padding: '8px 4px', borderRadius: 12, cursor: 'pointer', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: p.bg, display: 'grid', placeItems: 'center', color: p.fg, border: p.bg === 'var(--surface)' ? '1px solid var(--line)' : 'none', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill={p.stroke ? 'none' : 'currentColor'} stroke={p.stroke ? 'currentColor' : 'none'} strokeWidth={p.stroke ? 1.75 : undefined} strokeLinecap="round" strokeLinejoin="round">
                  <path d={p.path} />
                </svg>
              </div>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', fontFamily: 'Satoshi', lineHeight: 1.2 }}>{p.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const BURST_DOTS = [
  { dx: '0px', dy: '-22px' },
  { dx: '16px', dy: '-16px' },
  { dx: '22px', dy: '0px' },
  { dx: '16px', dy: '16px' },
  { dx: '0px', dy: '22px' },
  { dx: '-16px', dy: '16px' },
  { dx: '-22px', dy: '0px' },
  { dx: '-16px', dy: '-16px' },
];

export function ActionBtn({ icon, count, active, activeColor = 'var(--green)', onClick }: { icon: any; count?: number | string; active?: boolean; activeColor?: string; onClick?: React.MouseEventHandler<HTMLButtonElement> }) {
  const filled = active && (icon === 'heart' || icon === 'bookmark');
  const [popping, setPopping] = React.useState(false);
  const [bursting, setBursting] = React.useState(false);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (icon === 'heart' && !active) {
      setPopping(true);
      setBursting(true);
      setTimeout(() => setPopping(false), 450);
      setTimeout(() => setBursting(false), 600);
    }
    onClick?.(e);
  };

  return (
    <button onClick={handleClick} style={{
      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      color: active ? activeColor : 'var(--ink-3)', fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 500,
      transition: 'color .12s', position: 'relative',
    }}>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ display: 'inline-flex', animation: popping ? 'heart-pop 0.45s cubic-bezier(.36,.07,.19,.97) forwards' : 'none' }}>
          <Icon name={icon} size={18} stroke={filled ? 0 : 1.7} fill={filled ? activeColor : 'none'} color={active ? activeColor : 'var(--ink-3)'} />
        </span>
        {bursting && BURST_DOTS.map((d, i) => (
          <span key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 5, height: 5, borderRadius: '50%',
            background: activeColor,
            '--dx': d.dx, '--dy': d.dy,
            animation: `burst-dot 0.55s ease-out ${i * 18}ms forwards`,
            pointerEvents: 'none',
          } as React.CSSProperties} />
        ))}
      </span>
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
        <div key={t.tag} onClick={() => app.nav?.('explore', { tag: t.tag })} className="row-hover" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 8px', margin: '0 -8px', borderRadius: 8,
          borderTop: i === 0 ? 'none' : '1px solid var(--line)',
          cursor: 'pointer',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>#{i + 1} · trending</div>
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
        <span style={{ fontSize: 12, opacity: .85, fontFamily: 'JetBrains Mono', letterSpacing: '.05em' }}>YOUR IMPACT · MAY</span>
        <Icon name="leaf" size={18} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Lora' }}>−164<span style={{ fontSize: 14, opacity: .7 }}> kg</span></div>
          <div style={{ fontSize: 11, opacity: .85 }}>CO₂ avoided</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Lora' }}>12<span style={{ fontSize: 14, opacity: .7 }}> day</span></div>
          <div style={{ fontSize: 11, opacity: .85 }}>streak</div>
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
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{u.handle} · {u.score} impact</div>
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
        { id: ++__cid, user: 'marcus', text: 'That would be amazing, thank you!', time: '20m', likes: 2, replies: [] },
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
          <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{usr.handle} · {node.time}</span>
        </div>
        <p style={{ margin: '3px 0 6px', fontSize: dense ? 13.5 : 14, lineHeight: 1.5, color: 'var(--ink-2)', textWrap: 'pretty' }}>{node.text}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: 'var(--ink-3)' }}>
          <ActionBtn icon="heart" count={node.likes} active={node._liked} activeColor="var(--clay)" onClick={() => like(node.id)} />
          <button onClick={() => setReplying(r => !r)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 12.5, fontWeight: 600, fontFamily: 'JetBrains Mono', padding: 0 }}>Reply</button>
        </div>

        {replying && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); if (e.key === 'Escape') setReplying(false); }}
              placeholder={`Reply to @${usr.handle}…`} style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--line)', outline: 'none', borderRadius: 999, padding: '8px 13px', fontSize: 13.5, fontFamily: 'Satoshi', color: 'var(--ink)' }} />
            <button className="btn btn-primary" style={{ padding: '7px 13px', fontSize: 12 }} onClick={send}>Reply</button>
          </div>
        )}

        {kids.length > 0 && (
          <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 12.5, fontWeight: 600, fontFamily: 'Satoshi', padding: '10px 0 0' }}>
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
