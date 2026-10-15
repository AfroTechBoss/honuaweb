"use client";
import React from "react";
import { Icon, Avatar, ImagePlaceholder, useApp, DesktopSidebar } from "@/components/shared";

const ECO_DETAILS: Record<string, { icon: string; label: string }[]> = {
  'Plastic-free': [{ icon: 'leaf', label: 'Zero plastic packaging' }, { icon: 'bolt', label: 'Biodegradable ingredients' }],
  'Solar': [{ icon: 'bolt', label: 'Runs on sunlight' }, { icon: 'leaf', label: 'No grid emissions' }],
  'Compostable': [{ icon: 'leaf', label: 'Fully compostable' }, { icon: 'bolt', label: 'FSC-certified bamboo' }],
  'Zero-waste': [{ icon: 'leaf', label: 'No single-use plastic' }, { icon: 'bolt', label: 'Reusable for life' }],
  'Carbon-neg': [{ icon: 'bolt', label: 'Negative carbon footprint' }, { icon: 'leaf', label: 'Natural material' }],
  'Soil': [{ icon: 'leaf', label: 'Rebuilds living soil' }, { icon: 'bolt', label: 'Zero synthetics' }],
  'Repairable': [{ icon: 'bolt', label: 'Designed to be repaired' }, { icon: 'leaf', label: 'Built to last' }],
  'Digital': [{ icon: 'bolt', label: 'Instant delivery' }, { icon: 'leaf', label: 'Zero shipping emissions' }],
};

