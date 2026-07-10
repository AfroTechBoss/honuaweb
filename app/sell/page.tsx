"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopSell } from "@/components/screens/seller";

export default function Page() {
  const { nav } = useApp();
  return <DesktopSell onNav={nav} params={{}} />;
}
