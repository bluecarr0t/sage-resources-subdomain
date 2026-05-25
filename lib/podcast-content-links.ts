import {
  buildPodcastUrl,
  type PodcastUtmMedium,
} from '@/lib/outdoor-hospitality-podcast';
import { PODCAST_EPISODE_PATHS } from '@/lib/podcast-episode-paths';

export { PODCAST_EPISODE_PATHS };

export type PodcastContentMedium = Extract<
  PodcastUtmMedium,
  'glossary-term' | 'guides-page'
>;

export function buildPodcastEpisodeUrl(options: {
  path: string;
  medium: PodcastContentMedium;
  content: string;
}): string {
  return buildPodcastUrl({
    path: options.path,
    medium: options.medium,
    content: options.content,
  });
}
