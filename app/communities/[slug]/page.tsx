"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/components/app-context";
import { CommunityFeedPage } from "@/components/screens/desktop-rest";

export default function Page() {
  const { nav } = useApp();
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : "";
  return <CommunityFeedPage slug={slug} onNav={nav} />;
}
