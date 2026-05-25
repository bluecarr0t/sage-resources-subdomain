import type { GlossaryPodcastPlacement } from '@/lib/podcast-types';

/**
 * Tier A glossary terms → podcast episodes.
 * Rendered in-body via PodcastContextLinks (SEO placement preserved).
 */
export const GLOSSARY_PODCAST_LINKS: Partial<Record<string, GlossaryPodcastPlacement>> = {
  adr: {
    links: [{ episodeKey: 'jasperPricing', episodeTitle: 'Are your units priced correctly? (Jasper Ribbers)' }],
  },
  ardr: {
    links: [{ episodeKey: 'jasperPricing', episodeTitle: 'Are your units priced correctly? (Jasper Ribbers)' }],
  },
  'occupancy-rate': {
    links: [{ episodeKey: 'mythBusting', episodeTitle: 'Outdoor Hospitality Myth Busting' }],
  },
  revpar: {
    links: [{ episodeKey: 'mythBusting', episodeTitle: 'Outdoor Hospitality Myth Busting' }],
  },
  noi: {
    links: [{ episodeKey: 'benWolffReit', episodeTitle: 'Selling your property to a public REIT (Ben Wolff)' }],
  },
  'cap-rate': {
    links: [{ episodeKey: 'benWolffReit', episodeTitle: 'Selling your property to a public REIT (Ben Wolff)' }],
  },
  'debt-service-coverage-ratio': {
    links: [
      { episodeKey: 'joeLisaPortfolio', episodeTitle: 'Building a $13M hospitality portfolio (Joe Lisa)' },
    ],
  },
  'pro-forma': {
    links: [
      { episodeKey: 'joeLisaPortfolio', episodeTitle: 'Building a $13M hospitality portfolio (Joe Lisa)' },
    ],
  },
  'feasibility-study': {
    links: [{ episodeKey: 'shariHost', episodeTitle: 'Meet Your Host: Shari Heilala' }],
  },
  appraisal: {
    links: [{ episodeKey: 'benWolffReit', episodeTitle: 'Selling your property to a public REIT (Ben Wolff)' }],
  },
  'market-analysis': {
    links: [{ episodeKey: 'mythBusting', episodeTitle: 'Outdoor Hospitality Myth Busting' }],
  },
  'competitive-analysis': {
    links: [{ episodeKey: 'honeytrek', episodeTitle: '300+ outdoor resort site visits (HoneyTrek)' }],
  },
  'revenue-projections': {
    links: [{ episodeKey: 'jasperPricing', episodeTitle: 'Are your units priced correctly? (Jasper Ribbers)' }],
  },
  'income-approach': {
    links: [{ episodeKey: 'benWolffReit', episodeTitle: 'Selling your property to a public REIT (Ben Wolff)' }],
  },
  glamping: {
    links: [{ episodeKey: 'sarahDusek', episodeTitle: 'Sarah Dusek — Few & Far and Under Canvas' }],
  },
  'glamping-resort': {
    links: [{ episodeKey: 'glampingCollective', episodeTitle: 'The Glamping Collective (Pt. 1)' }],
  },
  'rv-resort': {
    links: [{ episodeKey: 'hiltonOutdoor', episodeTitle: 'Hilton Grand Vacations & outdoor hospitality' }],
  },
  campground: {
    links: [{ episodeKey: 'honeytrek', episodeTitle: '300+ outdoor resort site visits (HoneyTrek)' }],
  },
};

export function getGlossaryPodcastPlacement(slug: string): GlossaryPodcastPlacement | undefined {
  return GLOSSARY_PODCAST_LINKS[slug];
}
