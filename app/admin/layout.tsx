import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminAuthGuard from '@/components/AdminAuthGuard';
import AdminSidebar from '@/components/AdminSidebar';
import AdminMainContent from '@/components/AdminMainContent';
import { SidebarProvider } from '@/lib/sidebar-context';
import { getAdminAuthServer } from '@/lib/admin-auth-server';

export const metadata: Metadata = {
  title: 'Admin - Sage Outdoor Advisory',
  description: 'Admin dashboard for Sage Outdoor Advisory',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAdminAuthServer();
  if (!auth.authorized) {
    redirect('/login');
  }

  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <AdminSidebar />
        <AdminMainContent>{children}</AdminMainContent>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}
