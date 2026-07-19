"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopExplore } from "@/components/screens/home";
import { useSearchParams } from "next/navigation";

function ExploreInner() {
  const { nav } = useApp();
  const searchParams = useSearchParams();
  const tag = searchParams.get('tag') ?? undefined;
  return <DesktopExplore onNav={nav} params={{ tag }} />;
}

export default function Page() {
  return <React.Suspense><ExploreInner /></React.Suspense>;
}
