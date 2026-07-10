"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Route key -> URL path. Mirrors the prototype's ROUTES registry, but
// navigation now drives the real Next.js router.
export function pathFor(key: string, params: any = {}): string {
  switch (key) {
    case "home": return "/";
    case "explore": return "/explore";
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
    try { localStorage.setItem(LS_STATE, JSON.stringify(st)); } catch {}
  }, [st]);
  useEffect(() => {
    document.body.classList.toggle("dark", !!st.dark);
  }, [st.dark]);

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

  const login = useCallback((userData: any) => {
    setSt((s: any) => ({ ...s, authed: true, user: userData }));
    router.push("/");
  }, [router]);

  const logout = useCallback(() => {
    setSt((s: any) => ({ ...s, authed: false, user: null }));
    router.push("/login");
  }, [router]);

  const ctx = {
    nav,
    toast, toasts, dismissToast,
    openModal, closeModal, modal,
    state: st, setState: setSt,
    authed: st.authed,
    user: st.user,
    login, logout,
    toggleDark: () => { setSt((s: any) => ({ ...s, dark: !s.dark })); toast({ msg: st.dark ? "Light mode" : "Dark mode", icon: "sparkles" }); },
    like: mk("liked"), save: mk("saved"), follow: mk("following"),
    community: mk("joinedCommunities"), challenge: mk("joinedChallenges"), wishlist: mk("wishlist"),
    cart: st.cart, cartCount: st.cart.length,
    addToCart: (item: any) => setSt((s: any) => ({ ...s, cart: [...s.cart, item] })),
    removeFromCart: (i: number) => setSt((s: any) => ({ ...s, cart: s.cart.filter((_: any, idx2: number) => idx2 !== i) })),
    drafts: st.drafts,
    addDraft: (d: any) => setSt((s: any) => ({ ...s, drafts: [...s.drafts, d] })),
  };

  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>;
}
