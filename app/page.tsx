import { redirect } from 'next/navigation';
import { defaultLocale } from './i18n';

// Root page - redirect to default locale
// All actual content is in app/[locale]/page.tsx
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
  title: "Outdoor Hospitality Resources | Guides, Glossary & Property Data | Sage Outdoor Advisory",
  description: "Comprehensive resources for the outdoor hospitality industry. Access 600+ glamping properties, expert guides on feasibility studies and appraisals, and a complete industry glossary. Your trusted source for outdoor hospitality expertise.",
  keywords: "outdoor hospitality resources, glamping properties, feasibility study guide, RV resort appraisal, campground data, outdoor hospitality glossary, glamping industry, RV park resources",
  openGraph: {
    title: "Outdoor Hospitality Resources | Sage Outdoor Advisory",
    description: "Comprehensive resources for the outdoor hospitality industry. Access guides, glossary terms, and property data.",
    url: "https://resources.sageoutdooradvisory.com",
    siteName: "Sage Outdoor Advisory",
    locale: "en_US",
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
    description: "Comprehensive resources for the outdoor hospitality industry.",
    images: ["https://sageoutdooradvisory.com/og-image.jpg"],
  },
  alternates: {
    canonical: "https://resources.sageoutdooradvisory.com",
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

export default async function HomePage() {
  // Get featured content for homepage
  const allGuides = getAllGuideSlugs().map(slug => getGuide(slug)).filter(Boolean);
  const pillarGuides = allGuides.filter(guide => guide?.slug.endsWith("-complete-guide")).slice(0, 3);
  const recentGuides = allGuides.slice(0, 6);
  
  const glossaryTerms = getAllGlossaryTerms();
  const featuredTerms = glossaryTerms.slice(0, 12); // Top 12 terms
  
  const landingPageSlugs = getAllLandingPageSlugs();
  const featuredLandingPages = landingPageSlugs.slice(0, 6).map(slug => getLandingPage(slug)).filter(Boolean);

  // Generate schema markup
  const organizationSchema = generateOrganizationSchema();
  const guidesListSchema = generateItemListSchema(
    pillarGuides.map(guide => guide?.title || "").filter(Boolean) as string[],
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

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-black border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="https://sageoutdooradvisory.com" className="flex items-center">
                <Image
                  src="/sage-logo-black-header.png"
                  alt="Sage Outdoor Advisory - Outdoor Hospitality Expertise"
                  width={200}
                  height={100}
                  className="h-16 w-auto"
                  priority
                />
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/guides" className="text-white hover:text-gray-300">
                  Guides
                </Link>
                <Link href="/glossary" className="text-white hover:text-gray-300">
                  Glossary
                </Link>
                <Link href="/map" className="text-white hover:text-gray-300">
                  Property Map
                </Link>
                <Link
                  href="https://sageoutdooradvisory.com/contact-us/"
                  className="px-6 py-2 bg-[#00b6a6] text-white rounded-lg hover:bg-[#009688] transition-colors"
                >
                  Contact Us
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
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
            <div className="absolute inset-0 bg-gradient-to-br from-[#006b5f]/90 via-[#006b5f]/80 to-[#00b6a6]/90" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
            <div className="text-center max-w-4xl mx-auto text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
                Outdoor Hospitality Resources
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-white/95 drop-shadow-lg">
                Your comprehensive resource hub for glamping properties, expert guides, and industry insights. 
                Explore 600+ properties, in-depth guides, and a complete glossary of outdoor hospitality terms.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/map"
                  className="px-8 py-4 bg-white text-[#006b5f] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-2xl"
                >
                  Explore Property Map
                </Link>
                <Link
                  href="/guides"
                  className="px-8 py-4 bg-transparent border-2 border-white text-white text-lg font-semibold rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  Browse Guides
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-[#006b5f] mb-2">600+</div>
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
                      href={`/guides/${guide.slug}`}
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
                          <div className="inline-block px-3 py-1 bg-[#00b6a6] text-white text-sm font-semibold rounded-full backdrop-blur-sm">
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
                  href="/guides"
                  className="inline-block px-8 py-3 bg-[#00b6a6] text-white font-semibold rounded-lg hover:bg-[#009688] transition-colors"
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
              alt="Mountain landscape showcasing glamping properties across North America - explore 600+ outdoor hospitality destinations"
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
              Explore 600+ Glamping Properties
            </h2>
            <p className="text-xl mb-8 text-white/95 max-w-3xl mx-auto drop-shadow-lg">
              Discover glamping properties across the United States and Canada on our interactive map. 
              Filter by location, property type, and amenities to find the perfect outdoor hospitality destination.
            </p>
            <Link
              href="/map"
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
                      href={`/glossary/${term.slug}`}
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
                  href="/glossary"
                  className="inline-block px-8 py-3 bg-[#00b6a6] text-white font-semibold rounded-lg hover:bg-[#009688] transition-colors"
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
              className="inline-block px-8 py-4 bg-[#00b6a6] text-white text-lg font-semibold rounded-lg hover:bg-[#009688] transition-colors shadow-2xl"
            >
              Schedule Free Consultation
            </Link>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}