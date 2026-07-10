"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopSettings } from "@/components/screens/desktop-rest";

export default function Page() {
  const { nav } = useApp();
  return <DesktopSettings onNav={nav} params={{}} />;
}
