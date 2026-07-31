"use client";
import React from "react";
import { Icon, Logo, Avatar, VerifiedTick, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";
import { getNotifications, markAllRead } from "@/lib/notifications";

const _ogMsgCache: Record<string, any> = {};
function MsgOgPreview({ content }: { content?: string | null }) {
  const urls = (content?.match(/https?:\/\/[^\s]+/g) ?? []).filter((u: string) => {
    try { const h = new URL(u).hostname; return !h.includes('supabase') && !h.includes('localhost'); } catch { return false; }
  });
  const url = urls[0];
  const [og, setOg] = React.useState<any>(_ogMsgCache[url ?? ''] ?? null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    if (!url) return;
    if (_ogMsgCache[url]) { setOg(_ogMsgCache[url]); return; }
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => { if (d.title) { _ogMsgCache[url] = d; setOg(d); } else setFailed(true); })
      .catch(() => setFailed(true));
  }, [url]);
  if (!url || failed || !og) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'block', maxWidth: 280, border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', color: 'inherit', background: 'var(--bg)' }}>
      {og.image && <img src={og.image} alt="" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }} />}
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{og.siteName}</div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}>{og.title}</div>
      </div>
    </a>
  );
}

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

// Shop-branded conversations: when a conversation carries shop context and the
// other participant is the shop owner, render the shop's name + logo instead of
// the seller's personal profile.
function participantDisplay(convo: any, other: any) {
  const isShop = !!convo?.shop_owner_id && convo.shop_owner_id === other?.id;
  if (isShop) {
    return {
      name: convo.shop_name || other?.full_name || 'Shop',
      handle: other?.handle,
      avatar: convo.shop_logo_url || other?.avatar_url || null,
      verified: true,
      isShop: true,
    };
  }
  return { name: other?.full_name, handle: other?.handle, avatar: other?.avatar_url, verified: other?.verified, isShop: false };
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

  // Auto-open DM when navigated from a profile's Message button (or a shop's)
  React.useEffect(() => {
    const handle = params?.handle as string | undefined;
    const isShop = !!params?.shop;
    if (!handle || !userId) return;
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: target } = await supabase.from('profiles').select('id').eq('handle', handle).single();
      if (!target) return;

      // Shop context: fetch the seller's shop identity to brand the conversation
      let shopFields: any = {};
      if (isShop) {
        try {
          const { getShopForOwner } = await import('@/lib/market');
          const shop = await getShopForOwner(target.id);
          if (shop) shopFields = { shop_owner_id: target.id, shop_name: shop.name, shop_logo_url: shop.logo };
        } catch {}
      }

      // Check for existing conversation in either direction (two separate queries — nested AND in .or() is unsupported)
      const [{ data: e1 }, { data: e2 }] = await Promise.all([
        supabase.from('conversations').select('id, shop_owner_id').eq('user1_id', userId).eq('user2_id', target.id).maybeSingle(),
        supabase.from('conversations').select('id, shop_owner_id').eq('user1_id', target.id).eq('user2_id', userId).maybeSingle(),
      ]);
      const existing = e1 ?? e2;
      if (existing) {
        // Upgrade a plain conversation to shop-branded if opened via a shop link
        if (isShop && shopFields.shop_owner_id && !existing.shop_owner_id) {
          await supabase.from('conversations').update(shopFields).eq('id', existing.id).then(() => {});
        }
        await loadConvos(); setActiveConvoId(existing.id); return;
      }

      // Check mutual follow — ignore errors (follows table 400 just means not following)
      const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
        supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', target.id).maybeSingle(),
        supabase.from('follows').select('id').eq('follower_id', target.id).eq('following_id', userId).maybeSingle(),
      ]);
      const mutual = !!iFollow && !!theyFollow;

      const { data: newConvo, error: insertErr } = await supabase.from('conversations').insert({
        user1_id: userId, user2_id: target.id, status: mutual ? 'accepted' : 'pending', ...shopFields,
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
  const otherDisplay = participantDisplay(activeConvo, otherUser);
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
    // Attach last message properly (supabase returns array, take first).
    // Hide conversations where I'm the shop owner — those are customer
    // inquiries and live in the seller dashboard's Messages tab instead.
    const enriched = (data ?? [])
      .filter((c: any) => c.shop_owner_id !== userId)
      .map((c: any) => ({
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
        const disp = participantDisplay(c, other);
        const q = searchQuery.toLowerCase();
        return disp.name?.toLowerCase().includes(q) || other?.handle?.toLowerCase().includes(q);
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
    <div className={`page-wrap${activeConvoId ? ' msg-in-thread' : ''}`} style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
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
              const disp = participantDisplay(c, other);
              const last = c.last_msg;
              const isActive = c.id === activeConvoId;
              const unread = false; // TODO: track unread per convo
              return (
                <div key={c.id} onClick={() => setActiveConvoId(c.id)} className="row-hover" style={{ padding: '12px 20px', display: 'flex', gap: 12, cursor: 'pointer', background: isActive ? 'var(--green-tint)' : 'transparent', borderLeft: isActive ? '3px solid var(--green)' : '3px solid transparent' }}>
                  <Avatar src={disp.avatar} name={disp.name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {disp.name}
                        {disp.verified && <VerifiedTick size={13} />}
                        {disp.isShop &&<span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: 'var(--green)', background: 'var(--green-tint)', borderRadius: 4, padding: '1px 5px', fontFamily: 'JetBrains Mono' }}>SHOP</span>}
                      </span>
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
          <div className="msg-detail-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
            <Icon name="msg" size={40} />
            <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: 'var(--ink-2)' }}>Your messages</div>
            <p style={{ fontSize: 14, marginTop: 6, textAlign: 'center', maxWidth: 280 }}>Select a conversation or start a new one.</p>
            <button onClick={() => setShowNewMsg(true)} className="btn btn-primary" style={{ marginTop: 16 }}>New message</button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }} className="msg-detail-col">
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button className="msg-back-btn btn btn-ghost" onClick={() => setActiveConvoId(null)} style={{ padding: '6px 10px', fontSize: 13, gap: 4 }}>
                ← Back
              </button>
              <span style={{ cursor: 'pointer' }} onClick={() => onNav?.('profile', { handle: otherDisplay.handle })}>
                <Avatar src={otherDisplay.avatar} name={otherDisplay.name} size={40} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {otherDisplay.name}
                  {otherDisplay.verified && <VerifiedTick size={14} />}
                  {otherDisplay.isShop &&<span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: 'var(--green)', background: 'var(--green-tint)', borderRadius: 4, padding: '1px 5px', fontFamily: 'JetBrains Mono' }}>SHOP</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>@{otherDisplay.handle}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 13 }} onClick={() => onNav?.('profile', { handle: otherDisplay.handle })}>{otherDisplay.isShop ? 'Shop' : 'Profile'}</button>
              <button onClick={deleteConvo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 6 }} title="Delete conversation">
                <Icon name="trash" size={15} />
              </button>
            </div>

            {/* Request banner — shown to recipient of a pending request */}
            {!isAccepted && iAmRecipient && (
              <div style={{ padding: '14px 24px', background: 'var(--sun-tint, #fffbeb)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon name="bell" size={16} color="var(--sun, #f59e0b)" />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
                  <strong>{otherDisplay.name}</strong> wants to message you. Accept to reply and let them know you've seen their messages.
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
                            }}>{(m.content ?? '').split(/(https?:\/\/[^\s]+)/).map((part: string, i: number) =>
                              /^https?:\/\//.test(part)
                                ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: isMe ? 'rgba(255,255,255,0.9)' : 'var(--sky)', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>
                                : <React.Fragment key={i}>{part}</React.Fragment>
                            )}</div>
                            <MsgOgPreview content={m.content} />
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
                    placeholder={`Message ${otherDisplay.name ?? ''}…`}
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
