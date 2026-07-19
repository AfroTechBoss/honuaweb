"use client";
import React from "react";
import { Icon, Avatar, DesktopSidebar, useApp, MOCK } from "@/components/shared";

// Follower / following relationships (mirrors the mobile + backend follow graph).
const FOLLOW_LISTS: Record<string, { followers: string[]; following: string[] }> = {
  you: { followers: ["sarah", "maya", "marcus", "okafor", "tara"], following: ["sarah", "greentech", "can", "okafor"] },
  sarahgreen: { followers: ["maya", "marcus", "greentech", "can", "okafor", "tara"], following: ["greentech", "can", "okafor"] },
  greentech: { followers: ["sarah", "okafor", "can"], following: ["okafor"] },
  urbangrower: { followers: ["sarah", "tara", "marcus"], following: ["sarah", "greentech", "can"] },
  climateactnow: { followers: ["sarah", "maya", "marcus", "greentech", "okafor", "tara"], following: ["sarah", "okafor"] },
  ecomarcus: { followers: ["sarah", "maya"], following: ["sarah", "greentech", "can", "okafor", "tara"] },
  tara_l: { followers: ["maya", "marcus"], following: ["sarah", "can"] },
  dr_okafor: { followers: ["sarah", "greentech", "can", "maya"], following: ["greentech", "can"] },
};

function userByHandle(handle?: string) {
  if (!handle || handle === "you") return MOCK.users.you;
  const k = Object.keys(MOCK.users).find((x) => MOCK.users[x].handle === handle);
  return k ? MOCK.users[k] : MOCK.users.sarah;
}

export function DesktopFollowList({ onNav, params, mode }: { onNav?: any; params?: any; mode: "followers" | "following" }) {
  const app = useApp();
  const handle = params?.handle;
  const owner = userByHandle(handle);
  const rel = FOLLOW_LISTS[owner.handle] || FOLLOW_LISTS.you;
  const [tab, setTab] = React.useState<"followers" | "following">(mode);
  const keys = tab === "followers" ? rel.followers : rel.following;

  const goTab = (t: "followers" | "following") => { setTab(t); onNav?.(t, { handle: owner.handle }); };

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg)" }}>
      <DesktopSidebar active="profile" onNav={onNav} />
      <main style={{ flex: 1, overflow: "auto", height: "100%" }} className="no-scrollbar">
        {/* Header */}
        <div style={{ paddingTop: 24, paddingLeft: 32, paddingRight: 32, paddingBottom: 0, position: "sticky", top: 0, background: "var(--bg)", zIndex: 5 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => onNav?.("profile", { handle: owner.handle })}>
              <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon name="arrow" size={14} /></span> Back to @{owner.handle}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar src={owner.avatar} name={owner.name} size={48} verified={owner.verified} />
              <div>
                <h1 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{owner.name}</h1>
                <div style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "JetBrains Mono" }}>@{owner.handle}</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", marginTop: 18, borderBottom: "1px solid var(--line)" }}>
              {(["followers", "following"] as const).map((t) => (
                <button key={t} onClick={() => goTab(t)} style={{
                  flex: 1, background: "transparent", border: "none", padding: "12px 0", cursor: "pointer",
                  fontSize: 14, fontWeight: tab === t ? 600 : 500, color: tab === t ? "var(--ink)" : "var(--ink-3)",
                  position: "relative", textTransform: "capitalize",
                }}>
                  {t} · {t === "followers" ? rel.followers.length : rel.following.length}
                  {tab === t && <div style={{ position: "absolute", bottom: -1, left: "30%", right: "30%", height: 2, background: "var(--green)", borderRadius: 2 }} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ padding: "12px 32px 48px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {keys.map((k) => {
              const u = MOCK.users[k];
              if (!u) return null;
              const isMe = u.handle === "you";
              const following = app.follow?.has(u.handle);
              return (
                <div key={k} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 8px", margin: "0 -8px", borderRadius: 12, cursor: "pointer" }}
                  onClick={() => onNav?.("profile", { handle: u.handle })}>
                  <Avatar src={u.avatar} name={u.name} size={48} verified={u.verified} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{u.name}</span>
                      {u.verified && <span style={{ background: "var(--sky)", color: "#fff", width: 14, height: 14, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 9 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-3)", fontFamily: "JetBrains Mono" }}>@{u.handle} · {u.score} impact</div>
                    <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 3, maxWidth: 440, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.handle === "sarahgreen" ? "Community solar organizer in Cascadia." : u.handle === "greentech" ? "Next-gen wind turbine technology." : "Working to shrink my footprint, one logged action at a time."}
                    </div>
                  </div>
                  {!isMe && (
                    <button className={following ? "btn btn-ghost" : "btn btn-primary"} onClick={(e) => { e.stopPropagation(); app.follow.toggle(u.handle); app.toast(following ? { msg: `Unfollowed ${u.name}`, icon: "user" } : { msg: `Following ${u.name}`, kind: "success", icon: "user" }); }}>
                      {following ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })}
            {keys.length === 0 && <div style={{ textAlign: "center", color: "var(--ink-3)", padding: "60px 0" }}>No one here yet.</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
