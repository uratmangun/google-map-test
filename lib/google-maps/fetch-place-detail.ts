import { getGoogleMapsApiKey } from "@/lib/google-maps/api-key";
import { assertMcpQuotaAvailable } from "@/lib/maps-quota-guard";
import type { PlaceDetailSlim } from "@/lib/google-maps/toon";

const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "nationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "businessStatus",
].join(",");

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
};

function normalizePlaceId(placeId: string): string {
  const trimmed = placeId.trim();
  if (trimmed.startsWith("places/")) {
    return trimmed.slice("places/".length);
  }
  return trimmed;
}

export async function fetchPlaceDetailSlim(
  placeId: string,
): Promise<PlaceDetailSlim> {
  await assertMcpQuotaAvailable("get-place-detail");

  const id = normalizePlaceId(placeId);
  if (!id) {
    throw new Error("placeId is required.");
  }

  const apiKey = getGoogleMapsApiKey();
  const res = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Places API ${res.status}: ${errBody.slice(0, 400)}`);
  }

  const data = (await res.json()) as PlaceDetailsResponse;
  const lat = data.location?.latitude;
  const lng = data.location?.longitude;

  if (lat == null || lng == null || !data.id) {
    throw new Error(`Place details not found for "${placeId}".`);
  }

  return {
    id: data.id,
    name: data.displayName?.text ?? "Unknown place",
    address: data.formattedAddress ?? "",
    lat,
    lng,
    rating: data.rating ?? null,
    reviewCount: data.userRatingCount ?? null,
    phone: data.nationalPhoneNumber ?? null,
    website: data.websiteUri ?? null,
    mapsUrl: data.googleMapsUri ?? null,
    status: data.businessStatus ?? null,
  };
}
