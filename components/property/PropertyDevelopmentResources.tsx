'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createLocaleLinks } from '@/lib/locale-links';
import {
  EDITORIAL_LINK_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';

type PropertyDevelopmentResourcesProps = {
  locale: string;
};

export default function PropertyDevelopmentResources({ locale }: PropertyDevelopmentResourcesProps) {
  const t = useTranslations('property.resources');
  const links = createLocaleLinks(locale);

  const resourceLinks = [
    { href: links.guide('feasibility-studies-complete-guide'), label: t('feasibilityGuide') },
    { href: links.guide('feasibility-study-process-timeline'), label: t('timelineGuide') },
    { href: links.glossaryTerm('feasibility-study'), label: t('feasibilityGlossary') },
    { href: links.landing('glamping-feasibility-study'), label: t('feasibilityService') },
    { href: links.glossaryTerm('glamping'), label: t('glampingGlossary') },
  ];

  return (
    <section
      className="mt-14 border border-sage-200/90 bg-white/40 px-6 py-8 sm:px-8"
      aria-labelledby="property-resources-heading"
    >
      <h2 id="property-resources-heading" className={EDITORIAL_SECTION_LABEL_CLASS}>
        {t('title')}
      </h2>
      <p className="mt-4 max-w-prose text-sm font-light leading-relaxed text-neutral-700">
        {t('description')}
      </p>
      <ul className="mt-6 space-y-2 border-l border-sage-200 pl-4 text-sm font-light">
        {resourceLinks.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={EDITORIAL_LINK_CLASS}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[11px] font-light leading-relaxed text-neutral-500">
        {t('footnote')}
      </p>
    </section>
  );
}
