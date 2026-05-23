import type { StaticMapMapType } from "@/lib/google-maps/static-map";
import { getGoogleMapsApiKey } from "@/lib/google-maps/static-map";

const EMBED_PLACE_BASE = "https://www.google.com/maps/embed/v1/place";
const EMBED_DIRECTIONS_BASE = "https://www.google.com/maps/embed/v1/directions";
const EMBED_STREETVIEW_BASE = "https://www.google.com/maps/embed/v1/streetview";

export type EmbedTravelMode = "driving" | "walking" | "bicycling" | "transit";

/** Embed API supports roadmap and satellite only. */
function toEmbedMapType(maptype: StaticMapMapType): "roadmap" | "satellite" {
  return maptype === "satellite" ? "satellite" : "roadmap";
}

/** Place mode shows a pin at `q` (lat,lng). View mode does not render a marker. */
export function buildEmbedViewUrl(coords: {
  latitude: number;
  longitude: number;
  zoom?: number;
  maptype?: StaticMapMapType;
}): string {
  const zoom = coords.zoom ?? 15;
  const maptype = toEmbedMapType(coords.maptype ?? "roadmap");
  const params = new URLSearchParams({
    key: getGoogleMapsApiKey(),
    q: `${coords.latitude},${coords.longitude}`,
    zoom: String(zoom),
    maptype,
  });
  return `${EMBED_PLACE_BASE}?${params.toString()}`;
}

function formatLatLng(latitude: number, longitude: number): string {
  return `${latitude},${longitude}`;
}

/** Directions mode: route preview from origin to destination (Maps Embed API). */
export function buildEmbedDirectionsUrl(input: {
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  mode?: EmbedTravelMode;
}): string {
  const params = new URLSearchParams({
    key: getGoogleMapsApiKey(),
    origin: formatLatLng(input.originLatitude, input.originLongitude),
    destination: formatLatLng(
      input.destinationLatitude,
      input.destinationLongitude,
    ),
    mode: input.mode ?? "driving",
  });
  return `${EMBED_DIRECTIONS_BASE}?${params.toString()}`;
}

/** Street View mode: interactive panorama at a location (Maps Embed API). */
export function buildEmbedStreetViewUrl(input: {
  latitude: number;
  longitude: number;
  heading?: number;
  pitch?: number;
  fov?: number;
}): string {
  const params = new URLSearchParams({
    key: getGoogleMapsApiKey(),
    location: formatLatLng(input.latitude, input.longitude),
  });
  if (input.heading !== undefined) {
    params.set("heading", String(input.heading));
  }
  if (input.pitch !== undefined) {
    params.set("pitch", String(input.pitch));
  }
  if (input.fov !== undefined) {
    params.set("fov", String(input.fov));
  }
  return `${EMBED_STREETVIEW_BASE}?${params.toString()}`;
}
