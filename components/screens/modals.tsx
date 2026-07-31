"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { Toggle, ModalFoot, MProject, MArticle, MProduct, MCredit, MChallenge, MDiscussion, MBadge, MCelebrate, MWallet, MList, MCommunityAbout } from "./desktop-misc";
import { KpiCard } from "./impact";
import { logImpact, TASK_IMPACTS, ACTION_IMPACTS, computeImpact, VOUCH_THRESHOLD } from "@/lib/impact";
import { QuoteCard } from "./communities";

// Hashtag pool - seeded from MOCK trends + common sustainability tags
const HASHTAG_POOL = [
  'SolarPanels', 'ClimateStrike', 'ZeroWaste', 'UrbanGardening', 'CarbonOffsets',
  'GreenEnergy', 'ClimateAction', 'Sustainability', 'EcoFriendly', 'NetZero',
  'RenewableEnergy', 'CleanEnergy', 'PlantBased', 'CompostLife', 'BikeToWork',
  'PublicTransit', 'ElectricVehicle', 'WildlifeConservation', 'TreePlanting', 'OceanCleanup',
  'CircularEconomy', 'FoodWaste', 'SlowFashion', 'GreenBuilding', 'CarbonNeutral',
  'Rewilding', 'SustainableAg', 'WaterConservation', 'AirQuality', 'GreenTech',
  'ClimateJustice', 'EnergyEfficiency', 'CommunityGarden', 'LocalFood', 'Beekeeping',
  'SeedSwap', 'PollinatorGarden', 'SolarCoOp', 'GreenPoints', 'ImpactLedger',
];

export function MCommunityCompose({ close, data }: { close: () => void; data?: { community?: string; communityId?: string; communityAvatar?: string } }) {
  const app = useApp();
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [postKind, setPostKind] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [publishing, setPublishing] = React.useState(false);
  const [quotedPost, setQuotedPost] = React.useState<any>(null);
  const imgRef = React.useRef<HTMLInputElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { setTimeout(() => titleRef.current?.focus(), 60); }, []);

  const handleBodyPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    const postUrlMatch = pasted.match(/\/post\/([0-9a-f-]{36})|\/communities\/post\/[^/]+\/([0-9a-f-]{36})/);
    if (postUrlMatch) {
      const postId = postUrlMatch[1] ?? postUrlMatch[2];
      const { supabase } = await import('@/lib/supabase');
      const { data: post } = await supabase.from('posts').select('*, profiles!posts_user_id_fkey(full_name, handle, avatar_url)').eq('id', postId).single();
      if (post) { setQuotedPost(post); e.preventDefault(); }
    }
  };

  const publish = async () => {
    if (!title.trim() || !app.user?.id) return;
    setPublishing(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      let image_url: string | null = null;
      if (imageFile) {
        const { uploadFile } = await import('@/lib/storage');
        image_url = await uploadFile('posts', app.user.id, imageFile);
      }
      const payload: Record<string, any> = {
        user_id: app.user.id,
        title: title.trim(),
        content: body.trim() || title.trim(),
        image_url,
        community_id: data?.communityId,
        ...(postKind ? { post_kind: postKind } : {}),
        ...(quotedPost ? { quote_post_id: quotedPost.id } : {}),
      };
      let result = await supabase.from('posts').insert(payload).select('id').single();
      if ((result as any).error) {
        const { post_kind: _pk, ...noKind } = payload;
        result = await supabase.from('posts').insert(noKind).select('id').single();
      }
      if ((result as any).error) throw (result as any).error;
      app.toast?.({ kind: 'success', msg: 'Posted to community!', icon: 'check' });
      close();
    } catch (err: any) {
      app.toast?.({ kind: 'error', msg: 'Failed to publish', sub: err.message, icon: 'bolt' });
    } finally {
      setPublishing(false);
    }
  };

  const kindMeta = [
    { kind: 'tip',        label: '💡 Tip',        color: 'var(--green)', desc: 'Share something useful' },
    { kind: 'question',   label: '❓ Question',    color: 'var(--sky)',   desc: 'Ask the community' },
    { kind: 'win',        label: '🏆 Win',         color: '#f59e0b',      desc: 'Celebrate progress' },
    { kind: 'discussion', label: '💬 Discussion',  color: 'var(--ink-2)', desc: 'Start a conversation' },
  ];

  return (
    <Modal onClose={close} width={580}>
      {/* Community header */}
      <div style={{ background: 'var(--green)', padding: '18px 24px 16px', borderRadius: '16px 16px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          {data?.communityAvatar
            ? <img src={data.communityAvatar} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{(data?.community ?? 'C').charAt(0).toUpperCase()}</div>
          }
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontFamily: 'JetBrains Mono', letterSpacing: '.05em' }}>POSTING TO</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{data?.community ?? 'Community'}</div>
          </div>
          <button onClick={close} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff', fontSize: 16 }}>✕</button>
        </div>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        {/* Post kind — required feel */}
        <div style={{ marginBottom: 18 }}>
          <span className="fld-label" style={{ marginBottom: 8, display: 'block' }}>Post type <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {kindMeta.map(({ kind, label, color, desc }) => (
              <button key={kind} onClick={() => setPostKind(postKind === kind ? null : kind)}
                style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: '1.5px solid', borderColor: postKind === kind ? color : 'var(--line)', background: postKind === kind ? color + '14' : 'var(--surface)', cursor: 'pointer', transition: 'all .12s' }}>
                <div style={{ fontSize: 16, marginBottom: 3 }}>{label.split(' ')[0]}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: postKind === kind ? color : 'var(--ink-2)' }}>{label.split(' ').slice(1).join(' ')}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Title — required */}
        <div style={{ marginBottom: 12 }}>
          <span className="fld-label">Title <span style={{ color: 'var(--clay)', fontSize: 11 }}>required</span></span>
          <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
            placeholder="Give your post a clear, descriptive title…"
            className="fld" style={{ width: '100%', fontSize: 16, fontWeight: 600 }} />
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{title.length}/120</div>
        </div>

        {/* Body — optional */}
        <div style={{ marginBottom: 14 }}>
          <span className="fld-label">Content <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional — expand for full detail)</span></span>
          <textarea value={body} onChange={e => setBody(e.target.value)} onPaste={handleBodyPaste}
            placeholder="Share more context, details, links, or images… Paste a Honua post link to quote it."
            className="fld" style={{ width: '100%', minHeight: 100, resize: 'vertical' }} />
        </div>

        {/* Quoted post preview */}
        {quotedPost && (
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <QuoteCard post={quotedPost} onNav={() => {}} compact />
            <button onClick={() => setQuotedPost(null)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.45)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff', fontSize: 11 }}>✕</button>
          </div>
        )}

        {/* Image */}
        {imagePreview && (
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <img src={imagePreview} style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
            <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}>✕</button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid var(--line)', marginBottom: 4 }}>
          <button onClick={() => imgRef.current?.click()} title="Attach image" style={{ background: imageFile ? 'var(--green-tint)' : 'transparent', border: 'none', borderRadius: 8, padding: 7, cursor: 'pointer', color: imageFile ? 'var(--green)' : 'var(--ink-3)' }}>
            <Icon name="image" size={18} />
          </button>
          <input ref={imgRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} style={{ display: 'none' }} />
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Title shows as headline on the card</span>
        </div>
      </div>

      <ModalFoot>
        <button className="btn btn-ghost" onClick={close} disabled={publishing}>Cancel</button>
        <button className="btn btn-green" onClick={publish} disabled={!title.trim() || publishing} style={{ opacity: title.trim() ? 1 : .5 }}>
          {publishing ? 'Publishing…' : 'Post to community'}
        </button>
      </ModalFoot>
    </Modal>
  );
}

