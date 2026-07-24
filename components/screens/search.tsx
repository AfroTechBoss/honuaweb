"use client";
// v2
import React from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { Avatar, ImagePlaceholder } from "@/components/primitives";
import { MOCK } from "@/components/post-card";
import { MOCK_SELLER } from "@/components/seller-data";
import { useApp } from "@/components/app-context";
import { DesktopSidebar } from "@/components/sidebar";

// ---- Search corpus ----
const ALL_PRODUCTS = [
  ...MOCK.products.map(p => ({ ...p, _type: 'product' as const })),
  ...MOCK_SELLER.products.map(p => ({
    name: p.title, price: `$${p.price}`, brand: MOCK_SELLER.shop.name,
    tag: p.tag, img: p.img, imgUrl: null, _type: 'product' as const,
  })),
];

const ALL_SELLERS = [
  { name: MOCK_SELLER.shop.name, handle: MOCK_SELLER.shop.handle, tagline: MOCK_SELLER.shop.tagline, location: MOCK_SELLER.shop.location, score: MOCK_SELLER.shop.impactScore, rating: MOCK_SELLER.shop.rating, reviews: MOCK_SELLER.shop.reviews, avatar: null },
  { name: 'BareHaus', handle: 'barehaus', tagline: 'Clean beauty, zero compromise', location: 'Amsterdam, NL', score: 88, rating: 4.7, reviews: 134, avatar: null },
  { name: 'Sunly', handle: 'sunly', tagline: 'Solar-powered everyday carry', location: 'Berlin, DE', score: 91, rating: 4.8, reviews: 209, avatar: null },
  { name: 'Forrest', handle: 'forrest', tagline: 'Compostable products for the kitchen', location: 'Vancouver, CA', score: 85, rating: 4.6, reviews: 87, avatar: null },
  { name: 'Loop', handle: 'loop', tagline: 'Zero-waste packaging systems', location: 'London, UK', score: 79, rating: 4.4, reviews: 56, avatar: null },
];

const ALL_POSTS = MOCK.posts.map(p => ({ ...p, _type: 'post' as const, userName: MOCK.users[p.user]?.name, userHandle: MOCK.users[p.user]?.handle, userAvatar: MOCK.users[p.user]?.avatar }));

function match(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some(f => f?.toLowerCase().includes(q));
}

type Tab = 'all' | 'products' | 'sellers' | 'posts';

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

function SellerCard({ seller, onNav }: { seller: any; onNav: any }) {
  return (
    <div onClick={() => onNav?.('profile', { handle: seller.handle })} style={{
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '16px 18px', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center',
      transition: 'border-color .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
    >
      <Avatar src={seller.avatar} name={seller.name} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{seller.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>@{seller.handle}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seller.tagline}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>Impact</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono' }}>{seller.score}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>★ {seller.rating} ({seller.reviews})</div>
      </div>
    </div>
  );
}

function PostRow({ post, onNav }: { post: any; onNav: any }) {
  return (
    <div onClick={() => onNav?.('post', { id: post.id })} style={{
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
      padding: '14px 18px', cursor: 'pointer', transition: 'border-color .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <Avatar src={post.userAvatar} name={post.userName} size={36} />
        <div>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{post.userName}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', marginLeft: 6, fontFamily: 'JetBrains Mono' }}>@{post.userHandle}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)', marginLeft: 6 }}>· {post.time}</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>{post.category}</span>
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
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { nav } = useApp();

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const products = ALL_PRODUCTS.filter(p => match(query, p.name, p.brand, p.tag));
  const sellers = ALL_SELLERS.filter(s => match(query, s.name, s.handle, s.tagline, s.location));
  const posts = ALL_POSTS.filter(p => match(query, p.content, p.userName, p.userHandle, p.category, ...(p.tags || [])));

  const totalCount = products.length + sellers.length + posts.length;
  const hasQuery = query.length > 0;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'products', label: 'Products', count: products.length },
    { key: 'sellers', label: 'Sellers', count: sellers.length },
    { key: 'posts', label: 'Posts', count: posts.length },
  ];

  const handleNav = onNav || nav;

  let resultsBody: React.ReactNode;
  if (!hasQuery) {
    resultsBody = <EmptyState />;
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
        {(tab === 'all' || tab === 'sellers') && sellers.length > 0 && (
          <Section label="Sellers" count={sellers.length} showAll={tab === 'all' && sellers.length > 3} onShowAll={() => setTab('sellers')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(tab === 'all' ? sellers.slice(0, 3) : sellers).map((s, i) => (
                <SellerCard key={i} seller={s} onNav={handleNav} />
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
                placeholder="Search products, sellers, posts…"
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
                {hasQuery && (
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
        <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: 360 }}>Find sustainable products, sellers, and posts from the community</div>
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
