"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useApp } from "@/components/app-context";
import { Icon, Logo, sMoney } from "@/components/shared";

function parseCents(price: string | number): number {
  return Math.round(parseFloat(String(price).replace(/[^0-9.]/g, '')) * 100) || 0;
}

// ---- Address autocomplete via OpenStreetMap Nominatim (free, no key) ----
interface NominatimResult {
  display_name: string;
  address: {
    road?: string; house_number?: string; suburb?: string;
    city?: string; town?: string; village?: string; county?: string;
    state?: string; postcode?: string; country?: string; country_code?: string;
  };
}

function useAddressAutocomplete(query: string) {
  const [suggestions, setSuggestions] = React.useState<NominatimResult[]>([]);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (query.length < 5) { setSuggestions([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch { setSuggestions([]); }
    }, 420);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return suggestions;
}

function AddressSuggestions({ suggestions, onSelect }: {
  suggestions: NominatimResult[];
  onSelect: (r: NominatimResult) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
      background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,.1)', marginTop: 4, overflow: 'hidden',
    }}>
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(s)}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5,
            color: 'var(--ink-2)', lineHeight: 1.4, fontFamily: 'Satoshi, sans-serif',
            borderTop: i > 0 ? '1px solid var(--line)' : 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <div style={{ fontWeight: 500, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[s.address.house_number, s.address.road].filter(Boolean).join(' ') || s.display_name.split(',')[0]}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
            {[s.address.city || s.address.town || s.address.village, s.address.postcode, s.address.country].filter(Boolean).join(', ')}
          </div>
        </button>
      ))}
    </div>
  );
}

// Memoize the Stripe.js loader per publishable key (module-level, stable)
let _stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripePromise(publishableKey: string) {
  if (!_stripePromise) _stripePromise = loadStripe(publishableKey);
  return _stripePromise;
}

// Stable, module-level payment form. It MUST NOT be redefined on each render —
// otherwise React remounts the PaymentElement and confirmPayment can't find its
// mounted Element ("could not retrieve data from the specified Element").
// What the payment forms need from the contact/shipping fields at the moment
// "Pay" is pressed: either the details Stripe should record, or why not yet.
type PayDetails = { error: string } | { error?: undefined; email: string; shipping: any };

function StripePaymentForm({ total, onSuccess, getDetails }: { total: number; onSuccess: () => void; getDetails: () => PayDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [ready, setReady] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const details = getDetails();
    if (!('email' in details)) { setError(details.error); return; }
    setLoading(true);
    setError('');
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Stripe appends ?payment_intent=…&redirect_status=succeeded|failed on return
        return_url: window.location.origin + '/checkout',
        // Recorded on the PaymentIntent, which is where the webhook reads them
        // from when it creates the order — the browser no longer writes it.
        receipt_email: details.email,
        shipping: details.shipping,
      },
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message || 'Payment failed. Please try again.');
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
      <PaymentElement options={{ layout: 'tabs' }} onReady={() => setReady(true)} />
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', fontSize: 13, color: '#dc2626' }}>{error}</div>
      )}
      <button
        type="submit"
        disabled={loading || !stripe || !ready}
        className="btn btn-primary"
        style={{ justifyContent: 'center', padding: '15px', fontSize: 15, fontWeight: 700, opacity: (loading || !ready) ? 0.7 : 1, marginTop: 4 }}
      >
        {loading ? 'Processing…' : ready ? `Pay ${sMoney(total)}` : 'Loading payment…'}
      </button>
      <StripeBadge />
    </form>
  );
}

// ---- Stripe-aware payment section ----
function StripeCheckout({ clientSecret, publishableKey, total, onSuccess, getDetails }: { clientSecret: string; publishableKey: string; total: number; onSuccess: () => void; getDetails: () => PayDetails }) {
  const stripePromise = React.useMemo(() => getStripePromise(publishableKey), [publishableKey]);
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#22c55e', borderRadius: '10px', fontFamily: 'Satoshi, sans-serif' } } }}>
      <StripePaymentForm total={total} onSuccess={onSuccess} getDetails={getDetails} />
    </Elements>
  );
}

