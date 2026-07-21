"use client";
import React, { useEffect, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppProvider, useApp } from "@/components/app-context";
import { ToastHost } from "@/components/primitives";
import { ModalRoot } from "@/components/screens/desktop-rest";
import { MobileNav } from "@/components/sidebar";
import { OAuthOnboardingFlow } from "@/components/screens/desktop-misc";

const PUBLIC_PATHS = ["/login", "/terms", "/seller-policy", "/proposition"];

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

function AppSkeleton() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <style>{`@keyframes skelPulse { 0%,100%{opacity:.45} 50%{opacity:.9} }`}</style>
      <div style={{ width: 72, borderRight: '1px solid var(--line)', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 24, flexShrink: 0 }}>
        <Bone w={40} h={40} r={12} />
        {[1,2,3,4,5,6].map(i => <Bone key={i} w={40} h={40} r={10} />)}
      </div>
      <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        <Bone w="40%" h={28} r={6} />
        {[1,2,3].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Bone w={40} h={40} r={20} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <Bone w="35%" h={14} r={4} />
                <Bone w="22%" h={11} r={4} />
              </div>
            </div>
            <Bone w="90%" h={14} r={4} />
            <Bone w="70%" h={14} r={4} />
          </div>
        ))}
      </div>
      <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--line)', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Bone w="50%" h={18} r={6} />
        {[1,2,3].map(i => (
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

function AuthGate({ children }: { children: React.ReactNode }) {
  const { authed, authReady, needsOnboarding } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  // Stays false during SSR; flips to true synchronously before first browser paint
  const [clientReady, setClientReady] = React.useState(false);
  useLayoutEffect(() => { setClientReady(true); }, []);

  useEffect(() => {
    if (!authReady) return;
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (!authed && !isPublic) router.replace("/login");
    if (authed && pathname === "/login") router.replace("/");
  }, [authReady, authed, pathname, router]);

  // Server renders nothing — skeleton never reaches the browser as HTML
  if (!clientReady) return null;
  // Client: show skeleton only while auth check is still in-flight
  if (!authReady) return <AppSkeleton />;

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (!authed && !isPublic) return null;

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
      <MobileNav />
    </AppProvider>
  );
}
