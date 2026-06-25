import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DEFAULT_ADMIN_PATH } from '@/lib/admin-ui';

export const metadata: Metadata = {
  title: 'Dashboard - Sage Admin',
  description: 'Admin dashboard',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  redirect(DEFAULT_ADMIN_PATH);
}
