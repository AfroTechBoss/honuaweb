"use client";
import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppProvider, useApp } from "@/components/app-context";
import { ToastHost } from "@/components/primitives";
import { ModalRoot } from "@/components/screens/desktop-rest";

const PUBLIC_PATHS = ["/login", "/terms"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { authed, state } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    // Wait one tick so localStorage-hydrated state is loaded
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (!authed && !isPublic) router.replace("/login");
    if (authed && pathname === "/login") router.replace("/");
  }, [ready, authed, pathname, router]);

  if (!ready) return null;

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (!authed && !isPublic) return null;

  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div id="honua-app">
        <AuthGate>{children}</AuthGate>
      </div>
      <ToastHost />
      <ModalRoot />
    </AppProvider>
  );
}
