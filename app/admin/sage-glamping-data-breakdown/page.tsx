import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import AdminColumnsView from '@/components/AdminColumnsView';
import AdminDiscoveryPipelineStats from '@/components/AdminDiscoveryPipelineStats';
import AdminGlampingMetrics from '@/components/AdminGlampingMetrics';
import AdminMissingFieldsBreakdown from '@/components/AdminMissingFieldsBreakdown';

export const metadata: Metadata = {
  title: 'Sage Glamping Data Breakdown - Sage Admin',
  description: 'View all columns from the all_glamping_properties table',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SageGlampingDataBreakdownPage() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            Sage Glamping Data Breakdown
          </h1>
          <Link
            href="/admin/ai-research-pipeline"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 rounded-md shrink-0"
          >
            View AI Research Pipeline
            <ChevronRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>

        <AdminGlampingMetrics />

        <div className="mt-8">
          <AdminDiscoveryPipelineStats />
        </div>

        <div className="mt-8 mb-8">
          <AdminMissingFieldsBreakdown />
        </div>

        <AdminColumnsView />
      </div>
    </main>
  );
}
