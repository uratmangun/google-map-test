import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

import { fetchPlaceDetailSlim } from "@/lib/google-maps/fetch-place-detail";
import { formatPlaceDetailToon } from "@/lib/google-maps/toon";

export const schema = {
  placeId: z
    .string()
    .min(1)
    .describe("Place id from search-place (place.id, e.g. places/ChIJ...)"),
};

export const outputSchema = {
  id: z.string(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  rating: z.number().nullable(),
  reviewCount: z.number().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  mapsUrl: z.string().nullable(),
  status: z.string().nullable(),
};

export const metadata: ToolMetadata = {
  name: "get-place-detail",
  description:
    "Full details for one place id from search-place: address, rating, phone, website, maps link. Returns minimal fields in TOON.",
  annotations: {
    title: "Place details",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export default async function getPlaceDetail({
  placeId,
}: InferSchema<typeof schema>) {
  try {
    const payload = await fetchPlaceDetailSlim(placeId);
    return {
      content: [
        {
          type: "text" as const,
          text: formatPlaceDetailToon(payload),
        },
      ],
      structuredContent: payload,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Place detail request failed.";
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
