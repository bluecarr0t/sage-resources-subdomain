import { GuideContent } from "./types";
import { feasibilityGuides } from "./feasibility";
import { appraisalGuides } from "./appraisal";
import { industryGuides } from "./industry";

// Comprehensive guide content for all pillar pages and cluster pages
// Each pillar page contains 4000-6000 words of detailed, comprehensive content
// Guides are organized by category in separate files for better maintainability

export const guides: Record<string, GuideContent> = {
  ...feasibilityGuides,
  ...appraisalGuides,
  ...industryGuides,
};

export function getGuide(slug: string): GuideContent | null {
  return guides[slug] || null;
}

export function getAllGuideSlugs(): string[] {
  return Object.keys(guides);
}

export function getGuidesByCategory(category: 'feasibility' | 'appraisal' | 'industry'): GuideContent[] {
  return Object.values(guides).filter((guide) => guide.category === category);
}

// Export types for use in other files
export type { GuideContent, GuideCategory, FAQItem, TableOfContentsItem, GuideSection, ClusterPage } from "./types";
