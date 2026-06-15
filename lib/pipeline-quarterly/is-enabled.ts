/**
 * Pipeline Quarterly is a paid product MVP.
 * - `next dev` (NODE_ENV=development): enabled by default for local work.
 * - Production / preview: blocked unless ENABLE_PIPELINE_QUARTERLY_PRODUCT=true.
 * - Set ENABLE_PIPELINE_QUARTERLY_PRODUCT=false to hide even in local dev.
 */
export function isPipelineQuarterlyProductEnabled(): boolean {
  if (process.env.ENABLE_PIPELINE_QUARTERLY_PRODUCT === 'false') {
    return false;
  }
  if (process.env.ENABLE_PIPELINE_QUARTERLY_PRODUCT === 'true') {
    return true;
  }
  return process.env.NODE_ENV === 'development';
}
