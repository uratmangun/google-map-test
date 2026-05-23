import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { MapsQuotaAlertsPanel } from "@/components/maps-quota-alerts-panel";

export const metadata = {
  title: "Quota alerts · google-map-test",
  description: "Configure Google Maps free-tier email alerts",
};

export default async function MapsQuotaAlertsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="maps-quota-light">
      <MapsQuotaAlertsPanel
        userEmail={session?.user.email ?? null}
        userName={session?.user.name ?? null}
      />
    </div>
  );
}
