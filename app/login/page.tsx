"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-context";
import { DesktopAuth } from "@/components/screens/desktop-misc";

// Surfaces an OAuth failure that /auth/callback redirected here with, so a
// failed Google/Apple sign-in shows a reason instead of a silent bounce.
function AuthErrorToast() {
  const { toast } = useApp();
  const params = useSearchParams();
  React.useEffect(() => {
    if (params.get("auth_error")) {
      toast?.({
        msg: "Couldn't complete sign-in",
        sub: "The link may have expired, or the provider isn't fully configured. Please try again.",
        kind: "error",
        icon: "close",
      });
      try { window.history.replaceState({}, "", "/login"); } catch {}
    }
  }, [params, toast]);
  return null;
}

export default function Page() {
  const { nav } = useApp();
  return (
    <>
      <Suspense fallback={null}><AuthErrorToast /></Suspense>
      <DesktopAuth onNav={nav} params={{}} />
    </>
  );
}