// Reviews come from product_reviews only (lib/reviews). They used to be read
// from localStorage, so a review was visible only on the device that wrote it.
function avgRating(reviews: any[]) {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + (r.stars || 0), 0) / reviews.length;
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
function WriteReviewModal({ product, existing, onClose, onSubmit }: { product: any; existing?: any; onClose: () => void; onSubmit: () => void }) {
  const app = useApp();
  const [rating, setRating] = React.useState(existing?.stars ?? 0);
  const [text, setText] = React.useState(existing?.text ?? '');
  const [done, setDone] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!rating || !app.user?.id || saving) return;
    setSaving(true);
    try {
      const { saveReview } = await import('@/lib/reviews');
      await saveReview(app.user.id, product.id, rating, text);
      setDone(true);
      onSubmit();
    } catch (e: any) {
      app.toast?.({ kind: 'error', msg: "Couldn't post your review", sub: e?.code === '42501' ? 'Only people who bought this product can review it.' : e?.message, icon: 'star' });
    } finally {
      setSaving(false);
    }
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
            <h3 className="font-display" style={{ margin: '0 0 4px', fontSize: 20 }}>{existing ? 'Edit your review' : 'Leave a review'}</h3>
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
              <button className="btn btn-primary" onClick={submit} disabled={!rating || saving} style={{ flex: 2, justifyContent: 'center', opacity: rating && !saving ? 1 : 0.5 }}>{saving ? 'Posting…' : existing ? 'Update review' : 'Post review'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Report a listing ────────────────────────────────────────────────────────
//
// Migration 046's queue has accepted `product` as a target type since the day it
// was written, and the admin Moderation panel draws a row for one — but nothing
// on the member side could file it, so that branch had never once been reached.
// This is the missing half.
//
// The reasons are the listing's own, not the feed's. "Harassment" is not a thing
// a product can be, and a moderator reading the queue needs the reason to point
// at what they should go and check.
const LISTING_REASONS = [
  'Not actually sustainable — greenwashing',
  'Counterfeit or stolen goods',
  'Prohibited item',
  'Misleading description or photos',
  'Wrong or deceptive price',
  'Never shipped / seller unresponsive',
  'Offensive content',
  'Other',
];

function ReportListing({ product }: { product: any }) {
  const app = useApp();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [note, setNote] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError('');
    const { fileReport } = await import('@/lib/content-reports');
    const outcome = await fileReport({
      targetType: 'product',
      targetId: product.id,
      targetOwnerId: product.seller?.id ?? null,
      reporterId: app.user?.id,
      reason,
      note,
    });
    setSending(false);

    if (outcome.kind === 'filed' || outcome.kind === 'duplicate') {
      setOpen(false);
      setReason(''); setNote('');
      app.toast?.(outcome.kind === 'duplicate'
        ? { msg: 'Already reported', sub: "You've reported this listing before — it's with our moderators.", icon: 'check' }
        : { msg: 'Listing reported', sub: 'Thanks — a moderator will take a look.', icon: 'check', kind: 'success' });
      return;
    }
    setError(outcome.kind === 'signed-out' ? 'Sign in to report a listing.' : outcome.message);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ marginTop: 10, width: '100%', padding: '9px', borderRadius: 12, border: 'none', background: 'none', color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        <Icon name="flag" size={13} /> Report this listing
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => !sending && setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--line)', width: 'min(460px, 100%)', padding: 24, maxHeight: '85vh', overflow: 'auto' }}>
            <h3 className="font-display" style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600 }}>Report this listing</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              {product.title} — sold by {product.seller?.name ?? 'this seller'}. Reports go to Honua moderators; the seller is not told who filed one.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {LISTING_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)} style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 10, fontSize: 13.5, cursor: 'pointer',
                  border: `1.5px solid ${reason === r ? 'var(--clay)' : 'var(--line)'}`,
                  background: reason === r ? 'var(--clay-tint, rgba(180,90,60,.08))' : 'transparent',
                  color: reason === r ? 'var(--clay)' : 'var(--ink-2)', fontWeight: reason === r ? 600 : 400,
                }}>{r}</button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Anything else the moderator should know (optional)"
              maxLength={1000}
              style={{ width: '100%', minHeight: 72, padding: 11, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink)', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical' }}
            />

            {error && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--clay)' }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={sending} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={submit} disabled={!reason || sending} style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600, color: '#fff',
                background: reason && !sending ? 'var(--clay)' : 'var(--line)',
                cursor: reason && !sending ? 'pointer' : 'not-allowed',
              }}>{sending ? 'Sending…' : 'Submit report'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Product detail page ─────────────────────────────────────────────────────
export function DesktopProductDetail({ id, onNav }: { id: string; onNav?: any }) {
  const app = useApp();
  // Only real listings have a page. Ids that are not uuids came from the old
  // demo catalogue (m1, p1, …) and now land on "Product not found".
  const isDbId = /^[0-9a-f-]{36}$/.test(String(id));
  const [dbProduct, setDbProduct] = React.useState<any>(null);
  const [dbRelated, setDbRelated] = React.useState<any[]>([]);
  const [dbLoading, setDbLoading] = React.useState(isDbId);
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [showReview, setShowReview] = React.useState(false);
  const [canReview, setCanReview] = React.useState(false);
  const [reviewsTick, setReviewsTick] = React.useState(0);
  const [qty, setQty] = React.useState(1);

  // Real product from Supabase when the id is a uuid
  React.useEffect(() => {
    if (!isDbId) return;
    let alive = true;
    setDbLoading(true);
    import('@/lib/market').then(({ getProductById }) => getProductById(id)).then(p => {
      if (!alive) return;
      if (p) {
        setDbProduct({
          id: p.id, title: p.name, price: p.price_cents / 100, brand: p.brand, tag: p.tag,
          imgUrl: p.imgUrl, img: p.name, category: p.category,
          // Use the seller's real profile handle so "Message" opens a DM with them
          // sellerId rides along so a report can be attached to the account
          // behind the listing, not just the listing.
          seller: { name: p.sellerShopName || p.sellerName || p.brand, handle: p.sellerHandle || null, shopHandle: p.sellerShopHandle || null, logo: p.sellerLogo || null, rating: p.rating, reviews: p.review_count, id: p.sellerId || null },
          description: p.description || `${p.name} from ${p.brand}. Sustainably made with planet-friendly materials.`,
          eco: ECO_DETAILS[p.tag] || [],
          // Real stock, not a made-up "40 in stock". null means untracked.
          inStock: p.status === 'live' && (p.stock == null || p.stock > 0),
          stock: p.stock,
        });
      }
      setDbLoading(false);
    }).catch(() => setDbLoading(false));
    return () => { alive = false; };
  }, [id, isDbId]);

  // Real "you might also like" — other live listings sharing this one's tag or
  // brand. Runs once the product itself has loaded, since it needs both.
  React.useEffect(() => {
    if (!isDbId || !dbProduct) return;
    let alive = true;
    const filters = [dbProduct.tag && `tag.eq.${dbProduct.tag}`, dbProduct.brand && `brand.eq.${dbProduct.brand}`].filter(Boolean);
    if (!filters.length) return;
    import('@/lib/supabase').then(({ supabase }) =>
      supabase.from('products')
        .select('id, name, brand, price_cents, image_url')
        .eq('status', 'live')
        .neq('id', dbProduct.id)
        .or(filters.join(','))
        .limit(4)
    ).then(({ data }: any) => {
      if (!alive) return;
      setDbRelated((data ?? []).filter((r: any) => r.name && r.price_cents != null).map((r: any) => ({
        id: r.id, title: r.name, brand: r.brand || '', img: r.name,
        imgUrl: r.image_url ?? null, price: (r.price_cents / 100).toFixed(2).replace(/\.00$/, ''),
      })));
    }).catch(() => {});
    return () => { alive = false; };
  }, [isDbId, dbProduct?.id, dbProduct?.tag, dbProduct?.brand]);

  const product = dbProduct;

  React.useEffect(() => {
    if (!product) return;
    let alive = true;
    import('@/lib/reviews').then(async ({ getProductReviews, hasPurchased }) => {
      const [list, bought] = await Promise.all([
        getProductReviews(product.id),
        app.user?.id ? hasPurchased(product.id) : Promise.resolve(false),
      ]);
      if (!alive) return;
      setReviews(list);
      setCanReview(bought);
    }).catch(() => {});
    return () => { alive = false; };
  }, [product?.id, app.user?.id, reviewsTick]);

  if (!product && dbLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
        <DesktopSidebar active="marketplace" onNav={onNav} />
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Loading product…</div>
      </div>
    );
  }

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
  const reviewCount = reviews.length;
  const avg = avgRating(reviews);
  const myReview = reviews.find((r: any) => r.userId === app.user?.id);

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

  // Real listings that share a tag or a brand with this one.
  const relatedProducts = dbRelated;

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      <DesktopSidebar active="marketplace" onNav={onNav} />

      {showReview && (
        <WriteReviewModal
          product={product}
          existing={myReview}
          onClose={() => setShowReview(false)}
          onSubmit={() => setReviewsTick(t => t + 1)}
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
                {reviewCount > 0 ? (
                  <>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{avg.toFixed(1)}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>({reviewCount} review{reviewCount === 1 ? '' : 's'})</span>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>No reviews yet</span>
                )}
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
              {/* Only for listings that exist as rows. The demo catalogue has
                  ids like "m3"; a report filed against one would point at
                  nothing, and content_reports.target_id is a uuid. */}
              {isDbId && <ReportListing product={product} />}
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
                <div onClick={() => product.seller.shopHandle && onNav?.('shop', { handle: product.seller.shopHandle })} style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', background: 'var(--green)', display: 'grid', placeItems: 'center', fontSize: 18, color: '#fff', fontWeight: 700, flexShrink: 0, cursor: product.seller.shopHandle ? 'pointer' : 'default' }}>
                  {product.seller.logo
                    ? <img src={product.seller.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : product.seller.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div onClick={() => product.seller.shopHandle && onNav?.('shop', { handle: product.seller.shopHandle })} style={{ fontSize: 14, fontWeight: 600, cursor: product.seller.shopHandle ? 'pointer' : 'default' }}>{product.seller.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <Stars rating={product.seller.reviews > 0 ? product.seller.rating : 0} size={11} />
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{product.seller.reviews > 0 ? `${product.seller.rating.toFixed(1)} · ${product.seller.reviews} reviews` : 'No reviews yet'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {product.seller.shopHandle && (
                    <button className="btn btn-ghost" onClick={() => onNav?.('shop', { handle: product.seller.shopHandle })} style={{ fontSize: 13, padding: '7px 12px' }}>
                      <Icon name="bag" size={13} /> Visit shop
                    </button>
                  )}
                  {product.seller.handle && (
                    <button className="btn btn-ghost" onClick={() => onNav?.('messages', { handle: product.seller.handle, shop: 1 })} style={{ fontSize: 13, padding: '7px 12px' }}>
                      <Icon name="msg" size={13} /> Message
                    </button>
                  )}
                </div>
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
                  {reviewCount > 0
                    ? <><span style={{ fontSize: 16, fontWeight: 700 }}>{avg.toFixed(1)}</span><span style={{ fontSize: 14, color: 'var(--ink-3)' }}>· {reviewCount} review{reviewCount === 1 ? '' : 's'}</span></>
                    : <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>No reviews yet</span>}
                </div>
              </div>
              {canReview && (
                <button className="btn btn-primary" onClick={() => setShowReview(true)} style={{ padding: '9px 18px' }}>
                  {myReview ? 'Edit your review' : 'Write a review'}
                </button>
              )}
            </div>

            {reviews.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
                <Icon name="star" size={32} />
                <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: 'var(--ink-2)' }}>No reviews yet</div>
                <p style={{ margin: '6px 0 20px', fontSize: 13 }}>{canReview ? 'You bought this — be the first to review it.' : 'Reviews come from people who have bought this product.'}</p>
                {canReview && <button className="btn btn-primary" onClick={() => setShowReview(true)}>Write a review</button>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {reviews.map((r: any, i: number) => (
                  <div key={i} style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0, overflow: 'hidden' }}>
                        {r.avatarUrl ? <img src={r.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.author || 'A').replace('@', '').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {r.handle ? <button onClick={() => onNav?.('profile', { handle: r.handle })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}>{r.author}</button> : r.author}
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--green)', fontFamily: 'JetBrains Mono', letterSpacing: '.04em' }}>VERIFIED PURCHASE</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                          {r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <Stars rating={r.stars || 0} size={14} />
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
