import { Metadata } from 'next';
import RvIndustryOverviewClient from './RvIndustryOverviewClient';
import {
  getCampspotRvOverviewPageData,
  RV_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS,
} from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';

/** Aligns full route ISR with the `unstable_cache` TTL in the data layer. */
export const revalidate = RV_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: 'RV Industry Overview - Sage Admin',
  description: 'RV industry regional overview from Campspot data',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RvIndustryOverviewPage() {
  const {
    mapResult,
    trendsResult,
    sizeResult,
    unitTypeResult,
    seasonRatesResult,
    surfaceRatesResult,
    amenityPropsResult,
    amenityAdrResult,
    rvParkingChartsResult,
  } = await getCampspotRvOverviewPageData();

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <RvIndustryOverviewClient
        mapResult={mapResult}
        trendsResult={trendsResult}
        sizeResult={sizeResult}
        unitTypeResult={unitTypeResult}
        seasonRatesResult={seasonRatesResult}
        surfaceRatesResult={surfaceRatesResult}
        amenityPropsResult={amenityPropsResult}
        amenityAdrResult={amenityAdrResult}
        rvParkingChartsResult={rvParkingChartsResult}
      />
    </main>
  );
}
