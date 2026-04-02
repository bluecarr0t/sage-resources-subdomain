import type { Metadata } from 'next';
import SitesExportClient from '@/app/admin/sites-export/SitesExportClient';

export const metadata: Metadata = {
  title: 'Sites export | Admin',
  robots: { index: false, follow: false },
};

export default function SitesExportPage() {
  return <SitesExportClient />;
}
