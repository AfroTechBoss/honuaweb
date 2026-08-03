"use client";
import React from "react";
import { Icon, Logo, Avatar, VerifiedTick, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { getNotifications, markAllRead } from "@/lib/notifications";

const INTERESTS = [
  'Solar Energy', 'Wind Power', 'Zero Waste', 'Urban Gardening', 'Sustainable Food',
  'Climate Policy', 'Biodiversity', 'Ocean Health', 'Carbon Offsetting', 'Circular Economy',
  'Sustainable Transport', 'Green Building', 'Reforestation', 'Renewable Energy', 'Water Conservation',
  'Animal Welfare', 'Ethical Fashion', 'Social Justice', 'Community Energy', 'Environmental Education',
];

function BrandPanel() {
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, position: 'relative', overflow: 'hidden', background: 'linear-gradient(150deg,#1f6f3f 0%,#2e9a5b 55%,#c8e6cf 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48 }} className="auth-brand">
      <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: .5 }}>
        <path d="M0 520 Q150 460 300 510 T600 480 L600 800 0 800Z" fill="rgba(255,255,255,.08)"/>
        <path d="M0 600 Q150 540 300 590 T600 560 L600 800 0 800Z" fill="rgba(255,255,255,.10)"/>
        <circle cx="470" cy="150" r="60" fill="rgba(255,255,255,.12)"/>
      </svg>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span className="font-display" style={{ color: '#fff', fontWeight: 600, fontSize: 21 }}>Honua</span>
      </div>
      <div style={{ position: 'relative', color: '#fff' }}>
        <h1 className="font-display" style={{ fontSize: 'clamp(30px,3.4vw,46px)', fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.03em', margin: 0, maxWidth: '14ch' }}>The social network for people fixing the planet.</h1>
        <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
          {[['2.4M', 'members'], ['18.6M', 'actions logged'], ['142kt', 'CO₂ avoided']].map(([n, l]) => (
            <div key={l}>
              <div className="font-display" style={{ fontSize: 26, fontWeight: 600 }}>{n}</div>
              <div style={{ fontSize: 12, opacity: .85, fontFamily: 'JetBrains Mono' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', fontSize: 12, color: 'rgba(255,255,255,.8)', fontFamily: 'JetBrains Mono' }}>© 2026 Honua. All rights reserved.</div>
    </div>
  );
}

// One inline error line, in the house style (reset-password/page.tsx:74).
// role="alert" so it is announced the moment it appears — an error that exists
// only visually leaves a screen-reader user retyping a password that was never
// the problem.
function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 12.5, color: 'var(--clay)', margin: '6px 0 0', lineHeight: 1.45 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{children}</span>
    </p>
  );
}

// `error`, `inputRef` and `errorId` are optional — callers that don't pass them
// (the signup wizard, the forgot-password modal) get the field exactly as before.
function PasswordField({ value, onChange, placeholder = 'Enter your password', label = 'PASSWORD', error, inputRef, errorId }: any) {
  const [show, setShow] = React.useState(false);
  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: `1px solid ${error ? 'var(--clay)' : 'var(--line)'}`, borderRadius: 11, padding: '12px 42px 12px 14px', fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none', marginTop: 6 };
  const lab = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={lab}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input ref={inputRef} type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} style={field}
          aria-invalid={error ? true : undefined} aria-describedby={error && errorId ? errorId : undefined} />
        <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', padding: 4 }}>
          {show ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

function SocialButtons({ onGoogle, onApple }: { onGoogle: () => void; onApple: () => void }) {
  const btn: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', fontSize: 14, fontWeight: 500, borderRadius: 11, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', marginBottom: 8, fontFamily: 'Satoshi', color: 'var(--ink)', transition: 'background .15s' };
  return (
    <>
      <button style={btn} onClick={onGoogle}>
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
      </button>
      <button style={{ ...btn, opacity: .5, cursor: 'not-allowed', position: 'relative' }} disabled>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
        Continue with Apple
        <span style={{ position: 'absolute', right: 12, fontSize: 10, fontFamily: 'JetBrains Mono', background: 'var(--bg-2)', color: 'var(--ink-3)', padding: '2px 7px', borderRadius: 999, border: '1px solid var(--line)' }}>Coming soon</span>
      </button>
    </>
  );
}

const isValidEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());

// ── Forgot-password modal ─────────────────────────────────────────────────────
type ForgotStep = 'email' | 'method' | 'code' | 'new-password' | 'link-sent' | 'done';

function ForgotPasswordModal({ initialEmail, onClose }: { initialEmail: string; onClose: () => void }) {
  const app = useApp();
  const [step, setStep] = React.useState<ForgotStep>('email');
  const [email, setEmail] = React.useState(initialEmail);
  const [method, setMethod] = React.useState<'link' | 'code'>('link');
  const [code, setCode] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [confirmPw, setConfirmPw] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const codeRefs = Array.from({ length: 6 }, () => React.useRef<HTMLInputElement>(null));

  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px', fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none', marginTop: 6 };
  const lab: React.CSSProperties = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' };

  const sendLink = async () => {
    setLoading(true); setErr('');
    try {
      await app.resetPassword(email.trim());
      setStep('link-sent');
    } catch (e: any) { setErr(e?.message || 'Could not send reset link.'); }
    finally { setLoading(false); }
  };

  const sendCode = async () => {
    setLoading(true); setErr('');
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
      if (error) throw error;
      setStep('code');
    } catch (e: any) { setErr(e?.message || 'Could not send code.'); }
    finally { setLoading(false); }
  };

  const verifyCode = async () => {
    if (code.length < 6) { setErr('Enter the full 6-digit code.'); return; }
    setLoading(true); setErr('');
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
      if (error) throw error;
      setStep('new-password');
    } catch (e: any) { setErr(e?.message || 'Invalid or expired code.'); }
    finally { setLoading(false); }
  };

  const updatePassword = async () => {
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (pw !== confirmPw) { setErr("Passwords don't match."); return; }
    setLoading(true); setErr('');
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setStep('done');
    } catch (e: any) { setErr(e?.message || 'Could not update password.'); }
    finally { setLoading(false); }
  };

  const handleCodeInput = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const chars = code.split('');
    chars[i] = digit;
    const next = chars.join('').slice(0, 6);
    setCode(next.padEnd(6, '').slice(0, 6).replace(/ /g, ''));
    setCode(chars.slice(0, 6).join('').replace(/[^0-9]/g, '').slice(0, 6));
    // Focus next
    if (digit && i < 5) codeRefs[i + 1].current?.focus();
  };

  const handleCodeKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) codeRefs[i - 1].current?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setCode(pasted.padEnd(6, ''));
    codeRefs[Math.min(pasted.length, 5)].current?.focus();
    e.preventDefault();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg)', borderRadius: 20, padding: '36px 36px 32px', width: '100%', maxWidth: 420, boxShadow: '0 24px 80px rgba(0,0,0,.25)', position: 'relative' }}>
        {/* Close button */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 6, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* ── Step: email entry ── */}
        {step === 'email' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Reset your password</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 22px', lineHeight: 1.55 }}>Enter your account email and we'll help you get back in.</p>
            <label style={lab}>EMAIL ADDRESS</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="you@example.com" style={field} autoFocus
              onKeyDown={e => e.key === 'Enter' && isValidEmail(email) && setStep('method')} />
            {err && <p style={{ fontSize: 12.5, color: 'var(--clay)', margin: '6px 0 0' }}>{err}</p>}
            <button onClick={() => { if (!isValidEmail(email)) { setErr('Enter a valid email address.'); return; } setErr(''); setStep('method'); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15, marginTop: 18 }}>
              Continue
            </button>
          </>
        )}

        {/* ── Step: choose method ── */}
        {step === 'method' && (
          <>
            <button onClick={() => setStep('email')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 20 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg> Back
            </button>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>How would you like to reset?</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 22px', lineHeight: 1.55 }}>We'll send a message to <b style={{ color: 'var(--ink)', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{email.trim()}</b></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([['link', 'Magic link', 'Receive a secure link by email. Click it to set a new password.', 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6'],
                 ['code', '6-digit code', 'Get a one-time code by email. Enter it here, then set your password.', 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 5v5l3 3']] as const).map(([val, title, desc, path]) => (
                <button key={val} onClick={() => setMethod(val)} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px', borderRadius: 14, border: `2px solid ${method === val ? 'var(--green)' : 'var(--line)'}`, background: method === val ? 'var(--green-tint)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: method === val ? 'var(--green)' : 'var(--bg-2)', display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'background .15s' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={method === val ? '#fff' : 'var(--ink-3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                  {method === val && <div style={{ marginLeft: 'auto', flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--green)', display: 'grid', placeItems: 'center' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}
                </button>
              ))}
            </div>
            {err && <p style={{ fontSize: 12.5, color: 'var(--clay)', margin: '8px 0 0' }}>{err}</p>}
            <button onClick={method === 'link' ? sendLink : sendCode} disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15, marginTop: 20, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending…' : method === 'link' ? 'Send magic link' : 'Send code'}
            </button>
          </>
        )}

        {/* ── Step: magic link sent ── */}
        {step === 'link-sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.02em' }}>Check your email</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 8px', lineHeight: 1.6 }}>We sent a password reset link to</p>
            <div style={{ display: 'inline-block', background: 'var(--green-tint)', color: 'var(--green)', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 8, marginBottom: 20 }}>{email.trim()}</div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 24px', lineHeight: 1.6 }}>Click the link in that email to set a new password. Check your spam folder if it doesn't arrive within a few minutes.</p>
            <button onClick={() => { setStep('method'); setErr(''); }} style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 10 }}>Resend email</button>
            <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}>Back to sign in</button>
          </div>
        )}

        {/* ── Step: enter code ── */}
        {step === 'code' && (
          <>
            <button onClick={() => setStep('method')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 20 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg> Back
            </button>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
            </div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Enter your code</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 24px', lineHeight: 1.55 }}>We sent a 6-digit code to <b style={{ color: 'var(--ink)', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{email.trim()}</b></p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 6 }} onPaste={handleCodePaste}>
              {Array.from({ length: 6 }).map((_, i) => (
                <input key={i} ref={codeRefs[i]} type="text" inputMode="numeric" maxLength={1}
                  value={code[i] || ''}
                  onChange={e => handleCodeInput(i, e.target.value)}
                  onKeyDown={e => handleCodeKey(i, e)}
                  style={{ width: 46, height: 54, textAlign: 'center', fontSize: 22, fontFamily: 'JetBrains Mono', fontWeight: 700, background: 'var(--bg-2)', border: `2px solid ${code[i] ? 'var(--green)' : 'var(--line)'}`, borderRadius: 12, color: 'var(--ink)', outline: 'none', caretColor: 'var(--green)' }}
                />
              ))}
            </div>
            {err && <p style={{ fontSize: 12.5, color: 'var(--clay)', margin: '8px 0 0', textAlign: 'center' }}>{err}</p>}
            <button onClick={verifyCode} disabled={loading || code.replace(/[^0-9]/g, '').length < 6} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15, marginTop: 20, opacity: (loading || code.replace(/[^0-9]/g, '').length < 6) ? 0.6 : 1 }}>
              {loading ? 'Verifying…' : 'Verify code'}
            </button>
            <button onClick={() => { setCode(''); sendCode(); }} style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: 13, color: 'var(--green)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: 14, padding: 6 }}>
              Resend code
            </button>
          </>
        )}

        {/* ── Step: set new password ── */}
        {step === 'new-password' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Set a new password</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 22px', lineHeight: 1.55 }}>Choose a strong password for your Honua account.</p>
            <PasswordField value={pw} onChange={(e: any) => { setPw(e.target.value); setErr(''); }} placeholder="At least 8 characters" label="NEW PASSWORD" />
            <PasswordField value={confirmPw} onChange={(e: any) => { setConfirmPw(e.target.value); setErr(''); }} placeholder="Repeat your new password" label="CONFIRM PASSWORD" />
            {err && <p style={{ fontSize: 12.5, color: 'var(--clay)', margin: '4px 0 0' }}>{err}</p>}
            <button onClick={updatePassword} disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15, marginTop: 14, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </>
        )}

        {/* ── Step: all done ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🌱</div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Password updated!</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 24px', lineHeight: 1.55 }}>Your password has been changed. You can now sign in with your new password.</p>
            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15 }}>Back to sign in</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sign-in form ──────────────────────────────────────────────────────────────

// Supabase answers a wrong password and an unknown email with the same
// "Invalid login credentials" — deliberately, so the form can't be used to find
// out who has an account here. That property is worth keeping, so this
// translates the string rather than trying to work out which field was wrong.
// Anything unrecognised falls through to the raw message: an unhelpful sentence
// beats a confidently wrong one.
const SIGN_IN_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials|invalid.*password/i, 'Wrong email or password. Please try again.'],
  [/email not confirmed/i, 'Confirm your email first — open the link we sent you, then sign in.'],
  [/too many requests|rate limit/i, 'Too many attempts. Wait a moment and try again.'],
  [/failed to fetch|networkerror|load failed/i, "Couldn't reach Honua. Check your connection and try again."],
];

function signInMessage(raw?: string) {
  const msg = (raw || '').trim();
  for (const [pattern, friendly] of SIGN_IN_MESSAGES) if (pattern.test(msg)) return friendly;
  return msg || 'Something went wrong signing you in. Please try again.';
}

function SignInForm({ onSwitch, onSuccess, notice }: { onSwitch: () => void; onSuccess: () => void; notice?: string }) {
  const app = useApp();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showForgot, setShowForgot] = React.useState(false);
  // Which field to mark, and what to say under it. Only ever one at a time —
  // the first thing to fix is the only thing worth reading.
  const [errField, setErrField] = React.useState<'email' | 'password' | null>(null);
  const [errMsg, setErrMsg] = React.useState('');
  // The social buttons have no field to sit under, so their failures get their
  // own line beneath them rather than being fired off as a toast.
  const [socialErr, setSocialErr] = React.useState('');
  // Why you're back here, sent by middleware or the OAuth callback. It belongs
  // above the form because it describes the trip that landed you on this page,
  // not the fields below it — and it's copied into state so the next attempt
  // can clear it rather than leaving stale history sitting over a fresh try.
  const [formErr, setFormErr] = React.useState('');
  React.useEffect(() => { if (notice) setFormErr(notice); }, [notice]);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px', fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none', marginTop: 6 };
  const lab: React.CSSProperties = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' };

  // Typing is the user acting on the message, so it stops applying — leaving it
  // up would have it contradict the field it sits under.
  const clearError = () => { setErrField(null); setErrMsg(''); setFormErr(''); };

  const fail = (which: 'email' | 'password', msg: string) => {
    setErrField(which);
    setErrMsg(msg);
    (which === 'email' ? emailRef : passwordRef).current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSocialErr('');
    setFormErr('');
    if (!email.trim()) { fail('email', 'Enter your email address.'); return; }
    if (!isValidEmail(email)) { fail('email', "That doesn't look like an email address."); return; }
    if (!password) { fail('password', 'Enter your password.'); return; }
    clearError();
    setLoading(true);
    try {
      await app.login(email, password);
    } catch (err: any) {
      // Under the password field rather than in a toast: the message belongs
      // beside the thing being corrected, and it has to stay put long enough to
      // read and act on. Password, not email, because that is the field a
      // person retypes — and Supabase won't say which half was wrong anyway.
      fail('password', signInMessage(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      {showForgot && <ForgotPasswordModal initialEmail={email} onClose={() => setShowForgot(false)} />}
      <h2 className="font-display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Welcome back</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '6px 0 24px' }}>Sign in to pick up where you left off.</p>

      {/* noValidate: the browser's own "please enter an email address" bubble is
          itself a pop-up, and it would fire before any of this ran. */}
      <form onSubmit={submit} noValidate>
        {formErr && <div style={{ marginBottom: 12 }}><FieldError>{formErr}</FieldError></div>}
        <div style={{ marginBottom: 14 }}>
          <label style={lab} htmlFor="signin-email">EMAIL</label>
          <input id="signin-email" ref={emailRef} type="email" value={email} onChange={e => { setEmail(e.target.value); clearError(); }} placeholder="you@example.com"
            style={{ ...field, borderColor: errField === 'email' ? 'var(--clay)' : 'var(--line)' }}
            aria-invalid={errField === 'email' || undefined}
            aria-describedby={errField === 'email' ? 'signin-email-err' : undefined} />
          {errField === 'email' && <FieldError id="signin-email-err">{errMsg}</FieldError>}
        </div>
        <PasswordField value={password} onChange={(e: any) => { setPassword(e.target.value); clearError(); }} placeholder="Your password"
          inputRef={passwordRef} errorId="signin-password-err" error={errField === 'password' ? errMsg : ''} />
        <div style={{ textAlign: 'right', marginBottom: 4 }}>
          <span onClick={() => setShowForgot(true)} style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 600, cursor: 'pointer' }}>Forgot password?</span>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15, marginTop: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-4)', margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <SocialButtons
        onGoogle={async () => { clearError(); setSocialErr(''); try { await app.loginWithGoogle(); } catch (e: any) { setSocialErr(`Google sign-in failed. ${signInMessage(e?.message)}`); } }}
        onApple={async () => { clearError(); setSocialErr(''); try { await app.loginWithApple(); } catch (e: any) { setSocialErr(`Apple sign-in failed. ${signInMessage(e?.message)}`); } }}
      />
      <FieldError>{socialErr}</FieldError>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', marginTop: 20 }}>
        New to Honua?{' '}
        <span onClick={onSwitch} style={{ color: 'var(--green)', fontWeight: 600, cursor: 'pointer' }}>Create an account</span>
      </p>
      <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 14, lineHeight: 1.6 }}>
        By signing in you agree to our{' '}
        <a href="/terms" target="_blank" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Terms of Service &amp; Privacy Policy</a>.
      </p>
    </div>
  );
}

