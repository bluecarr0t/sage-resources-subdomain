import { getAllGuideSlugs } from '@/lib/guides';
import { getAllGlossaryTerms } from '@/lib/glossary/index';
import { getAllSageUniquePropertyCount } from '@/lib/all-sage-unique-property-count';
import { roundDownToStep } from '@/lib/round-down-to-step';

export type PublicContentStats = {
  /** Exact unique published property count from `all_sage_data`. */
  propertyCount: number;
  /** Floored marketing display (nearest 25), e.g. 718 → 700. */
  propertyCountDisplay: number;
  guideCount: number;
  glossaryCount: number;
};

/** Token used in static guide/landing copy; replaced at render with live display count. */
export const PROPERTY_COUNT_TOKEN = '{PROPERTY_COUNT}';

export function formatPropertyCountPlus(displayCount: number): string {
  return `${displayCount.toLocaleString('en-US')}+`;
}

export function replacePropertyCountToken(
  text: string,
  propertyCountDisplay: number
): string {
  if (!text.includes(PROPERTY_COUNT_TOKEN)) return text;
  return text.split(PROPERTY_COUNT_TOKEN).join(formatPropertyCountPlus(propertyCountDisplay));
}

/** Replace `{PROPERTY_COUNT}` in guide/landing GEO fields before render + JSON-LD. */
export function applyPropertyCountToContentFields<
  T extends {
    quickAnswer?: string;
    keyTakeaways?: string[];
    metaDescription?: string;
  },
>(content: T, propertyCountDisplay: number): T {
  return {
    ...content,
    quickAnswer: content.quickAnswer
      ? replacePropertyCountToken(content.quickAnswer, propertyCountDisplay)
      : content.quickAnswer,
    metaDescription: content.metaDescription
      ? replacePropertyCountToken(content.metaDescription, propertyCountDisplay)
      : content.metaDescription,
    keyTakeaways: content.keyTakeaways?.map((item) =>
      replacePropertyCountToken(item, propertyCountDisplay)
    ),
  };
}

/**
 * Single source of truth for public marketing counts:
 * - properties = unique names in `all_sage_data` with `research_status = published`
 * - guides / glossary = in-repo content inventories
 */
export async function getPublicContentStats(): Promise<PublicContentStats> {
  const propertyCount = await getAllSageUniquePropertyCount();
  return {
    propertyCount,
    propertyCountDisplay: roundDownToStep(propertyCount, 25),
    guideCount: getAllGuideSlugs().length,
    glossaryCount: getAllGlossaryTerms().length,
  };
}

/** Sync inventory counts only (no DB). Prefer `getPublicContentStats` when property count is needed. */
export function getPublicContentInventoryCounts(): Pick<
  PublicContentStats,
  'guideCount' | 'glossaryCount'
> {
  return {
    guideCount: getAllGuideSlugs().length,
    glossaryCount: getAllGlossaryTerms().length,
  };
}

export function buildHomeMetaDescription(stats: PublicContentStats): string {
  const props = formatPropertyCountPlus(stats.propertyCountDisplay);
  return `${props} unique properties in Sage research, ${stats.guideCount} expert guides, and ${stats.glossaryCount} industry glossary terms. Your trusted resource for outdoor hospitality feasibility studies, appraisals, and property discovery across North America and Europe.`;
}

export function buildHomeOgDescription(stats: PublicContentStats): string {
  return buildHomeMetaDescription(stats);
}
