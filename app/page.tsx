import { redirect } from 'next/navigation';
import { defaultLocale } from './i18n';
import { Metadata } from 'next';

// Root page - redirect to default locale
// All actual content is in app/[locale]/page.tsx
export const metadata: Metadata = {
  title: "Outdoor Hospitality Resources | Guides, Glossary & Property Data | Sage Outdoor Advisory",
  description: "Comprehensive resources for the outdoor hospitality industry. Access 600+ glamping properties, expert guides on feasibility studies and appraisals, and a complete industry glossary. Your trusted source for outdoor hospitality expertise.",
  keywords: "outdoor hospitality resources, glamping properties, feasibility study guide, RV resort appraisal, campground data, outdoor hospitality glossary, glamping industry, RV park resources",
  openGraph: {
    title: "Outdoor Hospitality Resources | Sage Outdoor Advisory",
    description: "Comprehensive resources for the outdoor hospitality industry. Access 600+ glamping properties, expert guides on feasibility studies and appraisals, and a complete industry glossary.",
    siteName: "Sage Outdoor Advisory",
    type: "website",
    images: [
      {
        url: "https://sageoutdooradvisory.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sage Outdoor Advisory - Outdoor Hospitality Resources",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Outdoor Hospitality Resources | Sage Outdoor Advisory",
    description: "Comprehensive resources for the outdoor hospitality industry. Access 600+ glamping properties, expert guides, and a complete industry glossary.",
    images: ["https://sageoutdooradvisory.com/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
