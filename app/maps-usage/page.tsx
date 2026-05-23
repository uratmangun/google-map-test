import { MapsQuotaDashboard } from "@/components/maps-quota-dashboard";

export const metadata = {
  title: "Maps quota · google-map-test",
  description: "Estimated Google Maps free-tier usage and quota alerts",
};

export default function MapsUsagePage() {
  return (
    <div className="maps-quota-light">
      <MapsQuotaDashboard />
    </div>
  );
}