export function MCompose({ close, data }: { close: () => void; data?: { community?: string; communityId?: string } }) {
  const app = useApp();
  const [text, setText] = React.useState('');
  const [cat, setCat] = React.useState('General');
  const [postKind, setPostKind] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [quotedPost, setQuotedPost] = React.useState<any>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  // Pre-load quoted post if opened from "Quote post" repost menu
  React.useEffect(() => {
    const qid = (data as any)?.quotePostId;
    if (!qid || quotedPost) return;
    setQuoteLoading(true);
    import('@/lib/supabase').then(({ supabase }) =>
      supabase.from('posts').select('*, profiles!posts_user_id_fkey(full_name, handle, avatar_url)').eq('id', qid).single()
        .then(({ data: p }: any) => { if (p) setQuotedPost(p); setQuoteLoading(false); })
    );
  }, []);
  // Hashtag autocomplete
  const [tagSuggestions, setTagSuggestions] = React.useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = React.useState(0);
  const [hashQuery, setHashQuery] = React.useState('');
  const [hashStart, setHashStart] = React.useState(-1);
  const [allTags, setAllTags] = React.useState<string[]>(HASHTAG_POOL);
  // Mention autocomplete
  const [mentionSuggestions, setMentionSuggestions] = React.useState<any[]>([]);
  const [activeMention, setActiveMention] = React.useState(0);
  const [mentionQuery, setMentionQuery] = React.useState('');
  const [mentionStart, setMentionStart] = React.useState(-1);
  const mentionTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const imgRef = React.useRef<HTMLInputElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // Fetch existing tags from DB and merge with static pool
  React.useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('posts').select('tags').not('tags', 'is', null).limit(500)
        .then(({ data }) => {
          if (!data) return;
          const dbTags = [...new Set(data.flatMap((p: any) => p.tags || []))] as string[];
          setAllTags(prev => [...new Set([...prev, ...dbTags])]);
        });
    });
  }, []);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const fetchMentions = (q: string) => {
    if (mentionTimer.current) clearTimeout(mentionTimer.current);
    if (!q) { setMentionSuggestions([]); return; }
    mentionTimer.current = setTimeout(async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.from('profiles').select('id, handle, full_name, avatar_url')
        .ilike('handle', `${q}%`).limit(6);
      setMentionSuggestions(data ?? []);
      setActiveMention(0);
    }, 180);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);

    // Check @ first (mention takes priority when both could match)
    const mentionMatch = before.match(/@(\w*)$/);
    if (mentionMatch) {
      const q = mentionMatch[1];
      setMentionQuery(q);
      setMentionStart(cursor - mentionMatch[0].length);
      fetchMentions(q);
      // Clear hash state
      setTagSuggestions([]);
      setHashQuery('');
      setHashStart(-1);
      return;
    }
    setMentionSuggestions([]);
    setMentionQuery('');
    setMentionStart(-1);

    // Then check # (hashtag)
    const hashMatch = before.match(/#(\w*)$/);
    if (hashMatch) {
      const q = hashMatch[1];
      setHashQuery(q);
      setHashStart(cursor - hashMatch[0].length);
      const lower = q.toLowerCase();
      const hits = allTags.filter(t => t.toLowerCase().startsWith(lower) && t.toLowerCase() !== lower).slice(0, 6);
      setTagSuggestions(hits);
      setActiveSuggestion(0);
    } else {
      setTagSuggestions([]);
      setHashQuery('');
      setHashStart(-1);
    }
  };

  const acceptSuggestion = (tag: string) => {
    if (hashStart < 0) return;
    const cursor = taRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, hashStart);
    const after = text.slice(cursor);
    const newText = before + '#' + tag + ' ' + after;
    setText(newText);
    setTagSuggestions([]);
    setHashQuery('');
    setHashStart(-1);
    setTimeout(() => {
      taRef.current?.focus();
      const pos = (before + '#' + tag + ' ').length;
      taRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const acceptMention = (profile: any) => {
    if (mentionStart < 0) return;
    const cursor = taRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart);
    const after = text.slice(cursor);
    const newText = before + '@' + profile.handle + ' ' + after;
    setText(newText);
    setMentionSuggestions([]);
    setMentionQuery('');
    setMentionStart(-1);
    setTimeout(() => {
      taRef.current?.focus();
      const pos = (before + '@' + profile.handle + ' ').length;
      taRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveMention(i => Math.min(i + 1, mentionSuggestions.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveMention(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptMention(mentionSuggestions[activeMention]); }
      if (e.key === 'Escape')    { setMentionSuggestions([]); }
      return;
    }
    if (!tagSuggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestion(i => Math.min(i + 1, tagSuggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveSuggestion(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptSuggestion(tagSuggestions[activeSuggestion]); }
    if (e.key === 'Escape')    { setTagSuggestions([]); }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    const postUrlMatch = pasted.match(/\/post\/([0-9a-f-]{36})|\/communities\/post\/[^/]+\/([0-9a-f-]{36})/);
    if (postUrlMatch) {
      const postId = postUrlMatch[1] ?? postUrlMatch[2];
      setQuoteLoading(true);
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.from('posts').select('*, profiles!posts_user_id_fkey(full_name, handle, avatar_url)').eq('id', postId).single();
        if (data) { setQuotedPost(data); e.preventDefault(); }
      } finally { setQuoteLoading(false); }
    }
  };

  const publish = async () => {
    if (!text.trim() || !app.user?.id) return;
    setPublishing(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { notifyMentioned } = await import('@/lib/notifications');
      let image_url: string | null = null;
      if (imageFile) {
        const { uploadFile } = await import('@/lib/storage');
        image_url = await uploadFile('posts', app.user.id, imageFile);
      }
      const tags = [...new Set((text.match(/#(\w+)/g) || []).map(t => t.slice(1)))];
      const content = text.trim();
      const payload: Record<string, any> = {
        user_id: app.user.id,
        content,
        image_url,
        post_type: cat.toLowerCase(),
        ...(postKind ? { post_kind: postKind } : {}),
        ...(data?.communityId ? { community_id: data.communityId } : {}),
        ...(quotedPost ? { quote_post_id: quotedPost.id } : {}),
      };
      // Try full payload; progressively strip optional columns that may not exist yet.
      // community_id is ALWAYS kept — it's essential for community posts.
      const fullPayload = { ...payload, tags };
      console.log('[publish] attempting with community_id:', payload.community_id);
      let result = await supabase.from('posts').insert(fullPayload).select('id').single();
      if ((result as any).error) {
        console.log('[publish] full payload failed:', (result as any).error.message, '— retrying without tags');
        const { tags: _t, ...noTags } = fullPayload as any;
        result = await supabase.from('posts').insert(noTags).select('id').single();
      }
      if ((result as any).error) {
        console.log('[publish] no-tags failed:', (result as any).error.message, '— retrying without post_kind');
        const { post_kind: _pk, tags: _t2, ...noKind } = fullPayload as any;
        result = await supabase.from('posts').insert(noKind).select('id').single();
      }
      if ((result as any).error) {
        console.log('[publish] no-kind failed:', (result as any).error.message, '— retrying bare minimum');
        result = await supabase.from('posts').insert({
          user_id: payload.user_id,
          content: payload.content,
          image_url: payload.image_url,
          post_type: payload.post_type,
          ...(payload.community_id ? { community_id: payload.community_id } : {}),
        }).select('id').single();
      }
      console.log('[publish] final result:', (result as any).data, (result as any).error);
      const { data: post, error } = result as any;
      if (error) throw error;
      // Notify mentioned users
      if (post?.id) {
        notifyMentioned({ postId: post.id, content, actorId: app.user.id, body: 'mentioned you in a post' });
      }
      app.toast?.({ kind: 'success', msg: 'Post published', sub: 'Your update is live on the feed.', icon: 'check' });
      close();
    } catch (err: any) {
      app.toast?.({ kind: 'error', msg: 'Failed to publish', sub: err.message, icon: 'bolt' });
    } finally {
      setPublishing(false);
    }
  };

  const showDropdown = mentionSuggestions.length > 0 || tagSuggestions.length > 0;

  return (
    <Modal onClose={close} width={560}>
      <ModalHead icon="pencil" title="New post" sub="Share an action, idea, or win with the community." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar src={app.user?.avatar} name={app.user?.name || 'You'} size={40} />
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea ref={taRef} className="fld" autoFocus value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="What did you do for the planet today? Use #hashtags and @mentions. Paste a Honua post link to quote it."
              style={{ minHeight: 110, width: '100%' }}
            />
            {showDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,.12)', overflow: 'hidden', marginTop: 4,
              }}>
                {mentionSuggestions.length > 0 && mentionSuggestions.map((p, i) => (
                  <button key={p.id} onMouseDown={e => { e.preventDefault(); acceptMention(p); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '8px 14px', background: i === activeMention ? 'var(--surface)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={() => setActiveMention(i)}
                  >
                    <Avatar src={p.avatar_url} name={p.full_name || p.handle} size={28} />
                    <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{p.full_name}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{p.handle}</span>
                  </button>
                ))}
                {tagSuggestions.length > 0 && tagSuggestions.map((tag, i) => (
                  <button key={tag} onMouseDown={e => { e.preventDefault(); acceptSuggestion(tag); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '9px 14px', background: i === activeSuggestion ? 'var(--surface)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      fontSize: 14, color: 'var(--ink)',
                    }}
                    onMouseEnter={() => setActiveSuggestion(i)}
                  >
                    <span style={{ color: 'var(--sky)', fontWeight: 600 }}>#</span>
                    <span>
                      <span style={{ color: 'var(--ink-3)' }}>{tag.slice(0, hashQuery.length)}</span>
                      <span style={{ fontWeight: 600 }}>{tag.slice(hashQuery.length)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {quoteLoading && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-3)' }}>Loading quoted post…</div>}
        {quotedPost && (
          <div style={{ marginTop: 10, position: 'relative' }}>
            <QuoteCard post={quotedPost} onNav={() => {}} compact />
            <button onClick={() => setQuotedPost(null)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.45)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff', fontSize: 11 }}>✕</button>
          </div>
        )}
        {imagePreview && (
          <div style={{ marginTop: 12, position: 'relative' }}>
            <img src={imagePreview} style={{ width: '100%', borderRadius: 10, maxHeight: 220, objectFit: 'cover' }} />
            <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff', fontSize: 14 }}>✕</button>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <span className="fld-label">Category</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['General', 'Energy', 'Waste', 'Transport', 'Food', 'Nature', 'Policy'].map(c => (
              <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <button onClick={() => imgRef.current?.click()} style={{ background: imageFile ? 'var(--green-tint)' : 'transparent', border: 'none', borderRadius: 8, padding: 7, cursor: 'pointer', color: imageFile ? 'var(--green)' : 'var(--ink-3)' }}><Icon name="image" size={18} /></button>
          <input ref={imgRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close} disabled={publishing}>Cancel</button>
        <button className="btn btn-green" onClick={publish} disabled={!text.trim() || publishing} style={{ opacity: text.trim() ? 1 : .5 }}>
          {publishing ? 'Publishing…' : 'Post'}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Log an action ---
export function MLogAction({ close, data }: { close: () => void; data?: { category?: string; quantity?: number; description?: string } }) {
  const app = useApp();
  // icon, category (must match ACTION_IMPACTS in lib/impact.ts)
  const opts: [string, string][] = [
    ['leaf', 'Transport'], ['plant', 'Food'], ['bolt', 'Energy'],
    ['repost', 'Waste'], ['droplet', 'Ocean'], ['sparkles', 'Lifestyle'],
    ['comment', 'Policy'], ['bookmark', 'Education'],
  ];
  const initialSel = Math.max(0, opts.findIndex(([, l]) => l === data?.category));
  const [sel, setSel] = React.useState(initialSel);
  const cat = opts[sel][1];
  const c = ACTION_IMPACTS[cat] ?? ACTION_IMPACTS.General;

  const [qty, setQty] = React.useState<number>(data?.quantity ?? c.defaultQty);
  const [desc, setDesc] = React.useState(data?.description ?? '');
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [proofPreview, setProofPreview] = React.useState<string | null>(null);
  const [shareToFeed, setShareToFeed] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Reset quantity to the category default when switching category
  const selectCat = (i: number) => { setSel(i); setQty(ACTION_IMPACTS[opts[i][1]]?.defaultQty ?? 1); };

  // Live impact preview (computeImpact is the same function the DB write uses)
  const impact = computeImpact(cat, qty);

  const handleLog = async () => {
    if (!desc.trim()) return;
    if (!app.user?.id) { close(); app.toast({ msg: 'Sign in to log actions', icon: 'user' }); return; }
    setSaving(true);
    try {
      const { createImpactAction } = await import('@/lib/impact');
      const { log, co2, pts, error } = await createImpactAction(app.user.id, {
        action: desc.trim(), category: cat, quantity: qty,
        description: desc.trim(), proofFile, shareToFeed, userName: app.user?.name,
      });
      if (!log) throw new Error(error || 'insert failed');
      window.dispatchEvent(new Event('honua:impact-logged'));
      close();
      const willVerify = proofFile || shareToFeed;
      app.openModal('celebrate', {
        title: `Action logged · +${pts} GP`,
        sub: willVerify
          ? `${co2} kg CO₂ recorded. It counts as verified once ${VOUCH_THRESHOLD} community members vouch for it.`
          : `${co2} kg CO₂ recorded on your ledger. Add proof next time to get it community-verified.`,
      });
    } catch (e: any) {
      app.toast({ msg: 'Could not log action', sub: e?.message, kind: 'error', icon: 'close' });
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={close} width={540}>
      <ModalHead icon="plus" title="Log an action" sub="Record a sustainable action — the community verifies it." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Category</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {opts.map(([ic, l], i) => {
            const ci = ACTION_IMPACTS[l];
            return (
              <button key={l} onClick={() => selectCat(i)} className={'opt-row ' + (sel === i ? 'sel' : '')} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: sel === i ? 'var(--green)' : 'var(--ink-3)' }}><Icon name={ic} size={18} stroke={2} /></span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span>
                <span style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>{ci ? `per ${ci.unit.split(' ')[0]}` : ''}</span>
              </button>
            );
          })}
        </div>

        {/* Quantity — drives the CO₂ + GP calculation */}
        <span className="fld-label">How much? <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>({c.unit})</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setQty(q => Math.max(0, Math.round((q - c.step) * 100) / 100))} style={{ width: 38, height: 40, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', fontSize: 18, color: 'var(--ink-2)' }}>−</button>
            <input type="number" value={qty} min={0} step={c.step}
              onChange={e => setQty(Math.max(0, Number(e.target.value) || 0))}
              style={{ width: 72, height: 40, border: 'none', borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', textAlign: 'center', fontSize: 15, fontWeight: 600, background: 'var(--surface)', color: 'var(--ink)', outline: 'none' }} />
            <button onClick={() => setQty(q => Math.round((q + c.step) * 100) / 100)} style={{ width: 38, height: 40, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', fontSize: 18, color: 'var(--ink-2)' }}>+</button>
          </div>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{c.unit}</span>
          {/* live readout */}
          <span style={{ marginLeft: 'auto', fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--green)' }}>
            {impact.co2 > 0 ? `${impact.co2} kg CO₂ · ` : ''}+{impact.pts} GP
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 14, lineHeight: 1.4 }}>
          {impact.co2 > 0
            ? `${qty} × ${c.factorKgPerUnit} kg/${c.unit.split(' ')[0]} — ${c.source}`
            : `No direct CO₂ — earns Green Points. ${c.source}`}
        </div>

        <span className="fld-label">What did you do?</span>
        <input className="fld" autoFocus value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Biked to work instead of driving" style={{ marginBottom: 14 }} />

        <span className="fld-label">Proof <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(photo — optional, but needed for verification)</span></span>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
          const f = e.target.files?.[0];
          if (f) { setProofFile(f); setProofPreview(URL.createObjectURL(f)); }
        }} />
        <div onClick={() => fileRef.current?.click()} style={{
          height: proofPreview ? 120 : 64, borderRadius: 12, marginBottom: 14, cursor: 'pointer',
          border: `2px dashed ${proofFile ? 'var(--green)' : 'var(--line-2)'}`,
          background: proofFile ? 'var(--green-tint)' : 'var(--bg-2)',
          display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative', transition: 'all .2s',
        }}>
          {proofPreview
            ? <img src={proofPreview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13, fontWeight: 600 }}>
                <Icon name="image" size={16} /> Add a photo of the action
              </span>}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 4 }}>
          <input type="checkbox" checked={shareToFeed} onChange={e => setShareToFeed(e.target.checked)} style={{ accentColor: 'var(--green)', width: 16, height: 16 }} />
          <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>Share to feed so the community can vouch for it</span>
        </label>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleLog} disabled={!desc.trim() || saving} style={{ opacity: desc.trim() && !saving ? 1 : .5 }}>
          {saving ? 'Logging…' : `Log action · +${impact.pts} GP`}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Export report (redesigned: Lora headings / Satoshi body / JetBrains Mono data,
// matching the main app's brand system — replaces the old ad-hoc Georgia/system-ui look) ---
function inRange(iso: string | undefined, range: string): boolean {
  if (!iso) return false;
  if (range === 'All time') return true;
  const d = new Date(iso); const now = new Date();
  if (range === 'This year') return d.getFullYear() === now.getFullYear();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function downloadBlob(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Honua category colours for exports (hex — canvas can't use CSS vars)
const EXPORT_CAT_HEX: Record<string, string> = {
  Transport: '#1f6f3f', Energy: '#2e9a5b', Food: '#1d6dc4', Waste: '#e6b450',
  Ocean: '#1d6dc4', Lifestyle: '#8a5fd6', Policy: '#c4623a', Education: '#1d6dc4', General: '#8a918c',
};
const BRAND_GREEN = '#1f6f3f';
const BRAND_GREEN_2 = '#2e9a5b';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Loads the brand webfonts into a canvas context (Lora for display, Satoshi
// for body, JetBrains Mono for data/labels) before we draw the PNG card.
async function ensureExportFonts() {
  const specs = [
    ['700 118px Lora', 'Lora'],
    ['400 30px Satoshi', 'Satoshi'],
    ['600 26px "JetBrains Mono"', 'JetBrains Mono'],
  ] as const;
  await Promise.all(specs.map(([spec]) => (document as any).fonts?.load?.(spec)));
}

export function MExport({ close }) {
  const app = useApp();
  const [fmt, setFmt] = React.useState('PDF');
  const [range, setRange] = React.useState('This month');
  const [busy, setBusy] = React.useState(false);

  const handleExport = async () => {
    if (!app.user?.id) { close(); app.toast({ msg: 'Sign in to export', icon: 'user' }); return; }
    setBusy(true);
    try {
      const { getAllLogs } = await import('@/lib/impact');
      const all = await getAllLogs(app.user.id);
      const logs = all.filter(l => inRange(l.logged_at, range));
      if (logs.length === 0) {
        app.toast({ msg: 'Nothing to export', sub: `No actions in "${range}".`, icon: 'leaf' });
        setBusy(false); return;
      }
      const totalCo2 = logs.reduce((s, l) => s + Number(l.co2_saved_kg ?? 0), 0);
      const totalGp = logs.reduce((s, l) => s + Number(l.points ?? 0), 0);
      const verified = logs.filter(l => l.status === 'verified').length;
      const name = app.user?.name || 'You';
      const stamp = new Date().toISOString().substring(0, 10);
      const slug = range.toLowerCase().replace(/\s+/g, '-');
      const co2Big = totalCo2 >= 1000 ? `${(totalCo2 / 1000).toFixed(1)} t` : `${Math.round(totalCo2)} kg`;

      const byCat: Record<string, { co2: number; gp: number }> = {};
      for (const l of logs) {
        const c = l.category ?? 'General';
        byCat[c] = byCat[c] ?? { co2: 0, gp: 0 };
        byCat[c].co2 += Number(l.co2_saved_kg ?? 0);
        byCat[c].gp += Number(l.points ?? 0);
      }
      const cats = Object.entries(byCat).sort((a, b) => (b[1].gp) - (a[1].gp));

      if (fmt === 'CSV') {
        const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const header = ['Date', 'Category', 'Action', 'Quantity', 'Unit', 'CO2 (kg)', 'Green Points', 'Status'];
        const body = logs.map(l => [
          (l.logged_at ?? '').substring(0, 10), l.category, l.action,
          l.quantity ?? '', l.unit ?? '', l.co2_saved_kg ?? 0, l.points ?? 0, l.status ?? 'unverified',
        ].map(cell).join(','));
        const totals = ['', '', 'TOTAL', '', '', totalCo2.toFixed(2), totalGp, `${verified} verified`].map(cell).join(',');
        const preamble = [`# Honua impact report — ${name} — ${range} — ${stamp}`, ''];
        downloadBlob([...preamble, header.map(cell).join(','), ...body, totals].join('\n'), 'text/csv;charset=utf-8', `honua-impact-${slug}.csv`);
      } else if (fmt === 'PDF') {
        const rows = logs.map((l, i) => {
          const st = l.status === 'verified' ? `<b class="verified">VERIFIED</b>` : 'PENDING';
          return `<tr><td class="idx">${String(i + 1).padStart(2, '0')}</td><td>${(l.logged_at ?? '').substring(0, 10)}</td><td>${l.category}</td><td>${l.action}</td><td>${l.quantity ?? ''} ${l.unit ?? ''}</td><td class="r">${Number(l.co2_saved_kg ?? 0).toFixed(2)}</td><td class="r">${l.points ?? 0}</td><td class="st">${st}</td></tr>`;
        }).join('');
        const catRows = cats.map(([c, v]) => `<tr><td>${c}</td><td class="r">${v.co2.toFixed(1)} kg</td><td class="r">${v.gp} GP</td></tr>`).join('');
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Honua Impact — ${name} — ${range}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            *{box-sizing:border-box} body{font-family:'Satoshi','Geist',system-ui,-apple-system,sans-serif;color:#0a0d0b;margin:0;padding:0;background:#fafaf7}
            .page{max-width:800px;margin:0 auto;padding:56px 48px 60px}
            .masthead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0a0d0b;padding-bottom:18px;margin-bottom:34px}
            .brand{font:600 11px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#5c635e}
            .doc-id{font:400 11px 'JetBrains Mono',monospace;color:#8a918c;text-align:right}
            .headline{font:700 44px/1.05 'Lora',serif;letter-spacing:-.01em;margin:26px 0 6px}
            .sub{font-size:14px;color:#5c635e}
            .rule{border:none;border-top:1px solid #0a0d0b;margin:30px 0 0}
            .kpis{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #0a0d0b;margin-top:0}
            .kpi{padding:18px 20px;border-right:1px solid #0a0d0b}
            .kpi:last-child{border-right:none}
            .kpi b{display:block;font:600 30px 'Lora',serif}
            .kpi span{font:500 10.5px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:#5c635e}
            h2{font:600 11px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.14em;color:#0a0d0b;margin:36px 0 12px;padding-bottom:8px;border-bottom:1px solid #0a0d0b}
            table{width:100%;border-collapse:collapse;font-size:12.5px}
            .cat-table td{padding:7px 4px;border-bottom:1px solid #e8e7e1}
            .cat-table td.r{text-align:right;font-family:'JetBrains Mono',monospace}
            .log-table th{font:500 9.5px 'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.06em;color:#8a918c;text-align:left;padding:6px 4px;border-bottom:1px solid #0a0d0b}
            .log-table td{padding:8px 4px;border-bottom:1px solid #e8e7e1;font-size:12px}
            .log-table td.idx{font-family:'JetBrains Mono',monospace;color:#8a918c}
            .log-table td.r{text-align:right;font-family:'JetBrains Mono',monospace}
            .log-table td.st{font:500 10px 'JetBrains Mono',monospace;letter-spacing:.04em}
            .verified{color:#0a0d0b}
            .foot{margin-top:40px;padding-top:16px;border-top:1px solid #0a0d0b;font:400 11px 'JetBrains Mono',monospace;color:#8a918c;display:flex;justify-content:space-between}
            @media print{body{background:#fff}}
          </style></head><body><div class="page">
          <div class="masthead"><div class="brand">Honua — Impact Report</div><div class="doc-id">Generated ${stamp}</div></div>
          <div class="headline">${co2Big} CO&#8322; avoided</div>
          <div class="sub">${name} &middot; ${range}</div>
          <div class="kpis">
            <div class="kpi"><b>${totalGp}</b><span>Green Points</span></div>
            <div class="kpi"><b>${logs.length}</b><span>Actions logged</span></div>
            <div class="kpi"><b>${verified}</b><span>Verified</span></div>
          </div>
          <h2>By category</h2>
          <table class="cat-table"><tbody>${catRows}</tbody></table>
          <h2>Every action</h2>
          <table class="log-table"><thead><tr><th>No.</th><th>Date</th><th>Category</th><th>Action</th><th>Amount</th><th style="text-align:right">CO&#8322; kg</th><th style="text-align:right">GP</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="foot"><span>honua.green</span><span>Verified community impact ledger</span></div>
          </div><script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
        else { app.toast({ msg: 'Allow pop-ups to export the PDF', icon: 'close' }); setBusy(false); return; }
      } else {
        await ensureExportFonts();
        const S = 1080;
        const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
        const ctx = cv.getContext('2d');
        if (!ctx) throw new Error('canvas unsupported');
        const PAPER = '#fafaf7', INK = '#0a0d0b', MUTE = '#5c635e', LINE = '#d8d7d0', GREEN = BRAND_GREEN;
        ctx.fillStyle = PAPER; ctx.fillRect(0, 0, S, S);
        const P = 84;
        // outer frame with green corner ticks — paper + ink + green, no gradients
        ctx.strokeStyle = LINE; ctx.lineWidth = 1;
        ctx.strokeRect(P * 0.55, P * 0.55, S - P * 1.1, S - P * 1.1);
        const tick = 22;
        [[P * 0.55, P * 0.55, 1, 1], [S - P * 0.55, P * 0.55, -1, 1], [P * 0.55, S - P * 0.55, 1, -1], [S - P * 0.55, S - P * 0.55, -1, -1]].forEach(([x, y, dx, dy]: any) => {
          ctx.strokeStyle = GREEN; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tick * dx, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + tick * dy); ctx.stroke();
        });
        ctx.fillStyle = GREEN; ctx.font = '600 22px "JetBrains Mono", monospace';
        ctx.fillText('HONUA — IMPACT REPORT', P, 150);
        ctx.fillStyle = MUTE; ctx.textAlign = 'right'; ctx.fillText(stamp, S - P, 150); ctx.textAlign = 'left';
        ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(P, 174); ctx.lineTo(S - P, 174); ctx.stroke();

        ctx.fillStyle = INK; ctx.font = '600 112px Lora, serif';
        ctx.fillText(co2Big, P, 320);
        ctx.font = '400 26px Satoshi, system-ui, sans-serif'; ctx.fillStyle = MUTE;
        ctx.fillText(`CO2 avoided — ${range}`, P, 360);

        // KPI row: bordered cells, green rule underline on the value
        const stats: [string, string][] = [[`${totalGp}`, 'GREEN POINTS'], [`${logs.length}`, 'ACTIONS'], [`${verified}`, 'VERIFIED']];
        const kY = 430, kH = 130, kw = (S - P * 2) / 3;
        ctx.strokeStyle = LINE; ctx.lineWidth = 1;
        ctx.strokeRect(P, kY, S - P * 2, kH);
        stats.forEach(([v, l], i) => {
          const x = P + i * kw;
          if (i > 0) { ctx.beginPath(); ctx.moveTo(x, kY); ctx.lineTo(x, kY + kH); ctx.stroke(); }
          ctx.fillStyle = INK; ctx.font = '600 46px Lora, serif';
          ctx.fillText(v, x + 26, kY + 68);
          ctx.fillStyle = GREEN; ctx.fillRect(x + 26, kY + 82, 28, 3);
          ctx.font = '500 16px "JetBrains Mono", monospace'; ctx.fillStyle = MUTE;
          ctx.fillText(l, x + 26, kY + 106);
        });

        let by = 630;
        ctx.font = '600 18px "JetBrains Mono", monospace'; ctx.fillStyle = GREEN;
        ctx.fillText('BY CATEGORY', P, by);
        ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(P, by + 16); ctx.lineTo(S - P, by + 16); ctx.stroke();
        by += 52;
        const maxGp = Math.max(...cats.map(([, v]) => v.gp), 1);
        cats.slice(0, 5).forEach(([c, v]) => {
          ctx.fillStyle = INK; ctx.font = '500 25px Satoshi, system-ui, sans-serif';
          ctx.fillText(c.toUpperCase(), P, by);
          ctx.font = '400 20px "JetBrains Mono", monospace'; ctx.fillStyle = MUTE; ctx.textAlign = 'right';
          ctx.fillText(`${v.co2.toFixed(1)} KG · ${v.gp} GP`, S - P, by);
          ctx.textAlign = 'left';
          // thin green progress tick beneath, scaled to share of points
          const barY = by + 12, barW = S - P * 2;
          ctx.fillStyle = LINE; ctx.fillRect(P, barY, barW, 3);
          ctx.fillStyle = GREEN; ctx.fillRect(P, barY, Math.max(6, barW * (v.gp / maxGp)), 3);
          by += 46;
        });

        ctx.fillStyle = MUTE; ctx.font = '400 18px "JetBrains Mono", monospace';
        ctx.fillText(`${name.toUpperCase()} · HONUA.GREEN`, P, S - 90);

        triggerDownload(cv.toDataURL('image/png'), `honua-impact-${slug}.png`);
      }
      close();
      app.toast({ kind: 'success', msg: `${fmt} exported`, sub: `${range} · ${logs.length} actions`, icon: 'download' });
    } catch (e: any) {
      app.toast({ msg: 'Export failed', sub: e?.message, kind: 'error', icon: 'close' });
    } finally { setBusy(false); }
  };

  return (
    <Modal onClose={close} width={460}>
      <ModalHead icon="download" iconColor="var(--sky)" title="Export impact report" sub="Download a summary of your logged impact." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Format</span>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          {['CSV', 'PDF', 'PNG card'].map(f => <button key={f} onClick={() => setFmt(f)} className={'chip ' + (fmt === f ? 'chip-green' : '')} style={{ cursor: 'pointer', border: fmt === f ? 'none' : undefined }}>{f}</button>)}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 16 }}>
          {fmt === 'CSV' ? 'Spreadsheet of every logged action.' : fmt === 'PDF' ? "Printable report — opens your browser's print dialog (choose “Save as PDF”)." : 'A shareable summary image.'}
        </div>
        <span className="fld-label">Date range</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['This month', 'This year', 'All time'].map(r => <button key={r} onClick={() => setRange(r)} className={'chip ' + (range === r ? 'chip-green' : '')} style={{ cursor: 'pointer', border: range === r ? 'none' : undefined }}>{r}</button>)}
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={handleExport} disabled={busy}>{busy ? 'Exporting…' : `Export ${fmt}`}</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Start a project ---
export function MStartProject({ close }) {
  const app = useApp();
  const [name, setName] = React.useState('');
  const [cat, setCat] = React.useState('Cleanup');
  const [date, setDate] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    if (!app.user?.id) {
      close();
      app.toast({ msg: 'Sign in to start a project', icon: 'user' });
      return;
    }
    setSaving(true);
    try {
      // Geocode the free-text location so the project lands on the map
      let lat: number | null = null, lng: number | null = null;
      if (location.trim()) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`, { headers: { 'Accept-Language': 'en' } });
          const results = await res.json();
          if (results?.[0]) { lat = parseFloat(results[0].lat); lng = parseFloat(results[0].lon); }
        } catch {}
      }
      // Fall back to the browser's location so it still shows on the map
      if (lat === null && typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>(resolve => {
          navigator.geolocation.getCurrentPosition(
            pos => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
            () => resolve(),
            { timeout: 4000 }
          );
        });
      }
      const { createMapProject } = await import('@/lib/market');
      const ok = await createMapProject(app.user.id, {
        title: name.trim(), category: cat, startsAt: date || undefined,
        locationName: location.trim() || undefined, description: desc.trim() || undefined,
        hostName: app.user?.name, lat, lng,
      });
      close();
      if (ok) {
        window.dispatchEvent(new Event('honua:project-created'));
        app.toast({ kind: 'success', msg: 'Project created', sub: lat !== null ? 'It\'s live on the map now.' : 'Saved — add a location to place it on the map.', icon: 'pin' });
      } else {
        app.toast({ msg: 'Could not create project', sub: 'Check that migration 015 has been run.', kind: 'error', icon: 'close' });
      }
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={close} width={540}>
      <ModalHead icon="pin" title="Start a project" sub="Rally your neighborhood around a local action." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Project name</span>
        <input className="fld" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Saturday creek cleanup" style={{ marginBottom: 14 }} />
        <span className="fld-label">Type</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['Cleanup', 'Garden', 'Energy', 'Repair', 'Policy', 'Waste'].map(c => <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <span className="fld-label">Date &amp; time</span>
            <input
              className="fld"
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ colorScheme: 'light dark' }}
            />
          </div>
          <div><span className="fld-label">Location</span><input className="fld" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Brooklyn, NY" /></div>
        </div>
        <div style={{ marginTop: 14 }}><span className="fld-label">Description</span><textarea className="fld" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What will you do, what to bring…" /></div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleCreate} disabled={!name.trim() || saving} style={{ opacity: name.trim() && !saving ? 1 : .5 }}>{saving ? 'Creating…' : 'Create project'}</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Create challenge ---
export function MCreateChallenge({ close }) {
  const app = useApp();
  const [title, setTitle] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [cat, setCat] = React.useState('Energy');
  const [days, setDays] = React.useState(30);
  const [reward, setReward] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !app.user?.id) return;
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('challenges').insert({
        title: title.trim(),
        description: desc.trim() || null,
        category: cat,
        days,
        reward: reward.trim() || null,
        status: 'pending',
        submitted_by: app.user.id,
      });
      if (error) throw error;
      close();
      app.toast({ kind: 'success', msg: 'Challenge submitted!', sub: 'Our team will review it and publish if approved.', icon: 'flame' });
    } catch {
      app.toast({ msg: 'Could not submit challenge', kind: 'error', icon: 'close' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={520}>
      <ModalHead icon="flame" iconColor="var(--clay)" title="Submit a challenge" sub="Our team reviews submissions before they go live." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Challenge title</span>
        <input className="fld" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Car-free fortnight" style={{ marginBottom: 14 }} />
        <span className="fld-label">Description <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></span>
        <textarea className="fld" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's the goal and why does it matter?" rows={2} style={{ marginBottom: 14, resize: 'none' }} />
        <span className="fld-label">Category</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['Energy', 'Transport', 'Food', 'Waste', 'Nature', 'Lifestyle'].map(c => (
            <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>
          ))}
        </div>
        <span className="fld-label">Duration</span>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[7, 14, 21, 30].map(d => (
            <button key={d} onClick={() => setDays(d)} className={'chip ' + (days === d ? 'chip-green' : '')} style={{ cursor: 'pointer', border: days === d ? 'none' : undefined }}>{d} days</button>
          ))}
        </div>
        <span className="fld-label">Suggested reward <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></span>
        <input className="fld" value={reward} onChange={e => setReward(e.target.value)} placeholder="e.g. 120 GP + Cyclist badge" style={{ marginBottom: 4 }} />
        <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>Final rewards are set by admins.</div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleSubmit} disabled={!title.trim() || loading} style={{ opacity: title.trim() && !loading ? 1 : .5 }}>
          {loading ? 'Submitting…' : 'Submit for review'}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Edit community ---
export function MEditCommunity({ close, data }: { close: () => void; data?: { community: any; onSaved?: (c: any) => void } }) {
  const community = data?.community;
  const app = useApp();
  const [name, setName] = React.useState(community?.name ?? '');
  const [desc, setDesc] = React.useState(community?.description ?? '');
  const [cat, setCat] = React.useState(community?.cat ?? 'Environment');
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState(community?.coverUrl ?? '');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState(community?.avatarUrl ?? '');
  const [loading, setLoading] = React.useState(false);
  const coverRef = React.useRef<HTMLInputElement>(null);
  const avatarRef = React.useRef<HTMLInputElement>(null);

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setCoverFile(file); setCoverPreview(URL.createObjectURL(file));
  }
  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file));
  }

  const handleSave = async () => {
    if (!name.trim() || !app.user?.id || !community?.id) return;
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { uploadFile } = await import('@/lib/storage');
      const [cover_url, avatar_url] = await Promise.all([
        coverFile ? uploadFile('covers', app.user.id, coverFile) : Promise.resolve(community.coverUrl || null),
        avatarFile ? uploadFile('avatars', app.user.id, avatarFile) : Promise.resolve(community.avatarUrl || null),
      ]);
      const { data: row, error } = await supabase.from('communities')
        .update({ name: name.trim(), description: desc.trim() || null, category: cat, cover_url, avatar_url })
        .eq('id', community.id)
        .select('id, name, slug, description, category, member_count, cover_url, avatar_url, created_by')
        .single();
      if (error) throw error;
      close();
      app.toast({ kind: 'success', msg: 'Community updated', icon: 'users' });
      data?.onSaved?.({ ...row, cat: row.category, coverUrl: row.cover_url ?? '', avatarUrl: row.avatar_url ?? '', createdBy: row.created_by });
    } catch {
      app.toast({ msg: 'Could not save changes', kind: 'error', icon: 'close' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={500}>
      <ModalHead icon="edit" title="Edit community" sub="Changes are visible to all members immediately." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickCover} />
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickAvatar} />
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <div onClick={() => coverRef.current?.click()} style={{ width: '100%', height: 110, borderRadius: 12, cursor: 'pointer', background: coverPreview ? `url(${coverPreview}) center/cover` : 'var(--bg-2)', border: '1.5px dashed var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'var(--ink-3)', fontSize: 13, fontWeight: 500 }}>
            {!coverPreview && <><Icon name="image" size={20} />Cover photo</>}
          </div>
          <div onClick={() => avatarRef.current?.click()} style={{ position: 'absolute', bottom: -28, left: 16, width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--surface)', cursor: 'pointer', background: avatarPreview ? `url(${avatarPreview}) center/cover` : 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}>
            {!avatarPreview && <Icon name="image" size={16} color="var(--ink-3)" />}
          </div>
        </div>
        <span className="fld-label">Community name</span>
        <input className="fld" autoFocus value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 14 }} />
        <span className="fld-label">Focus area</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {COMMUNITY_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>
          ))}
        </div>
        <span className="fld-label">Description</span>
        <textarea className="fld" value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ resize: 'none' }} />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleSave} disabled={!name.trim() || loading} style={{ opacity: !name.trim() || loading ? .5 : 1 }}>
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </ModalFoot>
    </Modal>
  );
}

// --- Create community ---
const COMMUNITY_CATEGORIES = ['Environment', 'Energy', 'Food', 'Transport', 'Waste', 'Nature', 'Policy', 'Education', 'Other'];

export function MCreateCommunity({ close, data }: { close: () => void; data?: { onCreated?: (c: any) => void } }) {
  const onCreated = data?.onCreated;
  const app = useApp();
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [cat, setCat] = React.useState('Environment');
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState('');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const coverRef = React.useRef<HTMLInputElement>(null);
  const avatarRef = React.useRef<HTMLInputElement>(null);

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  const handleCreate = async () => {
    if (!name.trim() || !app.user?.id) return;
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { uploadFile } = await import('@/lib/storage');
      const [cover_url, avatar_url] = await Promise.all([
        coverFile ? uploadFile('covers', app.user.id, coverFile) : Promise.resolve(null),
        avatarFile ? uploadFile('avatars', app.user.id, avatarFile) : Promise.resolve(null),
      ]);
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data: row, error } = await supabase.from('communities').insert({
        name: name.trim(), slug,
        description: desc.trim() || null,
        category: cat, cover_url, avatar_url,
        created_by: app.user.id,
      }).select('id, name, slug, description, category, member_count, cover_url, avatar_url, created_by').single();
      if (error) throw error;
      await supabase.from('community_members').insert({ community_id: row.id, user_id: app.user.id });
      // Mark as joined in app context immediately
      app.community?.add(row.name);
      close();
      app.toast({ kind: 'success', msg: `${name.trim()} created!`, sub: 'Your community is live.', icon: 'users' });
      onCreated?.({ ...row, members: 1, cat: row.category, coverUrl: row.cover_url ?? '', avatarUrl: row.avatar_url ?? '', createdBy: row.created_by });
    } catch {
      app.toast({ msg: 'Could not create community', kind: 'error', icon: 'close' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={500}>
      <ModalHead icon="users" title="Create a community" sub="Bring people together around a shared goal." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>

        {/* Cover + avatar pickers */}
        <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickCover} />
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickAvatar} />
        <div style={{ position: 'relative', marginBottom: 32 }}>
          {/* Cover banner */}
          <div
            onClick={() => coverRef.current?.click()}
            style={{
              width: '100%', height: 110, borderRadius: 12, cursor: 'pointer',
              background: coverPreview ? `url(${coverPreview}) center/cover` : 'var(--bg-2)',
              border: '1.5px dashed var(--line)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 5, color: 'var(--ink-3)', fontSize: 13, fontWeight: 500,
            }}
          >
            {!coverPreview && <><Icon name="image" size={20} />Cover photo</>}
          </div>
          {/* Avatar circle overlapping bottom of cover */}
          <div
            onClick={() => avatarRef.current?.click()}
            style={{
              position: 'absolute', bottom: -28, left: 16,
              width: 56, height: 56, borderRadius: '50%',
              border: '3px solid var(--surface)', cursor: 'pointer',
              background: avatarPreview ? `url(${avatarPreview}) center/cover` : 'var(--bg-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            }}
          >
            {!avatarPreview && <Icon name="image" size={16} color="var(--ink-3)" />}
          </div>
        </div>

        <span className="fld-label">Community name</span>
        <input className="fld" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Solar Street Team" style={{ marginBottom: 14 }} />
        <span className="fld-label">Focus area</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {COMMUNITY_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} className={'chip ' + (cat === c ? 'chip-green' : '')} style={{ cursor: 'pointer', border: cat === c ? 'none' : undefined }}>{c}</button>
          ))}
        </div>
        <span className="fld-label">Description <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></span>
        <textarea className="fld" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this community about?" rows={3} style={{ resize: 'none' }} />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleCreate} disabled={!name.trim() || loading} style={{ opacity: !name.trim() || loading ? .5 : 1 }}>
          {loading ? 'Creating…' : 'Create community'}
        </button>
      </ModalFoot>
    </Modal>
  );
}

// --- New collection ---
const COLLECTION_EMOJIS = ['🔖','📚','💡','🌱','⚡','🌍','🔬','🎯','🛠️','🌿','📋','🏗️'];

export function MNewCollection({ close }) {
  const app = useApp();
  const [name, setName] = React.useState('');
  const [emoji, setEmoji] = React.useState('🔖');
  const [loading, setLoading] = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await app.createColl(name.trim(), emoji);
      close();
      app.toast({ kind: 'success', msg: 'Collection created', sub: `"${name.trim()}" is ready for bookmarks.`, icon: 'bookmark' });
    } catch {
      app.toast({ msg: 'Could not create collection', kind: 'error', icon: 'close' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={440}>
      <ModalHead icon="bookmark" title="New collection" sub="Group your saved posts, articles and products." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <span className="fld-label">Emoji</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {COLLECTION_EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{ width: 36, height: 36, fontSize: 18, borderRadius: 8, border: emoji === e ? '2px solid var(--green)' : '2px solid var(--line)', background: emoji === e ? 'var(--green-tint)' : 'var(--surface)', cursor: 'pointer' }}>
              {e}
            </button>
          ))}
        </div>
        <span className="fld-label">Collection name</span>
        <input className="fld" autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="e.g. Weekend reading" />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={handleCreate} disabled={!name.trim() || loading} style={{ opacity: name.trim() && !loading ? 1 : .5 }}>
          {loading ? 'Creating…' : 'Create'}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Edit profile ---
export function MEditProfile({ close }) {
  const app = useApp();
  const userId = app.user?.id;

  const [fullName, setFullName] = React.useState(app.user?.name || '');
  const [bio, setBio] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [website, setWebsite] = React.useState('');

  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = React.useState<string | null>(null);
  const [currentCover, setCurrentCover] = React.useState<string | null>(null);
  const avatarRef = React.useRef<HTMLInputElement>(null);
  const coverRef = React.useRef<HTMLInputElement>(null);
  const [saving, setSaving] = React.useState(false);

  // Load current profile data
  React.useEffect(() => {
    if (!userId) return;
    import('@/lib/profile').then(({ getProfile }) => {
      getProfile(userId).then(p => {
        if (!p) return;
        setFullName(p.full_name || '');
        setBio(p.bio || '');
        setLocation(p.location || '');
        setWebsite(p.website || '');
        setCurrentAvatar(p.avatar_url || null);
        setCurrentCover(p.cover_url || null);
      }).catch(() => {});
    });
  }, [userId]);

  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { app.toast?.({ msg: 'Image too large', sub: 'Max 5 MB', kind: 'error', icon: 'bolt' }); return; }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const pickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { app.toast?.({ msg: 'Image too large', sub: 'Max 10 MB', kind: 'error', icon: 'bolt' }); return; }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { uploadFile } = await import('@/lib/storage');
      const { updateProfile } = await import('@/lib/profile');
      const updates: Record<string, any> = { full_name: fullName, bio, location, website };

      if (avatarFile) {
        updates.avatar_url = await uploadFile('avatars', userId, avatarFile);
        app.setState?.((s: any) => ({ ...s, user: { ...s.user, avatar: updates.avatar_url } }));
      }
      if (coverFile) {
        updates.cover_url = await uploadFile('covers', userId, coverFile);
      }

      await updateProfile(userId, updates);
      app.toast?.({ msg: 'Profile updated', kind: 'success', icon: 'check' });
      close();
      // Reload the page so profile reflects changes
      window.location.reload();
    } catch (err: any) {
      app.toast?.({ msg: 'Failed to save', sub: err.message, kind: 'error', icon: 'bolt' });
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = avatarPreview || currentAvatar;
  const coverSrc = coverPreview || currentCover;
  const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 13px', fontSize: 14, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none' };
  const lab: React.CSSProperties = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', display: 'block', marginBottom: 5 };

  return (
    <Modal onClose={close} width={560}>
      <ModalHead icon="edit" title="Edit profile" sub="Update how you appear across Honua." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>

        {/* Cover photo */}
        <div style={{ position: 'relative', marginBottom: 48 }}>
          <div style={{
            height: 110, borderRadius: 12, overflow: 'hidden', position: 'relative',
            background: coverSrc ? `url(${coverSrc}) center/cover` : 'linear-gradient(135deg,#1f6f3f,#2e9a5b)',
          }}>
            <button onClick={() => coverRef.current?.click()} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
              {coverSrc ? 'Change cover' : '+ Add cover'}
            </button>
            <input ref={coverRef} type="file" accept="image/*" onChange={pickCover} style={{ display: 'none' }} />
          </div>

          {/* Avatar — sits below cover, no longer clipped by overflow:hidden */}
          <div style={{ position: 'absolute', bottom: -36, left: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, border: '4px solid var(--surface)', overflow: 'hidden', background: 'var(--green)', position: 'relative', cursor: 'pointer' }} onClick={() => avatarRef.current?.click()}>
              {avatarSrc
                ? <img src={avatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 28, color: '#fff', fontFamily: 'Lora' }}>{fullName.charAt(0) || '?'}</div>
              }
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', opacity: 0, transition: 'opacity .15s' }} className="avatar-edit-overlay">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Fields */}
        <div className="edit-profile-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lab}>DISPLAY NAME</label>
            <input style={fld} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label style={lab}>LOCATION</label>
            <input style={fld} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lab}>BIO</label>
          <textarea style={{ ...fld, minHeight: 80, resize: 'vertical' }} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell your story…" />
        </div>
        <div style={{ marginBottom: 4 }}>
          <label style={lab}>WEBSITE</label>
          <input style={fld} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" />
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close} disabled={saving}>Cancel</button>
        <button className="btn btn-green" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Tip a user ---
export function MTip({ data, close }) {
  const app = useApp();
  const u = data.user || MOCK.users.sarah;
  const [amt, setAmt] = React.useState(5);
  return (
    <Modal onClose={close} width={440}>
      <ModalHead icon="gift" iconColor="var(--sun)" title={`Tip ${u.name}`} sub="Send Impact Tokens to support their work." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          {[5, 10, 25].map(a => (
            <button key={a} onClick={() => setAmt(a)} className={'opt-row ' + (amt === a ? 'sel' : '')} style={{ justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 600, fontFamily: 'Lora' }}>{a}</span>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>IT</span>
            </button>
          ))}
        </div>
        <input className="fld" type="number" value={amt} onChange={e => setAmt(Math.max(1, +e.target.value || 1))} />
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, fontFamily: 'JetBrains Mono' }}>Your balance: 24 IT</div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.openModal('celebrate', { title: `Tipped ${amt} IT`, sub: `${u.name} will be notified of your support. Thank you for backing real impact.` }); }}>Send {amt} IT</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Auto-offset subscribe ---
export function MAutoOffset({ close }) {
  const app = useApp();
  return (
    <Modal onClose={close} width={480}>
      <ModalHead icon="leaf" title="Start auto-offset" sub="We match your tracked footprint with verified credits, every month." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ background: 'var(--green-tint)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>$14<span style={{ fontSize: 16 }}>/mo</span></div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>≈ 0.7 t CO₂ retired monthly</div>
        </div>
        <div style={{ marginTop: 16 }}>
          {['Auto-purchase from your chosen project mix', 'Pause or cancel anytime', 'Quarterly receipts emailed to you', 'Counts toward your verified impact'].map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, padding: '6px 0', fontSize: 13.5, color: 'var(--ink-2)' }}><span style={{ color: 'var(--green)' }}><Icon name="check" size={15} stroke={2.2} /></span> {b}</div>
          ))}
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Not now</button>
        <button className="btn btn-green" onClick={() => { close(); app.toast({ kind: 'success', msg: 'Auto-offset active', sub: '$14/mo · first credit retires Jun 1. Manage in Settings.', icon: 'leaf' }); }}>Subscribe · $14/mo</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Offset my year ---
export function MOffsetYear({ close }) {
  const app = useApp();
  const year = new Date().getFullYear();
  const [credits, setCredits] = React.useState<any[] | null>(null);
  const [pickId, setPickId] = React.useState<string | null>(null);
  const [tonnes, setTonnes] = React.useState(1);
  const [buying, setBuying] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    import('@/lib/market')
      .then(({ getCarbonCredits }) => getCarbonCredits())
      .then(all => {
        if (cancelled) return;
        // Only credits with something left to retire, cheapest first
        const open = all.filter(c => c.volume_t > 0).sort((a, b) => a.price_cents - b.price_cents);
        setCredits(open);
        setPickId(open[0]?.id ?? null);
      })
      .catch(() => { if (!cancelled) setCredits([]); });
    return () => { cancelled = true; };
  }, []);

  const loading = credits === null;
  const pick = credits?.find(c => c.id === pickId) ?? null;
  const maxT = pick ? Math.max(1, Math.floor(pick.volume_t)) : 1;
  const qty = Math.min(tonnes, maxT);
  const unit = pick ? pick.price_cents / 100 : 0;
  const total = unit * qty;
  const signedIn = !!app.user?.id;

  const confirm = async () => {
    if (!pick || !signedIn) return;
    setBuying(true);
    try {
      const { purchaseCredit } = await import('@/lib/market');
      const ok = await purchaseCredit(app.user.id, { id: pick.id, name: pick.name }, qty, Math.round(total * 100));
      if (!ok) {
        app.toast?.({ msg: "Couldn't record that retirement", kind: 'error', icon: 'leaf' });
        return;
      }
      window.dispatchEvent(new Event('honua:offset-purchased'));
      close();
      app.openModal('celebrate', {
        title: `Offset ${qty} t CO₂`,
        sub: `You retired ${qty} tonne${qty === 1 ? '' : 's'} via ${pick.name} for $${total.toFixed(2)}. Certificate added to your wallet.`,
      });
    } finally { setBuying(false); }
  };

  return (
    <Modal onClose={close} width={480}>
      {/* The app logs CO₂ saved, never CO₂ emitted — so there is no footprint to
          estimate, and claiming one would be inventing it. The user picks instead. */}
      <ModalHead
        icon="globe"
        title={`Offset your ${year}`}
        sub="Honua tracks the CO₂ you save, not the CO₂ you emit — so choose how much you'd like to retire."
        onClose={close}
      />

      {loading ? (
        <div style={{ padding: '28px 24px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 14, borderRadius: 4, background: 'var(--line)', marginBottom: 12, width: `${[70, 90, 45][i - 1]}%` }} />
          ))}
        </div>
      ) : !pick ? (
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--green-tint)', color: 'var(--green)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
            <Icon name="leaf" size={20} stroke={2} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Nothing available to retire</div>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            Every listed credit is sold out right now. When new volume is listed it'll show up in the carbon market.
          </p>
        </div>
      ) : (
        <div style={{ padding: '18px 24px 0' }}>
          {/* Amount */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>Tonnes to retire</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn btn-ghost" style={stepBtn} disabled={qty <= 1} onClick={() => setTonnes(t => Math.max(1, t - 1))}>−</button>
              <span style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Lora', minWidth: 46, textAlign: 'center' }}>{qty} t</span>
              <button className="btn btn-ghost" style={stepBtn} disabled={qty >= maxT} onClick={() => setTonnes(t => Math.min(maxT, t + 1))}>+</button>
            </div>
          </div>
          {qty >= maxT && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'right', marginTop: 4 }}>
              All {maxT} t available from this credit
            </div>
          )}

          {/* Which credit it retires against */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', marginBottom: 8 }}>RETIRE AGAINST</div>
            {credits.map(c => (
              <button
                key={c.id}
                onClick={() => { setPickId(c.id); setTonnes(1); }}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 10, marginBottom: 6, background: 'var(--surface)',
                  border: `1px solid ${c.id === pickId ? 'var(--green)' : 'var(--line)'}`,
                }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${c.id === pickId ? 'var(--green)' : 'var(--line)'}`,
                  background: c.id === pickId ? 'var(--green)' : 'transparent',
                }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)' }}>
                    {[c.type, c.region].filter(Boolean).join(' · ') || 'Verified credit'} · {Math.floor(c.volume_t).toLocaleString()} t left
                  </span>
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600 }}>{c.price}</span>
              </button>
            ))}
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--line)', marginTop: 6, fontSize: 14 }}>
            <span style={{ color: 'var(--ink-3)' }}>{qty} t × ${unit.toFixed(2)}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>${total.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--line)', fontSize: 16, fontWeight: 600 }}>
            <span>Total</span><span style={{ fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>${total.toFixed(2)}</span>
          </div>
        </div>
      )}

      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>{pick ? 'Cancel' : 'Close'}</button>
        {pick && (
          <button className="btn btn-green" disabled={buying || !signedIn} onClick={confirm}>
            {buying ? 'Retiring…' : !signedIn ? 'Sign in to offset' : `Offset ${qty} t · $${total.toFixed(2)}`}
          </button>
        )}
      </ModalFoot>
    </Modal>
  );
};

const stepBtn: React.CSSProperties = {
  width: 32, height: 32, padding: 0, justifyContent: 'center', fontSize: 17, lineHeight: 1,
};

// --- Delete account (two-step) ---
export function MDeleteAccount({ close }) {
  const app = useApp();
  return (
    <Modal onClose={close} width={460}>
      <ModalHead icon="trash" iconColor="var(--clay)" title="Delete your account?" sub="This is permanent. Your posts, impact ledger, wallet balance and verified history will be erased." onClose={close} />
      <div style={{ padding: '6px 24px 0' }}>
        <div style={{ background: '#fbeae4', border: '1px solid #eccbbd', borderRadius: 12, padding: 14, fontSize: 13, color: '#8a3d1f' }}>
          You have <strong>24 IT</strong> and <strong>1,240 GP</strong> in your wallet. These cannot be recovered after deletion.
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Keep my account</button>
        <button className="btn" style={{ background: 'var(--clay)', color: '#fff' }} onClick={() => app.openModal('deleteaccount2')}>Yes, delete my account</button>
      </ModalFoot>
    </Modal>
  );
};

export function MDeleteAccount2({ close }) {
  const app = useApp();
  const [v, setV] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const ok = v.trim().toLowerCase() === 'delete my account';

  const handleDelete = async () => {
    if (!ok) return;
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      // Refresh to ensure we have a non-expired token
      const { data: refreshData } = await supabase.auth.refreshSession();
      const session = refreshData.session ?? (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error('Not signed in');
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Deletion failed');
      }
      close();
      app.toast({ kind: 'success', msg: 'Account deleted', sub: 'Your account and all data have been permanently removed.', icon: 'trash', duration: 6000 });
      await app.logout?.();
    } catch (err: any) {
      app.toast({ kind: 'error', msg: 'Could not delete account', sub: err.message, icon: 'bolt' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={close} width={460}>
      <ModalHead icon="trash" iconColor="var(--clay)" title="Final confirmation" sub="To confirm, type 'delete my account' in the field below." onClose={close} />
      <div style={{ padding: "18px 24px 0" }}>
        <input className="fld" autoFocus value={v} onChange={e => setV(e.target.value)} placeholder="delete my account" style={{ borderColor: ok ? "var(--clay)" : undefined }} />
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close} disabled={loading}>Cancel</button>
        <button className="btn" disabled={!ok || loading} style={{ background: ok ? "var(--clay)" : "var(--line-2)", color: "#fff", opacity: (ok && !loading) ? 1 : .7, cursor: (ok && !loading) ? "pointer" : "not-allowed" }} onClick={handleDelete}>
          {loading ? "Deleting…" : "Delete forever"}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// =============== Dispatcher ===============
export function ModalContent({ type, data, close }) {
  const map = {
    compose: data?.communityId ? MCommunityCompose : MCompose, logaction: MLogAction, export: MExport, startproject: MStartProject,
    createchallenge: MCreateChallenge, createcommunity: MCreateCommunity, editcommunity: MEditCommunity, newcollection: MNewCollection, editprofile: MEditProfile,
    tip: MTip, autooffset: MAutoOffset, offsetyear: MOffsetYear,
    deleteaccount: MDeleteAccount, deleteaccount2: MDeleteAccount2,
    project: MProject, article: MArticle, product: MProduct, credit: MCredit,
    challenge: MChallenge, discussion: MDiscussion, badge: MBadge, celebrate: MCelebrate,
    wallet: MWallet, list: MList, communityabout: MCommunityAbout,
  };
  const C = map[type];
  if (!C) return null;
  return <C data={data} close={close} />;
};


export function ModalRoot() {
  const { modal, closeModal } = useApp();
  if (!modal) return null;
  return <ModalContent type={modal.type} data={modal.data || {}} close={closeModal} />;
}
