"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-context";
import { DesktopMessages } from "@/components/screens/desktop-misc";

export default function Page() {
  const { nav } = useApp();
  const searchParams = useSearchParams();
  const handle = searchParams.get("handle");
  const shop = searchParams.get("shop");
  return <DesktopMessages onNav={nav} params={handle ? { handle, shop } : {}} />;
}
