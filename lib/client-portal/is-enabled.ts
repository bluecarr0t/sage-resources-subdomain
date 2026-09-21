/**
 * Client portal is a local/preview MVP for Outdoor feasibility studies and appraisals.
 * - Production (`VERCEL_ENV === 'production'`): always off, even if the env var is set.
 * - `next dev` (`NODE_ENV=development`): enabled by default.
 * - Preview/staging: only when `ENABLE_CLIENT_PORTAL=true`.
 * - Set `ENABLE_CLIENT_PORTAL=false` to hide even in local dev.
 */
export function isClientPortalEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.VERCEL_ENV === 'production') {
    return false;
  }
  if (env.ENABLE_CLIENT_PORTAL === 'false') {
    return false;
  }
  if (env.ENABLE_CLIENT_PORTAL === 'true') {
    return true;
  }
  return env.NODE_ENV === 'development';
}
