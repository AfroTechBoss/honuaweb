"use client";
import React from "react";
import { Icon, Avatar, Modal, ModalHead, SStat, SBadge, sTint, useApp } from "@/components/shared";
import { relativeTime } from "@/lib/admin-metrics";
import {
  listOrders, updateOrder, issueRefund, ORDER_STATUSES, EMPTY_ORDER_COUNTS,
  remainingCents, money,
  type AdminOrder, type OrderCounts, type OrderStatus,
} from "@/lib/admin-orders";

// =====================================================================
// ORDERS — find one, read it, move it, refund it
//
// The console has never been able to see an order. 014 wrote an RLS policy
// for it that reads as working access control and has never once fired: it
// is keyed on auth.uid(), and this console signs in with Privy. So "where do
// I look up an order" had no answer, and neither did "how do I give someone
// their money back" — there was no refund path anywhere in the codebase.
//
// Two things shape this screen. Search is server-side, because the list is
// capped and a search box that quietly only covers the last hundred orders
// would be worse than none. And refunds are two-step and reason-required,
// because they are the one irreversible thing an admin can do from here.
// =====================================================================

const STATUS_HELP: Record<OrderStatus, string> = {
  processing: 'Paid for, nobody has started on it',
  confirmed: 'The seller has accepted it',
  shipped: 'On its way',
  delivered: 'It arrived',
  cancelled: 'Called off — refund separately if money was taken',
};

const PAYMENT_FILTERS: [string, string][] = [
  ['all', 'Any payment'],
  ['paid', 'Paid'],
  ['unpaid', 'Unpaid'],
  ['failed', 'Failed'],
  ['refunded', 'Refunded'],
];

const COLS = '132px 1.5fr 1fr 96px 118px 110px 78px';

// The buyer's own words for where it goes. Written by checkout as
// { firstName, lastName, street, city, zip, country, email }.
function addressLines(a: any): string[] {
  if (!a || typeof a !== 'object') return [];
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
  const town = [a.city, a.zip].filter(Boolean).join(' ');
  return [name, a.street, town, a.country].map(s => String(s ?? '').trim()).filter(Boolean);
}

