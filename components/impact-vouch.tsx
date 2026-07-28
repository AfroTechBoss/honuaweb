"use client";
import React from "react";
import { Icon } from "@/components/icons";
import { useApp } from "@/components/app-context";

// ---------------------------------------------------------------------------
// Impact verification loop — shared vouch UI + data hook.
// Used by the home feed, profile timeline, and post detail page.
// ---------------------------------------------------------------------------

export const VOUCHES_TO_VERIFY = 3;

export function ImpactVouchBar({ log, vouched, isOwn, onVouch }: { log: any; vouched: boolean; isOwn: boolean; onVouch: (log: any) => void }) {
  const app = useApp();
  const verified = log.status === 'verified';
  const count = log.vouch_count ?? 0;
  return (
    <div onClick={e => e.stopPropagation()} style={{
      display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 12px', padding: '10px 14px',
      borderRadius: 12, background: verified ? 'var(--green-tint)' : 'var(--bg-2)',
      border: `1px solid ${verified ? 'var(--green-3)' : 'var(--line)'}`,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: verified ? 'var(--green)' : 'var(--surface)', border: verified ? 'none' : '1px solid var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name="leaf" size={16} color={verified ? '#fff' : 'var(--green)'} stroke={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {Number(log.co2_saved_kg ?? 0)} kg CO₂ · {log.category}
        </div>
        <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', letterSpacing: '.04em', color: verified ? 'var(--green)' : 'var(--ink-3)', marginTop: 2 }}>
          {verified
            ? `COMMUNITY VERIFIED · ${count} VOUCH${count === 1 ? '' : 'ES'}`
            : `${count}/${VOUCHES_TO_VERIFY} VOUCHES TO VERIFY`}
        </div>
      </div>
      {verified ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
          <Icon name="check" size={14} stroke={2.6} /> Verified
        </span>
      ) : isOwn ? (
        // Author can't vouch their own action — show a disabled button that
        // explains why on click, instead of a silent label.
        <button
          onClick={() => app.toast?.({ msg: "You can't vouch for your own action", sub: 'Others in the community vouch to verify it.', icon: 'user' })}
          title="You can't vouch for your own action"
          style={{ padding: '6px 14px', fontSize: 12.5, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink-4)', cursor: 'not-allowed' }}
        >
          Vouch
        </button>
      ) : (
        <button className={vouched ? 'btn btn-ghost' : 'btn btn-green'} onClick={() => onVouch(log)} style={{ padding: '6px 14px', fontSize: 12.5 }}>
          {vouched ? 'Vouched ✓' : 'Vouch'}
        </button>
      )}
    </div>
  );
}

// Batched log + vouch state for a list of posts, with an optimistic vouch toggle.
export function useImpactVouches(postIds: string[]) {
  const app = useApp();
  const [logs, setLogs] = React.useState<Record<string, any>>({});
  const [mine, setMine] = React.useState<string[]>([]);
  const key = postIds.join(',');

  React.useEffect(() => {
    if (!postIds.length) { setLogs({}); return; }
    let alive = true;
    import('@/lib/impact').then(async ({ getLogsForPosts, getMyVouches }) => {
      const l = await getLogsForPosts(postIds);
      if (!alive) return;
      setLogs(l);
      const logIds = Object.values(l).map((x: any) => x.id).filter(Boolean) as string[];
      if (app.user?.id && logIds.length) {
        const v = await getMyVouches(app.user.id, logIds);
        if (alive) setMine(v);
      }
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, app.user?.id]);

  const vouch = React.useCallback(async (log: any) => {
    if (!app.user?.id) { app.toast?.({ msg: 'Sign in to vouch', icon: 'user' }); return; }
    const vouched = mine.includes(log.id);
    // Optimistic
    setMine(v => vouched ? v.filter(x => x !== log.id) : [...v, log.id]);
    setLogs(prev => ({ ...prev, [log.post_id]: { ...log, vouch_count: Math.max(0, (log.vouch_count ?? 0) + (vouched ? -1 : 1)) } }));
    const { vouchForLog, unvouchLog } = await import('@/lib/impact');
    const { ok, error } = vouched ? await unvouchLog(app.user.id, log.id) : await vouchForLog(app.user.id, log.id);
    if (!ok) {
      // Roll back + surface why (e.g. RLS: can't vouch your own action)
      setMine(v => vouched ? [...v, log.id] : v.filter(x => x !== log.id));
      setLogs(prev => ({ ...prev, [log.post_id]: log }));
      const isOwn = log.user_id === app.user.id;
      app.toast?.({ msg: isOwn ? "You can't vouch for your own action" : 'Could not record vouch', sub: isOwn ? undefined : error, kind: 'error', icon: 'close' });
      return;
    }
    // Re-read the authoritative row (trigger may have flipped it to verified)
    const { supabase } = await import('@/lib/supabase');
    const { data: fresh } = await supabase.from('impact_logs')
      .select('id, user_id, action, category, co2_saved_kg, points, status, vouch_count, post_id, proof_url')
      .eq('id', log.id).single();
    if (fresh?.post_id) {
      setLogs(prev => ({ ...prev, [fresh.post_id]: fresh }));
      if (fresh.status === 'verified' && log.status !== 'verified') {
        app.toast?.({ msg: 'Action verified! 🌱', sub: 'The community confirmed this impact.', kind: 'success', icon: 'check' });
      }
    }
    // Notify the log owner
    if (!vouched && log.user_id && log.user_id !== app.user.id) {
      const { createNotification } = await import('@/lib/notifications');
      createNotification({ userId: log.user_id, actorId: app.user.id, type: 'vouch', postId: log.post_id, body: 'vouched for your impact action' });
    }
  }, [app, mine]);

  return { logs, mine, vouch };
}

// Self-contained bar for a single post (post detail page).
export function PostImpactVouch({ postId, isOwn }: { postId: string; isOwn: boolean }) {
  const ids = React.useMemo(() => [postId], [postId]);
  const { logs, mine, vouch } = useImpactVouches(ids);
  const log = logs[postId];
  if (!log) return null;
  return <ImpactVouchBar log={log} vouched={mine.includes(log.id)} isOwn={isOwn} onVouch={vouch} />;
}
