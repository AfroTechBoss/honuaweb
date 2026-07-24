"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { CommunityPostDetail } from "@/components/screens/desktop-rest";
import { useParams } from "next/navigation";

export default function Page() {
  const { nav } = useApp();
  const routeParams = useParams();
  const slug = Array.isArray(routeParams.slug) ? routeParams.slug[0] : routeParams.slug ?? "";
  const id = Array.isArray(routeParams.id) ? routeParams.id[0] : routeParams.id ?? "";
  return <CommunityPostDetail slug={slug} postId={id} onNav={nav} />;
}
