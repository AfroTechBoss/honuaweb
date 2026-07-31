// Server-only verification of the Privy access token that gates the admin console.
//
// The admin panel signs in through Privy, not Supabase, so an admin's browser
// holds no Supabase session and `auth.uid()` is null inside RLS. Admin writes
// therefore have to go through a server route using the service-role key — and
// that route needs to prove the caller really is an allowlisted admin before it
// bypasses RLS on their behalf. This does that proof.
//
// Privy signs access tokens ES256 and publishes the public keys as a JWKS, so
// verification needs no extra dependency: WebCrypto can check the signature.
// Who is allowed in is still controlled entirely in the Privy dashboard
// (App Settings → Users → Allowlist) — a valid token means an allowlisted admin.

const JWKS_TTL_MS = 10 * 60 * 1000;

let jwksCache: { keys: any[]; fetchedAt: number } | null = null;

function fromB64Url(part: string) {
  const pad = part.length % 4 === 0 ? '' : '='.repeat(4 - (part.length % 4));
  // Copied into its own ArrayBuffer — a Buffer view over the shared pool isn't
  // a BufferSource WebCrypto will take.
  const decoded = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);
  return bytes;
}

async function fetchJwks(appId: string): Promise<any[]> {
  const res = await fetch(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`, { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json();
  return Array.isArray(body?.keys) ? body.keys : [];
}

// Cached by kid. A miss forces one refetch — Privy rotates keys, and a stale
// cache must not lock every admin out until the process restarts.
async function keyFor(appId: string, kid: string): Promise<any | null> {
  const fresh = jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS;
  if (fresh) {
    const hit = jwksCache!.keys.find(k => k.kid === kid);
    if (hit) return hit;
  }
  const keys = await fetchJwks(appId);
  if (keys.length) jwksCache = { keys, fetchedAt: Date.now() };
  return keys.find(k => k.kid === kid) ?? null;
}

/** Returns the Privy user id when the token is genuine and unexpired, else null. */
export async function verifyPrivyToken(token: string | null | undefined): Promise<{ userId: string } | null> {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!token || !appId) return null;

  const [rawHeader, rawPayload, rawSig] = token.split('.');
  if (!rawHeader || !rawPayload || !rawSig) return null;

  const text = new TextDecoder();
  let header: any, payload: any;
  try {
    header = JSON.parse(text.decode(fromB64Url(rawHeader)));
    payload = JSON.parse(text.decode(fromB64Url(rawPayload)));
  } catch { return null; }

  // Pin the algorithm: accepting whatever `alg` claims is how "alg: none" gets in.
  if (header?.alg !== 'ES256' || !header?.kid) return null;
  if (payload?.iss !== 'privy.io' || payload?.aud !== appId) return null;
  if (typeof payload?.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null;

  const jwk = await keyFor(appId, header.kid);
  if (!jwk) return null;

  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      fromB64Url(rawSig),
      new TextEncoder().encode(`${rawHeader}.${rawPayload}`),
    );
    if (!ok) return null;
  } catch { return null; }

  return { userId: String(payload.sub ?? '') };
}
