import { buildEmbedStreetViewUrl } from "@/lib/google-maps/embed-map";
import { buildMapsStreetViewUrl } from "@/lib/google-maps/maps-links";
import { formatMapUrlToon } from "@/lib/google-maps/toon";
import { assertMcpQuotaAvailable } from "@/lib/maps-quota-guard";

export type StreetViewToolPayload = {
  mapUrl: string;
  embedUrl: string;
};

export type ShowStreetViewInput = {
  latitude: number;
  longitude: number;
  heading?: number;
  pitch?: number;
  fov?: number;
};

export async function buildShowStreetViewPayload(
  input: ShowStreetViewInput,
): Promise<StreetViewToolPayload> {
  await assertMcpQuotaAvailable("show-street-view");
  return {
    mapUrl: buildMapsStreetViewUrl(input),
    embedUrl: buildEmbedStreetViewUrl(input),
  };
}

export async function buildShowStreetViewToolResult(input: ShowStreetViewInput) {
  const { mapUrl, embedUrl } = await buildShowStreetViewPayload(input);
  const structuredContent = {
    mapUrl,
    embedUrl,
    args: {
      latitude: input.latitude,
      longitude: input.longitude,
      ...(input.heading !== undefined ? { heading: input.heading } : {}),
      ...(input.pitch !== undefined ? { pitch: input.pitch } : {}),
      ...(input.fov !== undefined ? { fov: input.fov } : {}),
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
