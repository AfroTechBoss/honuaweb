# The Impact System — how logging, CO₂, Green Points & verification work

This document explains the mechanics behind Honua's impact features: what happens
when you log an action, how CO₂ (kg) and Green Points (GP) are calculated, how
the impact score, streaks and levels are derived, and how the **community
verification loop** turns a self-reported action into "verified impact."

It reflects exactly what the code does today (not a roadmap). Where a number is
an estimate or a value is display-only, it says so.

---

## 1. The core idea

Most "green" apps let you claim impact with no accountability. Honua's angle is a
**verification loop**: you log a real action → optionally attach a proof photo and
share it to the feed → the **community vouches** for it → once enough people vouch,
it becomes **verified impact** that counts toward your public score and surfaces in
the "Verified impact" feed.

So there are two tiers of impact:
- **Logged** — self-reported. Earns Green Points and counts toward your personal
  CO₂ ledger immediately.
- **Verified** — confirmed by 3 community members. This is the trustworthy tier
  and is what the platform highlights.

---

## 2. Where the numbers come from

Every action belongs to a **category**. Each category has a fixed **CO₂ estimate
(kg)** and a **Green Points (GP)** reward. This lookup table is the single source
of truth (`lib/impact.ts` → `ACTION_IMPACTS`):

| Category   | CO₂ saved (kg) | Green Points | Notes |
|------------|:--------------:|:------------:|-------|
| Transport  | 2.4            | 24           | e.g. biking instead of driving |
| Food       | 1.5            | 15           | e.g. a meatless meal |
| Energy     | 1.2            | 20           | e.g. cutting usage |
| Waste      | 0.8            | 18           | e.g. composting |
| Lifestyle  | 0.6            | 12           | general sustainable choices |
| Ocean      | 0.5            | 15           | e.g. beach cleanup |
| Policy     | 0.0            | 20           | advocacy — **no CO₂**, still earns GP |
| Education  | 0.0            | 10           | learning — **no CO₂**, still earns GP |
| General    | 0.5            | 10           | fallback |

Two design choices to note:
- **CO₂ values are category estimates, not measured.** They're deliberate
  averages so the ledger is meaningful without asking users for exact figures.
  They're easy to tune in one place (see §10).
- **Some categories earn GP but 0 kg CO₂** (Policy, Education). Advocacy and
  learning matter, but they don't directly avoid emissions — so they're rewarded
  with points, not carbon.

There's also a **daily-task grid** with named tasks (`TASK_IMPACTS`) that map to
the same model, e.g. `Bike commute → 2.4 kg / 24 GP (Transport)`,
`10 min education → 0 kg / 50 GP (Education)`.

---

## 3. What happens when you log an action

Entry point: the **"Log an action"** modal (`MLogAction`) → `createImpactAction()`
in `lib/impact.ts`. Steps:

1. You pick a **category**, describe what you did, optionally **attach a proof
   photo**, and choose whether to **share it to the feed** (on by default).
2. If a photo is attached, it's uploaded to storage; its URL becomes `proof_url`.
3. If "share to feed" is on, a **feed post** is created first (so the log can link
   to it). Importantly, that post starts with **`co2_saved_kg = 0`** — it does
   *not* count as verified impact yet.
4. A row is inserted into **`impact_logs`** with:
   - `category`, `co2_saved_kg`, `points` (from the table above)
   - `proof_url`, `post_id` (link to the feed post), `description`
   - `status`: `'pending'` if it has proof or a post, otherwise `'unverified'`

### The immediate effect (DB trigger)
On every `impact_logs` INSERT, a Postgres trigger
(`handle_impact_log_insert`, migration `002`) updates your **profile** atomically:

```
profiles.impact_score += points          -- cumulative Green Points
profiles.total_co2_kg += co2_saved_kg     -- cumulative CO₂ ledger
profiles.verified = true  (once total_co2_kg >= 500 kg)
```

So logging is instant: your points and CO₂ ledger move the moment you log,
**before** any verification.

---

## 4. Green Points (GP) — the reward currency

- **What they are:** points you earn for logging actions. They power your **impact
  score**, your **level**, and the leaderboard/"people to follow" ranking.
- **How earned:** the fixed GP per category (§2). One log = that category's GP.
- **Stored as:** `profiles.impact_score` (cumulative, updated by the trigger).
  The dashboard's "Green points" KPI sums `points` across your logs.

### Impact Level
Derived purely from total GP (`components/screens/impact.tsx`):

```
level = floor(totalGP / 200) + 1
progress to next = totalGP mod 200  (out of 200)
```

So every **200 GP = 1 level**. Level 1 is 0–199 GP, level 2 is 200–399, etc.

---

## 5. CO₂ (kg) — the impact ledger

- **What it is:** the running total of estimated CO₂ you've helped avoid, in kg.
- **How computed:** sum of `co2_saved_kg` across your logs (category estimates).
- **Stored as:** `profiles.total_co2_kg` (cumulative, via the trigger). The
  dashboard also recomputes it from your logs for display.
