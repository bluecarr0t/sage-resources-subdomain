/**
 * DOCX paragraph style cloning + section-body parsing helpers.
 * Keeps AI-injected prose visually close to Sage template formatting.
 */

export type ParagraphStyleTemplate = {
  /** Full `<w:pPr>…</w:pPr>` including tags */
  pPr: string;
  /** Full `<w:rPr>…</w:rPr>` including tags (highlights stripped) */
  rPr: string;
};

export const FALLBACK_PARAGRAPH_STYLE: ParagraphStyleTemplate = {
  pPr: '<w:pPr><w:pStyle w:val="Normal"/></w:pPr>',
  rPr:
    '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>',
};

export function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Strip markdown bold/italic/heading markers from LLM prose. */
export function stripMarkdownEmphasis(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-•]\s+/gm, (m) => m); // keep bullets
}

export function extractParagraphStyleTemplate(paraXml: string): ParagraphStyleTemplate {
  const pPrMatch = paraXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const rPrMatch = paraXml.match(/<w:r\b[^>]*>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/);
  let rPr = rPrMatch?.[1] ?? FALLBACK_PARAGRAPH_STYLE.rPr;
  rPr = rPr.replace(/<w:highlight\b[^/]*\/>/g, '');
  if (!/<w:rPr>/.test(rPr)) rPr = FALLBACK_PARAGRAPH_STYLE.rPr;
  return {
    pPr: pPrMatch?.[0] ?? FALLBACK_PARAGRAPH_STYLE.pPr,
    rPr,
  };
}

/** Clone rPr with bold enabled (for site-analysis label runs). */
export function withBoldRunProps(rPr: string): string {
  if (!rPr || !/<w:rPr>/.test(rPr)) {
    return '<w:rPr><w:b/></w:rPr>';
  }
  if (/<w:b[\s/>]/.test(rPr)) return rPr;
  return rPr.replace('</w:rPr>', '<w:b/></w:rPr>');
}

export function bodyTextToStyledParagraphsXml(
  bodyText: string,
  style: ParagraphStyleTemplate = FALLBACK_PARAGRAPH_STYLE
): string {
  return bodyText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cleaned = stripMarkdownEmphasis(line);
      return `<w:p>${style.pPr}<w:r>${style.rPr}<w:t xml:space="preserve">${escapeXmlText(cleaned)}</w:t></w:r></w:p>`;
    })
    .join('');
}

/** True when paragraph carries section/page layout chrome that must not be deleted. */
export function isLayoutChromeParagraph(paraXml: string): boolean {
  if (/<w:sectPr[\s>]/.test(paraXml)) return true;
  if (/w:type="page"/.test(paraXml)) return true;
  if (/<w:br\b[^>]*w:type="page"/.test(paraXml)) return true;
  return false;
}

export function isLetterheadParagraph(paraXml: string, plain: string): boolean {
  if (/w:jc\s+w:val="right"/.test(paraXml)) return true;
  if (/<w:drawing[\s>]|<w:txbxContent[\s>]|<v:textbox[\s>]/.test(paraXml)) return true;
  if (!plain.trim()) return false;
  if (plain.length > 120) return false;
  // Only the Sage office block — not the date, client address, or Re: lines
  // (those are teal author-mark fields that must be replaced).
  return /sageoutdoor|sage outdoor advisory\.com|5113\s+south\s+harper|chicago,\s*illinois|p:\s*312\.|www\.sageoutdoor/i.test(
    plain
  );
}

export function isSignatureParagraph(paraXml: string, plain: string): boolean {
  if (/sincerely|respectfully|very truly yours|yours truly/i.test(plain)) return true;
  if (/\bMAI\b/.test(plain)) return true;
  if (/^(Shari|Kristin|Elizabeth)\b/i.test(plain.trim())) return true;
  if (/\b(President|Vice President|Senior Associate)\b/i.test(plain) && plain.length < 80) {
    return true;
  }
  return false;
}

/**
 * Parse SWOT LLM output into buckets keyed by template-ish labels.
 * Keys: strengths | weaknesses | opportunities | threats | other
 */
export function parseSwotBuckets(text: string): Record<string, string> {
  const cleaned = stripMarkdownEmphasis(text);
  const buckets: Record<string, string[]> = {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
    other: [],
  };
  let current: keyof typeof buckets = 'strengths';

  for (const rawLine of cleaned.split(/\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const header = line.match(
      /^(strengths|weaknesses?(?:,?\s*threats?(?:,?\s*and\s*risk\s*factors)?)?|opportunities|threats)\s*:?\s*$/i
    );
    if (header) {
      const h = header[1].toLowerCase();
      if (h.startsWith('strength')) current = 'strengths';
      else if (h.startsWith('opportunit')) current = 'opportunities';
      else if (h.startsWith('threat') && !h.includes('weak')) current = 'threats';
      else current = 'weaknesses';
      continue;
    }
    buckets[current].push(line.replace(/^[-•*]\s+/, ''));
  }

  const out: Record<string, string> = {};
  for (const [k, lines] of Object.entries(buckets)) {
    if (lines.length) out[k] = lines.join('\n');
  }
  return out;
}

/** Map a Heading2 plain title to a SWOT bucket key. */
export function matchSwotBucketKey(headingPlain: string): string | null {
  const h = headingPlain.toLowerCase();
  if (h.includes('strength')) return 'strengths';
  if (h.includes('opportunit')) return 'opportunities';
  if (h.includes('threat') && !h.includes('weak')) return 'threats';
  if (h.includes('weak') || h.includes('risk')) return 'weaknesses';
  return null;
}

/** Split body into N chunks on blank lines (paragraph groups). */
export function splitBodyIntoChunks(bodyText: string, chunkCount: number): string[] {
  if (chunkCount <= 0) return [];
  const cleaned = stripMarkdownEmphasis(bodyText).trim();
  if (!cleaned) return Array(chunkCount).fill('');

  const groups = cleaned
    .split(/\n\s*\n/)
    .map((g) => g.trim())
    .filter(Boolean);

  if (groups.length === 0) return Array(chunkCount).fill('');
  if (chunkCount === 1) return [cleaned];

  const chunks: string[] = Array(chunkCount).fill('');
  if (groups.length <= chunkCount) {
    for (let i = 0; i < groups.length; i++) chunks[i] = groups[i];
    return chunks;
  }

  // Distribute leftover groups into the last chunk
  const head = groups.slice(0, chunkCount - 1);
  const tail = groups.slice(chunkCount - 1).join('\n\n');
  for (let i = 0; i < head.length; i++) chunks[i] = head[i];
  chunks[chunkCount - 1] = tail;
  return chunks;
}
