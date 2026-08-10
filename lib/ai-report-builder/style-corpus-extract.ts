/**
 * Map DOCX section headings to canonical style-corpus keys and extract snippets.
 */

import type { RawDocxContent } from '@/lib/parsers/feasibility-docx-parser';
import {
  SECTION_HEADING_PATTERNS,
  type StyleCorpusSection,
} from './style-corpus-types';

export interface ExtractedStyleSection {
  section: StyleCorpusSection;
  heading: string;
  rawText: string;
}

function matchSection(heading: string): StyleCorpusSection | null {
  for (const entry of SECTION_HEADING_PATTERNS) {
    if (entry.patterns.some((re) => re.test(heading))) {
      return entry.section;
    }
  }
  return null;
}

const MAX_SECTION_CHARS = 12_000;

/**
 * Pull target narrative sections from raw DOCX content.
 * First matching heading per canonical section wins.
 */
export function extractStyleSectionsFromRaw(
  raw: Pick<RawDocxContent, 'sections' | 'fullText'>
): ExtractedStyleSection[] {
  const found = new Map<StyleCorpusSection, ExtractedStyleSection>();

  for (const sec of raw.sections ?? []) {
    const heading = sec.heading?.trim() ?? '';
    if (!heading) continue;
    const key = matchSection(heading);
    if (!key || found.has(key)) continue;
    const content = (sec.content || sec.paragraphs?.join('\n') || '').trim();
    if (content.length < 80) continue;
    found.set(key, {
      section: key,
      heading,
      rawText: content.slice(0, MAX_SECTION_CHARS),
    });
  }

  // Fallback: executive summary from full text if heading map missed it
  if (!found.has('executive_summary') && raw.fullText) {
    const m = raw.fullText.match(
      /executive\s+summary\s*([\s\S]{80,8000}?)(?=\n(?:letter of transmittal|swot|site analysis|area analysis|table of contents|scope of work)\b|$)/i
    );
    if (m?.[1]) {
      found.set('executive_summary', {
        section: 'executive_summary',
        heading: 'Executive Summary',
        rawText: m[1].trim().slice(0, MAX_SECTION_CHARS),
      });
    }
  }

  return Array.from(found.values());
}

export function isHoldoutStudyId(
  studyId: string | null | undefined,
  patterns: readonly string[]
): boolean {
  if (!studyId?.trim()) return false;
  const lower = studyId.toLowerCase();
  return patterns.some((p) => lower.includes(p.toLowerCase()));
}

export function resolveHoldoutPatterns(
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const fromEnv = env.REPORT_STYLE_HOLDOUT_STUDY_IDS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  // Lazy import avoided — caller passes DEFAULT when needed
  return [];
}
