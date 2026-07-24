"use client";
// v3 — real Supabase search
import React from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { Avatar, ImagePlaceholder } from "@/components/primitives";
import { MOCK } from "@/components/post-card";
import { MOCK_SELLER } from "@/components/seller-data";
import { useApp } from "@/components/app-context";
import { DesktopSidebar } from "@/components/sidebar";
import { supabase } from "@/lib/supabase";

// Products remain mock (no products table yet)
const ALL_PRODUCTS = [
  ...MOCK.products.map(p => ({ ...p, _type: 'product' as const })),
  ...MOCK_SELLER.products.map(p => ({
    name: p.title, price: `$${p.price}`, brand: MOCK_SELLER.shop.name,
    tag: p.tag, img: p.img, imgUrl: null, _type: 'product' as const,
  })),
];

function match(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some(f => f?.toLowerCase().includes(q));
}

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

type Tab = 'all' | 'products' | 'people' | 'posts';

function ProductCard({ product, onNav }: { product: any; onNav: any }) {
  return (
    <div onClick={() => onNav?.('marketplace')} style={{
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
      overflow: 'hidden', cursor: 'pointer', transition: 'border-color .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
    >
      <div style={{ height: 160, overflow: 'hidden', background: 'var(--bg-2)' }}>
        {product.imgUrl
          ? <img src={product.imgUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <ImagePlaceholder label={product.img || product.name} height={160} />}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 3 }}>{product.brand}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 6 }}>{product.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'JetBrains Mono' }}>{product.price}</span>
          {product.tag && (
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--green)', background: 'var(--green-tint)', padding: '2px 8px', borderRadius: 999 }}>{product.tag}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PeopleCard({ person, onNav }: { person: any; onNav: any }) {
  const name = person.full_name ?? person.name;
  const score = person.impact_score ?? person.score;
  const bio = person.bio ?? person.tagline;
  return (
    <div onClick={() => onNav?.('profile', { handle: person.handle })} style={{
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '16px 18px', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center',
      transition: 'border-color .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
    >
      <Avatar src={person.avatar_url ?? person.avatar} name={name} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{person.handle}</div>
        {bio && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bio}</div>}
      </div>
      {score != null && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>Impact</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono' }}>{score}</div>
        </div>
      )}
    </div>
  );
}