// ---- Stripe security badge ----
function StripeBadge() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, color: 'var(--ink-4)', fontSize: 12 }}>
      <svg width="11" height="14" viewBox="0 0 11 14" fill="none" aria-hidden="true">
        <path d="M5.5 0L0 2.333V6.417C0 9.613 2.333 12.6 5.5 13.417 8.667 12.6 11 9.613 11 6.417V2.333L5.5 0Z" fill="currentColor" opacity=".35"/>
        <path d="M5.5 1.2L1 3.2V6.8C1 9.52 3 12.12 5.5 12.84 8 12.12 10 9.52 10 6.8V3.2L5.5 1.2Z" fill="currentColor" opacity=".55"/>
        <path d="M4.5 7.5L3.5 6.5L3 7L4.5 8.5L8 5L7.5 4.5L4.5 7.5Z" fill="currentColor"/>
      </svg>
      <span>Secured by</span>
      <svg width="36" height="15" viewBox="0 0 60 25" aria-label="Stripe" fill="none">
        <path d="M59.6 13.2c0-4.4-2.1-7.9-6.2-7.9-4.1 0-6.6 3.5-6.6 7.9 0 5.2 2.9 7.8 7.1 7.8 2.1 0 3.6-.5 4.8-1.1v-3.4c-1.2.6-2.5 1-4.2 1-1.7 0-3.1-.6-3.3-2.6h8.3c0-.2.1-.9.1-1.7zm-8.4-1.6c0-1.9 1.2-2.7 2.2-2.7 1 0 2.2.8 2.2 2.7h-4.4zM41.2 5.3c-1.7 0-2.8.8-3.4 1.3l-.2-1.1H34v20.1l4.1-.9V20c.6.5 1.6 1 3.1 1 3.1 0 6-2.5 6-7.9-.1-5-3-7.8-6-7.8zm-1 12c-1 0-1.7-.4-2.1-.9V10c.5-.5 1.1-.9 2.1-.9 1.6 0 2.7 1.8 2.7 4.1 0 2.4-1.1 4.1-2.7 4.1zM28.2 4.2l4.1-.9V0l-4.1.9v3.3zM28.2 5.5h4.1v15.2h-4.1V5.5zM23.7 6.7l-.3-1.2h-3.5v15.2h4.1v-10.3c1-1.3 2.6-1 3.1-.9V5.5c-.5-.2-2.4-.5-3.4 1.2zM15.7 2.2l-4 .9-.1 13.9c0 2.6 1.9 4.4 4.5 4.4 1.4 0 2.5-.3 3-.5v-3.4c-.6.2-3.4 1.1-3.4-1.6V9h3.4V5.5h-3.4L15.7 2.2zM4.3 9.5c0-.6.5-.9 1.4-.9 1.3 0 2.9.4 4.2 1.1V5.9C8.6 5.4 7.2 5.3 5.7 5.3 2.3 5.3 0 7.1 0 9.7c0 5 6.9 4.2 6.9 6.4 0 .8-.7 1-1.6 1-1.4 0-3.1-.6-4.5-1.4v3.9c1.5.7 3.1 1 4.5 1C8.9 20.6 11.3 18.9 11.3 16.3c0-5.4-7-4.4-7-6.8z" fill="#635BFF"/>
      </svg>
    </div>
  );
}

// ---- Order success ----
function OrderSuccess({ orderId, total, itemCount, items, onContinue, onViewDetails, onTrackOrder }: { orderId: string; total: number; itemCount: number; items: any[]; onContinue: () => void; onViewDetails: () => void; onTrackOrder: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 20, textAlign: 'center', padding: '0 24px' }}>
      <div style={{ width: 72, height: 72, borderRadius: 24, background: 'var(--green-tint)', border: '2px solid var(--green)', display: 'grid', placeItems: 'center' }}>
        <Icon name="check" size={34} color="var(--green)" stroke={2.5} />
      </div>
      <div>
        <h2 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Order confirmed!</h2>
        <p style={{ color: 'var(--ink-3)', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
          {itemCount} item{itemCount !== 1 ? 's' : ''} · {sMoney(total)}<br />
          It will show in My orders as soon as the payment clears.
        </p>
        <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>{orderId}</div>
      </div>
      <div style={{ display: 'grid', gap: 10, width: '100%', maxWidth: 320 }}>
        <button className="btn btn-primary" onClick={onTrackOrder} style={{ justifyContent: 'center', padding: '13px' }}>Track your order</button>
        <button className="btn btn-ghost" onClick={onViewDetails} style={{ justifyContent: 'center', fontSize: 13.5 }}>View order details</button>
        <button onClick={onContinue} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink-4)', padding: '4px' }}>Continue shopping</button>
      </div>
    </div>
  );
}

