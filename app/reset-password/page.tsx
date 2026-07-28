"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/shared";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);

  // The /auth/callback route exchanges the recovery code into a session before
  // forwarding here — so a valid session means the reset link is good.
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pw !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.replace("/"), 1600);
  };

  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 11, padding: "12px 14px", fontSize: 15, fontFamily: "Satoshi", color: "var(--ink)", outline: "none", marginTop: 6 };
  const lab: React.CSSProperties = { fontSize: 11, fontFamily: "JetBrains Mono", color: "var(--ink-3)", letterSpacing: ".05em" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 22 }}><Logo /></div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Password updated</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 8 }}>Signing you in…</p>
          </div>
        ) : hasSession === false ? (
          <div style={{ textAlign: "center" }}>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Link expired</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "8px 0 20px", lineHeight: 1.5 }}>
              This password-reset link is invalid or has expired. Request a fresh one from the login page.
            </p>
            <button className="btn btn-primary" onClick={() => router.replace("/login")} style={{ width: "100%", justifyContent: "center", padding: "13px 16px" }}>Back to sign in</button>
          </div>
        ) : (
          <>
            <h2 className="font-display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Set a new password</h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "6px 0 24px" }}>Choose a strong password for your account.</p>

            <form onSubmit={submit}>
              <div style={{ marginBottom: 14 }}>
                <label style={lab}>NEW PASSWORD</label>
                <input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" style={field} autoFocus />
              </div>
              <div style={{ marginBottom: 6 }}>
                <label style={lab}>CONFIRM PASSWORD</label>
                <input type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" style={field} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-3)", margin: "8px 0 4px", cursor: "pointer" }}>
                <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} style={{ accentColor: "var(--green)" }} /> Show password
              </label>
              {error && <div style={{ fontSize: 12.5, color: "var(--clay)", marginTop: 6 }}>{error}</div>}
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "13px 16px", fontSize: 15, marginTop: 12, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