export function AdminOrders({ getToken, log, onAttention }) {
  const app = useApp();
  // null = still loading. [] means there really are no orders.
  const [orders, setOrders] = React.useState<AdminOrder[] | null>(null);
  const [counts, setCounts] = React.useState<OrderCounts>(EMPTY_ORDER_COUNTS);
  const [available, setAvailable] = React.useState(true);
  const [countsOk, setCountsOk] = React.useState(true);
  const [refundsOk, setRefundsOk] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState('all');
  const [payment, setPayment] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    try { return await tokenRef.current(); } catch { return null; }
  }, []);

  const attentionRef = React.useRef(onAttention);
  attentionRef.current = onAttention;

  const load = React.useCallback(async (opts: { q: string; status: string; payment: string }) => {
    const { orders: rows, counts: c, available: ok, countsAvailable, refundsAvailable, error } =
      await listOrders(await token(), opts);
    if (error) { setLoadError(error); setOrders([]); return; }
    setLoadError(null);
    setAvailable(ok !== false);
    setCountsOk(countsAvailable !== false);
    setRefundsOk(refundsAvailable !== false);
    setOrders(rows ?? []);
    if (c) setCounts(c);
  }, [token]);

  // Search runs on the server, so it is debounced — one request per pause, not
  // one per keystroke. The status and payment filters skip the wait because
  // they're a single click and waiting on them feels broken.
  const [term, setTerm] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), q.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => { setOrders(null); load({ q: term, status, payment }); }, [load, term, status, payment]);

  // The rail badge is told from an effect, never from inside a state updater —
  // updaters run during render, and calling the parent's setState from there is
  // the "cannot update a component while rendering a different component"
  // warning. Failed payments, not open orders: fulfilment is the seller's
  // queue, but a payment that didn't go through is nobody's until an admin
  // notices it.
  const failedPayments = counts.paymentFailed;
  const loaded = orders !== null;
  React.useEffect(() => { if (loaded) attentionRef.current?.(failedPayments); }, [loaded, failedPayments]);

  const refresh = () => { setOrders(null); load({ q: term, status, payment }); };

  const list = orders ?? [];
  const loading = orders === null;
  const open = openId ? list.find(o => o.id === openId) ?? null : null;
  const unknown = loading || !!loadError || !countsOk;

  const swap = (next: AdminOrder) => setOrders(os => (os ?? []).map(o => o.id === next.id ? next : o));

  const move = async (o: AdminOrder, next: OrderStatus) => {
    setBusy(true);
    try {
      const { order, error } = await updateOrder(await token(), o.id, { status: next });
      if (error || !order) {
        app.toast?.({ msg: "Couldn't move that order", sub: error, kind: 'error', icon: 'close' });
        return;
      }
      swap(order);
      log?.(`marked order ${next}`, order.id, next === 'cancelled' ? 'close' : 'check');
      app.toast?.({ msg: `${order.id} → ${next}`, sub: STATUS_HELP[next], kind: next === 'delivered' ? 'success' : undefined, icon: 'bag' });
      // The status tallies above the table came from the server and are now a
      // request out of date. Cheaper and more honest to re-read them than to
      // patch two counters by hand and hope they stay in step.
      load({ q: term, status, payment });
    } finally { setBusy(false); }
  };

  const saveNote = async (o: AdminOrder, note: string) => {
    setBusy(true);
    try {
      const { order, error } = await updateOrder(await token(), o.id, { adminNote: note });
      if (error || !order) {
        app.toast?.({ msg: "Couldn't save that note", sub: error, kind: 'error', icon: 'close' });
        return;
      }
      swap(order);
      app.toast?.({ msg: 'Note saved', sub: order.id, icon: 'pencil' });
    } finally { setBusy(false); }
  };

  const refund = async (o: AdminOrder, input: { amountCents: number; reason: string; method: 'stripe' | 'manual' }) => {
    setBusy(true);
    try {
      const { order, refund: r, error } = await issueRefund(await token(), { orderId: o.id, ...input });
      if (error || !order) {
        app.toast?.({ msg: 'Refund not issued', sub: error, kind: 'error', icon: 'close' });
        return false;
      }
      swap(order);
      log?.(`refunded ${money(input.amountCents)}`, order.id, 'coin');
      app.toast?.({
        msg: `Refunded ${money(input.amountCents)}`,
        sub: r?.method === 'manual' ? 'Recorded — no money moved through Stripe' : `Stripe ${r?.stripeRefundId ?? ''}`.trim(),
        kind: 'success', icon: 'coin',
      });
      load({ q: term, status, payment });
      return true;
    } finally { setBusy(false); }
  };

  const STATUS_TABS: [string, string, number][] = [
    ['all', 'All', counts.total],
    ['processing', 'Processing', counts.processing],
    ['confirmed', 'Confirmed', counts.confirmed],
    ['shipped', 'Shipped', counts.shipped],
    ['delivered', 'Delivered', counts.delivered],
    ['cancelled', 'Cancelled', counts.cancelled],
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <SStat label="Collected" value={unknown ? '—' : money(counts.grossCents)} icon="coin" accent="var(--green)"
          sub={unknown ? '' : `${counts.paid} paid ${counts.paid === 1 ? 'order' : 'orders'}`} />
        <SStat label="Refunded" value={unknown ? '—' : money(counts.refundedCents)} icon="arrow" accent="var(--sky)"
          sub={unknown ? '' : counts.refunded === 0 ? 'nothing sent back' : `across ${counts.refunded} ${counts.refunded === 1 ? 'order' : 'orders'}`} />
        <SStat label="Payments failed" value={unknown ? '—' : counts.paymentFailed} icon="alert" accent="var(--clay)"
          sub={unknown ? '' : counts.paymentFailed === 0 ? 'all clear' : 'money never arrived'} />
        <SStat label="Last 24 hours" value={unknown ? '—' : counts.last24h} icon="bolt"
          sub={unknown ? '' : 'new orders'} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS_TABS.map(([k, label, n]) => (
            <button key={k} onClick={() => setStatus(k)} className={'chip' + (status === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
              {label} <span style={{ fontFamily: 'JetBrains Mono', opacity: .65 }}>· {unknown ? '—' : n}</span>
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', minWidth: 280 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Order number, email, buyer, payment id"
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none' }} />
          </div>
          <button className="btn btn-ghost" onClick={refresh} style={{ flexShrink: 0 }}>
            <Icon name="clock" size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {PAYMENT_FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setPayment(k)} className={'chip' + (payment === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{label}</button>
        ))}
      </div>

      {loadError && (
        <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)'), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="alert" size={15} />
          <span style={{ flex: 1 }}>{loadError}</span>
          <button className="btn btn-ghost" onClick={refresh} style={{ fontSize: 12, padding: '5px 11px' }}>Retry</button>
        </div>
      )}

      {!loading && !loadError && !available && (
        <Notice>The orders table doesn't exist yet — apply <strong>supabase/migrations/014_marketplace.sql</strong>.</Notice>
      )}
      {!loading && !loadError && available && !refundsOk && (
        <Notice>Orders are readable, but refunds can't be issued or shown — apply <strong>supabase/migrations/039_order_admin.sql</strong>.</Notice>
      )}
      {!loading && !loadError && available && refundsOk && !countsOk && (
        <Notice>The orders below are real, but the totals can't be read — apply <strong>supabase/migrations/039_order_admin.sql</strong>.</Notice>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
          <span>ORDER</span><span>BUYER</span><span>ITEMS</span>
          <span style={{ textAlign: 'right' }}>TOTAL</span><span>PAYMENT</span><span>STATUS</span>
          <span style={{ textAlign: 'right' }}>PLACED</span>
        </div>

        {loading && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>Loading orders…</div>}

        {!loading && loadError && (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>Orders couldn't be loaded.</div>
        )}

        {!loading && !loadError && list.length === 0 && (
          <div style={{ padding: '54px 32px', textAlign: 'center' }}>
            <Icon name="bag" size={28} color="var(--ink-3)" />
            <div style={{ marginTop: 10, fontWeight: 600 }}>
              {term || status !== 'all' || payment !== 'all' ? 'No orders match' : 'No orders yet'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
              {term
                ? 'Search covers the order number, the buyer’s email and name, and the Stripe payment id.'
                : status !== 'all' || payment !== 'all'
                  ? 'Try widening the filters.'
                  : 'Every checkout lands here the moment it is placed.'}
            </div>
          </div>
        )}

        {list.map(o => {
          const count = o.lineItems.length || o.items.length;
          const first = o.lineItems[0]?.name ?? o.items[0]?.name ?? '—';
          const refunded = o.refundedCents > 0;
          return (
            <button
              key={o.id}
              onClick={() => setOpenId(o.id)}
              style={{
                display: 'grid', gridTemplateColumns: COLS, gap: 12, width: '100%',
                padding: '13px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center',
                background: 'transparent', border: 'none', borderBottomStyle: 'solid',
                textAlign: 'left', cursor: 'pointer', fontFamily: 'Satoshi',
                opacity: o.status === 'cancelled' ? 0.62 : 1,
              }}
            >
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.id}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <Avatar src={o.buyer?.avatarUrl ?? undefined} name={o.buyer?.name ?? o.email ?? 'Guest'} size={28} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.buyer?.name ?? o.address?.firstName ?? 'Guest'}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.email ?? '—'}</span>
                </span>
              </span>
              <span style={{ minWidth: 0, fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {first}{count > 1 ? ` +${count - 1}` : ''}
              </span>
              <span className="tabular" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600 }}>
                {money(o.totalCents)}
                {refunded && (
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--sky)' }}>−{money(o.refundedCents)}</span>
                )}
              </span>
              <span><SBadge status={o.paymentStatus} size="sm" /></span>
              <span><SBadge status={o.status} size="sm" /></span>
              <span style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{relativeTime(o.createdAt)}</span>
            </button>
          );
        })}
      </div>

      {open && (
        <OrderDetail
          order={open}
          busy={busy}
          refundsOk={refundsOk}
          onClose={() => setOpenId(null)}
          onMove={s => move(open, s)}
          onNote={n => saveNote(open, n)}
          onRefund={input => refund(open, input)}
        />
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: sTint('var(--sun)'), border: '1px solid ' + sTint('var(--sun)', 30), color: 'var(--sun)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon name="alert" size={15} />
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

// ---- One order, and everything you can do to it -------------------------
function OrderDetail({ order, busy, refundsOk, onClose, onMove, onNote, onRefund }) {
  const o: AdminOrder = order;
  const [note, setNote] = React.useState(o.adminNote ?? '');
  React.useEffect(() => { setNote(o.adminNote ?? ''); }, [o.id, o.adminNote]);

  const left = remainingCents(o);
  const lines = addressLines(o.address);

  // Line items when they exist, the checkout snapshot when they don't. Orders
  // placed before migration 020 have no order_items rows at all, and showing
  // them as an empty order would be a lie about what was bought.
  const shown = o.lineItems.length
    ? o.lineItems.map(i => ({ name: i.name, qty: i.quantity, cents: i.priceCents, status: i.status, image: i.imageUrl }))
    : (o.items ?? []).map((i: any) => ({
        name: i.name ?? 'Item',
        qty: i.quantity || 1,
        cents: Math.round(parseFloat(String(i.price ?? '0').replace(/[^0-9.]/g, '')) * 100) || 0,
        status: null,
        image: i.imgUrl ?? null,
      }));

  return (
    <Modal onClose={onClose} width={680}>
      <ModalHead
        icon="bag"
        iconColor="var(--green)"
        title={`Order ${o.id}`}
        onClose={onClose}
        sub={`Placed ${relativeTime(o.createdAt)} · ${money(o.totalCents)}${o.refundedCents ? ` · ${money(o.refundedCents)} refunded` : ''}`}
      />
      <div style={{ padding: '0 24px', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SBadge status={o.status} />
          <SBadge status={o.paymentStatus} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{STATUS_HELP[o.status]}</span>
        </div>

        {/* Who, and where it goes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <span className="fld-label">Buyer</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar src={o.buyer?.avatarUrl ?? undefined} name={o.buyer?.name ?? o.email ?? 'Guest'} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.buyer?.name ?? o.address?.firstName ?? 'Guest checkout'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', wordBreak: 'break-all' }}>
                  {o.buyer?.handle ? `@${o.buyer.handle}` : o.userId ? 'no profile' : 'not signed in'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 8, wordBreak: 'break-all' }}>{o.email ?? 'No email on this order'}</div>
          </div>
          <div>
            <span className="fld-label">Ships to</span>
            {lines.length ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                {lines.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>No address recorded</div>
            )}
          </div>
        </div>

        {/* What was bought */}
        <div>
          <span className="fld-label">{o.lineItems.length ? 'Items' : 'Items (as recorded at checkout)'}</span>
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            {shown.map((i, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', borderBottom: idx === shown.length - 1 ? 'none' : '1px solid var(--line)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: i.image ? `url(${i.image}) center/cover` : 'var(--bg-2)', border: '1px solid var(--line)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>×{i.qty} · {money(i.cents)} each</div>
                </div>
                {i.status && <SBadge status={i.status} size="sm" />}
                <span className="tabular" style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600 }}>{money(i.cents * i.qty)}</span>
              </div>
            ))}
            {shown.length === 0 && <div style={{ padding: 18, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No items recorded on this order.</div>}
          </div>
        </div>

        {/* The arithmetic */}
        <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: '13px 16px', display: 'grid', gap: 6 }}>
          <Row label="Subtotal" value={money(o.subtotalCents)} />
          <Row label="Shipping" value={money(o.shippingCents)} />
          <Row label="Total" value={money(o.totalCents)} strong />
          {o.refundedCents > 0 && <Row label="Refunded" value={`−${money(o.refundedCents)}`} color="var(--sky)" />}
          {o.refundedCents > 0 && <Row label="Kept" value={money(o.totalCents - o.refundedCents)} strong />}
          {o.paymentIntentId && (
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 4, wordBreak: 'break-all' }}>{o.paymentIntentId}</div>
          )}
        </div>

        {/* What has already gone back */}
        {o.refunds.length > 0 && (
          <div>
            <span className="fld-label">Refund history</span>
            <div style={{ display: 'grid', gap: 7 }}>
              {o.refunds.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12.5, padding: '9px 13px', borderRadius: 10, background: sTint('var(--sky)'), color: 'var(--ink-2)' }}>
                  <span className="tabular" style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--sky)' }}>{money(r.amountCents)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{r.reason ?? 'No reason recorded'}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                    {r.method === 'manual' ? 'manual' : r.status} · {relativeTime(r.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <RefundBox order={o} left={left} busy={busy} enabled={refundsOk} onRefund={onRefund} />

        <div>
          <span className="fld-label">Internal note</span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="What was agreed, who was spoken to."
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13.5, fontFamily: 'Satoshi, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
          {note !== (o.adminNote ?? '') && (
            <button className="btn btn-ghost" onClick={() => onNote(note)} disabled={busy} style={{ marginTop: 8, fontSize: 12.5, padding: '6px 12px' }}>
              {busy ? 'Saving…' : 'Save note'}
            </button>
          )}
        </div>

        {o.email && (
          <a
            href={`mailto:${encodeURIComponent(o.email)}?subject=${encodeURIComponent(`Your Honua order ${o.id}`)}`}
            className="btn btn-ghost"
            style={{ justifyContent: 'center', padding: '10px', textDecoration: 'none' }}
          >
            <Icon name="msg" size={15} /> Email the buyer
          </a>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '20px 24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ORDER_STATUSES.filter(s => s !== o.status).map(s => (
            <button key={s} className="btn btn-ghost" onClick={() => onMove(s)} disabled={busy}
              title={STATUS_HELP[s]}
              style={{ fontSize: 12.5, padding: '6px 12px', ...(s === 'cancelled' ? { color: 'var(--clay)' } : {}) }}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

function Row({ label, value, strong = false, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: color ?? (strong ? 'var(--ink)' : 'var(--ink-3)') }}>
      <span>{label}</span>
      <span className="tabular" style={{ fontFamily: 'JetBrains Mono', fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
}

/**
 * The refund control.
 *
 * Deliberately the most friction on this screen. A reason is required because
 * it is the only record of why the money went back — the Stripe dashboard will
 * show an amount and a date and nothing else. And the button asks twice,
 * because the action cannot be taken back: there is no un-refund.
 *
 * "Record a manual refund" exists because money leaves by routes Stripe never
 * sees — a bank transfer, a replacement sent instead, an order that was never
 * charged. Without it those orders read as fully paid forever, and the totals
 * on this page are wrong by exactly that amount.
 */
function RefundBox({ order, left, busy, enabled, onRefund }) {
  const o: AdminOrder = order;
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [method, setMethod] = React.useState<'stripe' | 'manual'>('stripe');
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => { setAmount(''); setReason(''); setConfirming(false); }, [o.id]);

  if (!enabled) return null;

  if (left <= 0) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint('var(--sky)'), color: 'var(--sky)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon name="check" size={15} />
        <span>Refunded in full — {money(o.refundedCents)} of {money(o.totalCents)}.</span>
      </div>
    );
  }
  // An unpaid order can still need a manual refund recorded against it — money
  // does leave by routes Stripe never saw — so the box stays, and only the
  // Stripe half of it is blocked.
  const noStripe = method === 'stripe' && (!o.paymentIntentId || o.paymentStatus === 'unpaid');

  // Blank means everything outstanding, which is what the button then says.
  const parsed = amount.trim() === '' ? left : Math.round(parseFloat(amount.replace(/[^0-9.]/g, '')) * 100);
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= left && reason.trim().length > 0;

  return (
    <div style={{ border: '1px solid ' + sTint('var(--clay)', 26), borderRadius: 14, padding: '14px 16px', display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="coin" size={15} color="var(--clay)" />
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>Issue a refund</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{money(left)} available</span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {([['stripe', 'Through Stripe'], ['manual', 'Record a manual refund']] as const).map(([k, label]) => (
          <button key={k} onClick={() => { setMethod(k); setConfirming(false); }} className={'chip' + (method === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
        <input
          value={amount}
          onChange={e => { setAmount(e.target.value); setConfirming(false); }}
          inputMode="decimal"
          placeholder={`${(left / 100).toFixed(2)} (all)`}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13.5, fontFamily: 'JetBrains Mono', outline: 'none', boxSizing: 'border-box' }}
        />
        <input
          value={reason}
          onChange={e => { setReason(e.target.value); setConfirming(false); }}
          placeholder="Why — the buyer never sees this, but the next admin does"
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13.5, fontFamily: 'Satoshi, sans-serif', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {amount.trim() !== '' && Number.isFinite(parsed) && parsed > left && (
        <div style={{ fontSize: 12.5, color: 'var(--clay)' }}>That is more than the {money(left)} left on this order.</div>
      )}

      {noStripe && (
        <div style={{ fontSize: 12.5, color: 'var(--sun)' }}>
          {o.paymentIntentId
            ? 'This order was never paid, so there is nothing for Stripe to send back — record it as a manual refund instead.'
            : 'This order has no Stripe payment attached — record it as a manual refund instead.'}
        </div>
      )}

      {confirming ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1, minWidth: 200 }}>
            {method === 'stripe'
              ? `Send ${money(parsed)} back to ${o.email ?? 'the buyer'}? This can't be undone.`
              : `Record ${money(parsed)} as already refunded? No money moves.`}
          </span>
          <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy} style={{ fontSize: 12.5, padding: '7px 13px' }}>Cancel</button>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              const ok = await onRefund({ amountCents: parsed, reason: reason.trim(), method });
              if (ok) { setConfirming(false); setAmount(''); setReason(''); }
            }}
            style={{ fontSize: 12.5, padding: '7px 13px', background: 'var(--clay)', color: '#fff', border: 'none' }}
          >
            {busy ? 'Refunding…' : `Yes, refund ${money(parsed)}`}
          </button>
        </div>
      ) : (
        <button
          className="btn btn-ghost"
          disabled={!valid || busy || noStripe}
          onClick={() => setConfirming(true)}
          style={{ justifyContent: 'center', color: valid ? 'var(--clay)' : 'var(--ink-4)', borderColor: valid ? sTint('var(--clay)', 30) : 'var(--line)' }}
        >
          {reason.trim() ? `Refund ${money(Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, left)) : left)}` : 'Enter a reason to refund'}
        </button>
      )}
    </div>
  );
}
