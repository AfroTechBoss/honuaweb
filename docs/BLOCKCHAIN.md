# Blockchain in Honua — where it would be genuinely transformative, and where it would be theatre

**Status:** strategy document. Nothing here is built. No decision has been made.
**Written against:** the schema as of migration 046, and the product copy as it ships today.

---

## 0. Why this question is already live

This isn't a greenfield "should we add crypto" question. Honua has **already made
three on-chain promises in shipped copy**, and none of them are backed by a chain:

| Promise | Where | Reality |
|---|---|---|
| "Every credit on Honua is on-chain verified" | `components/screens/map-carbon.tsx:672` | Nothing is on-chain. `verifier` and `vintage` are free text an admin typed. |
| "Mint a soulbound token tied to your offsets. Wears your year on-chain." | `map-carbon.tsx:828` | The button opens a celebration modal. No wallet, no contract, no token. |
| "On-chain Carbon Credit Marketplace" / "The verified, on-chain impact record is the product" | `app/proposition/page.tsx:154`, `:179` | The investor-facing proposition sells the on-chain record as the asset. |

`docs/CARBON-CREDITS.md` §6 already records this honestly for internal purposes.
So the real question is not *"would blockchain be cool?"* — it's **"do we build
the thing we've been describing, or do we change the description?"** Both are
legitimate. What isn't legitimate is leaving it as-is once the platform has real
users and real money.

There is a second, quieter reason this is live: **the capability is already
installed and paid for.**

```ts
// components/admin-auth.tsx:29
embeddedWallets: { ethereum: { createOnLogin: "off" }, solana: { createOnLogin: "off" } },
```

Privy — already the admin auth provider, already a dependency
(`@privy-io/react-auth ^3.35.1`) — ships embedded, self-custodial wallets. That
flag is the entire distance between "no wallets" and "every user has a wallet
they never had to think about." No seed phrases, no MetaMask, no browser
extension. Email login *is* the wallet.

That changes the economics of this decision completely. The usual blocker for
consumer crypto — onboarding — is already solved in this codebase.

---

## 1. The test I'm applying

Blockchain earns its place when **at least one** of these is true. If none are,
a Postgres row is better in every measurable way: faster, cheaper, private,
queryable, and correctable.

1. **Multiple parties who don't trust each other** need to agree on one record,
   and no single party should own the database.
2. **The record must outlive the company.** If Honua shuts down, the claim must
   still be checkable.
3. **The user must be able to take it elsewhere** without Honua's cooperation or
   permission.
4. **The asset must be scarce, transferable, or provably retired** — and someone
   has a financial incentive to cheat.
5. **Settlement across borders or organisations** where the existing rails are
   slow, expensive, or unavailable.

Note what's *not* on the list: "it's decentralised", "it's immutable",
"it's transparent" as ends in themselves. Immutability is a **cost** — you can't
fix a mistake, and Honua's moderation system exists precisely because content
sometimes has to come down.

---

## 2. Tier A — the four that would genuinely be mindblowing

These clear the bar decisively. Each one either fixes a real defect that exists
today or delivers a promise already made.

### A.1 — Carbon retirement certificates on-chain

**This is the strongest case in the entire product, and it isn't close.**

Every criterion is met at once. Carbon credits are the textbook case for a public
ledger, because the entire integrity of a carbon market rests on one question:
*has this tonne been retired more than once?*

Right now Honua cannot answer that question at all. From `CARBON-CREDITS.md` §7:

- **Client-controlled price and quantity.** `tonnes` and `total_cents` are both
  computed in the browser and inserted as-is. A crafted insert retires arbitrary
  tonnage for `total_cents = 0`, and the trigger decrements real inventory to match.
- **No stock guard** — an oversized purchase silently clamps, and the buyer is
  billed for the full quantity.
- **No `retired_at`, no serial number**, so a retirement cannot be reconciled
  against a real registry even if one were wired up later.
- **No payment is processed.** The insert alone grants the retirement.

A user's proof that they offset 12 tonnes is currently a row in a private
database, readable only by them under RLS, with no serial number, backed by no
payment, against a credit whose provenance is "the admin who typed it in."

**What on-chain retirement changes:**

- A retirement mints a **non-transferable certificate** carrying the registry
  serial (Verra VCU ID, Gold Standard GSVER, Puro CORC), vintage, project ID,
  tonnage, and retirement timestamp.
- **Double-retirement becomes impossible** — not "discouraged by our code", but
  arithmetically impossible, enforceable across platforms, not just inside ours.
- The certificate is **publicly auditable by a journalist, an auditor, or a
  corporate ESG team** without asking Honua for anything. That is the actual
  product the proposition promises to sell (§4, "Data & impact reporting").
