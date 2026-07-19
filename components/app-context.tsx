"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/storage";
import { updateProfile } from "@/lib/profile";

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
    case "messages": return "/messages";
    case "forum": return "/communities";
    case "tasks": return "/challenges";
    case "profile": return params?.handle ? `/profile/${params.handle}` : "/profile";
    case "followers": return params?.handle ? `/followers/${params.handle}` : "/followers";
    case "following": return params?.handle ? `/following/${params.handle}` : "/following";
    case "post": return `/post/${params?.id ?? 1}`;
    case "settings": return "/settings";
    case "auth": return "/login";
    case "sell": return "/sell";
    case "seller": return "/seller";
    case "admin": return "/admin";
    default: return "/";
  }
}

const STATE_DEFAULTS: any = {
  liked: [],
  reposted: [],
  saved: [],
  following: ["sarahgreen", "greentech"],
  joinedCommunities: ["Urban gardeners", "Solar DIY", "Ocean cleanup crew"],
  joinedChallenges: [1, 2],
  cart: [
    { name: "Refillable shampoo bar", price: "$12" },
    { name: "Solar phone charger", price: "$48" },
    { name: "Bamboo cutlery set", price: "$18" },
  ],
  wishlist: [],
  drafts: [],
  dark: false,
  sellerStatus: "none",
  sellerShop: null,
  authed: false,
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
      const base = {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.email?.split("@")[0] || "You",
        handle: u.user_metadata?.handle || u.email?.split("@")[0] || "you",
        avatar: u.user_metadata?.avatar_url || null,
      };
      setSt((s: any) => ({ ...s, authed: true, session, user: base }));
      // Fetch the profiles row to get the real avatar_url / handle / name
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, handle, avatar_url, cover_url")
          .eq("id", u.id)
          .single();
        if (profile) {
          setSt((s: any) => ({
            ...s,
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

    // Set initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) hydrateUser(session);
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

  // ---- DB-backed like toggle ----
  const dbLike = {
    has: (postId: any) => st.liked.includes(postId),
    toggle: async (postId: any) => {
      const isLiked = st.liked.includes(postId);
      // Optimistic local update immediately
      setSt((s: any) => ({ ...s, liked: isLiked ? s.liked.filter((x: any) => x !== postId) : [...s.liked, postId] }));
      if (!st.user?.id) return;
      try {
        if (isLiked) {
          await supabase.from('post_likes').delete().match({ user_id: st.user.id, post_id: postId });
        } else {
          await supabase.from('post_likes').insert({ user_id: st.user.id, post_id: postId });
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
      if (!st.user?.id) return;
      try {
        if (isReposted) {
          await supabase.from('post_reposts').delete().match({ user_id: st.user.id, post_id: postId });
        } else {
          await supabase.from('post_reposts').insert({ user_id: st.user.id, post_id: postId });
        }
      } catch {}
    },
  };

  // ---- Sync likes + reposts from DB when user logs in ----
  useEffect(() => {
    if (!st.user?.id) return;
    const userId = st.user.id;
    Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', userId),
      supabase.from('post_reposts').select('post_id').eq('user_id', userId),
    ]).then(([{ data: likes }, { data: reposts }]) => {
      setSt((s: any) => ({
        ...s,
        liked: likes ? likes.map((r: any) => r.post_id) : s.liked,
        reposted: reposts ? reposts.map((r: any) => r.post_id) : (s.reposted || []),
      }));
    }).catch(() => {});
  }, [st.user?.id]);

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
    return data; // { user, session } — session is null if email confirmation required
  }, []);

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
    toggleDark: () => { setSt((s: any) => ({ ...s, dark: !s.dark })); toast({ msg: st.dark ? "Light mode" : "Dark mode", icon: "sparkles" }); },
    like: dbLike, save: mk("saved"), follow: mk("following"),
    repost: dbRepost,
    community: mk("joinedCommunities"), challenge: mk("joinedChallenges"), wishlist: mk("wishlist"),
    cart: st.cart, cartCount: st.cart.length,
    addToCart: (item: any) => setSt((s: any) => ({ ...s, cart: [...s.cart, item] })),
    removeFromCart: (i: number) => setSt((s: any) => ({ ...s, cart: s.cart.filter((_: any, idx2: number) => idx2 !== i) })),
    drafts: st.drafts,
    addDraft: (d: any) => setSt((s: any) => ({ ...s, drafts: [...s.drafts, d] })),
  };

  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>;
}
