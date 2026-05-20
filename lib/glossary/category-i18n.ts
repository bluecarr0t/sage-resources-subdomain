import type { GlossaryCategory } from './types';

/** Maps English category labels (stored on terms) to glossary.categories message keys */
export const GLOSSARY_CATEGORY_MESSAGE_KEYS: Record<
  GlossaryCategory,
  'feasibilityAppraisal' | 'glamping' | 'rvCampground' | 'financial' | 'realEstate' | 'general'
> = {
  'Feasibility & Appraisal': 'feasibilityAppraisal',
  Glamping: 'glamping',
  'RV & Campground': 'rvCampground',
  Financial: 'financial',
  'Real Estate': 'realEstate',
  General: 'general',
};

export function getGlossaryCategoryMessageKey(
  category: GlossaryCategory
): (typeof GLOSSARY_CATEGORY_MESSAGE_KEYS)[GlossaryCategory] {
  return GLOSSARY_CATEGORY_MESSAGE_KEYS[category];
}
