import { Metadata } from 'next';
import AdminAuthGuard from '@/components/AdminAuthGuard';
import AdminSidebar from '@/components/AdminSidebar';
import AdminMainContent from '@/components/AdminMainContent';
import { SidebarProvider } from '@/lib/sidebar-context';

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
      <SidebarProvider>
        <AdminSidebar />
        <AdminMainContent>{children}</AdminMainContent>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}
