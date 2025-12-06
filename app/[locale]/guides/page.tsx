import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllGuideSlugs, getGuidesByCategory, getGuide } from "@/lib/guides";
import GuidesIndex from "@/components/GuidesIndex";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { createLocaleLinks } from "@/lib/locale-links";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    locale: string;
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const pathname = `/${locale}/guides`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;
  
  return {
    title: "Outdoor Hospitality Guides | Expert Resources | Sage Outdoor Advisory",
    description: "Expert guides on feasibility studies, property appraisals, and outdoor hospitality. Essential reading for glamping, RV resort, and campground developers and investors.",
    keywords: "feasibility study guides, property appraisal guides, glamping guides, RV resort guides, outdoor hospitality resources, campground development guides",
    openGraph: {
      title: "Outdoor Hospitality Guides | Sage Outdoor Advisory",
      description: "Comprehensive guides covering feasibility studies, property appraisals, and the outdoor hospitality industry",
      url,
      siteName: "Sage Outdoor Advisory",
      locale: getOpenGraphLocale(locale as Locale),
      type: "website",
      images: [
        {
          url: "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg",
          width: 1920,
          height: 1080,
          alt: "Outdoor hospitality guides background featuring scenic landscape gradient",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: ["https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg"],
    },
    alternates: {
      canonical: url,
      ...generateHreflangAlternates(pathname),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}

export default function GuidesPage({ params }: PageProps) {
  const { locale } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  const allGuides = getAllGuideSlugs()
    .map((slug) => getGuide(slug))
    .filter((guide): guide is NonNullable<typeof guide> => guide !== null);
  const feasibilityGuides = getGuidesByCategory("feasibility");
  const appraisalGuides = getGuidesByCategory("appraisal");
  const industryGuides = getGuidesByCategory("industry");

  // Separate pillar pages (complete guides) from cluster pages for each category
  const categories = [
    {
      id: "feasibility",
      name: "Feasibility Studies",
      description: "Learn everything about feasibility studies for outdoor hospitality projects",
      guides: feasibilityGuides,
      pillarPages: feasibilityGuides.filter((guide) =>
        guide.slug.endsWith("-complete-guide")
      ),
      clusterPages: feasibilityGuides.filter(
        (guide) => !guide.slug.endsWith("-complete-guide")
      ),
    },
    {
      id: "appraisal",
      name: "Property Appraisals",
      description: "Comprehensive guides on property appraisals for outdoor hospitality properties",
      guides: appraisalGuides,
      pillarPages: appraisalGuides.filter((guide) =>
        guide.slug.endsWith("-complete-guide")
      ),
      clusterPages: appraisalGuides.filter(
        (guide) => !guide.slug.endsWith("-complete-guide")
      ),
    },
    {
      id: "industry",
      name: "Industry Guides",
      description: "In-depth guides about the glamping and RV resort industry",
      guides: industryGuides,
      pillarPages: industryGuides.filter((guide) =>
        guide.slug.endsWith("-complete-guide")
      ),
      clusterPages: industryGuides.filter(
        (guide) => !guide.slug.endsWith("-complete-guide")
      ),
    },
  ];

  const links = createLocaleLinks(locale);

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <FloatingHeader locale={locale} showSpacer={false} />

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-36 pb-32 md:pb-40 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg"
            alt="Outdoor hospitality guides background featuring scenic landscape gradient"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={90}
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-indigo-900/40" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
              Outdoor Hospitality Guides
            </h1>
            <p className="text-xl text-white/95 max-w-3xl mx-auto drop-shadow-md">
              Comprehensive, expert-written guides covering feasibility studies, property appraisals, and the outdoor hospitality industry
            </p>
          </div>
        </div>
      </section>

      <main>
        {/* Guides Index Component */}
        <GuidesIndex allGuides={allGuides} categories={categories} />

        {/* CTA Section */}
        <section className="bg-[#00b6a6] py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Need Help with Your Outdoor Hospitality Project?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Our experts have completed over 350 feasibility studies and appraisals. Get personalized guidance for your project.
            </p>
            <Link
              href="https://sageoutdooradvisory.com/contact-us/"
              className="inline-block px-8 py-4 bg-white text-[#006b5f] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Schedule Free Consultation
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
