// Filing a report, from the member's side.
//
// Every report modal on the platform used to end in `setSubmitted(true)` and a
// toast reading "Thanks for keeping Honua safe." Nothing was written and no
// moderator ever saw it. This is the write those modals should have been doing;
// migration 046 is the table.
//
// Unlike everything under lib/admin-*, this runs in the browser against
// Supabase directly, and that is correct here: a member has a real Supabase
// session, so `auth.uid()` is a real value and 046's insert policy can check
// that you are filing under your own name. It is the *console* that cannot do
// this, because it signs in with Privy.

import { supabase } from '@/lib/supabase';

export type ReportTargetType = 'post' | 'comment' | 'profile' | 'product';

export type ReportOutcome =
  // A string discriminant, not a boolean. tsconfig has strict: false, so
  // without strictNullChecks TypeScript will not narrow a union on `ok: true`.
  | { kind: 'filed' }
  | { kind: 'duplicate' }
  | { kind: 'signed-out' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'failed'; message: string };

/**
 * `targetId` must be a real database id. The comment tree still falls back to
 * seeded demo nodes with numeric ids when a post has no comments yet, and
 * reporting one of those would insert a row pointing at nothing.
 */
export function isReportable(targetId: unknown): boolean {
  return typeof targetId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
}

export async function fileReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string | null;
  reporterId: string | null | undefined;
  reason: string;
  note?: string;
}): Promise<ReportOutcome> {
  if (!input.reporterId) return { kind: 'signed-out' };
  if (!isReportable(input.targetId)) {
    return { kind: 'unavailable', message: 'This one cannot be reported yet.' };
  }
  if (!input.reason?.trim()) return { kind: 'failed', message: 'Pick a reason first.' };

  const { error } = await supabase.from('content_reports').insert({
    target_type: input.targetType,
    target_id: input.targetId,
    // Only when it is a real profile id — reporting your way through a demo
    // author would attach the report to nobody.
    target_owner: isReportable(input.targetOwnerId) ? input.targetOwnerId : null,
    reporter_id: input.reporterId,
    reason: input.reason.trim().slice(0, 200),
    note: input.note?.trim() ? input.note.trim().slice(0, 1000) : null,
  });

  if (!error) return { kind: 'filed' };

  // 23505 is the one-report-per-person unique index. Reporting twice is not a
  // failure worth alarming anyone about — the first one is already in the
  // queue, which is exactly what they wanted.
  if (error.code === '23505') return { kind: 'duplicate' };

  // 42P01 / PGRST205: migration 046 has not been applied. Saying so beats a
  // green tick over a write that did not happen — that was the old bug.
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return { kind: 'unavailable', message: 'Reporting is not switched on yet. Nothing was sent.' };
  }
  if (error.code === '42501') {
    return { kind: 'failed', message: 'You are not allowed to file this report.' };
  }
  return { kind: 'failed', message: error.message || 'Could not send that report.' };
}
