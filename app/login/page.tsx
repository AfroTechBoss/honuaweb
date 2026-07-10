"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopAuth } from "@/components/screens/desktop-misc";

export default function Page() {
  const { nav } = useApp();
  return <DesktopAuth onNav={nav} params={{}} />;
}
