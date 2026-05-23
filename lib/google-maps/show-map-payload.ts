import { buildEmbedViewUrl } from "@/lib/google-maps/embed-map";
import { formatMapUrlToon } from "@/lib/google-maps/toon";
import { assertMcpQuotaAvailable } from "@/lib/maps-quota-guard";

export type MapToolPayload = {
  mapUrl: string;
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
    mapUrl: buildEmbedViewUrl(input),
  };
}

export async function buildShowMapToolResult(input: ShowMapInput) {
  const { mapUrl } = await buildShowMapPayload(input);
  const structuredContent = {
    mapUrl,
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
