/**
 * Redact PII and numeric claims from past-report section text before
 * storing style exemplars for few-shot conditioning.
 */

const FOREIGN_GEO_FINGERPRINTS = [
  /\b(ontario|quebec|british columbia|alberta|manitoba|saskatchewan)\b/i,
  /\b(toronto|vancouver|montreal|calgary|ottawa)\b/i,
  /\b(london|manchester|birmingham|edinburgh|glasgow)\b/i,
  /\b(sydney|melbourne|brisbane|auckland)\b/i,
  /\bunited kingdom\b/i,
  /\bunited arab emirates\b/i,
  /\bdubai\b/i,
  /\bmexico city\b/i,
  /\bprovince of\b/i,
];

export function hasForeignGeographyFingerprint(text: string): boolean {
  return FOREIGN_GEO_FINGERPRINTS.some((re) => re.test(text));
}

export interface RedactStyleCorpusOptions {
  clientName?: string | null;
  clientEntity?: string | null;
  contactName?: string | null;
  propertyName?: string | null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function redactNamedEntities(text: string, options: RedactStyleCorpusOptions): string {
  let out = text;
  const replacements: Array<[string, string]> = [];

  const push = (value: string | null | undefined, token: string) => {
    const v = value?.trim();
    if (!v || v.length < 3) return;
    replacements.push([v, token]);
  };

  push(options.clientName, '{{CLIENT}}');
  push(options.clientEntity, '{{CLIENT}}');
  push(options.contactName, '{{CONTACT}}');
  push(options.propertyName, '{{PROPERTY}}');

  // Longer names first to avoid partial overlaps
  replacements.sort((a, b) => b[0].length - a[0].length);
  for (const [name, token] of replacements) {
    out = out.replace(new RegExp(escapeRegExp(name), 'gi'), token);
  }

  // Generic salutations / contact lines
  out = out.replace(
    /\b(?:Dear|Attention:|Attn:)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g,
    'Dear {{CONTACT}}'
  );
  out = out.replace(
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\s*,\s*(?:Principal|Managing|Partner|Owner|Member)\b/g,
    '{{CONTACT}}, Principal'
  );

  return out;
}

function redactNumericClaims(text: string): string {
  let out = text;

  // Labeled metrics BEFORE generic $ / % so IRR/ADR/OCC/TDC keep specific tokens
  out = out.replace(
    /\b(?:ADR|RevPAR|NOI)\s*(?:of|=|:)?\s*\$?\s*\d[\d,]*(?:\.\d+)?/gi,
    (m) => {
      if (/adr/i.test(m)) return '{{ADR}}';
      if (/revpar/i.test(m)) return '{{REVPAR}}';
      return '{{NOI}}';
    }
  );
  out = out.replace(/\bIRR\s*(?:of|=|:)?\s*\d{1,3}(?:\.\d+)?\s*%?/gi, '{{IRR}}');
  out = out.replace(
    /\b(?:occupancy|occ\.?)\s*(?:of|=|:)?\s*\d{1,3}(?:\.\d+)?\s*%?/gi,
    '{{OCC}}'
  );
  out = out.replace(
    /\b(?:total development cost|TDC)\s*(?:of|=|:)?\s*\$?\s*\d[\d,]*(?:\.\d+)?(?:\s*(?:million|m))?/gi,
    '{{TDC}}'
  );

  // Currency
  out = out.replace(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|k|m|b))?/gi, '{{USD}}');
  out = out.replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*(?:dollars?)\b/gi, '{{USD}}');

  // Percentages
  out = out.replace(/\b\d{1,3}(?:\.\d+)?\s*%/g, '{{PCT}}');
  out = out.replace(
    /\b(?:approximately|about|roughly)?\s*\d{1,3}(?:\.\d+)?\s*percent\b/gi,
    '{{PCT}}'
  );

  // Population / visitors / acres / units
  out = out.replace(
    /\b\d{1,3}(?:,\d{3})+\b(?=\s+(?:residents|people|visitors|population|households))/gi,
    '{{POP}}'
  );
  out = out.replace(
    /\b(?:population|residents|visitors)\s*(?:of|=|:)?\s*\d{1,3}(?:,\d{3})+/gi,
    (m) => m.replace(/\d{1,3}(?:,\d{3})+/, '{{POP}}')
  );
  out = out.replace(/\b\d{1,4}(?:\.\d+)?\s*(?:acres?)\b/gi, '{{ACRES}} acres');
  out = out.replace(
    /\b\d{1,4}\s*(?:RV\s+)?(?:sites?|units?|cabins?|tents?)\b/gi,
    '{{UNITS}} units'
  );

  // Phone / email
  out = out.replace(
    /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
    '{{PHONE}}'
  );
  out = out.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    '{{EMAIL}}'
  );

  return out;
}

export interface RedactStyleCorpusResult {
  redactedText: string;
  dropped: boolean;
  dropReason?: string;
}

/**
 * Produce redacted style-corpus text. Returns dropped=true when the section
 * should not be stored (foreign geography or too short after redaction).
 */
export function redactStyleCorpusText(
  rawText: string,
  options: RedactStyleCorpusOptions = {}
): RedactStyleCorpusResult {
  const trimmed = rawText.replace(/\u0000/g, '').trim();
  if (trimmed.length < 80) {
    return { redactedText: '', dropped: true, dropReason: 'too_short' };
  }
  if (hasForeignGeographyFingerprint(trimmed)) {
    return { redactedText: '', dropped: true, dropReason: 'foreign_geography' };
  }

  let redacted = redactNamedEntities(trimmed, options);
  redacted = redactNumericClaims(redacted);
  redacted = redacted.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (redacted.length < 60) {
    return { redactedText: '', dropped: true, dropReason: 'too_short_after_redact' };
  }

  return { redactedText: redacted, dropped: false };
}
