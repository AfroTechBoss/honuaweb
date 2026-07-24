"use client";
import React, { use } from "react";
import { useApp } from "@/components/app-context";
import { DesktopProductDetail } from "@/components/screens/product-detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { nav } = useApp();
  return <DesktopProductDetail id={id} onNav={nav} />;
}
