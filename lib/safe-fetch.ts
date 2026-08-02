import dns from "node:dns/promises";
import net from "node:net";

// Fetching a URL a stranger handed you is server-side request forgery unless
// something stops it. The server sits inside a network the caller can't reach
// on their own — cloud metadata endpoints, internal services, anything bound to
// loopback — and a plain fetch() turns it into a proxy into all of that. Even
// when the response body is discarded, the *shape* of the failure (timeout vs
// refused vs 200) is enough to map a private network from outside.
//
// So every hostname is resolved first, and every address it resolves to has to
// be public before a single byte goes out. Redirects are followed by hand for
// the same reason: a public URL that 302s to 169.254.169.254 defeats a check
// that only ever looked at the URL it was given.
//
// Node runtime only — it needs a real DNS resolver.

const MAX_REDIRECTS = 3;

function ipv4Blocked(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 ||                              // 0.0.0.0/8       this network
    a === 10 ||                             // 10/8            private
    a === 127 ||                            // 127/8           loopback
    (a === 100 && b >= 64 && b <= 127) ||   // 100.64/10       carrier NAT
    (a === 169 && b === 254) ||             // 169.254/16      link-local — cloud metadata lives here
    (a === 172 && b >= 16 && b <= 31) ||    // 172.16/12       private
    (a === 192 && b === 0) ||               // 192.0.0/24      IETF protocol assignments
    (a === 192 && b === 168) ||             // 192.168/16      private
    (a === 198 && (b === 18 || b === 19)) ||// 198.18/15       benchmarking
    a >= 224                                // 224/4 multicast, 240/4 reserved
  );
}

function ipv6Blocked(ip: string): boolean {
  const s = ip.toLowerCase().split("%")[0];               // strip zone index
  if (s === "::1" || s === "::") return true;             // loopback, unspecified
  // ::ffff:a.b.c.d — an IPv4 address wearing a v6 costume. Judge the v4.
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Blocked(mapped[1]);
  const head = parseInt(s.split(":")[0] || "0", 16);
  if ((head & 0xfe00) === 0xfc00) return true;            // fc00::/7  unique local
  if ((head & 0xffc0) === 0xfe80) return true;            // fe80::/10 link-local
  return false;
}

function addressBlocked(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) return ipv4Blocked(ip);
  if (v === 6) return ipv6Blocked(ip);
  return true; // not an address we can reason about — refuse
}

// `{ value?, why? }` rather than a discriminated union on `ok`: this project
// compiles with strict: false, where TypeScript won't narrow a boolean
// discriminant. Matches the { data?, error? } shape used elsewhere in lib/.
type Verdict = { url?: URL; why?: string };

async function vet(raw: string): Promise<Verdict> {
  let url: URL;
  try { url = new URL(raw); } catch { return { why: "not a URL" }; }

  // file:, data:, gopher: and friends have no business here.
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { why: "only http and https" };
  }
  // Credentials in the URL are a redirect-laundering trick more often than a
  // real request, and nothing legitimate here needs them.
  if (url.username || url.password) return { why: "credentials in URL" };

  const host = url.hostname.replace(/^\[|\]$/g, "");

  // A literal address skips DNS entirely — check it directly.
  if (net.isIP(host)) {
    return addressBlocked(host) ? { why: "address is not public" } : { url };
  }

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    return { why: "host does not resolve" };
  }
  if (!addresses.length) return { why: "host does not resolve" };

  // Every answer has to be public, not just the first. A hostname that resolves
  // to one public and one private address would otherwise be a coin flip.
  if (addresses.some(a => addressBlocked(a.address))) {
    return { why: "host resolves to a private address" };
  }
  return { url };
}

export type SafeFetchResult = { response?: Response; url?: string; why?: string };

/**
 * fetch() for URLs that came from outside. Vets the target, follows redirects
 * by hand re-vetting each hop, and gives up quickly.
 *
 * There is still a DNS-rebinding gap between the lookup here and the connect
 * inside fetch(): a record with a one-second TTL can answer public for us and
 * private for the socket. Closing it properly means dialling the vetted IP
 * ourselves with a custom agent and carrying the Host header. Not worth the
 * machinery for link previews — but it is why this must not become the
 * foundation for anything that fetches on a user's behalf with real authority.
 */
export async function safeFetch(raw: string, init?: RequestInit & { timeoutMs?: number }): Promise<SafeFetchResult> {
  const timeoutMs = init?.timeoutMs ?? 5000;
  let target = raw;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const { url, why } = await vet(target);
    if (!url) return { why: why ?? "refused" };

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        redirect: "manual",              // re-vet every hop ourselves
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return { why: "could not be reached" };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { why: "redirect without a target" };
      target = new URL(location, url).href;
      continue;
    }

    return { response, url: url.href };
  }

  return { why: "too many redirects" };
}
