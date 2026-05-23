import type { PlaceSearchSlim } from "@/lib/google-maps/toon";
import { formatSearchPlaceToon } from "@/lib/google-maps/toon";
import { searchPlaces } from "@/lib/google-maps/places";

export type { PlaceSearchSlim };

export async function runPlaceSearchSlim(
  query: string,
  options: { pageToken?: string } = {},
): Promise<PlaceSearchSlim> {
  const { places, nextPageToken } = await searchPlaces(query, {
    pageToken: options.pageToken,
  });
  const top = places[0]!;

  return {
    query: query.trim(),
    pagination: {
      hasMore: Boolean(nextPageToken),
      ...(nextPageToken ? { nextPageToken } : {}),
    },
    place: {
      id: top.id,
      name: top.displayName,
      lat: top.latitude,
      lng: top.longitude,
    },
  };
}

export function toSearchPlaceToolResult(payload: PlaceSearchSlim) {
  return {
    content: [
      {
        type: "text" as const,
        text: formatSearchPlaceToon(payload),
      },
    ],
    structuredContent: payload,
  };
}
