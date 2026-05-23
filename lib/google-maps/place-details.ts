import type { PlaceResult } from "@/lib/google-maps/places";

/** JSON shape for each place (API relevance order, rank 1 = top result). */
export type PlaceDetailJson = {
  rank: number;
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  userRatingCount: number | null;
  website: string | null;
  phone: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  primaryType: string | null;
  types: string[];
};

export function toPlaceDetailJson(
  place: PlaceResult,
  rank: number,
): PlaceDetailJson {
  return {
    rank,
    id: place.id,
    name: place.displayName,
    address: place.formattedAddress,
    latitude: place.latitude,
    longitude: place.longitude,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    website: place.websiteUri ?? null,
    phone: place.phone ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    businessStatus: place.businessStatus ?? null,
    primaryType: place.primaryType ?? null,
    types: place.types ?? [],
  };
}
