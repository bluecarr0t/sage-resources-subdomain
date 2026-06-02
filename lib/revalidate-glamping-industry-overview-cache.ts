import { revalidateTag } from 'next/cache';
import { GLAMPING_INDUSTRY_OVERVIEW_CACHE_TAG } from '@/lib/glamping-industry-overview/glamping-industry-overview-page-data';

export async function revalidateGlampingIndustryOverviewCache(): Promise<{ success: true }> {
  revalidateTag(GLAMPING_INDUSTRY_OVERVIEW_CACHE_TAG);
  return { success: true };
}
