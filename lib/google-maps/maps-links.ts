import type { EmbedTravelMode } from "@/lib/google-maps/embed-map";

function formatLatLng(latitude: number, longitude: number): string {
  return `${latitude},${longitude}`;
}

/** Opens in Google Maps (browser / app). No API key. */
export function buildMapsViewUrl(input: {
  latitude: number;
  longitude: number;
  zoom?: number;
}): string {
  const params = new URLSearchParams({
    api: "1",
    query: formatLatLng(input.latitude, input.longitude),
  });
  if (input.zoom !== undefined) {
    params.set("zoom", String(input.zoom));
  }
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

const TRAVEL_MODE_TO_GOOGLE: Record<EmbedTravelMode, string> = {
  driving: "driving",
  walking: "walking",
  bicycling: "bicycling",
  transit: "transit",
};

/** Route preview in Google Maps (browser / app). No API key. */
export function buildMapsDirectionsUrl(input: {
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  mode?: EmbedTravelMode;
}): string {
  const params = new URLSearchParams({
    api: "1",
    origin: formatLatLng(input.originLatitude, input.originLongitude),
    destination: formatLatLng(
      input.destinationLatitude,
      input.destinationLongitude,
    ),
    travelmode: TRAVEL_MODE_TO_GOOGLE[input.mode ?? "driving"],
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Street View in Google Maps (browser / app). No API key. */
export function buildMapsStreetViewUrl(input: {
  latitude: number;
  longitude: number;
  heading?: number;
  pitch?: number;
}): string {
  const params = new URLSearchParams({
    api: "1",
    map_action: "pano",
    viewpoint: formatLatLng(input.latitude, input.longitude),
  });
  if (input.heading !== undefined) {
    params.set("heading", String(input.heading));
  }
  if (input.pitch !== undefined) {
    params.set("pitch", String(input.pitch));
  }
  return `https://www.google.com/maps/@?${params.toString()}`;
}
