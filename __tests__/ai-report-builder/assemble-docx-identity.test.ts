/**
 * Tests for surgical DOCX identity replace + heading anchor (split-run safe).
 */

import PizZip from 'pizzip';
import {
  buildIdentityReplacements,
  replacePlainTextInDocument,
  findRemainingSampleFingerprints,
} from '@/lib/ai-report-builder/assemble-docx-identity';
import { findSectionHeadingAnchor } from '@/lib/ai-report-builder/assemble-docx';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';

function minimalEnriched(over: Partial<EnrichedInput> = {}): EnrichedInput {
  return {
    property_name: 'Nordic Wellness Glamping',
    city: 'Peninsula',
    state: 'OH',
    address_1: '6050 Riverview Rd',
    zip_code: '44264',
    county: 'Summit County',
    parcel_number: '1100539',
    client_contact_name: 'David Baiko',
    client_entity: 'Heritage Farms',
    unit_mix: [],
    ...over,
  };
}

describe('buildIdentityReplacements', () => {
  it('maps Jasper/TN sample strings to subject (longest first)', () => {
    const reps = buildIdentityReplacements(minimalEnriched());
    expect(reps[0].from.length).toBeGreaterThanOrEqual(reps[1]?.from.length ?? 0);
    expect(reps.some((r) => r.from.includes('TVA Road') && r.to.includes('6050'))).toBe(true);
    expect(reps.some((r) => r.from === 'Jasper' && r.to === 'Peninsula')).toBe(true);
    expect(reps.some((r) => r.from === 'Amir Peleg' && r.to === 'David Baiko')).toBe(true);
  });

  it('does not globally rewrite Tennessee / , TN into subject state (avoids Chattanooga, OH)', () => {
    const reps = buildIdentityReplacements(minimalEnriched());
    expect(reps.some((r) => r.from === 'Tennessee' || r.from === ', TN')).toBe(false);
    const applied = reps.reduce(
      (s, r) => s.split(r.from).join(r.to),
      'Chattanooga, TN is on Interstate 24 near Lookout Mountain.'
    );
    expect(applied).toContain('Chattanooga, TN');
    expect(applied).not.toContain('Chattanooga, OH');
  });
});

describe('replacePlainTextInDocument', () => {
  it('replaces sample identity inside w:t including split-friendly contiguous strings', () => {
    const xml =
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:t>TVA Road</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t xml:space="preserve"> Jasper, TN 37347</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Amir Peleg</w:t></w:r></w:p>' +
      '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' +
      '<w:r><w:t>Ar</w:t></w:r><w:r><w:t>ea Analysis</w:t></w:r></w:p>' +
      '</w:body></w:document>';

    const zip = new PizZip();
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'
    );
    zip.file('word/document.xml', xml);

    const n = replacePlainTextInDocument(zip, buildIdentityReplacements(minimalEnriched()));
    expect(n).toBeGreaterThan(0);
    const out = zip.file('word/document.xml')!.asText();
    expect(out).toContain('6050 Riverview Rd');
    expect(out).toContain('Peninsula');
    expect(out).toContain('David Baiko');
    expect(out).not.toContain('TVA Road');
    expect(out).not.toContain('Amir Peleg');
  });
});

describe('findSectionHeadingAnchor', () => {
  it('skips TOC hyperlink and finds Heading1 with split runs', () => {
    const xml =
      '<w:body>' +
      '<w:p><w:hyperlink><w:r><w:t>Area Analysis</w:t></w:r></w:hyperlink></w:p>' +
      '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' +
      '<w:r><w:t>Ar</w:t></w:r><w:r><w:t>ea Analysis</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Prose about Marion County</w:t></w:r></w:p>' +
      '</w:body>';
    const anchor = findSectionHeadingAnchor(xml, 'Area Analysis');
    expect(anchor).not.toBeNull();
    expect(xml.slice(anchor!.start, anchor!.end)).toContain('Heading1');
    expect(xml.slice(anchor!.start, anchor!.end)).not.toContain('hyperlink');
  });
});

describe('findRemainingSampleFingerprints', () => {
  it('flags Jasper leftovers for OH subject', () => {
    const zip = new PizZip();
    zip.file(
      'word/document.xml',
      '<w:document><w:body><w:p><w:r><w:t>Still in Jasper near Nickajack</w:t></w:r></w:p></w:body></w:document>'
    );
    const remaining = findRemainingSampleFingerprints(zip, { city: 'Peninsula', state: 'OH' });
    expect(remaining).toEqual(expect.arrayContaining(['Jasper', 'Nickajack']));
  });
});
