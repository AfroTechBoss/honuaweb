"use client";
import React from "react";
import { Icon, Modal, ModalHead, SStat, SBadge, sTint, useApp } from "@/components/shared";
import { relativeTime } from "@/lib/admin-metrics";
import {
  listTickets, updateTicket, TICKET_STATUSES, EMPTY_COUNTS_BY_KIND,
  type SupportTicket, type TicketCountsByKind, type TicketStatus, type TicketKind,
} from "@/lib/admin-support";

// =====================================================================
// SUPPORT — everything filed from /support and /report
//
// This is a queue of people waiting, not a table of records. So the list
// leads with how long each one has been waiting and reads oldest-pressure
// first within the open filter; everything else is secondary to that.
//
// Two queues, one panel. They share a table and a workflow but not an
// audience: /support is billing and orders, /report is Trust & Safety and
// includes fraud allegations. Mixing them into one list would bury the
// second in the volume of the first, so they are tabs with their own counts
// — and inside Safety, severity outranks age in the sort.
// =====================================================================

const STATUS_HELP: Record<TicketStatus, string> = {
  open: 'Nobody has picked this up yet',
  pending: 'Replied — waiting on them',
  resolved: 'Answered, and the answer worked',
  closed: 'No longer actionable',
};

const KINDS: { key: TicketKind; label: string; icon: string; empty: string; blurb: string }[] = [
  {
    key: 'support', label: 'Support', icon: 'msg',
    empty: 'Nobody has written in',
    blurb: "Messages sent from /support land here the moment they're filed.",
  },
  {
    key: 'report', label: 'Safety reports', icon: 'flag',
    empty: 'No reports filed',
    blurb: 'Trust & Safety reports from /report land here, worst first.',
  },
];

// 'pending' is already taken in the shared status vocabulary, where it means
// waiting on *us*. Here it means the opposite, so the badge is drawn from a
// distinct token rather than quietly redefining the shared one.
const badgeKey = (s: TicketStatus) => (s === 'pending' ? 'awaiting-reply' : s);

type Severity = { label: string; color: string; rank: number };
const SEVERITY: Record<string, Severity | undefined> = {
  high:   { label: 'High',   color: 'var(--clay)',  rank: 0 },
  medium: { label: 'Medium', color: 'var(--sun)',   rank: 1 },
  low:    { label: 'Low',    color: 'var(--ink-3)', rank: 2 },
};
// Unset sorts last but not silently — a report with no severity is a bug in the
// form, not a low-priority report, so it shows as an em dash rather than 'Low'.
const rankOf = (t: SupportTicket) => SEVERITY[t.severity ?? '']?.rank ?? 3;

// How long someone has been waiting, in the units that change the reading. An
// open ticket at 30 hours is a different object than one at 30 minutes, and
// "2d ago" buried in a timestamp column doesn't say so loudly enough.
function waitedFor(iso: string) {
  const hours = (Date.now() - Date.parse(iso)) / 3_600_000;
  if (!Number.isFinite(hours)) return { text: '—', tone: 'var(--ink-4)' };
  if (hours < 1) return { text: `${Math.max(1, Math.round(hours * 60))}m`, tone: 'var(--ink-3)' };
  if (hours < 24) return { text: `${Math.round(hours)}h`, tone: 'var(--ink-3)' };
  const days = Math.round(hours / 24);
  // Two business days is what the form promises. Past it, the row says so.
  return { text: `${days}d`, tone: days >= 2 ? 'var(--clay)' : 'var(--sun)' };
}

