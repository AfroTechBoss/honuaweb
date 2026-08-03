"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-context";
import { DesktopAuth } from "@/components/screens/desktop-misc";

// The two ways you can land on /login already having failed at something:
// middleware couldn't verify your session, or the OAuth callback came back
// empty-handed. Both now read as an inline message on the form rather than a
// toast — a notice that fades on a timer is the wrong home for the reason
// you're looking at this page.
const NOTICES: Record<string, string> = {
  session: "We couldn't verify your session, so you've been signed out. Please sign in again.",
  oauth: "Couldn't complete sign-in. The link may have expired, or the provider isn't fully configured. Please try again.",
};

// Reads the marker in a null-rendering sibling so useSearchParams' opt-out of
// static rendering stops at this boundary — wrapping DesktopAuth in the Suspense
// instead would leave the whole login screen blank until hydration.
function LoginNotice({ onNotice }: { onNotice: (msg: string) => void }) {
  const params = useSearchParams();
  const key = params.get("e") ?? (params.get("auth_error") ? "oauth" : "");
  React.useEffect(() => {
    if (!NOTICES[key]) return;
    onNotice(NOTICES[key]);
    // Strip the marker: on refresh it would re-raise a message about a trip
    // that's already over.
    try { window.history.replaceState({}, "", "/login"); } catch {}
  }, [key, onNotice]);
  return null;
}

export default function Page() {
  const { nav } = useApp();
  const [notice, setNotice] = React.useState("");
  return (
    <>
      <Suspense fallback={null}><LoginNotice onNotice={setNotice} /></Suspense>
      <DesktopAuth onNav={nav} params={{ notice }} />
    </>
  );
}
