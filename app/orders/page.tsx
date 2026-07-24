"use client";
import { useApp } from "@/components/app-context";
import { DesktopOrders } from "@/components/screens/orders";

export default function Page() {
  const { nav } = useApp();
  return <DesktopOrders onNav={nav} />;
}
