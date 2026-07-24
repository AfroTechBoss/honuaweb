"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Icon, sMoney } from "@/components/shared";
import { DesktopSidebar } from "@/components/sidebar";
import { useApp } from "@/components/app-context";

// ---- Storage helpers ----
export function loadOrders(): any[] {
  try { return JSON.parse(localStorage.getItem('honua_orders') || '[]'); } catch { return []; }
}

function loadReviews(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem('honua_reviews') || '{}'); } catch { return {}; }
}

function saveReview(orderId: string, review: any) {
  const all = loadReviews();
  all[orderId] = review;
  localStorage.setItem('honua_reviews', JSON.stringify(all));
}

// ---- Star rating display ----
export function StarRating({ score, size = 14, color = 'var(--sun, #f59e0b)' }: { score: number; size?: number; color?: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n <= score ? color : 'none'} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

// ---- Review modal ----
function ReviewModal({ order, onClose, onSubmit }: { order: any; onClose: () => void; onSubmit: (review: any) => void }) {
  const [stars, setStars] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [text, setText] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stars === 0) return;
    const review = { stars, text, date: new Date().toISOString(), orderId: order.id };
    saveReview(order.id, review);
    setSubmitted(true);
    setTimeout(onSubmit, 1200);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1001, width: 480, maxWidth: '95vw',
        background: 'var(--bg)', borderRadius: 22, border: '1px solid var(--line)',
        boxShadow: '0 24px 80px rgba(0,0,0,.18)', padding: 32,
      }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🌿</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Review submitted!</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Thanks for sharing your experience.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Rate your purchase</div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}><Icon name="close" size={18} /></button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
              {(order.items || []).map((i: any) => i.name).join(', ')}
            </div>
            <form onSubmit={submit}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button"
                    onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                    onClick={() => setStars(n)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  >
                    <svg width={34} height={34} viewBox="0 0 24 24"
                      fill={n <= (hover || stars) ? '#f59e0b' : 'none'}
                      stroke="#f59e0b" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                      style={{ transition: 'fill .1s, transform .1s', transform: n <= (hover || stars) ? 'scale(1.1)' : 'scale(1)' }}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
                {stars > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 13, color: 'var(--ink-3)', alignSelf: 'center' }}>
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][stars]}
                  </span>
                )}
              </div>
              <textarea
                placeholder="Tell us about your experience (optional)"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={4}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px', fontSize: 14, fontFamily: 'Satoshi, sans-serif', color: 'var(--ink)', outline: 'none', resize: 'vertical', marginBottom: 16 }}
              />
              <button
                type="submit" disabled={stars === 0}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '13px', opacity: stars === 0 ? 0.5 : 1 }}
              >
                Submit review
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

function statusMeta(status: string) {
  switch (status) {
    case 'processing': return { label: 'Processing', color: '#b45309', bg: 'rgba(234,179,8,.1)', step: 2 };
    case 'shipped':    return { label: 'Shipped',    color: '#1d4ed8', bg: 'rgba(59,130,246,.1)', step: 3 };
    case 'delivered':  return { label: 'Delivered',  color: '#15803d', bg: 'rgba(34,197,94,.12)', step: 4 };
    case 'cancelled':  return { label: 'Cancelled',  color: '#dc2626', bg: 'rgba(220,38,38,.08)', step: -1 };
    default:           return { label: 'Placed',     color: 'var(--ink-3)', bg: 'var(--bg-2)', step: 1 };
  }
}

function parseCents(price: string | number): number {
  return Math.round(parseFloat(String(price).replace(/[^0-9.]/g, '')) * 100) || 0;
}