- It **survives Honua**. A 2026 retirement is still verifiable in 2040.

There is real ecosystem precedent here — Toucan, KlimaDAO, and Regen Network all
tokenise retirements, and Verra's own position on tokenisation has evolved
considerably. This is not speculative territory.

**The honest catch:** on-chain retirement is only as good as the bridge to the
real registry. If Honua mints a certificate for a credit that was never actually
retired at Verra, you've built a cryptographically perfect record of a lie. The
chain fixes double-spend and permanence; **it does not fix provenance.** Getting
this right means a real registry integration, which is a bigger lift than the
contract.

**Verdict: build this.** It is the one place where the chain is load-bearing
rather than decorative, and it fixes a live integrity hole regardless.

---

### A.2 — Verified impact as portable attestations

The proposition sells this explicitly:

> "A user's green track record becomes a visible, portable identity asset"
> "A 0–100 signal reflecting a person's verified lifetime impact. **Earned inside
> Honua, readable anywhere. Partners surface it; users own it.**"

*Users own it* and *readable anywhere* are load-bearing words. Today neither is
true. `profiles.impact_score` and `profiles.total_co2_kg` are columns in Honua's
Postgres, updated by a trigger Honua controls (`002_impact_triggers.sql`),
readable through Honua's API, revocable by Honua at will. A partner can only read
it because we let them, and only for as long as we exist.

The existing verification loop is genuinely good, and it's what makes this work:

```
log action (+ proof photo) → 3 community vouches → verified
→ linked post gains co2_saved_kg → enters the Verified feed
```

`impact_vouches` even encodes real anti-fraud logic — you can vouch for others,
never for yourself (`018_impact_verification.sql:63`). **That vouching graph is
the asset.** It's a human-verified, socially-attested record of real-world
action, and it is currently trapped in one company's database.

**What attestations change:** each verified log becomes a signed, non-transferable
attestation (the Ethereum Attestation Service model fits this almost exactly)
naming the action, category, CO₂, the vouchers, and the timestamp. Then:

- A user applying for a green job, a co-op membership, or a municipal grant can
  **prove their track record without Honua's involvement**.
- A partner app can **read the score without an API key** and without a
  commercial relationship — which sounds like giving away the product, but is
  actually how the score becomes a standard rather than a feature. A score only
  has value if it's recognised outside the app that issues it.
- **Vouches become reputation-weighted.** A vouch from someone with a long
  verified history counts differently from a vouch from a day-old account. That
  is a meaningful anti-Sybil upgrade over counting to three.

Crucially these must be **non-transferable**. A sustainability score you can buy
is worthless. This is the legitimate version of the "soulbound token" the UI
already advertises at `map-carbon.tsx:828` — and note that the current copy
("Wears your year on-chain") is describing exactly this. The idea was right; only
the implementation is missing.

**Verdict: build this, after A.1.** It's the difference between a feature and a
standard, and it's the piece with genuine strategic upside.

---

### A.3 — Stablecoin payouts for cross-border sellers

**This is the least glamorous item on the list and possibly the highest ROI.**

Look at the payout architecture that already exists (migrations 042 and 045).
Sellers connect PayPal, Stripe Connect, UglyCash, or bank transfer — and the
design already concedes defeat on geography:

> the bank transfer and uglycash payout will be **manually done** while the
> paypal and stripe will be automatically done

Manual payouts for exactly the markets Honua is presumably most interested in.
Stripe Connect doesn't support payouts to Nigerian sellers. PayPal's Nigeria
situation is famously limited. So there's a hand-built fallback with a human in
the loop, per payout, forever — and it doesn't scale past a few dozen sellers.

**A stablecoin rail (USDC on a low-fee chain) solves this specific, concrete,
already-painful problem:**

- Settles in **seconds**, not the 3–7 business days of correspondent banking.
- Costs **cents**, against 3–7% for cross-border card rails plus FX spread.
- Works in **every market Stripe and PayPal won't serve** — which is most of
  Africa, much of South Asia, and much of Latin America.
- Removes the manual dispatch step entirely. `payout_requests.dispatch_state`
  becomes a real automated state machine for every seller, not just the ones in
  supported countries.
- The embedded Privy wallet means **the seller never touches a seed phrase** —
  they see a balance and a cash-out button.

The off-ramp is the hard part, not the on-chain leg, and it's genuinely hard —
you need a local partner in each market to convert USDC to naira, cedis, rupees.
But that is a partnership problem with known solutions, not an architectural dead
end. And the existing alternative is *a person doing bank transfers by hand*.

**Verdict: this is the one I'd argue for on pure business merit**, independent of
any interest in blockchain. It's a payments infrastructure decision that happens
to use a chain.

