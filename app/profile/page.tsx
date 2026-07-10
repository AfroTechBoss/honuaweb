"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopProfile } from "@/components/screens/profile";

export default function Page() {
  const { nav } = useApp();
  return <DesktopProfile onNav={nav} params={{}} />;
}
