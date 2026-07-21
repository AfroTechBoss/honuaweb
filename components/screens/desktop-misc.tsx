"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { getNotifications, markAllRead } from "@/lib/notifications";


// =============== Desktop Marketplace ===============
export function DesktopMarketplace({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="marketplace" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <div className="page-header-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>MARKETPLACE</div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em' }}>Sustainable goods, vouched by humans.</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>Every product carries an impact label and a real review from someone on Honua.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => onNav?.('sell')} style={{ color: 'var(--green)', borderColor: 'var(--green-3)' }}><Icon name="bag" size={14} /> Sell on Honua</button>
            <button className="btn btn-ghost" onClick={() => app.openModal?.('list', { title: 'Your wishlist', icon: 'bookmark', sub: (app.state.wishlist.length || 'No') + ' saved items', items: app.state.wishlist.length ? app.state.wishlist.map(n => ({ icon: 'bag', title: n, sub: 'tap a product to add to cart' })) : [{ icon: 'bookmark', title: 'Nothing saved yet', sub: 'tap the bookmark on any product' }] })}><Icon name="bookmark" size={14} /> Wishlist</button>
            <button className="btn btn-primary" onClick={() => app.openModal?.('list', { title: 'Your cart', icon: 'cart', sub: app.cartCount + ' item' + (app.cartCount === 1 ? '' : 's'), items: app.cart.length ? app.cart.map(c => ({ icon: 'bag', title: c.name, right: c.price })) : [{ icon: 'cart', title: 'Cart is empty' }] })}><Icon name="bag" size={14} /> Cart · {app.cartCount}</button>
          </div>
        </div>

        {/* Feature banner */}
        <div className="feature-banner" style={{
          background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--line)',
          overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.3fr 1fr', marginBottom: 24,
        }}>
          <div style={{ padding: 28 }}>
            <span className="chip chip-green">Featured drop · 24h</span>
            <h2 className="font-display" style={{ margin: '12px 0 8px', fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>The repair kit. 92 tools, one foldable case.</h2>
            <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6 }}>By the Fix-it Collective. Every purchase funds a community repair café for a month.</p>
            <div style={{ display: 'flex', gap: 14, marginTop: 18, alignItems: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Lora' }}>$84</span>
              <span style={{ fontSize: 14, color: 'var(--ink-3)', textDecoration: 'line-through' }}>$120</span>
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { app.addToCart({ name: 'The repair kit', price: '$84' }); app.toast?.({ msg: 'Added to cart', sub: 'The repair kit · $84', kind: 'success', icon: 'cart' }); }}>Add to cart</button>
            </div>
          </div>
          <ImagePlaceholder label="repair kit hero — folded leather case open with tools" height={280} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <MarketFilters />
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="chip">Made in EU</span>
            <span className="chip">Carbon-neg</span>
            <span className="chip">Repairable</span>
            <span className="chip">+ filter</span>
          </div>
        </div>

        {/* Product grid */}
        <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {MOCK.products.map((p, i) => {
            const wished = app.wishlist?.has(p.name);
            return (
            <div key={i} className="post-card" onClick={() => app.openModal?.('product', p)} style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ position: 'relative' }}>
                <ImagePlaceholder label={p.img} height={200} src={p.imgUrl} />
                <span className="chip chip-green" style={{ position: 'absolute', top: 10, left: 10 }}>{p.tag}</span>
                <button onClick={(e) => { e.stopPropagation(); app.wishlist.toggle(p.name); app.toast?.(wished ? { msg: 'Removed from wishlist', icon: 'bookmark' } : { msg: 'Saved to wishlist', kind: 'success', icon: 'bookmark' }); }} style={{
                  position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--surface)', border: '1px solid var(--line)', cursor: 'pointer',
                  display: 'grid', placeItems: 'center', color: wished ? 'var(--green)' : 'var(--ink-3)',
                }}><Icon name="bookmark" size={14} stroke={wished ? 2.4 : 1.75} /></button>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{p.brand.toUpperCase()}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'Lora' }}>{p.price}</span>
                  <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); app.addToCart({ name: p.name, price: p.price }); app.toast?.({ msg: 'Added to cart', sub: p.name, kind: 'success', icon: 'cart' }); }} style={{ padding: '5px 11px', fontSize: 12 }}>Add</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, fontFamily: 'JetBrains Mono' }}>★★★★★ 4.{7 + i % 3} · {120 + i * 14} reviews</div>
              </div>
            </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export function MarketFilters() {
  const [active, setActive] = React.useState('All');
  return (
    <div className="pill-nav">
      {['All', 'Home', 'Food', 'Style', 'Energy', 'Outdoors', 'Books'].map((t) => (
        <button key={t} className={active === t ? 'active' : ''} onClick={() => setActive(t)}>{t}</button>
      ))}
    </div>
  );
};

// =============== Desktop Messages ===============
function msgTimeAgo(ts: string) {
  const normalized = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
  const s = Math.floor((Date.now() - new Date(normalized).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 4, alignItems: 'center' }}>
        {[0, 150, 300].map(delay => (
          <span key={delay} style={{
            width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-3)',
            display: 'inline-block',
            animation: 'typingBounce 1s ease-in-out infinite',
            animationDelay: `${delay}ms`,
          }} />
        ))}
      </div>
    </div>
  );
}

