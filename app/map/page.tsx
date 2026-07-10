"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopMap } from "@/components/screens/map-carbon";

export default function Page() {
  const { nav } = useApp();
  return <DesktopMap onNav={nav} params={{}} />;
}
