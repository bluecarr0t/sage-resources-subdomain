import { Metadata } from 'next';
import AdminAuthGuard from '@/components/AdminAuthGuard';
import AdminSidebar from '@/components/AdminSidebar';

export const metadata: Metadata = {
  title: 'Admin - Sage Outdoor Advisory',
  description: 'Admin dashboard for Sage Outdoor Advisory',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <AdminSidebar />
      <div
        id="mainContent"
        className="min-h-screen bg-gray-50 dark:bg-gray-950 lg:ml-64 pt-16 lg:pt-8 transition-all duration-300 ease-in-out"
      >
        {children}
      </div>
    </AdminAuthGuard>
  );
}
