/** Canonical origin for resources subdomain (embed links, sitemaps, etc.). */
export function getResourcesSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://resources.sageoutdooradvisory.com'
  );
}

export function buildLocalePropertyPath(locale: string, slug: string): string {
  return `/${locale}/property/${slug}`;
}

export function buildLocalePropertyUrl(locale: string, slug: string): string {
  return `${getResourcesSiteOrigin()}${buildLocalePropertyPath(locale, slug)}`;
}