// =====================================================================
// Orders list page
// =====================================================================
export function DesktopOrders({ onNav }: { onNav?: any }) {
  const app = useApp();
  const router = useRouter();
  const [orders, setOrders] = React.useState<any[]>([]);

  React.useEffect(() => { setOrders(loadOrders()); }, []);

  const goToOrder = (id: string) => router.push(`/orders/${id}`);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <DesktopSidebar active="orders" onNav={onNav} />

      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 60px' }} className="no-scrollbar">
        <div style={{ maxWidth: 720 }}>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }}>My orders</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 32px' }}>Track your purchases and view order history.</p>

          {orders.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 60, color: 'var(--ink-4)', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
                <Icon name="package" size={28} stroke={1.4} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No orders yet</div>
              <div style={{ fontSize: 14, color: 'var(--ink-4)', maxWidth: 280 }}>Once you place an order it'll show up here with live tracking.</div>
              <button className="btn btn-primary" onClick={() => router.push('/marketplace')} style={{ marginTop: 6 }}>Browse marketplace</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {orders.map((order: any) => {
                const meta = statusMeta(order.status);
                const itemCount = (order.items || []).reduce((n: number, i: any) => n + (i.quantity || 1), 0);
                const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <div
                    key={order.id}
                    onClick={() => goToOrder(order.id)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22, cursor: 'pointer', transition: 'border-color .15s', display: 'flex', gap: 18, alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green-3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
                  >
                    {/* Item thumbnails */}
                    <div style={{ display: 'flex', gap: -8 }}>
                      {(order.items || []).slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-2)', border: '2px solid var(--bg)', flexShrink: 0, marginLeft: idx > 0 ? -14 : 0, zIndex: 3 - idx }}>
                          {item.imgUrl
                            ? <img src={item.imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}><Icon name="bag" size={18} stroke={1.4} /></div>
                          }
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--bg-2)', border: '2px solid var(--bg)', display: 'grid', placeItems: 'center', marginLeft: -14, fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>{order.id}</div>
                        <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: meta.bg, color: meta.color }}>{meta.label}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
                        {itemCount} item{itemCount !== 1 ? 's' : ''} · {sMoney(order.total)}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>{date}</div>
                    </div>

                    {/* Arrow */}
                    <Icon name="chevron" size={16} color="var(--ink-4)" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// =====================================================================
// Single order tracking page
// =====================================================================
const STEPS = [
  { key: 'placed',     label: 'Order placed',       icon: 'check' },
  { key: 'processing', label: 'Payment confirmed',   icon: 'check' },
  { key: 'shipped',    label: 'Shipped',             icon: 'truck' },
  { key: 'delivered',  label: 'Delivered',           icon: 'leaf' },
];

const STEP_INDEX: Record<string, number> = {
  placed: 0, processing: 1, shipped: 2, delivered: 3, cancelled: -1,
};

export function DesktopOrderTracking({ orderId, onNav }: { orderId: string; onNav?: any }) {
  const router = useRouter();
  const [order, setOrder] = React.useState<any | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [showReview, setShowReview] = React.useState(false);
  const [review, setReview] = React.useState<any | null>(null);

  React.useEffect(() => {
    const orders = loadOrders();
    const found = orders.find((o: any) => o.id === orderId);
    if (found) setOrder(found); else setNotFound(true);
    const reviews = loadReviews();
    if (reviews[orderId]) setReview(reviews[orderId]);
  }, [orderId]);

  if (notFound) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <DesktopSidebar active="orders" onNav={onNav} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--ink-4)' }}>
          <Icon name="package" size={40} stroke={1.4} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Order not found</div>
          <div style={{ fontSize: 14 }}>This order doesn't exist or may be on another device.</div>
          <button className="btn btn-ghost" onClick={() => router.push('/orders')}>View all orders</button>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <DesktopSidebar active="orders" onNav={onNav} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--line)', borderTopColor: 'var(--green)', animation: 'spin .8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </main>
      </div>
    );
  }

  const meta = statusMeta(order.status);
  const currentStep = STEP_INDEX[order.status] ?? 1;
  const subtotal = (order.items || []).reduce((s: number, i: any) => s + parseCents(i.price) * (i.quantity || 1), 0) / 100;
  const shippingCost = order.shipping ?? (subtotal >= 75 ? 0 : 5.99);
  const date = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const addr = order.address;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <DesktopSidebar active="orders" onNav={onNav} />

      {showReview && order && (
        <ReviewModal
          order={order}
          onClose={() => setShowReview(false)}
          onSubmit={() => {
            const reviews = loadReviews();
            setReview(reviews[orderId]);
            setShowReview(false);
          }}
        />
      )}

      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 60px' }} className="no-scrollbar">
        <div style={{ maxWidth: 780 }}>

          {/* Back */}
          <button onClick={() => router.push('/orders')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, padding: 0, marginBottom: 24 }}>
            <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={16} /></span>
            All orders
          </button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Order {order.id}</h1>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: meta.bg, color: meta.color }}>{meta.label}</span>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>Placed {date}</div>
            </div>
            <button className="btn btn-ghost" onClick={() => router.push('/marketplace')} style={{ fontSize: 13.5, flexShrink: 0 }}>
              <Icon name="bag" size={14} /> Shop again
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

            {/* Left column */}
            <div style={{ display: 'grid', gap: 16 }}>

              {/* Tracking timeline */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24 }}>
                <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 20 }}>ORDER STATUS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {STEPS.map((step, i) => {
                    const done = currentStep >= i;
                    const active = currentStep === i;
                    return (
                      <div key={step.key} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                            background: done ? 'var(--green)' : active ? 'var(--green-tint)' : 'var(--bg-2)',
                            border: `2px solid ${done ? 'var(--green)' : active ? 'var(--green)' : 'var(--line)'}`,
                            transition: 'all .2s',
                          }}>
                            {done
                              ? <Icon name="check" size={13} color="#fff" stroke={2.5} />
                              : <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? 'var(--green)' : 'var(--line)' }} />
                            }
                          </div>
                          {i < STEPS.length - 1 && (
                            <div style={{ width: 2, height: 36, background: currentStep > i ? 'var(--green)' : 'var(--line)', margin: '3px 0', transition: 'background .3s' }} />
                          )}
                        </div>
                        <div style={{ paddingTop: 3, paddingBottom: i < STEPS.length - 1 ? 0 : 0 }}>
                          <div style={{ fontSize: 14, fontWeight: done ? 600 : 400, color: done ? 'var(--ink)' : 'var(--ink-3)', transition: 'color .2s' }}>{step.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 20 }}>
                            {done ? 'Completed' : i === currentStep + 1 ? 'Est. 1–2 days' : i === currentStep + 2 ? 'Est. 3–5 days' : '—'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24 }}>
                <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 16 }}>
                  ITEMS ({(order.items || []).reduce((n: number, i: any) => n + (i.quantity || 1), 0)})
                </div>
                <div style={{ display: 'grid', gap: 14 }}>
                  {(order.items || []).map((item: any, idx: number) => {
                    const qty = item.quantity || 1;
                    const lineTotal = parseCents(item.price) * qty / 100;
                    return (
                      <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                          {item.imgUrl
                            ? <img src={item.imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}><Icon name="bag" size={22} stroke={1.4} /></div>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {item.brand && <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', letterSpacing: '.04em', marginBottom: 2, textTransform: 'uppercase' }}>{item.brand}</div>}
                          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{item.name}</div>
                          {qty > 1 && <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>×{qty}</div>}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Lora' }}>{sMoney(lineTotal)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'grid', gap: 16 }}>

              {/* Order summary */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
                <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 14 }}>ORDER SUMMARY</div>
                <div style={{ display: 'grid', gap: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-3)' }}>
                    <span>Subtotal</span><span style={{ fontFamily: 'JetBrains Mono' }}>{sMoney(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-3)' }}>
                    <span>Shipping</span>
                    <span style={{ fontFamily: 'JetBrains Mono', color: shippingCost === 0 ? 'var(--green)' : undefined }}>
                      {shippingCost === 0 ? 'Free' : sMoney(shippingCost)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, paddingTop: 10, borderTop: '1px solid var(--line)', marginTop: 2 }}>
                    <span>Total</span><span style={{ fontFamily: 'Lora' }}>{sMoney(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              {addr && (addr.firstName || addr.street || addr.email) && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
                  <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 12 }}>DELIVERY TO</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                    {(addr.firstName || addr.lastName) && <div style={{ fontWeight: 600 }}>{[addr.firstName, addr.lastName].filter(Boolean).join(' ')}</div>}
                    {addr.street && <div>{addr.street}</div>}
                    {(addr.city || addr.zip) && <div>{[addr.city, addr.zip].filter(Boolean).join(', ')}</div>}
                    {addr.country && <div>{addr.country}</div>}
                    {addr.email && <div style={{ color: 'var(--ink-4)', fontSize: 12.5, marginTop: 6 }}>{addr.email}</div>}
                  </div>
                </div>
              )}

              {/* Review card — only for delivered orders */}
              {order.status === 'delivered' && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
                  <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 12 }}>YOUR REVIEW</div>
                  {review ? (
                    <div>
                      <StarRating score={review.stars} size={18} />
                      {review.text && <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: '10px 0 0', lineHeight: 1.55 }}>{review.text}</p>}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>How was your order? Your feedback helps other buyers.</div>
                      <button className="btn btn-ghost" onClick={() => setShowReview(true)} style={{ justifyContent: 'center', fontSize: 13 }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        Leave a review
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Help */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 22 }}>
                <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 12 }}>NEED HELP?</div>
                <div style={{ display: 'grid', gap: 2 }}>
                  {[
                    { label: 'Contact support', icon: 'msg',  href: `/support?order=${orderId}` },
                    { label: 'Report an issue', icon: 'flag', href: `/report?order=${orderId}` },
                    { label: 'Return policy',   icon: 'arrow', href: `/returns?order=${orderId}` },
                  ].map(({ label, icon, href }) => (
                    <button key={label} onClick={() => router.push(href)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', fontSize: 13.5, padding: '10px 0', textAlign: 'left', fontFamily: 'Satoshi', borderTop: '1px solid var(--line)', width: '100%', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon name={icon} size={15} color="var(--green)" />{label}
                      </span>
                      <Icon name="chevron" size={14} color="var(--ink-4)" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
