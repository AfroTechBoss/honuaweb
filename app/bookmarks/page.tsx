"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopBookmarks } from "@/components/screens/desktop-rest";

export default function Page() {
  const { nav } = useApp();
  return <DesktopBookmarks onNav={nav} params={{}} />;
}
