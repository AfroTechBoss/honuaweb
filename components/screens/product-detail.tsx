"use client";
import React from "react";
import { Icon, Avatar, ImagePlaceholder, useApp, DesktopSidebar } from "@/components/shared";
import { MOCK } from "@/components/post-card";
import { MOCK_SELLER } from "@/components/seller-data";

const SELLER_IMGS: Record<string, string> = {
  p1: '1558618666-fcd25c85cd64',
  p2: '1527799820374-087123a265e2',
  p3: '1558618666-fcd25c85cd64',
  p4: '1481627834876-b7833e8f5459',
};

const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  'Refillable shampoo bar': 'A concentrated, plastic-free shampoo bar that lasts up to 80 washes. Made with cold-pressed coconut oil and botanical extracts. Comes in a compostable kraft paper wrapper. Works on all hair types and leaves zero residue.',
  'Solar phone charger': 'Dual USB solar panel with a 10,000 mAh battery pack. Charges a smartphone twice from a single day of sunlight. Rugged, water-resistant casing built for the outdoors. No grid electricity needed.',
  'Bamboo cutlery set': 'A compact roll of five utensils — fork, knife, spoon, chopsticks, and straw — carved from FSC-certified bamboo. The canvas carry roll is made from organic cotton. Fits in any bag or lunch box.',
  'Reusable produce bags': 'Set of nine fine-mesh bags in three sizes. Made from GOTS-certified organic cotton. Tare weight marked on each bag. Machine washable. Replaces hundreds of single-use plastic produce bags.',
  'Wool insulation panel': 'Natural sheep\'s wool insulation with zero synthetic binders. Effective from -20°C to +60°C. Fire-resistant without chemical treatment. Fully biodegradable at end of life. R-value: R-13 per 3.5-inch panel.',
  'Compost starter kit': 'Everything to get a worm bin running in a weekend: 500g of red wrigglers, a coco coir block, a moisture meter, and a 24-page guide. Works indoors in a standard kitchen cabinet or under a sink.',
};

const SELLER_DESCRIPTIONS: Record<string, string> = {
  p1: 'Ninety-two quality tools in a full-grain leather roll. Designed for repair-not-replace thinking: every tool is serviceable, replaceable, and sourced from European workshops with living wages. The most-gifted product in the Honua marketplace.',
  p2: 'A solid brass darning mushroom turned by a family workshop in Portugal. Weighted for stability. The ergonomic handle reduces hand fatigue for long mending sessions. Brass naturally develops a warm patina over time.',
  p3: 'Sixteen functions machined from 420-grade stainless steel. Includes chain tool, spoke key, and two tyre levers. Fits in a jersey pocket. Backed by The Fix-it Collective\'s lifetime repair guarantee.',
  p4: 'A forty-eight-page zine covering everything you need to run your own repair café: venue setup, tool lists, facilitator scripts, and liability notes. Print-ready PDF, delivered instantly.',
};

const ECO_DETAILS: Record<string, { icon: string; label: string }[]> = {
  'Plastic-free': [{ icon: 'leaf', label: 'Zero plastic packaging' }, { icon: 'bolt', label: 'Biodegradable ingredients' }],
  'Solar': [{ icon: 'bolt', label: 'Runs on sunlight' }, { icon: 'leaf', label: 'No grid emissions' }],
  'Compostable': [{ icon: 'leaf', label: 'Fully compostable' }, { icon: 'bolt', label: 'FSC-certified bamboo' }],
  'Zero-waste': [{ icon: 'leaf', label: 'No single-use plastic' }, { icon: 'bolt', label: 'Reusable for life' }],
  'Carbon-neg': [{ icon: 'bolt', label: 'Negative carbon footprint' }, { icon: 'leaf', label: 'Natural material' }],
  'Soil': [{ icon: 'leaf', label: 'Rebuilds living soil' }, { icon: 'bolt', label: 'Zero synthetics' }],
  'Repairable': [{ icon: 'bolt', label: 'Designed to be repaired' }, { icon: 'leaf', label: 'European made' }],
  'Digital': [{ icon: 'bolt', label: 'Instant delivery' }, { icon: 'leaf', label: 'Zero shipping emissions' }],
};

