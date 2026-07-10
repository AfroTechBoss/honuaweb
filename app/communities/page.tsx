"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopForum } from "@/components/screens/desktop-rest";

export default function Page() {
  const { nav } = useApp();
  return <DesktopForum onNav={nav} params={{}} />;
}
