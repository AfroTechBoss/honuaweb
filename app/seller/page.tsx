"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopSellerDashboard } from "@/components/screens/seller-dash";

export default function Page() {
  const { nav } = useApp();
  return <DesktopSellerDashboard onNav={nav} params={{}} />;
}