// ---- Order details modal ----
function OrderDetailsModal({ items, total, orderId, onClose }: { items: any[]; total: number; orderId: string; onClose: () => void }) {
  const subtotal = items.reduce((s, i) => s + parseCents(i.price) * (i.quantity || 1), 0) / 100;
  const shipping = subtotal >= 75 ? 0 : 5.99;
  const steps = [
    { label: 'Order placed', done: true, time: 'Just now' },
    { label: 'Payment confirmed', done: true, time: 'Just now' },
    { label: 'Processing', done: false, time: 'Est. 1–2 hours' },
    { label: 'Shipped', done: false, time: 'Est. 2–4 days' },
    { label: 'Delivered', done: false, time: 'Est. 5–7 days' },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1001, width: 520, maxWidth: '95vw', maxHeight: '90vh',
        background: 'var(--bg)', borderRadius: 22, border: '1px solid var(--line)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,.18)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Order details</div>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', marginTop: 2, letterSpacing: '.04em' }}>{orderId}</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }} className="no-scrollbar">
          {/* Order status */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 16 }}>ORDER STATUS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {steps.map((step, i) => (
                <div key={step.label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                      background: step.done ? 'var(--green)' : 'var(--bg-2)',
                      border: '2px solid ' + (step.done ? 'var(--green)' : 'var(--line)'),
                    }}>
                      {step.done && <Icon name="check" size={11} color="#fff" stroke={2.5} />}
                    </div>
                    {i < steps.length - 1 && <div style={{ width: 2, height: 28, background: step.done ? 'var(--green)' : 'var(--line)', margin: '3px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: i < steps.length - 1 ? 0 : 0, paddingTop: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: step.done ? 600 : 400, color: step.done ? 'var(--ink)' : 'var(--ink-3)' }}>{step.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 14 }}>{step.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 14 }}>ITEMS ({items.reduce((n, i) => n + (i.quantity || 1), 0)})</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {items.map((item, idx) => {
                const qty = item.quantity || 1;
                const lineTotal = parseCents(item.price) * qty / 100;
                return (
                  <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                      {item.imgUrl ? <img src={item.imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{item.brand}{qty > 1 ? ` · ×${qty}` : ''}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{sMoney(lineTotal)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div style={{ padding: '18px 24px' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-3)' }}>
                <span>Subtotal</span><span style={{ fontFamily: 'JetBrains Mono' }}>{sMoney(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-3)' }}>
                <span>Shipping</span><span style={{ fontFamily: 'JetBrains Mono', color: shipping === 0 ? 'var(--green)' : undefined }}>{shipping === 0 ? 'Free' : sMoney(shipping)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <span>Total</span><span style={{ fontFamily: 'Lora' }}>{sMoney(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================================
// Main checkout screen
// =====================================================================
export function DesktopCheckout() {
  const app = useApp();
  const router = useRouter();
  const { cart = [], clearCart } = app;
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [stripeMode, setStripeMode] = React.useState<'loading' | 'live' | 'unavailable' | 'signin' | 'error'>('loading');
  const [startError, setStartError] = React.useState('');
  // The server's priced quote. Once it arrives it is the only source for what
  // the buyer sees as the total, because it is the amount that gets charged.
  const [quote, setQuote] = React.useState<{ orderId: string; items: any[]; subtotal: number; shipping: number; total: number } | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [orderSnapshot, setOrderSnapshot] = React.useState<{ id: string; total: number; itemCount: number; items: any[]; address: any } | null>(null);
  const [showOrderModal, setShowOrderModal] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [mob, setMob] = React.useState(false);
  React.useEffect(() => {
    const check = () => setMob(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Controlled shipping/contact fields so we can snapshot on success
  const [email, setEmail] = React.useState(app.state?.user?.email || '');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [street, setStreet] = React.useState('');
  const [city, setCity] = React.useState('');
  const [zip, setZip] = React.useState('');
  const [country, setCountry] = React.useState('United States');
  // ISO code for Stripe, which rejects free-text country names. Filled from the
  // address lookup; null means "leave it off" rather than guess.
  const [countryCode, setCountryCode] = React.useState<string | null>('US');
  const [streetFocused, setStreetFocused] = React.useState(false);
  const addressSuggestions = useAddressAutocomplete(street);
  const showSuggestions = streetFocused && addressSuggestions.length > 0;

  const applyAddress = (r: NominatimResult) => {
    const a = r.address;
    const streetLine = [a.house_number, a.road].filter(Boolean).join(' ');
    if (streetLine) setStreet(streetLine);
    setCity(a.city || a.town || a.village || a.county || '');
    setZip(a.postcode || '');
    setCountry(a.country || '');
    setCountryCode(a.country_code ? a.country_code.toUpperCase() : null);
    setStreetFocused(false);
  };

  // Cart-based estimate until the server's quote lands; the quote wins after.
  const estSubtotal = cart.reduce((s: number, i: any) => s + parseCents(i.price) * (i.quantity || 1), 0) / 100;
  const estShipping = estSubtotal > 0 ? (estSubtotal >= 75 ? 0 : 5.99) : 0;
  const lineItems: any[] = quote?.items ?? cart;
  const subtotal = quote?.subtotal ?? estSubtotal;
  const shipping = quote?.shipping ?? estShipping;
  const total = quote?.total ?? estSubtotal + estShipping;
  const itemCount = lineItems.reduce((n: number, i: any) => n + (i.quantity || 1), 0);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  // Ask the server to price the cart. Only ids and quantities go up — the
  // server reads prices from the catalogue and the webhook creates the order
  // once Stripe confirms that exact amount (see app/api/checkout/route.ts).
  React.useEffect(() => {
    if (cart.length === 0) return;
    let cancelled = false;
    setStripeMode('loading');
    setStartError('');
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ items: cart.map((i: any) => ({ id: i.id, quantity: i.quantity || 1 })) }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.clientSecret && publishableKey) {
          setClientSecret(data.clientSecret);
          setQuote({ orderId: data.orderId, items: data.items, subtotal: data.subtotal, shipping: data.shipping, total: data.total });
          setStripeMode('live');
        } else if (data.error === 'stripe_not_configured' || (res.ok && !publishableKey)) {
          // No Stripe keys. There used to be a simulated card form here that
          // showed "Order confirmed" without charging or recording anything.
          setStripeMode('unavailable');
        } else if (res.status === 401) {
          setStripeMode('signin');
        } else {
          setStartError(data.message || 'We could not start checkout. Please try again.');
          setStripeMode('error');
        }
      } catch {
        if (!cancelled) { setStartError('We could not reach the server. Check your connection and try again.'); setStripeMode('error'); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const getDetails = (): PayDetails => {
    const name = [firstName, lastName].map(v => v.trim()).filter(Boolean).join(' ');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { error: 'Enter the email address for your receipt.' };
    if (!name || !street.trim() || !city.trim()) return { error: 'Enter your name and shipping address.' };
    return {
      email: email.trim(),
      shipping: {
        name,
        address: {
          line1: street.trim(), city: city.trim(), postal_code: zip.trim() || undefined,
          ...(countryCode ? { country: countryCode } : {}),
        },
      },
    };
  };

  const [paymentFailed, setPaymentFailed] = React.useState(false);

  const buildSnapshot = () => ({
    orderId: quote?.orderId ?? '',
    items: [...lineItems], subtotal, shipping, total, itemCount,
    address: { firstName, lastName, street, city, zip, country, email }, email,
  });

  // Persist a pending-order snapshot so a redirect-based payment (3D Secure)
  // can finalize the order on return — React state is wiped by the redirect.
  React.useEffect(() => {
    if (!cart.length) return;
    try { localStorage.setItem('honua_pending_checkout', JSON.stringify(buildSnapshot())); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, quote, firstName, lastName, street, city, zip, country, email, subtotal, shipping, total]);

  // Shows the confirmation. Deliberately writes no order anywhere: the Stripe
  // webhook creates it from the server's quote once the payment clears, and
  // the orders pages read only that row.
  const finalize = (snap: any) => {
    const address = snap.address;
    setOrderSnapshot({ id: snap.orderId, total: snap.total, itemCount: snap.itemCount, items: snap.items, address });
    clearCart?.();
    setSuccess(true);
    try { localStorage.removeItem('honua_pending_checkout'); } catch {}
  };

  const handleSuccess = () => finalize(buildSnapshot());

  // Handle return from a redirect-based payment (e.g. 3D Secure). Stripe appends
  // ?redirect_status=succeeded|failed to the return_url.
  React.useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('redirect_status');
    if (!status) return;
    // Clean the query so a refresh doesn't re-trigger this
    try { window.history.replaceState({}, '', '/checkout'); } catch {}
    if (status === 'succeeded') {
      try {
        const snap = JSON.parse(localStorage.getItem('honua_pending_checkout') || 'null');
        if (snap) finalize(snap);
      } catch {}
    } else {
      // failed / canceled — card wasn't charged
      setPaymentFailed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (paymentFailed) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <CheckoutNav onBack={() => router.push('/marketplace')} />
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'color-mix(in srgb, var(--clay) 12%, transparent)', color: 'var(--clay)', display: 'inline-grid', placeItems: 'center' }}>
              <Icon name="close" size={26} stroke={2.2} />
            </div>
            <h1 className="font-display" style={{ fontSize: 26, fontWeight: 600, margin: '18px 0 0', letterSpacing: '-0.02em' }}>Payment didn't go through</h1>
            <p style={{ fontSize: 14.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: '10px 0 22px' }}>
              Your card wasn't charged. This can happen if the payment was declined or the card authentication failed. Your cart is still here — try again with the same or a different card.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => router.push('/marketplace')} style={{ padding: '11px 18px' }}>Back to shop</button>
              <button className="btn btn-primary" onClick={() => setPaymentFailed(false)} style={{ padding: '11px 20px' }}>Try again</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success && orderSnapshot) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <CheckoutNav onBack={() => router.push('/marketplace')} />
        <OrderSuccess
          orderId={orderSnapshot.id}
          total={orderSnapshot.total}
          itemCount={orderSnapshot.itemCount}
          items={orderSnapshot.items}
          onContinue={() => router.push('/marketplace')}
          onViewDetails={() => setShowOrderModal(true)}
          onTrackOrder={() => router.push(`/orders/${orderSnapshot.id}`)}
        />
        {showOrderModal && (
          <OrderDetailsModal
            items={orderSnapshot.items}
            total={orderSnapshot.total}
            orderId={orderSnapshot.id}
            onClose={() => setShowOrderModal(false)}
          />
        )}
      </div>
    );
  }

  if (cart.length === 0 && !success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <CheckoutNav onBack={() => router.push('/marketplace')} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14, color: 'var(--ink-4)', padding: 40 }}>
          <Icon name="bag" size={40} stroke={1.4} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Your cart is empty</div>
          <button className="btn btn-primary" onClick={() => router.push('/marketplace')}>Browse marketplace</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes skelPulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
      <CheckoutNav onBack={() => router.back()} />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 440px', gap: 0, maxWidth: 1060, margin: '0 auto', width: '100%', padding: mob ? '16px 16px 80px' : '32px 24px 60px', alignItems: 'start', overflowX: 'hidden' }}>

        {/* Left: payment */}
        <div style={{ paddingRight: mob ? 0 : 48 }}>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Payment</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 28px' }}>All transactions are secure and encrypted.</p>

          {/* Contact */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>Contact</div>
            <input className="fld" placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          {/* Shipping */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>Shipping address</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="fld" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                <input className="fld" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="fld" placeholder="Street address"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  onFocus={() => setStreetFocused(true)}
                  onBlur={() => setTimeout(() => setStreetFocused(false), 180)}
                  autoComplete="off"
                />
                {showSuggestions && <AddressSuggestions suggestions={addressSuggestions} onSelect={applyAddress} />}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <input className="fld" placeholder="City" style={{ gridColumn: '1 / 3' }} value={city} onChange={e => setCity(e.target.value)} />
                <input className="fld" placeholder="ZIP" value={zip} onChange={e => setZip(e.target.value)} />
              </div>
              <input className="fld" placeholder="Country" value={country} onChange={e => { setCountry(e.target.value); setCountryCode(/^united states$|^usa?$/i.test(e.target.value.trim()) ? 'US' : null); }} />
            </div>
          </div>

          {/* Payment */}
          <div>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>Payment details</div>
            {stripeMode === 'loading' && (
              <div style={{ display: 'grid', gap: 10 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ height: 48, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--line)', animation: 'skelPulse 1.4s ease-in-out infinite' }} />)}
              </div>
            )}
            {stripeMode === 'live' && clientSecret && (
              <StripeCheckout clientSecret={clientSecret} publishableKey={publishableKey} total={total} onSuccess={handleSuccess} getDetails={getDetails} />
            )}
            {stripeMode === 'signin' && (
              <div style={{ padding: '18px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg-2)', display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>Sign in to finish your purchase — the order is saved to your account so you can track it.</div>
                <button className="btn btn-primary" onClick={() => router.push('/login')} style={{ justifyContent: 'center', padding: '13px' }}>Sign in to continue</button>
              </div>
            )}
            {stripeMode === 'error' && (
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 13.5, color: '#dc2626' }}>{startError}</div>
                <button className="btn btn-ghost" onClick={() => setAttempt(a => a + 1)} style={{ justifySelf: 'start', padding: '9px 16px' }}>Try again</button>
              </div>
            )}
            {stripeMode === 'unavailable' && (
              <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg-2)', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                Payments aren&apos;t set up yet, so orders can&apos;t be placed. Nothing has been charged.
              </div>
            )}
          </div>
        </div>

        {/* Right: order summary */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: mob ? 16 : 24, position: mob ? 'static' : 'sticky', top: 24, marginTop: mob ? 24 : 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>Order summary</div>

          {/* Items */}
          <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
            {lineItems.map((item: any) => {
              const key = item.id || item.name;
              const qty = item.quantity || 1;
              const lineTotal = parseCents(item.price) * qty / 100;
              return (
                <div key={key} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                      {item.imgUrl
                        ? <img src={item.imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}><Icon name="bag" size={18} stroke={1.4} /></div>
                      }
                    </div>
                    {qty > 1 && (
                      <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--ink)', color: 'var(--bg)', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', fontFamily: 'JetBrains Mono' }}>{qty}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{item.name}</div>
                    {item.brand && <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2, fontFamily: 'JetBrains Mono' }}>{item.brand}</div>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{sMoney(lineTotal)}</div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-3)' }}>
              <span>Subtotal</span><span style={{ fontFamily: 'JetBrains Mono' }}>{sMoney(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-3)' }}>
              <span>Shipping</span>
              <span style={{ fontFamily: 'JetBrains Mono', color: shipping === 0 ? 'var(--green)' : undefined }}>
                {shipping === 0 ? 'Free' : sMoney(shipping)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <span>Total</span>
              <span style={{ fontFamily: 'Lora', letterSpacing: '-0.01em' }}>{sMoney(total)}</span>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[['lock', 'SSL encrypted checkout'], ['check', 'Free returns within 30 days'], ['leaf', 'Carbon-offset shipping']].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>
                <Icon name={icon} size={14} color="var(--green)" />{label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutNav({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, padding: 0 }}>
        <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={16} /></span>
        Back
      </button>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>Honua</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-4)' }}>
        <Icon name="lock" size={12} /> Secure checkout
      </div>
    </div>
  );
}
