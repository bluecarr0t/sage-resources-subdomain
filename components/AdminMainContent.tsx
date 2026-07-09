'use client';

import { usePathname } from 'next/navigation';
import { useSidebar } from '@/lib/sidebar-context';
import { adminPageContainer } from '@/lib/admin-ui';

export default function AdminMainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const isClientMap = pathname === '/admin/client-map';
  const isSageAi = pathname === '/admin/sage-ai';
  const isSageData = pathname.startsWith('/admin/sage-data');
  
  // Sage AI needs full viewport without padding
  if (isSageAi) {
    return (
      <div
        id="mainContent"
        className={`h-screen bg-white dark:bg-neutral-950 transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {children}
      </div>
    );
  }

  const contentPadding = isClientMap
    ? 'pt-4 lg:pt-6 pb-2 lg:pb-3'
    : isSageData
      ? 'pt-3 pb-6 lg:pt-4 lg:pb-8'
      : 'py-3 lg:py-4';

  return (
    <div
      id="mainContent"
      className={`flex min-h-screen flex-col bg-neutral-50/90 dark:bg-neutral-950 pt-16 lg:pt-5 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}
    >
      <div
        className={`flex flex-1 flex-col min-h-0 px-4 sm:px-6 lg:px-8 ${contentPadding}`}
      >
        <div className={`${adminPageContainer} flex flex-1 flex-col min-h-0`}>
          {children}
        </div>
      </div>
    </div>
  );
}
