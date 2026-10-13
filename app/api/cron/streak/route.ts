import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  decideStreakNotice, streakNoticeBody, zonedNow,
  RISK_WINDOW_START_HOUR, ENDED_WINDOW_END_HOUR,
} from "@/lib/streak";

// Hourly job that sends the two streak notifications (migration 028). It is
// scheduled by .github/workflows/streak-notices.yml, not Vercel Cron: the Hobby
// plan only allows daily crons.
//
// Hourly rather than daily because the send windows are in each user's local
// time — across all zones there is some user in their evening every hour of the
// UTC day. Each run only touches users whose local clock currently sits inside
// a window, and impact_streak_notices makes a second run in the same window a
// no-op.
//
// Service role, so it can insert notifications for users it isn't acting as.
// Guarded by CRON_SECRET, sent as `Authorization: Bearer …` by the workflow.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Only users who logged something in this window can have a live streak worth
// warning about, so this bounds the scan instead of walking every profile.
const LOOKBACK_DAYS = 400;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Refuse to run unguarded — an open endpoint here could be used to spam
  // every user's notification feed.
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  return header.replace(/^Bearer\s+/i, '').trim() === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: process.env.CRON_SECRET ? 'Unauthorized' : 'CRON_SECRET is not configured on the server' },
      { status: process.env.CRON_SECRET ? 401 : 503 },
    );
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' }, { status: 503 });

  const now = new Date();

  // Which zones are inside a window right now? Checking the zone list first
  // means the log scan can skip everyone who isn't a candidate.
  const first = await db.from('profiles').select('id, timezone');
  let profiles: { id: string; timezone?: string | null }[] | null = first.data;
  if (first.error) {
    // Migration 028 not run yet — still send, treating everyone as UTC, rather
    // than going dark until someone remembers to migrate.
    const retry = await db.from('profiles').select('id');
    if (retry.error) return NextResponse.json({ error: first.error.message }, { status: 500 });
    profiles = retry.data;
  }

  const candidates = (profiles ?? []).filter((p: any) => {
    const { hour } = zonedNow(now, p.timezone);
    return hour < ENDED_WINDOW_END_HOUR || hour >= RISK_WINDOW_START_HOUR;
  });
  if (!candidates.length) return NextResponse.json({ ok: true, considered: 0, sent: 0 });

  const ids = candidates.map((p: any) => p.id);
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const { data: logs, error: logErr } = await db
    .from('impact_logs')
    .select('user_id, logged_at')
    .in('user_id', ids)
    .gte('logged_at', since);
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  // Bucket each log into the day it happened *in that user's zone* — the same
  // basis the streak counter on screen uses.
  const daysByUser = new Map<string, Set<string>>();
  const tzById = new Map<string, string | null>(candidates.map((p: any) => [p.id, p.timezone ?? null]));
  for (const l of logs ?? []) {
    if (!l.logged_at) continue;
    const { day } = zonedNow(new Date(l.logged_at), tzById.get(l.user_id));
    let set = daysByUser.get(l.user_id);
    if (!set) { set = new Set(); daysByUser.set(l.user_id, set); }
    set.add(day);
  }

  let sent = 0;
  const failures: string[] = [];

  for (const p of candidates) {
    const decision = decideStreakNotice(daysByUser.get(p.id) ?? new Set(), now, p.timezone);
    if (!decision) continue;

    // Claim the send first. The primary key on (user_id, kind, for_day) is what
    // makes a repeat run in the same window a no-op — if this insert conflicts,
    // someone already sent it and we must not send a second notification.
    const { error: claimErr } = await db
      .from('impact_streak_notices')
      .insert({ user_id: p.id, kind: decision.kind, for_day: decision.forDay });
    if (claimErr) {
      // 23505 = unique violation = already sent, the normal case on a repeat run.
      if (claimErr.code === '23505') continue;
      // 42P01 = the table doesn't exist. Without it there's no dedupe, so every
      // hourly run would re-send; stop rather than spam.
      if (claimErr.code === '42P01') {
        return NextResponse.json({
          error: 'impact_streak_notices is missing — run supabase/migrations/028_streak_notifications.sql',
        }, { status: 503 });
      }
      failures.push(`${p.id}: ${claimErr.message}`);
      continue;
    }

    const { error: notifErr } = await db.from('notifications').insert({
      user_id: p.id,
      actor_id: null,
      type: decision.kind,
      body: streakNoticeBody(decision.kind, decision.streak),
    });
    if (notifErr) {
      // Release the claim so the next run can retry rather than silently
      // swallowing the notification for good.
      await db.from('impact_streak_notices').delete()
        .match({ user_id: p.id, kind: decision.kind, for_day: decision.forDay });
      failures.push(`${p.id}: ${notifErr.message}`);
      continue;
    }
    sent++;
  }

  return NextResponse.json({
    ok: failures.length === 0,
    considered: candidates.length,
    sent,
    ...(failures.length ? { failures } : {}),
  });
}
