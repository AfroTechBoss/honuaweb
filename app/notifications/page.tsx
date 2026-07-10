"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopNotifications } from "@/components/screens/desktop-misc";

export default function Page() {
  const { nav } = useApp();
  return <DesktopNotifications onNav={nav} params={{}} />;
}
