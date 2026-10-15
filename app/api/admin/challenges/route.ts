import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-role";
import { isMissingColumn } from "@/lib/pg-errors";
import { requestId, failure } from "@/lib/observability";

// Challenge management for the console.
//
// GET                                                       active + pending
// POST  { title, description, category, days, rewardPoints, requiredLogs }  publish one
// PATCH { id, action: 'approve' | 'reject' | 'archive' | 'update', rewardPoints?, requiredLogs?, reason? }
//
// The console used to do all of this with the browser client, and RLS (003)
// only lets the service role update a challenge or insert an active one — so
// approve, reject, archive and create all failed without saying so. It matters
// more now: since 056 a challenge's reward_points are paid out on completion,
// and the database ignores that column from any browser write. This route is
// the only way to set it.
//
// Gated on `challenges.manage` (owner and admin): setting a reward is minting
// points, which sits with payouts rather than with moderation.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/056_challenge_rewards.sql';
const CATEGORIES = new Set(['Energy', 'Transport', 'Food', 'Waste', 'Nature', 'Lifestyle']);
const MAX_REWARD = 2000;

const str = (v: any, max = 400) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const int = (v: any) => (typeof v === 'number' || typeof v === 'string') && v !== '' && Number.isFinite(Number(v)) ? Math.round(Number(v)) : null;

// Reward text is derived from the number so the two can't disagree.
const rewardText = (points: number) => points > 0 ? `${points} GP` : null;

// Returns an error message, or the cleaned values.
function rewardFields(body: any, days: number): { error: string } | { reward_points: number; required_logs: number | null } {
  const points = int(body?.rewardPoints) ?? 0;
  if (points < 0 || points > MAX_REWARD) return { error: `Reward must be between 0 and ${MAX_REWARD} GP.` };
  const req = body?.requiredLogs == null || body?.requiredLogs === '' ? null : int(body.requiredLogs);
  if (req != null && (req < 1 || req > days)) return { error: `Days to log must be between 1 and ${days}.` };
  // Equal to the duration means "every day", which is what NULL already says.
  return { reward_points: points, required_logs: req === days ? null : req };
}

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-challenges', limit: 60, permission: 'challenges.manage' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const { data, error } = await ctx.db
      .from('challenges')
      .select('*')
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    return NextResponse.json({
      active: rows.filter((c: any) => c.status === 'active').sort((a: any, b: any) => (b.participant_count ?? 0) - (a.participant_count ?? 0)),
      pending: rows.filter((c: any) => c.status === 'pending'),
      // Without 056 the columns are absent and rewards can't be set.
      rewardsAvailable: rows.length === 0 || 'reward_points' in rows[0],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/challenges', err, id, 'Could not load challenges.');
  }
}

export async function POST(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-challenges-write', limit: 30, permission: 'challenges.manage' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const title = str(body?.title, 120);
    if (!title) return NextResponse.json({ error: 'Give the challenge a title.' }, { status: 400 });
    const category = CATEGORIES.has(body?.category) ? body.category : 'Lifestyle';
    const days = int(body?.days) ?? 30;
    if (days < 1 || days > 365) return NextResponse.json({ error: 'Duration must be 1–365 days.' }, { status: 400 });
    const reward = rewardFields(body, days);
    if ('error' in reward) return NextResponse.json({ error: reward.error }, { status: 400 });

    const { data, error } = await ctx.db.from('challenges').insert({
      title,
      description: str(body?.description, 1000) || null,
      category,
      days,
      reward: rewardText(reward.reward_points),
      ...reward,
      status: 'active',
    }).select().single();
    if (error) {
      if (isMissingColumn(error)) return NextResponse.json({ error: `Rewards are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      throw error;
    }
    return NextResponse.json({ challenge: data });
  } catch (err) {
    return failure('admin/challenges', err, id, 'Could not create the challenge.');
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-challenges-write', limit: 60, permission: 'challenges.manage' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const challengeId = str(body?.id, 40);
    const action = str(body?.action, 20);
    if (!challengeId) return NextResponse.json({ error: 'Which challenge?' }, { status: 400 });

    const { data: current, error: readErr } = await ctx.db.from('challenges').select('id, days, status').eq('id', challengeId).maybeSingle();
    if (readErr) throw readErr;
    if (!current) return NextResponse.json({ error: 'That challenge no longer exists.' }, { status: 404 });

    let patch: Record<string, any>;
    if (action === 'approve' || action === 'update') {
      if (action === 'approve' && current.status !== 'pending') {
        return NextResponse.json({ error: 'Only a pending challenge can be approved.' }, { status: 409 });
      }
      const reward = rewardFields(body, current.days);
      if ('error' in reward) return NextResponse.json({ error: reward.error }, { status: 400 });
      patch = { ...reward, reward: rewardText(reward.reward_points), ...(action === 'approve' ? { status: 'active' } : {}) };
    } else if (action === 'reject') {
      patch = { status: 'archived', reject_reason: str(body?.reason, 1000) || null };
    } else if (action === 'archive') {
      patch = { status: 'archived' };
    } else {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }

    const { data, error } = await ctx.db.from('challenges').update(patch).eq('id', challengeId).select().single();
    if (error) {
      if (isMissingColumn(error)) return NextResponse.json({ error: `Rewards are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      throw error;
    }
    return NextResponse.json({ challenge: data });
  } catch (err) {
    return failure('admin/challenges', err, id, 'Could not update the challenge.');
  }
}
