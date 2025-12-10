import Link from "next/link";
import { getLandingPageSync, getAllLandingPageSlugs, LandingPageContent } from "@/lib/landing-pages";

interface RelatedLandingPagesProps {
  currentPage: LandingPageContent;
  maxPages?: number;
  locale?: string;
}

export default function RelatedLandingPages({ 
  currentPage, 
  maxPages = 4,
  locale = "en"
}: RelatedLandingPagesProps) {
  // Get related pages from the current page's relatedPages field if available
  const explicitRelated: LandingPageContent[] = [];
  if (currentPage.relatedPages && currentPage.relatedPages.length > 0) {
    currentPage.relatedPages.forEach((slug) => {
      const page = getLandingPageSync(slug);
      if (page && page.slug !== currentPage.slug) {
        explicitRelated.push(page);
      }
    });
  }

  // Auto-discover related pages based on keywords or service type
  let autoRelated: LandingPageContent[] = [];
  if (explicitRelated.length < maxPages) {
    const allPages = getAllLandingPageSlugs()
      .map((slug) => getLandingPageSync(slug))
      .filter((page): page is LandingPageContent => page !== null);

    // Find pages with similar keywords or service type
    const currentKeywords = currentPage.keywords || [];
    const currentSlug = currentPage.slug;

    autoRelated = allPages
      .filter((page) => {
        // Exclude current page and already explicitly related pages
        if (page.slug === currentSlug) return false;
        if (explicitRelated.some((p) => p.slug === page.slug)) return false;

        // Match by keywords if available
        if (currentKeywords.length > 0 && page.keywords) {
          const matchingKeywords = page.keywords.filter((keyword) =>
            currentKeywords.some((k) => k.toLowerCase().includes(keyword.toLowerCase()) ||
                                       keyword.toLowerCase().includes(k.toLowerCase()))
          );
          return matchingKeywords.length > 0;
        }

        // Match by service type in slug (e.g., both have "feasibility" or "appraisal")
        const currentServiceType = currentSlug.includes('feasibility') ? 'feasibility' :
                                  currentSlug.includes('appraisal') ? 'appraisal' :
                                  currentSlug.includes('finance') ? 'finance' : null;
        
        if (currentServiceType && page.slug.includes(currentServiceType)) {
          return true;
        }

        return false;
      })
      .slice(0, maxPages - explicitRelated.length);
  }

  // Combine explicit and auto-discovered pages
  const relatedPages = [...explicitRelated, ...autoRelated].slice(0, maxPages);

  if (relatedPages.length === 0) {
    return null;
  }

  const localePrefix = locale !== "en" ? `/${locale}` : "";

  return (
    <section className="py-12 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Related Resources
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedPages.map((page) => (
            <Link
              key={page.slug}
              href={`${localePrefix}/landing/${page.slug}`}
              className="block bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg hover:border-[#00b6a6] transition-all group"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#006b5f] transition-colors line-clamp-2">
                {page.title}
              </h3>
              <p className="text-gray-600 text-sm line-clamp-2">
                {page.metaDescription}
              </p>
              <span className="inline-block mt-3 text-[#006b5f] hover:text-[#005a4f] font-medium text-sm group-hover:underline">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}