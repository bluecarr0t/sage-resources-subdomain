import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import AdminGlampingPropertiesTable from '@/components/AdminGlampingPropertiesTable';

export const metadata: Metadata = {
  title: 'Sage Data Editor - Sage Admin',
  description: 'Inline editor for the all_glamping_properties table',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SageDataPage() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto pb-8 pt-0">
        <Link
          href="/admin/sage-glamping-data-breakdown"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 mb-4"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Back to Sage Glamping Data Breakdown
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Sage Data Editor
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Browse and edit rows in <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">all_glamping_properties</code>.
            <span className="font-medium">Click a row</span> to open the editor, or use keyboard (focus a row, then Enter or Space). Follow URL links to open the site; they do not open the editor.
          </p>
        </div>

        <AdminGlampingPropertiesTable />
      </div>
    </main>
  );
}
