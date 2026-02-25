'use client';

import { useSidebar } from '@/lib/sidebar-context';

export default function AdminMainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebar();

  return (
    <div
      id="mainContent"
      className={`min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 lg:pt-8 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}
    >
      {children}
    </div>
  );
}
