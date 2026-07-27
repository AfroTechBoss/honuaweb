import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'no url' }, { status: 400 });
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Honuabot/1.0 (+https://honua.earth)' },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();

    const meta = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"'<>]+)["']`, 'i'))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']og:${prop}["']`, 'i'))?.[1] ??
      null;

    const title =
      meta('title') ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      null;
    const description = meta('description');
    const image = meta('image');
    const siteName = meta('site_name') ?? new URL(url).hostname.replace(/^www\./, '');

    return NextResponse.json({ title, description, image, siteName, url });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
