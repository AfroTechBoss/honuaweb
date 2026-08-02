// First-party pageview collection.
//
// The Analytics section of the admin console showed 84.2K page views, a 4m 38s
// average session, and a traffic curve. None of it came from anywhere — the app
// has never measured a pageview. This is the collection that has to exist
// before any of those numbers can be real.
//
// What it stores, in full:
//
//   visitor_id  a random string in localStorage. Not an account, not a
//               fingerprint, not derived from anything about the device. Its
//               only job is to answer "did this browser come back", which is
//               what retention means.
//   session_id  a random string in sessionStorage, so it dies with the tab.
//   path        the route, normalised server-side — no query string, ids
//               collapsed to ":id".
//   source      the referrer bucketed to one of four words, also server-side.
//
// No account id, no IP beyond what the rate limiter needs to count, no raw
// referring URL, no cookies. Do Not Track is honoured, which means the figures
// are a floor rather than a census — worth remembering before reading them as
// exact.

const VISITOR_KEY = 'honua.vid';
const SESSION_KEY = 'honua.sid';
const REFERRER_KEY = 'honua.ref';

// The console has its own numbers and shouldn't appear in the traffic it
// reports on; password recovery URLs carry tokens we have no reason to touch.
const SKIP = ['/admin', '/reset-password'];

function id(): string {
  // crypto.randomUUID isn't universal on older mobile Safari, and this doesn't
  // need to be a UUID — it needs to be unguessable enough not to collide.
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function stored(store: Storage, key: string): string {
  const existing = store.getItem(key);
  if (existing) return existing;
  const fresh = id();
  store.setItem(key, fresh);
  return fresh;
}

/**
 * The referrer that opened this tab, pinned for the life of the session.
 *
 * It has to be captured the first time the session is seen and then reused.
 * Once the app takes over routing, document.referrer becomes our own pages, so
 * reading it live would file every visit after the first under "referral" and
 * make Direct look like a rounding error.
 */
function sessionReferrer(fresh: boolean): string {
  if (fresh) {
    sessionStorage.setItem(REFERRER_KEY, document.referrer || '');
    return document.referrer || '';
  }
  return sessionStorage.getItem(REFERRER_KEY) ?? '';
}

function optedOut(): boolean {
  // Three spellings because the header outlived the standard: Navigator.doNotTrack
  // is current, msDoNotTrack was IE, window.doNotTrack was old Firefox.
  const nav = navigator as any;
  return nav.doNotTrack === '1' || nav.doNotTrack === 'yes'
    || nav.msDoNotTrack === '1' || (window as any).doNotTrack === '1';
}

/**
 * Records one pageview. Never throws and never blocks — a failure here must
 * cost the page nothing, because nothing on the page depends on it.
 */
export function trackPageview(path: string) {
  if (typeof window === 'undefined') return;
  if (SKIP.some(p => path.startsWith(p))) return;

  try {
    if (optedOut()) return;

    const isNewSession = !sessionStorage.getItem(SESSION_KEY);
    const body = JSON.stringify({
      path,
      visitorId: stored(localStorage, VISITOR_KEY),
      sessionId: stored(sessionStorage, SESSION_KEY),
      referrer: sessionReferrer(isNewSession),
    });

    // keepalive lets the request outlive the page, so the last view before
    // someone navigates away still lands.
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Private-mode Safari throws on storage access. Losing a pageview is the
    // correct outcome; breaking the page is not.
  }
}
