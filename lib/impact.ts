import { supabase } from "./supabase";

export interface ImpactLog {
  id?: string;
  user_id?: string;
  action: string;
  category: string;
  co2_saved_kg: number;
  points: number;
  verified?: boolean;
  logged_at?: string;
  // verification loop (migration 018)
  proof_url?: string | null;
  post_id?: string | null;
  status?: 'unverified' | 'pending' | 'verified';
  vouch_count?: number;
  description?: string | null;
  // quantity-based model (migration 026)
  quantity?: number | null;
  unit?: string | null;
}

// Community vouches needed before a log counts as verified
export const VOUCH_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// Quantity-based CO₂ model
//
// Impact is computed as `quantity × emission factor`, not a flat per-action
// value — so biking 30 km counts more than biking 2 km. Each category declares:
//   unit             — what the quantity measures (e.g. "km not driven")
//   factorKgPerUnit  — kg CO₂e avoided per unit (0 = no direct CO₂ avoidance)
//   gpPerUnit        — Green Points earned per unit
//   defaultQty/step  — sensible defaults for the input
//   source           — where the factor comes from (keep these honest)
//
// Factors are grounded in widely-cited averages (EPA, DEFRA, IPCC, Poore &
// Nemecek 2018). They're deliberately averages — real emissions vary by region,
// grid mix, vehicle, etc. Tune them here in one place.
// ---------------------------------------------------------------------------
export type ImpactCategory = {
  unit: string;
  factorKgPerUnit: number;
  gpPerUnit: number;
  defaultQty: number;
  step: number;
  source: string;
};

export const ACTION_IMPACTS: Record<string, ImpactCategory> = {
  Transport:  { unit: 'km not driven',     factorKgPerUnit: 0.17, gpPerUnit: 2,  defaultQty: 5, step: 1,   source: 'avg petrol car ~0.17 kg CO₂e/km (EPA/DEFRA)' },
  Food:       { unit: 'meat-free meal',    factorKgPerUnit: 2.0,  gpPerUnit: 8,  defaultQty: 1, step: 1,   source: 'meat→plant meal swap ~2 kg CO₂e (Poore & Nemecek 2018)' },
  Energy:     { unit: 'kWh saved',         factorKgPerUnit: 0.43, gpPerUnit: 3,  defaultQty: 3, step: 0.5, source: 'US grid avg ~0.43 kg CO₂e/kWh (EPA eGRID)' },
  Waste:      { unit: 'kg diverted',       factorKgPerUnit: 0.5,  gpPerUnit: 6,  defaultQty: 2, step: 0.5, source: 'compost/recycle vs landfill ~0.5 kg CO₂e/kg' },
  Ocean:      { unit: 'kg litter removed', factorKgPerUnit: 0,    gpPerUnit: 10, defaultQty: 3, step: 0.5, source: 'no direct CO₂ avoidance — rewarded in Green Points' },
  Lifestyle:  { unit: 'eco-friendly swap', factorKgPerUnit: 0.6,  gpPerUnit: 10, defaultQty: 1, step: 1,   source: 'rough estimate for a general sustainable choice' },
  Policy:     { unit: 'advocacy action',   factorKgPerUnit: 0,    gpPerUnit: 20, defaultQty: 1, step: 1,   source: 'no direct CO₂ — rewarded in Green Points' },
  Education:  { unit: '30-min session',    factorKgPerUnit: 0,    gpPerUnit: 10, defaultQty: 1, step: 1,   source: 'no direct CO₂ — rewarded in Green Points' },
  General:    { unit: 'action',            factorKgPerUnit: 0.3,  gpPerUnit: 8,  defaultQty: 1, step: 1,   source: 'generic small-action estimate' },
};

// Authoritative impact for a logged action: quantity × factor.
// GP scale with quantity, with a small floor so tiny/zero-CO₂ logs still reward.
export function computeImpact(category: string, quantity: number): { co2: number; pts: number; unit: string } {
  const c = ACTION_IMPACTS[category] ?? ACTION_IMPACTS.General;
  const q = Math.max(0, Number(quantity) || 0);
  return {
    co2: Math.round(q * c.factorKgPerUnit * 100) / 100, // 2 dp
    pts: Math.max(5, Math.round(q * c.gpPerUnit)),
    unit: c.unit,
  };
}

// Named daily-task presets (challenges grid). Each is a specific action defined
// as a category + a representative quantity — CO₂/GP are then derived from the
// same factor model as everything else (via computeImpact), so they stay in sync
// when factors change.
export const TASK_IMPACTS: Record<string, { category: string; quantity: number }> = {
  'Bike commute':        { category: 'Transport', quantity: 12 }, // ~12 km each way
  'Meatless meal':       { category: 'Food',      quantity: 1 },  // 1 meat-free meal
  'Compost food scraps': { category: 'Waste',     quantity: 1 },  // ~1 kg diverted
  '10 min education':    { category: 'Education',  quantity: 1 },  // 1 session
  'Skip ride-share':     { category: 'Transport', quantity: 10 }, // ~10 km
};

