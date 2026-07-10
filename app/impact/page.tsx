"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopImpact } from "@/components/screens/impact";

export default function Page() {
  const { nav } = useApp();
  return <DesktopImpact onNav={nav} params={{}} />;
}
