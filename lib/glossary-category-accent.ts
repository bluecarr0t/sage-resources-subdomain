import type { GlossaryCategory } from '@/lib/glossary/types';

export type GlossaryCategoryAccent = {
  /** Extra classes for the card link (left accent + hover tint) */
  card: string;
  /** Category label text color */
  label: string;
};

const ACCENTS: Record<GlossaryCategory, GlossaryCategoryAccent> = {
  'Feasibility & Appraisal': {
    card: 'border-l-4 border-l-sage-600 bg-sage-50/70 hover:border-l-sage-700 hover:bg-sage-50/90',
    label: 'text-sage-700',
  },
  Glamping: {
    card: 'border-l-4 border-l-sage-500 bg-sage-50/50 hover:border-l-sage-600 hover:bg-sage-50/85',
    label: 'text-sage-600',
  },
  'RV & Campground': {
    card: 'border-l-4 border-l-sage-700 bg-sage-100/40 hover:border-l-sage-800 hover:bg-sage-50/90',
    label: 'text-sage-800',
  },
  Financial: {
    card: 'border-l-4 border-l-sage-teal bg-sage-teal/[0.07] hover:border-l-sage-teal-dark hover:bg-sage-teal/[0.12]',
    label: 'text-sage-teal-text',
  },
  'Real Estate': {
    card: 'border-l-4 border-l-sage-800 bg-sage-100/50 hover:border-l-sage-900 hover:bg-sage-50/90',
    label: 'text-sage-800',
  },
  General: {
    card: 'border-l-4 border-l-sage-300 bg-sage-50/30 hover:border-l-sage-400 hover:bg-sage-50/60',
    label: 'text-sage-500',
  },
};

export function getGlossaryCategoryAccent(category: GlossaryCategory): GlossaryCategoryAccent {
  return ACCENTS[category];
}
