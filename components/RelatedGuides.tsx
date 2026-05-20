import Link from 'next/link';
import { GuideContent, getGuideSync, getGuidesByCategory } from '@/lib/guides';
import { createLocaleLinks } from '@/lib/locale-links';
import {
  EDITORIAL_BODY_CLASS,
  EDITORIAL_CARD_CLASS,
  EDITORIAL_GLOSSARY_TERM_TITLE_CLASS,
  EDITORIAL_H2_CLASS,
  EDITORIAL_LINK_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';

interface RelatedGuidesProps {
  currentGuide: GuideContent;
  maxGuides?: number;
  locale?: string;
}

const CATEGORY_LABELS: Record<GuideContent['category'], string> = {
  feasibility: 'Feasibility',
  appraisal: 'Appraisal',
  industry: 'Industry',
};

export default function RelatedGuides({
  currentGuide,
  maxGuides = 6,
  locale = 'en',
}: RelatedGuidesProps) {
  const links = createLocaleLinks(locale);
  const explicitRelated: GuideContent[] = [];
  if (currentGuide.relatedGuides && currentGuide.relatedGuides.length > 0) {
    currentGuide.relatedGuides.forEach((slug) => {
      const guide = getGuideSync(slug);
      if (guide && guide.slug !== currentGuide.slug) {
        explicitRelated.push(guide);
      }
    });
  }

  const categoryGuides = getGuidesByCategory(currentGuide.category);
  const autoRelated = categoryGuides
    .filter((guide) => {
      if (guide.slug === currentGuide.slug) return false;
      if (explicitRelated.some((g) => g.slug === guide.slug)) return false;
      return true;
    })
    .slice(0, maxGuides - explicitRelated.length);

  const relatedGuides = [...explicitRelated, ...autoRelated].slice(0, maxGuides);

  if (relatedGuides.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 border-t border-sage-200/80 pt-14">
      <h2 className={EDITORIAL_H2_CLASS}>Related guides</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {relatedGuides.map((guide) => (
          <Link
            key={guide.slug}
            href={links.guide(guide.slug)}
            className={`${EDITORIAL_CARD_CLASS} group`}
          >
            <span className={`${EDITORIAL_SECTION_LABEL_CLASS} font-medium`}>
              {CATEGORY_LABELS[guide.category]}
            </span>
            <h3
              className={`mt-2 ${EDITORIAL_GLOSSARY_TERM_TITLE_CLASS} transition-colors group-hover:text-sage-800`}
            >
              {guide.hero.headline}
            </h3>
            <p className={`mt-2 line-clamp-3 ${EDITORIAL_BODY_CLASS}`}>{guide.metaDescription}</p>
            <span className={`mt-4 inline-block text-[11px] uppercase tracking-wider ${EDITORIAL_LINK_CLASS}`}>
              Read guide →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
