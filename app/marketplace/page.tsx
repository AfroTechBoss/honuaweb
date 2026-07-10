"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopMarketplace } from "@/components/screens/desktop-misc";

export default function Page() {
  const { nav } = useApp();
  return <DesktopMarketplace onNav={nav} params={{}} />;
}
