/**
 * Surgical plain-text identity replace for FS DOCX templates (no docxtemplater tags).
 * Preserves run properties; only rewrites w:t contents.
 */

import type PizZip from 'pizzip';
import type { EnrichedInput } from './types';

export type IdentityReplacement = { from: string; to: string };

const SAMPLE_FINGERPRINTS = [
  'Jasper',
  'Nickajack',
  'TVA Road',
  'Florence, Arizona',
  'Amir Peleg',
  '144 009',
  'Marion County',
  '37347',
  '4157 Rovelo',
  'Buford, GA',
  '24-109A-01',
  'February 18',
  'TN DEPARTMENT OF TOURIST',
  'DEPARTMENT OF TOURIST DEVELOPMENT',
  'Overnight Tennessee',
  'Tennessee Visitors',
  'Chattanooga',
  'Lookout Mountain',
  'Interstate 24',
  'I-24',
  'Tennessee Aquarium',
  'Volkswagen',
  'Bolt Farm',
  'ReTreet',
  'Stay Minty',
] as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function stateFullName(state: string): string {
  const map: Record<string, string> = {
    OH: 'Ohio',
    TN: 'Tennessee',
    AZ: 'Arizona',
    TX: 'Texas',
    FL: 'Florida',
    CA: 'California',
    NY: 'New York',
    CO: 'Colorado',
    ME: 'Maine',
    MT: 'Montana',
  };
  const key = state.trim().toUpperCase();
  return map[key] ?? state;
}

/** Build longest-first sample→subject replacements for the glamping foundation template. */
export function buildIdentityReplacements(
  input: EnrichedInput,
  options?: { reportDate?: string }
): IdentityReplacement[] {
  const reps: IdentityReplacement[] = [];
  const city = input.city?.trim() || '';
  const state = input.state?.trim() || '';
  const zip = input.zip_code?.trim() || '';
  const address1 = input.address_1?.trim() || '';
  const property = input.property_name?.trim() || '';
  const county = input.county?.trim() || '';
  const parcel = input.parcel_number?.trim() || '';
  const contact = input.client_contact_name?.trim() || '';
  const entity = input.client_entity?.trim() || '';
  const clientAddr = input.client_address?.trim() || '';
  const clientCsz = input.client_city_state_zip?.trim() || '';
  const lastName = contact.split(/\s+/).filter(Boolean).pop() || '';
  const totalSites = input.unit_mix.reduce((s, u) => s + (u.count || 0), 0);
  const studyId = input.study_id?.trim() || '';
  const reportDate = options?.reportDate?.trim() || '';

  const cityStateZip = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const cityState = [city, state].filter(Boolean).join(', ');
  const addressLine = [address1, city, state, zip].filter(Boolean).join(', ');
  const countyLabel = county
    ? /county/i.test(county)
      ? county
      : `${county} County`
    : '';

  if (reportDate) {
    reps.push({ from: 'February 18, 2024', to: reportDate });
  }
  if (addressLine) {
    reps.push({ from: 'TVA Road Jasper, TN 37347', to: addressLine });
    reps.push({ from: 'TVA Road, Jasper, TN 37347', to: addressLine });
  }
  if (cityStateZip) {
    reps.push({ from: ' Jasper, TN 37347', to: ` ${cityStateZip}` });
    reps.push({ from: 'Jasper, TN 37347', to: cityStateZip });
  }
  if (address1) {
    reps.push({ from: 'TVA Road', to: address1 });
  }
  if (cityState) {
    reps.push({ from: 'Jasper, Tennessee', to: `${city}, ${stateFullName(state)}` });
    reps.push({ from: 'Jasper, TN', to: cityState });
  }
  // Do NOT globally rewrite "Tennessee" / ", TN" → subject state.
  // That turns template cities like "Chattanooga, TN" into "Chattanooga, OH".
  // Jasper-specific and ZIP replacements below cover subject identity.
  if (state && state.toUpperCase() !== 'TN') {
    reps.push({
      from: 'TN 37347',
      to: zip ? `${state} ${zip}` : state,
    });
  }
  if (zip) {
    reps.push({ from: '37347', to: zip });
  }
  if (city) {
    reps.push({ from: 'Jasper', to: city });
  }
  if (property) {
    reps.push({ from: 'TBD-Nickajack Shores Resort', to: property });
    reps.push({ from: 'Nickajack Shores Resort', to: property });
    reps.push({ from: 'Nickajack Lake', to: `${city || property} area` });
    reps.push({ from: 'Nickajack', to: property });
  }
  if (parcel) {
    reps.push({ from: 'Parcel Number 144 009.00', to: `Parcel Number ${parcel}` });
    reps.push({ from: '144 009.00', to: parcel });
    reps.push({ from: '144 009', to: parcel });
  }
  if (contact) {
    reps.push({ from: 'Amir Peleg / Nickajack, LLC', to: entity ? `${contact} / ${entity}` : contact });
    reps.push({ from: 'Amir Peleg', to: contact });
    if (lastName) {
      reps.push({ from: 'Mr. Peleg:', to: `Mr./Ms. ${lastName}:` });
      reps.push({ from: 'Mr. Peleg', to: `Mr./Ms. ${lastName}` });
    }
  }
  if (entity) {
    reps.push({ from: 'Nickajack, LLC', to: entity });
  }
  if (clientAddr) {
    reps.push({ from: '4157 Rovelo Way', to: clientAddr });
  }
  if (clientCsz) {
    reps.push({ from: 'Buford, GA 30519', to: clientCsz });
  }
  if (studyId) {
    reps.push({ from: '24-109A-01', to: studyId });
  }
  if (input.acres != null && Number.isFinite(input.acres)) {
    reps.push({ from: 'approximately 47 acres', to: `approximately ${input.acres} acres` });
    reps.push({ from: '47 acres', to: `${input.acres} acres` });
  }
  if (totalSites > 0) {
    reps.push({ from: '51 glamping sites', to: `${totalSites} glamping sites` });
    reps.push({ from: '51 sites', to: `${totalSites} sites` });
  }
  if (countyLabel) {
    reps.push({ from: 'Marion County', to: countyLabel });
  }

  // Longest first so multi-word samples win over substrings
  reps.sort((a, b) => b.from.length - a.from.length);
  // Dedupe identical from keys (keep first = longest path already sorted)
  const seen = new Set<string>();
  return reps.filter((r) => {
    if (!r.from || !r.to || r.from === r.to) return false;
    if (seen.has(r.from)) return false;
    seen.add(r.from);
    return true;
  });
}

