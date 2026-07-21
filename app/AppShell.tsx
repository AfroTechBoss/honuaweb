"use client";
import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppProvider, useApp } from "@/components/app-context";
import { ToastHost } from "@/components/primitives";
import { ModalRoot } from "@/components/screens/desktop-rest";
import { MobileNav } from "@/components/sidebar";
import { OAuthOnboardingFlow } from "@/components/screens/desktop-misc";

const PUBLIC_PATHS = ["/login", "/terms", "/seller-policy", "/proposition"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { authed, authReady, needsOnboarding } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (!authed && !isPublic) router.replace("/login");
    if (authed && pathname === "/login") router.replace("/");
  }, [authReady, authed, pathname, router]);

  // Wait silently until Supabase resolves the session — no flash
  if (!authReady) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--line)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

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
