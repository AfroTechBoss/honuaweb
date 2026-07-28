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

// Named daily-task presets (challenges grid). Each is a specific action with a
// fixed, pre-computed impact derived from the factors above.
export const TASK_IMPACTS: Record<string, { co2: number; pts: number; cat: string }> = {
  'Bike commute':        { co2: 2.0, pts: 24, cat: 'Transport' }, // ~12 km
  'Meatless meal':       { co2: 2.0, pts: 8,  cat: 'Food' },      // 1 meal
  'Compost food scraps': { co2: 0.5, pts: 6,  cat: 'Waste' },     // ~1 kg
  '10 min education':    { co2: 0.0, pts: 10, cat: 'Education' },
  'Skip ride-share':     { co2: 1.7, pts: 20, cat: 'Transport' }, // ~10 km
};

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

export async function vouchForLog(userId: string, logId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('impact_vouches').insert({ user_id: userId, log_id: logId });
    return !error;
  } catch { return false; }
}

export async function unvouchLog(userId: string, logId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('impact_vouches').delete().match({ user_id: userId, log_id: logId });
    return !error;
  } catch { return false; }
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

export function computeStreak(logs: ImpactLog[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = new Set(logs.map(l => l.logged_at?.substring(0, 10) ?? ''));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10);
    if (days.has(key)) {
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
