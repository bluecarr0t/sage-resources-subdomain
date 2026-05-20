import Link from 'next/link';
import { GlossaryTerm, getAllGlossaryTerms, getGlossaryTermsByCategory } from '@/lib/glossary/index';
import { createLocaleLinks } from '@/lib/locale-links';
import { getGlossaryCategoryAccent } from '@/lib/glossary-category-accent';
import {
  EDITORIAL_CARD_CLASS,
  EDITORIAL_GLOSSARY_TERM_TITLE_CLASS,
  EDITORIAL_H2_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';

interface RelatedGlossaryTermsProps {
  currentTerm: GlossaryTerm;
  maxTerms?: number;
  locale?: string;
}

export default function RelatedGlossaryTerms({
  currentTerm,
  maxTerms = 8,
  locale = 'en',
}: RelatedGlossaryTermsProps) {
  const explicitRelated: GlossaryTerm[] = [];
  if (currentTerm.relatedTerms && currentTerm.relatedTerms.length > 0) {
    const allTerms = getAllGlossaryTerms();
    currentTerm.relatedTerms.forEach((slug) => {
      const related = allTerms.find((t) => t.slug === slug);
      if (related && related.slug !== currentTerm.slug) {
        explicitRelated.push(related);
      }
    });
  }

  const categoryTerms = getGlossaryTermsByCategory(currentTerm.category);
  const autoRelated = categoryTerms
    .filter((term) => {
      if (term.slug === currentTerm.slug) return false;
      if (explicitRelated.some((t) => t.slug === term.slug)) return false;
      return true;
    })
    .slice(0, maxTerms - explicitRelated.length);

  const relatedTerms = [...explicitRelated, ...autoRelated].slice(0, maxTerms);

  if (relatedTerms.length === 0) {
    return null;
  }

  const links = createLocaleLinks(locale);

  return (
    <section className="mt-16 border-t border-sage-200/80 pt-14">
      <h2 className={EDITORIAL_H2_CLASS}>Related glossary terms</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {relatedTerms.map((term) => {
          const accent = getGlossaryCategoryAccent(term.category);
          return (
            <Link
              key={term.slug}
              href={links.glossaryTerm(term.slug)}
              className={`${EDITORIAL_CARD_CLASS} group text-center ${accent.card}`}
            >
              <span className={`text-[10px] font-medium uppercase tracking-wider ${accent.label}`}>
                {term.category}
              </span>
              <h3
                className={`mt-2 ${EDITORIAL_GLOSSARY_TERM_TITLE_CLASS} transition-colors group-hover:text-sage-800`}
              >
                {term.term}
              </h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
