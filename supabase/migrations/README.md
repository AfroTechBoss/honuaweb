# Supabase migrations

Run these in the Supabase Dashboard → SQL Editor, **in numerical order**. Every
file is idempotent (safe to re-run) and defensively guards against pre-existing
tables, so re-running the whole set is harmless.

## Base schema (run first, if not already applied)

The original schema lives in `../schema.sql` plus the `../migrate_*.sql` helpers
and migrations `001`–`013`. If your project predates the `fable` work, those are
already in place.

## The `fable` migrations (014–023)

| #   | File | What it adds |
| --- | --- | --- |
| 014 | `014_marketplace.sql`        | `products`, `orders`, `product_reviews` (+ seeds the demo catalogue) |
| 015 | `015_projects_map.sql`       | Action-map columns on `projects` + `project_rsvps` |
| 016 | `016_carbon.sql`             | `carbon_credits` (+ seeds) + `carbon_purchases` |
| 017 | `017_seller_applications.sql`| `seller_applications` review queue |
| 018 | `018_impact_verification.sql`| Impact verification: `impact_vouches` + log proof/status/vouch trigger |
| 019 | `019_seller_products.sql`    | `products` inventory fields (stock / type) for the seller dashboard |
| 020 | `020_order_items.sql`        | `order_items` (seller fulfilment) + order-status rollup trigger |
| 021 | `021_cleanup_leftovers.sql`  | Drops unused pre-app leftover tables |
| 022 | `022_payouts.sql`            | `payout_requests` (seller withdrawals, admin review) |
| 023 | `023_order_payments.sql`     | `orders.payment_status` + `payment_intent_id` (Stripe webhook) |

## Environment variables

Client (always required):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Admin console (Privy email-OTP allowlist):

```
NEXT_PUBLIC_PRIVY_APP_ID=...
```

Stripe (optional — checkout runs in mock mode without these):

```
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...          # for /api/stripe/webhook
SUPABASE_SERVICE_ROLE_KEY=...            # checkout prices carts; webhook creates orders
```

Stripe webhook endpoint (Stripe Dashboard → Developers → Webhooks):

```
URL:    https://<your-domain>/api/stripe/webhook
events: payment_intent.succeeded, payment_intent.payment_failed, transfer.reversed
```

Since migration 048 the webhook is the only thing that creates orders: an order
appears only after Stripe reports a captured amount equal to the server's quote.
Without a working webhook, buyers are charged and no order is recorded.

Since migration 049 the same webhook retires carbon credits: a retirement is
recorded only after the payment matches the server's quote, and a payment that
can no longer be honoured (credit sold out, changed or removed) is refunded
automatically. Apply 049 after 048.

Migration 050 removes the invented numbers from the early seeds: community and
challenge counts are reset to real row counts, the seven seller-less demo
products are taken down (status `removed`, order history kept), and every
product's rating is recomputed from real reviews. It is safe to re-run.

## Granting yourself admin

`/admin` is gated by Privy, but `profiles.role` controls DB-level admin powers
(seller approvals, payout review, etc.):

```sql
update profiles set role = 'admin' where id = '<your-user-id>';
```
