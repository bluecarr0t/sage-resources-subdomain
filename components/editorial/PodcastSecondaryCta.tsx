import {
  EDITORIAL_BODY_CLASS,
  EDITORIAL_BUTTON_OUTLINE_CLASS,
  EDITORIAL_H2_CLASS,
} from '@/components/editorial/EditorialPageShell';

type PodcastSecondaryCtaProps = {
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
};

/**
 * Secondary callout for The Outdoor Hospitality Podcast — visually lighter than
 * consultation EditorialCtaBand so feasibility CTAs stay primary.
 */
export function PodcastSecondaryCta({
  title,
  description,
  buttonLabel,
  buttonHref,
}: PodcastSecondaryCtaProps) {
  return (
    <section
      className="mt-8 border border-sage-200/70 bg-sage-50/40 px-6 py-8 sm:px-8"
      aria-labelledby="podcast-secondary-cta-heading"
    >
      <h2 id="podcast-secondary-cta-heading" className={`${EDITORIAL_H2_CLASS} text-xl`}>
        {title}
      </h2>
      <p className={`mt-3 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>{description}</p>
      <a
        href={buttonHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`${EDITORIAL_BUTTON_OUTLINE_CLASS} mt-5`}
      >
        {buttonLabel}
      </a>
    </section>
  );
}
