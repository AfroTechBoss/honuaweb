"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { Logo, Avatar } from "./primitives";
import { useApp } from "./app-context";

const COLLAPSED_KEY = "sidebar-collapsed";

export function DesktopSidebar({ active, onNav }: any) {
  const app = useApp();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);
  React.useEffect(() => {
    if (localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
  }, []);

  const toggle = () => setCollapsed(c => {
    const next = !c;
    localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    return next;
  });

  const items: any[] = [
    ["Home", "home", "home"],
    ["Search", "search", "search"],
    ["Explore", "compass", "explore"],
    ["Impact", "leaf", "impact"],
    ["Action map", "map", "map"],
    ["Carbon market", "globe", "carbon"],
    ["Marketplace", "bag", "marketplace"],
    ["Orders", "package", "orders"],
    ["Bookmarks", "bookmark", "bookmarks"],
    ["Notifications", "bell", "notifications", app.unreadNotifs || 0],
    ["Messages", "msg", "messages", 0],
    ["Communities", "users", "forum"],
    ["Challenges", "flame", "tasks"],
    ["Profile", "user", "profile"],
    ["Settings", "settings", "settings"],
  ];

  const w = collapsed ? 64 : 248;

  const logoutModal = confirmLogout ? <LogoutConfirm onConfirm={() => { setConfirmLogout(false); app.logout?.(); }} onCancel={() => setConfirmLogout(false)} /> : null;

  return (
    <React.Fragment>{logoutModal}
    <aside className="desktop-sidebar" style={{
      width: w, flexShrink: 0,
      borderRight: "1px solid var(--line)", background: "var(--surface)",
      display: "flex", flexDirection: "column", height: "100%",
      transition: "width .2s ease", overflow: "hidden",
    }}>
      {/* Header: logo + collapse toggle */}
      <div style={{ padding: collapsed ? "20px 0 12px" : "20px 20px 12px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && <Logo />}
        <button onClick={toggle} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "var(--ink-3)", padding: 6, borderRadius: 8, display: "grid", placeItems: "center",
          flexShrink: 0,
        }}>
          <Icon name={collapsed ? "arrow" : "close"} size={16} />
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ padding: collapsed ? "8px 8px" : "8px 12px", flex: 1, overflow: "auto" }} className="no-scrollbar">
        {items.map(([label, icon, key, badge]) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onNav?.(key)}
              title={collapsed ? label : undefined}
              style={{
                display: "flex", alignItems: "center", gap: collapsed ? 0 : 12,
                width: "100%", padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                border: "none", background: isActive ? "var(--green-tint)" : "transparent",
                color: isActive ? "var(--green)" : "var(--ink-2)", borderRadius: 10,
                cursor: "pointer", fontWeight: isActive ? 600 : 500, fontSize: 14,
                fontFamily: "Satoshi", marginBottom: 2, position: "relative",
              }}
            >
              <Icon name={icon} size={18} stroke={isActive ? 2 : 1.75} />
              {!collapsed && <span style={{ flex: 1, textAlign: "left" }}>{label}</span>}
              {!collapsed && !!badge && (
                <span style={{ background: "var(--ink-solid)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 10, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{badge}</span>
              )}
              {collapsed && !!badge && (
                <span style={{ position: "absolute", top: 6, right: 8, background: "var(--ink-solid)", color: "#fff", fontSize: 9, width: 16, height: 16, borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: "JetBrains Mono", fontWeight: 600 }}>{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? "12px 8px" : 12, borderTop: "1px solid var(--line)", position: "relative" }}>
        {collapsed ? (
          <button onClick={() => app.openModal?.("compose")} title="New post" style={{
            width: "100%", background: "var(--green)", border: "none", borderRadius: 10,
            padding: "10px 0", display: "grid", placeItems: "center", cursor: "pointer", color: "#fff",
          }}>
            <Icon name="plus" size={18} stroke={2.2} />
          </button>
        ) : (
          <button className="btn btn-green" onClick={() => app.openModal?.("compose")} style={{ width: "100%", justifyContent: "center", padding: "11px 16px", fontSize: 14 }}>
            <Icon name="plus" size={16} stroke={2.2} /> New post
          </button>
        )}

        <div
          onClick={() => !collapsed && onNav?.("profile")}
          className="row-hover"
          style={{
            display: "flex", alignItems: "center", gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? "center" : "flex-start",
            marginTop: 14, padding: collapsed ? "8px 0" : "8px 6px",
            borderRadius: 10, cursor: "pointer",
          }}
        >
          <Avatar name={app.user?.name?.charAt(0) || "Y"} src={app.user?.avatar} size={36} />
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.user?.name || "You"}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "JetBrains Mono" }}>@{app.user?.handle || "you"}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }} style={{ background: menuOpen ? "var(--bg-2)" : "transparent", border: "none", borderRadius: 8, padding: 5, cursor: "pointer", color: "var(--ink-3)" }}>
                <Icon name="more" size={16} />
              </button>
            </>
          )}
        </div>

        {menuOpen && !collapsed && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <div className="menu-pop" style={{ position: "absolute", bottom: 64, left: 12, right: 12, zIndex: 41, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 20px 50px -16px rgba(0,0,0,.3)", padding: 6, overflow: "hidden" }}>
              {([
                ["View profile", "user", () => onNav?.("profile")],
                ["Sell on Honua", "bag", () => onNav?.("sell")],
                ["Seller dashboard", "leaf", () => onNav?.("seller")],
                ["Admin · approvals", "check", () => onNav?.("admin")],
                ["Settings", "settings", () => onNav?.("settings")],
                ["Switch appearance", "sparkles", () => app.toggleDark?.()],
                ["Help & support", "comment", () => app.toast?.({ msg: "Help center", sub: "Support docs would open here.", icon: "comment" })],
                ["Log out", "logout", () => { setMenuOpen(false); setConfirmLogout(true); }],
              ] as any[]).map(([l, ic, fn]) => (
                <button key={l} onClick={() => { setMenuOpen(false); fn(); }} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 10px", border: "none", background: "transparent", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, color: l === "Log out" ? "var(--clay)" : "var(--ink-2)", fontFamily: "Satoshi" }} className="row-hover">
                  <Icon name={ic} size={16} /> {l}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
    </React.Fragment>
  );
}

function LogoutConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 320, boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Log out?</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 24 }}>You'll need to sign back in to access your account.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-2)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Satoshi' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: 'var(--clay)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Satoshi' }}>Log out</button>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  const app = useApp();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);

  if (!app.authed) return null;

  const pathKey = pathname === "/" ? "home"
    : pathname.startsWith("/explore") ? "explore"
    : pathname.startsWith("/marketplace") ? "marketplace"
    : pathname.startsWith("/messages") ? "messages"
    : pathname.startsWith("/notifications") ? "notifications"
    : pathname.startsWith("/communities") ? "communities"
    : pathname.startsWith("/profile") ? "profile"
    : pathname.startsWith("/bookmarks") ? "bookmarks"
    : pathname.startsWith("/settings") ? "settings"
    : "";

  const nav = (key: string) => { setMoreOpen(false); app.nav?.(key); };

  const mainItems: [string, string, string][] = [
    ["Home", "home", "home"],
    ["Explore", "compass", "explore"],
    ["Shop", "bag", "marketplace"],
    ["Messages", "comment", "messages"],
  ];

  const moreItems: [string, string, string][] = [
    ["Notifications", "bell", "notifications"],
    ["Communities", "users", "communities"],
    ["Bookmarks", "bookmark", "bookmarks"],
    ["My Profile", "user", "profile"],
    ["Impact", "leaf", "impact"],
    ["Settings", "settings", "settings"],
  ];

  const moreActive = moreItems.some(([,, k]) => k === pathKey);

  return (
    <>
      {confirmLogout && <LogoutConfirm onConfirm={() => { setConfirmLogout(false); setMoreOpen(false); app.logout?.(); }} onCancel={() => setConfirmLogout(false)} />}
      {moreOpen && (
        <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            <div className="more-sheet-scroll">
              <div className="more-sheet-grid">
                {moreItems.map(([label, icon, key]) => (
                  <button key={key} onClick={() => nav(key)} className={`more-sheet-item${pathKey === key ? " active" : ""}`}>
                    <div className="more-sheet-icon">
                      <Icon name={icon} size={22} stroke={pathKey === key ? 2 : 1.75} />
                    </div>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="more-sheet-actions">
                <button onClick={() => { setMoreOpen(false); app.nav?.("sell"); }} className="more-sheet-action-btn">
                  <Icon name="bag" size={16} /> Sell on Honua
                </button>
                <button onClick={() => { setConfirmLogout(true); }} className="more-sheet-action-btn logout">
                  <Icon name="logout" size={16} /> Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <nav className="mobile-nav">
        {mainItems.map(([label, icon, key]) => (
          <button key={key} onClick={() => nav(key)} className={`mobile-nav-item${pathKey === key ? " active" : ""}`}>
            <Icon name={icon} size={22} stroke={pathKey === key ? 2 : 1.75} />
            <span>{label}</span>
          </button>
        ))}
        <button onClick={() => setMoreOpen(o => !o)} className={`mobile-nav-item${moreActive || moreOpen ? " active" : ""}`}>
          <Icon name="bars" size={22} stroke={moreActive || moreOpen ? 2 : 1.75} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

export function MobileComposeFab() {
  const app = useApp();
  const pathname = usePathname();
  const showFab = pathname === "/" || pathname.startsWith("/explore") || pathname.startsWith("/profile");
  if (!app.authed || !showFab) return null;
  return (
    <button className="mobile-compose-fab" onClick={() => app.openModal?.("compose")}>
      <Icon name="plus" size={24} stroke={2.2} color="#fff" />
    </button>
  );
}
