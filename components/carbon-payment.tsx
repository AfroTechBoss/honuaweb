"use client";
import React from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { CarbonQuote, Retirement } from "@/lib/market";

// The payment step of a carbon retirement, shared by the credit modal and the
// "offset your year" modal. It asks the server to price the retirement, takes
// the card in place (the PaymentIntent allows no redirects), then waits for the
// webhook to retire the tonnes so it can hand back the serial.

let _stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripe = (key: string) => (_stripePromise ??= loadStripe(key));

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

type Stage =
  | { s: 'starting' }
  | { s: 'paying'; quote: CarbonQuote }
  | { s: 'confirming'; quote: CarbonQuote }
  | { s: 'pending'; quote: CarbonQuote }
  | { s: 'failed'; message: string };

export function CarbonPayment({ creditId, tonnes, onRetired, onBack }: {
  creditId: string;
  tonnes: number;
  onRetired: (r: Retirement) => void;
  onBack: () => void;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  const [stage, setStage] = React.useState<Stage>({ s: 'starting' });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!publishableKey) {
        setStage({ s: 'failed', message: 'Payments are not set up yet, so nothing can be retired. Nothing was charged.' });
        return;
      }
      const { startCarbonCheckout } = await import('@/lib/market');
      const out = await startCarbonCheckout(creditId, tonnes);
      if (cancelled) return;
      if (out.kind === 'ready') setStage({ s: 'paying', quote: out.quote });
      else setStage({
        s: 'failed',
        message: out.kind === 'signed-out' ? 'Sign in to retire a credit.'
          : out.kind === 'unavailable' ? 'Payments are not set up yet, so nothing can be retired. Nothing was charged.'
          : out.message,
      });
    })();
    return () => { cancelled = true; };
  }, [creditId, tonnes, publishableKey]);

  const stripePromise = React.useMemo(() => (publishableKey ? getStripe(publishableKey) : null), [publishableKey]);

  const paid = async (quote: CarbonQuote) => {
    setStage({ s: 'confirming', quote });
    const { waitForRetirement } = await import('@/lib/market');
    const out = await waitForRetirement(quote.checkoutId);
    if (out.kind === 'retired') onRetired(out.retirement);
    else if (out.kind === 'rejected') setStage({ s: 'failed', message: out.message });
    else setStage({ s: 'pending', quote });
  };

  if (stage.s === 'starting') {
    return <Note>Pricing your retirement…</Note>;
  }
  if (stage.s === 'failed') {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <ErrorBox>{stage.message}</ErrorBox>
        <button type="button" className="btn btn-ghost" style={{ justifySelf: 'start' }} onClick={onBack}>Back</button>
      </div>
    );
  }
  if (stage.s === 'confirming') {
    return <Note>Payment received. Retiring {stage.quote.tonnes} t and issuing your serial…</Note>;
  }
  if (stage.s === 'pending') {
    return (
      <Note>
        Your payment went through. The retirement is still being recorded and will appear in the carbon market with its
        serial in a minute or two. You don&apos;t need to pay again.
      </Note>
    );
  }

  const { quote } = stage;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: 14, background: 'var(--green-tint)', borderRadius: 12 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>
          {quote.tonnes} t × {usd(quote.unitCents)} · {quote.creditName}
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>{usd(quote.totalCents)}</div>
      </div>
      <Elements
        stripe={stripePromise}
        options={{ clientSecret: quote.clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#22c55e', borderRadius: '10px', fontFamily: 'Satoshi, sans-serif' } } }}
      >
        <PayForm totalCents={quote.totalCents} onPaid={() => paid(quote)} onBack={onBack} />
      </Elements>
    </div>
  );
}

// Must stay a stable, module-level component: redefining it per render would
// remount the PaymentElement and confirmPayment would lose it.
function PayForm({ totalCents, onPaid, onBack }: { totalCents: number; onPaid: () => void; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError('');
    const { error: stripeError } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (stripeError) {
      setError(stripeError.message || 'Payment failed. Please try again.');
      setBusy(false);
      return;
    }
    onPaid();
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <PaymentElement options={{ layout: 'tabs' }} onReady={() => setReady(true)} />
      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={busy}>Back</button>
        <button type="submit" className="btn btn-green" disabled={!stripe || !ready || busy} style={{ opacity: !ready || busy ? 0.7 : 1 }}>
          {busy ? 'Processing…' : ready ? `Pay ${usd(totalCents)}` : 'Loading payment…'}
        </button>
      </div>
    </form>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, padding: '18px 0', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>{children}</p>;
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', fontSize: 13, color: '#dc2626' }}>
      {children}
    </div>
  );
}
