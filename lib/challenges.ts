import { supabase } from './supabase';

// Join or leave a challenge. challenge_participants is the source of truth; a
// trigger keeps challenges.participant_count in step with it.
export async function setChallengeJoined(userId: string, challengeId: string, join: boolean): Promise<{ error?: string }> {
  const { error } = join
    ? await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: userId })
    : await supabase.from('challenge_participants').delete().match({ challenge_id: challengeId, user_id: userId });
  return { error: error?.message };
}

// Start of the viewer's local day, for "already logged today" checks. UTC
// midnight would roll "today" over at the wrong hour outside GMT.
export function startOfLocalDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export type ChallengeReward = { challenge_id: string; title: string; points: number };

// Pays out any of the caller's joined challenges that are now complete
// (migration 056). Safe to call as often as you like: each challenge pays at
// most once per person, and the server does all the counting. Returns only the
// challenges completed by this call.
export async function claimChallengeRewards(): Promise<ChallengeReward[]> {
  const { data, error } = await supabase.rpc('claim_challenge_rewards');
  if (error) return [];
  return (data ?? []) as ChallengeReward[];
}

// Distinct local days on which `title` was logged inside the challenge window,
// for the progress bar. The server makes the same count (in the profile's
// timezone) when it decides to pay, so this is for display only.
export function countLoggedDays(logs: { action: string; logged_at: string }[], title: string, joinedAt: string, days: number): number {
  const from = new Date(joinedAt).getTime();
  const to = Math.min(from + days * 86_400_000, Date.now());
  const seen = new Set<string>();
  for (const l of logs) {
    if (l.action !== title) continue;
    const t = new Date(l.logged_at).getTime();
    if (t < from || t > to) continue;
    seen.add(new Date(t).toLocaleDateString('en-CA'));
  }
  return seen.size;
}
