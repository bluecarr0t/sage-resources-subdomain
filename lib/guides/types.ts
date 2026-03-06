export interface FAQItem {
  question: string;
  answer: string;
}

export type GuideCategory = 'feasibility' | 'appraisal' | 'industry';

export interface TableOfContentsItem {
  title: string;
  anchor: string;
  level: number;
}

export interface GuideSection {
  id: string; // anchor ID
  title: string;
  content: string; // HTML content
  subsections?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

export interface ClusterPage {
  title: string;
  url: string;
  description: string;
}

export interface GuideContent {
  slug: string;
  title: string;
  metaDescription: string;
  /** 50-150 word direct answer for GSO/AI extraction. Displayed as Quick Answer near top. */
  quickAnswer?: string;
  category: GuideCategory;
  hero: {
    headline: string;
    subheadline: string;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string; // Optional hero background image path
  };
  tableOfContents: TableOfContentsItem[];
  sections: GuideSection[];
  clusterPages: ClusterPage[];
  relatedGuides?: string[]; // slugs of related guide pages
  faqs?: FAQItem[];
  lastModified?: string; // ISO date string for sitemap (YYYY-MM-DD)
  keywords?: string[];
  relatedServices?: {
    title: string;
    services: {
      name: string;
      url: string;
      description: string;
    }[];
  };
  cta?: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
  howToSteps?: string[]; // Steps for HowTo schema on process/instructional guides
  /** Scannable highlights for GSO/AI extraction. Displayed as Key Takeaways section. */
  keyTakeaways?: string[];
  /** Change log for transparency. Displayed as "Last updated" and optional change history. */
  changeLog?: Array<{ date: string; changes: string[] }>;
  /** Primary source citations. Displayed in References section. Use [1], [2] in content to cite. */
  citations?: Array<{ id: number; title: string; url: string; accessed?: string }>;
}