function PostRow({ post, onNav }: { post: any; onNav: any }) {
  const userName = post.profile?.full_name ?? post.userName;
  const userHandle = post.profile?.handle ?? post.userHandle;
  const userAvatar = post.profile?.avatar_url ?? post.userAvatar;
  const timeStr = post.created_at ? timeAgo(post.created_at) : (post.time ?? '');
  return (
    <div onClick={() => onNav?.('post', { id: post.id })} style={{
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '14px 18px', cursor: 'pointer', transition: 'border-color .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <Avatar src={userAvatar} name={userName} size={36} />
        <div>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{userName}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', marginLeft: 6, fontFamily: 'JetBrains Mono' }}>@{userHandle}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', marginLeft: 6 }}>· {timeStr}</span>
        </div>
        {post.category && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>{post.category}</span>}
      </div>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>
      {post.tags && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {post.tags.map((t: string) => <span key={t} style={{ fontSize: 12, color: 'var(--sky)' }}>#{t}</span>)}
        </div>
      )}
    </div>
  );
}

export function DesktopSearch({ onNav }: { onNav?: any }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(searchParams?.get('q') || '');
  const [tab, setTab] = React.useState<Tab>('all');
  const [dbPeople, setDbPeople] = React.useState<any[]>([]);
  const [dbPosts, setDbPosts] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { nav } = useApp();

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (query.length < 2) {
      setDbPeople([]);
      setDbPosts([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const [{ data: people }, { data: posts }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, handle, full_name, avatar_url, bio, impact_score')
          .or(`handle.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(20),
        supabase
          .from('posts')
          .select('id, content, created_at, image_url, likes_count, comments_count, profile:profiles!posts_user_id_fkey(id, handle, full_name, avatar_url)')
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      setDbPeople(people ?? []);
      setDbPosts(posts ?? []);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const products = ALL_PRODUCTS.filter(p => match(query, p.name, p.brand, p.tag));
  const people = dbPeople;
  const posts = dbPosts;

  const totalCount = products.length + people.length + posts.length;
  const hasQuery = query.length > 0;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'products', label: 'Products', count: products.length },
    { key: 'people', label: 'People', count: people.length },
    { key: 'posts', label: 'Posts', count: posts.length },
  ];

  const handleNav = onNav || nav;

  let resultsBody: React.ReactNode;
  if (!hasQuery) {
    resultsBody = <EmptyState />;
  } else if (searching) {
    resultsBody = <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Searching…</div>;
  } else if (query.length < 2) {
    resultsBody = <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Keep typing…</div>;
  } else if (totalCount === 0) {
    resultsBody = <NoResults query={query} />;
  } else {
    resultsBody = (
      <React.Fragment>
        {(tab === 'all' || tab === 'products') && products.length > 0 && (
          <Section label="Products" count={products.length} showAll={tab === 'all' && products.length > 4} onShowAll={() => setTab('products')}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {(tab === 'all' ? products.slice(0, 4) : products).map((p, i) => (
                <ProductCard key={i} product={p} onNav={handleNav} />
              ))}
            </div>
          </Section>
        )}
        {(tab === 'all' || tab === 'people') && people.length > 0 && (
          <Section label="People" count={people.length} showAll={tab === 'all' && people.length > 3} onShowAll={() => setTab('people')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(tab === 'all' ? people.slice(0, 3) : people).map((p, i) => (
                <PeopleCard key={i} person={p} onNav={handleNav} />
              ))}
            </div>
          </Section>
        )}
        {(tab === 'all' || tab === 'posts') && posts.length > 0 && (
          <Section label="Posts" count={posts.length} showAll={tab === 'all' && posts.length > 3} onShowAll={() => setTab('posts')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(tab === 'all' ? posts.slice(0, 3) : posts).map((p, i) => (
                <PostRow key={i} post={p} onNav={handleNav} />
              ))}
            </div>
          </Section>
        )}
      </React.Fragment>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      <DesktopSidebar active="search" onNav={handleNav} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px 0', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 600 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                <Icon name="search" size={18} color="var(--ink-4)" />
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setTab('all'); }}
                placeholder="Search posts, people, products…"
                style={{
                  width: '100%', padding: '12px 14px 12px 42px',
                  background: 'var(--bg)', border: '1px solid var(--line)',
                  borderRadius: 12, fontSize: 15, color: 'var(--ink)',
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--green)')}
                onBlur={e => (e.target.style.borderColor = 'var(--line)')}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 2,
                }}>
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 16px', fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? 'var(--ink)' : 'var(--ink-3)',
                borderBottom: tab === t.key ? '2px solid var(--green)' : '2px solid transparent',
                marginBottom: -1, transition: 'color .15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {t.label}
                {hasQuery && !searching && (
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', background: tab === t.key ? 'var(--green-tint)' : 'var(--bg-2)', color: tab === t.key ? 'var(--green)' : 'var(--ink-4)', padding: '1px 6px', borderRadius: 999 }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }} className="no-scrollbar">
          {resultsBody}
        </div>
      </div>
    </div>
  );
}

function Section({ label, count, showAll, onShowAll, children }: { label: string; count: number; showAll: boolean; onShowAll: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{label}</h2>
          <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)' }}>{count}</span>
        </div>
        {showAll && (
          <button onClick={onShowAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--sky)', fontWeight: 600, padding: 0 }}>
            See all →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState() {
  const suggestions = ['bamboo', 'solar', 'zero-waste', 'repair', 'organic', 'compost'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48, gap: 20, color: 'var(--ink-3)' }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
        <Icon name="search" size={26} color="var(--ink-4)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Search Honua</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: 360 }}>Find sustainable products, people, and posts from the community</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 400 }}>
        {suggestions.map(s => (
          <span key={s} style={{ fontSize: 13, color: 'var(--sky)', background: 'color-mix(in srgb, var(--sky) 10%, transparent)', padding: '5px 14px', borderRadius: 999, cursor: 'default' }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48, gap: 16, color: 'var(--ink-3)' }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
        <Icon name="search" size={26} color="var(--ink-4)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No results for "{query}"</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>Try different keywords or browse the Marketplace</div>
      </div>
    </div>
  );
}
