/**
 * Server-side Google Places / Maps REST API key.
 * Prefer GOOGLE_PLACES_SERVER_API_KEY (restricted to server IPs / no referrer)
 * with fallback to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for local dev.
 */
export function getGooglePlacesServerApiKey(): string | null {
  return (
    process.env.GOOGLE_PLACES_SERVER_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    null
  );
}
