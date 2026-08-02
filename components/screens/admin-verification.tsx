"use client";
import React from "react";
import { Icon, Avatar, Modal, ModalHead, SStat, SBadge, sTint, useApp } from "@/components/shared";
import {
  listVerificationRequests, decideVerificationRequest, revokeVerification,
  searchAccounts, grantVerification,
  type AdminVerificationRequest, type VerificationApplicant,
} from "@/lib/admin-verification";
import { VERIFICATION_CRITERIA } from "@/lib/verification-copy";

// =====================================================================
// VERIFICATION — applications for the blue tick
//
// Laid out as cards rather than a table because the thing being judged is
// prose: a reviewer has to read what someone wrote about themselves and
// weigh it against the signals on their account. A dense grid would bury
// the only column that matters.
//
// Approving is irreversible from the applicant's side — it sends an email
// and puts a trust mark on a public profile — so both decisions go through
// a confirmation step, and rejecting requires a reason that gets forwarded.
// =====================================================================

// 'verified' is not a request status — it's the list of accounts that carry the
// badge right now, which is a different question from "what did we decide".
// Accounts verified before this queue existed only ever appear under it.
const FILTERS = [
  ['pending', 'Waiting'],
  ['verified', 'Verified'],
  ['approved', 'Approved'],
  ['rejected', 'Declined'],
  ['revoked', 'Revoked'],
  ['all', 'All'],
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  individual: 'Individual', organization: 'Organization', project: 'Project', business: 'Business',
};

function ago(ts?: string | null) {
  if (!ts) return '—';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const dateLong = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—';

// Anything that looks like a URL becomes clickable — a reviewer's whole job
// here is to go and look. rel is locked down because these are links a
// stranger supplied.
function Links({ value }: { value: string }) {
  const parts = value.split(/[\s,]+/).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {parts.map((raw, i) => {
        const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const ok = /^[\w.-]+\.[a-z]{2,}/i.test(raw.replace(/^https?:\/\//i, ''));
        if (!ok) return <span key={i} style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{raw}</span>;
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow"
            style={{ fontSize: 12.5, fontFamily: 'JetBrains Mono', color: 'var(--sky)', textDecoration: 'none', background: sTint('var(--sky)'), padding: '4px 9px', borderRadius: 7, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="globe" size={12} /> {raw.replace(/^https?:\/\//i, '').slice(0, 48)}
          </a>
        );
      })}
    </div>
  );
}

function Signal({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em' }}>{label}</div>
      <div className="tabular" style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: tone }}>{value}</div>
    </div>
  );
}

// Same five numbers under an application and under an account that already has
// the badge — the questions a reviewer asks before granting one are the same
// ones they ask before taking one away.
function Signals({ a }: { a: VerificationApplicant }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, padding: '12px 18px', borderTop: '1px solid var(--line)', background: 'var(--bg-2)' }}>
      <Signal label="ON HONUA SINCE" value={dateLong(a.created_at)} />
      <Signal label="FOLLOWERS" value={a.followers.toLocaleString()} />
      <Signal label="POSTS" value={a.posts.toLocaleString()} />
      <Signal label="VOUCHED ACTIONS" value={a.verified_actions.toLocaleString()}
        tone={a.verified_actions === 0 ? 'var(--clay)' : 'var(--green)'} />
      <Signal label="IMPACT SCORE" value={a.impact_score.toLocaleString()} />
    </div>
  );
}

