import { buildEmbedViewUrl } from "@/lib/google-maps/embed-map";
import { buildMapsViewUrl } from "@/lib/google-maps/maps-links";
import { formatMapUrlToon } from "@/lib/google-maps/toon";
import { assertMcpQuotaAvailable } from "@/lib/maps-quota-guard";

export type MapToolPayload = {
  /** Google Maps link (opens in browser). */
  mapUrl: string;
  /** Maps Embed API URL for iframes only. */
  embedUrl: string;
};

export type ShowMapInput = {
  latitude: number;
  longitude: number;
  zoom?: number;
  maptype?: "roadmap" | "satellite" | "terrain" | "hybrid";
};

export async function buildShowMapPayload(
  input: ShowMapInput,
): Promise<MapToolPayload> {
  await assertMcpQuotaAvailable("show-map-at-coordinates");
  return {
    mapUrl: buildMapsViewUrl(input),
    embedUrl: buildEmbedViewUrl(input),
  };
}

export async function buildShowMapToolResult(input: ShowMapInput) {
  const { mapUrl, embedUrl } = await buildShowMapPayload(input);
  const structuredContent = {
    mapUrl,
    embedUrl,
    args: {
      latitude: input.latitude,
      longitude: input.longitude,
      ...(input.zoom !== undefined ? { zoom: input.zoom } : {}),
      ...(input.maptype !== undefined ? { maptype: input.maptype } : {}),
    },
  };
  return {
    content: [
      {
        type: "text" as const,
        text: formatMapUrlToon(mapUrl),
      },
    ],
    structuredContent,
  };
}
