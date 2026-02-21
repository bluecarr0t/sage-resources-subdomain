import Link from "next/link";
import { GuideContent, getGuideSync, getGuidesByCategory } from "@/lib/guides";
import { createLocaleLinks } from "@/lib/locale-links";

interface RelatedGuidesProps {
  currentGuide: GuideContent;
  maxGuides?: number;
  locale?: string;
}

export default function RelatedGuides({ 
  currentGuide, 
  maxGuides = 6,
  locale = "en"
}: RelatedGuidesProps) {
  // Guides are English-only - use content-aware links to avoid broken de/es/fr URLs
  const links = createLocaleLinks(locale);
  // Get related guides from the current guide's relatedGuides field if available
  const explicitRelated: GuideContent[] = [];
  if (currentGuide.relatedGuides && currentGuide.relatedGuides.length > 0) {
    currentGuide.relatedGuides.forEach((slug) => {
      const guide = getGuideSync(slug);
      if (guide && guide.slug !== currentGuide.slug) {
        explicitRelated.push(guide);
      }
    });
  }

  // Auto-discover related guides from the same category
  const categoryGuides = getGuidesByCategory(currentGuide.category);
  const autoRelated = categoryGuides
    .filter((guide) => {
      // Exclude current guide and already explicitly related guides
      if (guide.slug === currentGuide.slug) return false;
      if (explicitRelated.some((g) => g.slug === guide.slug)) return false;
      return true;
    })
    .slice(0, maxGuides - explicitRelated.length);

  // Combine explicit and auto-discovered guides
  const relatedGuides = [...explicitRelated, ...autoRelated].slice(0, maxGuides);

  if (relatedGuides.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Related Comprehensive Guides
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {relatedGuides.map((guide) => (
            <Link
              key={guide.slug}
              href={links.guide(guide.slug)}
              className="block bg-white p-6 rounded-lg border-2 border-gray-200 hover:shadow-lg hover:border-[#00b6a6] transition-all group"
            >
              <div className="inline-block px-3 py-1 bg-[#00b6a6]/10 text-[#006b5f] text-sm font-semibold rounded-full mb-3">
                {guide.category === 'feasibility' ? 'Feasibility' : 
                 guide.category === 'appraisal' ? 'Appraisal' : 'Industry'}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#006b5f] transition-colors">
                {guide.title}
              </h3>
              <p className="text-gray-600 text-sm line-clamp-3">
                {guide.metaDescription}
              </p>
              <span className="inline-block mt-3 text-[#006b5f] hover:text-[#005a4f] font-medium text-sm group-hover:underline">
                Read guide →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}