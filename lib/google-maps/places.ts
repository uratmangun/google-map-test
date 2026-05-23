import { assertMcpQuotaAvailable } from "@/lib/maps-quota-guard";
import {
  fetchStaticMapImage,
  type StaticMapCoordinates,
} from "@/lib/google-maps/static-map";

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

export const DEFAULT_SEARCH_PAGE_SIZE = 3;

const TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.primaryType",
  "places.types",
  "nextPageToken",
].join(",");

export type PlaceResult = {
  id: string;
  displayName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  phone?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
};

export type SearchPlacesOptions = {
  /** 1–20 per Places Text Search request (default 3). */
  pageSize?: number;
  /** Pass `nextPageToken` from a previous response for the next page. */
  pageToken?: string;
};

export type SearchPlacesPage = {
  places: PlaceResult[];
  nextPageToken?: string;
};

type PlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    googleMapsUri?: string;
    businessStatus?: string;
    primaryType?: string;
    types?: string[];
  }>;
  nextPageToken?: string;
};

function getApiKey(): string {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing GOOGLE_MAPS_API_KEY. Add it to .env.local (see docs/google-maps-api-key.md).",
    );
  }
  return key;
}

export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<SearchPlacesPage> {
  await assertMcpQuotaAvailable("search-place");

  const textQuery = query.trim();
  if (!textQuery) {
    throw new Error("Search query cannot be empty.");
  }

  const pageSize = Math.min(
    20,
    Math.max(1, options.pageSize ?? DEFAULT_SEARCH_PAGE_SIZE),
  );
  const pageToken = options.pageToken?.trim();

  const apiKey = getApiKey();
  const body: Record<string, unknown> = { textQuery, pageSize };
  if (pageToken) {
    body.pageToken = pageToken;
  }

  const res = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Places API ${res.status}: ${errBody.slice(0, 400)}`);
  }

  const data = (await res.json()) as PlacesSearchResponse;
  const places = (data.places ?? [])
    .map((place) => {
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;
      if (lat == null || lng == null || !place.id) {
        return null;
      }
      const result: PlaceResult = {
        id: place.id,
        displayName: place.displayName?.text ?? "Unknown place",
        formattedAddress: place.formattedAddress ?? "",
        latitude: lat,
        longitude: lng,
      };
      if (place.rating != null) result.rating = place.rating;
      if (place.userRatingCount != null) {
        result.userRatingCount = place.userRatingCount;
      }
      if (place.websiteUri) result.websiteUri = place.websiteUri;
      if (place.nationalPhoneNumber) result.phone = place.nationalPhoneNumber;
      if (place.googleMapsUri) result.googleMapsUri = place.googleMapsUri;
      if (place.businessStatus) result.businessStatus = place.businessStatus;
      if (place.primaryType) result.primaryType = place.primaryType;
      if (place.types?.length) result.types = place.types;
      return result;
    })
    .filter((p): p is PlaceResult => p !== null);

  if (places.length === 0) {
    throw new Error(`No places found for "${textQuery}".`);
  }

  return {
    places,
    nextPageToken: data.nextPageToken,
  };
}

function placeToCoords(place: PlaceResult): StaticMapCoordinates {
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    zoom: 15,
  };
}

export async function fetchStaticMapAsBase64(
  place: PlaceResult,
): Promise<{ mimeType: string; data: string }> {
  const image = await fetchStaticMapImage(placeToCoords(place));
  return { mimeType: image.mimeType, data: image.data };
}

export function buildEmbedMapUrl(place: PlaceResult): string {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    key: apiKey,
    q: `${place.latitude},${place.longitude}`,
    zoom: "15",
  });
  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

export function formatPlaceSummary(place: PlaceResult, index: number): string {
  const lines = [
    `${index + 1}. ${place.displayName}`,
    place.formattedAddress ? `   ${place.formattedAddress}` : null,
    place.rating != null
      ? `   Rating: ${place.rating}${place.userRatingCount != null ? ` (${place.userRatingCount} reviews)` : ""}`
      : null,
    place.phone ? `   Phone: ${place.phone}` : null,
    place.websiteUri ? `   Website: ${place.websiteUri}` : null,
    place.googleMapsUri ? `   Maps: ${place.googleMapsUri}` : null,
    place.businessStatus ? `   Status: ${place.businessStatus}` : null,
    place.primaryType ? `   Type: ${place.primaryType}` : null,
    `   Coordinates: ${place.latitude}, ${place.longitude}`,
    `   Place ID: ${place.id}`,
  ].filter(Boolean);
  return lines.join("\n");
}
