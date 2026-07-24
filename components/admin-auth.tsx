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
        embeddedWallets: { createOnLogin: "off" },
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
  const { user, logout } = usePrivy();
  return {
    email: user?.email?.address ?? null,
    logout,
  };
}

// ── Loading screen ───────────────────────────────────────────────────
function AdminLoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0d100e', flexDirection: 'column', gap: 16,
    }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: '#22c55e', display: 'grid', placeItems: 'center' }}>
        <Logo size={22} />
      </span>
      <div style={{
        width: 24, height: 24, border: '2.5px solid rgba(255,255,255,.15)',
        borderTopColor: '#22c55e', borderRadius: '50%',
        animation: 'spin .7s linear infinite',
      }} />
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
