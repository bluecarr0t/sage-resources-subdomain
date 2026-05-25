import { EDITORIAL_BODY_CLASS } from '@/components/editorial/EditorialPageShell';
import { buildPodcastEpisodeUrl, type PodcastContentMedium } from '@/lib/podcast-content-links';
import { PODCAST_EPISODE_PATHS } from '@/lib/podcast-episode-paths';
import type { PodcastContextLink } from '@/lib/podcast-types';

const DEFAULT_INTRO = 'For operator perspective, listen to ';

type PodcastContextLinksProps = {
  links: PodcastContextLink[];
  contentSlug: string;
  medium: PodcastContentMedium;
  /** Glossary uses editorial link class; guides use sage green underline. */
  variant?: 'glossary' | 'guide';
  intro?: string;
  /** Joiner when multiple links share one paragraph (e.g. " and "). */
  linkJoiner?: string;
  /** Text after the last anchor. Default ends with “ on The Outdoor Hospitality Podcast.” */
  outro?: string;
};

function episodeHref(
  link: PodcastContextLink,
  medium: PodcastContentMedium,
  contentSlug: string,
): string {
  return buildPodcastEpisodeUrl({
    path: PODCAST_EPISODE_PATHS[link.episodeKey],
    medium,
    content: contentSlug,
  });
}

function defaultOutro() {
  return (
    <>
      {' on '}
      <em>The Outdoor Hospitality Podcast</em>.
    </>
  );
}

/**
 * In-body podcast paragraph(s) for glossary terms and guide sections.
 * Keeps SEO placement in main content while centralizing URLs and UTMs.
 */
export function PodcastContextLinks({
  links,
  contentSlug,
  medium,
  variant = 'glossary',
  intro = DEFAULT_INTRO,
  linkJoiner,
  outro,
}: PodcastContextLinksProps) {
  if (links.length === 0) {
    return null;
  }

  const linkClass =
    variant === 'guide'
      ? 'text-[#006b5f] hover:text-[#005a4f] underline'
      : 'font-light text-neutral-800 underline decoration-sage-400/80 underline-offset-2 hover:text-neutral-900';

  const suffix = outro ?? null;

  if (linkJoiner && links.length > 1) {
    return (
      <p className={EDITORIAL_BODY_CLASS}>
        {intro}
        {links.map((link, index) => (
          <span key={link.episodeKey}>
            {index > 0 ? linkJoiner : null}
            <a
              href={episodeHref(link, medium, contentSlug)}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {link.episodeTitle}
            </a>
          </span>
        ))}
        {suffix ?? defaultOutro()}
      </p>
    );
  }

  return (
    <>
      {links.map((link) => (
        <p key={link.episodeKey} className={EDITORIAL_BODY_CLASS}>
          {intro}
          <a
            href={episodeHref(link, medium, contentSlug)}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {link.episodeTitle}
          </a>
          {suffix ?? defaultOutro()}
        </p>
      ))}
    </>
  );
}