// Derived CO₂/GP for a named daily task.
export function taskImpact(taskName: string): { co2: number; pts: number; cat: string; quantity: number; unit: string } {
  const t = TASK_IMPACTS[taskName] ?? { category: 'General', quantity: 1 };
  const { co2, pts, unit } = computeImpact(t.category, t.quantity);
  return { co2, pts, cat: t.category, quantity: t.quantity, unit };
}

// One-tap log for a daily task / challenge preset (no proof, not verifiable —
// these are quick self-logs). Stores quantity + unit, with progressive fallback
// if migration 026 / 018 columns aren't present.
export async function logTaskImpact(userId: string, taskName: string, categoryOverride?: string, quantityOverride?: number): Promise<{ co2: number; pts: number; error?: string }> {
  const cat = categoryOverride ?? TASK_IMPACTS[taskName]?.category ?? 'General';
  const qty = quantityOverride ?? TASK_IMPACTS[taskName]?.quantity ?? (ACTION_IMPACTS[cat]?.defaultQty ?? 1);
  const { co2, pts, unit } = computeImpact(cat, qty);
  const full: any = { user_id: userId, action: taskName, category: cat, co2_saved_kg: co2, points: pts, quantity: qty, unit, status: 'unverified' };
  let res = await supabase.from('impact_logs').insert(full).select().single();
  if (res.error) { const { quantity: _q, unit: _u, ...noQty } = full; res = await supabase.from('impact_logs').insert(noQty).select().single(); }
  if (res.error) { const { quantity: _q, unit: _u, status: _s, ...bare } = full; res = await supabase.from('impact_logs').insert(bare).select().single(); }
  return { co2, pts, error: res.error?.message };
}

export async function logImpact(log: Omit<ImpactLog, 'id' | 'logged_at'>) {
  return supabase.from('impact_logs').insert(log).select().single();
}

// ---------------------------------------------------------------------------
// Verification loop (migration 018)
// ---------------------------------------------------------------------------

// Log an action with optional proof photo and optional feed post.
// The post starts with co2_saved_kg = 0 — the DB trigger grants the CO₂ value
// (and with it entry into the "Verified impact" feed) once vouches reach the
// threshold.
export async function createImpactAction(userId: string, fields: {
  action: string; category: string; quantity: number;
  description?: string; proofFile?: File | null; shareToFeed?: boolean; userName?: string;
}): Promise<{ log: any | null; postId: string | null; co2: number; pts: number; error?: string }> {
  // Authoritative impact — computed here, not trusted from the client
  const { co2, pts, unit } = computeImpact(fields.category, fields.quantity);

  let proof_url: string | null = null;
  if (fields.proofFile) {
    try {
      const { uploadFile } = await import('./storage');
      proof_url = await uploadFile('posts', userId, fields.proofFile);
    } catch {}
  }

  const qtyLabel = `${fields.quantity} ${unit}`;

  // Optional feed post first, so the log can link to it
  let postId: string | null = null;
  if (fields.shareToFeed) {
    const content = fields.description?.trim()
      ? `${fields.description.trim()}\n\n🌱 Logged: ${fields.action} · ${qtyLabel} · ${co2} kg CO₂`
      : `🌱 ${fields.action} — ${qtyLabel} on my impact ledger (${co2} kg CO₂). Vouch if you saw it happen!`;
    const { data: post } = await supabase.from('posts').insert({
      user_id: userId,
      content,
      image_url: proof_url,
      post_type: 'action',
    }).select('id').single();
    postId = post?.id ?? null;
  }

  // Insert the log — progressively strip newer columns if a migration is missing
  const full: any = {
    user_id: userId, action: fields.action, category: fields.category,
    co2_saved_kg: co2, points: pts,
    quantity: fields.quantity, unit,
    proof_url, post_id: postId, description: fields.description?.trim() || null,
    status: proof_url || postId ? 'pending' : 'unverified',
  };
  let res = await supabase.from('impact_logs').insert(full).select().single();
  if (res.error) {
    // migration 026 (quantity/unit) not run
    const { quantity: _q, unit: _u, ...noQty } = full;
    res = await supabase.from('impact_logs').insert(noQty).select().single();
  }
  if (res.error) {
    // migration 018 (proof/post/status) not run
    const { proof_url: _p, post_id: _po, description: _d, status: _s, quantity: _q, unit: _u, ...legacy } = full;
    res = await supabase.from('impact_logs').insert(legacy).select().single();
  }
  return { log: res.data ?? null, postId, co2, pts, error: res.error?.message };
}

// Logs linked to the given feed posts (batched for the home feed)
export async function getLogsForPosts(postIds: string[]): Promise<Record<string, ImpactLog>> {
  if (!postIds.length) return {};
  try {
    const { data, error } = await supabase
      .from('impact_logs')
      .select('id, user_id, action, category, co2_saved_kg, points, status, vouch_count, post_id, proof_url')
      .in('post_id', postIds);
    if (error || !data) return {};
    const map: Record<string, ImpactLog> = {};
    for (const l of data) if (l.post_id) map[l.post_id] = l as ImpactLog;
    return map;
  } catch { return {}; }
}