// ─── Combined product catalog ────────────────────────────────────────────────
export const ALL_PRODUCTS = [
  ...MOCK.products.map((p, i) => ({
    id: `m${i + 1}`,
    title: p.name,
    price: parseFloat(p.price.replace('$', '')),
    brand: p.brand,
    tag: p.tag,
    imgUrl: p.imgUrl,
    img: p.img,
    category: 'Sustainable Living',
    seller: { name: p.brand, handle: p.brand.toLowerCase().replace(/\s+/g, ''), rating: 4.7 + (i * 0.04 % 0.3), reviews: 120 + i * 28 },
    description: PRODUCT_DESCRIPTIONS[p.name] || `${p.name} from ${p.brand}. Sustainably made with planet-friendly materials.`,
    eco: ECO_DETAILS[p.tag] || [],
    inStock: true,
    stock: 40 + i * 7,
  })),
  ...MOCK_SELLER.products.filter(p => p.status === 'active').map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    brand: MOCK_SELLER.shop.name,
    tag: p.tag,
    imgUrl: `https://images.unsplash.com/photo-${SELLER_IMGS[p.id] || '1558618666-fcd25c85cd64'}?w=800&q=80`,
    img: p.img,
    category: p.category,
    seller: { name: MOCK_SELLER.shop.name, handle: MOCK_SELLER.shop.handle, rating: MOCK_SELLER.shop.rating, reviews: MOCK_SELLER.shop.reviews },
    description: SELLER_DESCRIPTIONS[p.id] || p.title,
    eco: ECO_DETAILS[p.tag] || [],
    inStock: p.stock === null || p.stock > 0,
    stock: p.stock,
  })),
];

// ─── Load / save reviews ─────────────────────────────────────────────────────
function loadReviews() {
  try { return JSON.parse(localStorage.getItem('honua_reviews') || '[]'); } catch { return []; }
}

function getProductReviews(productId: string, productTitle: string) {
  const all = loadReviews();
  return all.filter((r: any) => r.productId === productId || r.productName === productTitle);
}

function avgRating(reviews: any[]) {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + (r.rating || r.stars || 0), 0) / reviews.length;
}

// ─── Star row ────────────────────────────────────────────────────────────────
function Stars({ rating, size = 14, interactive = false, onRate }: { rating: number; size?: number; interactive?: boolean; onRate?: (n: number) => void }) {
  const [hover, setHover] = React.useState(0);
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = interactive ? (hover || rating) >= n : rating >= n - 0.5;
        return (
          <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'var(--sun, #f59e0b)' : 'none'} stroke={filled ? 'var(--sun, #f59e0b)' : 'var(--ink-4)'}
            strokeWidth={1.5} style={{ cursor: interactive ? 'pointer' : 'default', flexShrink: 0 }}
            onClick={() => interactive && onRate?.(n)}
            onMouseEnter={() => interactive && setHover(n)}
            onMouseLeave={() => interactive && setHover(0)}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      })}
    </span>
  );
}

