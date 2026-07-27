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
}

// Community vouches needed before a log counts as verified
export const VOUCH_THRESHOLD = 3;

// CO₂ saved (kg) and GP points per action category
export const ACTION_IMPACTS: Record<string, { co2: number; pts: number }> = {
  Transport:  { co2: 2.4, pts: 24 },
  Food:       { co2: 1.5, pts: 15 },
  Waste:      { co2: 0.8, pts: 18 },
  Energy:     { co2: 1.2, pts: 20 },
  Lifestyle:  { co2: 0.6, pts: 12 },
  Ocean:      { co2: 0.5, pts: 15 },
  Policy:     { co2: 0.0, pts: 20 },
  Education:  { co2: 0.0, pts: 10 },
  General:    { co2: 0.5, pts: 10 },
};

// Named task impacts for the daily task grid
export const TASK_IMPACTS: Record<string, { co2: number; pts: number; cat: string }> = {
  'Bike commute':        { co2: 2.4, pts: 24, cat: 'Transport' },
  'Meatless meal':       { co2: 1.5, pts: 12, cat: 'Food' },
  'Compost food scraps': { co2: 0.5, pts: 18, cat: 'Waste' },
  '10 min education':    { co2: 0.0, pts: 50, cat: 'Education' },
  'Skip ride-share':     { co2: 2.0, pts: 30, cat: 'Transport' },
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
  action: string; category: string; co2: number; pts: number;
  description?: string; proofFile?: File | null; shareToFeed?: boolean; userName?: string;
}): Promise<{ log: any | null; postId: string | null; error?: string }> {
  let proof_url: string | null = null;
  if (fields.proofFile) {
    try {
      const { uploadFile } = await import('./storage');
      proof_url = await uploadFile('posts', userId, fields.proofFile);
    } catch {}
  }

  // Optional feed post first, so the log can link to it
  let postId: string | null = null;
  if (fields.shareToFeed) {
    const content = fields.description?.trim()
      ? `${fields.description.trim()}\n\n🌱 Logged: ${fields.action} · ${fields.co2} kg CO₂`
      : `🌱 ${fields.action} — logged on my impact ledger (${fields.co2} kg CO₂). Vouch if you saw it happen!`;
    const { data: post } = await supabase.from('posts').insert({
      user_id: userId,
      content,
      image_url: proof_url,
      post_type: 'action',
    }).select('id').single();
    postId = post?.id ?? null;
  }

  // Insert the log — progressively strip 018 columns if migration not run yet
  const full: any = {
    user_id: userId, action: fields.action, category: fields.category,
    co2_saved_kg: fields.co2, points: fields.pts,
    proof_url, post_id: postId, description: fields.description?.trim() || null,
    status: proof_url || postId ? 'pending' : 'unverified',
  };
  let res = await supabase.from('impact_logs').insert(full).select().single();
  if (res.error) {
    const { proof_url: _p, post_id: _po, description: _d, status: _s, ...legacy } = full;
    res = await supabase.from('impact_logs').insert(legacy).select().single();
  }
  return { log: res.data ?? null, postId, error: res.error?.message };
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
  // Try with verification columns (migration 018); fall back for older schemas
  let { data, error }: { data: any; error: any } = await supabase
    .from('impact_logs')
    .select('co2_saved_kg, points, logged_at, category, action, status, vouch_count')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });
  if (error) {
    ({ data } = await supabase
      .from('impact_logs')
      .select('co2_saved_kg, points, logged_at, category, action')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false }));
  }
  return data ?? [];
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