⚠️ **This one needs qualified legal and compliance advice before any code.**
Moving stablecoin value to sellers implicates money transmission, KYC/AML, and
sanctions screening in every jurisdiction you touch. I can architect it; I'm not
in a position to tell you it's permissible where you operate.

---

### A.4 — Green Points as a real multi-party settlement rail

The proposition describes Green Points as a **two-way loop**, not a closed point
system:

> "Points earned anywhere — in-app or via partner integrations — are spendable
> in-app (tipping, boosts, marketplace) and redeemable with partners."
> "A mobility startup pays to emit cycling events; a supermarket chain pays to
> issue Green Points at checkout."

The moment a supermarket issues points and a *different* mobility startup honours
them, you have criterion #1 in its purest form: **multiple organisations that
don't fully trust each other, settling against a shared balance sheet, where none
of them should have to trust Honua's private ledger.**

That is what a shared ledger is *for*. Every partner can independently verify
issuance and redemption. Settlement between partners becomes automatic instead of
monthly reconciliation calls. Disputes become arithmetic instead of arguments.

**But this is the one I'd hold longest**, for three reasons:

1. **It only matters at scale.** With three partners, a Postgres ledger and a
   monthly CSV works fine. The shared ledger earns its keep at thirty partners,
   not three.
2. **The regulatory exposure is severe.** A transferable, redeemable-for-value
   token issued to consumers looks a great deal like stored value or e-money —
   in some readings, like a security. The proposition's own revenue model
   compounds this: *"Markup on points purchased or sold, plus float on unspent
   balances."* Points that can be **purchased with money** and **redeemed for
   value**, with the issuer earning float, is a regulated activity in most
   jurisdictions whether or not a blockchain is involved. Putting it on-chain
   makes it more visible, not less regulated.
3. **A tradeable points token corrupts the incentive.** If Green Points have a
   liquid market price, the optimal strategy stops being "do sustainable things"
   and becomes "farm points." Every points-based system that became financially
   liquid got gamed within weeks. **Non-transferable points that are only
   redeemable are far healthier**, and they don't need a chain.

**Verdict: architecturally correct, strategically premature.** Design the points
ledger *as if* it will move on-chain — append-only, event-sourced, every mutation
attributable — so the migration is possible later. Don't issue a token now.

---

## 3. Tier B — real value, second wave

- **Product provenance in the marketplace.** A seller claiming "recycled ocean
  plastic, made in Portugal" is unverifiable today; `products` has no claim
  fields at all. On-chain provenance is only meaningful with a trustworthy
  attester upstream (a certifier, a factory audit), so this is really a
  partnerships problem with a chain component. Genuine value for a sustainability
  marketplace, but the chain is the last 10% of the work.

- **Vouching as a public reputation graph.** Falls out of A.2 almost for free
  once impact attestations exist. Makes `impact_vouches` a portable
  web-of-trust rather than a private counter.

- **Escrowed marketplace orders.** Smart-contract escrow releasing on delivery
  confirmation. Real, but Stripe already does escrow well for supported markets;
  this only becomes compelling in the same markets that motivate A.3, and it
  should follow A.3 rather than lead it.

- **Transparent challenge and grant pools.** Sponsored challenges
  (`001_communities_challenges.sql`) where a brand funds a prize pool: on-chain
  escrow means participants can see the money exists and that payout followed
  the stated rules. Modest but real trust value in a category where "sponsored
  sustainability challenge" invites cynicism.

---

## 4. Tier C — would be theatre, and I'd argue against it

Said plainly, because the pressure to do these will be real:

- **Posts, comments, or the social graph on-chain.** Directly incompatible with
  the moderation system just built. Migration 046's whole design is that removal
  must be *reversible* — soft `removed_at` with a restrictive RLS policy — so
  that appeals (043) can restore content and the author can still cite it.
  Immutable posts mean **harassment and doxxing cannot be removed, ever**. This
  isn't a tradeoff; it's a defect. Also unaffordable and unqueryable at feed scale.

- **NFT profile pictures / collectible badges.** Pure decoration, and actively
  corrosive to a sustainability brand — the reputational association with
  speculative JPEGs is a liability, not an asset.

- **A HONUA governance token.** No governance problem currently exists that a
  token solves. It would import a speculative holder base whose interests diverge
  sharply from users doing beach cleanups, and it invites securities scrutiny for
  no product benefit.

- **One NFT per impact log.** Thousands of tokens, no recipient, no market, no
  purpose. Attestations (A.2) achieve the goal at a fraction of the cost and
  complexity.