// ── Signup — multi-step onboarding ────────────────────────────────────────────
function SignUpFlow({ onSwitch, onConfirm }: { onSwitch: () => void; onConfirm?: (email: string) => void }) {
  const app = useApp();
  const [step, setStep] = React.useState(1); // 1–5
  const totalSteps = 5;
  const [loading, setLoading] = React.useState(false);

  // Step 1: credentials
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');

  // Step 2: identity
  const [name, setName] = React.useState('');
  const [handle, setHandle] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Username availability
  const [handleStatus, setHandleStatus] = React.useState<'idle' | 'checking' | 'available' | 'taken' | 'short'>('idle');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 3: bio & focus
  const [bio, setBio] = React.useState('');
  const [interests, setInterests] = React.useState<string[]>([]);

  // Step 4: T&C
  const [agreed, setAgreed] = React.useState(false);
  const [agreedMarketing, setAgreedMarketing] = React.useState(false);

  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px', fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none', marginTop: 6 };
  const lab: React.CSSProperties = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', display: 'block' };

  const handleHandleChange = (v: string) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    setHandle(clean);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length < 3) { setHandleStatus(clean.length > 0 ? 'short' : 'idle'); return; }
    setHandleStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.from('profiles').select('handle').eq('handle', clean).maybeSingle();
        setHandleStatus(data ? 'taken' : 'available');
      } catch { setHandleStatus('idle'); }
    }, 500);
  };

  const next = async () => {
    if (step === 1) {
      if (!email || !password || !confirm) { app.toast?.({ msg: 'Please fill in all fields', icon: 'bolt', kind: 'error' }); return; }
      if (password.length < 8) { app.toast?.({ msg: 'Password must be at least 8 characters', icon: 'bolt', kind: 'error' }); return; }
      if (password !== confirm) { app.toast?.({ msg: "Passwords don't match", icon: 'bolt', kind: 'error' }); return; }
    }
    if (step === 2) {
      if (!name || !handle) { app.toast?.({ msg: 'Name and username are required', icon: 'bolt', kind: 'error' }); return; }
      if (handle.length < 3) { app.toast?.({ msg: 'Username must be at least 3 characters', icon: 'bolt', kind: 'error' }); return; }
      if (handleStatus === 'taken') { app.toast?.({ msg: 'That username is taken', sub: 'Try a different one.', icon: 'bolt', kind: 'error' }); return; }
      if (handleStatus === 'checking') { app.toast?.({ msg: 'Still checking username…', icon: 'bolt', kind: 'error' }); return; }
    }
    if (step === 3 && interests.length < 3) { app.toast?.({ msg: 'Pick at least 3 interests to personalise your feed', icon: 'bolt', kind: 'error' }); return; }
    if (step === 4 && !agreed) { app.toast?.({ msg: 'Please accept the Terms of Service to continue', icon: 'bolt', kind: 'error' }); return; }
    if (step === totalSteps) {
      setLoading(true);
      try {
        const result = await app.signup(email, password, {
          full_name: name,
          handle,
          dob,
          location,
          bio,
          interests,
          marketing_emails: agreedMarketing,
        });
        // If user is immediately active (no email confirmation needed), upload avatar now
        if (result?.user && avatarFile) {
          await app.uploadAvatar(result.user.id, avatarFile);
        }
        if (onConfirm) {
          onConfirm(email);
        } else {
          app.toast?.({ msg: `Welcome to Honua, ${name.split(' ')[0]}!`, sub: 'Check your email to confirm your account.', kind: 'success', icon: 'leaf' });
        }
      } catch (err: any) {
        app.toast?.({ msg: 'Sign up failed', sub: err.message, icon: 'bolt', kind: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep(s => s + 1);
  };

  const back = () => setStep(s => s - 1);

  const stepTitle = ['Create your account', 'Tell us about you', 'What do you care about?', 'Terms & conditions', 'You\'re almost in!'];
  const stepSub = [
    'Set up your login credentials.',
    'Help your community know who you are.',
    'Pick at least 3 topics to personalise your feed.',
    'Please read and accept before joining.',
    'Review your profile before going live.',
  ];

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      {/* Back / progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {step > 1 && <button onClick={back} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg> Back
        </button>}
        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < step ? 'var(--green)' : 'var(--line)', transition: 'background .3s' }} />
          ))}
        </div>
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)' }}>{step}/{totalSteps}</span>
      </div>

      <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{stepTitle[step - 1]}</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '6px 0 22px', lineHeight: 1.55 }}>{stepSub[step - 1]}</p>

      {/* ── Step 1: Credentials ── */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>EMAIL ADDRESS</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={field} autoFocus />
          </div>
          <PasswordField value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="At least 8 characters" label="PASSWORD" />
          <PasswordField value={confirm} onChange={(e: any) => setConfirm(e.target.value)} placeholder="Repeat your password" label="CONFIRM PASSWORD" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-4)', margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <SocialButtons
            onGoogle={async () => { try { await app.loginWithGoogle(); } catch (e: any) { app.toast?.({ msg: 'Google sign-in failed', sub: e.message, icon: 'bolt', kind: 'error' }); } }}
            onApple={async () => { try { await app.loginWithApple(); } catch (e: any) { app.toast?.({ msg: 'Apple sign-in failed', sub: e.message, icon: 'bolt', kind: 'error' }); } }}
          />
        </div>
      )}

      {/* ── Step 2: Identity ── */}
      {step === 2 && (
        <div>
          {/* Avatar upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{ width: 80, height: 80, borderRadius: 20, background: avatarPreview ? 'transparent' : 'var(--green-tint)', border: `2px dashed ${avatarPreview ? 'transparent' : 'var(--green)'}`, display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}
            >
              {avatarPreview
                ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              }
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Profile photo</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>JPG, PNG or WebP · max 5 MB</div>
              <button type="button" onClick={() => avatarInputRef.current?.click()} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-2)', fontFamily: 'Satoshi' }}>
                {avatarPreview ? 'Change photo' : 'Upload photo'}
              </button>
              {avatarPreview && <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--clay)', fontFamily: 'Satoshi', marginLeft: 6 }}>Remove</button>}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 5 * 1024 * 1024) { app.toast?.({ msg: 'File too large', sub: 'Max 5 MB', icon: 'bolt', kind: 'error' }); return; }
              setAvatarFile(f);
              setAvatarPreview(URL.createObjectURL(f));
            }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lab}>FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Sarah Green" style={field} autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>USERNAME</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 15, marginTop: 3 }}>@</span>
              <input
                value={handle}
                onChange={e => handleHandleChange(e.target.value)}
                placeholder="sarahgreen"
                style={{
                  ...field,
                  paddingLeft: 28,
                  paddingRight: 36,
                  borderColor: handleStatus === 'taken' ? 'var(--clay)' : handleStatus === 'available' ? 'var(--green)' : undefined,
                }}
              />
              {handleStatus === 'checking' && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', marginTop: 3 }}>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </span>
              )}
              {handleStatus === 'available' && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', marginTop: 3, color: 'var(--green)', fontSize: 16 }}>✓</span>
              )}
              {handleStatus === 'taken' && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', marginTop: 3, color: 'var(--clay)', fontSize: 16 }}>✕</span>
              )}
            </div>
            <span style={{
              fontSize: 11, fontFamily: 'JetBrains Mono', marginTop: 4, display: 'block',
              color: handleStatus === 'taken' ? 'var(--clay)' : handleStatus === 'available' ? 'var(--green)' : 'var(--ink-4)',
            }}>
              {handleStatus === 'taken' ? `@${handle} is already taken.` :
               handleStatus === 'available' ? `@${handle} is available!` :
               handleStatus === 'short' ? 'Min 3 characters.' :
               handleStatus === 'checking' ? 'Checking availability…' :
               'Letters, numbers, underscores only. Min 3 chars.'}
            </span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>DATE OF BIRTH</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={field} />
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 4, display: 'block' }}>You must be 13 or older to join Honua.</span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>LOCATION (OPTIONAL)</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Portland, OR · Global" style={field} />
          </div>
        </div>
      )}

      {/* ── Step 3: Interests ── */}
      {step === 3 && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INTERESTS.map(it => {
              const on = interests.includes(it);
              return (
                <button key={it} onClick={() => setInterests(prev => on ? prev.filter(x => x !== it) : [...prev, it])} style={{ padding: '8px 14px', borderRadius: 999, border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`, background: on ? 'var(--green)' : 'var(--surface)', color: on ? '#fff' : 'var(--ink-2)', fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: 'Satoshi', transition: 'all .15s' }}>
                  {it}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 14 }}>{interests.length} selected · minimum 3</p>
        </div>
      )}

      {/* ── Step 4: Bio ── */}
      {step === 4 && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>SHORT BIO (OPTIONAL)</label>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 200))} placeholder="Tell the Honua community about yourself, your sustainability journey, and what drives you." rows={4} style={{ ...field, resize: 'none', lineHeight: 1.55 }} />
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 4, display: 'block', textAlign: 'right' }}>{bio.length}/200</span>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, maxHeight: 260, overflowY: 'auto' }} className="no-scrollbar">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Terms of Service — Summary</div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, margin: '0 0 10px' }}>By joining Honua you agree to post only truthful, original content; not to harass, deceive, or harm other members; to grant Honua a non-exclusive licence to display your content on the platform; and to respect our community guidelines around verified impact claims.</p>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, margin: '0 0 10px' }}>Honua may suspend or terminate accounts that violate these terms. Green Points are non-transferable and have no cash value outside the platform. You retain ownership of all content you post.</p>
            <a href="/terms" target="_blank" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Read the full Terms of Service →</a>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--green)', width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              I have read and agree to the{' '}
              <a href="/terms" target="_blank" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/terms#privacy" target="_blank" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>.
              <span style={{ color: 'var(--clay)', marginLeft: 4 }}>*</span>
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={agreedMarketing} onChange={e => setAgreedMarketing(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--green)', width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              I'd like to receive Honua's newsletter with sustainability tips, platform updates, and community highlights. (Optional)
            </span>
          </label>
        </div>
      )}

      {/* ── Step 5: Review ── */}
      {step === 5 && (
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--green)', display: 'grid', placeItems: 'center', fontSize: 28, color: '#fff', fontWeight: 700 }}>{name.charAt(0) || '?'}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{name || '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{handle || '—'}</div>
                {location && <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{location}</div>}
              </div>
            </div>
            {bio && <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 14px' }}>{bio}</p>}
            {interests.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {interests.map(it => <span key={it} style={{ fontSize: 12, background: 'var(--green-tint)', color: 'var(--green)', padding: '3px 10px', borderRadius: 999, fontWeight: 500 }}>{it}</span>)}
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, background: 'var(--green-tint)', border: '1px solid var(--green-3)', borderRadius: 12, padding: 14 }}>
            <strong>You're joining {(2400000).toLocaleString()} members</strong> who are making their climate impact visible and verifiable.
          </div>
        </div>
      )}

      <button onClick={next} disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15, marginTop: 22, opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Creating account…' : step === totalSteps ? 'Create my account' : step === 4 ? 'I agree — continue' : 'Continue'}
      </button>

      {step === 1 && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', marginTop: 18 }}>
          Already have an account?{' '}
          <span onClick={onSwitch} style={{ color: 'var(--green)', fontWeight: 600, cursor: 'pointer' }}>Sign in</span>
        </p>
      )}
    </div>
  );
}

function CheckEmailScreen({ email, onBackToSignIn }: { email: string; onBackToSignIn: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}><Icon name="mail" size={32} color="var(--green)" /></div>
      <h2 className="font-display" style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Check your email</h2>
      <p style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        We sent a confirmation link to
      </p>
      <div style={{ display: 'inline-block', background: 'var(--green-tint)', color: 'var(--green)', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600, padding: '6px 14px', borderRadius: 8, marginBottom: 20 }}>
        {email}
      </div>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>
        Click the link in that email to activate your account. It may take a minute or two to arrive — check your spam folder if you don't see it.
      </p>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.04em', marginBottom: 10 }}>NEXT STEPS</div>
        {[
          ['1.', 'Open the confirmation email'],
          ['2.', 'Click "Confirm your email"'],
          ['', 'You\'re in — start your impact journey'],
        ].map(([icon, text], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{text}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 14 }} onClick={onBackToSignIn}>
        Back to sign in
      </button>
    </div>
  );
}

// ── OAuth Onboarding Flow ─────────────────────────────────────────────────────
export function OAuthOnboardingFlow() {
  const app = useApp();
  const totalSteps = 6;
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [suggestedFollows, setSuggestedFollows] = React.useState<string[]>([]);

  // Pre-fill from Google user data
  const [name, setName] = React.useState(app.user?.name || '');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(app.user?.avatar || null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const [handle, setHandle] = React.useState('');
  const [handleStatus, setHandleStatus] = React.useState<'idle' | 'checking' | 'available' | 'taken' | 'short'>('idle');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [location, setLocation] = React.useState('');
  const [interests, setInterests] = React.useState<string[]>([]);
  const [bio, setBio] = React.useState('');
  const [agreed, setAgreed] = React.useState(false);

  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)',
    border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px',
    fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none', marginTop: 6,
  };
  const lab: React.CSSProperties = {
    fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)',
    letterSpacing: '.05em', display: 'block',
  };

  const handleHandleChange = (v: string) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    setHandle(clean);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length < 3) { setHandleStatus(clean.length > 0 ? 'short' : 'idle'); return; }
    setHandleStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.from('profiles').select('handle').eq('handle', clean).maybeSingle();
        setHandleStatus(data ? 'taken' : 'available');
      } catch { setHandleStatus('idle'); }
    }, 500);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const next = async () => {
    if (step === 1 && !name.trim()) {
      app.toast?.({ msg: 'Please enter your name', icon: 'bolt', kind: 'error' }); return;
    }
    if (step === 2) {
      if (!handle || handle.length < 3) { app.toast?.({ msg: 'Username must be at least 3 characters', icon: 'bolt', kind: 'error' }); return; }
      if (handleStatus === 'taken') { app.toast?.({ msg: 'That username is taken', sub: 'Try a different one.', icon: 'bolt', kind: 'error' }); return; }
      if (handleStatus === 'checking') { app.toast?.({ msg: 'Still checking username…', icon: 'bolt', kind: 'error' }); return; }
    }
    if (step === 4 && interests.length < 3) {
      app.toast?.({ msg: 'Pick at least 3 interests', sub: 'They help us personalise your feed.', icon: 'bolt', kind: 'error' }); return;
    }
    if (step === totalSteps) {
      if (!agreed) { app.toast?.({ msg: 'Please accept the Terms of Service', icon: 'bolt', kind: 'error' }); return; }
      setLoading(true);
      try {
        await app.completeOAuthOnboarding({ name, handle, location, bio, interests, avatarFile });
        app.toast?.({ msg: `Welcome to Honua, ${name.split(' ')[0]}! 🌿`, sub: 'Your profile is all set.', kind: 'success', icon: 'leaf' });
      } catch (err: any) {
        app.toast?.({ msg: 'Something went wrong', sub: err.message, icon: 'bolt', kind: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep(s => s + 1);
  };

  const stepTitles = ['Welcome to Honua', 'Choose your username', 'Where are you based?', 'What do you care about?', 'People to follow', 'Almost done'];
  const stepSubs = [
    'Let\'s confirm your name and photo.',
    'This is how the community will find you.',
    'Optional — helps connect you with local initiatives.',
    'Pick at least 3 topics to personalise your feed.',
    'Follow a few voices to get your feed going.',
    'A short intro and you\'re in.',
  ];

  const handleStatusColor = handleStatus === 'available' ? 'var(--green)' : handleStatus === 'taken' ? 'var(--clay)' : 'var(--ink-4)';
  const handleStatusMsg =
    handleStatus === 'available' ? `@${handle} is available!` :
    handleStatus === 'taken' ? 'That username is taken.' :
    handleStatus === 'short' ? 'Min 3 characters.' :
    handleStatus === 'checking' ? 'Checking…' : 'Letters, numbers, underscores only.';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 20, padding: '36px 40px',
        width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,.25)',
      }} className="no-scrollbar">
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
            </button>
          )}
          <div style={{ flex: 1, display: 'flex', gap: 4 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < step ? 'var(--green)' : 'var(--line)', transition: 'background .3s' }} />
            ))}
          </div>
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', flexShrink: 0 }}>{step}/{totalSteps}</span>
        </div>

        <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px' }}>{stepTitles[step - 1]}</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 24px', lineHeight: 1.55 }}>{stepSubs[step - 1]}</p>

        {/* Step 1: Name + Avatar */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => avatarInputRef.current?.click()}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--line)', overflow: 'hidden', border: '3px solid var(--green)' }}>
                  {avatarPreview
                    ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--ink-4)' }}>👤</div>
                  }
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <span style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8 }}>Tap to change photo</span>
            </div>
            <label style={lab}>FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={field} autoFocus />
          </div>
        )}

        {/* Step 2: Username */}
        {step === 2 && (
          <div>
            <label style={lab}>USERNAME</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 15, marginTop: 3 }}>@</span>
              <input value={handle} onChange={e => handleHandleChange(e.target.value)} placeholder="yourhandle" style={{ ...field, paddingLeft: 28 }} autoFocus />
            </div>
            <span style={{ fontSize: 12, color: handleStatusColor, fontFamily: 'JetBrains Mono', marginTop: 6, display: 'block' }}>{handleStatusMsg}</span>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div>
            <label style={lab}>CITY / REGION (OPTIONAL)</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Lagos, NG · Remote · Global" style={field} autoFocus />
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 12, lineHeight: 1.55 }}>
              Location helps surface nearby communities, local impact projects, and regional challenges. It's never shared without your consent.
            </p>
          </div>
        )}

        {/* Step 4: Interests */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {INTERESTS.map(it => {
                const on = interests.includes(it);
                return (
                  <button key={it} onClick={() => setInterests(prev => on ? prev.filter(x => x !== it) : [...prev, it])} style={{ padding: '8px 14px', borderRadius: 999, border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`, background: on ? 'var(--green)' : 'var(--surface)', color: on ? '#fff' : 'var(--ink-2)', fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: 'Satoshi', transition: 'all .15s' }}>
                    {it}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 14 }}>{interests.length} selected · minimum 3</p>
          </div>
        )}

        {/* Step 5: Suggested follows */}
        {step === 5 && (() => {
          const suggestions = Object.entries(MOCK.users).filter(([k]) => k !== 'you').map(([, u]) => u);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {suggestions.map(u => {
                const following = suggestedFollows.includes(u.handle);
                return (
                  <div key={u.handle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <Avatar src={u.avatar} name={u.name} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                        {u.verified && <VerifiedTick size={12} />}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{u.handle}</div>
                    </div>
                    <button
                      onClick={() => setSuggestedFollows(prev => following ? prev.filter(h => h !== u.handle) : [...prev, u.handle])}
                      style={{ padding: '7px 16px', borderRadius: 999, border: following ? '1.5px solid var(--green)' : '1.5px solid var(--line)', background: following ? 'var(--green)' : 'transparent', color: following ? '#fff' : 'var(--ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}
                    >
                      {following ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Step 6: Bio + Terms */}
        {step === totalSteps && (
          <div>
            <label style={lab}>SHORT BIO (OPTIONAL)</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell the community a bit about yourself and your sustainability journey…" rows={4} style={{ ...field, resize: 'vertical' }} />
            <div style={{ marginTop: 20, padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--green)', width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                  I agree to Honua's <a href="/terms" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 500 }}>Terms of Service</a> and <a href="/terms" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</a>
                </span>
              </label>
            </div>
          </div>
        )}

        <button
          className="btn btn-green"
          onClick={next}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 28, padding: '14px', fontSize: 15, fontWeight: 600 }}
        >
          {loading ? 'Setting up your profile…' : step === totalSteps ? '🌿 Enter Honua' : 'Continue'}
        </button>

        {(step === 3 || step === 5) && (
          <button onClick={next} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, marginTop: 12, padding: 8 }}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

export function DesktopAuth({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const [mode, setMode] = React.useState<'signin' | 'signup' | 'confirm'>((params?.mode as any) || 'signin');
  const [confirmedEmail, setConfirmedEmail] = React.useState('');
  const app = useApp();
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <BrandPanel />
      <div style={{ flex: '0 0 clamp(360px, 42%, 560px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px clamp(20px,4vw,56px)', overflow: 'auto', width: '100%' }} className="no-scrollbar auth-content">
        {mode === 'signin'
          ? <SignInForm onSwitch={() => setMode('signup')} onSuccess={() => {}} notice={params?.notice as string} />
          : mode === 'signup'
          ? <SignUpFlow onSwitch={() => setMode('signin')} onConfirm={(email) => { setConfirmedEmail(email); setMode('confirm'); }} />
          : <CheckEmailScreen email={confirmedEmail} onBackToSignIn={() => setMode('signin')} />
        }
      </div>
    </div>
  );
};
