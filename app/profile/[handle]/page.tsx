"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopProfile } from "@/components/screens/profile";
import { useParams } from "next/navigation";

export default function Page() {
  const { nav } = useApp();
  const routeParams = useParams();
  return <DesktopProfile onNav={nav} params={{ handle: routeParams.handle }} />;
}
