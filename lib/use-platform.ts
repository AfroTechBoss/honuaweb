"use client";
import React from "react";
import { OPEN_PLATFORM, type PublicPlatform } from "@/lib/platform";

// Reads GET /api/platform once per mount for the screens that need to know
// before a visitor commits to something — currently the sign-up flow.
//
// Starts from OPEN_PLATFORM and stays there if the fetch fails, matching the
// server's posture exactly: a settings read that does not come back must not
// close a door that is actually open. `loaded` is separate from the values so a
// caller can hold off on the "sign-ups are closed" panel for the one frame it
// takes to find out, rather than flashing it at everyone.

export function usePlatform() {
  const [platform, setPlatform] = React.useState<PublicPlatform>(OPEN_PLATFORM);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch('/api/platform')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (alive && data) setPlatform(data as PublicPlatform); })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  return { ...platform, loaded };
}
