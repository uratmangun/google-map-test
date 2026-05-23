import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import { fetchStaticMapImage } from "@/lib/google-maps/static-map";

export const schema = {
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .describe("Latitude from search-place structuredContent.primary"),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .describe("Longitude from search-place structuredContent.primary"),
  zoom: z
    .number()
    .int()
    .min(1)
    .max(21)
    .optional()
    .describe("Map zoom level (default 15)"),
  maptype: z
    .enum(["roadmap", "satellite", "terrain", "hybrid"])
    .optional()
    .describe("Map style (default roadmap)"),
};

export const outputSchema = {
  center: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  zoom: z.number(),
  maptype: z.string(),
  mimeType: z.string(),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
};

export const metadata: ToolMetadata = {
  name: "show-map-at-coordinates",
  description:
    "Render a static map image for a latitude/longitude. Use after search-place when the user wants to see the location on a map. Returns a PNG image plus JSON metadata.",
  annotations: {
    title: "Show map at coordinates",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function showMapAtCoordinates({
  latitude,
  longitude,
  zoom,
  maptype,
}: InferSchema<typeof schema>) {
  try {
    const image = await fetchStaticMapImage({
      latitude,
      longitude,
      zoom,
      maptype,
    });

    const structuredContent = {
      center: image.center,
      zoom: image.zoom,
      maptype: image.maptype,
      mimeType: image.mimeType,
      size: image.size,
    };

    return {
      content: [
        {
          type: "image" as const,
          data: image.data,
          mimeType: image.mimeType,
        },
        {
          type: "text" as const,
          text: JSON.stringify(structuredContent, null, 2),
        },
      ],
      structuredContent,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Static map request failed.";
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: message,
              latitude,
              longitude,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
