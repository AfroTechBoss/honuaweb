"use client";
import React from "react";
import { Icon, Avatar, VerifiedTick, DesktopSidebar, useApp } from "@/components/shared";
import { getProfile, getFollowers, getFollowing, type FollowUser } from "@/lib/profile";

const pulse: React.CSSProperties = { background: "var(--line)", animation: "skeleton-pulse 1.4s ease-in-out infinite" };

// Both sides of the graph are fetched up front rather than per tab: the tab
// labels carry the counts, so "Followers · 12" would be a lie until you'd
// already visited the other tab.
export function DesktopFollowList({ onNav, params, mode }: { onNav?: any; params?: any; mode: "followers" | "following" }) {
  const app = useApp();
  const routeHandle: string | undefined = params?.handle;
  const meHandle: string | undefined = app.user?.handle;
  // No handle in the URL means "my own lists", which we can't resolve until
  // the session has hydrated.
  const targetHandle = routeHandle || meHandle;

  const [owner, setOwner] = React.useState<any>(null);
  const [followers, setFollowers] = React.useState<FollowUser[] | null>(null);
  const [following, setFollowing] = React.useState<FollowUser[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"followers" | "following">(mode);

  React.useEffect(() => { setTab(mode); }, [mode]);

  React.useEffect(() => {
    if (!targetHandle) return;
    let alive = true;
    setOwner(null); setFollowers(null); setFollowing(null); setError(null);
    (async () => {
      try {
        const p = await getProfile(targetHandle);
        if (!alive) return;
        setOwner(p);
        const [fers, fing] = await Promise.all([getFollowers(p.id), getFollowing(p.id)]);
        if (!alive) return;
        setFollowers(fers);
        setFollowing(fing);
      } catch (e: any) {
        if (alive) setError(e?.code === "PGRST116" ? "notfound" : (e?.message || "Something went wrong"));
      }
    })();
    return () => { alive = false; };
  }, [targetHandle]);

  const goTab = (t: "followers" | "following") => {
    setTab(t);
    onNav?.(t, owner?.handle ? { handle: owner.handle } : undefined);
  };

  const list = tab === "followers" ? followers : following;
  const loading = !error && (!owner || list === null);
  const ownerName = owner?.full_name || (owner?.handle ? `@${owner.handle}` : "");

  const shell = (body: React.ReactNode) => (
    <div style={{ display: "flex", height: "100%", background: "var(--bg)" }}>
      <DesktopSidebar active="profile" onNav={onNav} />
      <main style={{ flex: 1, overflow: "auto", height: "100%" }} className="no-scrollbar">{body}</main>
    </div>
  );

  if (error) {
    return shell(
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--bg-2)", display: "grid", placeItems: "center", margin: "0 auto 14px", color: "var(--ink-4)" }}>
          <Icon name="users" size={26} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{error === "notfound" ? "No such account" : "Couldn’t load this list"}</div>
        <div style={{ fontSize: 13.5, color: "var(--ink-3)", marginTop: 6 }}>
          {error === "notfound" ? `@${targetHandle} doesn’t exist, or was renamed.` : error}
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => onNav?.("home")}>Back to feed</button>
      </div>
    );
  }

  if (!targetHandle) {
    return shell(
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 32px", textAlign: "center", color: "var(--ink-3)" }}>
        <div style={{ fontSize: 15 }}>Sign in to see who you follow.</div>
        <button className="btn btn-green" style={{ marginTop: 18 }} onClick={() => onNav?.("auth")}>Sign in</button>
      </div>
    );
  }

  return shell(
    <>
      {/* Header */}
      <div style={{ paddingTop: 24, paddingLeft: 32, paddingRight: 32, paddingBottom: 0, position: "sticky", top: 0, background: "var(--bg)", zIndex: 5 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => onNav?.("profile", owner?.handle ? { handle: owner.handle } : undefined)}>
            <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon name="arrow" size={14} /></span> Back to @{owner?.handle ?? targetHandle}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar src={owner?.avatar_url} name={ownerName} size={48} />
            <div>
              <h1 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
                {ownerName || "…"}
                {owner?.verified && <VerifiedTick size={18} />}
              </h1>
              <div style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "JetBrains Mono" }}>@{owner?.handle ?? targetHandle}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", marginTop: 18, borderBottom: "1px solid var(--line)" }}>
            {(["followers", "following"] as const).map((t) => {
              const n = t === "followers" ? followers?.length : following?.length;
              return (
                <button key={t} onClick={() => goTab(t)} style={{
                  flex: 1, background: "transparent", border: "none", padding: "12px 0", cursor: "pointer",
                  fontSize: 14, fontWeight: tab === t ? 600 : 500, color: tab === t ? "var(--ink)" : "var(--ink-3)",
                  position: "relative", textTransform: "capitalize",
                }}>
                  {t}{n === undefined ? "" : ` · ${n}`}
                  {tab === t && <div style={{ position: "absolute", bottom: -1, left: "30%", right: "30%", height: 2, background: "var(--green)", borderRadius: 2 }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "12px 32px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {loading && [0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 8px" }}>
              <div style={{ ...pulse, width: 48, height: 48, borderRadius: "50%" }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...pulse, width: 160, height: 13, borderRadius: 6 }} />
                <div style={{ ...pulse, width: 110, height: 11, borderRadius: 6, marginTop: 8 }} />
              </div>
            </div>
          ))}

          {!loading && list?.map((u) => {
            const isMe = !!app.user?.id && u.id === app.user.id;
            const isFollowing = app.follow?.has(u.handle);
            const name = u.full_name || `@${u.handle}`;
            return (
              <div key={u.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 8px", margin: "0 -8px", borderRadius: 12, cursor: "pointer" }}
                onClick={() => onNav?.("profile", { handle: u.handle })}>
                <Avatar src={u.avatar_url} name={name} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
                    {u.verified && <VerifiedTick />}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-3)", fontFamily: "JetBrains Mono" }}>
                    @{u.handle} · {(u.impact_score ?? 0).toLocaleString()} impact
                  </div>
                  {u.bio && (
                    <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 3, maxWidth: 440, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.bio}
                    </div>
                  )}
                </div>
                {!isMe && app.user?.id && (
                  <button className={isFollowing ? "btn btn-ghost" : "btn btn-primary"} onClick={(e) => {
                    e.stopPropagation();
                    app.follow.toggle(u.handle);
                    app.toast(isFollowing ? { msg: `Unfollowed ${name}`, icon: "user" } : { msg: `Following ${name}`, kind: "success", icon: "user" });
                  }}>
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            );
          })}

          {!loading && list?.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--bg-2)", display: "grid", placeItems: "center", margin: "0 auto 14px", color: "var(--ink-4)" }}>
                <Icon name="users" size={26} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {tab === "followers" ? "No followers yet" : "Not following anyone yet"}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--ink-3)", marginTop: 6 }}>
                {owner?.id === app.user?.id
                  ? (tab === "followers" ? "Post an action and people will find you." : "Find people whose work you want to follow.")
                  : `@${owner?.handle} ${tab === "followers" ? "hasn’t been followed by anyone yet." : "isn’t following anyone yet."}`}
              </div>
              {owner?.id === app.user?.id && tab === "following" && (
                <button className="btn btn-green" style={{ marginTop: 16 }} onClick={() => onNav?.("search")}>Find people →</button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
