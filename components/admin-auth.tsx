"use client";
import React from "react";
import { PrivyProvider, usePrivy, useLoginWithEmail } from "@privy-io/react-auth";
import { Logo } from "@/components/shared";

// ── Privy-gated wrapper for the admin panel ──────────────────────────
// Authorized emails are controlled in the Privy dashboard:
//   App Settings → Users → Allowlist → add admin emails there.
// Anyone not on the allowlist is rejected by Privy before auth completes.

export function AdminPrivyProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Satoshi, sans-serif', color: '#fff', background: '#0d100e' }}>
        <div style={{ textAlign: 'center', opacity: 0.5 }}>
          <div style={{ fontSize: 14 }}>NEXT_PUBLIC_PRIVY_APP_ID is not set.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Add it to your .env.local and restart the server.</div>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email"],
        appearance: { theme: "dark", accentColor: "#22c55e" },
        embeddedWallets: { ethereum: { createOnLogin: "off" }, solana: { createOnLogin: "off" } },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

// ── Gate: renders children only when authenticated via Privy ─────────
export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();

  if (!ready) return <AdminLoadingScreen />;
  if (!authenticated) return <AdminLoginScreen />;

  return <>{children}</>;
}

// ── Hook: access Privy user from within admin screens ────────────────
export function useAdminUser() {
  const { user, logout, getAccessToken } = usePrivy();
  return {
    email: user?.email?.address ?? null,
    logout,
    // Admin writes go through server routes that verify this token — the console
    // has no Supabase session, so it can't satisfy RLS on its own.
    getAccessToken,
  };
}

// ── Loading screen ───────────────────────────────────────────────────
function AdminLoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0d100e',
    }}>
      <style>{`@keyframes admin-gear-spin { to { transform: rotate(360deg); } }`}</style>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'admin-gear-spin 1.4s linear infinite', opacity: .85 }}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    </div>
  );
}

// ── Login screen — headless OTP flow (no Privy modal) ───────────────
function AdminLoginScreen() {
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [step, setStep] = React.useState<'email' | 'otp'>('email');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await sendCode({ email });
      setStep('otp');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send code. Check that your email is authorized.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await loginWithCode({ code });
    } catch (e: any) {
      setError(e?.message ?? 'Invalid or expired code. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', height: '100vh', background: '#0d100e',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Satoshi, sans-serif',
    }}>
      <div style={{
        width: 380, padding: '40px 36px', borderRadius: 20,
        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 48, height: 48, borderRadius: 14, background: '#22c55e', display: 'grid', placeItems: 'center' }}>
            <Logo size={28} />
          </span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Honua Admin</div>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12.5, fontFamily: 'JetBrains Mono', letterSpacing: '.08em', marginTop: 3 }}>CONSOLE ACCESS</div>
          </div>
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,.07)' }} />

        {step === 'email' ? (
          <>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.55)', fontSize: 13.5, lineHeight: 1.6 }}>
              Enter your authorized admin email to receive a one-time code.
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                placeholder="admin@example.com"
                autoFocus
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 10, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
                  color: '#fff', fontSize: 14, fontFamily: 'Satoshi, sans-serif', outline: 'none',
                }}
              />
              <button
                onClick={handleSendCode}
                disabled={loading || !email.trim()}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 10,
                  background: loading ? 'rgba(34,197,94,.5)' : '#22c55e',
                  border: 'none', cursor: loading ? 'default' : 'pointer',
                  color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
                }}
              >
                {loading ? 'Sending…' : 'Send Code'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.55)', fontSize: 13.5, lineHeight: 1.6 }}>
              Enter the 6-digit code sent to <strong style={{ color: '#fff' }}>{email}</strong>.
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="000000"
                autoFocus
                maxLength={6}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 10, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
                  color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '0.3em',
                  fontFamily: 'JetBrains Mono', textAlign: 'center', outline: 'none',
                }}
              />
              <button
                onClick={handleVerify}
                disabled={loading || code.length < 6}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 10,
                  background: loading ? 'rgba(34,197,94,.5)' : '#22c55e',
                  border: 'none', cursor: loading ? 'default' : 'pointer',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                }}
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <button
                onClick={() => { setStep('email'); setCode(''); setError(''); }}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.35)', fontSize: 13, cursor: 'pointer', padding: '4px 0' }}
              >
                ← Use a different email
              </button>
            </div>
          </>
        )}

        {error && (
          <div style={{ width: '100%', padding: '10px 14px', borderRadius: 9, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171', fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.2)', textAlign: 'center', lineHeight: 1.5 }}>
          Access is restricted to authorized email addresses only.
        </div>
      </div>
    </div>
  );
}
