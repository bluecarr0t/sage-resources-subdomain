import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BrandDetailTemplate from '@/components/BrandDetailTemplate';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import { getAllPublicBrandSlugs, getBrandPageData } from '@/lib/brand-public-pages';
import { locales, type Locale } from '@/i18n';
import {
  generateEnOnlyHreflangAlternates,
  getOpenGraphLocale,
} from '@/lib/i18n-utils';
import { getAvailableLocalesForContent } from '@/lib/i18n-content';
import {
  generateBrandBreadcrumbSchema,
  generateBrandPageSchema,
} from '@/lib/schema';

export const revalidate = 86400;
export const dynamicParams = true;

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateStaticParams() {
  const slugs = await getAllPublicBrandSlugs();
  const availableLocales = getAvailableLocalesForContent('brand');
  return slugs.flatMap((item) =>
    availableLocales.map((locale) => ({ locale, slug: item.slug }))
  );
}

function buildBrandMetaDescription(
  brandName: string,
  propertyCount: number,
  states: string[]
): string {
  const statePart =
    states.length > 0
      ? ` across ${states.slice(0, 5).join(', ')}${states.length > 5 ? ' and more' : ''}`
      : '';
  const base = `Browse ${propertyCount} published ${brandName} glamping ${propertyCount === 1 ? 'location' : 'locations'}${statePart}. Map, nightly rates, and unit types from Sage Outdoor Advisory research.`;
  if (base.length <= 160) return base;
  return base.substring(0, 157) + '...';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const data = await getBrandPageData(slug);
  if (!data) {
    return { title: 'Brand Not Found | Sage Outdoor Advisory' };
  }

  const { brand, listings } = data;
  const states = [
    ...new Set(
      listings.map((l) => l.state?.trim()).filter((s): s is string => Boolean(s))
    ),
  ];
  const pathname = `/${locale}/brand/${slug}`;
  const baseUrl = 'https://resources.sageoutdooradvisory.com';
  const url = `${baseUrl}${pathname}`;
  const title = `${brand.display_name} Glamping Locations (${listings.length}) | Sage Outdoor Advisory`;
  const description = buildBrandMetaDescription(brand.display_name, listings.length, states);
  const imageUrl =
    'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg';

  return {
    title,
    description,
    keywords: `${brand.display_name}, glamping brand, glamping locations, ${states.join(', ')}, outdoor hospitality`
      .replace(/,\s*,/g, ',')
      .trim(),
    openGraph: {
      title: `${brand.display_name} glamping locations`,
      description,
      url,
      siteName: 'Sage Outdoor Advisory',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: brand.display_name }],
      locale: getOpenGraphLocale(locale as Locale),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${brand.display_name} glamping`,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
      ...generateEnOnlyHreflangAlternates(pathname),
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

export default async function BrandPage({ params }: PageProps) {
  const { locale, slug } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const data = await getBrandPageData(slug);
  if (!data) {
    notFound();
  }

  const { brand, parentBrand, subBrands, listings, mapPins, includeSubBrandRollup } = data;

  const baseUrl = 'https://resources.sageoutdooradvisory.com';
  const states = [
    ...new Set(
      listings.map((l) => l.state?.trim()).filter((s): s is string => Boolean(s))
    ),
  ];
  const description = buildBrandMetaDescription(brand.display_name, listings.length, states);

  const breadcrumbSchema = generateBrandBreadcrumbSchema(slug, brand.display_name, locale);
  const brandSchema = generateBrandPageSchema({
    brandName: brand.display_name,
    slug,
    locale,
    description,
    websiteUrl: brand.website_url,
    propertyCount: listings.length,
    listings: listings.map((l) => ({
      name: l.propertyName,
      url: `${baseUrl}/${locale}/property/${l.publicSlug}`,
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brandSchema) }}
      />
      <GoogleMapsProvider>
        <BrandDetailTemplate
          locale={locale}
          brand={brand}
          parentBrand={parentBrand}
          subBrands={subBrands}
          listings={listings}
          mapPins={mapPins}
          includeSubBrandRollup={includeSubBrandRollup}
        />
      </GoogleMapsProvider>
    </>
  );
}