function applyReplacementsToPlain(
  text: string,
  replacements: IdentityReplacement[]
): string {
  let next = text;
  for (const { from, to } of replacements) {
    if (!next.includes(from)) continue;
    next = next.split(from).join(to);
  }
  return next;
}

/**
 * Replace sample identity strings inside w:t nodes across document + headers/footers.
 * Also rewrites whole paragraphs when a sample string is split across multiple runs
 * (common for cyan author-mark fields in the foundation templates).
 * Strips cyan/green author highlights from paragraphs that were actually updated.
 * Returns number of paragraphs / nodes that changed.
 */
export function replacePlainTextInDocument(
  zip: PizZip,
  replacements: IdentityReplacement[]
): number {
  if (!replacements.length) return 0;
  const parts = Object.keys(zip.files).filter((f) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(f)
  );
  let changedNodes = 0;

  for (const xmlPath of parts) {
    const file = zip.file(xmlPath);
    if (!file) continue;
    let xml = file.asText();
    if (!SAMPLE_FINGERPRINTS.some((fp) => xml.includes(fp))) {
      // Still try if client sample fingerprints present
      if (
        !xml.includes('4157 Rovelo') &&
        !xml.includes('Buford, GA') &&
        !xml.includes('24-109A-01') &&
        !xml.includes('February 18')
      ) {
        continue;
      }
    }

    // Paragraph-level: fix split-run sample strings
    xml = xml.replace(/<w:p([\s>])([\s\S]*?)<\/w:p>/g, (match, openTail: string, inner: string) => {
      const texts = [...inner.matchAll(/<w:t([^>]*)>([^<]*)<\/w:t>/g)];
      if (!texts.length) return match;
      const joined = texts.map((m) => decodeXmlText(m[2])).join('');
      const replaced = applyReplacementsToPlain(joined, replacements);
      if (replaced === joined) return match;

      changedNodes++;
      // Author mark was resolved — drop cyan/green highlight on this paragraph
      let nextInner = stripAuthorHighlightXml(inner);
      let used = false;
      nextInner = nextInner.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (_tMatch, attrs: string) => {
        if (!used) {
          used = true;
          const needsSpace =
            replaced.startsWith(' ') || replaced.endsWith(' ') || /\s{2,}/.test(replaced);
          const spaceAttr =
            needsSpace && !/\bxml:space=/.test(attrs) ? `${attrs} xml:space="preserve"` : attrs;
          return `<w:t${spaceAttr}>${escapeXml(replaced)}</w:t>`;
        }
        return `<w:t></w:t>`;
      });
      return `<w:p${openTail}${nextInner}</w:p>`;
    });

    if (xml !== file.asText()) zip.file(xmlPath, xml);
  }

  return changedNodes;
}

/** Remove teal/cyan (and green) author-review highlight markers from a paragraph fragment. */
export function stripAuthorHighlightXml(xmlFrag: string): string {
  return xmlFrag.replace(/<w:highlight\b[^>]*\bw:val="(cyan|green)"[^>]*\/>/gi, '');
}

/** Scan zip XML for leftover sample-market fingerprints (subject-aware). */
export function findRemainingSampleFingerprints(
  zip: PizZip,
  subject: Pick<EnrichedInput, 'city' | 'state'>
): string[] {
  const state = subject.state?.trim().toUpperCase() || '';
  const city = subject.city?.trim().toLowerCase() || '';
  const parts = Object.keys(zip.files).filter((f) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(f)
  );
  let blob = '';
  for (const p of parts) {
    const f = zip.file(p);
    if (f) blob += f.asText();
  }
  const remaining: string[] = [];
  for (const fp of SAMPLE_FINGERPRINTS) {
    const found =
      fp === '37347'
        ? /(?:^|[^\d])37347(?:[^\d]|$)/.test(blob)
        : blob.includes(fp);
    if (!found) continue;
    // Allow if subject actually is that place
    if (fp === 'Jasper' && city === 'jasper') continue;
    if (fp === 'TVA Road' && city === 'jasper') continue;
    if (fp === 'Nickajack' && city === 'jasper') continue;
    if (fp === 'Marion County' && /marion/i.test(subject.city || '')) continue;
    if (fp === '37347' && state === 'TN') continue;
    if (fp === 'Florence, Arizona' && state === 'AZ') continue;
    remaining.push(fp);
  }
  return remaining;
}

export { SAMPLE_FINGERPRINTS };
