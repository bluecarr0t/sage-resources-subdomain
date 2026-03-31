/**
 * Google Places API (New) text search for deep enrichment — structured GBP-style facts
 * when a public listing exists (rating, reviews, address, phone, hours, Maps URL).
 *
 * Uses the same API key pattern as other server-side tooling (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
 */

function normalizeCity(city: string | null | undefined): string {
  if (!city) return '';
  return city.toLowerCase().trim().replace(/\s+/g, ' ');
}

function extractCityFromAddress(address: string, state: string | null | undefined): string {
  if (!address) return '';
  const addrLower = address.toLowerCase();
  const stateLower = state ? state.toLowerCase().trim() : '';
  const parts = addrLower.split(',').map((p) => p.trim());
  if (stateLower && parts.length >= 2) {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const stateMatch =
        part.includes(stateLower) ||
        (stateLower.length === 2 && part.match(new RegExp(`\\b${stateLower}\\b`)));
      if (stateMatch && i > 0) return parts[i - 1];
    }
  }
  if (parts.length >= 2) return parts[1];
  return parts[0] || '';
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function nameSimilarity(propertyName: string, displayName: string): number {
  if (!propertyName || !displayName) return 0;
  const a = propertyName.toLowerCase().trim();
  const b = displayName.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    return shorter.length / longer.length;
  }
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

type PlacesSearchPlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  editorialSummary?: { text?: string };
  priceLevel?: string;
  primaryTypeDisplayName?: { text?: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

const PLACES_FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.editorialSummary',
  'places.priceLevel',
  'places.primaryTypeDisplayName',
  'places.regularOpeningHours',
].join(',');

function pickBestPlace(
  places: PlacesSearchPlace[],
  propertyName: string,
  city: string,
  state: string
): PlacesSearchPlace | null {
  if (!places.length) return null;
  const normCity = normalizeCity(city);
  let best: { place: PlacesSearchPlace; score: number } | null = null;

  for (const place of places) {
    const displayName = place.displayName?.text ?? '';
    const formattedAddress = place.formattedAddress ?? '';
    const googleCity = normalizeCity(extractCityFromAddress(formattedAddress, state));
    const sim = nameSimilarity(propertyName, displayName);
    let score = sim;
    if (normCity && googleCity && normCity === googleCity) {
      score += 0.22;
    }
    if (!best || score > best.score) {
      best = { place, score };
    }
  }

  if (!best) return null;
  const minSim = normCity ? 0.48 : 0.42;
  if (nameSimilarity(propertyName, best.place.displayName?.text ?? '') < minSim && best.score < minSim + 0.15) {
    return null;
  }
  return best.place;
}

function formatPlaceForContext(place: PlacesSearchPlace): string {
  const lines: string[] = ['### Google Business Profile (Google Places API — authoritative when present)'];
  const name = place.displayName?.text;
  if (name) lines.push(`Listed name: ${name}`);
  if (place.primaryTypeDisplayName?.text) {
    lines.push(`Primary type: ${place.primaryTypeDisplayName.text}`);
  }
  if (place.formattedAddress) lines.push(`Address: ${place.formattedAddress}`);
  if (place.rating != null && typeof place.userRatingCount === 'number') {
    lines.push(`Google rating: ${place.rating} stars (${place.userRatingCount} reviews)`);
  } else if (place.rating != null) {
    lines.push(`Google rating: ${place.rating} stars`);
  } else if (typeof place.userRatingCount === 'number') {
    lines.push(`Google reviews count: ${place.userRatingCount}`);
  }
  if (place.nationalPhoneNumber) lines.push(`Phone: ${place.nationalPhoneNumber}`);
  if (place.websiteUri) lines.push(`Website (from listing): ${place.websiteUri}`);
  if (place.googleMapsUri) lines.push(`Google Maps / Knowledge Panel URL: ${place.googleMapsUri}`);
  if (place.priceLevel) lines.push(`Google price level: ${place.priceLevel}`);
  if (place.editorialSummary?.text) lines.push(`Google editorial summary: ${place.editorialSummary.text}`);
  const hours = place.regularOpeningHours?.weekdayDescriptions;
  if (hours?.length) {
    lines.push(`Opening hours:\n${hours.map((h) => `- ${h}`).join('\n')}`);
  }
  return lines.join('\n');
}

/**
 * Returns a markdown block for the LLM, or empty string if no key or no confident match.
 */
export async function fetchGoogleBusinessProfileContext(
  propertyName: string,
  city: string,
  state: string
): Promise<string> {
  const apiKey =
    process.env.GOOGLE_PLACES_SERVER_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey || !propertyName.trim()) {
    return '';
  }

  const queryParts = [propertyName.trim()];
  if (city.trim()) queryParts.push(city.trim());
  if (state.trim()) queryParts.push(state.trim());
  const textQuery = queryParts.join(' ');

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 8,
      }),
    });

    if (!response.ok) {
      return '';
    }

    const data = (await response.json()) as { places?: PlacesSearchPlace[] };
    const places = data.places ?? [];
    const best = pickBestPlace(places, propertyName, city, state);
    if (!best) {
      return '';
    }
    return formatPlaceForContext(best);
  } catch {
    return '';
  }
}
