import { assertMcpQuotaAvailable } from "@/lib/maps-quota-guard";

const STATIC_MAP_BASE = "https://maps.googleapis.com/maps/api/staticmap";

export type StaticMapMapType = "roadmap" | "satellite" | "terrain" | "hybrid";

export type StaticMapCoordinates = {
  latitude: number;
  longitude: number;
  zoom?: number;
  width?: number;
  height?: number;
  scale?: 1 | 2;
  maptype?: StaticMapMapType;
};

export function getGoogleMapsApiKey(): string {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing GOOGLE_MAPS_API_KEY. Add it to .env.local (see docs/google-maps-api-key.md).",
    );
  }
  return key;
}

export function buildStaticMapUrl(
  coords: StaticMapCoordinates,
  apiKey: string,
): string {
  const zoom = coords.zoom ?? 15;
  const width = coords.width ?? 640;
  const height = coords.height ?? 400;
  const scale = coords.scale ?? 2;
  const maptype = coords.maptype ?? "roadmap";
  const center = `${coords.latitude},${coords.longitude}`;

  const params = new URLSearchParams({
    center,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: String(scale),
    maptype,
    markers: `color:red|${center}`,
    key: apiKey,
  });

  return `${STATIC_MAP_BASE}?${params.toString()}`;
}

export async function fetchStaticMapImage(coords: StaticMapCoordinates) {
  await assertMcpQuotaAvailable("show-map-at-coordinates");

  const apiKey = getGoogleMapsApiKey();
  const zoom = coords.zoom ?? 15;
  const width = coords.width ?? 640;
  const height = coords.height ?? 400;
  const maptype = coords.maptype ?? "roadmap";

  const url = buildStaticMapUrl(coords, apiKey);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Static Maps API ${res.status}: ${body.slice(0, 300)}`);
  }

  const contentType = res.headers.get("content-type") ?? "image/png";
  const mimeType = contentType.split(";")[0]?.trim() || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());

  return {
    mimeType,
    data: buffer.toString("base64"),
    center: { latitude: coords.latitude, longitude: coords.longitude },
    zoom,
    maptype,
    size: { width, height },
  };
}
