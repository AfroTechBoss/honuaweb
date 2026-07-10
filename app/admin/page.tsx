"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopAdmin } from "@/components/screens/admin";

export default function Page() {
  const { nav } = useApp();
  return <DesktopAdmin onNav={nav} params={{}} />;
}
