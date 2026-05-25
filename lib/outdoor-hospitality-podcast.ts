/**
 * The Outdoor Hospitality Podcast — owned by Sage Outdoor Advisory.
 * Central URLs and UTM helpers for resources-subdomain → podcast traffic.
 *
 * @see docs/guides/OUTDOOR_HOSPITALITY_PODCAST_ALIGNMENT.md
 */

export const OUTDOOR_HOSPITALITY_PODCAST = {
  name: 'The Outdoor Hospitality Podcast',
  siteUrl: 'https://www.outdoorhospitalitypod.com/',
  episodesUrl: 'https://www.outdoorhospitalitypod.com/episodes/',
  applePodcastsUrl: 'https://podcasts.apple.com/us/podcast/id1549199712',
  spotifyUrl: 'https://open.spotify.com/show/4NP8Gn3ss6y3569V2NVJAP',
  rssUrl: 'https://feeds.buzzsprout.com/1616818.rss',
} as const;

export type PodcastUtmMedium =
  | 'footer'
  | 'glossary-index'
  | 'glossary-sidebar'
  | 'glossary-term'
  | 'guides-index'
  | 'guides-page';

export type PodcastUtmCampaign = 'podcast';

const UTM_SOURCE = 'resources';

/**
 * Build a podcast URL with consistent GA-friendly UTM parameters.
 * @param path - Path on outdoorhospitalitypod.com (e.g. `/episodes/`). Defaults to `/`.
 */
export function buildPodcastUrl(options: {
  medium: PodcastUtmMedium;
  content?: string;
  path?: string;
  campaign?: PodcastUtmCampaign;
}): string {
  const base = new URL(
    options.path ?? '/',
    OUTDOOR_HOSPITALITY_PODCAST.siteUrl,
  );
  base.searchParams.set('utm_source', UTM_SOURCE);
  base.searchParams.set('utm_medium', options.medium);
  base.searchParams.set('utm_campaign', options.campaign ?? 'podcast');
  if (options.content) {
    base.searchParams.set('utm_content', options.content);
  }
  return base.toString();
}

/** Default “start here” destination for glossary sidebar (episode index). */
export function getPodcastStartHereUrl(content?: string): string {
  return buildPodcastUrl({
    path: '/episodes/',
    medium: 'glossary-sidebar',
    content,
  });
}
