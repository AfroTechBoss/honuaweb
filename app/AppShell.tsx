"use client";
import React, { useEffect, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppProvider, useApp } from "@/components/app-context";
import { ToastHost } from "@/components/primitives";
import { ModalRoot } from "@/components/screens/desktop-rest";
import { MobileNav, MobileComposeFab } from "@/components/sidebar";
import { OAuthOnboardingFlow } from "@/components/screens/desktop-misc";
import { CartDrawer } from "@/components/cart-drawer";

const PUBLIC_PATHS = ["/login", "/terms", "/seller-policy", "/proposition", "/admin", "/checkout", "/orders", "/search", "/support", "/report", "/returns", "/marketplace"];

function Bone({ w, h, r = 8 }: { w: string | number; h: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'var(--line)',
      animation: 'skelPulse 1.4s ease-in-out infinite',
      flexShrink: 0,
    }} />
  );
}

function SidebarSkel() {
  return (
    <div className="desktop-sidebar" style={{ width: 72, borderRight: '1px solid var(--line)', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 24, flexShrink: 0 }}>
      <Bone w={40} h={40} r={12} />
      {[1,2,3,4,5,6].map(i => <Bone key={i} w={40} h={40} r={10} />)}
    </div>
  );
}

// Feed (home / explore)
function FeedSkeleton() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <SidebarSkel />
      <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
        <Bone w="38%" h={30} r={6} />
        {[1,2,3].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Bone w={40} h={40} r={20} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <Bone w="30%" h={14} r={4} />
                <Bone w="18%" h={11} r={4} />
              </div>
            </div>
            <Bone w="92%" h={14} r={4} />
            <Bone w="75%" h={14} r={4} />
            {i === 1 && <Bone w="100%" h={160} r={12} />}
          </div>
        ))}
      </div>
      <div className="right-panel" style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--line)', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Bone w="55%" h={18} r={6} />
        {[1,2,3,4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Bone w={36} h={36} r={18} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <Bone w="60%" h={13} r={4} />
              <Bone w="40%" h={11} r={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Marketplace — product grid
function MarketplaceSkeleton() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <SidebarSkel />
      <div style={{ flex: 1, padding: '28px 32px', overflow: 'hidden' }}>
        <Bone w="45%" h={36} r={6} />
        <div style={{ marginBottom: 8 }} />
        <Bone w="30%" h={14} r={4} />
        <div style={{ marginBottom: 16 }} />
        <Bone w="100%" h={200} r={16} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1,2,3,4,5].map(i => <Bone key={i} w={72} h={32} r={20} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden' }}>
              <Bone w="100%" h={160} r={0} />
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Bone w="45%" h={11} r={3} />
                <Bone w="80%" h={15} r={4} />
                <Bone w="35%" h={18} r={4} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Profile page
function ProfileSkeleton() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <SidebarSkel />
      <div style={{ flex: 1, padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Bone w="100%" h={180} r={0} />
        <div style={{ padding: '0 32px', display: 'flex', flexDirection: 'column', gap: 16, marginTop: -40 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <Bone w={80} h={80} r={40} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
              <Bone w="28%" h={20} r={5} />
              <Bone w="18%" h={13} r={4} />
            </div>
            <Bone w={100} h={36} r={10} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1,2,3,4].map(i => <Bone key={i} w={80} h={28} r={20} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, marginTop: 8 }}>
            {[1,2,3,4,5,6].map(i => <Bone key={i} w="100%" h={130} r={0} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Messages — conversation list + chat
function MessagesSkeleton() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <SidebarSkel />
      <div className="msg-list-col" style={{ width: 300, borderRight: '1px solid var(--line)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
        <Bone w="50%" h={22} r={5} />
        <Bone w="100%" h={38} r={10} />
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Bone w={44} h={44} r={22} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Bone w="55%" h={13} r={4} />
              <Bone w="80%" h={11} r={4} />
            </div>
          </div>
        ))}
      </div>
      <div className="msg-detail-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <Bone w={40} h={40} r={20} />
          <Bone w="20%" h={16} r={5} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
              <Bone w={i % 2 === 0 ? '45%' : '55%'} h={42} r={14} />
            </div>
          ))}
        </div>
        <Bone w="100%" h={48} r={12} />
      </div>
    </div>
  );
}

// Notifications — list
function NotificationsSkeleton() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <SidebarSkel />
      <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', maxWidth: 680 }}>
        <Bone w="30%" h={28} r={6} />
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <Bone w={42} h={42} r={21} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Bone w={`${50 + (i * 7) % 30}%`} h={13} r={4} />
              <Bone w="25%" h={11} r={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Settings / seller-dashboard / generic 2-col
function SettingsSkeleton() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <SidebarSkel />
      <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden', maxWidth: 720 }}>
        <Bone w="30%" h={28} r={6} />
        {[1,2,3].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '6px 22px' }}>
            {[1,2,3].map(j => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: j < 3 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Bone w={120} h={14} r={4} />
                  <Bone w={200} h={11} r={4} />
                </div>
                <Bone w={44} h={24} r={12} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppSkeleton({ path }: { path: string }) {
  if (path.startsWith('/marketplace')) return <MarketplaceSkeleton />;
  if (path.startsWith('/profile') || path.startsWith('/following') || path.startsWith('/followers')) return <ProfileSkeleton />;
  if (path.startsWith('/messages')) return <MessagesSkeleton />;
  if (path.startsWith('/notifications')) return <NotificationsSkeleton />;
  if (path.startsWith('/settings') || path.startsWith('/seller')) return <SettingsSkeleton />;
  return <FeedSkeleton />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { authed, authReady, needsOnboarding } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [hasStoredSession, setHasStoredSession] = React.useState(false);

  // Runs synchronously before first paint — check localStorage directly here
  // so we don't depend on AppProvider's effect (which fires after children)
  useLayoutEffect(() => {
    try {
      const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      setHasStoredSession(!!key && !!localStorage.getItem(key));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (!authed && !isPublic) router.replace("/login");
    if (authed && pathname === "/login") router.replace("/");
  }, [authReady, authed, pathname, router]);

  // Server renders nothing
  if (!ready) return null;

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const isAuthed = authed || hasStoredSession;

  // Not authed and no stored session — show skeleton until confirmed, then redirect
  if (!isAuthed && !isPublic) return <AppSkeleton path={pathname} />;

  return (
    <>
      {children}
      {needsOnboarding && <OAuthOnboardingFlow />}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div id="honua-app">
        <AuthGate>{children}</AuthGate>
      </div>
      <ToastHost />
      <ModalRoot />
      <CartDrawer />
      <MobileComposeFab />
      <MobileNav />
    </AppProvider>
  );
}
