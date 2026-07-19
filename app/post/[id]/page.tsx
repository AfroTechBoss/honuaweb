"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopPostDetail } from "@/components/screens/profile";
import { useParams } from "next/navigation";

export default function Page() {
  const { nav } = useApp();
  const routeParams = useParams();
  return <DesktopPostDetail onNav={nav} params={{ id: routeParams.id }} />;
}
