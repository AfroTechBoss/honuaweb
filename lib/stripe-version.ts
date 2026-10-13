import type Stripe from 'stripe';

// The Stripe API version every client in this app is written against.
//
// The SDK types `apiVersion` as the single version that SDK release ships
// with, so a bare string literal stops compiling the moment a newer `stripe`
// is installed (Vercel's build failed this way). The cast keeps the build
// independent of the installed SDK; the version we actually call stays pinned.
export const STRIPE_API_VERSION = '2026-06-24.dahlia' as Stripe.LatestApiVersion;
