"use client";
import React from "react";
import { Icon, Logo, Avatar, VerifiedTick, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, NotifPrefs, useApp, PostCard, PostCardSkeleton, ProfileSkeleton, ActionBtn, BookmarkSheet, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { PostDetailSkeleton } from "@/components/primitives";
import { getProfile, getProfilePosts, getFollowerCount, getFollowingCount, getAchievements, getProjects, isFollowing, toggleFollow } from "@/lib/profile";
import { getAllLogs } from "@/lib/impact";
import { supabase } from "@/lib/supabase";
import { ImageLightbox } from "@/components/post-card";
import { loadOrders } from "@/components/screens/orders";
import { ImpactVouchBar, useImpactVouches, PostImpactVouch } from "@/components/impact-vouch";

// Lifetime totals, summed from the impact ledger itself. `profiles` carries
// co2_avoided_kg / green_points columns, but nothing in the app ever writes to
// them — reading those is how this card sat at zero for every account.
export type ImpactTotals = { co2: number; verifiedCo2: number; pendingCount: number; points: number; actions: number };

function totalsFromLogs(logs: any[]): ImpactTotals {
  return {
    co2: logs.reduce((s, l) => s + Number(l.co2_saved_kg ?? 0), 0),
    verifiedCo2: logs.filter(l => l.status === 'verified').reduce((s, l) => s + Number(l.co2_saved_kg ?? 0), 0),
    pendingCount: logs.filter(l => l.status === 'pending').length,
    points: logs.reduce((s, l) => s + Number(l.points ?? 0), 0),
    actions: logs.length,
  };
}

function useProfileData(handleOrId: string | undefined, currentUserId: string | undefined) {
  const [profile, setProfile] = React.useState<any>(null);
  const [posts, setPosts] = React.useState<any[]>([]);
  const [followerCount, setFollowerCount] = React.useState(0);
  const [followingCount, setFollowingCount] = React.useState(0);
  const [achievements, setAchievements] = React.useState<any[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [impact, setImpact] = React.useState<ImpactTotals | null>(null);
  const [following, setFollowing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!handleOrId) return;
    setLoading(true);
    Promise.all([
      getProfile(handleOrId),
    ]).then(async ([p]) => {
      setProfile(p);
      const [postsData, fc, fwc, ach, proj, logs] = await Promise.all([
        getProfilePosts(p.id),
        getFollowerCount(p.id),
        getFollowingCount(p.id),
        getAchievements(p.id),
        getProjects(p.id),
        getAllLogs(p.id),
      ]);
      setPosts(postsData);
      setFollowerCount(fc);
      setFollowingCount(fwc);
      setAchievements(ach);
      setProjects(proj);
      setImpact(totalsFromLogs(logs));
      if (currentUserId && currentUserId !== p.id) {
        setFollowing(await isFollowing(currentUserId, p.id));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [handleOrId, currentUserId]);

  return { profile, posts, followerCount, followingCount, achievements, projects, impact, following, setFollowing, loading };
}

// kg up to a tonne, then tonnes. Keeps one decimal under 10 kg so a first small
// action doesn't round away to "0kg".
function kgLabel(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  if (kg >= 10 || kg === 0) return `${Math.round(kg)}kg`;
  return `${Math.round(kg * 10) / 10}kg`;
}

// =============== Desktop Profile ===============
export function DesktopProfile({ onNav, params }) {
  const [tab, setTab] = React.useState('posts');
  const app = useApp();
  const handle = params?.handle;

  // If no handle or handle is 'you', show the signed-in user's profile
  const lookupKey = (!handle || handle === 'you') ? app.user?.handle : handle;
  const isOwn = !handle || handle === 'you' || handle === app.user?.handle;

  const { profile, posts, followerCount, followingCount, achievements, projects, impact, following, setFollowing, loading } =
    useProfileData(lookupKey, app.user?.id);

  // Check if this profile has blocked the current viewer
  const [viewerIsBlocked, setViewerIsBlocked] = React.useState(false);
  React.useEffect(() => {
    if (!profile?.id || !app.user?.id || isOwn) return;
    supabase
      .from('blocked_users')
      .select('user_id')
      .eq('user_id', profile.id)
      .eq('blocked_id', app.user.id)
      .maybeSingle()
      .then(({ data }) => setViewerIsBlocked(!!data));
  }, [profile?.id, app.user?.id, isOwn]);

  const handleFollowToggle = async () => {
    if (!app.user?.id || !profile?.id) return;
    const nowFollowing = !following;
    await toggleFollow(app.user.id, profile.id, following);
    setFollowing(nowFollowing);
    if (nowFollowing) {
      const { createNotification } = await import('@/lib/notifications');
      await createNotification({ userId: profile.id, actorId: app.user.id, type: 'follow', body: 'started following you' });
    }
  };

  // Posts split: own posts vs reposts
  const ownPosts = posts.filter(p => !p.is_repost);
  const reposts = posts.filter(p => p.is_repost);
  const mediaPosts = posts.filter(p => p.image_url);

  // Impact verification state for the timeline
  const timelinePostIds = React.useMemo(() => posts.map((p: any) => p.id), [posts]);
  const impactVouches = useImpactVouches(timelinePostIds);

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  if (loading) {
    return (
      <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
        <DesktopSidebar active="profile" onNav={onNav} />
        <main style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
          <ProfileSkeleton />
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
        <DesktopSidebar active="profile" onNav={onNav} />
        <main style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Profile not found</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>This account doesn't exist or may have been removed.</div>
          </div>
        </main>
      </div>
    );
  }

  if (viewerIsBlocked) {
    return (
      <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
        <DesktopSidebar active="profile" onNav={onNav} />
        <main style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', padding: 32, maxWidth: 360 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--line)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <Icon name="lock" size={28} color="var(--ink-3)" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>You can't view this profile</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>This user has blocked you. You can't see their posts, followers, or any other profile information.</div>
            <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => onNav?.('home')}>Go to home feed</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="profile" onNav={onNav} />
      <main style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
        {/* Cover */}
        <div className="profile-cover" style={{
          height: 200,
          background: profile.cover_url
            ? `url(${profile.cover_url}) center/cover`
            : 'linear-gradient(135deg, #1f6f3f 0%, #2e9a5b 50%, #c8e6cf 100%)',
          position: 'relative',
        }}>
          {!profile.cover_url && (
            <svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <path d="M0 100 Q200 60 400 100 T800 80 L800 200 0 200Z" fill="rgba(255,255,255,.1)"/>
              <path d="M0 140 Q200 100 400 140 T800 120 L800 200 0 200Z" fill="rgba(255,255,255,.1)"/>
            </svg>
          )}
          {isOwn && (
            <button onClick={() => app.toast?.({ msg: 'Coming soon', sub: 'Cover photo upload coming soon.', icon: 'sparkles' })} style={{ position: 'absolute', bottom: 12, right: 16, background: 'rgba(0,0,0,.45)', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="edit" size={13} /> Edit cover
            </button>
          )}
        </div>

        <div className="profile-content" style={{ padding: '0 28px', maxWidth: 1100, margin: '0 auto' }}>
          {/* Avatar + actions row */}
          <div className="profile-avatar-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -52, marginBottom: 14, position: 'relative', zIndex: 1 }}>
            <div className="profile-avatar-wrap" style={{ borderRadius: '50%', overflow: 'hidden', width: 104, height: 104, flexShrink: 0, boxShadow: '0 2px 16px rgba(0,0,0,.2)' }}>
              <Avatar src={profile.avatar_url} name={profile.full_name} size={104} noBorder />
            </div>
            <div className="profile-actions" style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
              {isOwn ? (
                <>
                  <button className="btn btn-ghost profile-action-btn" onClick={() => { navigator.clipboard?.writeText(window.location.href); app.toast?.({ msg: 'Link copied', icon: 'share' }); }}><Icon name="share" size={14} /> <span className="btn-label">Share</span></button>
                  <button className="btn btn-primary profile-action-btn" onClick={() => app.openModal?.('editprofile')}><Icon name="edit" size={14} /> <span className="btn-label">Edit profile</span></button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost" onClick={() => onNav?.('messages', { handle: profile?.handle })}><Icon name="msg" size={14} /> Message</button>
                  <button className="btn btn-ghost" onClick={() => app.openModal?.('tip', { user: profile })}><Icon name="gift" size={14} /> Tip</button>
                  <button className={following ? 'btn btn-ghost' : 'btn btn-primary'} onClick={handleFollowToggle}>{following ? 'Following' : 'Follow'}</button>
                </>
              )}
            </div>
          </div>

          {/* Identity: name + handle */}
          <div className="profile-identity-row" style={{ marginBottom: 18, paddingTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="font-display profile-name" style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{profile.full_name}</h1>
              {profile.verified && (
                <button
                  type="button"
                  aria-label={`About @${profile.handle}'s verification`}
                  onClick={() => app.openModal('verification', { profile })}
                  style={{ background: 'none', border: 'none', padding: 0, lineHeight: 0, cursor: 'pointer', borderRadius: 999 }}
                >
                  <VerifiedTick size={22} />
                </button>
              )}
              {profile.impact_score > 0 && <span className="chip chip-green">Impact score {profile.impact_score}</span>}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
              @{profile.handle}
              {profile.location && ` · ${profile.location}`}
              {joinedDate && ` · Joined ${joinedDate}`}
            </div>
          </div>
          <div style={{ display: 'none' }}>{/* legacy identity row spacer */}</div>
          <div className="profile-identity-row-actions" style={{ display: 'none' }}>
          </div>

          {/* Bio + stats */}
          <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 18, marginBottom: 18 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 20 }}>
              {profile.bio
                ? <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)' }}>{profile.bio}</p>
                : <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-4)', fontStyle: 'italic' }}>No bio yet.{isOwn && ' Add one to tell your story.'}</p>
              }
              <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 13, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
                {profile.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={14} /> {profile.location}</span>}
                {profile.website && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="globe" size={14} /> {profile.website}</span>}
                {joinedDate && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={14} /> Joined {joinedDate}</span>}
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
                <Stat n={ownPosts.length} l="Posts" />
                <Stat n={followerCount.toLocaleString()} l="Followers" onClick={() => onNav?.('followers', { handle: profile.handle })} />
                <Stat n={followingCount.toLocaleString()} l="Following" onClick={() => onNav?.('following', { handle: profile.handle })} />
                <Stat n={profile.impact_score || 0} l="Impact score" green />
                <Stat n={impact ? kgLabel(impact.co2) : '—'} l="CO₂ avoided" green />
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #1f6f3f, #2e9a5b)', color: '#fff', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', opacity: .85, letterSpacing: '.05em' }}>IMPACT LEDGER · LIFETIME</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
                <Stat n={impact ? kgLabel(impact.co2) : '—'} l="CO₂ avoided" light />
                <Stat n={impact ? impact.points.toLocaleString() : '—'} l="Green points" light />
                <Stat n={projects.length} l="Projects led" light />
                <Stat n={achievements.length} l="Achievements" light />
              </div>
              {/* How much of that total the community has actually vouched for —
                  the card used to claim "verified" over numbers nobody had checked. */}
              <div style={{ fontSize: 11.5, marginTop: 12, opacity: .9, display: 'flex', alignItems: 'center', gap: 6 }}>
                {impact === null
                  ? <span>Couldn't load the ledger.</span>
                  : impact.actions === 0
                    ? <span>{isOwn ? 'Log your first action to start the ledger.' : 'No actions logged yet.'}</span>
                    : impact.verifiedCo2 > 0
                      ? <span>✓ {kgLabel(impact.verifiedCo2)} community-verified{impact.pendingCount ? ` · ${impact.pendingCount} pending` : ''}</span>
                      : <span>{impact.actions} action{impact.actions === 1 ? '' : 's'} logged{impact.pendingCount ? ` · ${impact.pendingCount} awaiting vouches` : ' · none verified yet'}</span>
                }
              </div>
              <button className="btn" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', marginTop: 14, padding: '7px 12px', fontSize: 12 }} onClick={() => onNav?.('impact')}>
                See full impact ledger →
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="profile-tabs" style={{ borderBottom: '1px solid var(--line)', marginBottom: 18, display: 'flex', gap: 4 }}>
            {[...(['Posts', 'Reposts', 'Projects', 'Achievements', 'Media']), ...(isOwn ? ['Orders', 'Saved'] : [])].map(t => (
              <button key={t} onClick={() => setTab(t.toLowerCase())} style={{
                background: 'transparent', border: 'none', padding: '12px 16px',
                color: tab === t.toLowerCase() ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: tab === t.toLowerCase() ? 600 : 500, fontSize: 14,
                cursor: 'pointer', position: 'relative', fontFamily: 'Satoshi',
              }}>
                {t}
                {tab === t.toLowerCase() && <div style={{ position: 'absolute', bottom: -1, left: 12, right: 12, height: 2, background: 'var(--green)', borderRadius: 2 }} />}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="profile-tab-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, paddingBottom: 40 }}>
            <div>
              {tab === 'posts' && (
                ownPosts.length === 0
                  ? <EmptyTab icon="" msg={isOwn ? "You haven't posted yet. Share your first action!" : "No posts yet."} />
                  : ownPosts.map(p => <RealPostCard key={p.id} post={p} onNav={onNav} impact={impactVouches} />)
              )}
              {tab === 'reposts' && (
                reposts.length === 0
                  ? <EmptyTab icon="" msg="No reposts yet." />
                  : reposts.map(p => <RealPostCard key={p.id} post={p} onNav={onNav} isRepost impact={impactVouches} />)
              )}
              {tab === 'projects' && (
                projects.length === 0
                  ? <EmptyTab icon="" msg={isOwn ? "Start a project to track real-world impact." : "No projects yet."} />
                  : projects.map((pr: any) => (
                    <div key={pr.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, marginBottom: 12 }}>
                      {pr.cover_url && <img src={pr.cover_url} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} />}
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{pr.title}</div>
                      {pr.description && <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.55 }}>{pr.description}</div>}
                      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                        <span>{pr.members} member{pr.members !== 1 ? 's' : ''}</span>
                        {pr.impact_kg > 0 && <span>{pr.impact_kg}kg CO₂</span>}
                        <span style={{ textTransform: 'capitalize' }}>{pr.status}</span>
                      </div>
                    </div>
                  ))
              )}
              {tab === 'achievements' && (
                achievements.length === 0
                  ? <EmptyTab icon="" msg="No achievements yet. Log your first action to earn one!" />
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {achievements.map((a: any) => (
                      <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: 'var(--green-tint)' }}><Icon name="award" size={20} color="var(--green)" /></div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                          {a.description && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{a.description}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
              )}
              {tab === 'media' && (
                mediaPosts.length === 0
                  ? <EmptyTab icon="" msg="No media posts yet." />
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                    {mediaPosts.map((p: any) => (
                      <img key={p.id} src={p.image_url} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} />
                    ))}
                  </div>
              )}
              {tab === 'orders' && isOwn && (() => {
                const orders = loadOrders();
                if (!orders.length) return <EmptyTab icon="" msg="No orders yet. Find something good in the marketplace!" />;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {orders.slice().reverse().map((o: any) => (
                      <div key={o.id} onClick={() => onNav?.('order', { id: o.id })} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}>
                        {o.imgUrl && <img src={o.imgUrl} style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name || o.items?.[0]?.name || 'Order'}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{o.id} · {o.date ? new Date(o.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</div>
                        </div>
                        <SBadge status={o.status || 'processing'} />
                      </div>
                    ))}
                  </div>
                );
              })()}
              {tab === 'saved' && isOwn && <SavedProducts ids={app.state?.wishlist ?? []} onNav={onNav} />}
            </div>

            {/* Sidebar */}
            <div className="right-panel">
              {achievements.length > 0 && (
                <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18, marginBottom: 12 }}>
                  <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 600 }}>Achievements</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {achievements.slice(0, 8).map((a: any) => (
                      <div key={a.id} title={a.title} style={{ aspectRatio: '1', borderRadius: 10, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="award" size={18} color="var(--green)" /></div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>{achievements.length} earned</div>
                </div>
              )}

              {projects.length > 0 && (
                <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18, marginBottom: 12 }}>
                  <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 600 }}>Projects led</h3>
                  {projects.slice(0, 3).map((pr: any, i: number) => (
                    <div key={pr.id} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{pr.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, textTransform: 'capitalize' }}>{pr.status} · {pr.members} member{pr.members !== 1 ? 's' : ''}</div>
                    </div>
                  ))}
                </div>
              )}

              {profile.interests?.length > 0 && (
                <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18, marginBottom: 12 }}>
                  <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 600 }}>Interests</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.interests.map((it: string) => (
                      <span key={it} style={{ fontSize: 12, background: 'var(--green-tint)', color: 'var(--green)', padding: '3px 10px', borderRadius: 999, fontWeight: 500 }}>{it}</span>
                    ))}
                  </div>
                </div>
              )}

              <SuggestedFollows />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// The wishlist holds product ids; the products themselves come from the live