export function DesktopMessages({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [tab, setTab] = React.useState<'inbox' | 'requests'>('inbox');
  const [convos, setConvos] = React.useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [otherTyping, setOtherTyping] = React.useState(false);
  const [newMsgHandle, setNewMsgHandle] = React.useState('');
  const [showNewMsg, setShowNewMsg] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [tick, setTick] = React.useState(0);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<any>(null);
  const typingChannelRef = React.useRef<any>(null);
  const realtimeChannelRef = React.useRef<any>(null);

  const userId = app.user?.id;

  // Tick every 30s to keep timestamps accurate
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-open DM when navigated from a profile's Message button
  React.useEffect(() => {
    const handle = params?.handle as string | undefined;
    if (!handle || !userId) return;
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: target } = await supabase.from('profiles').select('id').eq('handle', handle).single();
      if (!target) return;

      // Check for existing conversation in either direction (two separate queries — nested AND in .or() is unsupported)
      const [{ data: e1 }, { data: e2 }] = await Promise.all([
        supabase.from('conversations').select('id').eq('user1_id', userId).eq('user2_id', target.id).maybeSingle(),
        supabase.from('conversations').select('id').eq('user1_id', target.id).eq('user2_id', userId).maybeSingle(),
      ]);
      const existing = e1 ?? e2;
      if (existing) { await loadConvos(); setActiveConvoId(existing.id); return; }

      // Check mutual follow — ignore errors (follows table 400 just means not following)
      const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
        supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', target.id).maybeSingle(),
        supabase.from('follows').select('id').eq('follower_id', target.id).eq('following_id', userId).maybeSingle(),
      ]);
      const mutual = !!iFollow && !!theyFollow;

      const { data: newConvo, error: insertErr } = await supabase.from('conversations').insert({
        user1_id: userId, user2_id: target.id, status: mutual ? 'accepted' : 'pending',
      }).select('*, user1_profile:profiles!user1_id(id,handle,full_name,avatar_url,verified), user2_profile:profiles!user2_id(id,handle,full_name,avatar_url,verified)').single();
      if (insertErr) {
        // If duplicate (race condition), just find and open the existing one
        if (insertErr.code === '23505') {
          const [{ data: r1 }, { data: r2 }] = await Promise.all([
            supabase.from('conversations').select('id').eq('user1_id', userId).eq('user2_id', target.id).maybeSingle(),
            supabase.from('conversations').select('id').eq('user1_id', target.id).eq('user2_id', userId).maybeSingle(),
          ]);
          const found = r1 ?? r2;
          if (found) { await loadConvos(); setActiveConvoId(found.id); }
        } else {
          console.error('Failed to create conversation:', insertErr);
        }
        return;
      }
      if (newConvo) {
        setConvos(prev => [{ ...newConvo, last_msg: null }, ...prev]);
        setActiveConvoId(newConvo.id);
      }
    })();
  }, [params?.handle, userId]);

  const activeConvo = convos.find(c => c.id === activeConvoId);
  const otherUser = activeConvo
    ? (activeConvo.user1_id === userId ? activeConvo.user2_profile : activeConvo.user1_profile)
    : null;
  const isAccepted = activeConvo?.status === 'accepted';
  const iAmRecipient = activeConvo && activeConvo.user1_id !== userId;
  // I can send if: accepted OR I am the original sender (first message already sent)
  const canReply = isAccepted || (activeConvo && activeConvo.user1_id === userId) || (activeConvo && activeConvo.user2_id === userId && activeConvo.status === 'pending' && messages[0]?.sender_id === userId);

  // Load conversations
  const loadConvos = React.useCallback(async () => {
    if (!userId) return;
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        user1_profile:profiles!user1_id(id, handle, full_name, avatar_url, verified),
        user2_profile:profiles!user2_id(id, handle, full_name, avatar_url, verified),
        last_msg:messages(content, created_at, sender_id)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    // Attach last message properly (supabase returns array, take first)
    const enriched = (data ?? []).map((c: any) => ({
      ...c,
      last_msg: Array.isArray(c.last_msg) ? c.last_msg[c.last_msg.length - 1] : c.last_msg,
    }));
    setConvos(enriched);
  }, [userId]);

  React.useEffect(() => { loadConvos(); }, [loadConvos]);

  // Realtime: listen for new/updated conversations (two channels — one per filter)
  React.useEffect(() => {
    if (!userId) return;
    let ch1: any, ch2: any;
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      const rid = Math.random().toString(36).slice(2);
      ch1 = supabase.channel(`convos-u1-${userId}-${rid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `user1_id=eq.${userId}` }, loadConvos)
        .subscribe();
      ch2 = supabase.channel(`convos-u2-${userId}-${rid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `user2_id=eq.${userId}` }, loadConvos)
        .subscribe();
    })();
    return () => { ch1?.unsubscribe(); ch2?.unsubscribe(); };
  }, [userId, loadConvos]);

  // Load messages for active conversation
  const convosRef = React.useRef<any[]>([]);
  convosRef.current = convos;

  const loadMessages = React.useCallback(async (convoId: string) => {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    // Mark unseen messages as seen (only if convo is accepted)
    const convo = convosRef.current.find(c => c.id === convoId);
    if (convo?.status === 'accepted') {
      const unseen = (data ?? []).filter((m: any) => !m.seen_at && m.sender_id !== userId);
      if (unseen.length) {
        await supabase.from('messages').update({ seen_at: new Date().toISOString() })
          .in('id', unseen.map((m: any) => m.id));
      }
    }
  }, [userId]);

  React.useEffect(() => {
    if (!activeConvoId) return;
    loadMessages(activeConvoId);
  }, [activeConvoId, loadMessages]);

  // Realtime: messages in active conversation
  React.useEffect(() => {
    if (!activeConvoId || !userId) return;
    let ch: any;
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      ch = supabase.channel(`msgs-${activeConvoId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvoId}` }, async (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            // Replace any optimistic message from the same sender with matching content
            const optIdx = prev.findIndex(m => m.id.startsWith('opt-') && m.sender_id === newMsg.sender_id && m.content === newMsg.content);
            if (optIdx !== -1) {
              const updated = [...prev];
              updated[optIdx] = { ...newMsg, created_at: prev[optIdx].created_at };
              return updated;
            }
            return [...prev, newMsg];
          });
          // Auto-mark as seen if from other party and convo is accepted
          if (newMsg.sender_id !== userId) {
            const { supabase: sb } = await import('@/lib/supabase');
            const convo = convos.find(c => c.id === activeConvoId);
            if (convo?.status === 'accepted') {
              await sb.from('messages').update({ seen_at: new Date().toISOString() }).eq('id', newMsg.id);
            }
          }
          loadConvos();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvoId}` }, (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        })
        .subscribe();
      realtimeChannelRef.current = ch;
    })();
    return () => { ch?.unsubscribe(); };
  }, [activeConvoId, userId]);

  // Typing indicator via Realtime broadcast
  React.useEffect(() => {
    if (!activeConvoId || !userId) return;
    let ch: any;
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      ch = supabase.channel(`typing-${activeConvoId}`)
        .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
          if (payload.user_id !== userId) {
            setOtherTyping(true);
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2500);
          }
        })
        .subscribe();
      typingChannelRef.current = ch;
    })();
    return () => { ch?.unsubscribe(); setOtherTyping(false); };
  }, [activeConvoId, userId]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  const broadcastTyping = () => {
    typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId } });
  };

  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
    broadcastTyping();
  };

  const send = async () => {
    if (!draft.trim() || !activeConvoId || !userId || sending) return;
    setSending(true);
    const content = draft.trim();
    setDraft('');
    const optimisticId = `opt-${Date.now()}`;
    setMessages(prev => [...prev, { id: optimisticId, conversation_id: activeConvoId, sender_id: userId, content, seen_at: null, created_at: new Date().toISOString() }]);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: inserted } = await supabase.from('messages').insert({ conversation_id: activeConvoId, sender_id: userId, content }).select().single();
      // Replace the optimistic message with the real one
      if (inserted) setMessages(prev => prev.map(m => m.id === optimisticId ? { ...inserted, created_at: m.created_at } : m));
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeConvoId);
      // Notify the recipient
      const recipientId = activeConvo?.user1_id === userId ? activeConvo?.user2_id : activeConvo?.user1_id;
      if (recipientId && recipientId !== userId) {
        const { createNotification } = await import('@/lib/notifications');
        await createNotification({ userId: recipientId, actorId: userId, type: 'message' as any, body: 'sent you a message' });
      }
    } finally {
      setSending(false);
    }
  };

  const acceptRequest = async () => {
    if (!activeConvoId || !userId) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('conversations').update({ status: 'accepted', accepted_by: userId }).eq('id', activeConvoId);
    // Mark all messages seen now
    await supabase.from('messages').update({ seen_at: new Date().toISOString() })
      .eq('conversation_id', activeConvoId).neq('sender_id', userId).is('seen_at', null);
    await loadConvos();
    await loadMessages(activeConvoId);
  };

  const deleteConvo = async () => {
    if (!activeConvoId) return;
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('conversations').delete().eq('id', activeConvoId);
    setActiveConvoId(null);
    loadConvos();
  };

  // Start a new DM from a handle
  const startNewDM = async () => {
    if (!newMsgHandle.trim() || !userId) return;
    const { supabase } = await import('@/lib/supabase');
    const { data: target } = await supabase.from('profiles').select('id, handle, full_name, avatar_url').eq('handle', newMsgHandle.trim().replace('@', '')).single();
    if (!target) { app.toast?.({ msg: 'User not found', icon: 'close' }); return; }
    // Check for existing convo
    const { data: existing } = await supabase.from('conversations').select('id')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${target.id}),and(user1_id.eq.${target.id},user2_id.eq.${userId})`)
      .maybeSingle();
    if (existing) { setActiveConvoId(existing.id); setShowNewMsg(false); setNewMsgHandle(''); return; }
    // Check mutual follow
    const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
      supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', target.id).maybeSingle(),
      supabase.from('follows').select('id').eq('follower_id', target.id).eq('following_id', userId).maybeSingle(),
    ]);
    const mutual = !!iFollow && !!theyFollow;
    const { data: newConvo } = await supabase.from('conversations').insert({
      user1_id: userId, user2_id: target.id, status: mutual ? 'accepted' : 'pending',
    }).select().single();
    if (newConvo) { setActiveConvoId(newConvo.id); loadConvos(); }
    setShowNewMsg(false); setNewMsgHandle('');
  };

  const inboxConvos = convos.filter(c => c.status === 'accepted' || (c.status === 'pending' && c.user1_id === userId));
  const requestConvos = convos.filter(c => c.status === 'pending' && c.user2_id === userId);
  const displayConvos = tab === 'inbox' ? inboxConvos : requestConvos;
  const filtered = searchQuery
    ? displayConvos.filter(c => {
        const other = c.user1_id === userId ? c.user2_profile : c.user1_profile;
        return other?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || other?.handle?.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : displayConvos;

  const requestCount = requestConvos.length;

  // Group messages by day
  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; msgs: any[] }[] = [];
    messages.forEach(m => {
      const d = new Date(m.created_at.endsWith('Z') || m.created_at.includes('+') ? m.created_at : m.created_at + 'Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const last = groups[groups.length - 1];
      if (last?.date === d) last.msgs.push(m);
      else groups.push({ date: d, msgs: [m] });
    });
    return groups;
  }, [messages]);

  const lastMsg = messages[messages.length - 1];
  const showSeen = isAccepted && lastMsg?.sender_id === userId && !!lastMsg?.seen_at;

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .msg-time-hover { opacity: 0; max-height: 0; overflow: hidden; transition: opacity 0.15s, max-height 0.15s; }
        .msg-row:hover .msg-time-hover { opacity: 1; max-height: 20px; }
      `}</style>
      <DesktopSidebar active="messages" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* Left panel — conversation list */}
        <div style={{ width: 340, borderRight: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }} className="msg-list-col">
          <div style={{ padding: '24px 20px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h1 className="font-display" style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>Messages</h1>
              <button onClick={() => setShowNewMsg(true)} style={{ background: 'var(--green)', border: 'none', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600 }}>
                <Icon name="plus" size={14} /> New
              </button>
            </div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 999, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Icon name="search" size={14} color="var(--ink-3)" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search messages" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }} />
            </div>
            {/* Inbox / Requests tabs */}
            <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
              {(['inbox', 'requests'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t ? 'var(--green)' : 'transparent', color: tab === t ? '#fff' : 'var(--ink-3)', position: 'relative' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === 'requests' && requestCount > 0 && (
                    <span style={{ position: 'absolute', top: 3, right: 8, background: 'var(--clay)', color: '#fff', borderRadius: 999, fontSize: 9, padding: '1px 5px', fontFamily: 'JetBrains Mono' }}>{requestCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }} className="no-scrollbar">
            {filtered.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                {tab === 'inbox' ? 'No conversations yet.' : 'No message requests.'}
              </div>
            )}
            {filtered.map(c => {
              const other = c.user1_id === userId ? c.user2_profile : c.user1_profile;
              const last = c.last_msg;
              const isActive = c.id === activeConvoId;
              const unread = false; // TODO: track unread per convo
              return (
                <div key={c.id} onClick={() => setActiveConvoId(c.id)} className="row-hover" style={{ padding: '12px 20px', display: 'flex', gap: 12, cursor: 'pointer', background: isActive ? 'var(--green-tint)' : 'transparent', borderLeft: isActive ? '3px solid var(--green)' : '3px solid transparent' }}>
                  <Avatar src={other?.avatar_url} name={other?.full_name} size={44} verified={other?.verified} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{other?.full_name}</span>
                      <span style={{ color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>{last?.created_at ? msgTimeAgo(last.created_at) : ''}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {last ? (last.sender_id === userId ? `You: ${last.content}` : last.content) : 'No messages yet'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel — chat */}
        {!activeConvoId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
            <Icon name="msg" size={40} />
            <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: 'var(--ink-2)' }}>Your messages</div>
            <p style={{ fontSize: 14, marginTop: 6, textAlign: 'center', maxWidth: 280 }}>Select a conversation or start a new one.</p>
            <button onClick={() => setShowNewMsg(true)} className="btn btn-primary" style={{ marginTop: 16 }}>New message</button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }} className="msg-detail-col">
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span style={{ cursor: 'pointer' }} onClick={() => onNav?.('profile', { handle: otherUser?.handle })}>
                <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name} size={40} verified={otherUser?.verified} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{otherUser?.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{otherUser?.handle}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 13 }} onClick={() => onNav?.('profile', { handle: otherUser?.handle })}>Profile</button>
              <button onClick={deleteConvo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 6 }} title="Delete conversation">
                <Icon name="trash" size={15} />
              </button>
            </div>

            {/* Request banner — shown to recipient of a pending request */}
            {!isAccepted && iAmRecipient && (
              <div style={{ padding: '14px 24px', background: 'var(--sun-tint, #fffbeb)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon name="bell" size={16} color="var(--sun, #f59e0b)" />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
                  <strong>{otherUser?.full_name}</strong> wants to message you. Accept to reply and let them know you've seen their messages.
                </div>
                <button onClick={acceptRequest} className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>Accept</button>
                <button onClick={deleteConvo} className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 13 }}>Decline</button>
              </div>
            )}

            {/* Pending sender notice */}
            {!isAccepted && !iAmRecipient && (
              <div style={{ padding: '10px 24px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
                Your message request is pending. Read receipts will show once they accept.
              </div>
            )}

            {/* Messages area */}
            <div style={{ flex: 1, padding: '20px 24px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }} className="no-scrollbar">
              {(() => {
                const allMsgs = groupedMessages.flatMap(g => g.msgs);
                const lastId = allMsgs[allMsgs.length - 1]?.id;
                return groupedMessages.map(({ date, msgs }) => (
                  <React.Fragment key={date}>
                    <DayLabel l={date} />
                    {msgs.map(m => {
                      const isMe = m.sender_id === userId;
                      const isLast = m.id === lastId;
                      return (
                        <div key={m.id} className="msg-row" style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
                          <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                            <div style={{
                              background: isMe ? 'var(--green)' : 'var(--surface)',
                              color: isMe ? '#fff' : 'var(--ink)',
                              border: isMe ? 'none' : '1px solid var(--line)',
                              padding: '10px 14px',
                              borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>{m.content}</div>
                            <div className={isLast ? '' : 'msg-time-hover'} style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                              {msgTimeAgo(m.created_at)}
                              {isMe && isAccepted && m.seen_at && ' · Seen'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ));
              })()}
              {otherTyping && <TypingBubble />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: 16, background: 'var(--surface)', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              {(!isAccepted && iAmRecipient) ? (
                <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', padding: '10px 0' }}>
                  Accept the request to reply.
                </div>
              ) : (
                <>
                  <input
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={`Message ${otherUser?.full_name ?? ''}…`}
                    style={{ flex: 1, background: 'var(--bg-2)', border: 'none', outline: 'none', padding: '11px 14px', borderRadius: 999, fontSize: 14, fontFamily: 'inherit' }}
                    disabled={sending}
                  />
                  <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={send} disabled={!draft.trim() || sending}>Send</button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New message modal */}
      {showNewMsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNewMsg(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, width: 400, maxWidth: '92vw', boxShadow: '0 16px 48px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>New message</div>
            <input
              value={newMsgHandle}
              onChange={e => setNewMsgHandle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') startNewDM(); }}
              placeholder="Enter @handle or username"
              autoFocus
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowNewMsg(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--ink-2)' }}>Cancel</button>
              <button onClick={startNewDM} disabled={!newMsgHandle.trim()} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'var(--green)', cursor: newMsgHandle.trim() ? 'pointer' : 'not-allowed', fontSize: 14, color: '#fff', fontWeight: 600, opacity: newMsgHandle.trim() ? 1 : 0.6 }}>Open chat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function DayLabel({ l }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 12px', color: 'var(--ink-4)' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', letterSpacing: '.05em' }}>{l.toUpperCase()}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
};

export function Msg({ from, children, attach }: { from: string; children: React.ReactNode; attach?: string }) {
  const me = from === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '70%',
        background: me ? 'var(--green)' : 'var(--surface)',
        color: me ? '#fff' : 'var(--ink)',
        border: me ? 'none' : '1px solid var(--line)',
        padding: '10px 14px',
        borderRadius: me ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        fontSize: 14, lineHeight: 1.5,
      }}>
        {attach && (
          <div style={{
            background: me ? 'rgba(255,255,255,.15)' : 'var(--bg-2)',
            padding: '8px 10px', borderRadius: 8, marginBottom: 8,
            fontSize: 12, fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {attach}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

// =============== Desktop Notifications ===============
const NOTIF_ICON: Record<string, string> = { like: 'heart', follow: 'user', comment: 'comment', reply: 'comment', community_invite: 'users', badge: 'award', level_up: 'award', verified: 'leaf', milestone: 'flame', project: 'pin' };
const NOTIF_COLOR: Record<string, string> = { like: 'var(--clay)', follow: 'var(--sky)', comment: 'var(--ink-2)', reply: 'var(--ink-2)', community_invite: 'var(--sky)', badge: 'var(--green)', level_up: 'var(--green)', verified: 'var(--green)', milestone: 'var(--sun)', project: 'var(--green-2)' };

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function DesktopNotifications({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('All');

  React.useEffect(() => {
    if (!app.user?.id) { setLoading(false); return; }
    getNotifications(app.user.id).then(data => { setItems(data); setLoading(false); });
  }, [app.user?.id, app.unreadNotifs]);

  // Mark all as read when leaving the page
  React.useEffect(() => {
    const userId = app.user?.id;
    if (!userId) return;
    return () => {
      markAllRead(userId);
      app.markAllNotifsRead?.();
    };
  }, [app.user?.id]);

  const handleMarkAllRead = async () => {
    if (!app.user?.id) return;
    await markAllRead(app.user.id);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    app.markAllNotifsRead?.();
    app.toast?.({ msg: 'All caught up', sub: 'Marked all notifications as read.', icon: 'check' });
  };

  const handleClick = (n: any) => {
    // Mark this one read locally
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    switch (n.type) {
      case 'like': case 'comment': case 'reply': return n.post_id && onNav?.('post', { id: n.post_id });
      case 'follow': return n.actor?.handle && onNav?.('profile', { handle: n.actor.handle });
      case 'community_invite': return onNav?.('forum');
      case 'badge': case 'level_up': return onNav?.('profile');
      default: return null;
    }
  };

  const TAB_TYPES: Record<string, string[]> = {
    'All': [],
    'Likes': ['like'],
    'Comments': ['comment', 'reply'],
    'Follows': ['follow'],
    'Community': ['community_invite'],
    'Badges': ['badge', 'level_up'],
  };

  const filtered = tab === 'All' ? items : items.filter(n => TAB_TYPES[tab]?.includes(n.type));
  const unread = items.filter(n => !n.read).length;

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="notifications" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto', maxWidth: 760 }} className="no-scrollbar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="font-display" style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>Notifications</h1>
              {unread > 0 && <span style={{ background: 'var(--clay)', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>{unread}</span>}
            </div>
            {unread > 0 && <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={handleMarkAllRead}>Mark all read</button>}
          </div>
          {/* Tab filters */}
          <div className="pill-nav" style={{ marginBottom: 18 }}>
            {Object.keys(TAB_TYPES).map(t => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ width: '60%', height: 13, borderRadius: 6, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                    <div style={{ width: '35%', height: 11, borderRadius: 6, background: 'var(--line)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--ink-3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>No notifications yet</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>When someone likes, comments, or follows you, it shows up here.</div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              {filtered.map((n, i) => {
                const icon = NOTIF_ICON[n.type] || 'bell';
                const col = NOTIF_COLOR[n.type] || 'var(--ink-3)';
                return (
                  <div key={n.id} className="row-hover" onClick={() => handleClick(n)} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
                    borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--line)',
                    background: !n.read ? 'var(--green-tint)' : 'transparent',
                    cursor: 'pointer',
                  }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {n.actor?.avatar_url
                        ? <img src={n.actor.avatar_url} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 10, background: col + '22', color: col, display: 'grid', placeItems: 'center' }}>
                            <Icon name={icon} size={16} stroke={2} />
                          </div>
                      }
                      {n.actor?.avatar_url && (
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: col + '22', color: col, display: 'grid', placeItems: 'center', border: '2px solid var(--surface)' }}>
                          <Icon name={icon} size={8} stroke={2.5} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                        {n.actor && <strong style={{ color: 'var(--ink)' }}>{n.actor.full_name || `@${n.actor.handle}`} </strong>}
                        {n.body}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{timeAgo(n.created_at)} ago</div>
                    </div>
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', marginTop: 14, flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ width: 320, padding: 24, overflow: 'auto' }} className="no-scrollbar right-panel">
          <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 18 }}>
            <h3 className="font-display" style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Notification preferences</h3>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--ink-3)' }}>Stay focused on what matters.</p>
            <NotifPrefs />
          </div>
        </div>
      </main>
    </div>
  );
};

export function NotifTabs() {
  const [t, setT] = React.useState('All');
  return (
    <div className="pill-nav" style={{ marginBottom: 18 }}>
      {['All', 'Mentions', 'Verified impact', 'Projects', 'Community'].map(x => (
        <button key={x} className={t === x ? 'active' : ''} onClick={() => setT(x)}>{x}</button>
      ))}
    </div>
  );
};

export function NotifPrefs() {
  const [prefs, setPrefs] = React.useState({ 'Verified impact': true, 'Mentions & replies': true, 'New followers': true, 'Project invites': false, 'Daily digest': true });
  return (
    <>
      {Object.keys(prefs).map(l => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: 13 }}>{l}</span>
          <ToggleC on={prefs[l]} onChange={(v) => setPrefs(p => ({ ...p, [l]: v }))} />
        </div>
      ))}
    </>
  );
};

export function Toggle({ on }) {
  return (
    <span style={{
      width: 34, height: 20, borderRadius: 999, padding: 2,
      background: on ? 'var(--green)' : 'var(--line-2)',
      display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
      justifyContent: on ? 'flex-end' : 'flex-start',
      transition: 'background .15s',
    }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
    </span>
  );
};

// ====================================================================
// Content / detail modals  (referenced by ModalContent in desktop-rest)
// ====================================================================
export function QtyStepper({ value, set, min = 1, max = 99, suffix }: { value: number; set: React.Dispatch<React.SetStateAction<number>>; min?: number; max?: number; suffix?: string | number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
      <button onClick={() => set(Math.max(min, value - 1))} style={{ width: 36, height: 38, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', color: 'var(--ink-2)', display: 'grid', placeItems: 'center' }}><Icon name="minus" size={15} /></button>
      <span style={{ minWidth: 56, textAlign: 'center', fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 14 }}>{value}{suffix}</span>
      <button onClick={() => set(Math.min(max, value + 1))} style={{ width: 36, height: 38, border: 'none', background: 'var(--bg-2)', cursor: 'pointer', color: 'var(--ink-2)', display: 'grid', placeItems: 'center' }}><Icon name="plus" size={15} /></button>
    </div>
  );
};

export function ModalFoot({ children }) {
  return <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '18px 24px 22px', borderTop: '1px solid var(--line)', marginTop: 20 }}>{children}</div>;
};

export function Confetti() {
  const cols = ['#1f6f3f', '#2e9a5b', '#e6b450', '#1d6dc4', '#c4623a', '#c8e6cf'];
  return (
    <div className="confetti" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 20 }}>
      {Array.from({ length: 28 }).map((_, i) => (
        <i key={i} style={{ left: Math.random() * 100 + '%', background: cols[i % cols.length], animationDelay: (Math.random() * .5) + 's', transform: `rotate(${Math.random() * 360}deg)` }} />
      ))}
    </div>
  );
};

// --- Project detail (action map) ---
export function MProject({ data, close }) {
  const app = useApp();
  const going = app.community?.has('proj-' + data.id);
  return (
    <Modal onClose={close} width={560}>
      <div style={{ height: 180, position: 'relative', background: (data.color || 'var(--green)') }}>
        <ImagePlaceholder label={`${data.cat} project photo`} height={180} />
        <button onClick={close} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="close" size={16} /></button>
        <span className="chip chip-green" style={{ position: 'absolute', bottom: 14, left: 16 }}>{data.cat}</span>
      </div>
      <div style={{ padding: 22 }}>
        <h2 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{data.t}</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-3)' }}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="calendar" size={14} /> {data.when}</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="users" size={14} /> {data.going} going</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="pin" size={14} /> Brooklyn, NY</span>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
          Hosted by <strong>{data.host}</strong>. Bring gloves and a refillable bottle — tools and refreshments provided. All skill levels welcome; this is a great first action if you're new to the neighborhood crew.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: 14, background: 'var(--bg-2)', borderRadius: 12 }}>
          <div style={{ display: 'flex' }}>
            {[0, 1, 2, 3].map(i => <span key={i} style={{ width: 28, height: 28, borderRadius: '50%', marginLeft: i ? -8 : 0, background: ['var(--green)', 'var(--sky)', 'var(--sun)', 'var(--clay)'][i], border: '2px solid var(--surface)' }} />)}
          </div>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Marcus, Maya & {data.going - 2} others are going</span>
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={() => { app.toast({ msg: 'Link copied', sub: 'Project link copied to clipboard.', icon: 'share' }); }}><Icon name="share" size={14} /> Share</button>
        <button className="btn btn-ghost" onClick={() => { close(); app.nav('messages'); }}><Icon name="msg" size={14} /> Message host</button>
        <button className={going ? 'btn btn-ghost' : 'btn btn-green'} onClick={() => { app.community.toggle('proj-' + data.id); app.toast(going ? { msg: 'RSVP cancelled', icon: 'close' } : { msg: "You're going!", sub: `${data.t} · ${data.when}`, kind: 'success', icon: 'check' }); }}>
          {going ? 'Going ✓ — cancel' : "I'm going"}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Article reader (explore) ---
export function MArticle({ data, close }) {
  const app = useApp();
  const liked = app.like?.has('art-' + data.title);
  const saved = app.save?.has('art-' + data.title);
  return (
    <Modal onClose={close} width={640}>
      <div style={{ position: 'relative' }}>
        <ImagePlaceholder label={data.img || 'article hero'} height={240} />
        <button onClick={close} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="close" size={16} /></button>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span className="chip chip-green">{data.tag}</span>
          <span className="chip">12 min read</span>
        </div>
        <h1 className="font-display" style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{data.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <Avatar src={MOCK.users.okafor.avatar} name={data.author} size={36} />
          <div style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{data.author}</div>
            <div style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>May 19 · 4.2k reads</div>
          </div>
          <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 13 }} onClick={() => app.toast({ msg: `Following ${data.author}`, icon: 'user' })}>Follow</button>
        </div>
        {[
          'The model is deceptively simple: pool community capital, buy at wholesale, install with local labor, and route the savings back to members rather than shareholders.',
          'In the first 18 months the co-op connected 4,200 homes — beating the incumbent utility on price while keeping every dollar of margin inside the neighborhood. The waitlist now runs three years deep.',
          'What makes it replicable is the financing template, released open-source last month. Three more cities have already forked it, adapting the repayment schedule to local energy prices.',
        ].map((p, i) => <p key={i} style={{ margin: '0 0 14px', fontSize: 15.5, lineHeight: 1.7, color: 'var(--ink-2)', textWrap: 'pretty' }}>{p}</p>)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, paddingTop: 14, borderTop: '1px solid var(--line)', color: 'var(--ink-3)' }}>
          <button className="abtn" onClick={() => app.like.toggle('art-' + data.title)} style={abtn(liked, 'var(--clay)')}><Icon name="heart" size={18} /> {liked ? '341' : '340'}</button>
          <button className="abtn" onClick={() => app.toast({ msg: 'Comments', sub: 'Discussion thread would open here.', icon: 'comment' })} style={abtn(false)}><Icon name="comment" size={18} /> 28</button>
          <button className="abtn" onClick={() => { app.save.toggle('art-' + data.title); app.toast(saved ? { msg: 'Removed from bookmarks', icon: 'bookmark' } : { msg: 'Saved to bookmarks', kind: 'success', icon: 'bookmark' }); }} style={{ ...abtn(saved, 'var(--green)'), marginLeft: 'auto' }}><Icon name="bookmark" size={18} /></button>
          <button className="abtn" onClick={() => app.toast({ msg: 'Link copied', icon: 'share' })} style={abtn(false)}><Icon name="share" size={18} /></button>
        </div>
      </div>
    </Modal>
  );
};
function abtn(active, col = 'var(--green)') {
  return { background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontFamily: 'JetBrains Mono', fontWeight: 600, color: active ? col : 'var(--ink-3)' };
}

// --- Product detail (marketplace) ---
export function MProduct({ data, close }) {
  const app = useApp();
  const [qty, setQty] = React.useState(1);
  const wished = app.wishlist?.has(data.name);
  return (
    <Modal onClose={close} width={720}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <ImagePlaceholder label={data.img} height={400} src={data.imgUrl} />
        <div style={{ padding: 24, position: 'relative' }}>
          <button onClick={close} style={{ position: 'absolute', top: 18, right: 18, background: 'var(--bg-2)', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}><Icon name="close" size={16} /></button>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{data.brand.toUpperCase()}</div>
          <h2 className="font-display" style={{ margin: '6px 0 8px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{data.name}</h2>
          <span className="chip chip-green">{data.tag}</span>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12, fontFamily: 'JetBrains Mono' }}>★★★★★ 4.8 · 214 reviews</div>
          <p style={{ margin: '14px 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>Vouched by 38 people on Honua. Ships plastic-free and carbon-neutral. Repairable and backed by a 5-year warranty.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0' }}>
            <span style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Lora' }}>{data.price}</span>
            <QtyStepper value={qty} set={setQty} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { for (let i = 0; i < qty; i++) app.addToCart({ name: data.name, price: data.price }); app.toast({ msg: 'Added to cart', sub: `${qty} × ${data.name}`, kind: 'success', icon: 'cart' }); close(); }}>
              <Icon name="cart" size={15} /> Add {qty} to cart
            </button>
            <button className="btn btn-ghost" onClick={() => { app.wishlist.toggle(data.name); app.toast(wished ? { msg: 'Removed from wishlist', icon: 'bookmark' } : { msg: 'Saved to wishlist', kind: 'success', icon: 'bookmark' }); }} style={{ color: wished ? 'var(--green)' : undefined }}>
              <Icon name="bookmark" size={15} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// --- Carbon credit detail / buy ---
export function MCredit({ data, close }) {
  const app = useApp();
  const [qty, setQty] = React.useState(1);
  const unit = parseFloat(String(data.price).replace(/[^0-9.]/g, '')) || 20;
  return (
    <Modal onClose={close} width={560}>
      <ModalHead icon="leaf" title={data.name} sub={`${data.type} · ${data.region} · vintage ${data.vintage}`} onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <ImagePlaceholder label={`${data.region} ${data.type.toLowerCase()} project`} height={150} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '16px 0' }}>
          {[['VERIFIER', data.verifier], ['AVAILABLE', data.volume], ['SPOT PRICE', data.price + ' /t']].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3, fontFamily: 'JetBrains Mono' }}>{v}</div>
            </div>
          ))}
        </div>
        <span className="verified-impact">on-chain verified · {data.tag}</span>
        <p style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: '12px 0 0' }}>Each tonne is third-party audited and traceable to GPS-tagged plots. Retirement certificate issued to your wallet on purchase.</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, padding: 14, background: 'var(--green-tint)', borderRadius: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Tonnes of CO₂</div>
            <QtyStepper value={qty} set={setQty} suffix=" t" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Total</div>
            <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'Lora', color: 'var(--green)' }}>${(unit * qty).toFixed(2)}</div>
          </div>
        </div>
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={close}>Cancel</button>
        <button className="btn btn-green" onClick={() => { close(); app.openModal('celebrate', { title: `Offset ${qty} t CO₂`, sub: `You retired ${qty} tonne${qty > 1 ? 's' : ''} via ${data.name}. Certificate added to your wallet.` }); }}>
          Buy {qty} t · ${(unit * qty).toFixed(2)}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Challenge detail ---
export function MChallenge({ data, close }) {
  const app = useApp();
  const joined = app.challenge?.has(data.id);
  return (
    <Modal onClose={close} width={520}>
      <ModalHead icon="flame" iconColor="var(--clay)" title={data.title} sub={`${data.cat} · ${data.days}-day challenge · ${data.joined} joined`} onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>Log your progress each day to keep your streak alive. Community multipliers stack with your personal streak — finish to earn <strong>{data.reward}</strong>.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '16px 0' }}>
          {[['DURATION', data.days + ' days'], ['REWARD', data.reward], ['JOINED', data.joined]].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <ModalFoot>
        {joined && <button className="btn btn-ghost" onClick={() => { close(); app.openModal('celebrate', { title: 'Logged for today!', sub: `Your ${data.title} streak continues. Keep it going.` }); }}>Log today</button>}
        <button className={joined ? 'btn btn-ghost' : 'btn btn-green'} onClick={() => { app.challenge.toggle(data.id); app.toast(joined ? { msg: 'Left challenge', icon: 'close' } : { msg: 'Joined!', sub: data.title, kind: 'success', icon: 'flame' }); if (joined) close(); }}>
          {joined ? 'Joined ✓ — leave' : 'Join challenge'}
        </button>
      </ModalFoot>
    </Modal>
  );
};

// --- Forum discussion thread ---
export function MDiscussion({ data, close }) {
  const app = useApp();
  const u = MOCK.users[data.user] || MOCK.users.maya;
  const liked = app.like?.has('disc-' + data.title);
  return (
    <Modal onClose={close} width={620}>
      <ModalHead title={data.title} sub={`by @${u.handle} · ${data.time || '2h'} · ${data.replies || 12} replies`} onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-2)', margin: 0 }}>Sharing what worked for me this season — happy to answer questions in the thread. Photos and the full parts list are attached below. Would love feedback before I scale it up.</p>
        <div style={{ display: 'flex', gap: 20, margin: '16px 0', paddingBottom: 16, borderBottom: '1px solid var(--line)', color: 'var(--ink-3)' }}>
          <button onClick={() => app.like.toggle('disc-' + data.title)} style={abtn(liked, 'var(--clay)')}><Icon name="heart" size={17} /> {(data.replies || 12) * 3 + (liked ? 13 : 12)}</button>
          <button style={abtn(false)}><Icon name="comment" size={17} /> {data.replies || 12}</button>
          <button onClick={() => app.toast({ msg: 'Saved', icon: 'bookmark' })} style={{ ...abtn(false), marginLeft: 'auto' }}><Icon name="bookmark" size={17} /></button>
        </div>
        {[['sarah', 'This is great — the trap-crop trick saved my tomatoes last year.', '1h'], ['marcus', 'Bookmarking. Any idea how it holds up in zone 6?', '40m']].map(([k, c, t], i) => {
          const cu = MOCK.users[k];
          return (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
              <Avatar src={cu.avatar} name={cu.name} size={34} verified={cu.verified} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}><strong>{cu.name}</strong> <span style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>· {t}</span></div>
                <p style={{ margin: '3px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>{c}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '16px 24px 22px', alignItems: 'center' }}>
        <input className="fld" placeholder="Add a reply…" id="disc-reply" />
        <button className="btn btn-primary" onClick={() => { const el = document.getElementById('disc-reply') as HTMLInputElement | null; if (el) el.value = ''; app.toast({ msg: 'Reply posted', kind: 'success', icon: 'comment' }); }}>Reply</button>
      </div>
    </Modal>
  );
};

// --- Badge detail ---
export function MBadge({ data, close }) {
  return (
    <Modal onClose={close} width={440}>
      <div style={{ padding: '30px 26px 22px', textAlign: 'center', position: 'relative' }}>
        <button onClick={close} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-2)', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}><Icon name="close" size={16} /></button>
        <div className="celebrate-pop" style={{ width: 96, height: 96, borderRadius: 26, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', border: '1px solid var(--green-3)' }}><Icon name="award" size={40} color="var(--green)" /></div>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--green)', letterSpacing: '.08em' }}>BADGE EARNED</div>
        <h2 className="font-display" style={{ margin: '6px 0 8px', fontSize: 24, fontWeight: 600 }}>{data.name || 'Composter'}</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-3)' }}>{data.desc || 'Awarded for composting food waste for 4 consecutive weeks. You diverted an estimated 18 kg from landfill.'}</p>
        <div style={{ textAlign: 'left', background: 'var(--bg-2)', borderRadius: 12, padding: 16, margin: '18px 0 0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>Perks unlocked</div>
          {(data.perks || ['+200 Green Points', '2× streak multiplier for 7 days', 'Composter flair on your profile']).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '5px 0', fontSize: 13.5, color: 'var(--ink-2)' }}>
              <span style={{ color: 'var(--green)' }}><Icon name="check" size={15} stroke={2.4} /></span> {p}
            </div>
          ))}
        </div>
      </div>
      <ModalFoot><button className="btn btn-green" onClick={close}>Nice!</button></ModalFoot>
    </Modal>
  );
};

// --- Celebration ---
export function MCelebrate({ data, close }) {
  return (
    <Modal onClose={close} width={420}>
      <div style={{ padding: '36px 28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <Confetti />
        <div className="celebrate-pop" style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--green-tint)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}><Icon name="check" size={44} color="var(--green)" stroke={2} /></div>
        <h2 className="font-display" style={{ margin: '0 0 8px', fontSize: 27, fontWeight: 600, letterSpacing: '-0.02em' }}>{data.title || 'Hurray!'}</h2>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-3)' }}>{data.sub}</p>
        <button className="btn btn-green" style={{ marginTop: 22, width: '100%', justifyContent: 'center' }} onClick={close}>Keep going →</button>
      </div>
    </Modal>
  );
};

// --- Wallet ---
export function MWallet({ close }) {
  const app = useApp();
  return (
    <Modal onClose={close} width={500}>
      <ModalHead icon="coin" iconColor="var(--sky)" title="Impact wallet" sub="Your verified-action rewards and carbon balance." onClose={close} />
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,#1f6f3f,#2e9a5b)', color: '#fff', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', opacity: .85 }}>GREEN POINTS</div>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Lora' }}>1,240</div>
          </div>
          <div style={{ background: 'var(--ink-solid)', color: '#fff', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', opacity: .7 }}>IMPACT TOKENS</div>
            <div style={{ fontSize: 30, fontWeight: 600, fontFamily: 'Lora' }}>24 <span style={{ fontSize: 14, opacity: .6 }}>IT</span></div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', margin: '18px 0 6px', letterSpacing: '.05em' }}>RECENT TRANSACTIONS</div>
        {[['Renewable plan switch', '+200 GP', 'May 18'], ['Offset purchase · Mau Forest', '−4 IT', 'May 16'], ['Bike commute streak', '+24 GP', 'May 15'], ['Compost log', '+18 GP', 'May 14']].map(([t, a, d], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div><div style={{ fontSize: 13.5, fontWeight: 500 }}>{t}</div><div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{d}</div></div>
            <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 13, color: a.startsWith('+') ? 'var(--green)' : 'var(--clay)' }}>{a}</span>
          </div>
        ))}
      </div>
      <ModalFoot>
        <button className="btn btn-ghost" onClick={() => app.toast({ msg: 'Statement exported', kind: 'success', icon: 'download' })}>Export statement</button>
        <button className="btn btn-primary" onClick={() => app.toast({ msg: 'Top up', sub: 'Wallet funding would open here.', icon: 'coin' })}>Top up IT</button>
      </ModalFoot>
    </Modal>
  );
};

// --- Generic list (see all) ---
export function MList({ data, close }) {
  return (
    <Modal onClose={close} width={520}>
      <ModalHead icon={data.icon || 'leaf'} title={data.title} sub={data.sub} onClose={close} />
      <div style={{ padding: '14px 24px 22px' }}>
        {data.items.map((it, i) => (
          <div key={i} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 10px', margin: '0 -10px', borderRadius: 10, borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-tint)', color: 'var(--green)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={it.icon || 'leaf'} size={17} stroke={2} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{it.title}</div>
              {it.sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{it.sub}</div>}
            </div>
            {it.right && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{it.right}</span>}
          </div>
        ))}
      </div>
    </Modal>
  );
};

// --- Community about ---
export function MCommunityAbout({ data, close }) {
  return (
    <Modal onClose={close} width={500}>
      <ModalHead title={'About ' + (data.name || 'Urban gardeners')} onClose={close} />
      <div style={{ padding: '16px 24px 22px' }}>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>For anyone growing food, herbs, or pollinator habitat in cities. Beginners welcome. Be kind, cite sources, and share your wins and failures alike.</p>
        <div style={{ display: 'flex', gap: 18, margin: '18px 0' }}>
          <Stat n="24.1k" l="Members" /><Stat n="312" l="Posts /wk" /><Stat n="2024" l="Founded" />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>Community guidelines</div>
        {['Stay on topic — urban growing & sustainability', 'No promotions without mod approval', 'Be generous with knowledge'].map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, padding: '5px 0', fontSize: 13.5, color: 'var(--ink-2)' }}><span style={{ color: 'var(--green)' }}><Icon name="check" size={15} stroke={2.2} /></span> {g}</div>
        ))}
      </div>
    </Modal>
  );
};

// =============== Desktop Auth (login / sign up) ===============
const INTERESTS = [
  'Solar Energy', 'Wind Power', 'Zero Waste', 'Urban Gardening', 'Sustainable Food',
  'Climate Policy', 'Biodiversity', 'Ocean Health', 'Carbon Offsetting', 'Circular Economy',
  'Sustainable Transport', 'Green Building', 'Reforestation', 'Renewable Energy', 'Water Conservation',
  'Animal Welfare', 'Ethical Fashion', 'Social Justice', 'Community Energy', 'Environmental Education',
];

function BrandPanel() {
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, position: 'relative', overflow: 'hidden', background: 'linear-gradient(150deg,#1f6f3f 0%,#2e9a5b 55%,#c8e6cf 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48 }} className="auth-brand">
      <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: .5 }}>
        <path d="M0 520 Q150 460 300 510 T600 480 L600 800 0 800Z" fill="rgba(255,255,255,.08)"/>
        <path d="M0 600 Q150 540 300 590 T600 560 L600 800 0 800Z" fill="rgba(255,255,255,.10)"/>
        <circle cx="470" cy="150" r="60" fill="rgba(255,255,255,.12)"/>
      </svg>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span className="font-display" style={{ color: '#fff', fontWeight: 600, fontSize: 21 }}>Honua</span>
      </div>
      <div style={{ position: 'relative', color: '#fff' }}>
        <h1 className="font-display" style={{ fontSize: 'clamp(30px,3.4vw,46px)', fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.03em', margin: 0, maxWidth: '14ch' }}>The social network for people fixing the planet.</h1>
        <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
          {[['2.4M', 'members'], ['18.6M', 'actions logged'], ['142kt', 'CO₂ avoided']].map(([n, l]) => (
            <div key={l}>
              <div className="font-display" style={{ fontSize: 26, fontWeight: 600 }}>{n}</div>
              <div style={{ fontSize: 12, opacity: .85, fontFamily: 'JetBrains Mono' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', fontSize: 12, color: 'rgba(255,255,255,.8)', fontFamily: 'JetBrains Mono' }}>© 2026 Honua Coop. All rights reserved.</div>
    </div>
  );
}

function PasswordField({ value, onChange, placeholder = 'Enter your password', label = 'PASSWORD' }: any) {
  const [show, setShow] = React.useState(false);
  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 42px 12px 14px', fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none', marginTop: 6 };
  const lab = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={lab}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} style={field} />
        <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', padding: 4 }}>
          {show ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function SocialButtons({ onGoogle, onApple }: { onGoogle: () => void; onApple: () => void }) {
  const btn: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', fontSize: 14, fontWeight: 500, borderRadius: 11, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', marginBottom: 8, fontFamily: 'Satoshi', color: 'var(--ink)', transition: 'background .15s' };
  return (
    <>
      <button style={btn} onClick={onGoogle}>
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
      </button>
      <button style={{ ...btn, opacity: .5, cursor: 'not-allowed', position: 'relative' }} disabled>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
        Continue with Apple
        <span style={{ position: 'absolute', right: 12, fontSize: 10, fontFamily: 'JetBrains Mono', background: 'var(--bg-2)', color: 'var(--ink-3)', padding: '2px 7px', borderRadius: 999, border: '1px solid var(--line)' }}>Coming soon</span>
      </button>
    </>
  );
}

// ── Sign-in form ──────────────────────────────────────────────────────────────
function SignInForm({ onSwitch, onSuccess }: { onSwitch: () => void; onSuccess: () => void }) {
  const app = useApp();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px', fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none', marginTop: 6 };
  const lab: React.CSSProperties = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { app.toast?.({ msg: 'Please fill in all fields', icon: 'bolt', kind: 'error' }); return; }
    setLoading(true);
    try {
      await app.login(email, password);
    } catch (err: any) {
      app.toast?.({ msg: 'Sign in failed', sub: err.message, icon: 'bolt', kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      <h2 className="font-display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Welcome back</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '6px 0 24px' }}>Sign in to pick up where you left off.</p>

      <form onSubmit={submit}>
        <div style={{ marginBottom: 14 }}>
          <label style={lab}>EMAIL</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={field} />
        </div>
        <PasswordField value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="Your password" />
        <div style={{ textAlign: 'right', marginBottom: 4 }}>
          <span onClick={() => app.toast?.({ msg: 'Reset link sent', sub: 'Check your inbox for a reset link.', icon: 'msg' })} style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 600, cursor: 'pointer' }}>Forgot password?</span>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15, marginTop: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-4)', margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <SocialButtons
        onGoogle={async () => { try { await app.loginWithGoogle(); } catch (e: any) { app.toast?.({ msg: 'Google sign-in failed', sub: e.message, icon: 'bolt', kind: 'error' }); } }}
        onApple={async () => { try { await app.loginWithApple(); } catch (e: any) { app.toast?.({ msg: 'Apple sign-in failed', sub: e.message, icon: 'bolt', kind: 'error' }); } }}
      />

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', marginTop: 20 }}>
        New to Honua?{' '}
        <span onClick={onSwitch} style={{ color: 'var(--green)', fontWeight: 600, cursor: 'pointer' }}>Create an account</span>
      </p>
      <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 14, lineHeight: 1.6 }}>
        By signing in you agree to our{' '}
        <a href="/terms" target="_blank" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Terms of Service &amp; Privacy Policy</a>.
      </p>
    </div>
  );
}

// ── Signup — multi-step onboarding ────────────────────────────────────────────
function SignUpFlow({ onSwitch, onConfirm }: { onSwitch: () => void; onConfirm?: (email: string) => void }) {
  const app = useApp();
  const [step, setStep] = React.useState(1); // 1–5
  const totalSteps = 5;
  const [loading, setLoading] = React.useState(false);

  // Step 1: credentials
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');

  // Step 2: identity
  const [name, setName] = React.useState('');
  const [handle, setHandle] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Username availability
  const [handleStatus, setHandleStatus] = React.useState<'idle' | 'checking' | 'available' | 'taken' | 'short'>('idle');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 3: bio & focus
  const [bio, setBio] = React.useState('');
  const [interests, setInterests] = React.useState<string[]>([]);

  // Step 4: T&C
  const [agreed, setAgreed] = React.useState(false);
  const [agreedMarketing, setAgreedMarketing] = React.useState(false);

  const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px', fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none', marginTop: 6 };
  const lab: React.CSSProperties = { fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', display: 'block' };

  const handleHandleChange = (v: string) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    setHandle(clean);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length < 3) { setHandleStatus(clean.length > 0 ? 'short' : 'idle'); return; }
    setHandleStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.from('profiles').select('handle').eq('handle', clean).maybeSingle();
        setHandleStatus(data ? 'taken' : 'available');
      } catch { setHandleStatus('idle'); }
    }, 500);
  };

  const next = async () => {
    if (step === 1) {
      if (!email || !password || !confirm) { app.toast?.({ msg: 'Please fill in all fields', icon: 'bolt', kind: 'error' }); return; }
      if (password.length < 8) { app.toast?.({ msg: 'Password must be at least 8 characters', icon: 'bolt', kind: 'error' }); return; }
      if (password !== confirm) { app.toast?.({ msg: "Passwords don't match", icon: 'bolt', kind: 'error' }); return; }
    }
    if (step === 2) {
      if (!name || !handle) { app.toast?.({ msg: 'Name and username are required', icon: 'bolt', kind: 'error' }); return; }
      if (handle.length < 3) { app.toast?.({ msg: 'Username must be at least 3 characters', icon: 'bolt', kind: 'error' }); return; }
      if (handleStatus === 'taken') { app.toast?.({ msg: 'That username is taken', sub: 'Try a different one.', icon: 'bolt', kind: 'error' }); return; }
      if (handleStatus === 'checking') { app.toast?.({ msg: 'Still checking username…', icon: 'bolt', kind: 'error' }); return; }
    }
    if (step === 3 && interests.length < 3) { app.toast?.({ msg: 'Pick at least 3 interests to personalise your feed', icon: 'bolt', kind: 'error' }); return; }
    if (step === 4 && !agreed) { app.toast?.({ msg: 'Please accept the Terms of Service to continue', icon: 'bolt', kind: 'error' }); return; }
    if (step === totalSteps) {
      setLoading(true);
      try {
        const result = await app.signup(email, password, {
          full_name: name,
          handle,
          dob,
          location,
          bio,
          interests,
          marketing_emails: agreedMarketing,
        });
        // If user is immediately active (no email confirmation needed), upload avatar now
        if (result?.user && avatarFile) {
          await app.uploadAvatar(result.user.id, avatarFile);
        }
        if (onConfirm) {
          onConfirm(email);
        } else {
          app.toast?.({ msg: `Welcome to Honua, ${name.split(' ')[0]}!`, sub: 'Check your email to confirm your account.', kind: 'success', icon: 'leaf' });
        }
      } catch (err: any) {
        app.toast?.({ msg: 'Sign up failed', sub: err.message, icon: 'bolt', kind: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep(s => s + 1);
  };

  const back = () => setStep(s => s - 1);

  const stepTitle = ['Create your account', 'Tell us about you', 'What do you care about?', 'Terms & conditions', 'You\'re almost in!'];
  const stepSub = [
    'Set up your login credentials.',
    'Help your community know who you are.',
    'Pick at least 3 topics to personalise your feed.',
    'Please read and accept before joining.',
    'Review your profile before going live.',
  ];

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      {/* Back / progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {step > 1 && <button onClick={back} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg> Back
        </button>}
        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < step ? 'var(--green)' : 'var(--line)', transition: 'background .3s' }} />
          ))}
        </div>
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)' }}>{step}/{totalSteps}</span>
      </div>

      <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{stepTitle[step - 1]}</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '6px 0 22px', lineHeight: 1.55 }}>{stepSub[step - 1]}</p>

      {/* ── Step 1: Credentials ── */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>EMAIL ADDRESS</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={field} autoFocus />
          </div>
          <PasswordField value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="At least 8 characters" label="PASSWORD" />
          <PasswordField value={confirm} onChange={(e: any) => setConfirm(e.target.value)} placeholder="Repeat your password" label="CONFIRM PASSWORD" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-4)', margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <SocialButtons
            onGoogle={async () => { try { await app.loginWithGoogle(); } catch (e: any) { app.toast?.({ msg: 'Google sign-in failed', sub: e.message, icon: 'bolt', kind: 'error' }); } }}
            onApple={async () => { try { await app.loginWithApple(); } catch (e: any) { app.toast?.({ msg: 'Apple sign-in failed', sub: e.message, icon: 'bolt', kind: 'error' }); } }}
          />
        </div>
      )}

      {/* ── Step 2: Identity ── */}
      {step === 2 && (
        <div>
          {/* Avatar upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{ width: 80, height: 80, borderRadius: 20, background: avatarPreview ? 'transparent' : 'var(--green-tint)', border: `2px dashed ${avatarPreview ? 'transparent' : 'var(--green)'}`, display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}
            >
              {avatarPreview
                ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              }
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Profile photo</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>JPG, PNG or WebP · max 5 MB</div>
              <button type="button" onClick={() => avatarInputRef.current?.click()} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-2)', fontFamily: 'Satoshi' }}>
                {avatarPreview ? 'Change photo' : 'Upload photo'}
              </button>
              {avatarPreview && <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--clay)', fontFamily: 'Satoshi', marginLeft: 6 }}>Remove</button>}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 5 * 1024 * 1024) { app.toast?.({ msg: 'File too large', sub: 'Max 5 MB', icon: 'bolt', kind: 'error' }); return; }
              setAvatarFile(f);
              setAvatarPreview(URL.createObjectURL(f));
            }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lab}>FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Sarah Green" style={field} autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>USERNAME</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 15, marginTop: 3 }}>@</span>
              <input
                value={handle}
                onChange={e => handleHandleChange(e.target.value)}
                placeholder="sarahgreen"
                style={{
                  ...field,
                  paddingLeft: 28,
                  paddingRight: 36,
                  borderColor: handleStatus === 'taken' ? 'var(--clay)' : handleStatus === 'available' ? 'var(--green)' : undefined,
                }}
              />
              {handleStatus === 'checking' && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', marginTop: 3 }}>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </span>
              )}
              {handleStatus === 'available' && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', marginTop: 3, color: 'var(--green)', fontSize: 16 }}>✓</span>
              )}
              {handleStatus === 'taken' && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', marginTop: 3, color: 'var(--clay)', fontSize: 16 }}>✕</span>
              )}
            </div>
            <span style={{
              fontSize: 11, fontFamily: 'JetBrains Mono', marginTop: 4, display: 'block',
              color: handleStatus === 'taken' ? 'var(--clay)' : handleStatus === 'available' ? 'var(--green)' : 'var(--ink-4)',
            }}>
              {handleStatus === 'taken' ? `@${handle} is already taken.` :
               handleStatus === 'available' ? `@${handle} is available!` :
               handleStatus === 'short' ? 'Min 3 characters.' :
               handleStatus === 'checking' ? 'Checking availability…' :
               'Letters, numbers, underscores only. Min 3 chars.'}
            </span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>DATE OF BIRTH</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={field} />
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 4, display: 'block' }}>You must be 13 or older to join Honua.</span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>LOCATION (OPTIONAL)</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Portland, OR · Global" style={field} />
          </div>
        </div>
      )}

      {/* ── Step 3: Interests ── */}
      {step === 3 && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INTERESTS.map(it => {
              const on = interests.includes(it);
              return (
                <button key={it} onClick={() => setInterests(prev => on ? prev.filter(x => x !== it) : [...prev, it])} style={{ padding: '8px 14px', borderRadius: 999, border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`, background: on ? 'var(--green)' : 'var(--surface)', color: on ? '#fff' : 'var(--ink-2)', fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: 'Satoshi', transition: 'all .15s' }}>
                  {it}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 14 }}>{interests.length} selected · minimum 3</p>
        </div>
      )}

      {/* ── Step 4: Bio ── */}
      {step === 4 && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <label style={lab}>SHORT BIO (OPTIONAL)</label>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 200))} placeholder="Tell the Honua community about yourself, your sustainability journey, and what drives you." rows={4} style={{ ...field, resize: 'none', lineHeight: 1.55 }} />
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 4, display: 'block', textAlign: 'right' }}>{bio.length}/200</span>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, maxHeight: 260, overflowY: 'auto' }} className="no-scrollbar">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Terms of Service — Summary</div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, margin: '0 0 10px' }}>By joining Honua you agree to post only truthful, original content; not to harass, deceive, or harm other members; to grant Honua a non-exclusive licence to display your content on the platform; and to respect our community guidelines around verified impact claims.</p>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, margin: '0 0 10px' }}>Honua may suspend or terminate accounts that violate these terms. Green Points are non-transferable and have no cash value outside the platform. You retain ownership of all content you post.</p>
            <a href="/terms" target="_blank" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Read the full Terms of Service →</a>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--green)', width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              I have read and agree to the{' '}
              <a href="/terms" target="_blank" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/terms#privacy" target="_blank" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>.
              <span style={{ color: 'var(--clay)', marginLeft: 4 }}>*</span>
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={agreedMarketing} onChange={e => setAgreedMarketing(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--green)', width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              I'd like to receive Honua's newsletter with sustainability tips, platform updates, and community highlights. (Optional)
            </span>
          </label>
        </div>
      )}

      {/* ── Step 5: Review ── */}
      {step === 5 && (
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--green)', display: 'grid', placeItems: 'center', fontSize: 28, color: '#fff', fontWeight: 700 }}>{name.charAt(0) || '?'}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{name || '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{handle || '—'}</div>
                {location && <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{location}</div>}
              </div>
            </div>
            {bio && <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 14px' }}>{bio}</p>}
            {interests.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {interests.map(it => <span key={it} style={{ fontSize: 12, background: 'var(--green-tint)', color: 'var(--green)', padding: '3px 10px', borderRadius: 999, fontWeight: 500 }}>{it}</span>)}
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, background: 'var(--green-tint)', border: '1px solid var(--green-3)', borderRadius: 12, padding: 14 }}>
            <strong>You're joining {(2400000).toLocaleString()} members</strong> who are making their climate impact visible and verifiable.
          </div>
        </div>
      )}

      <button onClick={next} disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 16px', fontSize: 15, marginTop: 22, opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Creating account…' : step === totalSteps ? 'Create my account' : step === 4 ? 'I agree — continue' : 'Continue'}
      </button>

      {step === 1 && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', marginTop: 18 }}>
          Already have an account?{' '}
          <span onClick={onSwitch} style={{ color: 'var(--green)', fontWeight: 600, cursor: 'pointer' }}>Sign in</span>
        </p>
      )}
    </div>
  );
}

