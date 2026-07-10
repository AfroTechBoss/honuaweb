"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopCarbon } from "@/components/screens/map-carbon";

export default function Page() {
  const { nav } = useApp();
  return <DesktopCarbon onNav={nav} params={{}} />;
}