- **Display flourishes** (`impact.tsx`):
  - Shows in **kg** under 1000, **tonnes** at/above 1000.
  - "Car off the road for X weeks" = `total_co2_kg / 400` (a rough equivalence
    for a typical car's weekly emissions).

### The "verified" profile badge
The trigger flips `profiles.verified = true` once **`total_co2_kg >= 500 kg`**.
This is a lightweight auto-badge based on volume of logged impact. It's separate
from — and coarser than — the per-action community verification in §6. (The
dashboard also treats a user as verified if `total_co2_kg >= 500`.)

---

## 6. The verification loop (the important part)

An individual log moves through three states (`impact_logs.status`):

```
unverified  →  pending  →  verified
```

- **unverified** — logged with no proof and not shared. Counts toward your
  personal GP/CO₂, but can't be community-verified.
- **pending** — has a proof photo and/or was shared to the feed, so the community
  *can* vouch for it. Awaiting vouches.
- **verified** — reached the vouch threshold.

### Vouching
When an action is shared to the feed, its post shows an **ImpactVouchBar**:
`2.4 kg CO₂ · Transport — 1/3 VOUCHES TO VERIFY` with a **Vouch** button.

- Anyone **except the author** can vouch (enforced by row-level security — you
  physically cannot vouch for your own log).
- Each vouch is a row in **`impact_vouches`**.
- The threshold is **3 vouches** (`VOUCH_THRESHOLD`).

### What verification unlocks (DB trigger)
On every `impact_vouches` insert/delete, the trigger `handle_impact_vouch`
(migration `018`) recounts and:

- At **≥ 3 vouches** → sets the log `status = 'verified'`, `verified = true`, and
  **grants the linked feed post its `co2_saved_kg`** (the value that was 0 until
  now). Because the home feed's **"Verified impact" tab** filters on
  `co2_saved_kg > 0`, the post now organically appears there.
- If vouches later drop **below 3** → demotes back to `pending` and resets the
  post's `co2_saved_kg` to 0 (so un-vouching removes it from the verified feed).

So verification is a **community consensus** mechanism, not an oracle or
third-party audit. Three humans confirming is the trust signal.

The impact dashboard reflects this split: the CO₂ KPI shows
**"community-verified"** vs **"pending"** kg, and each recent log carries a
`✓ verified` or `n/3 vouches` chip.

---

## 7. Streaks

`computeStreak()` counts **consecutive days** (ending today) on which you logged
at least one action. Any gap ends the streak.

- The dashboard shows the current streak and a "days to 2×" hint.
- **Note:** the "2× point multiplier at 30 days" is currently **displayed as a
  goal but not yet applied** to point calculations — points come straight from
  the category table regardless of streak. It's a visible incentive hook, not an
  active multiplier. (Easy to wire up later; see §10.)

---

## 8. Data model summary

| Table / column | Purpose |
|---|---|
| `impact_logs` | one row per logged action |
| `impact_logs.co2_saved_kg`, `.points` | the category's CO₂ + GP for this log |
| `impact_logs.status`, `.vouch_count` | verification state (unverified/pending/verified) |
| `impact_logs.proof_url`, `.post_id`, `.description` | proof photo, linked feed post, note |
| `impact_vouches` | one row per community vouch (log_id, user_id) |
| `profiles.impact_score` | cumulative Green Points |
| `profiles.total_co2_kg` | cumulative CO₂ ledger (kg) |
| `profiles.verified` | auto-badge at 500 kg total, or per-action verification |
| `posts.co2_saved_kg` | 0 until the linked log is verified; then the category value → enters the Verified feed |

Triggers: `handle_impact_log_insert` (migration 002) updates profile totals on
log; `handle_impact_vouch` (migration 018) handles the vouch → verified transition.

---

## 9. End-to-end example

1. You bike to work and open **Log an action** → **Transport**, add a photo of
   your bike, keep "share to feed" on.
2. Instantly: `+24 GP` and `+2.4 kg` land on your profile (trigger). A feed post
   appears with a vouch bar reading **0/3**. The post's `co2_saved_kg` is 0 for now.
3. Three colleagues who saw you bike hit **Vouch**.
4. On the 3rd vouch: your log flips to **verified**, the post gains its **2.4 kg**,
   and it shows up in the **"Verified impact"** feed. Your dashboard moves that
   2.4 kg from "pending" to "community-verified."

---

## 10. Tuning / where it lives

Everything is intentionally centralised so the economy is easy to adjust:

- **CO₂ + GP per category:** `lib/impact.ts` → `ACTION_IMPACTS` (and
  `TASK_IMPACTS` for the daily-task grid).
- **Vouches required to verify:** `lib/impact.ts` → `VOUCH_THRESHOLD` (3) and the
  matching `>= 3` checks in migration `018`'s trigger (change both).
- **Auto-verify CO₂ threshold (500 kg):** migration `002`'s trigger.
- **GP per level (200):** the level formula in `components/screens/impact.tsx`.
- **Streak multiplier:** not yet applied — to activate it, multiply `points` in
  `createImpactAction` when `computeStreak(...) >= 30`.
- **Verification UI:** `components/impact-vouch.tsx` (the vouch bar + hook),
  rendered by the home feed, profile timeline, and post detail.
- **Dashboard:** `components/screens/impact.tsx`.

### Honest caveats
- CO₂ figures are **category estimates**, not measured emissions.
- The profile "verified" badge at 500 kg is a **volume-based auto-grant**,
  distinct from per-action community verification.
- The 30-day **2× streak multiplier is display-only** right now.
- Verification is **community vouching (3 people)** — a social trust signal, not a
  third-party/oracle audit.
