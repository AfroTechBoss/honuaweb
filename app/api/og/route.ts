import { NextRequest, NextResponse } from 'next/server';
import { safeFetch } from '@/lib/safe-fetch';
import { enforce } from '@/lib/rate-limit';
import { logError, logWarn } from '@/lib/observability';

// Link previews. The only endpoint on the app that is both unauthenticated and
// makes an outbound request to an address the caller chooses, which is two of
// the three ingredients for an open proxy — safeFetch supplies the third by
// refusing anything that resolves inside the network.
//
// Rate limited on top of that: without a ceiling this is free bandwidth and a
// free source IP for anyone who finds it, and the cost lands on our bill.

export const runtime = 'nodejs'; // safeFetch needs a real DNS resolver

// A preview needs the <head>. Nothing below the first 256KB has ever been an
// og: tag, and reading an unbounded body into memory is its own denial of
// service — a 2GB response would take the function down with no attack beyond
// pointing it at a large file.
const MAX_BYTES = 256 * 1024;

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  // Stop the transfer rather than politely draining a file that may not end.
  reader.cancel().catch(() => {});

  const size = Math.min(total, MAX_BYTES);
  const body = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    if (at >= size) break;
    const take = Math.min(chunk.length, size - at);
    body.set(chunk.subarray(0, take), at);
    at += take;
  }
  return new TextDecoder().decode(body);
}

export async function GET(req: NextRequest) {
  const limited = enforce(req, { name: 'og', limit: 30, windowMs: 60_000 },
    'Too many link previews — try again in a minute.');
  if (limited) return limited;

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'no url' }, { status: 400 });

  const result = await safeFetch(url, {
    headers: { 'User-Agent': 'Honuabot/1.0 (+https://honua.earth)' },
    timeoutMs: 5000,
  });

  // The reason is deliberately vague to the caller. "resolves to a private
  // address" confirms an internal host exists, which is the answer a scan is
  // fishing for; server-side it's worth having, so it's logged.
  if (!result.response) {
    // Worth watching: a run of these against private addresses is somebody
    // probing the network, not a user pasting a bad link.
    logWarn('api/og', 'refused', { url, why: result.why });
    return NextResponse.json({ error: 'failed' }, { status: 400 });
  }

  try {
    const html = await readCapped(result.response);

    const meta = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"'<>]+)["']`, 'i'))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']og:${prop}["']`, 'i'))?.[1] ??
      null;

    const title =
      meta('title') ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      null;
    const description = meta('description');
    const rawImage = meta('image');
    // Resolve relative or protocol-relative image URLs against the URL we
    // actually landed on, which may differ from the one asked for.
    const image = rawImage
      ? rawImage.startsWith('//') ? `https:${rawImage}`
        : rawImage.startsWith('http') ? rawImage
        : new URL(rawImage, result.url).href
      : null;
    const siteName = meta('site_name') ?? new URL(result.url).hostname.replace(/^www\./, '');

    return NextResponse.json({ title, description, image, siteName, url: result.url });
  } catch (err: any) {
    logError('api/og', 'parse failed', err, { url });
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
