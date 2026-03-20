'use client';

import { usePathname } from 'next/navigation';
import { useSidebar } from '@/lib/sidebar-context';

export default function AdminMainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const isClientMap = pathname === '/admin/client-map';
  const contentPadding = isClientMap
    ? 'pt-6 lg:pt-8 pb-2 lg:pb-3'
    : 'py-6 lg:py-8';

  return (
    <div
      id="mainContent"
      className={`min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 lg:pt-8 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}
    >
      <div className={`px-4 sm:px-6 lg:px-8 ${contentPadding}`}>
        {children}
      </div>
    </div>
  );
}
