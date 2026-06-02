import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import GlampingIndustryOverviewSnapshotMissing from './GlampingIndustryOverviewSnapshotMissing';
import { buildGlampingIndustryOverviewClientProps } from '@/lib/glamping-industry-overview/glamping-overview-client-props';
import {
  getGlampingIndustryOverviewPageLoad,
  GLAMPING_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS,
} from '@/lib/glamping-industry-overview/glamping-industry-overview-page-data';
import { parseGlampingOverviewDataSourceFilterKey } from '@/lib/glamping-industry-overview/glamping-overview-data-source-filter';
import { parseRvOverviewDisplayPreferences } from '@/lib/rv-industry-overview/rv-overview-display-preferences';
import { IndustryOverviewPageLoading } from '@/components/admin/industry-overview/IndustryOverviewLoading';

const GlampingIndustryOverviewClient = dynamic(
  () => import('./GlampingIndustryOverviewClient'),
  {
    loading: () => (
      <IndustryOverviewPageLoading messagesNamespace="admin.glampingIndustryOverview" />
    ),
  }
);

export const revalidate = GLAMPING_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: 'Glamping Industry Overview - Sage Admin',
  description: 'United States glamping industry regional overview from Hipcamp and Sage data',
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  searchParams?: { source?: string; year?: string; rate?: string };
};

export default async function GlampingIndustryOverviewPage({ searchParams }: PageProps) {
  const sourceFilter = parseGlampingOverviewDataSourceFilterKey(searchParams?.source);
  const displayPreferences = parseRvOverviewDisplayPreferences({
    year: searchParams?.year,
    rate: searchParams?.rate,
  });

  const { pageData, snapshotMeta } = await getGlampingIndustryOverviewPageLoad();

  if (!pageData) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <GlampingIndustryOverviewSnapshotMissing />
      </main>
    );
  }

  const clientProps = buildGlampingIndustryOverviewClientProps(
    pageData,
    sourceFilter,
    displayPreferences,
    snapshotMeta
  );

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <GlampingIndustryOverviewClient {...clientProps} />
    </main>
  );
}
