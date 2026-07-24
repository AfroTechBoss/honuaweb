"use client";
import { use } from "react";
import { useApp } from "@/components/app-context";
import { DesktopOrderTracking } from "@/components/screens/orders";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { nav } = useApp();
  return <DesktopOrderTracking orderId={id} onNav={nav} />;
}
