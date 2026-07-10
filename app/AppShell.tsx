"use client";
import React from "react";
import { AppProvider } from "@/components/app-context";
import { ToastHost } from "@/components/primitives";
import { ModalRoot } from "@/components/screens/desktop-rest";

// Client root: wraps every page in the shared state provider and mounts
// the global toast + modal hosts once.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div id="honua-app">{children}</div>
      <ToastHost />
      <ModalRoot />
    </AppProvider>
  );
}
