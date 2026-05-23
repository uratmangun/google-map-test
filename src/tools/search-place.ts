import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import { runPlaceSearchJson } from "@/lib/google-maps/search-place-result";

const placeDetailSchema = z.object({
  rank: z.number().describe("Relevance rank on this page (1 = best match)"),
  id: z.string(),
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  rating: z.number().nullable(),
  userRatingCount: z.number().nullable(),
  website: z.string().nullable(),
  phone: z.string().nullable(),
  googleMapsUri: z.string().nullable().describe("Google Maps profile / place URL"),
  businessStatus: z.string().nullable(),
  primaryType: z.string().nullable(),
  types: z.array(z.string()),
});

export const schema = {
  query: z
    .string()
    .min(1)
    .describe(
      "What to find: landmark, business, area, or list query (e.g. 'restaurants in Jakarta')",
    ),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Places per page, 1–20 (default 3, sorted by relevance)."),
  pageToken: z
    .string()
    .optional()
    .describe(
      "Pagination token from a prior response's nextPageToken. Use the same query as the first page.",
    ),
};

export const outputSchema = {
  query: z.string(),
  pageSize: z.number(),
  pageToken: z.string().optional(),
  nextPageToken: z.string().optional(),
  hasMore: z.boolean(),
  sortedBy: z.literal("relevance"),
  summaryText: z.string(),
  primary: placeDetailSchema,
  map: z.object({
    center: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    zoom: z.number(),
  }),
  results: z.array(placeDetailSchema),
};

export const metadata: ToolMetadata = {
  name: "search-place",
  description:
    "Find places by text query (default 3 per page, relevance order). Returns rating, phone, website, Maps profile URL, and coordinates. Paginate with pageToken=nextPageToken. Use show-map-at-coordinates for a map image.",
  annotations: {
    title: "Find a place",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function searchPlace({
  query,
  pageSize,
  pageToken,
}: InferSchema<typeof schema>) {
  try {
    const payload = await runPlaceSearchJson(query.trim(), {
      pageSize,
      pageToken,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(payload, null, 2),
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
          text: JSON.stringify({ error: message, query }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
