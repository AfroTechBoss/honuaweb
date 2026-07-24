"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-context";
import { Icon, sMoney } from "@/components/shared";

function parseCents(price: string | number): number {
  return Math.round(parseFloat(String(price).replace(/[^0-9.]/g, '')) * 100) || 0;
}

export function CartDrawer() {
  const app = useApp();
  const router = useRouter();
  const { cart = [], cartOpen, closeCart, removeFromCart, updateCartQty } = app;

  const subtotalCents = cart.reduce((s: number, i: any) => s + parseCents(i.price) * (i.quantity || 1), 0);
  const subtotal = subtotalCents / 100;
  const shipping = subtotal > 0 ? (subtotal >= 75 ? 0 : 5.99) : 0;
  const total = subtotal + shipping;

  const goToCheckout = () => {
    closeCart?.();
    router.push('/checkout');
  };

  if (!cartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(2px)' }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
        width: 420, maxWidth: '95vw',
        background: 'var(--bg)', borderLeft: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Your cart</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 2 }}>
              {cart.length === 0 ? 'Empty' : `${cart.reduce((n: number, i: any) => n + (i.quantity || 1), 0)} item${cart.reduce((n: number, i: any) => n + (i.quantity || 1), 0) !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button onClick={closeCart} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px' }} className="no-scrollbar">
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--ink-4)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
                <Icon name="bag" size={24} stroke={1.5} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Nothing in your cart yet</div>
              <button onClick={closeCart} className="btn btn-ghost" style={{ fontSize: 13 }}>Browse the marketplace</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12, paddingTop: 4 }}>
              {cart.map((item: any, idx: number) => {
                const key = item.id && item.id !== item.name ? item.id : `cart-${idx}`;
                const qty = item.quantity || 1;
                return (
                  <div key={key} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                    {/* Image */}
                    <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                      {item.imgUrl
                        ? <img src={item.imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}><Icon name="bag" size={22} stroke={1.4} /></div>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.brand && <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 2 }}>{item.brand}</div>}
                      <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 8 }}>{item.name}</div>
                      {/* Qty controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '4px 8px' }}>
                          <button onClick={() => updateCartQty?.(key, qty - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: '0 2px', fontSize: 16, lineHeight: 1 }}>−</button>
                          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: 'center', fontFamily: 'JetBrains Mono' }}>{qty}</span>
                          <button onClick={() => updateCartQty?.(key, qty + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: '0 2px', fontSize: 16, lineHeight: 1 }}>+</button>
                        </div>
                        <button onClick={() => removeFromCart?.(key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4, borderRadius: 6, display: 'flex' }}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ fontSize: 15, fontWeight: 700, flexShrink: 0, fontFamily: 'Lora' }}>
                      {qty > 1 ? sMoney(parseCents(item.price) * qty / 100) : item.price}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ borderTop: '1px solid var(--line)', padding: '16px 22px 24px' }}>
            {/* Order summary */}
            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-3)' }}>
                <span>Subtotal</span><span style={{ fontFamily: 'JetBrains Mono', fontWeight: 500 }}>{sMoney(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--ink-3)' }}>
                <span>Shipping</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 500, color: shipping === 0 ? 'var(--green)' : 'var(--ink-3)' }}>
                  {shipping === 0 ? 'Free' : sMoney(shipping)}
                </span>
              </div>
              {subtotal > 0 && subtotal < 75 && (
                <div style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 500 }}>
                  Add {sMoney(75 - subtotal)} more for free shipping
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                <span>Total</span><span style={{ fontFamily: 'Lora' }}>{sMoney(total)}</span>
              </div>
            </div>

            <button className="btn btn-primary" onClick={goToCheckout} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, fontWeight: 700 }}>
              Checkout · {sMoney(total)}
            </button>
            <button onClick={closeCart} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, color: 'var(--ink-3)', padding: '8px' }}>
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