- **Minting the current "Mint 2026" button as-is.** The button exists, so the
  temptation is to make it real cheaply. But a soulbound token minted against
  `carbon_purchases` rows that were never paid for and have no serial number
  would put a *cryptographic guarantee* around unverified data. **That is
  strictly worse than the honest modal it is today** — it converts a UI mockup
  into a permanent false claim. A.1 must land first, or this must not ship.

---

## 5. Architecture, if any of this proceeds

**The chain is a notary, not a database.** Postgres stays the system of record
for everything: feed, profiles, orders, moderation. The chain holds only what
needs to be portable, permanent, or multi-party. Every on-chain object gets a
mirrored row with a transaction hash, so the app never blocks on an RPC call and
the existing admin console keeps working unchanged.

**Chain choice** — an L2 (Base, Optimism, Arbitrum) or Solana. The deciding
factors are cent-level fees, sub-second finality, and mature stablecoin support.
Ethereum mainnet is disqualified on cost alone at consumer volume.

⚠️ **One point deserves care given the brand:** the energy question. Proof-of-stake
chains post-Merge use a tiny fraction of proof-of-work energy, and an L2
amortises that further — but "we put our carbon platform on a blockchain" will
draw scrutiny, and the answer needs to be a measured number in a published FAQ,
not a defensive paragraph. **Get this right before launch, not after the first
critical article.** For a sustainability platform this is a brand risk, not a
footnote.

**Custody** — Privy embedded wallets, flipped to `createOnLogin: "users-without-wallets"`.
Users keep self-custody without ever seeing a seed phrase. This is already
installed.

**Gas** — fully abstracted. Users must never see a gas fee, hold a native token,
or know which chain they're on. Honua sponsors transactions via a paymaster and
treats it as cost of goods. If the word "gas" appears in the UI, the integration
has failed.

**Keys** — Privy handles recovery, but "I lost access to my verified impact
history" becomes a support category that doesn't exist today. Plan the runbook
before launch.

---

## 6. A sequenced path

| Phase | Work | Unblocks |
|---|---|---|
| **0** | Fix the carbon integrity gaps in `CARBON-CREDITS.md` §7 — server-side pricing, stock guard, real payment, `retired_at` + serial. **Reconcile the on-chain copy with reality in the meantime.** | Everything. On-chain records of unverified data are worse than no chain. |
| **1** | Registry integration (Verra / Gold Standard / Puro). Real serials in `carbon_credits`. | A.1 |
| **2** | Flip Privy embedded wallets on. Silent — no user-visible change. | All of it |
| **3** | On-chain retirement certificates. Replace the "Mint 2026" mockup with the real thing. | A.1 ✅ |
| **4** | Impact attestations + portable score. Publish the schema so partners can read it. | A.2 ✅ |
| **5** | Stablecoin payout rail, one market first (Nigeria is the obvious pilot). | A.3 ✅ |
| **6** | Points ledger rearchitected as append-only and event-sourced — **no token issued**. | A.4, later |

Phase 0 is not optional and is not a blockchain task. **The single most valuable
thing on this page is that a crafted insert can currently retire arbitrary
tonnage for zero dollars.** No chain fixes that; it has to be fixed first, or
everything built on top inherits it.

---

## 7. Risks worth naming

- **Cryptographic certainty around uncertain data.** The chain guarantees a
  record wasn't altered. It guarantees nothing about whether it was true when
  written. Every item above is only as good as its upstream attester.
- **Regulatory** — A.3 and A.4 both touch money transmission and stored value.
  Needs qualified counsel per jurisdiction, before code.
- **Irreversibility vs. moderation.** Honua has an appeals system precisely
  because decisions get reversed. Anything on-chain must be designed as
  append-only-with-corrections, never as a record that can't be superseded.
- **Brand/energy scrutiny** — see §5.
- **Complexity.** Every item adds an RPC dependency, a key-management surface,
  and a new class of support ticket. Three of the four Tier A items are genuinely
  worth that. None of Tier C is.

---

## 8. If you want the short version

**Mindblowing, high conviction:**
1. **On-chain carbon retirement** — fixes a live integrity hole, delivers the
   promise already printed in the UI, and is the textbook use case.
2. **Portable impact attestations** — turns the sustainability score from a
   feature into a standard, which is the actual strategic asset.
3. **Stablecoin payouts** — the boring one that makes money, and the only thing
   that scales seller payouts beyond the countries Stripe serves.

**Right idea, wrong time:** Green Points as a settlement token. Build the ledger
so it *can* migrate; don't issue.

**Don't:** posts on-chain, PFP NFTs, a governance token, per-log NFTs.

**Before any of it:** Phase 0. The carbon purchase path currently trusts the
browser for both price and quantity.
