import {
  buildEmbedDirectionsUrl,
  type EmbedTravelMode,
} from "@/lib/google-maps/embed-map";
import { buildMapsDirectionsUrl } from "@/lib/google-maps/maps-links";
import { formatMapUrlToon } from "@/lib/google-maps/toon";
import { assertMcpQuotaAvailable } from "@/lib/maps-quota-guard";

export type DirectionsToolPayload = {
  mapUrl: string;
  embedUrl: string;
};

export type ShowDirectionsInput = {
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  mode?: EmbedTravelMode;
};

export async function buildShowDirectionsPayload(
  input: ShowDirectionsInput,
): Promise<DirectionsToolPayload> {
  await assertMcpQuotaAvailable("show-directions");
  return {
    mapUrl: buildMapsDirectionsUrl(input),
    embedUrl: buildEmbedDirectionsUrl(input),
  };
}

export async function buildShowDirectionsToolResult(input: ShowDirectionsInput) {
  const { mapUrl, embedUrl } = await buildShowDirectionsPayload(input);
  const structuredContent = {
    mapUrl,
    embedUrl,
    args: {
      originLatitude: input.originLatitude,
      originLongitude: input.originLongitude,
      destinationLatitude: input.destinationLatitude,
      destinationLongitude: input.destinationLongitude,
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
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
