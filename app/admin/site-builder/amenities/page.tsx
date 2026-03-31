import { Metadata } from 'next';
import SiteBuilderAmenitiesClient from './SiteBuilderAmenitiesClient';

export const metadata: Metadata = {
  title: 'Site Builder Amenities - Sage Admin',
  description: 'Edit Site Builder amenity costs and RV / glamping associations',
  robots: { index: false, follow: false },
};

export default function SiteBuilderAmenitiesPage() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SiteBuilderAmenitiesClient />
      </div>
    </main>
  );
}
