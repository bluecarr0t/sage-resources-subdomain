import Link from "next/link";
import { GlossaryTerm, getAllGlossaryTerms, getGlossaryTermsByCategory } from "@/lib/glossary/index";

interface RelatedGlossaryTermsProps {
  currentTerm: GlossaryTerm;
  maxTerms?: number;
  locale?: string;
}

export default function RelatedGlossaryTerms({ 
  currentTerm, 
  maxTerms = 6,
  locale = "en"
}: RelatedGlossaryTermsProps) {
  // Get related terms from the current term's relatedTerms field if available
  const explicitRelated: GlossaryTerm[] = [];
  if (currentTerm.relatedTerms && currentTerm.relatedTerms.length > 0) {
    const allTerms = getAllGlossaryTerms();
    currentTerm.relatedTerms.forEach((slug) => {
      const term = allTerms.find((t) => t.slug === slug);
      if (term && term.slug !== currentTerm.slug) {
        explicitRelated.push(term);
      }
    });
  }

  // Auto-discover related terms from the same category
  const categoryTerms = getGlossaryTermsByCategory(currentTerm.category);
  const autoRelated = categoryTerms
    .filter((term) => {
      // Exclude current term and already explicitly related terms
      if (term.slug === currentTerm.slug) return false;
      if (explicitRelated.some((t) => t.slug === term.slug)) return false;
      return true;
    })
    .slice(0, maxTerms - explicitRelated.length);

  // Combine explicit and auto-discovered terms
  const relatedTerms = [...explicitRelated, ...autoRelated].slice(0, maxTerms);

  if (relatedTerms.length === 0) {
    return null;
  }

  const localePrefix = locale !== "en" ? `/${locale}` : "";

  return (
    <section className="py-8 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Related Glossary Terms
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {relatedTerms.map((term) => (
            <Link
              key={term.slug}
              href={`${localePrefix}/glossary/${term.slug}`}
              className="block bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md hover:border-[#00b6a6] transition-all group text-center"
            >
              <div className="text-xs text-gray-500 mb-1">{term.category}</div>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#006b5f] transition-colors">
                {term.term}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}