/**
 * Anchor text for related root-domain service cards.
 * Uses the service title so links are descriptive for crawlers and users.
 */
export function getRelatedServiceAnchorText(serviceName: string): string {
  const name = serviceName.trim();
  return name ? `Learn more about ${name}` : "Learn more about this Sage service";
}
