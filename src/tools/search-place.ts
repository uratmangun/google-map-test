import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import {
  runPlaceSearchSlim,
  toSearchPlaceToolResult,
} from "@/lib/google-maps/search-place-result";

export const schema = {
  query: z
    .string()
    .min(1)
    .describe(
      "What to find: landmark, business, area, or list query (e.g. 'restaurants in Jakarta')",
    ),
  pageToken: z
    .string()
    .optional()
    .describe(
      "Pagination token from a prior response's pagination.nextPageToken. Use the same query as the first page.",
    ),
};

export const outputSchema = {
  query: z.string(),
  pagination: z.object({
    hasMore: z.boolean(),
    nextPageToken: z.string().optional(),
  }),
  place: z.object({
    id: z.string(),
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
};

export const metadata: ToolMetadata = {
  name: "search-place",
  description:
    "Find one place per page by text query (relevance order). Returns id, name, lat, lng in TOON. Paginate with pageToken. Call get-place-detail for address, rating, and contact info.",
  annotations: {
    title: "Find a place",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function searchPlace({
  query,
  pageToken,
}: InferSchema<typeof schema>) {
  try {
    const payload = await runPlaceSearchSlim(query.trim(), { pageToken });
    return toSearchPlaceToolResult(payload);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Place search failed.";
    return {
      content: [
        {
          type: "text" as const,
          text: `error: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
