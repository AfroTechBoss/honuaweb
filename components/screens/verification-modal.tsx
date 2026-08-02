"use client";
import React from "react";
import { Icon, Modal, ModalHead, useApp } from "@/components/shared";
import { ModalFoot } from "./desktop-misc";
import {
  VERIFICATION_CATEGORIES,
  getMyVerificationRequest,
  submitVerificationRequest,
  type VerificationRequest,
} from "@/lib/verification";
import {
  VERIFICATION_MEANS,
  VERIFICATION_CRITERIA,
  VERIFICATION_IS_NOT,
  VERIFICATION_SLA,
} from "@/lib/verification-copy";

// --- Apply for verification ---
// Deliberately not one long form. Step one is the write-up: what the badge is,
// what a reviewer looks for, what it isn't. Someone who reads that and decides
// they don't qualify yet has saved a reviewer a read, which is the cheapest
// place in the whole queue to lose an application.
//
// Lives in its own file rather than modals.tsx, which is already ~2000 lines.

const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 13px', fontSize: 14, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none' };
const lab: React.CSSProperties = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', display: 'block', marginBottom: 5 };
const hint: React.CSSProperties = { fontSize: 12, color: 'var(--ink-4)', marginTop: 5, lineHeight: 1.5 };

function fmtDate(v?: string | null) {
  return v ? new Date(v).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
}