// Which of these logs has the viewer already vouched for?
export async function getMyVouches(userId: string, logIds: string[]): Promise<string[]> {
  if (!logIds.length) return [];
  try {
    const { data, error } = await supabase
      .from('impact_vouches')
      .select('log_id')
      .eq('user_id', userId)
      .in('log_id', logIds);
    if (error || !data) return [];
    return data.map((v: any) => v.log_id);
  } catch { return []; }
}

export async function vouchForLog(userId: string, logId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('impact_vouches').insert({ user_id: userId, log_id: logId });
    return { ok: !error, error: error?.message };
  } catch (e: any) { return { ok: false, error: e?.message }; }
}

export async function unvouchLog(userId: string, logId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('impact_vouches').delete().match({ user_id: userId, log_id: logId });
    return { ok: !error, error: error?.message };
  } catch (e: any) { return { ok: false, error: e?.message }; }
}

export async function getRecentLogs(userId: string, limit = 20): Promise<ImpactLog[]> {
  const { data } = await supabase
    .from('impact_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getAllLogs(userId: string): Promise<ImpactLog[]> {
  // Progressively fall back if newer columns aren't present:
  // 026 (quantity/unit) → 018 (status/vouch_count) → base
  const selects = [
    'co2_saved_kg, points, logged_at, category, action, status, vouch_count, quantity, unit',
    'co2_saved_kg, points, logged_at, category, action, status, vouch_count',
    'co2_saved_kg, points, logged_at, category, action',
  ];
  for (const sel of selects) {
    const { data, error } = await supabase
      .from('impact_logs').select(sel)
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });
    if (!error) return (data as any) ?? [];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export type LeaderRow = {
  rank: number;
  userId: string;
  name: string;
  handle: string;
  avatar: string | null;
  co2: number;
  isYou: boolean;
  verified: boolean;
};

/**
 * Ranking by lifetime CO₂ avoided, summed from the ledger.
 *
 * Summed from impact_logs rather than read off profiles.total_co2_kg so it
 * agrees with the number on each person's own profile — the two disagreeing is
 * worse than either being slightly stale. `impact_logs` is public-read, so this
 * works from the client.
 *
 * Returns the top `top` plus the viewer's own row when they rank below it, so
 * they always see where they actually stand.
 */
export async function getImpactLeaderboard(viewerId?: string, top = 5): Promise<LeaderRow[]> {
  try {
    const { data: logs, error } = await supabase
      .from('impact_logs')
      .select('user_id, co2_saved_kg');
    if (error || !logs) return [];

    const totals = new Map<string, number>();
    for (const l of logs as any[]) {
      if (!l.user_id) continue;
      totals.set(l.user_id, (totals.get(l.user_id) ?? 0) + Number(l.co2_saved_kg ?? 0));
    }
    // Everyone, ranked — the viewer's rank has to be their true position, not
    // their position within the slice we happen to display.
    const ranked = [...totals.entries()]
      .filter(([, co2]) => co2 > 0)
      .sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return [];

    const rankOf = new Map(ranked.map(([id], i) => [id, i + 1]));
    const shown = ranked.slice(0, top);
    const viewerRank = viewerId ? rankOf.get(viewerId) : undefined;
    if (viewerId && viewerRank && viewerRank > top) {
      shown.push(ranked[viewerRank - 1]);
    }

    const ids = shown.map(([id]) => id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, handle, full_name, avatar_url, verified')
      .in('id', ids);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return shown.map(([id, co2]) => {
      const p = byId.get(id);
      return {
        rank: rankOf.get(id)!,
        userId: id,
        name: p?.full_name || (p?.handle ? `@${p.handle}` : 'Someone'),
        handle: p?.handle ?? '',
        avatar: p?.avatar_url ?? null,
        co2,
        isYou: id === viewerId,
        verified: !!p?.verified,
      };
    });
  } catch { return []; }
}

// Local calendar day (YYYY-MM-DD) for a Date — avoids the UTC off-by-one that
// dropped "today" for users ahead of UTC.
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeStreak(logs: ImpactLog[]): number {
  // Compare in the viewer's local timezone: parse each log's UTC timestamp to a
  // local day, and walk back from local "today".
  const days = new Set(logs.map(l => (l.logged_at ? localDay(new Date(l.logged_at)) : '')));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(localDay(d))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function groupByDate(logs: ImpactLog[], days = 30): { date: string; co2: number; pts: number }[] {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().substring(0, 10);
  const map: Record<string, { co2: number; pts: number }> = {};
  for (const l of logs) {
    const d = l.logged_at?.substring(0, 10) ?? '';
    if (d < cutoff) continue;
    if (!map[d]) map[d] = { co2: 0, pts: 0 };
    map[d].co2 += Number(l.co2_saved_kg ?? 0);
    map[d].pts += Number(l.points ?? 0);
  }
  // Fill every day in range
  const result: { date: string; co2: number; pts: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().substring(0, 10);
    result.push({ date: d, ...(map[d] ?? { co2: 0, pts: 0 }) });
  }
  return result;
}