// catalogue. (It used to match against the demo catalogue, so only invented
// products could ever show up here.)
function SavedProducts({ ids, onNav }: { ids: string[]; onNav?: any }) {
  const [saved, setSaved] = React.useState<any[] | null>(null);
  const key = ids.join(',');
  React.useEffect(() => {
    let alive = true;
    import('@/lib/market').then(({ getProductsByIds }) => getProductsByIds(ids))
      .then(rows => { if (alive) setSaved(rows); })
      .catch(() => { if (alive) setSaved([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (saved === null) return <EmptyTab icon="" msg="Loading saved products…" />;
  if (!saved.length) return <EmptyTab icon="" msg="Nothing saved yet. Tap the bookmark on any product to save it." />;
  return (
    <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {saved.map(p => (
        <div key={p.id} onClick={() => onNav?.('product', { id: p.id })} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
          <ImagePlaceholder label={p.name} height={140} src={p.imgUrl} />
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{(p.brand || '').toUpperCase()}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{p.name}</div>
            <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Lora', marginTop: 6 }}>{p.price}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyTab({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ink-3)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{msg}</div>
    </div>
  );
}

const REPORT_OPTIONS_LIST = ['Spam or misleading','Hate speech or harassment','Violence or dangerous content','False information','Nudity or sexual content','Intellectual property violation','Other'];

function PostMoreMenu({ profile, postId, isOwn = false, postContent = '', postCreatedAt = '' }: { profile: any; postId: string; isOwn?: boolean; postContent?: string; postCreatedAt?: string }) {
  const app = useApp();
  const [open, setOpen] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [editContent, setEditContent] = React.useState('');
  const [editSaving, setEditSaving] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [reportError, setReportError] = React.useState('');
  const canEdit = !!postCreatedAt && (Date.now() - new Date(postCreatedAt).getTime()) < 15 * 60 * 1000;

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); setOpen(false);
    if (profile?.id) app.muteUser?.(profile.id);
    app.toast?.({ msg: `@${profile?.handle} muted`, sub: "You won't see their posts in your feed.", icon: 'bell' });
  };
  const handleBlock = (e: React.MouseEvent) => {
    e.stopPropagation(); setOpen(false);
    if (profile?.id) app.blockUser?.(profile.id);
    app.toast?.({ msg: `@${profile?.handle} blocked`, sub: "They can no longer see your profile or posts.", icon: 'lock' });
  };
  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation(); setOpen(false); setReason(''); setSubmitted(false); setReportError(''); setShowReport(true);
  };
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); setShowDelete(false);
    try {
      await supabase.from('posts').delete().eq('id', postId);
      app.toast?.({ msg: 'Post deleted', icon: 'trash', kind: 'success' });
    } catch {
      app.toast?.({ msg: 'Failed to delete post', icon: 'close' });
    }
  };
  // The third of the three modals that showed a tick and wrote nothing. It goes
  // to the same table as the feed's — see migration 046 and lib/content-reports.
  const submit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reason || sending) return;
    setSending(true);
    setReportError('');
    const { fileReport } = await import('@/lib/content-reports');
    const outcome = await fileReport({
      targetType: 'post',
      targetId: postId,
      targetOwnerId: profile?.id,
      reporterId: app.user?.id,
      reason,
    });
    setSending(false);

    if (outcome.kind === 'filed' || outcome.kind === 'duplicate') {
      setSubmitted(true);
      setTimeout(() => { setShowReport(false); setSubmitted(false); }, 1800);
      app.toast?.(outcome.kind === 'duplicate'
        ? { msg: 'Already reported', sub: "You've reported this post before — it's with our moderators.", icon: 'check' }
        : { msg: 'Report submitted', sub: 'Thanks for helping keep Honua safe.', icon: 'check', kind: 'success' });
      return;
    }
    setReportError(outcome.kind === 'signed-out' ? 'Sign in to report a post.' : outcome.message);
  };

  const handleEditOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); setOpen(false);
    setEditContent(postContent);
    setShowEdit(true);
  };

  const handleEditSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editContent.trim()) return;
    setEditSaving(true);
    try {
      await supabase.from('posts').update({ content: editContent.trim() }).eq('id', postId);
      app.toast?.({ msg: 'Post updated', kind: 'success', icon: 'edit' });
      setShowEdit(false);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div style={{ position: 'relative', marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: '2px 4px', borderRadius: 6, display: 'grid', placeItems: 'center' }}>
        <Icon name="more" size={15} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 100, minWidth: 180, overflow: 'hidden' }}>
            {isOwn ? (<>
              <button onClick={handleEditOpen} disabled={!canEdit} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: canEdit ? 'pointer' : 'not-allowed', fontSize: 14, color: canEdit ? 'var(--ink-2)' : 'var(--ink-4)', textAlign: 'left' }}>
                <Icon name="edit" size={15} /> {canEdit ? 'Edit post' : 'Edit post (expired)'}
              </button>
              <button onClick={e => { e.stopPropagation(); setOpen(false); setShowDelete(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--clay)', textAlign: 'left', borderTop: '1px solid var(--line)' }}>
                <Icon name="trash" size={15} /> Delete post
              </button>
            </>) : (
              <>
                <button onClick={handleMute} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)', textAlign: 'left' }}>
                  <Icon name="bell" size={15} /> Mute @{profile?.handle}
                </button>
                <button onClick={handleBlock} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)', textAlign: 'left', borderTop: '1px solid var(--line)' }}>
                  <Icon name="lock" size={15} /> Block @{profile?.handle}
                </button>
                <button onClick={handleReport} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--clay)', textAlign: 'left', borderTop: '1px solid var(--line)' }}>
                  <Icon name="flag" size={15} /> Report post
                </button>
              </>
            )}
          </div>
        </>
      )}
      {showDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); setShowDelete(false); }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, width: 340, maxWidth: '90vw', boxShadow: '0 16px 48px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Delete post?</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 22 }}>This can't be undone. The post will be permanently removed.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={e => { e.stopPropagation(); setShowDelete(false); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)' }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'var(--clay)', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); setShowEdit(false); }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, width: 520, maxWidth: '92vw', boxShadow: '0 16px 48px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Edit post</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 16 }}>You have 15 minutes from when a post is published to edit it.</div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={5}
              style={{ width: '100%', borderRadius: 12, border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-2)', padding: '12px 14px', fontSize: 15, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={e => { e.stopPropagation(); setShowEdit(false); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)' }}>Cancel</button>
              <button onClick={handleEditSave} disabled={editSaving || !editContent.trim()} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'var(--green)', cursor: editSaving || !editContent.trim() ? 'not-allowed' : 'pointer', fontSize: 14, color: '#fff', fontWeight: 600, opacity: editSaving || !editContent.trim() ? 0.6 : 1 }}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); setShowReport(false); }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, width: 380, maxWidth: '90vw', boxShadow: '0 16px 48px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Report submitted</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>Thanks for keeping Honua safe.</div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Report post</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>Why are you reporting this post?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {REPORT_OPTIONS_LIST.map(opt => (
                    <button key={opt} onClick={() => setReason(opt)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${reason === opt ? 'var(--green)' : 'var(--line)'}`, background: reason === opt ? 'var(--green-tint)' : 'var(--bg)', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)', textAlign: 'left', fontWeight: reason === opt ? 600 : 400 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${reason === opt ? 'var(--green)' : 'var(--line-2)'}`, background: reason === opt ? 'var(--green)' : 'transparent', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                        {reason === opt && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
                {reportError && (
                  <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(190,90,60,.1)', color: 'var(--clay)', fontSize: 12.5, lineHeight: 1.45 }}>{reportError}</div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowReport(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)' }}>Cancel</button>
                  <button onClick={submit} disabled={!reason || sending} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: reason && !sending ? 'var(--clay)' : 'var(--line)', cursor: reason && !sending ? 'pointer' : 'not-allowed', fontSize: 14, color: '#fff', fontWeight: 600 }}>{sending ? 'Sending…' : 'Submit report'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RealPostCard({ post, onNav, isRepost = false, impact }: { post: any; onNav: any; isRepost?: boolean; impact?: { logs: Record<string, any>; mine: string[]; vouch: (log: any) => void } }) {
  const app = useApp();
  const profile = post.profile;
  const isOwnPost = !!app.user?.id && (post.user_id === app.user.id || profile?.handle === app.user.handle);
  const original = post.original;
  const liked = app.like?.has(post.id);
  const timeAgo = (ts: string) => {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div onClick={() => onNav?.('post', { id: post.id })} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, marginBottom: 12, cursor: 'pointer' }}>
      {isRepost && original && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="repost" size={13} /> Reposted from <strong>@{original.profile?.handle}</strong>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <span onClick={stop}><Avatar src={profile?.avatar_url} name={profile?.full_name} size={40} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{profile?.full_name}</span>
            {profile?.verified && <VerifiedTick />}
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{profile?.handle} · {timeAgo(post.created_at)}</span>
            <PostMoreMenu profile={profile} postId={post.id} isOwn={isOwnPost} postContent={post.content ?? ''} postCreatedAt={post.created_at ?? ''} />
          </div>
          {(isRepost && original ? original.content : post.content) && (() => {
            const text: string = (isRepost && original ? original.content : post.content) ?? '';
            return (
              <p style={{ margin: '0 0 10px', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {text.split('\n').map((line: string, li: number, arr: string[]) => (
                  <React.Fragment key={li}>{line}{li < arr.length - 1 && <br />}</React.Fragment>
                ))}
              </p>
            );
          })()}
          {(isRepost ? original?.image_url : post.image_url) && (
            <img src={isRepost ? original.image_url : post.image_url} style={{ width: '100%', borderRadius: 12, marginBottom: 10, objectFit: 'cover', maxHeight: 320 }} />
          )}
          {impact?.logs?.[post.id] && (
            <ImpactVouchBar
              log={impact.logs[post.id]}
              vouched={impact.mine.includes(impact.logs[post.id].id)}
              isOwn={isOwnPost}
              onVouch={impact.vouch}
            />
          )}
          <div onClick={stop} style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--ink-3)' }}>
            <ActionBtn icon="heart" count={(post.likes_count ?? 0) + (app.realtimeDeltas?.[post.id]?.likes ?? 0)} active={liked} activeColor="var(--clay)" onClick={() => app.like?.toggle(post.id)} />
            <ActionBtn icon="comment" count={post.comments_count} onClick={() => onNav?.('post', { id: post.id })} />
            <ActionBtn icon="repost" count={(post.reposts_count ?? 0) + (app.realtimeDeltas?.[post.id]?.reposts ?? 0)} active={app.repost?.has(post.id)} activeColor="var(--green)" onClick={() => { app.repost?.toggle(post.id); app.toast?.({ msg: app.repost?.has(post.id) ? 'Repost removed' : 'Reposted to your followers', icon: 'repost' }); }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommentRow({ usr, text, time, likes, onNav }) {
  const [liked, setLiked] = React.useState(false);
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid var(--line)' }}>
      <span onClick={() => onNav?.('profile', { handle: usr.handle })} style={{ cursor: 'pointer' }}><Avatar src={usr.avatar} name={usr.name} size={36} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{usr.name}</span>
          {usr.verified && <VerifiedTick size={13} />}
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{usr.handle} · {time}</span>
        </div>
        <p style={{ margin: '4px 0 6px', fontSize: 14, lineHeight: 1.55 }}>{text}</p>
        <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--ink-3)' }}>
          <ActionBtn icon="heart" count={likes + (liked ? 1 : 0)} active={liked} activeColor="var(--clay)" onClick={() => setLiked(l => !l)} />
          <ActionBtn icon="comment" count={2} onClick={() => {}} />
          <ActionBtn icon="repost" onClick={() => {}} />
        </div>
      </div>
    </div>
  );
};

export function Stat({ n, l, green, light, onClick }: { n: any; l: any; green?: boolean; light?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={onClick ? 'row-hover' : undefined} style={onClick ? { cursor: 'pointer', margin: '-4px -8px', padding: '4px 8px', borderRadius: 8 } : undefined}>
      <div style={{
        fontSize: 22, fontWeight: 600, fontFamily: 'Lora', letterSpacing: '-0.02em',
        color: light ? '#fff' : green ? 'var(--green)' : 'var(--ink)',
      }}>{n}</div>
      <div style={{ fontSize: 11, color: light ? 'rgba(255,255,255,.8)' : 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{l.toUpperCase()}</div>
    </div>
  );
};

// ── OG link previews for post detail ─────────────────────────────────────────
const _ogDetailCache: Record<string, any> = {};
function PostDetailOgCard({ url }: { url: string }) {
  const [og, setOg] = React.useState<any>(_ogDetailCache[url] ?? null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    if (_ogDetailCache[url]) { setOg(_ogDetailCache[url]); return; }
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => { if (d.title) { _ogDetailCache[url] = d; setOg(d); } else setFailed(true); })
      .catch(() => setFailed(true));
  }, [url]);
  if (failed || !og) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'block', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 16, textDecoration: 'none', color: 'inherit', background: 'var(--bg)' }}>
      {og.image && <img src={og.image} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />}
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{og.siteName}</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', lineHeight: 1.4, marginBottom: og.description ? 4 : 0 }}>{og.title}</div>
        {og.description && <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{og.description}</div>}
      </div>
    </a>
  );
}
function PostDetailOgPreviews({ content }: { content?: string | null }) {
  const urls = (content?.match(/https?:\/\/[^\s]+/g) ?? []) as string[];
  const external = urls.filter(u => { try { const h = new URL(u).hostname; return !h.includes('supabase') && !h.includes('localhost'); } catch { return false; } });
  if (!external.length) return null;
  return <>{external.map(u => <PostDetailOgCard key={u} url={u} />)}</>;
}

