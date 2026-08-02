"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { trackPageview } from "@/lib/analytics";

/**
 * Fires one pageview per route change. Renders nothing.
 *
 * Mounted once in AppShell, outside AuthGate — signed-out visits on /login,
 * /marketplace, and the other public routes are traffic too, and leaving them
 * out would make the acquisition breakdown meaningless.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (pathname) trackPageview(pathname);
  }, [pathname]);

  return null;
}
