'use client';

import { useState, useEffect } from 'react';
import AdminGlampingMetrics from '@/components/AdminGlampingMetrics';
import AdminPastReportsStats from '@/components/AdminPastReportsStats';
import { adminEyebrow, adminPageHeader, adminPageTitle } from '@/lib/admin-ui';

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
      <main className="flex w-full flex-1 flex-col min-h-[calc(100svh-6.75rem)] lg:min-h-[calc(100svh-5.25rem)] pb-4">
        <div className="flex w-full flex-1 flex-col min-h-0">
          <div className="mb-3 space-y-2 shrink-0">
            <div className="h-6 w-40 bg-neutral-200/80 dark:bg-neutral-800 rounded-md animate-pulse" />
            <div className="h-3 w-64 bg-neutral-100 dark:bg-neutral-800/60 rounded animate-pulse" />
          </div>
          <div className="space-y-6 sm:space-y-8 shrink-0">
            <div className="h-28 bg-neutral-100/80 dark:bg-neutral-900/50 rounded-lg border border-neutral-200/40 dark:border-neutral-800/60 animate-pulse" />
            <div className="h-52 bg-neutral-100/80 dark:bg-neutral-900/50 rounded-lg border border-neutral-200/40 dark:border-neutral-800/60 animate-pulse" />
          </div>
          <div className="flex-1 min-h-8" aria-hidden />
        </div>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col min-h-[calc(100svh-6.75rem)] lg:min-h-[calc(100svh-5.25rem)] pb-4">
      <header className={`${adminPageHeader} shrink-0`}>
        <p className={adminEyebrow}>
          Overview
        </p>
        <h1 className={`${adminPageTitle} mt-1`}>
          {getGreeting()}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md leading-snug">
          Past reports and glamping data at a glance.
        </p>
      </header>

      <div className="flex shrink-0 flex-col gap-6 sm:gap-8">
        <AdminPastReportsStats />
        <AdminGlampingMetrics />
      </div>
      <div className="flex-1 min-h-8" aria-hidden />
    </main>
  );
}
