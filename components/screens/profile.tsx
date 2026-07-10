"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";


// =============== Desktop Profile ===============
export function DesktopProfile({ onNav, params }) {
  const [tab, setTab] = React.useState('posts');
  const app = useApp();
  const handle = params?.handle;
  const isOwn = !handle || handle === 'you';
  const key = handle && Object.keys(MOCK.users).find(k => MOCK.users[k].handle === handle);
  const u = isOwn
    ? MOCK.users.you
    : (key ? MOCK.users[key] : MOCK.users.sarah);
  const following = app.follow?.has(u.handle);
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="profile" onNav={onNav} />
      <main style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
        {/* Cover */}
        <div style={{
          height: 180,
          background: 'linear-gradient(135deg, #1f6f3f 0%, #2e9a5b 50%, #c8e6cf 100%)',
          position: 'relative',
        }}>
          <svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
            <path d="M0 100 Q200 60 400 100 T800 80 L800 200 0 200Z" fill="rgba(255,255,255,.1)"/>
            <path d="M0 140 Q200 100 400 140 T800 120 L800 200 0 200Z" fill="rgba(255,255,255,.1)"/>
          </svg>
        </div>

        <div style={{ padding: '0 32px', maxWidth: 1100, margin: '0 auto' }}>
          {/* Identity row */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 20,
            marginTop: -50, marginBottom: 18, position: 'relative', zIndex: 1,
          }}>
            <div style={{ border: '6px solid var(--bg)', borderRadius: 24, overflow: 'hidden', flexShrink: 0 }}>
              <Avatar src={u.avatar} name={u.name} size={132} verified={u.verified} />
            </div>
            <div style={{ flex: 1, paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="font-display" style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{u.name}</h1>
                {u.verified && <span style={{
                  background: 'var(--sky)', color: '#fff', width: 22, height: 22,
                  borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12,
                }}>✓</span>}
                <span className="chip chip-green">{isOwn ? 'Level 7 · Composter' : 'Level 12 · Forest steward'}</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-3)', fontFamily: 'Geist Mono', marginTop: 2 }}>@{u.handle} · {isOwn ? 'Brooklyn, NY · Joined Jan 2025' : 'Portland, OR · Joined Sep 2024'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
              {isOwn ? (
                <>
                  <button className="btn btn-ghost" onClick={() => app.toast({ msg: 'Share profile', sub: 'Profile link copied.', icon: 'share' })}><Icon name="share" size={14} /> Share</button>
                  <button className="btn btn-primary" onClick={() => app.openModal('editprofile')}><Icon name="edit" size={14} /> Edit profile</button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost" onClick={() => onNav?.('messages')}><Icon name="msg" size={14} /> Message</button>
                  <button className="btn btn-ghost" onClick={() => app.openModal('tip', { user: u })}><Icon name="gift" size={14} /> Tip</button>
                  <button className={following ? 'btn btn-ghost' : 'btn btn-primary'} onClick={() => { app.follow.toggle(u.handle); app.toast(following ? { msg: `Unfollowed ${u.name}`, icon: 'user' } : { msg: `Following ${u.name}`, kind: 'success', icon: 'user' }); }}>{following ? 'Following' : 'Follow'}</button>
                </>
              )}
            </div>
          </div>

          {/* Bio + stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 18, marginBottom: 18 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 20 }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', textWrap: 'pretty' }}>
                Community solar organizer in Cascadia. Currently retrofitting our co-op center — 20 panels in, 30 to go. Co-host of the <strong>Sunhill</strong> podcast. She/her.
              </p>
              <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 13, color: 'var(--ink-3)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="pin" size={14} /> Portland, OR
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="globe" size={14} /> sunhill.coop
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="calendar" size={14} /> Joined Sep 2024
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                <Stat n="1,284" l="Posts" />
                <Stat n={isOwn ? '1,204' : '48.6k'} l="Followers" onClick={() => onNav?.('followers', { handle: u.handle })} />
                <Stat n={isOwn ? '356' : '412'} l="Following" onClick={() => onNav?.('following', { handle: u.handle })} />
                <Stat n="92" l="Impact score" green />
                <Stat n="2.8t" l="CO₂ avoided" green />
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #1f6f3f, #2e9a5b)', color: '#fff',
              borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ fontSize: 11, fontFamily: 'Geist Mono', opacity: .85, letterSpacing: '.05em' }}>VERIFIED IMPACT · LIFETIME</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
                <Stat n="2.8t" l="CO₂ avoided" light />
                <Stat n="180" l="Trees funded" light />
                <Stat n="42k L" l="Water saved" light />
                <Stat n="14" l="Projects led" light />
              </div>
              <button className="btn" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', marginTop: 14, padding: '7px 12px', fontSize: 12 }} onClick={() => onNav?.('impact')}>
                See full impact ledger →
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid var(--line)', marginBottom: 18, display: 'flex', gap: 4 }}>
            {['Posts', 'Replies', 'Projects', 'Impact', 'Achievements', 'Media'].map(t => (
              <button key={t} onClick={() => setTab(t.toLowerCase())} style={{
                background: 'transparent', border: 'none', padding: '12px 16px',
                color: tab === t.toLowerCase() ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: tab === t.toLowerCase() ? 600 : 500, fontSize: 14,
                cursor: 'pointer', position: 'relative', fontFamily: 'Geist',
              }}>
                {t}
                {tab === t.toLowerCase() && <div style={{
                  position: 'absolute', bottom: -1, left: 12, right: 12, height: 2,
                  background: 'var(--green)', borderRadius: 2,
                }} />}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, paddingBottom: 40 }}>
            <div>
              {MOCK.posts.slice(0, 2).map(p => <PostCard key={p.id} post={p} />)}
            </div>
            <div>
              <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18, marginBottom: 12 }}>
                <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 600 }}>Achievements</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[['🌱', 'Seedling', 'Logged your first action'], ['🌿', 'Sprout', '7-day streak reached'], ['🌳', 'Forest steward', 'Funded 100+ trees'], ['☀️', 'Solar pioneer', 'Switched to renewable energy'], ['💧', 'Water saver', 'Saved 10,000 L'], ['⚡', 'Energy cutter', 'Locked'], ['♻️', 'Zero-waster', 'Locked'], ['🏆', 'Champion', 'Locked']].map(([e, name, desc], i) => (
                    <div key={i} onClick={() => i < 5 && app.openModal('badge', { emoji: e, name, desc: desc + '.', perks: ['+150 Green Points', 'Profile flair', 'Featured in your achievements'] })} style={{
                      aspectRatio: '1', borderRadius: 10, background: i < 5 ? 'var(--green-tint)' : 'var(--bg-2)',
                      display: 'grid', placeItems: 'center', fontSize: 22, opacity: i < 5 ? 1 : 0.4,
                      cursor: i < 5 ? 'pointer' : 'default',
                    }}>{e}</div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>5 of 8 earned this season</div>
              </div>

              <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18, marginBottom: 12 }}>
                <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 600 }}>Projects led</h3>
                {[
                  ['Sunhill rooftop solar', '20 / 50 panels', 0.4],
                  ['SE Portland repair café', 'Active · weekly', 1],
                  ['Powell Butte tree drive', 'Goal: 5,000 trees', 0.68],
                ].map(([t, s, p], i) => {
                  const ratio = typeof p === 'number' ? p : Number(p || 0);
                  const percent = Math.round(ratio * 100);
                  return (
                    <div key={i} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500 }}>
                        <span>{t}</span>
                        <span style={{ fontFamily: 'Geist Mono', color: 'var(--ink-3)', fontSize: 11 }}>{percent}%</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{s}</div>
                      <div style={{ height: 4, background: 'var(--line)', borderRadius: 999, marginTop: 6 }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--green)', borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export function CommentRow({ usr, text, time, likes, onNav }) {
  const [liked, setLiked] = React.useState(false);
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid var(--line)' }}>
      <span onClick={() => onNav?.('profile', { handle: usr.handle })} style={{ cursor: 'pointer' }}><Avatar src={usr.avatar} name={usr.name} size={36} verified={usr.verified} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{usr.name}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>@{usr.handle} · {time}</span>
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
        fontSize: 22, fontWeight: 600, fontFamily: 'Bricolage Grotesque', letterSpacing: '-0.02em',
        color: light ? '#fff' : green ? 'var(--green)' : 'var(--ink)',
      }}>{n}</div>
      <div style={{ fontSize: 11, color: light ? 'rgba(255,255,255,.8)' : 'var(--ink-3)', fontFamily: 'Geist Mono', marginTop: 2 }}>{l.toUpperCase()}</div>
    </div>
  );
};

// =============== Desktop Post Detail ===============
export function DesktopPostDetail({ onNav, params }) {
  const app = useApp();
  const post = MOCK.posts.find(p => p.id === params?.id) || MOCK.posts[0];
  const user = MOCK.users[post.user];
  const liked = app.like?.has(post.id);
  const saved = app.save?.has(post.id);
  const following = app.follow?.has(user.handle);
  const [tree, setTree] = React.useState(makeCommentSeed);
  const [reply, setReply] = React.useState('');
  const postReply = () => { if (!reply.trim()) return; setTree(c => [{ id: Date.now(), user: 'you', text: reply.trim(), time: 'now', likes: 0, replies: [] }, ...c]); setReply(''); app.toast?.({ msg: 'Comment posted', kind: 'success', icon: 'comment' }); };
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="home" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{
          flex: 1, padding: '20px 28px', overflow: 'auto', maxWidth: 720,
          borderRight: '1px solid var(--line)',
        }} className="no-scrollbar">
          <button onClick={() => onNav?.('home')} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13,
            marginBottom: 16, padding: 0,
          }}><span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}><Icon name="arrow" size={14} /></span> Back to feed</button>

          {/* Main post */}
          <article style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--line)', padding: 28, marginBottom: 16 }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <span onClick={() => onNav?.('profile', { handle: user.handle })} style={{ cursor: 'pointer' }}><Avatar src={user.avatar} name={user.name} size={56} verified={user.verified} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 17 }}>{user.name}</span>
                  {user.verified && <span style={{ background: 'var(--sky)', color: '#fff', width: 16, height: 16, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', fontSize: 10 }}>✓</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>@{user.handle} · {post.time} ago · {post.location}</div>
              </div>
              <button className={following ? 'btn btn-ghost' : 'btn btn-primary'} onClick={() => { app.follow.toggle(user.handle); app.toast?.(following ? { msg: `Unfollowed ${user.name}`, icon: 'user' } : { msg: `Following ${user.name}`, kind: 'success', icon: 'user' }); }}>{following ? 'Following' : 'Follow'}</button>
            </header>
            <p style={{ fontSize: 19, lineHeight: 1.55, margin: '0 0 16px', textWrap: 'pretty' }}>{post.content}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {post.tags.map(t => <span key={t} style={{ color: 'var(--sky)', fontWeight: 500 }}>#{t}</span>)}
            </div>
            {post.image && <ImagePlaceholder label={post.image} height={420} src={post.imageUrl} />}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
              marginTop: 18, padding: 14, background: 'var(--green-tint)', borderRadius: 12,
            }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'Geist Mono', color: 'var(--green)', letterSpacing: '.05em' }}>VERIFIED IMPACT</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Bricolage Grotesque', color: 'var(--green)' }}>−1.4 t</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>CO₂ /yr · oracle-verified May 19</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'Geist Mono', color: 'var(--green)', letterSpacing: '.05em' }}>ENERGY SAVED</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Bricolage Grotesque', color: 'var(--green)' }}>3.2 MWh</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>vs 2024 baseline</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'Geist Mono', color: 'var(--green)', letterSpacing: '.05em' }}>$ SAVED</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Bricolage Grotesque', color: 'var(--green)' }}>$3,012</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>annual co-op savings</div>
              </div>
            </div>
            <footer style={{ display: 'flex', gap: 28, marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
              <ActionBtn icon="heart" count={post.likes + (liked ? 1 : 0)} active={liked} activeColor="var(--clay)" onClick={() => app.like.toggle(post.id)} />
              <ActionBtn icon="comment" count={post.comments} onClick={() => document.getElementById('pd-reply')?.focus()} />
              <ActionBtn icon="repost" count={post.reposts} onClick={() => app.toast?.({ msg: 'Reposted to your followers', icon: 'repost' })} />
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 18 }}>
                <ActionBtn icon="bookmark" active={saved} onClick={() => { app.save.toggle(post.id); app.toast?.(saved ? { msg: 'Removed from bookmarks', icon: 'bookmark' } : { msg: 'Saved to bookmarks', kind: 'success', icon: 'bookmark' }); }} />
                <ActionBtn icon="share" onClick={() => app.toast?.({ msg: 'Link copied', sub: 'Post link copied to clipboard.', icon: 'share' })} />
              </span>
            </footer>
          </article>

          {/* Comment composer */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <Avatar name="Y" size={40} />
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
        <div style={{ width: 340, padding: 20, overflow: 'auto', flexShrink: 0 }} className="no-scrollbar">
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
