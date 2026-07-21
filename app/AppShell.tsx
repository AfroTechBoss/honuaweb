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
  if (!authReady) return null;

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
