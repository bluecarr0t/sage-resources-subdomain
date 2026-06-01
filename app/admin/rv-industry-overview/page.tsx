import { Metadata } from 'next';
import RvIndustryOverviewClient from './RvIndustryOverviewClient';
import { buildRvIndustryOverviewClientProps } from '@/lib/rv-industry-overview/rv-overview-client-props';
import {
  getCampspotRvOverviewPageData,
  getRvOverviewSnapshotMeta,
  RV_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS,
} from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';
import { parseRvOverviewDataSourceFilterKey } from '@/lib/rv-industry-overview/rv-overview-data-source-filter';
import { parseRvOverviewDisplayPreferences } from '@/lib/rv-industry-overview/rv-overview-display-preferences';
import { parseRvOverviewUnitFilterKey } from '@/lib/rv-industry-overview/rv-overview-unit-filter';

/** Aligns full route ISR with the `unstable_cache` TTL in the data layer. */
export const revalidate = RV_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: 'RV Industry Overview - Sage Admin',
  description: 'RV industry regional overview from Campspot and RoverPass data',
  robots: {
    index: false,
    follow: false,
  },
};

const NEXT_CACHE_REVALIDATE_DAYS = Math.round(
  RV_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS / (24 * 60 * 60)
);

type PageProps = {
  searchParams?: { unit?: string; source?: string; year?: string; rate?: string };
};

export default async function RvIndustryOverviewPage({ searchParams }: PageProps) {
  const unitFilter = parseRvOverviewUnitFilterKey(searchParams?.unit);
  const sourceFilter = parseRvOverviewDataSourceFilterKey(searchParams?.source);
  const displayPreferences = parseRvOverviewDisplayPreferences({
    year: searchParams?.year,
    rate: searchParams?.rate,
  });

  const [pageData, snapshotMeta] = await Promise.all([
    getCampspotRvOverviewPageData(),
    getRvOverviewSnapshotMeta(),
  ]);

  const clientProps = buildRvIndustryOverviewClientProps(
    pageData,
    unitFilter,
    sourceFilter,
    displayPreferences,
    snapshotMeta,
    NEXT_CACHE_REVALIDATE_DAYS
  );

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <RvIndustryOverviewClient {...clientProps} />
    </main>
  );
}
