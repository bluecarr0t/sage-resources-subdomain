import { Metadata } from 'next';
import AdminColumnsView from '@/components/AdminColumnsView';
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            Sage Glamping Data Breakdown
          </h1>
        </div>

        <AdminGlampingMetrics />

        <div className="mt-8 mb-8">
          <AdminMissingFieldsBreakdown />
        </div>

        <AdminColumnsView />
      </div>
    </main>
  );
}
