"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, NotifPrefs, useApp, PostCard, PostCardSkeleton, ProfileSkeleton, ActionBtn, BookmarkSheet, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { PostDetailSkeleton } from "@/components/primitives";
import { getProfile, getProfilePosts, getFollowerCount, getFollowingCount, getAchievements, getProjects, isFollowing, toggleFollow } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { ImageLightbox } from "@/components/post-card";

function useProfileData(handleOrId: string | undefined, currentUserId: string | undefined) {
  const [profile, setProfile] = React.useState<any>(null);
  const [posts, setPosts] = React.useState<any[]>([]);
  const [followerCount, setFollowerCount] = React.useState(0);
  const [followingCount, setFollowingCount] = React.useState(0);
  const [achievements, setAchievements] = React.useState<any[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [following, setFollowing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!handleOrId) return;
    setLoading(true);
    Promise.all([
      getProfile(handleOrId),
    ]).then(async ([p]) => {
      setProfile(p);
      const [postsData, fc, fwc, ach, proj] = await Promise.all([
        getProfilePosts(p.id),
        getFollowerCount(p.id),
        getFollowingCount(p.id),
        getAchievements(p.id),
        getProjects(p.id),
      ]);
      setPosts(postsData);
      setFollowerCount(fc);
      setFollowingCount(fwc);
      setAchievements(ach);
      setProjects(proj);
      if (currentUserId && currentUserId !== p.id) {
        setFollowing(await isFollowing(currentUserId, p.id));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [handleOrId, currentUserId]);

  return { profile, posts, followerCount, followingCount, achievements, projects, following, setFollowing, loading };
}

// =============== Desktop Profile ===============
export function DesktopProfile({ onNav, params }) {
  const [tab, setTab] = React.useState('posts');
  const app = useApp();
  const handle = params?.handle;

  // If no handle or handle is 'you', show the signed-in user's profile
  const lookupKey = (!handle || handle === 'you') ? app.user?.handle : handle;
  const isOwn = !handle || handle === 'you' || handle === app.user?.handle;

  const { profile, posts, followerCount, followingCount, achievements, projects, following, setFollowing, loading } =
    useProfileData(lookupKey, app.user?.id);

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

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="profile" onNav={onNav} />
      <main style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
        {/* Cover */}
        <div className="profile-cover" style={{
          height: 180,
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
            <button onClick={() => app.toast?.({ msg: 'Coming soon', sub: 'Cover photo upload coming soon.', icon: 'sparkles' })} style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,.45)', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="edit" size={13} /> Edit cover
            </button>
          )}
        </div>

        <div className="profile-content" style={{ padding: '0 32px', maxWidth: 1100, margin: '0 auto' }}>
          {/* Identity row */}
          <div className="profile-identity-row" style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: -50, marginBottom: 18, position: 'relative', zIndex: 1 }}>
            <div className="profile-avatar-wrap" style={{ border: '6px solid var(--bg)', borderRadius: 24, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
              <Avatar src={profile.avatar_url} name={profile.full_name} size={132} verified={profile.verified} />
              {isOwn && (
                <div onClick={() => app.toast?.({ msg: 'Coming soon', sub: 'Avatar change coming soon.', icon: 'sparkles' })} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', display: 'grid', placeItems: 'center', opacity: 0, cursor: 'pointer', transition: 'opacity .15s' }} className="avatar-edit-overlay">
                  <Icon name="edit" size={20} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="font-display profile-name" style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{profile.full_name}</h1>
                {profile.verified && <span style={{ background: 'var(--sky)', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12 }}>✓</span>}
                {profile.impact_score > 0 && <span className="chip chip-green">Impact score {profile.impact_score}</span>}
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                @{profile.handle}
                {profile.location && ` · ${profile.location}`}
                {joinedDate && ` · Joined ${joinedDate}`}
              </div>
            </div>
            <div className="profile-actions" style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
              {isOwn ? (
                <>
                  <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(window.location.href); app.toast?.({ msg: 'Link copied', icon: 'share' }); }}><Icon name="share" size={14} /> Share</button>
                  <button className="btn btn-primary" onClick={() => app.openModal?.('editprofile')}><Icon name="edit" size={14} /> Edit profile</button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost" onClick={() => onNav?.('messages')}><Icon name="msg" size={14} /> Message</button>
                  <button className="btn btn-ghost" onClick={() => app.openModal?.('tip', { user: profile })}><Icon name="gift" size={14} /> Tip</button>
                  <button className={following ? 'btn btn-ghost' : 'btn btn-primary'} onClick={handleFollowToggle}>{following ? 'Following' : 'Follow'}</button>
                </>
              )}
            </div>
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
                <Stat n={profile.co2_avoided_kg >= 1000 ? `${(profile.co2_avoided_kg / 1000).toFixed(1)}t` : `${profile.co2_avoided_kg || 0}kg`} l="CO₂ avoided" green />
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #1f6f3f, #2e9a5b)', color: '#fff', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', opacity: .85, letterSpacing: '.05em' }}>VERIFIED IMPACT · LIFETIME</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
                <Stat n={profile.co2_avoided_kg >= 1000 ? `${(profile.co2_avoided_kg / 1000).toFixed(1)}t` : `${profile.co2_avoided_kg || 0}kg`} l="CO₂ avoided" light />
                <Stat n={profile.green_points?.toLocaleString() || 0} l="Green points" light />
                <Stat n={projects.length} l="Projects led" light />
                <Stat n={achievements.length} l="Achievements" light />
              </div>
              <button className="btn" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', marginTop: 14, padding: '7px 12px', fontSize: 12 }} onClick={() => onNav?.('impact')}>
                See full impact ledger →
              </button>
            </div>
          </div>

          {/* Interests */}
          {profile.interests?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {profile.interests.map((it: string) => (
                <span key={it} style={{ fontSize: 12, background: 'var(--green-tint)', color: 'var(--green)', padding: '3px 10px', borderRadius: 999, fontWeight: 500 }}>{it}</span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="profile-tabs" style={{ borderBottom: '1px solid var(--line)', marginBottom: 18, display: 'flex', gap: 4 }}>
            {['Posts', 'Reposts', 'Projects', 'Achievements', 'Media'].map(t => (
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
                  : ownPosts.map(p => <RealPostCard key={p.id} post={p} onNav={onNav} />)
              )}
              {tab === 'reposts' && (
                reposts.length === 0
                  ? <EmptyTab icon="" msg="No reposts yet." />
                  : reposts.map(p => <RealPostCard key={p.id} post={p} onNav={onNav} isRepost />)
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
            </div>

            {/* Sidebar */}
            <div className="right-panel">
              {/* Interests */}
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
                <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18 }}>
                  <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 600 }}>Interests</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.interests.map((it: string) => (
                      <span key={it} style={{ fontSize: 12, background: 'var(--green-tint)', color: 'var(--green)', padding: '3px 10px', borderRadius: 999, fontWeight: 500 }}>{it}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
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

function PostMoreMenu({ profile, postId }: { profile: any; postId: string }) {
  const app = useApp();
  const [open, setOpen] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); setOpen(false);
    app.toast?.({ msg: `@${profile?.handle} muted`, sub: "You won't see their posts in your feed.", icon: 'bell' });
  };
  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation(); setOpen(false); setReason(''); setSubmitted(false); setShowReport(true);
  };
  const submit = (e: React.MouseEvent) => {
    e.stopPropagation(); if (!reason) return;
    setSubmitted(true);
    setTimeout(() => { setShowReport(false); setSubmitted(false); }, 1800);
    app.toast?.({ msg: 'Report submitted', sub: 'Thanks for helping keep Honua safe.', icon: 'check', kind: 'success' });
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
            <button onClick={handleMute} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)', textAlign: 'left' }}>
              <Icon name="bell" size={15} /> Mute @{profile?.handle}
            </button>
            <button onClick={handleReport} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--clay)', textAlign: 'left', borderTop: '1px solid var(--line)' }}>
              <Icon name="flag" size={15} /> Report post
            </button>
          </div>
        </>
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
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowReport(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)' }}>Cancel</button>
                  <button onClick={submit} disabled={!reason} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: reason ? 'var(--clay)' : 'var(--line)', cursor: reason ? 'pointer' : 'not-allowed', fontSize: 14, color: '#fff', fontWeight: 600 }}>Submit report</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RealPostCard({ post, onNav, isRepost = false }: { post: any; onNav: any; isRepost?: boolean }) {
  const app = useApp();
  const profile = post.profile;
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
        <span onClick={stop}><Avatar src={profile?.avatar_url} name={profile?.full_name} size={40} verified={profile?.verified} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{profile?.full_name}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{profile?.handle} · {timeAgo(post.created_at)}</span>
            <PostMoreMenu profile={profile} postId={post.id} />
          </div>
          {(isRepost && original ? original.content : post.content) && (
            <p style={{ margin: '0 0 10px', fontSize: 15, lineHeight: 1.6 }}>{isRepost && original ? original.content : post.content}</p>
          )}
          {(isRepost ? original?.image_url : post.image_url) && (
            <img src={isRepost ? original.image_url : post.image_url} style={{ width: '100%', borderRadius: 12, marginBottom: 10, objectFit: 'cover', maxHeight: 320 }} />
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
      <span onClick={() => onNav?.('profile', { handle: usr.handle })} style={{ cursor: 'pointer' }}><Avatar src={usr.avatar} name={usr.name} size={36} verified={usr.verified} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{usr.name}</span>
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
      .select('*, profile:profiles!posts_user_id_fkey(full_name, handle, avatar_url, verified)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => { if (error) console.error('[PostDetail]', error); setDbPost(data); setLoading(false); });
  }, [params?.id]);

  const post = dbPost || MOCK.posts.find(p => p.id === params?.id) || MOCK.posts[0];
  const isMock = !dbPost;
  const user = isMock ? MOCK.users[(post as any).user] : null;
  const displayProfile = isMock ? user : post.profile;
  const liked = app.like?.has(post.id);
  const saved = app.save?.has(post.id);
  const following = isMock ? app.follow?.has(user?.handle) : app.follow?.has(displayProfile?.handle);
  const [tree, setTree] = React.useState(makeCommentSeed);
  const [reply, setReply] = React.useState('');
  const [showBookmark, setShowBookmark] = React.useState(false);
  const postReply = async () => {
    if (!reply.trim()) return;
    const text = reply.trim();
    setTree(c => [{ id: Date.now(), user: app.user?.handle || 'you', text, time: 'now', likes: 0, replies: [] }, ...c]);
    setReply('');
    app.toast?.({ msg: 'Comment posted', kind: 'success', icon: 'comment' });
    if (!isMock && app.user?.id) {
      try {
        await supabase.from('comments').insert({ post_id: post.id, user_id: app.user.id, content: text });
        const postOwnerId = post.user_id ?? dbPost?.user_id;
        if (postOwnerId) {
          const { createNotification } = await import('@/lib/notifications');
          await createNotification({ userId: postOwnerId, actorId: app.user.id, type: 'comment', postId: post.id, body: `commented: "${text.slice(0, 80)}"` });
        }
      } catch {}
    }
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
              <span onClick={() => onNav?.('profile', { handle: displayProfile?.handle })} style={{ cursor: 'pointer' }}><Avatar src={isMock ? displayProfile?.avatar : displayProfile?.avatar_url} name={displayProfile?.full_name || displayProfile?.name} size={56} verified={displayProfile?.verified} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 17 }}>{displayProfile?.full_name || displayProfile?.name}</span>
                  {displayProfile?.verified && <span style={{ background: 'var(--sky)', color: '#fff', width: 16, height: 16, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{displayProfile?.handle} {isMock ? `· ${(post as any).time} ago · ${(post as any).location}` : ''}</div>
              </div>
              {app.user?.id !== (dbPost?.user_id) && displayProfile?.handle !== app.user?.handle && (
                <button className={following ? 'btn btn-ghost' : 'btn btn-primary'} onClick={() => { app.follow.toggle(displayProfile?.handle); app.toast?.(following ? { msg: `Unfollowed ${displayProfile?.full_name || displayProfile?.name}`, icon: 'user' } : { msg: `Following ${displayProfile?.full_name || displayProfile?.name}`, kind: 'success', icon: 'user' }); }}>{following ? 'Following' : 'Follow'}</button>
              )}
            </header>
            <p style={{ fontSize: 19, lineHeight: 1.55, margin: '0 0 16px', textWrap: 'pretty' }}>
              {(isMock ? (post as any).content : post.content)?.split(/(\s+)/).map((word: string, i: number) => {
                const match = word.match(/^(#\w+)(.*)/);
                if (match) return <React.Fragment key={i}><span onClick={() => onNav?.('explore', { tag: match[1].slice(1) })} style={{ color: 'var(--sky)', fontWeight: 500, cursor: 'pointer' }}>{match[1]}</span>{match[2]}</React.Fragment>;
                return word;
              })}
            </p>
            {isMock && (post as any).image && <ImagePlaceholder label={(post as any).image} height={420} src={(post as any).imageUrl} />}
            {!isMock && post.image_url && (
              <img
                src={post.image_url}
                alt=""
                onClick={() => setLightbox(post.image_url)}
                style={{ width: '100%', borderRadius: 12, marginBottom: 16, objectFit: 'cover', maxHeight: 420, cursor: 'zoom-in' }}
              />
            )}
            <div className="post-detail-stats" style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
              marginTop: 18, padding: 14, background: 'var(--green-tint)', borderRadius: 12,
            }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--green)', letterSpacing: '.05em' }}>VERIFIED IMPACT</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>−1.4 t</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>CO₂ /yr · oracle-verified May 19</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--green)', letterSpacing: '.05em' }}>ENERGY SAVED</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>3.2 MWh</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>vs 2024 baseline</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--green)', letterSpacing: '.05em' }}>$ SAVED</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>$3,012</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>annual co-op savings</div>
              </div>
            </div>
            <footer style={{ display: 'flex', gap: 28, marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <ActionBtn icon="heart" count={(isMock ? (post as any).likes : (post.likes_count ?? 0)) + (app.realtimeDeltas?.[post.id]?.likes ?? 0)} active={liked} activeColor="var(--clay)" onClick={() => app.like.toggle(post.id)} />
              <ActionBtn icon="comment" count={isMock ? (post as any).comments : (post.comments_count ?? 0)} onClick={() => document.getElementById('pd-reply')?.focus()} />
              <ActionBtn icon="repost" count={(isMock ? (post as any).reposts : (post.reposts_count ?? 0)) + (app.realtimeDeltas?.[post.id]?.reposts ?? 0)} active={app.repost?.has(post.id)} activeColor="var(--green)" onClick={() => { app.repost?.toggle(post.id); app.toast?.({ msg: app.repost?.has(post.id) ? 'Repost removed' : 'Reposted to your followers', icon: 'repost' }); }} />
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, color: 'var(--ink-3)' }}>
                  <Icon name="image" size={16} />
                  <Icon name="pin" size={16} />
                  <Icon name="leaf" size={16} />
                </div>
                <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={postReply}>Reply</button>
              </div>
            </div>
          </div>

          {/* Comments */}
          <CommentThread tree={tree} setTree={setTree} />
        </div>

        {/* Right rail */}
        <div style={{ width: 340, padding: 20, overflow: 'auto', flexShrink: 0 }} className="no-scrollbar right-panel">
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18, marginBottom: 12 }}>
            <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 600 }}>About this project</h3>
            <ImagePlaceholder label="project hero" height={140} />
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-2)' }}>Sunhill Coop · Community solar installation, Portland.</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
              <Stat n="20" l="Panels" />
              <Stat n="14kW" l="Capacity" />
              <Stat n="34" l="Members" />
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => app.openModal('project', { id: 99, t: 'Sunhill rooftop solar', cat: 'Energy', when: 'Ongoing · weekly builds', host: 'Sunhill Coop', going: 34, color: 'var(--sun)' })}>Support project →</button>
          </div>
          <TrendingPanel />
        </div>
      </main>
    </div>
  );
};