export function AdminVerification({ getToken, log }: { getToken: any; log?: any }) {
  const app = useApp();
  const [requests, setRequests] = React.useState<AdminVerificationRequest[] | null>(null);
  // Read off profiles, not off approved applications — see the note in
  // lib/admin-verification.ts.
  const [verified, setVerified] = React.useState<VerificationApplicant[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<string>('pending');
  const [q, setQ] = React.useState('');
  // { request, decision } — the confirmation step in front of every write.
  const [deciding, setDeciding] = React.useState<{ req: AdminVerificationRequest; decision: 'approve' | 'reject' | 'revoke' } | null>(null);
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [granting, setGranting] = React.useState(false);

  // Privy hands back a fresh function each render; keep it in a ref so loading
  // doesn't retrigger on every re-render.
  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    try { return await tokenRef.current(); } catch { return null; }
  }, []);

  const load = React.useCallback(async () => {
    const { requests: rows, verified: badges, error } = await listVerificationRequests(await token());
    // The route can hand back the verified list *and* an error — the queue
    // table being absent doesn't stop profiles from being readable. So set
    // whatever came back before deciding whether to show the banner.
    setVerified(badges ?? []);
    setRequests(rows ?? []);
    setLoadError(error ?? null);
  }, [token]);

  React.useEffect(() => { load(); }, [load]);

  const list = requests ?? [];
  const loading = requests === null;
  // The counts are only unknown while nothing has arrived. A soft error that
  // still returned the verified list shouldn't blank the numbers it did return.
  const unknown = loading;

  const counts = {
    pending: list.filter(r => r.status === 'pending').length,
    verified: verified.length,
    approved: list.filter(r => r.status === 'approved').length,
    rejected: list.filter(r => r.status === 'rejected').length,
    revoked: list.filter(r => r.status === 'revoked').length,
    all: list.length,
  };

  // How long the oldest untouched application has been sitting there. It's the
  // number that says whether this queue is being run or just collected.
  const oldestWait = (() => {
    const waiting = list.filter(r => r.status === 'pending');
    if (!waiting.length) return null;
    const oldest = Math.min(...waiting.map(r => new Date(r.created_at).getTime()));
    return Math.floor((Date.now() - oldest) / 86400000);
  })();

  const term = q.trim().toLowerCase();

  const shown = filter === 'verified' ? [] : list.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!term) return true;
    return [r.applicant?.handle, r.applicant?.full_name, r.real_name, r.note, r.links]
      .some(v => (v ?? '').toLowerCase().includes(term));
  });

  const shownVerified = filter !== 'verified' ? [] : verified.filter(a =>
    !term || [a.handle, a.full_name, a.email].some(v => (v ?? '').toLowerCase().includes(term)));

  const openDecision = (req: AdminVerificationRequest, decision: 'approve' | 'reject' | 'revoke') => {
    setNote('');
    setDeciding({ req, decision });
  };

  // Revoking from the verified list, where there may be no application at all.
  // The modal and the confirm path both only need the account, so stand one in.
  const revokeAccount = (a: VerificationApplicant) => openDecision(
    { id: '', user_id: a.id, applicant: a } as AdminVerificationRequest, 'revoke');

  const grant = async (a: VerificationApplicant, why: string) => {
    const who = `@${a.handle}`;
    const { error, emailed, emailError, closedApplication } = await grantVerification(await token(), a.id, why);
    if (error) { app.toast?.({ msg: "Couldn't verify that account", sub: error, kind: 'error', icon: 'close' }); return false; }
    log?.('verified account', who, 'check');
    app.toast?.({
      msg: `${who} is verified`,
      sub: [
        closedApplication ? 'Their open application was closed as approved.' : null,
        emailed ? 'Notified in-app and by email.' : `Notified in-app. Email not sent: ${emailError ?? 'unknown reason'}`,
      ].filter(Boolean).join(' '),
      kind: 'success', icon: 'check',
    });
    setGranting(false);
    setFilter('verified');
    load();
    return true;
  };

  const confirm = async () => {
    if (!deciding) return;
    const { req, decision } = deciding;
    const who = req.applicant?.handle ? `@${req.applicant.handle}` : 'the account';
    if (decision !== 'approve' && !note.trim()) {
      app.toast?.({ msg: 'Give a reason', sub: "It's sent to the account, so it has to say something.", kind: 'error', icon: 'bolt' });
      return;
    }
    setBusy(true);
    try {
      if (decision === 'revoke') {
        const { error } = await revokeVerification(await token(), req.user_id, note.trim());
        if (error) { app.toast?.({ msg: "Couldn't revoke that badge", sub: error, kind: 'error', icon: 'close' }); return; }
        log?.('revoked verification', who, 'lock');
        app.toast?.({ msg: `Verification removed from ${who}`, icon: 'lock' });
      } else {
        const { request, error, emailed, emailError } = await decideVerificationRequest(await token(), req.id, decision, note.trim());
        if (error || !request) { app.toast?.({ msg: "Couldn't record that decision", sub: error, kind: 'error', icon: 'close' }); return; }
        setRequests(rs => (rs ?? []).map(x => x.id === request.id ? request : x));
        log?.(decision === 'approve' ? 'verified account' : 'declined verification', who, decision === 'approve' ? 'check' : 'close');
        // The decision stuck either way; the email is the part that can fail on
        // its own, and a reviewer needs to know when it did.
        app.toast?.({
          msg: decision === 'approve' ? `${who} is verified` : `Declined ${who}`,
          sub: emailed ? 'They’ve been notified in-app and by email.' : `Notified in-app. Email not sent: ${emailError ?? 'unknown reason'}`,
          kind: decision === 'approve' ? 'success' : undefined,
          icon: decision === 'approve' ? 'check' : 'close',
        });
      }
      setDeciding(null);
      // Revoke writes a new row; approve/reject changed one. Either way the
      // server holds the truth.
      load();
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <SStat label="Waiting on review" value={unknown ? '—' : counts.pending} icon="clock" accent="var(--sun)"
          sub={unknown ? '' : counts.pending === 0 ? 'queue is clear' : oldestWait === 0 ? 'all arrived today' : `oldest waiting ${oldestWait}d`} />
        {/* Counted off profiles.verified, not off approved applications. The
            two differ by every account verified before this queue existed —
            which is why this read zero while badges were plainly on profiles. */}
        <SStat label="Verified" value={unknown ? '—' : counts.verified} icon="check" accent="var(--sky)"
          sub={unknown ? '' : counts.verified === 0 ? 'no badges yet'
            : counts.approved < counts.verified ? `${counts.verified - counts.approved} granted outside the queue` : 'accounts carrying the badge'} />
        <SStat label="Declined" value={unknown ? '—' : counts.rejected} icon="close" accent="var(--clay)"
          sub={unknown ? '' : counts.rejected === 0 ? 'none turned down' : 'each with a reason sent'} />
        <SStat label="Revoked" value={unknown ? '—' : counts.revoked} icon="lock" accent="var(--ink-3)"
          sub={unknown ? '' : 'badges taken back'} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
              {l} <span style={{ fontFamily: 'JetBrains Mono', opacity: .65 }}>· {counts[k as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative', minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={filter === 'verified' ? 'Search verified accounts' : 'Search name, handle, application'}
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none' }} />
        </div>
        {/* The queue is the normal way in. This is for the cases that never
            come through it — a partner org, an account onboarded by hand. */}
        <button className="btn btn-green" onClick={() => setGranting(true)}>
          <Icon name="check" size={14} /> Verify an account
        </button>
      </div>

      {loadError && (
        <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)'), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="flag" size={15} />
          <span style={{ flex: 1 }}>{loadError}</span>
          <button className="btn btn-ghost" onClick={() => { setRequests(null); load(); }} style={{ fontSize: 12, padding: '5px 11px' }}>Retry</button>
        </div>
      )}

      {loading && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16 }}>
          Loading applications…
        </div>
      )}

      {!loading && shown.length === 0 && shownVerified.length === 0 && (
        <div style={{ padding: '60px 32px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16 }}>
          <Icon name="check" size={28} color="var(--ink-3)" />
          <div style={{ marginTop: 10, fontWeight: 600 }}>
            {filter === 'verified' ? (q.trim() ? 'No match' : 'Nobody is verified yet')
              : loadError ? "Applications couldn't be loaded"
                : filter === 'pending' ? 'Nothing waiting' : 'Nothing here'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            {filter === 'verified' ? (q.trim() ? 'No verified account matches that.' : 'Approve an application, or verify an account directly.')
              : loadError ? 'Retry above.'
                : filter === 'pending'
                  ? 'Every application has been decided. New ones land here as they come in.'
                  : 'No applications with that status yet.'}
          </div>
        </div>
      )}

      {/* Verified accounts. Not applications — some of these have no application
          behind them at all, which is exactly why they need their own list. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shownVerified.map(a => {
          const name = a.full_name || `@${a.handle}`;
          const application = list.find(r => r.user_id === a.id && r.status === 'approved');
          return (
            <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px' }}>
                <Avatar src={a.avatar_url} name={name} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--sky)', background: sTint('var(--sky)'), padding: '2px 7px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" size={11} /> verified
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 3 }}>
                    @{a.handle} · verified {a.verified_at ? ago(a.verified_at) : 'before this was recorded'}
                  </div>
                  {a.bio && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 7 }}>{a.bio}</div>}
                </div>
                {a.email && <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', flexShrink: 0 }}>{a.email}</span>}
              </div>

              <Signals a={a} />

              <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                  {application
                    ? <>Granted {ago(application.reviewed_at)}{application.reviewer_note && <> — “{application.reviewer_note}”</>}</>
                    : 'No application on record — this badge predates the review queue.'}
                </span>
                <button className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--clay)' }} onClick={() => revokeAccount(a)}>
                  <Icon name="lock" size={13} /> Revoke badge
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!loading && shown.map(r => {
          const a = r.applicant;
          const name = a?.full_name || (a?.handle ? `@${a.handle}` : 'Deleted account');
          const pending = r.status === 'pending';
          return (
            <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              {/* Who */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px' }}>
                <Avatar src={a?.avatar_url} name={name} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
                    {a?.verified && <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--sky)', background: sTint('var(--sky)'), padding: '2px 7px', borderRadius: 6 }}>has badge</span>}
                    <SBadge status={r.status} size="sm" />
                    {r.category && (
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 6 }}>
                        {CATEGORY_LABEL[r.category] ?? r.category}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 3 }}>
                    @{a?.handle ?? '—'} · applied {ago(r.created_at)}
                    {r.real_name && r.real_name !== a?.full_name && <> · claims to be <span style={{ color: 'var(--ink-2)' }}>{r.real_name}</span></>}
                  </div>
                  {a?.bio && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 7 }}>{a.bio}</div>}
                </div>
                {a?.email && (
                  <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', flexShrink: 0 }}>{a.email}</span>
                )}
              </div>

              {/* Signals a reviewer would otherwise go hunting for */}
              {a && <Signals a={a} />}

              {/* What they said */}
              {(r.note || r.links || a?.website) && (
                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {r.note && (
                    <div>
                      <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 5 }}>THEIR CASE</div>
                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{r.note}</p>
                    </div>
                  )}
                  {(r.links || a?.website) && (
                    <div>
                      <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 6 }}>WHERE TO CHECK</div>
                      <Links value={[r.links, a?.website].filter(Boolean).join(' ')} />
                    </div>
                  )}
                </div>
              )}

              {/* Outcome, or the buttons that decide one */}
              <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {pending ? (
                  <>
                    <button className="btn btn-green" onClick={() => openDecision(r, 'approve')}>
                      <Icon name="check" size={14} /> Verify this account
                    </button>
                    <button className="btn btn-ghost" onClick={() => openDecision(r, 'reject')}>Decline</button>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-4)' }}>
                      Either decision emails the account and posts a notification.
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                      {r.status === 'approved' ? 'Verified' : r.status === 'revoked' ? 'Revoked' : 'Declined'} {ago(r.reviewed_at)}
                      {r.reviewed_by && <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--ink-4)' }}> · by {r.reviewed_by.replace(/^did:privy:/, '')}</span>}
                      {r.reviewer_note && <> — “{r.reviewer_note}”</>}
                    </span>
                    {a?.verified && (
                      <button className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--clay)' }} onClick={() => openDecision(r, 'revoke')}>
                        <Icon name="lock" size={13} /> Revoke badge
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {deciding && (
        <DecisionModal
          req={deciding.req}
          decision={deciding.decision}
          note={note} setNote={setNote}
          busy={busy}
          onCancel={() => setDeciding(null)}
          onConfirm={confirm}
        />
      )}

      {granting && <GrantModal token={token} onGrant={grant} onClose={() => setGranting(false)} />}
    </div>
  );
}

