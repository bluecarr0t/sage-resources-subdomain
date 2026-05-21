/**
 * Sitemap priority helpers (Phase 1 crawl signaling).
 */

const CORE_LANDING_SLUGS = new Set([
  'glamping-feasibility-study',
  'rv-resort-feasibility-study',
  'campground-feasibility-study',
  'glamping-appraisal',
  'rv-resort-appraisal',
  'campground-appraisal',
  'how-to-finance-glamping-resort',
  'feasibility-study-faq',
  'appraisal-faq',
]);

export function getLandingSitemapPriority(slug: string): string {
  if (CORE_LANDING_SLUGS.has(slug)) return '0.9';
  if (slug.includes('-feasibility-study-') || slug.includes('-appraisal-')) return '0.8';
  return '0.75';
}

export function getGuideSitemapPriority(slug: string): string {
  return slug.endsWith('-complete-guide') ? '0.9' : '0.8';
}

export function getPropertySitemapPriority(tier: 'a' | 'b'): string {
  return tier === 'a' ? '0.75' : '0.65';
}

export function getMainPageSitemapPriority(pagePath: string): string {
  if (pagePath === '') return '1.0';
  if (pagePath === '/map') return '0.95';
  if (pagePath === '/guides') return '0.9';
  return pagePath === '/partners' ? '0.8' : '0.85';
}