// ── About the author (real profile behind the post) ──────────────────────────
function PostAuthorCard({ profile, onNav }: { profile: any; onNav: any }) {
  const app = useApp();
  const [stats, setStats] = React.useState<{ followers: number; posts: number } | null>(null);

  React.useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    Promise.all([
      getFollowerCount(profile.id),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
    ]).then(([followers, { count }]) => {
      if (!cancelled) setStats({ followers, posts: count ?? 0 });
    }).catch(() => { if (!cancelled) setStats({ followers: 0, posts: 0 }); });
    return () => { cancelled = true; };
  }, [profile?.id]);

  if (!profile?.handle) return null;

  const name = profile.full_name || profile.name || `@${profile.handle}`;
  const following = app.follow?.has(profile.handle);
  const isSelf = profile.handle === app.user?.handle || profile.id === app.user?.id;
  const openProfile = () => onNav?.('profile', { handle: profile.handle });

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18, marginBottom: 12 }}>
      <h3 className="font-display" style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 600 }}>About the author</h3>
      <div onClick={openProfile} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', margin: '0 -8px', padding: '6px 8px', borderRadius: 10 }}>
        <Avatar src={profile.avatar_url} name={name} size={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            {profile.verified && <VerifiedTick />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{profile.handle}</div>
        </div>
      </div>
      {profile.bio && <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)' }}>{profile.bio}</p>}
      {profile.location && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{profile.location}</div>}
      <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
        <Stat n={stats ? formatCount(stats.posts) : '—'} l="Posts" onClick={openProfile} />
        <Stat n={stats ? formatCount(stats.followers) : '—'} l="Followers" />
        <Stat n={formatCount(profile.impact_score ?? 0)} l="Impact" green />
      </div>
      {!isSelf && (
        <button
          className={following ? 'btn btn-ghost' : 'btn btn-primary'}
          style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
          onClick={() => {
            app.follow?.toggle(profile.handle);
            app.toast?.(following
              ? { msg: `Unfollowed ${name}`, icon: 'user' }
              : { msg: `Following ${name}`, kind: 'success', icon: 'user' });
          }}
        >{following ? 'Following' : 'Follow'}</button>
      )}
      <button className="btn btn-ghost" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }} onClick={openProfile}>View profile →</button>
    </div>
  );
}

