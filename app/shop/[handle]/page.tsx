"use client";
import React, { use } from "react";
import { useApp } from "@/components/app-context";
import { DesktopStorefront } from "@/components/screens/storefront";

export default function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const { nav } = useApp();
  return <DesktopStorefront handle={decodeURIComponent(handle)} onNav={nav} />;
}
