import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import dynamic from 'next/dynamic';
import { getAllGuideSlugs, getGuide, getGuidesByCategory } from "@/lib/guides";
import { getAllGlossaryTerms } from "@/lib/glossary/index";
import { getAllLandingPageSlugs, getLandingPageSync } from "@/lib/landing-pages";
import { generateOrganizationSchema, generateItemListSchemaWithUrls } from "@/lib/schema";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { createLocaleLinks } from "@/lib/locale-links";
import { notFound } from "next/navigation";

// Dynamically import LocationSearch to prevent SSR issues
const DynamicLocationSearch = dynamic(() => import('@/components/LocationSearch'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 border border-white/20">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-14 bg-gray-200 rounded-xl animate-pulse" />
          <div className="w-32 h-14 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  ),
});

interface PageProps {
  params: {
    locale: string;
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { locale } = params;
    
    // Validate locale
    if (!locales.includes(locale as Locale)) {
      notFound();
    }
    
    const pathname = `/${locale}`;
    const url = `https://resources.sageoutdooradvisory.com${pathname}`;
    
    let hreflangAlternates: Metadata['alternates'] = {};
    try {
      hreflangAlternates = generateHreflangAlternates(pathname);
    } catch (error) {
      console.error('Error generating hreflang alternates:', error);
      hreflangAlternates = {};
    }
    
    let openGraphLocale = 'en_US';
    try {
      openGraphLocale = getOpenGraphLocale(locale as Locale);
    } catch (error) {
      console.error('Error getting OpenGraph locale:', error);
    }
    
    return {
      title: "Find Glamping Near You | 500+ Properties Across North America | Sage Outdoor Advisory",
      description: "Discover 500+ unique glamping properties near you. Search by location across the US and Canada. From luxury safari tents to cozy cabins, find your perfect outdoor adventure today.",
      keywords: "glamping properties, glamping guides, outdoor hospitality, glamping feasibility studies, glamping appraisals, glamping resources, glamping destinations, luxury camping, glamping industry, glamping business",
      openGraph: {
        title: "Find Glamping Near You | 500+ Properties Across North America | Sage Outdoor Advisory",
        description: "Discover 500+ unique glamping properties near you. Search by location across the US and Canada. From luxury safari tents to cozy cabins, find your perfect outdoor adventure.",
        url,
        siteName: "Sage Outdoor Advisory",
        locale: openGraphLocale,
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
        title: "Find Glamping Near You | 500+ Properties Across North America",
        description: "Discover 500+ unique glamping properties near you. Search by location across the US and Canada. Find your perfect outdoor adventure.",
        images: ["https://sageoutdooradvisory.com/og-image.jpg"],
      },
      alternates: {
        canonical: url,
        ...hreflangAlternates,
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
  } catch (error) {
    console.error('Error generating metadata:', error);
    // Return basic metadata as fallback
    return {
      title: "Sage Outdoor Advisory - Outdoor Hospitality Resources",
      description: "Comprehensive resources for the outdoor hospitality industry.",
    };
  }
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  try {
    // Create locale-aware links
    const links = createLocaleLinks(locale);
    
    // Get featured content for homepage with error handling
    let allGuides: Array<NonNullable<ReturnType<typeof getGuide>>> = [];
    try {
      const guideSlugs = getAllGuideSlugs();
      allGuides = guideSlugs
        .map(slug => {
          try {
            return getGuide(slug);
          } catch (error) {
            console.error(`Error loading guide ${slug}:`, error);
            return null;
          }
        })
        .filter((guide): guide is NonNullable<typeof guide> => guide !== null);
    } catch (error) {
      console.error('Error loading guides:', error);
      allGuides = [];
    }
    
    const pillarGuides = allGuides.filter(guide => guide?.slug.endsWith("-complete-guide")).slice(0, 3);
    const recentGuides = allGuides.slice(0, 6);
    
    let glossaryTerms: ReturnType<typeof getAllGlossaryTerms> = [];
    try {
      glossaryTerms = getAllGlossaryTerms();
    } catch (error) {
      console.error('Error loading glossary terms:', error);
      glossaryTerms = [];
    }
    const featuredTerms = glossaryTerms.slice(0, 12); // Top 12 terms
    
    let featuredLandingPages: Array<NonNullable<ReturnType<typeof getLandingPageSync>>> = [];
    try {
      const landingPageSlugs = getAllLandingPageSlugs();
      featuredLandingPages = landingPageSlugs
        .slice(0, 6)
        .map(slug => {
          try {
            return getLandingPageSync(slug);
          } catch (error) {
            console.error(`Error loading landing page ${slug}:`, error);
            return null;
          }
        })
        .filter((page): page is NonNullable<typeof page> => page !== null);
    } catch (error) {
      console.error('Error loading landing pages:', error);
      featuredLandingPages = [];
    }

    // Generate schema markup
    const organizationSchema = generateOrganizationSchema();
    // Generate ItemList with URLs for carousel eligibility
    const guidesListSchema = generateItemListSchemaWithUrls(
      pillarGuides
        .filter((guide): guide is NonNullable<typeof guide> => guide !== null)
        .map(guide => ({
          name: guide.title,
          url: links.guide(guide.slug)
        })),
      "Featured Guides"
    );

    return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guidesListSchema) }}
      />

