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
  const isSageAi = pathname === '/admin/sage-ai';
  
  // Sage AI needs full viewport without padding
  if (isSageAi) {
    return (
      <div
        id="mainContent"
        className={`h-screen bg-white dark:bg-gray-950 transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {children}
      </div>
    );
  }

  const contentPadding = isClientMap
    ? 'pt-6 lg:pt-8 pb-2 lg:pb-3'
    : 'py-6 lg:py-8';

  return (
    <div
      id="mainContent"
      className={`min-h-screen bg-white dark:bg-gray-950 pt-16 lg:pt-8 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}
    >
      <div className={`px-4 sm:px-6 lg:px-8 ${contentPadding}`}>
        {children}
      </div>
    </div>
  );
}
