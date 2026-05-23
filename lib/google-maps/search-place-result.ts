import {
  formatPlaceSummary,
  searchPlaces,
  type PlaceResult,
} from "./places";

export type PlaceSearchJson = {
  query: string;
  summaryText: string;
  primary: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  map: {
    center: { latitude: number; longitude: number };
    zoom: number;
  };
  results: Array<{
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }>;
};

function toPrimary(place: PlaceResult) {
  return {
    id: place.id,
    name: place.displayName,
    address: place.formattedAddress,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

export async function runPlaceSearchJson(
  query: string,
): Promise<PlaceSearchJson> {
  const places = await searchPlaces(query);
  const primary = places[0]!;

  const summaryLines = [
    `Top result for "${query}":`,
    formatPlaceSummary(primary, 0),
  ];

  if (places.length > 1) {
    summaryLines.push("", "Other matches:");
    for (let i = 1; i < places.length; i++) {
      summaryLines.push(formatPlaceSummary(places[i]!, i));
    }
  }

  return {
    query,
    summaryText: summaryLines.join("\n"),
    primary: toPrimary(primary),
    map: {
      center: {
        latitude: primary.latitude,
        longitude: primary.longitude,
      },
      zoom: 15,
    },
    results: places.map(toPrimary),
  };
}
