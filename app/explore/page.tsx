"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopExplore } from "@/components/screens/home";

export default function Page() {
  const { nav } = useApp();
  return <DesktopExplore onNav={nav} params={{}} />;
}