export function MVerifyRequest({ data, close }: { data?: any; close: () => void }) {
  const app = useApp();
  const userId: string | undefined = app.user?.id;

  // The caller usually already has the row (the settings page shows its status
  // in a row of its own), but fetch as a fallback so the modal is correct on
  // its own — and so a stale prop can't offer a second application to someone
  // who already has one open.
  const [request, setRequest] = React.useState<VerificationRequest | null>(data?.request ?? null);
  const [loading, setLoading] = React.useState(data?.request === undefined);

  const [step, setStep] = React.useState<'about' | 'form' | 'done'>('about');
  const [category, setCategory] = React.useState('');
  const [realName, setRealName] = React.useState(app.user?.name || '');
  const [links, setLinks] = React.useState('');
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data?.request !== undefined || !userId) { setLoading(false); return; }
    let alive = true;
    getMyVerificationRequest(userId).then(r => { if (alive) { setRequest(r); setLoading(false); } });
    return () => { alive = false; };
  }, [userId, data?.request]);

  const submit = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const row = await submitVerificationRequest(userId, { category, real_name: realName, links, note });
      setRequest(row);
      setStep('done');
      data?.onSubmitted?.(row);
    } catch (e: any) {
      setError(e?.message || 'Could not send your application. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <Modal onClose={close} width={520}>
        <ModalHead icon="check" iconColor="var(--sky)" title="Verification" onClose={close} />
        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 13, width: `${90 - i * 12}%`, borderRadius: 6, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      </Modal>
    );
  }

  // ── Just submitted ─────────────────────────────────────────
  if (step === 'done') {
    return (
      <Modal onClose={close} width={520}>
        <ModalHead icon="check" iconColor="var(--green)" title="Application sent" sub="It's in the review queue." onClose={close} />
        <div style={{ padding: '18px 24px 0' }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            A person reads every application — nothing here is decided automatically. {VERIFICATION_SLA}
          </p>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-3)' }}>
            You'll get a notification and an email either way. If it's declined you'll be told why,
            and you can apply again once you've dealt with the reason.
          </p>
        </div>
        <ModalFoot>
          <button className="btn btn-green" onClick={close}>Done</button>
        </ModalFoot>
      </Modal>
    );
  }

  // ── An application is already open ─────────────────────────
  if (request?.status === 'pending') {
    return (
      <Modal onClose={close} width={520}>
        <ModalHead icon="clock" iconColor="var(--sun)" title="Application under review" sub={fmtDate(request.created_at) ? `Sent ${fmtDate(request.created_at)}` : undefined} onClose={close} />
        <div style={{ padding: '18px 24px 0' }}>
          <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            {VERIFICATION_SLA} You'll get a notification and an email as soon as it's decided.
          </p>
          <Submitted request={request} />
        </div>
        <ModalFoot>
          <button className="btn btn-green" onClick={close}>Close</button>
        </ModalFoot>
      </Modal>
    );
  }

  // ── Already verified ───────────────────────────────────────
  if (app.user?.verified) {
    return (
      <Modal onClose={close} width={520}>
        <ModalHead icon="check" iconColor="var(--sky)" title="You're verified" onClose={close} />
        <div style={{ padding: '18px 24px 0' }}>
          <Means />
        </div>
        <ModalFoot>
          <button className="btn btn-green" onClick={close}>Done</button>
        </ModalFoot>
      </Modal>
    );
  }

  // ── The write-up, and the form behind it ───────────────────
  if (step === 'about') {
    const declined = request?.status === 'rejected';
    return (
      <Modal onClose={close} width={520}>
        <ModalHead
          icon="check"
          iconColor="var(--sky)"
          title={declined ? 'Apply again' : 'Get verified'}
          sub="What the badge means, and what a reviewer looks for."
          onClose={close}
        />
        <div style={{ padding: '18px 24px 0' }}>

          {declined && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderLeft: '3px solid var(--clay)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', marginBottom: 5 }}>
                LAST APPLICATION DECLINED{fmtDate(request?.reviewed_at) ? ` · ${fmtDate(request?.reviewed_at)}` : ''}
              </div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                {request?.reviewer_note || 'No reason was recorded.'}
              </p>
            </div>
          )}

          <Means />

          <div style={{ borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 14 }}>
            <div style={{ ...lab, marginBottom: 8 }}>WHAT A REVIEWER LOOKS FOR</div>
            <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink-2)' }}>
              {VERIFICATION_CRITERIA.map(c => <li key={c}>{c}</li>)}
            </ul>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {VERIFICATION_IS_NOT.map(t => (
              <span key={t} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 20, padding: '4px 11px' }}>{t}</span>
            ))}
          </div>

          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: 'var(--ink-4)', lineHeight: 1.55 }}>
            {VERIFICATION_SLA} Every application is read by a person.
          </p>
        </div>
        <ModalFoot>
          <button className="btn btn-ghost" onClick={close}>Not now</button>
          <button className="btn btn-green" onClick={() => setStep('form')}>
            {declined ? 'Apply again' : 'Start application'}
          </button>
        </ModalFoot>
      </Modal>
    );
  }

  const ready = !!category && !!realName.trim() && !!links.trim() && note.trim().length >= 20;

  return (
    <Modal onClose={close} width={520}>
      <ModalHead icon="edit" iconColor="var(--sky)" title="Apply for verification" sub="A reviewer reads this as written." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>

        <div style={{ marginBottom: 14 }}>
          <label style={lab}>WHAT ARE YOU VERIFYING?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {VERIFICATION_CATEGORIES.map(c => {
              const on = category === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', borderRadius: 10, padding: '10px 12px',
                    background: on ? 'var(--green-tint)' : 'var(--bg-2)',
                    border: `1px solid ${on ? 'var(--green)' : 'var(--line)'}`,
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{c.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lab}>FULL LEGAL OR REGISTERED NAME</label>
          <input style={fld} value={realName} onChange={e => setRealName(e.target.value)} placeholder="The name on the record you're pointing us at" />
          <div style={hint}>This isn't published. It's only used to match you against the sources below.</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lab}>WHERE WE CAN CHECK</label>
          <textarea
            style={{ ...fld, minHeight: 72, resize: 'vertical' }}
            value={links}
            onChange={e => setLinks(e.target.value)}
            placeholder={"One link per line — a website, an about page, a registry entry, a press mention."}
          />
          <div style={hint}>At least one link that ties this account to the name above. Public pages only — we won't sign in anywhere.</div>
        </div>

        <div style={{ marginBottom: 4 }}>
          <label style={lab}>YOUR CASE</label>
          <textarea
            style={{ ...fld, minHeight: 96, resize: 'vertical' }}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Who you are, what you do on Honua, and why the links above are you."
          />
          <div style={{ ...hint, color: note.trim().length > 0 && note.trim().length < 20 ? 'var(--clay)' : 'var(--ink-4)' }}>
            {note.trim().length < 20 ? `A couple of sentences is enough — ${20 - note.trim().length} more characters.` : 'A couple of sentences is enough.'}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, background: 'var(--bg-2)', border: '1px solid var(--line)', borderLeft: '3px solid var(--clay)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--ink-2)', display: 'flex', gap: 8 }}>
            <Icon name="bolt" size={15} stroke={2} />
            <span>{error}</span>
          </div>
        )}
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={() => setStep('about')} disabled={saving}>Back</button>
        <button className="btn btn-green" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Sending…' : 'Send application'}
        </button>
      </ModalFoot>
    </Modal>
  );
}

// The same three points the approval email and the profile badge panel show.
function Means() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {VERIFICATION_MEANS.map(m => (
        <div key={m.title} style={{ display: 'flex', gap: 10 }}>
          <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, background: 'var(--sky-tint)', color: 'var(--sky)', display: 'grid', placeItems: 'center', marginTop: 1 }}>
            <Icon name="check" size={12} stroke={2.5} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{m.title}</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>{m.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Read-back of what's sitting in the queue, so "what did I actually say?" has
// an answer that doesn't involve asking a reviewer.
function Submitted({ request }: { request: VerificationRequest }) {
  const cat = VERIFICATION_CATEGORIES.find(c => c.value === request.category)?.label;
  const rows: [string, string | null][] = [
    ['CATEGORY', cat || request.category],
    ['NAME GIVEN', request.real_name],
    ['LINKS', request.links],
    ['YOUR CASE', request.note],
  ];
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '4px 14px' }}>
      {rows.filter(([, v]) => !!v).map(([k, v], i, arr) => (
        <div key={k} style={{ padding: '10px 0', borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--line)' }}>
          <div style={{ ...lab, marginBottom: 3 }}>{k}</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</div>
        </div>
      ))}
    </div>
  );
}
