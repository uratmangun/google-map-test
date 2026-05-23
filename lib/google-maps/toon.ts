import { encode } from "@toon-format/toon";

export function encodeToon(data: unknown): string {
  return encode(data);
}

export type PlaceSearchSlim = {
  query: string;
  pagination: { hasMore: boolean; nextPageToken?: string };
  place: { id: string; name: string; lat: number; lng: number };
};

export type PlaceDetailSlim = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  status: string | null;
};

export type MapUrlSlim = {
  mapUrl: string;
};

export function formatSearchPlaceToon(payload: PlaceSearchSlim): string {
  return encodeToon(payload);
}

export function formatPlaceDetailToon(payload: PlaceDetailSlim): string {
  return encodeToon(payload);
}

export function formatMapUrlToon(mapUrl: string): string {
  return encodeToon({ mapUrl } satisfies MapUrlSlim);
}
