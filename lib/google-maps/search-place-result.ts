import { toPlaceDetailJson, type PlaceDetailJson } from "./place-details";
import {
  DEFAULT_SEARCH_PAGE_SIZE,
  formatPlaceSummary,
  searchPlaces,
  type SearchPlacesOptions,
} from "./places";

export type { PlaceDetailJson };

export type PlaceSearchJson = {
  query: string;
  pageSize: number;
  pageToken?: string;
  nextPageToken?: string;
  hasMore: boolean;
  sortedBy: "relevance";
  summaryText: string;
  primary: PlaceDetailJson;
  map: {
    center: { latitude: number; longitude: number };
    zoom: number;
  };
  results: PlaceDetailJson[];
};

export async function runPlaceSearchJson(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<PlaceSearchJson> {
  const pageSize = Math.min(
    20,
    Math.max(1, options.pageSize ?? DEFAULT_SEARCH_PAGE_SIZE),
  );
  const { places, nextPageToken } = await searchPlaces(query, {
    ...options,
    pageSize,
  });
  const results = places.map((place, i) => toPlaceDetailJson(place, i + 1));
  const primary = results[0]!;

  const summaryLines = [
    `Results for "${query}" (${results.length} on this page, sorted by relevance):`,
    formatPlaceSummary(places[0]!, 0),
  ];

  if (places.length > 1) {
    summaryLines.push("", "Other matches on this page:");
    for (let i = 1; i < places.length; i++) {
      summaryLines.push(formatPlaceSummary(places[i]!, i));
    }
  }

  if (nextPageToken) {
    summaryLines.push(
      "",
      "More results: same query with pageToken=nextPageToken (3 places per page by default).",
    );
  }

  return {
    query,
    pageSize,
    sortedBy: "relevance",
    ...(options.pageToken ? { pageToken: options.pageToken } : {}),
    ...(nextPageToken ? { nextPageToken } : {}),
    hasMore: Boolean(nextPageToken),
    summaryText: summaryLines.join("\n"),
    primary,
    map: {
      center: {
        latitude: primary.latitude,
        longitude: primary.longitude,
      },
      zoom: 15,
    },
    results,
  };
}
