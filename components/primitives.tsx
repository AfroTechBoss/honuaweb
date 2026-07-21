"use client";
import React from "react";
import { Icon } from "./icons";
import { useApp } from "./app-context";

// ── Skeleton system ──────────────────────────────────────────────────────────

function Skel({ w, h, r = 8, style = {} }: { w?: number | string; h?: number | string; r?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'var(--line)',
      animation: 'skeleton-pulse 1.4s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }} />
  );
}

export function PostCardSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Skel w={40} h={40} r={999} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Skel w={120} h={13} />
            <Skel w={72} h={13} />
          </div>
          <Skel w="90%" h={13} />
          <Skel w="75%" h={13} />
          <Skel w="55%" h={13} />
          <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
            <Skel w={36} h={13} />
            <Skel w={36} h={13} />
            <Skel w={36} h={13} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <>
      {/* Cover */}
      <Skel w="100%" h={180} r={0} />
      {/* Header */}
      <div style={{ padding: '0 32px', position: 'relative' }}>
        <div style={{ marginTop: -48, marginBottom: 12 }}>
          <Skel w={96} h={96} r={999} style={{ border: '4px solid var(--bg)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <Skel w={160} h={20} />
          <Skel w={100} h={13} />
          <Skel w={280} h={13} />
          <Skel w={220} h={13} />
          <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
            <Skel w={60} h={13} />
            <Skel w={60} h={13} />
            <Skel w={80} h={13} />
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
          {[80, 64, 60, 56].map((w, i) => <Skel key={i} w={w} h={13} style={{ margin: '0 12px 14px 0' }} />)}
        </div>
        {/* Post skeletons */}
        {[1, 2, 3].map(i => <PostCardSkeleton key={i} />)}
      </div>
    </>
  );
}

export function PostDetailSkeleton() {
  return (
    <div style={{ padding: '20px 28px', maxWidth: 720 }}>
      {/* Back button */}
      <Skel w={80} h={13} style={{ marginBottom: 20 }} />
      {/* Article card */}
      <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--line)', padding: 28, marginBottom: 16 }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Skel w={56} h={56} r={999} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skel w={140} h={15} />
            <Skel w={90} h={12} />
          </div>
          <Skel w={80} h={32} r={20} />
        </div>
        {/* Content lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          <Skel w="100%" h={14} />
          <Skel w="92%" h={14} />
          <Skel w="78%" h={14} />
        </div>
        {/* Image placeholder */}
        <Skel w="100%" h={240} r={12} style={{ marginBottom: 18 }} />
        {/* Action row */}
        <div style={{ display: 'flex', gap: 28, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
          <Skel w={44} h={13} />
          <Skel w={44} h={13} />
          <Skel w={44} h={13} />
        </div>
      </div>
      {/* Comment skeletons */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid var(--line)' }}>
          <Skel w={36} h={36} r={999} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skel w={120} h={12} />
            <Skel w="85%" h={12} />
            <Skel w="65%" h={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Logo({ size = 28 }: any) {
  return (
    <span className="font-display" style={{ fontWeight: 700, fontSize: size * 0.75, color: "var(--ink)", letterSpacing: "-0.02em" }}>Honua</span>
  );
}

export function Avatar({ src, name = "U", size = 36, verified = false, score, noBorder = false }: any) {
  const initial = (name || "U").charAt(0).toUpperCase();
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-block", flexShrink: 0 }}>
      <span style={{ width: size, height: size, borderRadius: "50%", background: src ? `url(${src}) center/cover` : "var(--green)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 600, fontSize: size * 0.4, fontFamily: "Satoshi", border: noBorder ? "none" : "2px solid var(--surface)" }}>{!src && initial}</span>
      {verified && (
        <span style={{ position: "absolute", bottom: -2, right: -2, width: size * 0.36, height: size * 0.36, borderRadius: "50%", background: "var(--sky)", display: "grid", placeItems: "center", color: "#fff", fontSize: size * 0.18, border: "2px solid var(--surface)" }}>✓</span>
      )}
      {typeof score === "number" && !verified && (
        <span style={{ position: "absolute", bottom: -3, right: -3, padding: "1px 5px", borderRadius: 8, background: "var(--green)", color: "#fff", fontSize: 9, fontFamily: "JetBrains Mono", fontWeight: 600, border: "2px solid var(--surface)" }}>{score}</span>
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
      <div style={{ position: "absolute", bottom: 10, left: 10, padding: "4px 8px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontFamily: "JetBrains Mono", fontSize: 11, color: "var(--ink-3)" }}>{label}</div>
    </div>
  );
}

export function ScorePill({ score, label = "impact" }: any) {
  const color = score >= 80 ? "var(--green)" : score >= 50 ? "var(--green-2)" : "var(--sun)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 4px", borderRadius: 999, background: "var(--green-tint)", color: "var(--green)", fontSize: 11, fontWeight: 600, fontFamily: "JetBrains Mono" }}>
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
      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "Lora", letterSpacing: "-0.02em", color: light ? "#fff" : green ? "var(--green)" : "var(--ink)" }}>{n}</div>
      <div style={{ fontSize: 11, color: light ? "rgba(255,255,255,.8)" : "var(--ink-3)", fontFamily: "JetBrains Mono", marginTop: 2 }}>{l.toUpperCase()}</div>
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
  const { toasts = [], dismissToast, nav } = useApp() as any;
  const notifs = toasts.filter((t: any) => t.kind === 'notif');
  const standard = toasts.filter((t: any) => t.kind !== 'notif');

  function handleNotifClick(t: any) {
    if (t.notifType === 'message') {
      nav?.('messages', { handle: t.actorHandle });
    } else if (t.postId) {
      nav?.('post', { id: t.postId });
    }
    dismissToast(t.id);
  }

  return (
    <>
      {/* Notification toasts — top right, compact card */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9000, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end", pointerEvents: "none" }}>
        {notifs.map((t: any) => (
          <div
            key={t.id}
            className="toast-in"
            onClick={() => handleNotifClick(t)}
            style={{
              pointerEvents: "auto",
              background: "var(--green-tint)",
              border: "2.5px solid var(--green)",
              borderRadius: 16,
              padding: "11px 14px 11px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              maxWidth: 340,
              minWidth: 240,
              boxShadow: "0 8px 32px -4px rgba(0,0,0,.18)",
              cursor: (t.notifType === 'message' || t.postId) ? "pointer" : "default",
            }}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar src={t.actor?.avatar_url} name={t.actor?.full_name || "?"} size={34} />
              <span style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: t.icon === "heart" ? "var(--clay)" : "var(--green)", display: "grid", placeItems: "center", border: "2px solid var(--green-tint)" }}>
                <Icon name={t.icon || "bell"} size={8} color="#fff" stroke={2.5} />
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.msg}</div>
              <div style={{ fontSize: 12, color: "var(--green)", opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sub}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); dismissToast(t.id); }} style={{ background: "transparent", border: "none", color: "var(--green)", opacity: 0.55, cursor: "pointer", padding: 4, flexShrink: 0 }}>
              <Icon name="close" size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Standard toasts — bottom center */}
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9000, display: "flex", flexDirection: "column", gap: 10, alignItems: "center", pointerEvents: "none" }}>
        {standard.map((t: any) => (
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
    </>
  );
}
