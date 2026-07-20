import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAdminAuthServer } from '@/lib/admin-auth-server';
import { getManagedUser } from '@/lib/auth-helpers';
import { DEFAULT_ADMIN_PATH } from '@/lib/admin-ui';
import QuickbooksRemapClient from './QuickbooksRemapClient';

export const metadata = {
  title: 'QuickBooks Invoice Remapper - Sage Admin',
  robots: { index: false, follow: false },
};

export default async function QuickbooksAdminPage() {
  const auth = await getAdminAuthServer();
  if (!auth.authorized || !auth.userId) {
    redirect('/login');
  }

  const managed = await getManagedUser(auth.userId);
  if (!managed || managed.role !== 'admin') {
    redirect(DEFAULT_ADMIN_PATH);
  }

  return (
    <Suspense fallback={<main className="px-4 py-8 sm:px-6 lg:px-8">Loading…</main>}>
      <QuickbooksRemapClient />
    </Suspense>
  );
}
