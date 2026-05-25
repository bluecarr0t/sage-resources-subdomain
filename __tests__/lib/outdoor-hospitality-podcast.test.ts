import { buildPodcastEpisodeUrl } from '@/lib/podcast-content-links';
import {
  buildPodcastUrl,
  getPodcastStartHereUrl,
  OUTDOOR_HOSPITALITY_PODCAST,
} from '@/lib/outdoor-hospitality-podcast';
import { PODCAST_EPISODE_PATHS } from '@/lib/podcast-episode-paths';

describe('outdoor-hospitality-podcast', () => {
  it('builds footer UTM URL', () => {
    const url = buildPodcastUrl({ medium: 'footer' });
    expect(url).toContain(OUTDOOR_HOSPITALITY_PODCAST.siteUrl);
    expect(url).toContain('utm_source=resources');
    expect(url).toContain('utm_medium=footer');
    expect(url).toContain('utm_campaign=podcast');
  });

  it('builds glossary sidebar URL with content slug', () => {
    const url = getPodcastStartHereUrl('adr');
    expect(url).toContain('/episodes/');
    expect(url).toContain('utm_medium=glossary-sidebar');
    expect(url).toContain('utm_content=adr');
  });

  it('builds glossary-term episode deep link', () => {
    const url = buildPodcastEpisodeUrl({
      path: PODCAST_EPISODE_PATHS.jasperPricing,
      medium: 'glossary-term',
      content: 'adr',
    });
    expect(url).toContain('jasper-ribbers');
    expect(url).toContain('utm_medium=glossary-term');
    expect(url).toContain('utm_content=adr');
  });

  it('builds guides-page episode deep link', () => {
    const url = buildPodcastEpisodeUrl({
      path: PODCAST_EPISODE_PATHS.shariHost,
      medium: 'guides-page',
      content: 'feasibility-studies-complete-guide',
    });
    expect(url).toContain('shari-heilala');
    expect(url).toContain('utm_medium=guides-page');
  });
});
