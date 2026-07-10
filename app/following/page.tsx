"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopFollowList } from "../../components/screens/follow-list";

export default function Page() {
  const { nav } = useApp();
  return <DesktopFollowList onNav={nav} params={{}} mode="following" />;
}
