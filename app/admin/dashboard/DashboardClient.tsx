'use client';

import { useState, useEffect } from 'react';
import AdminGlampingMetrics from '@/components/AdminGlampingMetrics';
import AdminPastReportsStats from '@/components/AdminPastReportsStats';
import { BarChart2 } from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-5 w-96 mt-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="space-y-8">
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern header with greeting and context */}
        <header className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                {getGreeting()}
              </h1>
              <p className="mt-1.5 text-base text-gray-600 dark:text-gray-400">
                Here&apos;s your operational overview at a glance.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <BarChart2 className="w-4 h-4 text-sage-500" aria-hidden />
              <span>Dashboard</span>
            </div>
          </div>
        </header>

        {/* Main content - improved spacing and visual hierarchy */}
        <div className="space-y-8">
          <AdminPastReportsStats />
          <AdminGlampingMetrics />
        </div>
      </div>
    </main>
  );
}