export function AdminSupport({ getToken, log, onCounts }) {
  const app = useApp();
  // null = still loading. [] means the queue is genuinely empty.
  const [tickets, setTickets] = React.useState<SupportTicket[] | null>(null);
  const [counts, setCounts] = React.useState<TicketCountsByKind>(EMPTY_COUNTS_BY_KIND);
  const [available, setAvailable] = React.useState(true);
  const [countsOk, setCountsOk] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<TicketKind>('support');
  const [filter, setFilter] = React.useState<string>('open');
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState<SupportTicket | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  // Privy hands back a fresh function each render; hold it in a ref so loading
  // doesn't retrigger on every re-render.
  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    try { return await tokenRef.current(); } catch { return null; }
  }, []);

  // Lifted so the rail badge and this panel read the same number — the console
  // already had a section where the badge said 4 and the panel said 0.
  const countsRef = React.useRef(onCounts);
  countsRef.current = onCounts;

  // Filtered server-side rather than in the browser. The route caps a read at
  // 300 rows, and with one shared cap a busy support queue would quietly push
  // safety reports off the end of the list.
  const load = React.useCallback(async (k: TicketKind) => {
    const { tickets: rows, counts: c, available: ok, countsAvailable, error } =
      await listTickets(await token(), { kind: k, status: 'all' });
    if (error) { setLoadError(error); setTickets([]); return; }
    setLoadError(null);
    setAvailable(ok !== false);
    setCountsOk(countsAvailable !== false);
    setTickets(rows ?? []);
    if (c) setCounts(c);
  }, [token]);

  React.useEffect(() => { setTickets(null); load(kind); }, [load, kind]);

  // The rail badge is told the rollup from an effect, never from inside a
  // setCounts updater — those run during render, and calling the parent's
  // setState from there is the "cannot update a component while rendering a
  // different component" warning. Held until a load resolves so the opening
  // zero doesn't blank a badge the rail had already filled in.
  const openAll = counts.all.open;
  const loaded = tickets !== null;
  React.useEffect(() => { if (loaded) countsRef.current?.(openAll); }, [loaded, openAll]);

  const list = tickets ?? [];
  const loading = tickets === null;
  const isReport = kind === 'report';
  const c = counts[kind];

  const shown = list.filter(t => {
    const byStatus = filter === 'all' || t.status === filter;
    const term = q.trim().toLowerCase();
    const hit = !term || [t.ref, t.subject, t.email, t.category, t.orderRef, t.message]
      .some(v => (v ?? '').toLowerCase().includes(term));
    return byStatus && hit;
  });

  // Within the open queue, oldest first — the person who has waited longest is
  // the one to answer next. Reports break that tie with severity ahead of age,
  // which is the entire reason the reporter was asked to set it: a suspected
  // fraud filed this morning outranks a wrong-size complaint from Tuesday.
  // Everywhere else, newest first, because those lists are read as history
  // rather than worked through.
  const ordered = filter !== 'open' ? shown : [...shown].sort((a, b) =>
    (isReport ? rankOf(a) - rankOf(b) : 0) || Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

  const openTicket = async (t: SupportTicket) => {
    setOpen(t);
    if (t.seen) return;
    // Marking read is a side effect of looking, so it is fire-and-forget and
    // never blocks the modal or surfaces an error. If it fails the badge stays
    // up, which is the safe direction to fail.
    const jwt = await token();
    updateTicket(jwt, t.id, { seen: true }).then(({ ticket }) => {
      if (ticket) setTickets(ts => (ts ?? []).map(x => x.id === ticket.id ? ticket : x));
    }).catch(() => {});
  };

  const move = async (t: SupportTicket, status: TicketStatus) => {
    setBusy(t.id);
    try {
      const { ticket, error } = await updateTicket(await token(), t.id, { status });
      if (error || !ticket) {
        app.toast?.({ msg: "Couldn't update that ticket", sub: error, kind: 'error', icon: 'close' });
        return;
      }
      setTickets(ts => (ts ?? []).map(x => x.id === ticket.id ? ticket : x));
      setOpen(o => o && o.id === ticket.id ? ticket : o);
      // Both the ticket's own queue and the rollup, or the rail badge drifts
      // from the tab it sits next to.
      setCounts(prev => {
        const next = { ...prev };
        for (const bucket of ['all', ticket.kind] as const) {
          const b = { ...next[bucket] };
          b[t.status] = Math.max(0, b[t.status] - 1);
          b[status] = b[status] + 1;
          next[bucket] = b;
        }
        return next;
      });
      log?.(`marked ${ticket.kind === 'report' ? 'safety report' : 'support ticket'} ${status}`,
        ticket.ref, status === 'resolved' ? 'check' : 'msg');
      app.toast?.({
        msg: `${ticket.ref} → ${status}`, sub: STATUS_HELP[status],
        kind: status === 'resolved' ? 'success' : undefined, icon: ticket.kind === 'report' ? 'flag' : 'msg',
      });
    } finally { setBusy(null); }
  };

  const saveNote = async (t: SupportTicket, note: string) => {
    setBusy(t.id);
    try {
      const { ticket, error } = await updateTicket(await token(), t.id, { adminNote: note });
      if (error || !ticket) {
        app.toast?.({ msg: "Couldn't save that note", sub: error, kind: 'error', icon: 'close' });
        return;
      }
      setTickets(ts => (ts ?? []).map(x => x.id === ticket.id ? ticket : x));
      setOpen(ticket);
      app.toast?.({ msg: 'Note saved', sub: ticket.ref, icon: 'pencil' });
    } finally { setBusy(null); }
  };

  const TABS: [string, string, number][] = [
    ['open', 'Open', c.open],
    ['pending', 'Waiting on them', c.pending],
    ['resolved', 'Resolved', c.resolved],
    ['closed', 'Closed', c.closed],
    ['all', 'All', c.total],
  ];

  // Severity earns a column only where it means something.
  const COLS = isReport
    ? '96px 1.6fr 1fr 0.9fr 76px 76px 118px'
    : '96px 1.9fr 1.1fr 0.9fr 84px 118px';
  const unknown = loading || !!loadError || !countsOk;

  return (
    <div>
      {/* ---- Which queue ---- */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {KINDS.map(k => {
          const on = kind === k.key;
          const n = counts[k.key].open;
          return (
            <button
              key={k.key}
              onClick={() => { setKind(k.key); setFilter('open'); setQ(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px',
                borderRadius: 12, cursor: 'pointer', fontFamily: 'Satoshi, sans-serif',
                fontSize: 13.5, fontWeight: on ? 700 : 500,
                border: '1px solid ' + (on ? 'var(--green)' : 'var(--line)'),
                background: on ? sTint('var(--green)') : 'var(--surface)',
                color: on ? 'var(--green)' : 'var(--ink-2)',
              }}
            >
              <Icon name={k.icon} size={15} />
              {k.label}
              {n > 0 && (
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: 11.5, fontWeight: 700,
                  padding: '1px 7px', borderRadius: 999,
                  background: k.key === 'report' ? 'var(--clay)' : 'var(--green)', color: '#fff',
                }}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <SStat label="Open" value={unknown ? '—' : c.open} icon={isReport ? 'flag' : 'msg'}
          accent={isReport ? 'var(--clay)' : 'var(--sun)'}
          sub={unknown ? '' : c.open === 0 ? 'nobody waiting' : isReport ? 'awaiting investigation' : 'awaiting a first reply'} />
        <SStat label="Waiting on sender" value={unknown ? '—' : c.pending} icon="clock" accent="var(--sky)"
          sub={unknown ? '' : 'replied, no answer yet'} />
        <SStat label="Last 24 hours" value={unknown ? '—' : c.last24h} icon="bolt"
          sub={unknown ? '' : isReport ? 'new reports' : 'new messages'} />
        <SStat label="Resolved" value={unknown ? '—' : c.resolved} icon="check" accent="var(--green-2)"
          sub={unknown ? '' : `${c.closed} closed without action`} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map(([k, label, n]) => (
            <button key={k} onClick={() => setFilter(k)} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
              {label} <span style={{ fontFamily: 'JetBrains Mono', opacity: .65 }}>· {unknown ? '—' : n}</span>
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', minWidth: 260 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search ref, subject, email, order" style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none' }} />
          </div>
          <button className="btn btn-ghost" onClick={() => { setTickets(null); load(kind); }} style={{ flexShrink: 0 }}>
            <Icon name="clock" size={14} /> Refresh
          </button>
        </div>
      </div>

      {loadError && (
        <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)'), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="flag" size={15} />
          <span style={{ flex: 1 }}>{loadError}</span>
          <button className="btn btn-ghost" onClick={() => { setTickets(null); load(kind); }} style={{ fontSize: 12, padding: '5px 11px' }}>Retry</button>
        </div>
      )}

      {/* The table missing is a different problem from the queue being empty,
          and it has a different fix. Say which one it is. */}
      {!loading && !loadError && !available && (
        <Notice>
          The support_tickets table doesn't exist yet — apply <strong>supabase/migrations/037_support_tickets.sql</strong>. Until then, messages sent from /support and /report are refused rather than lost.
        </Notice>
      )}

      {!loading && !loadError && available && !countsOk && (
        <Notice>
          The tickets below are real, but the totals can't be read — apply <strong>supabase/migrations/038_support_counts_by_kind.sql</strong> to split counts by queue.
        </Notice>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
          <span>REF</span><span>SUBJECT</span><span>FROM</span><span>{isReport ? 'TYPE' : 'CATEGORY'}</span>
          {isReport && <span>SEVERITY</span>}
          <span style={{ textAlign: 'right' }}>WAITING</span><span>STATUS</span>
        </div>

        {loading && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>Loading the queue…</div>}

        {!loading && loadError && (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>The queue couldn't be loaded.</div>
        )}

        {!loading && !loadError && list.length === 0 && (
          <div style={{ padding: '54px 32px', textAlign: 'center' }}>
            <Icon name={isReport ? 'flag' : 'msg'} size={28} color="var(--ink-3)" />
            <div style={{ marginTop: 10, fontWeight: 600 }}>{KINDS.find(k => k.key === kind)!.empty}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{KINDS.find(k => k.key === kind)!.blurb}</div>
          </div>
        )}

        {!loading && list.length > 0 && ordered.length === 0 && (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>No tickets match.</div>
        )}

        {ordered.map(t => {
          const wait = waitedFor(t.createdAt);
          const live = t.status === 'open' || t.status === 'pending';
          const sev = SEVERITY[t.severity ?? ''];
          return (
            <button
              key={t.id}
              onClick={() => openTicket(t)}
              style={{
                display: 'grid', gridTemplateColumns: COLS, gap: 12, width: '100%',
                padding: '13px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center',
                background: 'transparent', border: 'none', borderBottomStyle: 'solid',
                textAlign: 'left', cursor: 'pointer', fontFamily: 'Satoshi',
                opacity: live ? 1 : 0.62,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                {/* Unread marker. A ticket nobody has opened is the one thing
                    on this row you can't recover by reading the other columns. */}
                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: t.seen ? 'transparent' : 'var(--green)' }} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--ink-3)' }}>{t.ref}</span>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: t.seen ? 500 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.message}</span>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.email}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                  {t.userId ? 'account' : 'no account'}{t.orderRef ? ` · ${t.orderRef}` : ''}
                </span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.category}</span>
              {isReport && (
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', color: sev?.color ?? 'var(--ink-4)' }}>
                  {sev?.label ?? '—'}
                </span>
              )}
              <span className="tabular" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: live ? wait.tone : 'var(--ink-4)' }}>
                {live ? wait.text : '—'}
              </span>
              <span><SBadge status={badgeKey(t.status)} size="sm" /></span>
            </button>
          );
        })}
      </div>

      {open && (
        <TicketDetail
          ticket={open}
          busy={busy === open.id}
          onClose={() => setOpen(null)}
          onMove={s => move(open, s)}
          onNote={n => saveNote(open, n)}
        />
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: sTint('var(--sun)'), border: '1px solid ' + sTint('var(--sun)', 30), color: 'var(--sun)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon name="alert" size={15} />
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

// ---- One message, and what to do about it -------------------------------
function TicketDetail({ ticket, busy, onClose, onMove, onNote }) {
  const t: SupportTicket = ticket;
  const [note, setNote] = React.useState(t.adminNote ?? '');
  React.useEffect(() => { setNote(t.adminNote ?? ''); }, [t.id, t.adminNote]);

  const isReport = t.kind === 'report';
  const sev = SEVERITY[t.severity ?? ''];

  // The reply happens in a mail client, not here — there is no outbound thread
  // in this table and pretending otherwise is how the original form went wrong.
  // So the primary action is a mailto that arrives pre-addressed and
  // pre-referenced, and the status buttons record what came of it.
  const mailto =
    `mailto:${encodeURIComponent(t.email)}` +
    `?subject=${encodeURIComponent(`Re: ${t.subject} [${t.ref}]`)}` +
    `&body=${encodeURIComponent(`\n\n---\nYour ${isReport ? 'report to Honua Trust & Safety' : 'message to Honua support'} (${t.ref}):\n\n${t.message}\n`)}`;

  return (
    <Modal onClose={onClose} width={640}>
      <ModalHead
        icon={isReport ? 'flag' : 'msg'}
        iconColor={isReport ? 'var(--clay)' : 'var(--green)'}
        title={t.subject}
        onClose={onClose}
        sub={`${t.ref} · ${t.category} · filed ${relativeTime(t.createdAt)}`}
      />
      <div style={{ padding: '0 24px', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SBadge status={badgeKey(t.status)} />
          {isReport && (
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', padding: '4px 11px', borderRadius: 999, color: sev?.color ?? 'var(--ink-3)', background: sTint(sev?.color ?? 'var(--ink-3)') }}>
              {sev ? `${sev.label} severity` : 'No severity set'}
            </span>
          )}
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{STATUS_HELP[t.status]}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Reply to" value={t.email} mono />
          <Field label="Order reference" value={t.orderRef || '—'} mono />
          <Field label="Account" value={t.userId ? 'Signed in when sent' : 'Not signed in'} />
          <Field label="Last moved by" value={t.handledBy ? t.handledBy.slice(0, 24) + '…' : 'Nobody yet'} mono />
        </div>

        <div>
          <span className="fld-label">{isReport ? 'What happened' : 'Message'}</span>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', maxHeight: 260, overflowY: 'auto' }}>
            {t.message}
          </div>
        </div>

        <div>
          <span className="fld-label">Internal note</span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="What was done, what it's blocked on — visible to admins only."
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13.5, fontFamily: 'Satoshi, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
          {note !== (t.adminNote ?? '') && (
            <button className="btn btn-ghost" onClick={() => onNote(note)} disabled={busy} style={{ marginTop: 8, fontSize: 12.5, padding: '6px 12px' }}>
              {busy ? 'Saving…' : 'Save note'}
            </button>
          )}
        </div>

        <a href={mailto} className="btn btn-green" style={{ justifyContent: 'center', padding: '11px', textDecoration: 'none' }}>
          <Icon name="msg" size={15} /> Reply by email
        </a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '20px 24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TICKET_STATUSES.filter(s => s !== t.status).map(s => (
            <button key={s} className="btn btn-ghost" onClick={() => onMove(s)} disabled={busy}
              title={STATUS_HELP[s]}
              style={{ fontSize: 12.5, padding: '6px 12px', ...(s === 'resolved' ? { color: 'var(--green)' } : {}) }}>
              {s === 'open' ? 'Reopen' : s === 'pending' ? 'Waiting on them' : s === 'resolved' ? 'Resolved' : 'Close'}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="fld-label">{label}</span>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: mono ? 'JetBrains Mono' : undefined, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}