// Verify someone who never applied.
//
// Two steps on purpose. Searching and confirming in one screen makes it far too
// easy to grant a badge to the wrong @handle — the near-misses are exactly the
// accounts impersonation uses. Step two shows the account's actual signals, so
// the last thing seen before the button is the evidence, not the search box.
function GrantModal({ token, onGrant, onClose }: {
  token: () => Promise<string | null>;
  onGrant: (a: VerificationApplicant, note: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [term, setTerm] = React.useState('');
  const [matches, setMatches] = React.useState<VerificationApplicant[] | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [picked, setPicked] = React.useState<VerificationApplicant | null>(null);
  const [why, setWhy] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = term.trim();
    if (q.length < 2) { setMatches(null); setSearching(false); return; }
    setSearching(true);
    // Typing a handle produces a request per keystroke otherwise. `live` drops
    // the answer to a search the reviewer has already typed past.
    let live = true;
    const t = setTimeout(async () => {
      const { matches: rows, error: err } = await searchAccounts(await token(), q);
      if (!live) return;
      setError(err ?? null);
      setMatches(rows ?? []);
      setSearching(false);
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [term, token]);

  const confirm = async () => {
    if (!picked) return;
    setBusy(true);
    try { await onGrant(picked, why.trim()); } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} width={560}>
      <ModalHead
        icon="check" iconColor="var(--sky)"
        title={picked ? `Verify @${picked.handle}?` : 'Verify an account'}
        sub={picked ? (picked.full_name ?? undefined) : 'Grant the badge without an application'}
        onClose={onClose}
      />

      {!picked ? (
        <div style={{ padding: '18px 24px 22px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
            <input
              autoFocus value={term} onChange={e => setTerm(e.target.value)}
              placeholder="Handle or name"
              style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg-2)', fontSize: 13.5, outline: 'none', color: 'var(--ink)' }}
            />
          </div>

          {error && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--clay)' }}>{error}</div>}

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {term.trim().length < 2 && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', padding: '8px 2px' }}>Type at least two characters.</div>
            )}
            {term.trim().length >= 2 && searching && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', padding: '8px 2px' }}>Searching…</div>
            )}
            {!searching && matches?.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', padding: '8px 2px' }}>No account matches that.</div>
            )}
            {!searching && matches?.map(a => (
              <button
                key={a.id}
                onClick={() => !a.verified && setPicked(a)}
                disabled={a.verified}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 10,
                  border: '1px solid var(--line)', background: 'var(--surface)', textAlign: 'left',
                  cursor: a.verified ? 'default' : 'pointer', opacity: a.verified ? .55 : 1, color: 'var(--ink)',
                }}
              >
                <Avatar src={a.avatar_url} name={a.full_name || a.handle} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.full_name || `@${a.handle}`}</div>
                  <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)' }}>
                    @{a.handle} · joined {dateLong(a.created_at)} · {a.followers.toLocaleString()} followers
                  </div>
                </div>
                {a.verified
                  ? <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--sky)' }}>already verified</span>
                  : <Icon name="chevron" size={15} color="var(--ink-4)" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: '18px 24px 0' }}>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>
              The tick goes on their profile immediately and appears next to their name everywhere on Honua.
              They get a notification and the same email an approved applicant gets. This is recorded as an
              application you filed on their behalf, so the badge has your name against it.
            </p>
          </div>

          <div style={{ margin: '14px 0 0', border: '1px solid var(--line)', borderLeft: 'none', borderRight: 'none' }}>
            <Signals a={picked} />
          </div>

          <div style={{ padding: '16px 24px 0' }}>
            {picked.verified_actions === 0 && (
              <div style={{ marginBottom: 14, padding: '11px 14px', borderRadius: 10, background: sTint('var(--sun)'), color: 'var(--sun)', fontSize: 12.5, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <Icon name="bolt" size={14} />
                <span>This account has no vouched impact actions yet — one of the {VERIFICATION_CRITERIA.length} things reviewers weigh on an application.</span>
              </div>
            )}
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', marginBottom: 6 }}>
              WHY — KEPT ON THE RECORD
            </label>
            <textarea
              value={why} onChange={e => setWhy(e.target.value)} rows={3} maxLength={500}
              placeholder="Nobody else sees this, but the next admin looking at this badge will. What made you sure?"
              style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg-2)', fontSize: 13.5, lineHeight: 1.55, resize: 'vertical', outline: 'none', color: 'var(--ink)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px 22px' }}>
            <button className="btn btn-ghost" onClick={() => setPicked(null)} disabled={busy}>Back</button>
            <button className="btn btn-green" onClick={confirm} disabled={busy}>
              {busy ? 'Working…' : 'Verify and notify'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function DecisionModal({ req, decision, note, setNote, busy, onCancel, onConfirm }: any) {
  const handle = req.applicant?.handle ? `@${req.applicant.handle}` : 'this account';
  const approve = decision === 'approve';
  const revoke = decision === 'revoke';
  const accent = approve ? 'var(--sky)' : 'var(--clay)';

  return (
    <Modal onClose={onCancel} width={520}>
      <ModalHead
        icon={approve ? 'check' : revoke ? 'lock' : 'close'}
        iconColor={accent}
        title={approve ? `Verify ${handle}?` : revoke ? `Remove ${handle}'s badge?` : `Decline ${handle}?`}
        sub={req.applicant?.full_name ?? undefined}
        onClose={onCancel}
      />
      <div style={{ padding: '18px 24px 0' }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>
          {approve
            ? <>The tick goes on their profile immediately and appears next to their name everywhere on Honua. They get a notification and an email explaining what the badge means. Only an admin can take it back.</>
            : revoke
              ? <>The tick comes off their profile immediately. They get a notification with the reason you give below, and the removal is recorded next to the decision that granted it.</>
              : <>Their application closes and they get a notification and an email with the reason you write below. They can apply again.</>}
        </p>

        {approve && req.applicant?.verified_actions === 0 && (
          <div style={{ marginTop: 14, padding: '11px 14px', borderRadius: 10, background: sTint('var(--sun)'), color: 'var(--sun)', fontSize: 12.5, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <Icon name="bolt" size={14} />
            <span>This account has no vouched impact actions yet — one of the things reviewers are meant to weigh.</span>
          </div>
        )}

        <label style={{ display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', marginTop: 18, marginBottom: 6 }}>
          {approve ? 'NOTE FOR THE RECORD (OPTIONAL)' : 'REASON — SENT TO THE ACCOUNT'}
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={approve
            ? 'What confirmed it — the page you checked, the registry entry, the person who vouched.'
            : revoke
              ? 'What changed.'
              : "What they'd need to change. This is the only thing they'll have to go on."}
          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg-2)', fontSize: 13.5, lineHeight: 1.55, resize: 'vertical', outline: 'none', color: 'var(--ink)' }}
        />
        {!approve && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-4)' }}>
            The email also lists what reviewers look for: {VERIFICATION_CRITERIA.length} criteria, unchanged from the ones shown when applying.
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px 22px' }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button
          className={approve ? 'btn btn-green' : 'btn'}
          style={approve ? undefined : { background: 'var(--clay)', color: '#fff' }}
          onClick={onConfirm}
          disabled={busy || (!approve && !note.trim())}
        >
          {busy ? 'Working…' : approve ? 'Verify and notify' : revoke ? 'Revoke badge' : 'Decline and notify'}
        </button>
      </div>
    </Modal>
  );
}
