/**
 * Vercel AI Gateway metadata for the admin Sage AI chat route.
 *
 * - App attribution headers surface the app on AI Gateway pages and in logs
 *   (https://vercel.com/docs/ai-gateway/ecosystem/app-attribution).
 * - Tags / user id support cost and rate-limit attribution in project AI Gateway settings.
 */

export const SAGE_AI_VERCEL_PROJECT_NAME = 'sage-resources-subdomain';

/** Base URL for the deployment (no trailing slash). */
export function buildSageAiGatewayHttpRefererBase(): string {
  const explicit = process.env.SAGE_AI_GATEWAY_HTTP_REFERER?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  const site = process.env.SITE_URL?.trim();
  if (site) return site.replace(/\/$/, '');
  return 'http://localhost:3003';
}

export function buildSageAiGatewayHeaders(): Record<string, string> {
  const base = buildSageAiGatewayHttpRefererBase();
  const title =
    process.env.SAGE_AI_GATEWAY_X_TITLE?.trim() ||
    `Sage AI (${SAGE_AI_VERCEL_PROJECT_NAME})`;
  return {
    'http-referer': `${base}/admin/sage-ai`,
    'x-title': title,
  };
}

export function buildSageAiGatewayTags(): string[] {
  return [
    `vercel_project:${SAGE_AI_VERCEL_PROJECT_NAME}`,
    'feature:sage-ai',
    'page:/admin/sage-ai',
  ];
}
