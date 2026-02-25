import { Metadata } from 'next';
import AdminGlampingMetrics from '@/components/AdminGlampingMetrics';

export const metadata: Metadata = {
  title: 'Dashboard - Sage Admin',
  description: 'Admin dashboard',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
        </div>

        <AdminGlampingMetrics />
      </div>
    </main>
  );
}
