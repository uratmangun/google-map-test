import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import { runPlaceSearchJson } from "@/lib/google-maps/search-place-result";

export const schema = {
  query: z
    .string()
    .min(1)
    .describe(
      "What to find: landmark + city, business name, or street address (e.g. 'Eiffel Tower Paris', 'coffee in Bandung')",
    ),
};

export const outputSchema = {
  query: z.string(),
  summaryText: z.string(),
  primary: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  map: z.object({
    center: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    zoom: z.number(),
  }),
  results: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    }),
  ),
};

export const metadata: ToolMetadata = {
  name: "search-place",
  description:
    "Find places by name or address. Returns coordinates, formatted addresses, alternate matches, and a map center for the top result. Use when the user asks where something is, needs lat/lng, or wants nearby place options.",
  annotations: {
    title: "Find a place",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function searchPlace({
  query,
}: InferSchema<typeof schema>) {
  try {
    const payload = await runPlaceSearchJson(query.trim());

    return {
      content: [
        {
          type: "text" as const,
          text: [
            payload.summaryText,
            "",
            "Use structuredContent.primary for coordinates; structuredContent.results lists alternates.",
          ].join("\n"),
        },
      ],
      structuredContent: payload,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Place search failed.";
    return {
      content: [
        {
          type: "text" as const,
          text: `Could not find "${query}". ${message}`,
        },
      ],
      isError: true,
    };
  }
}
