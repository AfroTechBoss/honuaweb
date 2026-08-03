# The Carbon Market — how credits are listed, bought and retired

This document explains Honua's carbon credit system: where credits come from, who
can list them, what a "purchase" actually writes, and which parts of the page are
real versus copy.

It reflects exactly what the code does today (not a roadmap). Where something is
presentational — a badge, a price, a claim in the marketing copy — it says so.

---

## 1. The structural model: curated catalog, not peer marketplace

This is the decision everything else follows from.

Credits are **not user-generated**. There is no seller-listing flow the way the
product marketplace has one. `carbon_credits` is a single, platform-vetted
catalog of real-world offset projects, seeded and then maintained by admins.

The closest real-world analogues are **Patch** or **Puro.earth's B2B credit
catalogs** — a vetted inventory someone curates — rather than an eBay-style
system where any user lists their own supply.

Practical consequence: any feature request phrased as "let sellers list credits"
is a change of model, not a change of UI. The marketplace (`products`) and the
carbon market (`carbon_credits`) are deliberately different shapes.

---

## 2. Schema — `supabase/migrations/016_carbon.sql`

### `carbon_credits` — the catalog

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | pk |
| `name` | text | e.g. "Mau Forest restoration" |
| `region` | text | country, not lat/lng — this table is not mapped |
| `type` | text | Forestry, Wetland, Rewilding, DAC, Coastal, Soil |
| `verifier` | text | Verra VCS, Gold Standard, Plan Vivo, Puro.Earth |
| `vintage` | text | year, stored as text |
| `price_cents` | int | per tonne |
| `volume_t` | numeric | tonnes still available; decremented by trigger |
| `tag` | text | Verified / Premium / Removal — drives the badge colour |
| `active` | boolean | soft-delist; the public reader filters on it |
| `created_at` | timestamptz | also the catalog's sort order |

> **Correction to the original notes:** `verifier` and `vintage` **are** real
> columns and have been since migration 016. The earlier note that they were
> copy-only and "worth adding" is out of date — the badges on the row render
> from stored data, not hardcoded strings.

### `carbon_purchases` — retirements

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid → profiles | owner |
| `credit_id` | uuid → carbon_credits | `on delete set null` |
| `credit_name` | text | **snapshot**, so history survives credit deletion |
| `tonnes` | numeric | |
| `total_cents` | int | |
| `created_at` | timestamptz | |

A trigger (`decrement_credit_volume`, `security definer`) fires after insert and
does `volume_t = greatest(volume_t - tonnes, 0)` on the parent credit. Inventory
is therefore adjusted by the purchase row, not by the app.

### RLS

- `carbon_credits` — **public read** (`using (true)`), so guests can browse.
- `carbon_credits` write — `profiles.role in ('admin','moderator')`. See §4 for
  why this policy is effectively unused.
- `carbon_purchases` — strictly self-owned: select and insert both gated on
  `user_id = auth.uid()`. A user cannot see anyone else's retirements, which is
  why admin revenue figures have to be aggregated server-side.

---

## 3. Reading the catalog — `lib/market.ts`

`getCarbonCredits()` selects `active = true` ordered by `created_at`, and maps
each row into a display shape: `price` as a formatted string alongside
`price_cents`, `volume` as `"12,400 tCO₂"` alongside `volume_t`, and a `color`
derived from `tag` (`Removal` → `--sky`, `Premium` → `--green`, else
`--green-2`). Every failure path returns `[]` rather than throwing.

`getMyOffsets(userId)` returns `{ tonnes, totalCents, purchases }`, summed
client-side over the user's own rows.

---

## 4. Listing and editing — the admin console

Credits are managed through `/api/admin/carbon-credits` (GET / POST / PATCH /
DELETE), with the client half in `lib/admin-carbon.ts`.

This route exists because of a constraint documented elsewhere in the project:
**the admin console authenticates with Privy, not Supabase.** The admin browser
has no Supabase session, so `auth.uid()` is null there and the "admins manage
credits" RLS policy can never be satisfied from the client. The route verifies
the caller's Privy token and then writes with the **service-role key**.

So: the RLS admin policy is correct but dormant. All real writes go through the
server route. Any new admin write against `carbon_credits` must follow the same
path — a direct client write from `/admin` will fail silently.

