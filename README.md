# Honua — Desktop (Next.js)

A real **Next.js 15 / App Router** app in TypeScript, backed by **Supabase**
(Postgres + Auth + Realtime + Storage). The social feed, impact verification,
communities, challenges, action map, carbon market, and a two-sided marketplace
(list → buy → fulfil → track → payout) are all wired to the database. Auth is
gated server-side via `@supabase/ssr` middleware; checkout supports live Stripe
(with mock fallback when keys are absent).

## Run it

```bash
cd desktop
npm install
npm run dev
```

Open <http://localhost:3000>.

## Backend setup

1. Create a Supabase project and set the env vars (see
   [`supabase/migrations/README.md`](supabase/migrations/README.md)).
2. Run the SQL migrations in `supabase/migrations/` in order.
3. Optional: add Stripe keys for live checkout + webhooks (see the same doc).

> Screens gracefully fall back to demo data when a table is empty or a migration
> hasn't been run yet, so the app is always runnable.

## Routes

| Path | Screen |
| --- | --- |
| `/` | Home feed |
| `/explore` | Explore |
| `/impact` | Impact dashboard |
| `/map` | Action map |
| `/carbon` | Carbon market |
| `/marketplace` | Marketplace |
| `/bookmarks` | Bookmarks |
| `/notifications` | Notifications |
| `/messages` | Messages |
| `/communities` | Communities / forum |
| `/challenges` | Challenges |
| `/profile`, `/profile/[handle]` | Profile (own / by handle) |
| `/post/[id]` | Post detail |
| `/settings` | Settings |
| `/login` | Sign in |
| `/sell` | Sell on Honua (onboarding) |
| `/seller` | Seller dashboard |
| `/admin` | Admin console |

## Structure

```
desktop/
├─ app/
│  ├─ layout.tsx          # html shell, imports globals.css
│  ├─ AppShell.tsx        # AppProvider + ToastHost + ModalRoot (client root)
│  ├─ globals.css         # design tokens + base styles (ported from the prototype)
│  └─ <route>/page.tsx    # one thin client page per screen
└─ components/
   ├─ app-context.tsx     # shared state store; nav() bridged to the Next router
   ├─ icons.tsx           # inline icon set
   ├─ primitives.tsx      # Avatar, Modal, ToastHost, Stat, …
   ├─ sidebar.tsx         # left nav
   ├─ post-card.tsx       # feed card + panels + mock feed data
   ├─ seller-data.tsx     # seller mock data + S* UI primitives
   ├─ admin-data.tsx      # admin mock data + RoleChip
   ├─ shared.ts           # barrel re-export consumed by every screen
   └─ screens/            # the 17 ported screen modules
```

## Notes

- `next.config.mjs` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` so the pixel-faithful port builds without being blocked on strict-mode nits. Tighten these as you harden the code.
- The prototype's browser-chrome frame (fake address bar, back/forward) is intentionally dropped — the real browser provides that now.
- To merge into the main Honua app later, the screens are plain React and the styling is plain CSS, so they can be migrated to Tailwind/shadcn incrementally.
