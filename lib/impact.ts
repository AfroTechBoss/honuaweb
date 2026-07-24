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
}

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
  const { data } = await supabase
    .from('impact_logs')
    .select('co2_saved_kg, points, logged_at, category, action')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });
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