The admin list also returns aggregates the public reader cannot compute —
`retired_t`, `revenue_cents`, `orders` — precisely because buyers can only read
their own retirements under RLS.

---

## 5. The buying flow

Category pills → row → buy modal → celebration.

**Filters** (`map-carbon.tsx:704`) are `All credits · Forestry · Removal ·
Wetland · Soil · Coastal`. Note `Removal` filters on `tag`; the rest filter on
`type`. (The original notes listed "Blue carbon / Capture / Cookstoves" — those
were pre-implementation names and don't exist in the code.)

**Row** shows name, region, verifier badge, vintage, spot price, available
tonnes.

**`MCredit` modal** (`misc-modals.tsx:175`) shows a verifier / available / spot
price triptych and a quantity stepper. On confirm it calls
`purchaseCredit(userId, {id, name}, qty, totalCents)`, dispatches a
`honua:offset-purchased` window event so the page can refresh, and opens the
`celebrate` modal. It refuses to write anything when `data.id` is missing — a
retirement is only recordable against a credit that exists.

**`MOffsetYear` modal** (`modals.tsx:1748`) is the same purchase against a
cheapest-first list of credits with `volume_t > 0`. Its header comment records a
deliberate product decision: the app logs CO₂ *saved*, never CO₂ *emitted*, so
there is no footprint to estimate and the modal makes the user choose a tonnage
rather than inventing one for them.

### What "buy" actually does

```
purchaseCredit() → insert into carbon_purchases → trigger decrements volume_t
```

That is the whole transaction. **No payment is processed.** No Stripe, no
invoice, no fulfilment. The insert immediately grants a retirement record and
the tonnes count toward the user's offsets. This is prototype-level and should
be treated as such.

---

## 6. What is presentational only

Worth being explicit about, because the copy is more confident than the code:

- **"On-chain verified · third-party audited · traceable to a real project."**
  Nothing is on-chain. `verifier` and `vintage` are stored text with no registry
  lookup or serial number behind them — a credit's provenance is exactly as
  trustworthy as the admin who typed it in.
- **Auto-offset, $14/mo** (`MAutoOffset`, `modals.tsx:1723`) — the Subscribe
  button closes the modal and fires a toast. No subscription record is written,
  nothing recurs, and "Manage in Settings" leads nowhere. Pure UI.
- **Soulbound impact NFT** (`map-carbon.tsx:830`) — "Mint 2026" opens the
  `celebrate` modal. No wallet, no contract, no token.
- **Certificate "added to your wallet"** — there is no certificate artifact; the
  `carbon_purchases` row is the only trace.

---

## 7. Known gaps

1. **Client-controlled price and quantity.** `tonnes` and `total_cents` are both
   computed in the browser and inserted as-is; RLS only checks `user_id`. A
   crafted insert can retire an arbitrary tonnage for `total_cents = 0`, and the
   trigger will happily decrement real inventory to match. Same class of problem
   as the checkout pricing issue already filed. Fixing it means moving the write
   behind a server route that recomputes the total from `carbon_credits`, or a
   `security definer` function that does the same.
2. **No stock guard.** `volume_t` is floored at 0 by the trigger, but nothing
   rejects a purchase larger than the remaining volume — it silently clamps, and
   the buyer is still charged for the full quantity in `total_cents`.
3. **`region` is a country string.** The carbon table cannot be plotted on the
   action map without geocoding; `map-carbon.tsx` renders the map and the credit
   table as separate concerns in one file.
4. **No `retired_at` / serial number**, so a retirement cannot be reconciled
   against a real registry even if one were wired up later.

---

## 8. File map

| Concern | File |
|---|---|
| Schema, RLS, seed, trigger | `supabase/migrations/016_carbon.sql` |
| Public read + purchase | `lib/market.ts` (§ "Carbon credits") |
| Admin CRUD client | `lib/admin-carbon.ts` |
| Admin CRUD server | `app/api/admin/carbon-credits/route.ts` |
| Admin UI | `components/screens/admin-carbon.tsx` |
| Market page + filters + table | `components/screens/map-carbon.tsx` |
| Buy modal | `components/screens/misc-modals.tsx` (`MCredit`) |
| Offset-year, auto-offset modals | `components/screens/modals.tsx` |
| Nav entry | `components/sidebar.tsx` ("Carbon market") |
