import {
  buildEmbedDirectionsUrl,
  type EmbedTravelMode,
} from "@/lib/google-maps/embed-map";
import { formatMapUrlToon } from "@/lib/google-maps/toon";
import { assertMcpQuotaAvailable } from "@/lib/maps-quota-guard";

export type DirectionsToolPayload = {
  mapUrl: string;
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
    mapUrl: buildEmbedDirectionsUrl(input),
  };
}

export async function buildShowDirectionsToolResult(input: ShowDirectionsInput) {
  const { mapUrl } = await buildShowDirectionsPayload(input);
  const structuredContent = {
    mapUrl,
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
