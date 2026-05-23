import type { StaticMapMapType } from "@/lib/google-maps/static-map";
import { getGoogleMapsApiKey } from "@/lib/google-maps/static-map";

const EMBED_PLACE_BASE = "https://www.google.com/maps/embed/v1/place";

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
