import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';
import { Metadata } from 'next';
import {
  buildHomeMetaDescription,
  getPublicContentStats,
} from '@/lib/public-content-stats';

// Root page - redirect to default locale
// All actual content is in app/[locale]/page.tsx
export async function generateMetadata(): Promise<Metadata> {
  let description =
    'Unique properties in Sage research, expert guides, and industry glossary terms. Your trusted resource for outdoor hospitality feasibility studies, appraisals, and property discovery across North America and Europe.';

  try {
    const stats = await getPublicContentStats();
    description = buildHomeMetaDescription(stats);
  } catch (error) {
    console.error('[root generateMetadata] public content stats failed:', error);
  }

  return {
    title:
      'Outdoor Hospitality Resources | Guides, Glossary & Property Data | Sage Outdoor Advisory',
    description,
    keywords:
      'outdoor hospitality resources, glamping properties, feasibility study guide, RV resort appraisal, campground data, outdoor hospitality glossary, glamping industry, RV park resources',
    openGraph: {
      title: 'Outdoor Hospitality Resources | Sage Outdoor Advisory',
      description,
      siteName: 'Sage Outdoor Advisory',
      type: 'website',
      images: [
        {
          url: 'https://sageoutdooradvisory.com/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Sage Outdoor Advisory - Outdoor Hospitality Resources',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Outdoor Hospitality Resources | Sage Outdoor Advisory',
      description,
      images: ['https://sageoutdooradvisory.com/og-image.jpg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