      <GoogleMapsProvider>
        <div className="min-h-screen bg-white">
        {/* Floating Header */}
        <FloatingHeader locale={locale} showFullNav={true} showSpacer={false} />

        {/* Hero Section */}
        <section className="relative overflow-hidden h-screen">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/tipi.jpg"
              alt="Tipi glamping accommodation in natural outdoor setting - representing outdoor hospitality resources and glamping properties"
              fill
              className="object-cover"
              priority
              fetchPriority="high"
              quality={90}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#006b5f]/40 via-[#006b5f]/30 to-[#00b6a6]/40" />
          </div>
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="text-center max-w-5xl mx-auto text-white">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 drop-shadow-2xl">
                  Your Complete Glamping Resource
                </h1>
                <p className="text-xl md:text-2xl mb-10 text-white/95 drop-shadow-lg max-w-3xl mx-auto">
                  500+ properties, expert guides, and industry resources for travelers and outdoor hospitality professionals.
                </p>
                
                {/* Location Search */}
                <div className="mb-8">
                  <DynamicLocationSearch locale={locale} />
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-white/90">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm md:text-base">500+ Properties</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm md:text-base">US & Canada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm md:text-base">Verified Listings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-[#006b5f] mb-2">500+</div>
                <div className="text-gray-600">Properties</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[#006b5f] mb-2">21</div>
                <div className="text-gray-600">Expert Guides</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[#006b5f] mb-2">57+</div>
                <div className="text-gray-600">Glossary Terms</div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Pillar Guides */}
        {pillarGuides.length > 0 && (
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Comprehensive Guides
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  In-depth, expert-written guides covering every aspect of outdoor hospitality feasibility studies, appraisals, and industry insights.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {pillarGuides.map((guide, index) => {
                  if (!guide) return null;
                  const guideImages = ['https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/safari-tent.jpg', 'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/yurt.jpg', 'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/geodesic-dome.jpg'];
                  const guideImage = guideImages[index % guideImages.length];
                  return (
                    <Link
                      key={guide.slug}
                      href={links.guide(guide.slug)}
                      className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-[#00b6a6] hover:shadow-xl transition-all group"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={guideImage}
                          alt={`${guide.title} - Expert guide on outdoor hospitality ${guide.category}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        <div className="absolute top-4 left-4">
                          <div className="inline-block px-3 py-1 bg-[#006b5f] text-white text-sm font-semibold rounded-full backdrop-blur-sm">
                            {guide.category === 'feasibility' ? 'Feasibility' : guide.category === 'appraisal' ? 'Appraisal' : 'Industry'}
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#006b5f] transition-colors">
                          {guide.title}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {guide.metaDescription}
                        </p>
                        <span className="text-[#006b5f] font-semibold group-hover:underline">
                          Read Guide →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="text-center mt-8">
                <Link
                  href={links.guides}
                  className="inline-block px-8 py-3 bg-[#006b5f] text-white font-semibold rounded-lg hover:bg-[#005a4f] transition-colors"
                >
                  View All Guides
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Property Map CTA */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg"
              alt="Mountain landscape showcasing glamping properties across North America - explore 500+ outdoor hospitality destinations"
              fill
              className="object-cover"
              loading="lazy"
              quality={85}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#006b5f]/90 via-[#006b5f]/85 to-[#00b6a6]/90" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white text-center">
            <h2 className="text-4xl font-bold mb-4 drop-shadow-2xl">
              Explore 500+ Glamping Properties
            </h2>
            <p className="text-xl mb-8 text-white/95 max-w-3xl mx-auto drop-shadow-lg">
              Discover glamping properties across the United States and Canada on our interactive map. 
              Filter by location, property type, and amenities to find the perfect outdoor hospitality destination.
            </p>
            <Link
              href={links.map}
              className="inline-block px-8 py-4 bg-white text-[#006b5f] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-2xl"
            >
              View Interactive Map →
            </Link>
          </div>
        </section>

        {/* Featured Glossary Terms */}
        {featuredTerms.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Industry Glossary
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Comprehensive definitions for outdoor hospitality industry terms. Perfect for understanding feasibility studies, appraisals, and industry terminology.
                </p>
              </div>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {featuredTerms.slice(0, 8).map((term, index) => {
                  const glossaryImages = [
                    'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/a-frame-cabin.jpg',
                    'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/bell-tent.jpg',
                    'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/canvas-tent.jpg',
                    'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/treehouse.jpg',
                    'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/yurt.jpg',
                    'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/safari-tent.jpg',
                    'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/cabin.jpg',
                    'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/geodesic-dome.jpg'
                  ];
                  const termImage = term.image || glossaryImages[index % glossaryImages.length];
                  return (
                    <Link
                      key={term.slug}
                      href={links.glossaryTerm(term.slug)}
                      className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all border border-gray-200 hover:border-[#00b6a6] group"
                    >
                      {termImage && (
                        <div className="relative h-32 overflow-hidden">
                          <Image
                            src={termImage}
                            alt={`${term.term} - ${term.definition.substring(0, 60)}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 25vw, 300px"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="text-xs text-gray-500 mb-1">{term.category}</div>
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-[#006b5f] transition-colors">
                          {term.term}
                        </h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="text-center mt-8">
                <Link
                  href={links.glossary}
                  className="inline-block px-8 py-3 bg-[#006b5f] text-white font-semibold rounded-lg hover:bg-[#005a4f] transition-colors"
                >
                  Browse All Terms
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg"
              alt="Natural forest setting for outdoor hospitality expert consultation - feasibility studies and appraisals"
              fill
              className="object-cover"
              loading="lazy"
              quality={85}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-[#006b5f]/95" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white text-center">
            <h2 className="text-4xl font-bold mb-4 drop-shadow-2xl">
              Need Expert Guidance?
            </h2>
            <p className="text-xl mb-8 text-white/95 drop-shadow-lg">
              Our team of outdoor hospitality experts can help with feasibility studies, appraisals, and market analysis for your project.
            </p>
            <Link
              href="https://sageoutdooradvisory.com/contact-us/"
              className="inline-block px-8 py-4 bg-[#006b5f] text-white text-lg font-semibold rounded-lg hover:bg-[#005a4f] transition-colors shadow-2xl"
            >
              Schedule Free Consultation
            </Link>
          </div>
        </section>

        {/* Footer */}
        <Footer />
        </div>
      </GoogleMapsProvider>
    </>
    );
  } catch (error) {
    // Log the error for debugging
    console.error('Error rendering home page:', error);
    
    // Re-throw the error to trigger the error boundary
    throw error;
  }
}