function CheckEmailScreen({ email, onBackToSignIn }: { email: string; onBackToSignIn: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--green-tint)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}><Icon name="mail" size={32} color="var(--green)" /></div>
      <h2 className="font-display" style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Check your email</h2>
      <p style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        We sent a confirmation link to
      </p>
      <div style={{ display: 'inline-block', background: 'var(--green-tint)', color: 'var(--green)', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600, padding: '6px 14px', borderRadius: 8, marginBottom: 20 }}>
        {email}
      </div>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>
        Click the link in that email to activate your account. It may take a minute or two to arrive — check your spam folder if you don't see it.
      </p>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.04em', marginBottom: 10 }}>NEXT STEPS</div>
        {[
          ['1.', 'Open the confirmation email'],
          ['2.', 'Click "Confirm your email"'],
          ['', 'You\'re in — start your impact journey'],
        ].map(([icon, text], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{text}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 14 }} onClick={onBackToSignIn}>
        Back to sign in
      </button>
    </div>
  );
}

// ── OAuth Onboarding Flow ─────────────────────────────────────────────────────
export function OAuthOnboardingFlow() {
  const app = useApp();
  const totalSteps = 5;
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  // Pre-fill from Google user data
  const [name, setName] = React.useState(app.user?.name || '');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(app.user?.avatar || null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const [handle, setHandle] = React.useState('');
  const [handleStatus, setHandleStatus] = React.useState<'idle' | 'checking' | 'available' | 'taken' | 'short'>('idle');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [location, setLocation] = React.useState('');
  const [interests, setInterests] = React.useState<string[]>([]);
  const [bio, setBio] = React.useState('');
  const [agreed, setAgreed] = React.useState(false);

  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'var(--bg-2)',
    border: '1px solid var(--line)', borderRadius: 11, padding: '12px 14px',
    fontSize: 15, fontFamily: 'Satoshi', color: 'var(--ink)', outline: 'none', marginTop: 6,
  };
  const lab: React.CSSProperties = {
    fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)',
    letterSpacing: '.05em', display: 'block',
  };

  const handleHandleChange = (v: string) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    setHandle(clean);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length < 3) { setHandleStatus(clean.length > 0 ? 'short' : 'idle'); return; }
    setHandleStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.from('profiles').select('handle').eq('handle', clean).maybeSingle();
        setHandleStatus(data ? 'taken' : 'available');
      } catch { setHandleStatus('idle'); }
    }, 500);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const next = async () => {
    if (step === 1 && !name.trim()) {
      app.toast?.({ msg: 'Please enter your name', icon: 'bolt', kind: 'error' }); return;
    }
    if (step === 2) {
      if (!handle || handle.length < 3) { app.toast?.({ msg: 'Username must be at least 3 characters', icon: 'bolt', kind: 'error' }); return; }
      if (handleStatus === 'taken') { app.toast?.({ msg: 'That username is taken', sub: 'Try a different one.', icon: 'bolt', kind: 'error' }); return; }
      if (handleStatus === 'checking') { app.toast?.({ msg: 'Still checking username…', icon: 'bolt', kind: 'error' }); return; }
    }
    if (step === 4 && interests.length < 3) {
      app.toast?.({ msg: 'Pick at least 3 interests', sub: 'They help us personalise your feed.', icon: 'bolt', kind: 'error' }); return;
    }
    if (step === totalSteps) {
      if (!agreed) { app.toast?.({ msg: 'Please accept the Terms of Service', icon: 'bolt', kind: 'error' }); return; }
      setLoading(true);
      try {
        await app.completeOAuthOnboarding({ name, handle, location, bio, interests, avatarFile });
        app.toast?.({ msg: `Welcome to Honua, ${name.split(' ')[0]}! 🌿`, sub: 'Your profile is all set.', kind: 'success', icon: 'leaf' });
      } catch (err: any) {
        app.toast?.({ msg: 'Something went wrong', sub: err.message, icon: 'bolt', kind: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep(s => s + 1);
  };

  const stepTitles = ['Welcome to Honua', 'Choose your username', 'Where are you based?', 'What do you care about?', 'Almost done'];
  const stepSubs = [
    'Let\'s confirm your name and photo.',
    'This is how the community will find you.',
    'Optional — helps connect you with local initiatives.',
    'Pick at least 3 topics to personalise your feed.',
    'A short intro and you\'re in.',
  ];

  const handleStatusColor = handleStatus === 'available' ? 'var(--green)' : handleStatus === 'taken' ? 'var(--clay)' : 'var(--ink-4)';
  const handleStatusMsg =
    handleStatus === 'available' ? `@${handle} is available!` :
    handleStatus === 'taken' ? 'That username is taken.' :
    handleStatus === 'short' ? 'Min 3 characters.' :
    handleStatus === 'checking' ? 'Checking…' : 'Letters, numbers, underscores only.';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--bg)', borderRadius: 20, padding: '36px 40px',
        width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,.25)',
      }} className="no-scrollbar">
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
            </button>
          )}
          <div style={{ flex: 1, display: 'flex', gap: 4 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < step ? 'var(--green)' : 'var(--line)', transition: 'background .3s' }} />
            ))}
          </div>
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', flexShrink: 0 }}>{step}/{totalSteps}</span>
        </div>

        <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 4px' }}>{stepTitles[step - 1]}</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 24px', lineHeight: 1.55 }}>{stepSubs[step - 1]}</p>

        {/* Step 1: Name + Avatar */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => avatarInputRef.current?.click()}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--line)', overflow: 'hidden', border: '3px solid var(--green)' }}>
                  {avatarPreview
                    ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--ink-4)' }}>👤</div>
                  }
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <span style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8 }}>Tap to change photo</span>
            </div>
            <label style={lab}>FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={field} autoFocus />
          </div>
        )}

        {/* Step 2: Username */}
        {step === 2 && (
          <div>
            <label style={lab}>USERNAME</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 15, marginTop: 3 }}>@</span>
              <input value={handle} onChange={e => handleHandleChange(e.target.value)} placeholder="yourhandle" style={{ ...field, paddingLeft: 28 }} autoFocus />
            </div>
            <span style={{ fontSize: 12, color: handleStatusColor, fontFamily: 'JetBrains Mono', marginTop: 6, display: 'block' }}>{handleStatusMsg}</span>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div>
            <label style={lab}>CITY / REGION (OPTIONAL)</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Lagos, NG · Remote · Global" style={field} autoFocus />
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 12, lineHeight: 1.55 }}>
              Location helps surface nearby communities, local impact projects, and regional challenges. It's never shared without your consent.
            </p>
          </div>
        )}

        {/* Step 4: Interests */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {INTERESTS.map(it => {
                const on = interests.includes(it);
                return (
                  <button key={it} onClick={() => setInterests(prev => on ? prev.filter(x => x !== it) : [...prev, it])} style={{ padding: '8px 14px', borderRadius: 999, border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`, background: on ? 'var(--green)' : 'var(--surface)', color: on ? '#fff' : 'var(--ink-2)', fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: 'Satoshi', transition: 'all .15s' }}>
                    {it}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 14 }}>{interests.length} selected · minimum 3</p>
          </div>
        )}

        {/* Step 5: Bio + Terms */}
        {step === totalSteps && (
          <div>
            <label style={lab}>SHORT BIO (OPTIONAL)</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell the community a bit about yourself and your sustainability journey…" rows={4} style={{ ...field, resize: 'vertical' }} />
            <div style={{ marginTop: 20, padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--green)', width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                  I agree to Honua's <a href="/terms" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 500 }}>Terms of Service</a> and <a href="/terms" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</a>
                </span>
              </label>
            </div>
          </div>
        )}

        <button
          className="btn btn-green"
          onClick={next}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 28, padding: '14px', fontSize: 15, fontWeight: 600 }}
        >
          {loading ? 'Setting up your profile…' : step === totalSteps ? '🌿 Enter Honua' : 'Continue'}
        </button>

        {step === 3 && (
          <button onClick={next} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, marginTop: 12, padding: 8 }}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

export function DesktopAuth({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const [mode, setMode] = React.useState<'signin' | 'signup' | 'confirm'>((params?.mode as any) || 'signin');
  const [confirmedEmail, setConfirmedEmail] = React.useState('');
  const app = useApp();
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <BrandPanel />
      <div style={{ flex: '0 0 clamp(360px, 42%, 560px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px clamp(20px,4vw,56px)', overflow: 'auto', width: '100%' }} className="no-scrollbar auth-content">
        {mode === 'signin'
          ? <SignInForm onSwitch={() => setMode('signup')} onSuccess={() => {}} />
          : mode === 'signup'
          ? <SignUpFlow onSwitch={() => setMode('signin')} onConfirm={(email) => { setConfirmedEmail(email); setMode('confirm'); }} />
          : <CheckEmailScreen email={confirmedEmail} onBackToSignIn={() => setMode('signin')} />
        }
      </div>
    </div>
  );
};
