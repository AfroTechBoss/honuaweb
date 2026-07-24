"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/storage";
import { updateProfile } from "@/lib/profile";
import { createNotification, getUnreadCount, markAllRead, notifyMentionedInPost } from "@/lib/notifications";
import { getBookmarkedPostIds, addBookmark, removeBookmark, getCollections, createCollection } from "@/lib/bookmarks";

// Route key -> URL path. Mirrors the prototype's ROUTES registry, but
// navigation now drives the real Next.js router.
export function pathFor(key: string, params: any = {}): string {
  switch (key) {
    case "home": return "/";
    case "explore": return params?.tag ? `/explore?tag=${encodeURIComponent(params.tag)}` : "/explore";
    case "impact": return "/impact";
    case "map": return "/map";
    case "carbon": return "/carbon";
    case "marketplace": return "/marketplace";
    case "bookmarks": return "/bookmarks";
    case "notifications": return "/notifications";
    case "messages": return params?.handle ? `/messages?handle=${encodeURIComponent(params.handle)}` : "/messages";
    case "forum":
    case "communities": return params?.community ? `/communities?c=${encodeURIComponent(params.community)}` : "/communities";
    case "tasks": return "/challenges";
    case "profile": return params?.handle ? `/profile/${params.handle}` : "/profile";
    case "followers": return params?.handle ? `/followers/${params.handle}` : "/followers";
    case "following": return params?.handle ? `/following/${params.handle}` : "/following";
    case "post": return `/post/${params?.id ?? 1}`;
    case "settings": return "/settings";
    case "terms": return "/terms";
    case "auth": return "/login";
    case "sell": return "/sell";
    case "seller": return "/seller";
    case "admin": return "/admin";
    case "search": return params?.q ? `/search?q=${encodeURIComponent(params.q)}` : "/search";
    case "orders": return "/orders";
    case "order": return `/orders/${params?.id ?? ''}`;
    case "product": return `/marketplace/${params?.id ?? ''}`;
    default: return "/";
  }
}

