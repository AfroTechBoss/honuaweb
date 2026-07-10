"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopHome } from "@/components/screens/home";

export default function Page() {
  const { nav } = useApp();
  return <DesktopHome onNav={nav} params={{}} />;
}
