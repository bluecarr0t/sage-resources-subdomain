import type { PODCAST_EPISODE_PATHS } from '@/lib/podcast-episode-paths';

export type PodcastEpisodeKey = keyof typeof PODCAST_EPISODE_PATHS;

/** One mapped episode for glossary or guide contextual links. */
export type PodcastContextLink = {
  episodeKey: PodcastEpisodeKey;
  /** Descriptive anchor text (SEO). */
  episodeTitle: string;
};

/** Glossary term podcast placement (rendered inside “Understanding {term}”). */
export type GlossaryPodcastPlacement = {
  links: PodcastContextLink[];
  /** Text before the first link. Default: “For operator perspective, listen to ” */
  intro?: string;
};

/** Guide section podcast placement. */
export type GuidePodcastPlacement = {
  sectionId: string;
  links: PodcastContextLink[];
  intro?: string;
  /** Joiner when multiple links share one paragraph (e.g. “ and ”). */
  linkJoiner?: string;
  /** Text after the last link. Default: “ on The Outdoor Hospitality Podcast.” */
  outro?: string;
};