const STATE_DEFAULTS: any = {
  liked: [],
  reposted: [],
  saved: [],
  mutedUsers: [],
  blockedUsers: [],
  blockedByUsers: [],
  following: ["sarahgreen", "greentech"],
  joinedCommunities: ["Urban gardeners", "Solar DIY", "Ocean cleanup crew"],
  joinedChallenges: [1, 2],
  cart: [
    { id: 'p1', name: 'Refillable shampoo bar', price: '$12', brand: 'BareHaus', tag: 'Plastic-free', imgUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80', quantity: 1 },
    { id: 'p2', name: 'Solar phone charger', price: '$48', brand: 'Sunly', tag: 'Solar', imgUrl: 'https://images.unsplash.com/photo-1620634409738-62a2e2b1a5b7?w=400&q=80', quantity: 1 },
    { id: 'p3', name: 'Bamboo cutlery set', price: '$18', brand: 'Forrest', tag: 'Compostable', imgUrl: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&q=80', quantity: 1 },
  ],
  cartOpen: false,
  wishlist: [],
  drafts: [],
  dark: false,
  sellerStatus: "none",
  sellerShop: null,
  authed: false,
  authReady: false,
  user: null,
  // supabase session — not persisted to localStorage
  session: null,
};

const LS_STATE = "honua_desktop_state";

function loadState() {
  if (typeof window === "undefined") return { ...STATE_DEFAULTS };
  try {
    const raw = JSON.parse(localStorage.getItem(LS_STATE) || "{}");
    return { ...STATE_DEFAULTS, ...raw };
  } catch {
    return { ...STATE_DEFAULTS };
  }
}

export const AppCtx = createContext<any>(null);
export function useApp(): any {
  return useContext(AppCtx) || {};
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // ---- shared interaction state ----
  const [st, setSt] = useState<any>(STATE_DEFAULTS);
  // hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => { setSt(loadState()); }, []);

  // Synchronously before first paint: check localStorage for an existing Supabase session.
  // If found, optimistically mark authed+ready so returning users see the app with zero delay.
  // getSession() will still run to validate/refresh the token in the background.
  useLayoutEffect(() => {
    try {
      const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      const hasSession = !!key && !!localStorage.getItem(key);
      setSt((s: any) => ({ ...s, authReady: true, authed: hasSession ? true : s.authed }));
    } catch {
      setSt((s: any) => ({ ...s, authReady: true }));
    }
  }, []);
  useEffect(() => {
    // Don't persist session/authed/user — Supabase manages those
    const { session: _s, authed: _a, user: _u, ...persistable } = st;
    try { localStorage.setItem(LS_STATE, JSON.stringify(persistable)); } catch {}
  }, [st]);
  useEffect(() => {
    document.body.classList.toggle("dark", !!st.dark);
  }, [st.dark]);

  // ---- Supabase auth listener ----
  useEffect(() => {
    // Fetch real profile data (avatar_url, handle, etc.) from profiles table
    const hydrateUser = async (session: any) => {
      const u = session.user;
      const provider = u.app_metadata?.provider ?? "email";
      const base = {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.email?.split("@")[0] || "You",
        handle: u.user_metadata?.handle || u.email?.split("@")[0] || "you",
        avatar: u.user_metadata?.avatar_url || null,
        provider,
      };
      setSt((s: any) => ({ ...s, authed: true, authReady: true, session, user: base }));
      // Fetch the profiles row to get the real avatar_url / handle / name
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, handle, avatar_url, cover_url, onboarding_complete")
          .eq("id", u.id)
          .single();
        if (profile) {
          const needsOnboarding = provider !== "email" && !profile.onboarding_complete;
          setSt((s: any) => ({
            ...s,
            needsOnboarding,
            user: {
              ...s.user,
              name: profile.full_name || base.name,
              handle: profile.handle || base.handle,
              avatar: profile.avatar_url || base.avatar,
              cover: profile.cover_url || null,
            },
          }));
        }
      } catch {}
    };

    // Set initial session on mount — mark authReady once resolved
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) hydrateUser(session);
      else setSt((s: any) => ({ ...s, authReady: true }));
    });

    // Keep in sync with any auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        hydrateUser(session);
        if (_event === "SIGNED_IN") router.push("/");
        if (_event === "SIGNED_OUT") router.push("/login");
      } else {
        setSt((s: any) => ({ ...s, authed: false, session: null, user: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // ---- navigation ----
  const nav = useCallback((key: string, params: any = {}) => {
    router.push(pathFor(key, params));
  }, [router]);

  // ---- toasts ----
  const [toasts, setToasts] = useState<any[]>([]);
  const toastId = useRef(0);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((opts: any) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, ...opts }]);
    if (opts.sticky !== true) setTimeout(() => dismissToast(id), opts.duration || 3800);
    return id;
  }, [dismissToast]);

  // ---- modals ----
  const [modal, setModal] = useState<any>(null);
  const openModal = useCallback((type: string, data?: any) => setModal({ type, data }), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ---- toggle helpers ----
  const mk = (field: string) => ({
    has: (v: any) => st[field].includes(v),
    toggle: (v: any) => setSt((s: any) => ({ ...s, [field]: s[field].includes(v) ? s[field].filter((x: any) => x !== v) : [...s[field], v] })),
    add: (v: any) => setSt((s: any) => ({ ...s, [field]: s[field].includes(v) ? s[field] : [...s[field], v] })),
    remove: (v: any) => setSt((s: any) => ({ ...s, [field]: s[field].filter((x: any) => x !== v) })),
  });

  // ---- realtime count deltas (other users' interactions on posts) ----
  const [realtimeDeltas, setRealtimeDeltas] = useState<Record<string, { likes: number; reposts: number }>>({});

  const bumpDelta = useCallback((postId: string, field: 'likes' | 'reposts', delta: number) => {
    setRealtimeDeltas(prev => ({
      ...prev,
      [postId]: {
        likes: (prev[postId]?.likes ?? 0) + (field === 'likes' ? delta : 0),
        reposts: (prev[postId]?.reposts ?? 0) + (field === 'reposts' ? delta : 0),
      },
    }));
  }, []);

  // ---- unread notification count ----
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const refreshUnread = useCallback(async (userId: string) => {
    const count = await getUnreadCount(userId);
    setUnreadNotifs(count);
  }, []);

  // ---- collections + DB-backed bookmarks ----
  const [collections, setCollections] = useState<any[]>([]);
  const refreshCollections = useCallback(async (userId: string) => {
    const data = await getCollections(userId);
    setCollections(data);
  }, []);

  const dbSave = {
    has: (postId: any) => st.saved.includes(postId),
    toggle: async (postId: any, collectionId?: string) => {
      const isSaved = st.saved.includes(postId);
      setSt((s: any) => ({ ...s, saved: isSaved ? s.saved.filter((x: any) => x !== postId) : [...s.saved, postId] }));
      if (!st.user?.id) return;
      try {
        if (isSaved) {
          await removeBookmark(st.user.id, postId);
        } else {
          await addBookmark(st.user.id, postId, collectionId);
        }
      } catch {}
    },
    addToCollection: async (postId: any, collectionId: string) => {
      if (!st.user?.id) return;
      setSt((s: any) => ({ ...s, saved: s.saved.includes(postId) ? s.saved : [...s.saved, postId] }));
      try { await addBookmark(st.user.id, postId, collectionId); } catch {}
    },
  };

  const createColl = useCallback(async (name: string, emoji?: string) => {
    if (!st.user?.id) return null;
    const coll = await createCollection(st.user.id, name, emoji);
    setCollections(prev => [...prev, coll]);
    return coll;
  }, [st.user?.id]);

  // ---- DB-backed like toggle ----
  const dbLike = {
    has: (postId: any) => st.liked.includes(postId),
    toggle: async (postId: any) => {
      const isLiked = st.liked.includes(postId);
      // Optimistic UI: update heart state + bump count delta immediately
      setSt((s: any) => ({ ...s, liked: isLiked ? s.liked.filter((x: any) => x !== postId) : [...s.liked, postId] }));
      bumpDelta(postId, 'likes', isLiked ? -1 : 1);
      if (!st.user?.id) return;
      try {
        if (isLiked) {
          await supabase.from('post_likes').delete().match({ user_id: st.user.id, post_id: postId });
        } else {
          await supabase.from('post_likes').insert({ user_id: st.user.id, post_id: postId });
          const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
          if (post?.user_id) {
            await createNotification({ userId: post.user_id, actorId: st.user.id, type: 'like', postId, body: 'liked your post' });
            notifyMentionedInPost({ postId, actorId: st.user.id, body: 'liked a post you were mentioned in', excludeUserId: post.user_id });
          }
        }
      } catch {}
    },
  };

  // ---- DB-backed repost toggle ----
  const dbRepost = {
    has: (postId: any) => st.reposted?.includes(postId) ?? false,
    toggle: async (postId: any) => {
      const isReposted = st.reposted?.includes(postId) ?? false;
      setSt((s: any) => ({ ...s, reposted: isReposted ? (s.reposted || []).filter((x: any) => x !== postId) : [...(s.reposted || []), postId] }));
      bumpDelta(postId, 'reposts', isReposted ? -1 : 1);
      if (!st.user?.id) return;
      try {
        if (isReposted) {
          await supabase.from('post_reposts').delete().match({ user_id: st.user.id, post_id: postId });
        } else {
          await supabase.from('post_reposts').insert({ user_id: st.user.id, post_id: postId });
          const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
          if (post?.user_id) {
            await createNotification({ userId: post.user_id, actorId: st.user.id, type: 'like', postId, body: 'reposted your post' });
          }
        }
      } catch {}
    },
  };

  // ---- Sync likes, reposts, bookmarks + unread notifs from DB when user logs in ----
  useEffect(() => {
    if (!st.user?.id) return;
    const userId = st.user.id;
    Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', userId),
      supabase.from('post_reposts').select('post_id').eq('user_id', userId),
      getBookmarkedPostIds(userId),
      supabase.from('follows').select('profiles!follows_following_id_fkey(id, handle)').eq('follower_id', userId),
      supabase.from('muted_users').select('muted_id').eq('user_id', userId),
      supabase.from('blocked_users').select('blocked_id').eq('user_id', userId),
      supabase.from('blocked_users').select('user_id').eq('blocked_id', userId),
    ]).then(([{ data: likes }, { data: reposts }, savedIds, { data: follows }, { data: mutes }, { data: blocks }, { data: blockedBy }]) => {
      const followedHandles = (follows ?? []).map((f: any) => f.profiles?.handle).filter(Boolean);
      const mutedIds = (mutes ?? []).map((m: any) => m.muted_id);
      const blockedIds = (blocks ?? []).map((b: any) => b.blocked_id);
      const blockedByIds = (blockedBy ?? []).map((b: any) => b.user_id);
      setSt((s: any) => ({
        ...s,
        liked: likes ? likes.map((r: any) => r.post_id) : s.liked,
        reposted: reposts ? reposts.map((r: any) => r.post_id) : (s.reposted || []),
        saved: savedIds.length ? savedIds : s.saved,
        // Always apply the fresh DB value — empty array means "no one" and is correct
        following: followedHandles,
        mutedUsers: mutedIds,
        blockedUsers: blockedIds,
        blockedByUsers: blockedByIds,
      }));
    }).catch(() => {});
    refreshUnread(userId);
    refreshCollections(userId);
  }, [st.user?.id, refreshUnread, refreshCollections]);

  // ---- Supabase Realtime: post counts + incoming notifications ----
  useEffect(() => {
    if (!st.user?.id) return;
    const userId = st.user.id;

    const channel = supabase
      .channel('honua-realtime-' + userId)
      // Someone liked a post
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_likes' }, (p: any) => {
        if (p.new.user_id === userId) return; // already handled optimistically
        bumpDelta(p.new.post_id, 'likes', 1);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_likes' }, (p: any) => {
        if (p.old.user_id === userId) return;
        bumpDelta(p.old.post_id, 'likes', -1);
      })
      // Someone reposted
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_reposts' }, (p: any) => {
        if (p.new.user_id === userId) return;
        bumpDelta(p.new.post_id, 'reposts', 1);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_reposts' }, (p: any) => {
        if (p.old.user_id === userId) return;
        bumpDelta(p.old.post_id, 'reposts', -1);
      })
      // Incoming notification for this user — bump badge + show in-app popup
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, async (p: any) => {
        setUnreadNotifs(n => n + 1);
        // Fetch actor profile for rich popup
        try {
          const actorId = p.new?.actor_id;
          const type = p.new?.type ?? '';
          const body = p.new?.body ?? '';
          if (!actorId) return;
          const { data: actor } = await supabase
            .from('profiles')
            .select('full_name, handle, avatar_url')
            .eq('id', actorId)
            .single();
          if (!actor) return;
          const actionLabel: Record<string, string> = {
            like: 'liked your post',
            comment: 'commented on your post',
            reply: 'replied to your comment',
            follow: 'started following you',
            message: 'sent you a message',
            repost: 'reposted your post',
          };
          const label = actionLabel[type] ?? body;
          toast({
            kind: 'notif',
            actor,
            msg: actor.full_name,
            sub: label,
            icon: type === 'like' ? 'heart' : type === 'comment' || type === 'reply' ? 'comment' : type === 'follow' ? 'user' : type === 'message' ? 'msg' : 'bell',
            notifType: type,
            postId: p.new?.post_id ?? null,
            actorHandle: actor.handle,
            duration: 5000,
          });
        } catch {}
      })
      // Someone blocked me — add them to blockedByUsers so their posts disappear
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blocked_users', filter: `blocked_id=eq.${userId}` }, (p: any) => {
        const blockerId = p.new?.user_id;
        if (blockerId) setSt((s: any) => ({ ...s, blockedByUsers: s.blockedByUsers.includes(blockerId) ? s.blockedByUsers : [...s.blockedByUsers, blockerId] }));
      })
      // Someone unblocked me — remove them so their posts reappear immediately
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blocked_users', filter: `blocked_id=eq.${userId}` }, (p: any) => {
        const blockerId = p.old?.user_id;
        if (blockerId) setSt((s: any) => ({ ...s, blockedByUsers: s.blockedByUsers.filter((id: string) => id !== blockerId) }));
      })
      .subscribe();

    // Polling fallback: re-check unread count every 20s so notifications show
    // even if the Realtime subscription for notifications isn't active yet.
    const poll = setInterval(async () => {
      const count = await getUnreadCount(userId);
      setUnreadNotifs(count);
    }, 20_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [st.user?.id, bumpDelta]);

  // login / logout are now thin wrappers — the auth listener does the real state update
  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // navigation handled by onAuthStateChange SIGNED_IN
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  }, []);

  const loginWithApple = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  }, []);

  const signup = useCallback(async (email: string, password: string, metadata: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    // Email users complete onboarding through the signup wizard — mark done immediately
    if (data.user) {
      try { await updateProfile(data.user.id, { onboarding_complete: true }); } catch {}
    }
    return data; // { user, session } — session is null if email confirmation required
  }, []);

  const completeOAuthOnboarding = useCallback(async (fields: {
    name: string; handle: string; location: string; bio: string;
    interests: string[]; avatarFile?: File | null;
  }) => {
    const userId = st.user?.id;
    if (!userId) return;
    let avatar_url = st.user?.avatar ?? null;
    if (fields.avatarFile) {
      avatar_url = await uploadFile("avatars", userId, fields.avatarFile);
    }
    await updateProfile(userId, {
      full_name: fields.name,
      handle: fields.handle,
      location: fields.location,
      bio: fields.bio,
      interests: fields.interests,
      avatar_url,
      onboarding_complete: true,
    });
    setSt((s: any) => ({
      ...s,
      needsOnboarding: false,
      user: {
        ...s.user,
        name: fields.name,
        handle: fields.handle,
        avatar: avatar_url,
      },
    }));
  }, [st.user]);

  const uploadAvatar = useCallback(async (userId: string, file: File) => {
    const url = await uploadFile("avatars", userId, file);
    await updateProfile(userId, { avatar_url: url });
    // Update local state so sidebar/header reflects immediately
    setSt((s: any) => ({ ...s, user: { ...s.user, avatar: url } }));
    return url;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    // navigation handled by onAuthStateChange SIGNED_OUT
  }, []);

  const ctx = {
    nav,
    toast, toasts, dismissToast,
    openModal, closeModal, modal,
    state: st, setState: setSt,
    authed: st.authed,
    user: st.user,
    session: st.session,
    login, loginWithGoogle, loginWithApple, signup, logout, uploadAvatar,
    needsOnboarding: !!st.needsOnboarding,
    completeOAuthOnboarding,
    realtimeDeltas,
    unreadNotifs, refreshUnread,
    markAllNotifsRead: async () => { if (st.user?.id) { await markAllRead(st.user.id); setUnreadNotifs(0); } },
    collections, createColl, refreshCollections,
    toggleDark: () => { setSt((s: any) => ({ ...s, dark: !s.dark })); toast({ msg: st.dark ? "Light mode" : "Dark mode", icon: "sparkles" }); },
    mutedUsers: st.mutedUsers as string[],
    blockedUsers: st.blockedUsers as string[],
    blockedByUsers: st.blockedByUsers as string[],
    muteUser: async (targetId: string) => {
      if (!targetId || !st.user?.id) return;
      setSt((s: any) => ({ ...s, mutedUsers: s.mutedUsers.includes(targetId) ? s.mutedUsers : [...s.mutedUsers, targetId] }));
      try { await supabase.from('muted_users').insert({ user_id: st.user.id, muted_id: targetId }); } catch {}
    },
    unmuteUser: async (targetId: string) => {
      if (!targetId || !st.user?.id) return;
      setSt((s: any) => ({ ...s, mutedUsers: s.mutedUsers.filter((x: string) => x !== targetId) }));
      try { await supabase.from('muted_users').delete().match({ user_id: st.user.id, muted_id: targetId }); } catch {}
    },
    blockUser: async (targetId: string) => {
      if (!targetId || !st.user?.id) return;
      setSt((s: any) => ({ ...s, blockedUsers: s.blockedUsers.includes(targetId) ? s.blockedUsers : [...s.blockedUsers, targetId] }));
      try { await supabase.from('blocked_users').insert({ user_id: st.user.id, blocked_id: targetId }); } catch {}
    },
    unblockUser: async (targetId: string) => {
      if (!targetId || !st.user?.id) return;
      setSt((s: any) => ({ ...s, blockedUsers: s.blockedUsers.filter((x: string) => x !== targetId) }));
      try { await supabase.from('blocked_users').delete().match({ user_id: st.user.id, blocked_id: targetId }); } catch {}
    },
    like: dbLike, save: dbSave,
    follow: {
      has: (handle: any) => st.following.includes(handle),
      toggle: async (handle: any) => {
        if (!handle || !st.user?.id) return;
        const isFollowing = st.following.includes(handle);
        // Optimistic update
        setSt((s: any) => ({ ...s, following: isFollowing ? s.following.filter((x: any) => x !== handle) : [...s.following, handle] }));
        try {
          const { data: profile } = await supabase.from('profiles').select('id').eq('handle', handle).single();
          if (!profile?.id) return;
          if (isFollowing) {
            await supabase.from('follows').delete().match({ follower_id: st.user.id, following_id: profile.id });
          } else {
            await supabase.from('follows').insert({ follower_id: st.user.id, following_id: profile.id });
          }
        } catch {}
      },
      add: (handle: any) => setSt((s: any) => ({ ...s, following: s.following.includes(handle) ? s.following : [...s.following, handle] })),
      remove: (handle: any) => setSt((s: any) => ({ ...s, following: s.following.filter((x: any) => x !== handle) })),
    },
    repost: dbRepost,
    community: mk("joinedCommunities"), challenge: mk("joinedChallenges"), wishlist: mk("wishlist"),
    cart: st.cart, cartCount: st.cart.reduce((n: number, i: any) => n + (i.quantity || 1), 0),
    cartOpen: st.cartOpen,
    openCart: () => setSt((s: any) => ({ ...s, cartOpen: true })),
    closeCart: () => setSt((s: any) => ({ ...s, cartOpen: false })),
    addToCart: (item: any) => setSt((s: any) => {
      const existing = s.cart.findIndex((c: any) => c.id === item.id || c.name === item.name);
      if (existing >= 0) {
        const cart = [...s.cart];
        cart[existing] = { ...cart[existing], quantity: (cart[existing].quantity || 1) + 1 };
        return { ...s, cart };
      }
      return { ...s, cart: [...s.cart, { ...item, quantity: item.quantity || 1 }] };
    }),
    removeFromCart: (id: string) => setSt((s: any) => ({ ...s, cart: s.cart.filter((c: any) => (c.id || c.name) !== id) })),
    updateCartQty: (id: string, qty: number) => setSt((s: any) => {
      if (qty <= 0) return { ...s, cart: s.cart.filter((c: any) => (c.id || c.name) !== id) };
      return { ...s, cart: s.cart.map((c: any) => (c.id || c.name) === id ? { ...c, quantity: qty } : c) };
    }),
    clearCart: () => setSt((s: any) => ({ ...s, cart: [] })),
    drafts: st.drafts,
    addDraft: (d: any) => setSt((s: any) => ({ ...s, drafts: [...s.drafts, d] })),
  };

  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>;
}
