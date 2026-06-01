/**
 * Invalidate Next.js `unstable_cache` for RV Industry Overview page data.
 * Must run in a Next.js server context (API route or Server Action).
 */
import { revalidateTag } from 'next/cache';
import { RV_INDUSTRY_OVERVIEW_CACHE_TAG } from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';

export async function revalidateRvIndustryOverviewCache(): Promise<{ success: true }> {
  revalidateTag(RV_INDUSTRY_OVERVIEW_CACHE_TAG);
  return { success: true };
}
