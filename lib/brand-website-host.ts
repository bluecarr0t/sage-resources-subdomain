/**
 * Extract normalized website host for brand ↔ property URL matching.
 */

/** Hostname only, www stripped, lowercased. */
export function websiteHostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const host = new URL(withProto).hostname.replace(/^www\./i, '').toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

/** Known operator domains → glamping_brands.slug */
export const BRAND_DOMAIN_TO_SLUG: ReadonlyArray<{ host: string; slug: string }> = [
  { host: 'westgateresorts.com', slug: 'westgate-river-ranch' },
  { host: 'autocamp.com', slug: 'autocamp' },
  { host: 'undercanvas.com', slug: 'under-canvas' },
  { host: 'huttopia.com', slug: 'huttopia' },
  { host: 'getaway.house', slug: 'getaway' },
  { host: 'timberlineglamping.com', slug: 'timberline-glamping-co' },
  { host: 'wander.com', slug: 'wander' },
  { host: 'postcardcabins.com', slug: 'postcard-cabins' },
  { host: 'koa.com', slug: 'koa' },
  { host: 'collectiveretreats.com', slug: 'collective-retreats' },
  { host: 'wildhaven.com', slug: 'wildhaven-glamping' },
  { host: 'treebox.house', slug: 'treebox' },
  { host: 'blisscamps.com', slug: 'bliss-camps' },
  { host: 'terramoroutdoorresort.com', slug: 'terramor-outdoor-resort' },
];

export function brandSlugFromPropertyUrl(
  url: string | null | undefined
): string | null {
  const host = websiteHostFromUrl(url);
  if (!host) return null;
  for (const { host: ruleHost, slug } of BRAND_DOMAIN_TO_SLUG) {
    if (host === ruleHost || host.endsWith(`.${ruleHost}`)) return slug;
  }
  return null;
}