// =============== Desktop Post Detail ===============
export function DesktopPostDetail({ onNav, params }) {
  const app = useApp();
  const [dbPost, setDbPost] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = params?.id;
    if (!id) { setLoading(false); return; }
    supabase
      .from('posts')
      .select('*, profile:profiles!posts_user_id_fkey(id, full_name, handle, avatar_url, verified, bio, location, impact_score)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => { if (error) console.error('[PostDetail]', error); setDbPost(data); setLoading(false); });
  }, [params?.id]);

  const [tree, setTree] = React.useState<any[]>([]);
  const [reply, setReply] = React.useState('');
  const [showBookmark, setShowBookmark] = React.useState(false);
  const [liveCommentCount, setLiveCommentCount] = React.useState<number | null>(null);

  // Build a nested tree from flat DB rows
  const buildTree = React.useCallback((rows: any[]) => {
    const map: Record<string, any> = {};
    rows.forEach(r => { map[r.id] = { ...r, replies: [] }; });
    const roots: any[] = [];
    rows.forEach(r => {
      if (r.parent_id && map[r.parent_id]) map[r.parent_id].replies.push(map[r.id]);
      else roots.push(map[r.id]);
    });
    return roots;
  }, []);

  // Load real comments from DB
  const loadComments = React.useCallback(async (postId: string) => {
    const { data } = await supabase
      .from('comments')
      .select('*, profile:profiles!comments_user_id_fkey(full_name, handle, avatar_url, verified)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (data) {
      setTree(buildTree(data));
      setLiveCommentCount(data.length);
    }
  }, [buildTree]);

  React.useEffect(() => {
    if (!dbPost?.id) return;
    loadComments(dbPost.id);
    const ch = supabase.channel(`comments-${dbPost.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${dbPost.id}` },
        () => loadComments(dbPost.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [dbPost?.id, loadComments]);

  if (loading) return <PostDetailSkeleton />;
  if (!dbPost) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Post not found.</div>;

  const post = dbPost;
  const displayProfile = post.profile;
  const liked = app.like?.has(post.id);
  const saved = app.save?.has(post.id);
  const following = app.follow?.has(displayProfile?.handle);

  const postReply = async () => {
    if (!reply.trim()) return;
    const text = reply.trim();
    setReply('');
    if (!app.user?.id) return;
    // Optimistic insert — shows 'now' immediately; realtime will replace with DB row
    const optimisticId = `opt-${Date.now()}`;
    setTree(c => [{ id: optimisticId, content: text, time: 'now', likes: 0, replies: [], profile: { full_name: app.user?.name, handle: app.user?.handle, avatar_url: app.user?.avatar, verified: false }, user_id: app.user.id }, ...c]);
    setLiveCommentCount(n => (n ?? 0) + 1);
    setDbPost((p: any) => p ? { ...p, comments_count: (p.comments_count ?? 0) + 1 } : p);
    app.toast?.({ msg: 'Comment posted', kind: 'success', icon: 'comment' });
    try {
      await supabase.from('comments').insert({ post_id: post.id, user_id: app.user.id, content: text });
      const postOwnerId = dbPost?.user_id;
      const { createNotification, notifyMentionedInPost } = await import('@/lib/notifications');
      if (postOwnerId && postOwnerId !== app.user.id) {
        await createNotification({ userId: postOwnerId, actorId: app.user.id, type: 'comment', postId: post.id, body: `commented: "${text.slice(0, 80)}"` });
      }
      notifyMentionedInPost({ postId: post.id, actorId: app.user.id, body: 'commented on a post you were mentioned in', excludeUserId: postOwnerId });
    } catch (e) { console.error('[postReply]', e); }
  };

  const postReplyToComment = async (parentId: string | number, text: string) => {
    if (!app.user?.id) return;
    // Optimistic count bump; tree is already updated locally by CommentThread
    setLiveCommentCount(n => (n ?? 0) + 1);
    setDbPost((p: any) => p ? { ...p, comments_count: (p.comments_count ?? 0) + 1 } : p);
    try {
      await supabase.from('comments').insert({ post_id: post.id, user_id: app.user.id, content: text, parent_id: parentId });
      const { createNotification, notifyMentionedInPost } = await import('@/lib/notifications');
      const parent = tree.find((n: any) => n.id === parentId);
      const parentUserId = parent?.user_id;
      if (parentUserId && parentUserId !== app.user.id) {
        await createNotification({ userId: parentUserId, actorId: app.user.id, type: 'reply', postId: post.id, body: `replied: "${text.slice(0, 80)}"` });
      }
      notifyMentionedInPost({ postId: post.id, actorId: app.user.id, body: 'replied to a post you were mentioned in', excludeUserId: parentUserId });
    } catch (e) { console.error('[postReplyToComment]', e); }
  };
  if (loading) return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="home" onNav={onNav} />
      <main style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <PostDetailSkeleton />
      </main>
    </div>
  );
  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="home" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{
          flex: 1, padding: '20px 28px', overflow: 'auto', maxWidth: 720,
          borderRight: '1px solid var(--line)',
        }} className="no-scrollbar post-detail-main">
          <button onClick={() => onNav?.('home')} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13,
            marginBottom: 16, padding: 0,
          }}><span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}><Icon name="arrow" size={14} /></span> Back to feed</button>

          {/* Main post */}
          {lightbox && <ImageLightbox label={lightbox} onClose={() => setLightbox(null)} />}
          <article className="post-detail-article" style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--line)', padding: 28, marginBottom: 16 }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <span onClick={() => onNav?.('profile', { handle: displayProfile?.handle })} style={{ cursor: 'pointer' }}><Avatar src={displayProfile?.avatar_url} name={displayProfile?.full_name} size={56} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 17 }}>{displayProfile?.full_name || displayProfile?.name}</span>
                  {displayProfile?.verified && <VerifiedTick size={16} />}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{displayProfile?.handle}</div>
              </div>
              {app.user?.id !== (dbPost?.user_id) && displayProfile?.handle !== app.user?.handle && (
                <button className={following ? 'btn btn-ghost' : 'btn btn-primary'} onClick={() => { app.follow.toggle(displayProfile?.handle); app.toast?.(following ? { msg: `Unfollowed ${displayProfile?.full_name || displayProfile?.name}`, icon: 'user' } : { msg: `Following ${displayProfile?.full_name || displayProfile?.name}`, kind: 'success', icon: 'user' }); }}>{following ? 'Following' : 'Follow'}</button>
              )}
              <PostMoreMenu
                profile={displayProfile}
                postId={post.id}
                isOwn={dbPost?.user_id === app.user?.id || displayProfile?.handle === app.user?.handle}
                postContent={post.content ?? ''}
                postCreatedAt={dbPost?.created_at ?? ''}
              />
            </header>
            <p style={{ fontSize: 19, lineHeight: 1.55, margin: '0 0 16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {post.content?.split('\n').map((line: string, li: number, arr: string[]) => (
                <React.Fragment key={li}>
                  {line.split(/(https?:\/\/[^\s]+|@\w+|#\w+)/).map((part: string, i: number) => {
                    if (/^#\w+$/.test(part)) return <span key={i} onClick={() => onNav?.('explore', { tag: part.slice(1) })} style={{ color: 'var(--sky)', fontWeight: 500, cursor: 'pointer' }}>{part}</span>;
                    if (/^@\w+$/.test(part)) return <span key={i} style={{ color: 'var(--sky)', fontWeight: 500, cursor: 'pointer' }}>{part}</span>;
                    if (/^https?:\/\//.test(part)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky)', textDecoration: 'none', wordBreak: 'break-all' }}>{part}</a>;
                    return <React.Fragment key={i}>{part}</React.Fragment>;
                  })}
                  {li < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
            <PostDetailOgPreviews content={post.content} />
            {post.image_url && (
              <img
                src={post.image_url}
                alt=""
                onClick={() => setLightbox(post.image_url)}
                style={{ width: '100%', borderRadius: 12, marginBottom: 16, objectFit: 'cover', maxHeight: 420, cursor: 'zoom-in' }}
              />
            )}
            {/* Demo posts keep the illustrative stat strip; real posts show the
                actual community-verification state of their linked impact log. */}
            <div style={{ marginTop: 18 }}>
              <PostImpactVouch postId={post.id} isOwn={dbPost?.user_id === app.user?.id} />
            </div>
            <footer style={{ display: 'flex', gap: 28, marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <ActionBtn icon="heart" count={(post.likes_count ?? 0) + (app.realtimeDeltas?.[post.id]?.likes ?? 0)} active={liked} activeColor="var(--clay)" onClick={() => app.like.toggle(post.id)} />
              <ActionBtn icon="comment" count={liveCommentCount ?? post.comments_count ?? 0} onClick={() => document.getElementById('pd-reply')?.focus()} />
              <ActionBtn icon="repost" count={(post.reposts_count ?? 0) + (app.realtimeDeltas?.[post.id]?.reposts ?? 0)} active={app.repost?.has(post.id)} activeColor="var(--green)" onClick={() => { app.repost?.toggle(post.id); app.toast?.({ msg: app.repost?.has(post.id) ? 'Repost removed' : 'Reposted to your followers', icon: 'repost' }); }} />
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 18 }}>
                <ActionBtn icon="bookmark" active={saved} onClick={() => setShowBookmark(true)} />
                <ActionBtn icon="share" onClick={() => app.toast?.({ msg: 'Link copied', sub: 'Post link copied to clipboard.', icon: 'share' })} />
              </span>
            </footer>
            {showBookmark && (
              <BookmarkSheet
                postId={post.id}
                saved={!!saved}
                onSave={(colId, colName) => { app.save?.addToCollection(post.id, colId); app.toast?.({ msg: `Saved to "${colName}"`, kind: 'success', icon: 'bookmark' }); setShowBookmark(false); }}
                onRemove={() => { app.save?.toggle(post.id); app.toast?.({ msg: 'Removed from bookmarks', icon: 'bookmark' }); setShowBookmark(false); }}
                onClose={() => setShowBookmark(false)}
              />
            )}
          </article>

          {/* Comment composer */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <Avatar src={app.user?.avatar} name={app.user?.name || 'Y'} size={40} />
            <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 12 }}>
              <input id="pd-reply" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') postReply(); }} placeholder="Add a comment…" style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={postReply}>Reply</button>
              </div>
            </div>
          </div>

          {/* Comments */}
          <CommentThread tree={tree} setTree={setTree} onNav={onNav} onDbReply={postReplyToComment} />
        </div>

        {/* Right rail */}
        <div style={{ width: 340, padding: 20, overflow: 'auto', flexShrink: 0 }} className="no-scrollbar right-panel">
          <PostAuthorCard profile={displayProfile} onNav={onNav} />
          <TrendingPanel />
        </div>
      </main>
    </div>
  );
};
