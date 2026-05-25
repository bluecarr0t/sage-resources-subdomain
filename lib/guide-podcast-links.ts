import type { GuidePodcastPlacement } from '@/lib/podcast-types';

/**
 * Pillar guides → podcast episodes by section id.
 * Rendered after matching section HTML via PodcastContextLinks.
 */
export const GUIDE_PODCAST_PLACEMENTS: Record<string, GuidePodcastPlacement[]> = {
  'feasibility-studies-complete-guide': [
    {
      sectionId: 'introduction',
      links: [{ episodeKey: 'shariHost', episodeTitle: 'Meet Your Host: Shari Heilala' }],
      intro: 'For how Sage approaches feasibility and outdoor hospitality advisory, listen to ',
    },
  ],
  'what-banks-look-for-feasibility-study': [
    {
      sectionId: 'introduction',
      links: [
        { episodeKey: 'joeLisaPortfolio', episodeTitle: 'Building a $13M hospitality portfolio (Joe Lisa)' },
      ],
      intro: 'Hear ',
      outro: ' on The Outdoor Hospitality Podcast for financing and portfolio lessons relevant to lender conversations.',
    },
  ],
  'property-appraisals-complete-guide': [
    {
      sectionId: 'introduction',
      links: [{ episodeKey: 'benWolffReit', episodeTitle: 'Selling your property to a public REIT (Ben Wolff)' }],
      intro: 'For transaction and valuation perspective from operators, listen to ',
    },
  ],
  'glamping-industry-complete-guide': [
    {
      sectionId: 'introduction',
      links: [{ episodeKey: 'sarahDusek', episodeTitle: 'Sarah Dusek — Few & Far and Under Canvas' }],
      intro: 'For brand-building lessons from Under Canvas and Few & Far, listen to ',
    },
    {
      sectionId: 'case-studies',
      links: [
        { episodeKey: 'pawsUpLaunch', episodeTitle: 'Lessons from Paws Up, AutoCamp & Wildhaven' },
      ],
      intro:
        'For operator perspectives on scaling iconic outdoor hospitality brands, listen to ',
    },
  ],
  'glamping-market-trends-2025': [
    {
      sectionId: 'introduction',
      links: [{ episodeKey: 'mythBusting', episodeTitle: 'Outdoor Hospitality Myth Busting' }],
      intro: 'For industry outlook and myth-busting from experienced advisors, listen to ',
    },
  ],
  'how-to-start-glamping-business': [
    {
      sectionId: 'introduction',
      links: [
        {
          episodeKey: 'isaacFrench',
          episodeTitle: "Live Oak Lake: 'Less, but better' in hospitality (Isaac French)",
        },
        {
          episodeKey: 'sandyVans',
          episodeTitle: 'Sandy Vans glamping-on-wheels founder story',
        },
      ],
      intro: 'For real-world insights from experienced operators, listen to ',
      linkJoiner: ' and ',
    },
  ],
};

export function getGuidePodcastPlacement(
  guideSlug: string,
  sectionId: string,
): GuidePodcastPlacement | undefined {
  return GUIDE_PODCAST_PLACEMENTS[guideSlug]?.find((p) => p.sectionId === sectionId);
}
