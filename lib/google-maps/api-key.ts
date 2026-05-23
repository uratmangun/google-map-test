export function getGoogleMapsApiKey(): string {
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
