import { NextResponse } from "next/server";
import { readPlatform } from "@/lib/platform-server";

// The public half of platform_settings: whether sign-up is open and whether the
// site is in maintenance, plus whatever notice an admin wrote to go with each.
//
// Unauthenticated on purpose. Both are things a visitor is about to find out by
// trying, and finding out by trying means filling in a sign-up form to be told
// by a database trigger, at the end, that sign-ups are closed. None of the
// audit columns — who changed it, when, the alert address — are in the response.
//
// The middleware enforces maintenance mode on its own; this route exists so the
// sign-up form can explain the closed door before someone fills it in.

export const runtime = 'nodejs';

export async function GET() {
  const platform = await readPlatform();
  return NextResponse.json(platform, {
    // Short, and matching the server-side cache in lib/platform-server.ts.
    // A stale "sign-ups are open" that lasts a minute would be a form that
    // fails on submit, which is the exact experience this is here to avoid.
    headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' },
  });
}
