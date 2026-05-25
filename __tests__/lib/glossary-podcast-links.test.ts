import { getGlossaryPodcastPlacement, GLOSSARY_PODCAST_LINKS } from '@/lib/glossary-podcast-links';
import { getGuidePodcastPlacement } from '@/lib/guide-podcast-links';
import { buildPodcastEpisodeUrl } from '@/lib/podcast-content-links';
import { PODCAST_EPISODE_PATHS } from '@/lib/podcast-episode-paths';

describe('glossary-podcast-links', () => {
  it('maps Tier A terms', () => {
    expect(GLOSSARY_PODCAST_LINKS.adr?.links[0].episodeKey).toBe('jasperPricing');
    expect(getGlossaryPodcastPlacement('feasibility-study')?.links[0].episodeKey).toBe(
      'shariHost',
    );
  });

  it('builds tracked episode URLs from registry keys', () => {
    const placement = getGlossaryPodcastPlacement('adr');
    const link = placement!.links[0];
    const url = buildPodcastEpisodeUrl({
      path: PODCAST_EPISODE_PATHS[link.episodeKey],
      medium: 'glossary-term',
      content: 'adr',
    });
    expect(url).toContain('utm_medium=glossary-term');
    expect(url).toContain('jasper-ribbers');
  });
});

describe('guide-podcast-links', () => {
  it('places podcast links on introduction sections', () => {
    const p = getGuidePodcastPlacement('feasibility-studies-complete-guide', 'introduction');
    expect(p?.links[0].episodeKey).toBe('shariHost');
  });

  it('supports multi-link guide intros', () => {
    const p = getGuidePodcastPlacement('how-to-start-glamping-business', 'introduction');
    expect(p?.links).toHaveLength(2);
    expect(p?.linkJoiner).toBe(' and ');
  });
});
