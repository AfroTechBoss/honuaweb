"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopFollowList } from "../../../components/screens/follow-list";
import { useParams } from "next/navigation";

export default function Page() {
  const { nav } = useApp();
  const routeParams = useParams();
  return <DesktopFollowList onNav={nav} params={{ handle: routeParams.handle }} mode="followers" />;
}
