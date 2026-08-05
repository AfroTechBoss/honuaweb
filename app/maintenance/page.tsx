import { redirect } from "next/navigation";
import { readPlatform } from "@/lib/platform-server";
import { DEFAULT_MAINTENANCE_MESSAGE } from "@/lib/platform";
import { MaintenanceScreen } from "@/components/screens/maintenance";

// Where middleware.ts sends everyone while maintenance mode is on.
//
// A server component, so the settings row is read once here rather than by
// every visitor's browser, and so the redirect below happens before anything
// renders. Not cached: the entire point of this page is to stop being correct.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Honua — back shortly",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ maintenanceMode, maintenanceMessage }, params] = await Promise.all([
    readPlatform(),
    searchParams,
  ]);

  // Maintenance is over — or this page was found by someone typing the URL.
  // Either way there is nothing to say, and a permanent "we're down" page
  // reachable on a working site is its own small outage.
  if (!maintenanceMode) redirect(params?.from && params.from.startsWith("/") ? params.from : "/");

  return (
    <MaintenanceScreen
      message={maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE}
      // Only ever a path on this site. An open redirect on the one page that is
      // guaranteed to be reachable signed-out would be a poor place to have one.
      from={params?.from && params.from.startsWith("/") && !params.from.startsWith("//") ? params.from : null}
    />
  );
}
