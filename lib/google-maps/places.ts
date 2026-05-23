const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const STATIC_MAP_BASE = "https://maps.googleapis.com/maps/api/staticmap";

export type PlaceResult = {
  id: string;
  displayName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

type PlacesSearchResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  }>;
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

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const textQuery = query.trim();
  if (!textQuery) {
    throw new Error("Search query cannot be empty.");
  }

  const apiKey = getApiKey();
  const res = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({ textQuery, pageSize: 5 }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as PlacesSearchResponse;
  const places = (data.places ?? [])
    .map((place) => {
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;
      if (lat == null || lng == null || !place.id) {
        return null;
      }
      return {
        id: place.id,
        displayName: place.displayName?.text ?? "Unknown place",
        formattedAddress: place.formattedAddress ?? "",
        latitude: lat,
        longitude: lng,
      } satisfies PlaceResult;
    })
    .filter((p): p is PlaceResult => p !== null);

  if (places.length === 0) {
    throw new Error(`No places found for "${textQuery}".`);
  }

  return places;
}

export function buildStaticMapUrl(place: PlaceResult, apiKey: string): string {
  const center = `${place.latitude},${place.longitude}`;
  const params = new URLSearchParams({
    center,
    zoom: "15",
    size: "640x400",
    scale: "2",
    maptype: "roadmap",
    markers: `color:red|${center}`,
    key: apiKey,
  });
  return `${STATIC_MAP_BASE}?${params.toString()}`;
}

export async function fetchStaticMapAsBase64(
  place: PlaceResult,
): Promise<{ mimeType: string; data: string }> {
  const apiKey = getApiKey();
  const url = buildStaticMapUrl(place, apiKey);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Static Maps API ${res.status}: ${body.slice(0, 300)}`);
  }

  const contentType = res.headers.get("content-type") ?? "image/png";
  const mimeType = contentType.split(";")[0]?.trim() || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { mimeType, data: buffer.toString("base64") };
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
    `   Coordinates: ${place.latitude}, ${place.longitude}`,
    `   Place ID: ${place.id}`,
  ].filter(Boolean);
  return lines.join("\n");
}
