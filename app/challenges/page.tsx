"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopTasks } from "@/components/screens/desktop-rest";

export default function Page() {
  const { nav } = useApp();
  return <DesktopTasks onNav={nav} params={{}} />;
}
