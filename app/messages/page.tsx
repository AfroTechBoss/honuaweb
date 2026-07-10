"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopMessages } from "@/components/screens/desktop-misc";

export default function Page() {
  const { nav } = useApp();
  return <DesktopMessages onNav={nav} params={{}} />;
}
