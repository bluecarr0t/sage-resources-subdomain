import { Metadata } from 'next';
import { Card } from '@/components/ui';

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
        <Card className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Coming soon
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Dashboard metrics and charts will be available here.
          </p>
        </Card>
      </div>
    </main>
  );
}