// ─── Write review modal ──────────────────────────────────────────────────────
function WriteReviewModal({ product, onClose, onSubmit }: { product: any; onClose: () => void; onSubmit: (r: any) => void }) {
  const app = useApp();
  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState('');
  const [done, setDone] = React.useState(false);

  const submit = () => {
    if (!rating) return;
    const review = {
      productId: product.id,
      productName: product.title,
      rating,
      text,
      date: new Date().toISOString(),
      author: app.user?.name || 'You',
    };
    const existing = loadReviews();
    localStorage.setItem('honua_reviews', JSON.stringify([...existing, review]));
    setDone(true);
    onSubmit(review);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg)', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,.2)' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
            <h3 className="font-display" style={{ margin: '0 0 8px', fontSize: 22 }}>Review posted!</h3>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 20px' }}>Thanks for helping the community.</p>
            <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>Done</button>
          </div>
        ) : (
          <>
            <h3 className="font-display" style={{ margin: '0 0 4px', fontSize: 20 }}>Leave a review</h3>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: '0 0 20px' }}>{product.title}</p>
            <div style={{ marginBottom: 16 }}>
              <Stars rating={rating} size={28} interactive onRate={setRating} />
              {rating > 0 && <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--ink-3)' }}>
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
              </span>}
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What did you think? (optional)" rows={4} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px', fontSize: 14, fontFamily: 'Satoshi', resize: 'vertical', outline: 'none', color: 'var(--ink)' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={!rating} style={{ flex: 2, justifyContent: 'center', opacity: rating ? 1 : 0.5 }}>Post review</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Product detail page ─────────────────────────────────────────────────────
export function DesktopProductDetail({ id, onNav }: { id: string; onNav?: any }) {
  const app = useApp();
  const product = ALL_PRODUCTS.find(p => p.id === id);
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [showReview, setShowReview] = React.useState(false);
  const [qty, setQty] = React.useState(1);

  React.useEffect(() => {
    if (product) setReviews(getProductReviews(product.id, product.title));
  }, [product?.id]);

  if (!product) {
    return (
      <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
        <DesktopSidebar active="marketplace" onNav={onNav} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--ink-3)' }}>
          <Icon name="bag" size={40} />
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-2)' }}>Product not found</div>
          <button className="btn btn-ghost" onClick={() => onNav?.('marketplace')}>Back to marketplace</button>
        </div>
      </div>
    );
  }

  const wished = app.wishlist?.has(product.id) || app.wishlist?.has(product.title);
  const avg = reviews.length ? avgRating(reviews) : product.seller.rating;
  const reviewCount = reviews.length || product.seller.reviews;

  const addToCart = () => {
    for (let i = 0; i < qty; i++) {
      app.addToCart?.({ id: product.id, name: product.title, price: `$${product.price}`, brand: product.brand, tag: product.tag, imgUrl: product.imgUrl, quantity: 1 });
    }
    app.toast?.({ msg: 'Added to cart', sub: `${qty}× ${product.title}`, kind: 'success', icon: 'cart' });
  };

  const toggleWish = () => {
    app.wishlist?.toggle(product.id);
    app.wishlist?.toggle(product.title);
    app.toast?.(wished
      ? { msg: 'Removed from wishlist', icon: 'bookmark' }
      : { msg: 'Saved to wishlist', kind: 'success', icon: 'bookmark' }
    );
  };

  const relatedProducts = ALL_PRODUCTS.filter(p => p.id !== product.id && (p.tag === product.tag || p.brand === product.brand)).slice(0, 4);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      <DesktopSidebar active="marketplace" onNav={onNav} />

      {showReview && (
        <WriteReviewModal
          product={product}
          onClose={() => setShowReview(false)}
          onSubmit={r => { setReviews(prev => [...prev, r]); setShowReview(false); }}
        />
      )}

      <div style={{ flex: 1, overflow: 'auto' }} className="no-scrollbar">
        {/* Breadcrumb */}
        <div style={{ padding: '16px 32px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
          <button onClick={() => onNav?.('marketplace')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Marketplace
          </button>
          <span>/</span>
          <span style={{ color: 'var(--ink-2)' }}>{product.title}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 40, padding: '24px 32px', maxWidth: 1100 }} className="product-detail-grid">

          {/* Left: image */}
          <div>
            <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
              <ImagePlaceholder label={product.img} height={480} src={product.imgUrl} />
              <span className="chip chip-green" style={{ position: 'absolute', top: 16, left: 16, fontSize: 13 }}>{product.tag}</span>
            </div>
            {/* Eco creds */}
            {product.eco.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {product.eco.map((e: any) => (
                  <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--green-tint)', color: 'var(--green)', borderRadius: 10, padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>
                    <Icon name={e.icon} size={14} color="var(--green)" />
                    {e.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', marginBottom: 6 }}>{product.brand.toUpperCase()}</div>
              <h1 className="font-display" style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{product.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <Stars rating={avg} size={16} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{avg.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>({reviewCount} reviews)</span>
              </div>
            </div>

            {/* Price + actions */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Lora', letterSpacing: '-0.02em', marginBottom: 16 }}>${product.price}</div>

              {/* Qty */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>Qty</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', fontSize: 16, color: 'var(--ink)' }}>−</button>
                  <span style={{ padding: '0 14px', fontSize: 14, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} style={{ width: 36, height: 36, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', fontSize: 16, color: 'var(--ink)' }}>+</button>
                </div>
                {product.stock !== null && product.stock !== undefined && (
                  <span style={{ fontSize: 12, color: product.stock < 10 ? 'var(--clay)' : 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                    {product.stock < 10 ? `Only ${product.stock} left` : `${product.stock} in stock`}
                  </span>
                )}
              </div>

              <button className="btn btn-green" onClick={addToCart} disabled={!product.inStock} style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px', fontWeight: 600, marginBottom: 10 }}>
                <Icon name="cart" size={16} /> {product.inStock ? 'Add to cart' : 'Out of stock'}
              </button>
              <button onClick={toggleWish} style={{ width: '100%', padding: '11px', borderRadius: 12, border: `1.5px solid ${wished ? 'var(--green)' : 'var(--line)'}`, background: wished ? 'var(--green-tint)' : 'transparent', color: wished ? 'var(--green)' : 'var(--ink-2)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Icon name="bookmark" size={15} stroke={wished ? 2.4 : 1.75} />
                {wished ? 'Saved to wishlist' : 'Save to wishlist'}
              </button>
            </div>

            {/* Description */}
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '.02em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono' }}>About</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7 }}>{product.description}</p>
            </div>

            {/* Seller */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', marginBottom: 10 }}>SOLD BY</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--green)', display: 'grid', placeItems: 'center', fontSize: 18, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                  {product.seller.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{product.seller.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <Stars rating={product.seller.rating} size={11} />
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{product.seller.rating.toFixed(1)} · {product.seller.reviews} reviews</span>
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={() => onNav?.('messages', { handle: product.seller.handle })} style={{ fontSize: 13, padding: '7px 12px' }}>
                  <Icon name="msg" size={13} /> Message
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <div style={{ padding: '0 32px 40px', maxWidth: 1100 }}>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Reviews</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Stars rating={avg} size={16} />
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{avg.toFixed(1)}</span>
                  <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>· {reviewCount} reviews</span>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowReview(true)} style={{ padding: '9px 18px' }}>
                Write a review
              </button>
            </div>

            {reviews.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
                <Icon name="star" size={32} />
                <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: 'var(--ink-2)' }}>No reviews yet</div>
                <p style={{ margin: '6px 0 20px', fontSize: 13 }}>Be the first to review this product.</p>
                <button className="btn btn-primary" onClick={() => setShowReview(true)}>Write a review</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {reviews.map((r: any, i: number) => (
                  <div key={i} style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                        {(r.author || 'A').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.author || 'Anonymous'}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                          {r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <Stars rating={r.rating || r.stars || 0} size={14} />
                      </div>
                    </div>
                    {r.text && <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{r.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <h2 className="font-display" style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 600 }}>You might also like</h2>
              <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {relatedProducts.map(p => (
                  <div key={p.id} onClick={() => onNav?.('product', { id: p.id })} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden', cursor: 'pointer' }}>
                    <ImagePlaceholder label={p.img} height={160} src={p.imgUrl} />
                    <div style={{ padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{p.brand.toUpperCase()}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, lineHeight: 1.3 }}>{p.title}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Lora', marginTop: 6 }}>${p.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
