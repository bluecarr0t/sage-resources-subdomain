import { Metadata } from 'next';
import SiteBuilderClient from './SiteBuilderClient';

export const metadata: Metadata = {
  title: 'Site Builder - Sage Admin',
  description: 'Configure glamping units and RV sites with amenities, calculate costs, and generate AI site images',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SiteBuilderPage() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SiteBuilderClient />
      </div>
    </main>
  );
}
