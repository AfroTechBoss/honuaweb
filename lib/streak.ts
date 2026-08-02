// ---------------------------------------------------------------------------
// Streak timing.
//
// A streak is counted in the user's own calendar days (lib/impact.ts's
// computeStreak walks back from local "today"), so anything that fires
// *because* a streak is about to lapse has to be evaluated per-user, in their
// zone. The browser knows its zone for free; the cron job doesn't, which is
// why profiles.timezone exists (migration 028).
//
// Shared by the client and the server route — keep it dependency-free.
// ---------------------------------------------------------------------------

export type StreakNoticeKind = 'streak_risk' | 'streak_ended';

// How long before local midnight the "your streak is on the line" nudge goes
// out. The job runs hourly, so this is a window, not an instant: a user is
// eligible on the first run that lands inside it and the notice table keeps
// later runs that day from sending again.
export const RISK_WINDOW_START_HOUR = 20; // 20:00 local — 4h of runway
export const RISK_WINDOW_END_HOUR = 22;   // exclusive

// And how long after local midnight the "it ended" note goes out. Kept short so
// it lands while yesterday still feels like yesterday.
export const ENDED_WINDOW_START_HOUR = 0;
export const ENDED_WINDOW_END_HOUR = 3; // exclusive

// Don't nag someone whose "streak" is a single day — losing it costs nothing
// and the notification is just noise.
export const MIN_STREAK_TO_WARN = 2;

/** The user's local calendar day and hour at `at`. Falls back to UTC. */
export function zonedNow(at: Date, timeZone?: string | null): { day: string; hour: number } {
  const tz = timeZone || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hour12: false,
    }).formatToParts(at);
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    // 'en-CA' formats the date as YYYY-MM-DD, which is the key format used
    // everywhere else. Hour comes back as "24" at midnight in some ICU builds.
    const hour = Number(get('hour')) % 24;
    return { day: `${get('year')}-${get('month')}-${get('day')}`, hour };
  } catch {
    // Unknown/garbage IANA zone — treat the user as UTC rather than skipping them.
    return {
      day: at.toISOString().slice(0, 10),
      hour: at.getUTCHours(),
    };
  }
}

/** Shift a YYYY-MM-DD day string by `n` days. */
export function shiftDay(day: string, n: number): string {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Length of the unbroken run of logged days ending on `endDay` (inclusive).
 * Returns 0 when `endDay` itself has no log.
 */
export function streakEndingOn(loggedDays: Set<string>, endDay: string, max = 365): number {
  let n = 0;
  for (let i = 0; i < max; i++) {
    if (!loggedDays.has(shiftDay(endDay, -i))) break;
    n++;
  }
  return n;
}

export type StreakDecision =
  | { kind: 'streak_risk'; forDay: string; streak: number }
  | { kind: 'streak_ended'; forDay: string; streak: number }
  | null;

/**
 * What (if anything) to send this user right now.
 *
 * `loggedDays` is the set of the user's local calendar days that have at least
 * one impact log. `now` is the current instant; `timeZone` their IANA zone.
 */
export function decideStreakNotice(
  loggedDays: Set<string>,
  now: Date,
  timeZone?: string | null,
): StreakDecision {
  const { day: today, hour } = zonedNow(now, timeZone);
  const yesterday = shiftDay(today, -1);

  // Just after local midnight: did the streak lapse overnight?
  if (hour >= ENDED_WINDOW_START_HOUR && hour < ENDED_WINDOW_END_HOUR) {
    // Nothing yesterday, but something the day before — the run that was alive
    // at this time yesterday is now over. (A log *today* doesn't rescue it;
    // today would be the start of a new run, not a continuation.)
    if (!loggedDays.has(yesterday)) {
      const lost = streakEndingOn(loggedDays, shiftDay(today, -2));
      if (lost >= MIN_STREAK_TO_WARN) {
        // Attributed to yesterday — the day that broke it — so a job that
        // runs twice in the window can't send twice.
        return { kind: 'streak_ended', forDay: yesterday, streak: lost };
      }
    }
    return null;
  }

  // Evening: streak still alive, but today is empty.
  if (hour >= RISK_WINDOW_START_HOUR && hour < RISK_WINDOW_END_HOUR) {
    if (loggedDays.has(today)) return null; // already safe
    const atRisk = streakEndingOn(loggedDays, yesterday);
    if (atRisk >= MIN_STREAK_TO_WARN) {
      return { kind: 'streak_risk', forDay: today, streak: atRisk };
    }
  }

  return null;
}

/** Copy for each notice. Kept next to the logic so the two can't drift. */
export function streakNoticeBody(kind: StreakNoticeKind, streak: number): string {
  if (kind === 'streak_risk') {
    return `Your ${streak}-day streak ends at midnight — log an action to keep it alive.`;
  }
  return `Your ${streak}-day streak ended. Log an action today to start a new one.`;
}
