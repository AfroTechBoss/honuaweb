"use client";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/shared";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SUPPORT_CATEGORIES, REPORT_CATEGORIES, SUPPORT_LIMITS, submitSupportTicket, type ReportSeverity } from "@/lib/support";
import { APPEAL_KINDS, APPEAL_KIND_VALUES, ACCOUNT_LEVEL_KINDS, APPEAL_LIMITS, submitAppeal } from "@/lib/appeals";

// ---- Shared nav ----
function PageNav({ back, backLabel = 'Back' }: { back: string; backLabel?: string }) {
  const router = useRouter();
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg)', borderBottom: '1px solid var(--line)', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button onClick={() => router.push(back)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13.5, padding: 0 }}>
        <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={15} /></span>
        {backLabel}
      </button>
      <Link href="/" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--ink)', textDecoration: 'none', fontFamily: 'Lora, serif' }}>Honua</Link>
      <div style={{ width: 80 }} />
    </header>
  );
}

// ---- Field components ----
const fldStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--line)',
  background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, fontFamily: 'Satoshi, sans-serif',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s',
};
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>;
}

// =====================================================================
// Contact Support page
// =====================================================================
export function ContactSupportPage() {
  const router = useRouter();
  const params = useSearchParams();
  const orderRef = params.get('order') || '';

  const [subject, setSubject] = React.useState('');
  const [category, setCategory] = React.useState('Order issue');
  const [order, setOrder] = React.useState(orderRef);
  const [message, setMessage] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const CATEGORIES = SUPPORT_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    // The page is public — anyone locked out of their account can still write
    // in — so a session is a bonus, not a requirement. When there is one, the
    // token lets the server attach the ticket to the account.
    let token: string | null = null;
    try {
      token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
    } catch { /* anonymous ticket */ }

    const { ref, error: err } = await submitSupportTicket(
      { email, category, subject, message, orderRef: order }, token,
    );
    setSending(false);

    // Only claim it was sent if it was. The success screen used to appear
    // unconditionally after a 1.1s timer, which is how people ended up waiting
    // on replies to messages that had never been stored anywhere.
    if (err || !ref) { setError(err ?? "We couldn't file your message. Please try again."); return; }
    setSent(ref);
  };

  const backHref = orderRef ? `/orders/${orderRef}` : '/orders';

  if (sent) {
    return (
      <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <PageNav back={backHref} backLabel="Back to order" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--green-tint)', border: '2px solid var(--green)', display: 'grid', placeItems: 'center' }}>
            <Icon name="check" size={28} color="var(--green)" stroke={2.5} />
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Message sent</h2>
            <p style={{ color: 'var(--ink-3)', fontSize: 15, margin: 0, lineHeight: 1.6, maxWidth: 340 }}>
              We'll get back to you within 2 business days at <strong>{email}</strong>.
            </p>
          </div>
          {/* The reference the database assigned. Worth showing because it is
              what support will ask for, and because it is evidence the message
              exists somewhere other than this screen. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em' }}>REFERENCE</span>
            <span style={{ fontSize: 14, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{sent}</span>
          </div>
          <button className="btn btn-ghost" onClick={() => router.push(backHref)} style={{ marginTop: 4 }}>
            Back to {orderRef ? 'order' : 'orders'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <PageNav back={backHref} backLabel={orderRef ? 'Back to order' : 'My orders'} />

      <main style={{ flex: 1, maxWidth: 620, margin: '0 auto', width: '100%', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Contact support</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            We typically respond within 2 business days. For urgent order issues, include your order ID.
          </p>
        </div>

        {/* Response time badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 32 }}>
          {[['clock', '< 2 days', 'Typical response'], ['check', '24/7', 'Ticket tracking'], ['lock', 'Secure', 'Encrypted messages']].map(([icon, title, sub]) => (
            <div key={title} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Icon name={icon} size={16} color="var(--green)" />
              <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{sub}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
          <div>
            <Label>Your email</Label>
            <input style={fldStyle} className="fld" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div>
            <Label>Category</Label>
            <select style={fldStyle} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <Label>Order reference <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></Label>
            <input style={fldStyle} placeholder="ORD-XXXXXX" value={order} onChange={e => setOrder(e.target.value)} maxLength={SUPPORT_LIMITS.orderRef} />
          </div>

          <div>
            <Label>Subject</Label>
            <input style={fldStyle} placeholder="Brief description of your issue" value={subject} onChange={e => setSubject(e.target.value)} required maxLength={SUPPORT_LIMITS.subject} />
          </div>

          <div>
            <Label>Message</Label>
            <textarea style={{ ...fldStyle, resize: 'vertical', minHeight: 140 }} placeholder="Please describe your issue in detail — the more context, the faster we can help." value={message} onChange={e => setMessage(e.target.value)} required rows={5} maxLength={SUPPORT_LIMITS.message} />
            {/* Only once it's close enough to matter — a counter on an empty box
                reads as a limit to write up to rather than one to stay under. */}
            {message.length > SUPPORT_LIMITS.message * 0.8 && (
              <div style={{ marginTop: 6, fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', textAlign: 'right' }}>
                {SUPPORT_LIMITS.message - message.length} characters left
              </div>
            )}
          </div>

          {error && (
            <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--clay) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--clay) 30%, transparent)', color: 'var(--clay)', fontSize: 13.5, lineHeight: 1.55 }}>
              <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name="alert" size={15} /></span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={sending} className="btn btn-primary" style={{ justifyContent: 'center', padding: '14px', fontSize: 15, fontWeight: 700, opacity: sending ? 0.7 : 1 }}>
            {sending ? 'Sending…' : <><Icon name="msg" size={16} /> Send message</>}
          </button>
        </form>

        {/* Alt contact */}
        <div style={{ marginTop: 32, padding: 20, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface)' }}>
          <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 12 }}>OR REACH US DIRECTLY</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {[['support@honua.green', 'General support & orders'], ['trust@honua.green', 'Disputes & safety']].map(([email, label]) => (
              <div key={email} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <Icon name="msg" size={14} color="var(--green)" />
                <a href={`mailto:${email}`} style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 500 }}>{email}</a>
                <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>— {label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// =====================================================================
// Report an Issue page
// =====================================================================
export function ReportIssuePage() {
  const router = useRouter();
  const params = useSearchParams();
  const orderRef = params.get('order') || '';

  const [issueType, setIssueType] = React.useState<string>(REPORT_CATEGORIES[0]);
  const [order, setOrder] = React.useState(orderRef);
  const [email, setEmail] = React.useState('');
  const [severity, setSeverity] = React.useState<ReportSeverity>('medium');
  const [description, setDescription] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const ISSUE_TYPES = REPORT_CATEGORIES;
  const SEVERITIES: { key: ReportSeverity; label: string; desc: string; color: string }[] = [
    { key: 'low',    label: 'Low',    desc: 'Minor issue, no urgent action needed', color: '#15803d' },
    { key: 'medium', label: 'Medium', desc: 'Needs attention but not time-critical', color: '#b45309' },
    { key: 'high',   label: 'High',   desc: 'Urgent — financial loss or safety risk',  color: '#dc2626' },
  ];

  const backHref = orderRef ? `/orders/${orderRef}` : '/orders';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    let token: string | null = null;
    try {
      token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
    } catch { /* anonymous report */ }

    const { ref, error: err } = await submitSupportTicket({
      kind: 'report',
      email,
      category: issueType,
      // The form has no subject field on purpose — a Trust & Safety report is
      // already slow to write and one more box before "what happened" is one
      // more reason to abandon it. The issue type and the order it concerns are
      // what an admin scans the queue by, so that is the line they get.
      subject: order ? `${issueType} — ${order}` : issueType,
      message: description,
      orderRef: order,
      severity,
    }, token);
    setSending(false);

    if (err || !ref) { setError(err ?? "We couldn't file your report. Please try again."); return; }
    setSent(ref);
  };

  if (sent) {
    return (
      <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <PageNav back={backHref} backLabel="Back to order" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(220,38,38,.08)', border: '2px solid rgba(220,38,38,.3)', display: 'grid', placeItems: 'center' }}>
            <Icon name="flag" size={28} color="#dc2626" stroke={2} />
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Report submitted</h2>
            <p style={{ color: 'var(--ink-3)', fontSize: 15, margin: '0 0 10px', lineHeight: 1.6, maxWidth: 340 }}>
              Our Trust &amp; Safety team will investigate and follow up at <strong>{email}</strong> — within 24 hours for high-severity reports, 3 days for others.
            </p>
            {/* The reference the database assigned. This used to be
                Math.random(), shown to people who would then quote a number
                that matched nothing. */}
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>Ticket {sent}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => router.push(backHref)} style={{ marginTop: 4 }}>
            Back to {orderRef ? 'order' : 'orders'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <PageNav back={backHref} backLabel={orderRef ? 'Back to order' : 'My orders'} />

      <main style={{ flex: 1, maxWidth: 620, margin: '0 auto', width: '100%', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Report an issue</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            Help us investigate. Our Trust & Safety team reviews every report.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
          {/* The form used to collect no way of reaching the reporter, while
              promising them a follow-up. */}
          <div>
            <Label>Your email</Label>
            <input style={fldStyle} className="fld" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required maxLength={SUPPORT_LIMITS.email} />
          </div>

          <div>
            <Label>Issue type</Label>
            <select style={fldStyle} value={issueType} onChange={e => setIssueType(e.target.value)}>
              {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <Label>Order reference <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(if applicable)</span></Label>
            <input style={fldStyle} placeholder="ORD-XXXXXX" value={order} onChange={e => setOrder(e.target.value)} maxLength={SUPPORT_LIMITS.orderRef} />
          </div>

          <div>
            <Label>Severity</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {SEVERITIES.map(s => (
                <button
                  key={s.key} type="button"
                  onClick={() => setSeverity(s.key)}
                  style={{
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'Satoshi, sans-serif',
                    border: `2px solid ${severity === s.key ? s.color : 'var(--line)'}`,
                    background: severity === s.key ? `${s.color}12` : 'var(--surface)',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 3, lineHeight: 1.4 }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>What happened?</Label>
            <textarea
              style={{ ...fldStyle, resize: 'vertical', minHeight: 160 }}
              placeholder="Describe the issue in detail — what you ordered, what arrived or didn't arrive, what you expected, and any steps you've already taken."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required rows={6} maxLength={SUPPORT_LIMITS.message}
            />
            {description.length > SUPPORT_LIMITS.message * 0.8 && (
              <div style={{ marginTop: 6, fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', textAlign: 'right' }}>
                {SUPPORT_LIMITS.message - description.length} characters left
              </div>
            )}
          </div>

          {/* What happens next */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 10 }}>WHAT HAPPENS NEXT</div>
            {[
              ['check', 'We review your report', 'Usually within 24–72 hours depending on severity'],
              ['msg', 'We contact the seller', 'They have 48 hours to respond'],
              ['award', 'Resolution', 'Refund, replacement, or dismissal with explanation'],
            ].map(([icon, title, sub]) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name={icon} size={13} color="var(--green)" stroke={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 1 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--clay) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--clay) 30%, transparent)', color: 'var(--clay)', fontSize: 13.5, lineHeight: 1.55 }}>
              <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name="alert" size={15} /></span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={sending} className="btn btn-primary" style={{ justifyContent: 'center', padding: '14px', fontSize: 15, fontWeight: 700, opacity: sending ? 0.7 : 1 }}>
            {sending ? 'Submitting…' : <><Icon name="flag" size={16} /> Submit report</>}
          </button>
        </form>
      </main>
    </div>
  );
}

// =====================================================================
// Appeal a decision page
// =====================================================================
//
// Sits alongside /support and /report in middleware's PUBLIC_PATHS, and for a
// sharper reason than either: everyone who arrives here has just been
// restricted. A suspended account cannot write to twenty-eight tables under
// migration 041 and a banned one may not hold a session at all, so this form
// asks for no session, and the route behind it inserts with the service-role
// key where neither RLS nor the freeze applies.
//
// Deep-linkable as /appeal?kind=suspension so a restriction notice elsewhere in
// the app can send someone straight to the right form.
export function AppealPage() {
  const router = useRouter();
  const params = useSearchParams();
  const presetKind = params.get('kind') || '';

  const [kind, setKind] = React.useState<string>(
    APPEAL_KIND_VALUES.includes(presetKind) ? presetKind : 'suspension',
  );
  const [target, setTarget] = React.useState(params.get('target') || '');
  const [email, setEmail] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // What the platform currently says about this account. Read, not asserted —
  // it is the thing being appealed, and someone writing an appeal should not
  // have to remember the wording of the notice.
  const [standing, setStanding] = React.useState<{ until?: string; banned?: boolean; reason?: string } | null>(null);

  const isAccountLevel = ACCOUNT_LEVEL_KINDS.includes(kind);

  React.useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!live || !session?.user) return;
        setEmail(e => e || session.user.email || '');
        // A frozen account can still read — 041 restricts writes only — so this
        // works for exactly the people who need it.
        const { data } = await supabase
          .from('profiles')
          .select('suspended_until, suspended_reason, banned_at, banned_reason')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!live || !data) return;
        const banned = !!data.banned_at;
        const suspended = data.suspended_until && new Date(data.suspended_until) > new Date();
        if (!banned && !suspended) return;
        setStanding({
          banned,
          until: suspended ? data.suspended_until : undefined,
          reason: (banned ? data.banned_reason : data.suspended_reason) || undefined,
        });
        setKind(k => (presetKind ? k : banned ? 'ban' : 'suspension'));
      } catch { /* no session, or offline — the form works without either */ }
    })();
    return () => { live = false; };
  }, [presetKind]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    let token: string | null = null;
    try {
      token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
    } catch { /* appeal filed without an account attached */ }

    const { ref, error: err } = await submitAppeal(
      { kind, reason, email, target: isAccountLevel ? undefined : target },
      token,
    );
    setSending(false);

    if (err || !ref) { setError(err ?? "We couldn't file your appeal. Please try again."); return; }
    setSent(ref);
  };

  if (sent) {
    return (
      <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <PageNav back="/" backLabel="Home" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--green-tint)', border: '2px solid var(--green)', display: 'grid', placeItems: 'center' }}>
            <Icon name="check" size={28} color="var(--green)" stroke={2.5} />
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Appeal received</h2>
            <p style={{ color: 'var(--ink-3)', fontSize: 15, margin: 0, lineHeight: 1.6, maxWidth: 380 }}>
              A moderator who was not involved in the original decision will review it and write to you at <strong>{email}</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em' }}>REFERENCE</span>
            <span style={{ fontSize: 14, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{sent}</span>
          </div>
          {/* Said here rather than discovered later at a 409. */}
          <p style={{ fontSize: 12.5, color: 'var(--ink-4)', maxWidth: 330, lineHeight: 1.55, margin: 0 }}>
            Filing again about the same decision won't move it up the queue — this one stays open until someone answers it.
          </p>
          <button className="btn btn-ghost" onClick={() => router.push('/')} style={{ marginTop: 4 }}>Back to Honua</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <PageNav back="/" backLabel="Home" />

      <main style={{ flex: 1, maxWidth: 620, margin: '0 auto', width: '100%', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Appeal a decision</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            If you think we got something wrong, tell us why. Appeals are read by a moderator who wasn't part of the original decision.
          </p>
        </div>

        {/* The standing block. Only drawn when there is something to appeal, so
            it never sits on the page as a hypothetical. */}
        {standing && (
          <div style={{ marginBottom: 26, padding: '16px 18px', borderRadius: 14, background: 'color-mix(in srgb, var(--clay) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--clay) 28%, transparent)' }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--clay)', letterSpacing: '.06em', marginBottom: 8 }}>
              {standing.banned ? 'YOUR ACCOUNT IS BANNED' : 'YOUR ACCOUNT IS SUSPENDED'}
            </div>
            {standing.until && (
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: standing.reason ? 6 : 0 }}>
                Until {new Date(standing.until).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
            {standing.reason && (
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                <span style={{ color: 'var(--ink-4)' }}>Reason given: </span>{standing.reason}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 22 }}>
          <div>
            <Label>What are you appealing?</Label>
            <select style={fldStyle} value={kind} onChange={e => setKind(e.target.value)}>
              {APPEAL_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>

          {/* Hidden for suspensions and bans, where there is no single item to
              point at — the account is the subject. */}
          {!isAccountLevel && (
            <div>
              <Label>Which one? <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(link, title or reference)</span></Label>
              <input style={fldStyle} className="fld" placeholder="Paste a link, or describe it" value={target} onChange={e => setTarget(e.target.value)} maxLength={APPEAL_LIMITS.target} />
            </div>
          )}

          <div>
            <Label>Email for our reply</Label>
            <input style={fldStyle} className="fld" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required maxLength={APPEAL_LIMITS.email} />
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.5 }}>
              Use an address you can still reach — the decision goes here, not to your Honua inbox.
            </div>
          </div>

          <div>
            <Label>Why should this be reversed?</Label>
            <textarea
              style={{ ...fldStyle, resize: 'vertical', minHeight: 180 }}
              placeholder="What happened, what you think was misread, and anything that supports it — links, order references, dates. The more specific this is, the more there is to weigh against the original decision."
              value={reason}
              onChange={e => setReason(e.target.value)}
              required rows={7} maxLength={APPEAL_LIMITS.reason}
            />
            {/* The server refuses under 40 characters, so the count runs up to
                the minimum rather than down from the maximum — a form that only
                mentions a rule at the moment it rejects you is the thing this
                avoids. */}
            {reason.trim().length < 40 ? (
              <div style={{ marginTop: 6, fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', textAlign: 'right' }}>
                {40 - reason.trim().length} more characters needed
              </div>
            ) : reason.length > APPEAL_LIMITS.reason * 0.8 ? (
              <div style={{ marginTop: 6, fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', textAlign: 'right' }}>
                {APPEAL_LIMITS.reason - reason.length} characters left
              </div>
            ) : null}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.06em', marginBottom: 10 }}>WHAT HAPPENS NEXT</div>
            {[
              ['clock', 'One appeal at a time', 'While this one is open, another about the same decision will be turned away'],
              ['user', 'Reviewed by someone new', 'Not the moderator who made the original call'],
              ['msg', 'You get the reasoning', 'Overturned or upheld, the decision comes with an explanation'],
            ].map(([icon, title, sub]) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name={icon} size={13} color="var(--green)" stroke={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 1 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--clay) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--clay) 30%, transparent)', color: 'var(--clay)', fontSize: 13.5, lineHeight: 1.55 }}>
              <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name="alert" size={15} /></span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={sending || reason.trim().length < 40} className="btn btn-primary" style={{ justifyContent: 'center', padding: '14px', fontSize: 15, fontWeight: 700, opacity: sending || reason.trim().length < 40 ? 0.6 : 1 }}>
            {sending ? 'Sending…' : <><Icon name="check" size={16} /> Submit appeal</>}
          </button>
        </form>

        <div style={{ marginTop: 28, fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.6, textAlign: 'center' }}>
          Not appealing a decision? <Link href="/support" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 500 }}>Contact support</Link> instead.
        </div>
      </main>
    </div>
  );
}

// =====================================================================
// Returns & Refunds policy page
// =====================================================================
function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 14px', color: 'var(--ink)' }}>{title}</h2>
      <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}

function StepRow({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '16px 0', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--green-tint)', border: '1px solid var(--green-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono' }}>{n}</span>
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

export function ReturnsPolicyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const fromOrder = params.get('order') || '';

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }} className="no-scrollbar">
      <PageNav back={fromOrder ? `/orders/${fromOrder}` : '/orders'} backLabel={fromOrder ? 'Back to order' : 'My orders'} />

      <main style={{ flex: 1, maxWidth: 720, margin: '0 auto', width: '100%', padding: '44px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--green)', letterSpacing: '.08em', marginBottom: 12 }}>RETURN & REFUND POLICY</div>
          <h1 className="font-display" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.08 }}>We make returns simple.</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 16, margin: '0 0 20px', lineHeight: 1.65 }}>
            If something isn't right with your order, we'll make it right. Most returns are resolved within 5 business days.
          </p>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
            <span>Last updated: July 2026</span>
            <span>·</span>
            <span>Effective immediately</span>
          </div>
        </div>

        {/* Quick summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 44 }}>
          {[
            { icon: 'clock', title: '30 days', sub: 'Standard return window from delivery' },
            { icon: 'leaf',  title: 'Free returns', sub: 'On all seller errors & damaged items' },
            { icon: 'bolt',  title: '5 business days', sub: 'Refund processed after item received' },
          ].map(c => (
            <div key={c.title} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 16px' }}>
              <Icon name={c.icon} size={18} color="var(--green)" />
              <div style={{ fontSize: 17, fontWeight: 700, margin: '10px 0 4px', fontFamily: 'Lora, serif' }}>{c.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <PolicySection title="What can be returned">
          <p style={{ marginBottom: 14 }}>You may return most items within <strong>30 days of delivery</strong> for a full refund, provided they are in their original condition — unused, unaltered, and in the original packaging where applicable.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
            <div style={{ background: 'rgba(34,197,94,.06)', border: '1px solid var(--green-3)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--green)', letterSpacing: '.06em', marginBottom: 10 }}>ELIGIBLE FOR RETURN</div>
              {['Physical items in original condition', 'Items that arrived damaged', 'Items not as described', 'Wrong item received', 'Defective products'].map(i => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', fontSize: 13.5 }}>
                  <Icon name="check" size={13} color="var(--green)" stroke={2.5} />{i}
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(220,38,38,.05)', border: '1px solid rgba(220,38,38,.15)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: '#dc2626', letterSpacing: '.06em', marginBottom: 10 }}>NOT ELIGIBLE</div>
              {['Digital downloads (once accessed)', 'Custom or made-to-order items', 'Perishable goods (food, plants)', 'Items returned after 30 days', 'Items showing signs of use or damage'].map(i => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', fontSize: 13.5, color: 'var(--ink-3)' }}>
                  <div style={{ width: 13, height: 13, marginTop: 2, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(220,38,38,.4)' }} />
                  </div>{i}
                </div>
              ))}
            </div>
          </div>
        </PolicySection>

        <PolicySection title="How to start a return">
          <StepRow n={1} title="Go to your order" desc="Find the order in My Orders and open the tracking page. Click 'Contact support' and select 'Return or refund' as your category." />
          <StepRow n={2} title="Describe the issue" desc="Tell us why you're returning — attach photos if the item arrived damaged or isn't what you ordered. This helps us resolve it faster." />
          <StepRow n={3} title="Get a return label" desc="For eligible returns, we'll email you a prepaid return label within 24 hours. For buyer's remorse returns, return shipping is at your cost." />
          <StepRow n={4} title="Ship it back" desc="Pack the item securely and drop it off with the carrier. Keep your proof of postage until your refund is confirmed." />
          <StepRow n={5} title="Refund issued" desc="Once the seller receives and confirms the return, your refund is processed within 5 business days to your original payment method." />
        </PolicySection>

        <PolicySection title="Shipping costs for returns">
          <div style={{ display: 'grid', gap: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
            {[
              ['Damaged on arrival', 'Free — prepaid label provided', true],
              ['Item not as described / wrong item', 'Free — prepaid label provided', true],
              ['Defective or faulty', 'Free — prepaid label provided', true],
              ["Buyer's remorse (changed mind)", "Buyer's cost", false],
              ["Ordered the wrong size / colour", "Buyer's cost", false],
            ].map(([reason, cost, free]: [string, string, boolean], i) => (
              <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)', fontSize: 13.5 }}>
                <span style={{ color: 'var(--ink-2)' }}>{reason}</span>
                <span style={{ fontWeight: 600, color: free ? 'var(--green)' : 'var(--ink-3)', flexShrink: 0 }}>{cost}</span>
              </div>
            ))}
          </div>
        </PolicySection>

        <PolicySection title="Refund timeline">
          <p>Refunds are processed to your <strong>original payment method</strong> within 5 business days of us receiving the returned item. Green Points used in the purchase are refunded as GP back to your wallet immediately.</p>
          <p style={{ marginTop: 8 }}>Card refunds typically appear within 3–5 additional business days depending on your bank. If you haven't received your refund after 10 business days, contact us.</p>
        </PolicySection>

        <PolicySection title="EU consumer rights">
          <div style={{ background: 'var(--green-tint)', border: '1px solid var(--green-3)', borderRadius: 12, padding: '16px 18px', fontSize: 14, lineHeight: 1.7 }}>
            <strong>14-day cooling-off period:</strong> If you're an EU consumer purchasing from an EU seller, you have a legal right to cancel your order within 14 calendar days of delivery — no reason needed. Contact us and we'll arrange the return. This right applies on top of our 30-day policy.
          </div>
        </PolicySection>

        {/* CTA */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => router.push(fromOrder ? `/support?order=${fromOrder}` : '/support')} style={{ justifyContent: 'center', padding: '12px 20px' }}>
            <Icon name="msg" size={15} /> Start a return
          </button>
          <button className="btn btn-ghost" onClick={() => router.push('/orders')} style={{ justifyContent: 'center', padding: '12px 20px', fontSize: 13.5 }}>
            View my orders
          </button>
        </div>
      </main>
    </div>
  );
}
