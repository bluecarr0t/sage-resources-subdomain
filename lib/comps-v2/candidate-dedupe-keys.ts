/**
 * Stable keys for comps-v2 web gap-fill vs market rows.
 * Verbose SERP titles (comma + city + “updated prices …”) must match short DB names.
 */

function normalizeCityToken(city: string | null | undefined): string {
  return (city ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Last ", PlaceName" when PlaceName looks like a city (not "TX", not SEO junk). */
function splitTrailingCommaPlace(s: string): { base: string; trailing: string | null } {
  const idx = s.lastIndexOf(',');
  if (idx < 1 || idx >= s.length - 1) return { base: s, trailing: null };
  const base = s.slice(0, idx).trim().replace(/\s+/g, ' ');
  const trailingRaw = s.slice(idx + 1).trim().toLowerCase().replace(/\s+/g, ' ');
  if (base.length < 2 || trailingRaw.length < 2 || trailingRaw.length > 48) {
    return { base: s, trailing: null };
  }
  if (!/^[a-z][a-z0-9\s.'-]+$/i.test(trailingRaw)) return { base: s, trailing: null };
  if (/\bupdated\b|\bprices\b|\b20\d{2}\b/.test(trailingRaw)) return { base: s, trailing: null };
  if (/^[a-z]{2}$/.test(trailingRaw)) return { base: s, trailing: null };
  return { base, trailing: trailingRaw };
}

function stripMatchingCitySuffix(name: string, city: string): string {
  if (city.length < 2) return name;
  const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return name.replace(new RegExp(`,\\s*${escaped}\\s*$`, 'i'), '').trim().replace(/\s+/g, ' ');
}

export function webVsMarketDedupeNameAndCity(
  propertyName: string,
  city: string | null | undefined
): { name: string; cityKey: string } | null {
  let s = propertyName.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return null;
  s = s.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*,\s*updated\s+prices\s+20\d{2}\s*$/i, '').trim();
  s = s.replace(/\s*updated\s+prices\s+20\d{2}\s*$/i, '').trim();

  const cityParam = normalizeCityToken(city);
  const { base, trailing } = splitTrailingCommaPlace(s);

  let nameCore: string;
  let cityKey: string;

  if (trailing) {
    if (cityParam.length >= 2) {
      if (trailing === cityParam) {
        nameCore = base;
        cityKey = cityParam;
      } else {
        nameCore = stripMatchingCitySuffix(s, cityParam);
        cityKey = cityParam;
      }
    } else {
      nameCore = base;
      cityKey = trailing;
    }
  } else {
    nameCore = stripMatchingCitySuffix(s, cityParam);
    cityKey = cityParam.length >= 2 ? cityParam : '_';
  }

  nameCore = nameCore.replace(/\s+/g, ' ').trim();
  if (!nameCore) return null;
  if (cityKey.length < 2) cityKey = '_';
  return { name: nameCore, cityKey };
}

/**
 * Lowercase name, strip SEO parentheticals, peel ", city" when it matches `city` or is the only place hint.
 */
export function normalizePropertyNameForMarketWebDedupe(
  propertyName: string,
  city: string | null | undefined
): string {
  const parts = webVsMarketDedupeNameAndCity(propertyName, city);
  return parts?.name ?? '';
}

/**
 * Dedupe key for web research vs existing comps: normalized name + city + 2-letter state.
 * Use search-context state when a row’s `state` is missing so keys stay consistent.
 */
export function compsV2WebVsMarketDedupeKey(
  propertyName: string,
  city: string | null | undefined,
  stateAbbr: string | null | undefined
): string {
  const parts = webVsMarketDedupeNameAndCity(propertyName, city);
  if (!parts) return '';
  const st = (stateAbbr ?? '').trim().toUpperCase().slice(0, 2);
  const stateKey = st.length === 2 ? st : '_';
  return `${parts.name}|${parts.cityKey}|${stateKey}`;
}

/** @deprecated Prefer compsV2WebVsMarketDedupeKey for web vs market; kept for narrow legacy checks. */
export function compsV2NameCityDedupeKey(propertyName: string, city: string | null | undefined): string {
  const n = propertyName.toLowerCase().trim();
  if (!n) return '';
  const c = (city ?? '').trim().toLowerCase();
  return c.length >= 2 ? `${n}|${c}` : n;
}
