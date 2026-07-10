"use client";
import React from "react";
import { Icon } from "./icons";
import { useApp } from "./app-context";

export function Logo({ size = 28 }: any) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: size, height: size, borderRadius: 8, background: "var(--green)", display: "grid", placeItems: "center", color: "#fff", fontFamily: "Bricolage Grotesque", fontWeight: 700, fontSize: size * 0.55, letterSpacing: "-0.05em" }}>h</span>
      <span className="font-display" style={{ fontWeight: 600, fontSize: size * 0.6, color: "var(--ink)" }}>honua</span>
    </span>
  );
}

export function Avatar({ src, name = "U", size = 36, verified = false, score }: any) {
  const initial = (name || "U").charAt(0).toUpperCase();
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-block", flexShrink: 0 }}>
      <span style={{ width: size, height: size, borderRadius: "50%", background: src ? `url(${src}) center/cover` : "var(--green)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 600, fontSize: size * 0.4, fontFamily: "Geist", border: "2px solid var(--surface)" }}>{!src && initial}</span>
      {verified && (
        <span style={{ position: "absolute", bottom: -2, right: -2, width: size * 0.36, height: size * 0.36, borderRadius: "50%", background: "var(--sky)", display: "grid", placeItems: "center", color: "#fff", fontSize: size * 0.18, border: "2px solid var(--surface)" }}>✓</span>
      )}
      {typeof score === "number" && !verified && (
        <span style={{ position: "absolute", bottom: -3, right: -3, padding: "1px 5px", borderRadius: 8, background: "var(--green)", color: "#fff", fontSize: 9, fontFamily: "Geist Mono", fontWeight: 600, border: "2px solid var(--surface)" }}>{score}</span>
      )}
    </span>
  );
}

export function ImagePlaceholder({ label = "photo", height = 240, src, ratio }: any) {
  const style: any = { width: "100%", height: ratio ? "auto" : height, aspectRatio: ratio, borderRadius: 12, overflow: "hidden", position: "relative" };
  if (src) {
    return <div style={{ ...style, background: `url(${src}) center/cover` }} />;
  }
  return (
    <div className="placeholder-stripes" style={style}>
      <div style={{ position: "absolute", bottom: 10, left: 10, padding: "4px 8px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontFamily: "Geist Mono", fontSize: 11, color: "var(--ink-3)" }}>{label}</div>
    </div>
  );
}

export function ScorePill({ score, label = "impact" }: any) {
  const color = score >= 80 ? "var(--green)" : score >= 50 ? "var(--green-2)" : "var(--sun)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 4px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)", fontSize: 11, fontWeight: 600, fontFamily: "Geist Mono" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: color, color: "#fff", display: "grid", placeItems: "center", fontSize: 10 }}>{score}</span>
      {label}
    </span>
  );
}

export function VerifiedImpact({ value, unit }: any) {
  return (
    <span className="verified-impact">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" fill="currentColor" opacity=".25" />
        <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      verified · {value} {unit}
    </span>
  );
}

export function Modal({ onClose, children, width = 520 }: any) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }} className="modal-backdrop-in" style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(10,13,11,.5)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="modal-card-in no-scrollbar" style={{ width: "100%", maxWidth: width, maxHeight: "88vh", overflow: "auto", background: "var(--surface)", borderRadius: 20, border: "1px solid var(--line)", boxShadow: "0 40px 100px -20px rgba(0,0,0,.45)", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ icon, iconColor = "var(--green)", title, sub, onClose }: any) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "22px 24px 0" }}>
      {icon && (
        <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: iconColor + "18", color: iconColor, display: "grid", placeItems: "center" }}>
          <Icon name={icon} size={20} stroke={2} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 className="font-display" style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</h2>
        {sub && <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{sub}</p>}
      </div>
      <button onClick={onClose} style={{ background: "var(--bg-2)", border: "none", borderRadius: 9, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--ink-3)", flexShrink: 0 }}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

export function ToggleC({ on, onChange }: any) {
  return (
    <span onClick={() => onChange?.(!on)} style={{ width: 34, height: 20, borderRadius: 999, padding: 2, background: on ? "var(--green)" : "var(--line-2)", display: "inline-flex", alignItems: "center", cursor: "pointer", justifyContent: on ? "flex-end" : "flex-start", transition: "background .15s", flexShrink: 0 }}>
      <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
    </span>
  );
}

export function Stat({ n, l, green, light }: any) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "Bricolage Grotesque", letterSpacing: "-0.02em", color: light ? "#fff" : green ? "var(--green)" : "var(--ink)" }}>{n}</div>
      <div style={{ fontSize: 11, color: light ? "rgba(255,255,255,.8)" : "var(--ink-3)", fontFamily: "Geist Mono", marginTop: 2 }}>{l.toUpperCase()}</div>
    </div>
  );
}

export function NotifPrefs() {
  const [prefs, setPrefs] = React.useState<any>({ "Verified impact": true, "Mentions & replies": true, "New followers": true, "Project invites": false, "Daily digest": true });
  return (
    <>
      {Object.keys(prefs).map((l) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
          <span style={{ fontSize: 13 }}>{l}</span>
          <ToggleC on={prefs[l]} onChange={(v: any) => setPrefs((p: any) => ({ ...p, [l]: v }))} />
        </div>
      ))}
    </>
  );
}

export function ToastHost() {
  const { toasts = [], dismissToast } = useApp();
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9000, display: "flex", flexDirection: "column", gap: 10, alignItems: "center", pointerEvents: "none" }}>
      {toasts.map((t: any) => (
        <div key={t.id} className="toast-in" style={{ pointerEvents: "auto", background: t.kind === "error" ? "var(--surface)" : "var(--ink-solid)", color: t.kind === "error" ? "var(--ink)" : "#fff", border: t.kind === "error" ? "1px solid var(--line)" : "none", borderRadius: 14, padding: "12px 14px", minWidth: 300, maxWidth: 440, boxShadow: "0 18px 50px -12px rgba(0,0,0,.4)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center", background: t.kind === "error" ? "var(--clay)" : t.kind === "success" ? "var(--green)" : "rgba(255,255,255,.16)", color: "#fff" }}>
            <Icon name={t.icon || (t.kind === "error" ? "wifiOff" : "check")} size={16} stroke={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.msg}</div>
            {t.sub && <div style={{ fontSize: 12, opacity: t.kind === "error" ? 0.65 : 0.78, marginTop: 1 }}>{t.sub}</div>}
          </div>
          {t.action && (
            <button onClick={() => { t.action.onClick?.(); dismissToast(t.id); }} style={{ background: "transparent", border: "none", color: t.kind === "error" ? "var(--green)" : "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>{t.action.label}</button>
          )}
          <button onClick={() => dismissToast(t.id)} style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.45, cursor: "pointer", padding: 2 }}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
