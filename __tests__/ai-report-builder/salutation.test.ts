/**
 * Salutation gender inference for Letter of Transmittal.
 */

import {
  inferGenderFromFirstName,
  resolveClientSalutation,
} from '@/lib/ai-report-builder/salutation';
import { buildLetterOfTransmittalContent } from '@/lib/ai-report-builder/front-matter';

describe('inferGenderFromFirstName', () => {
  it('resolves high-confidence names', () => {
    expect(inferGenderFromFirstName('David')).toBe('male');
    expect(inferGenderFromFirstName('Elizabeth')).toBe('female');
    expect(inferGenderFromFirstName('SHARI')).toBe('female');
  });

  it('returns null for ambiguous / unknown names', () => {
    expect(inferGenderFromFirstName('Alex')).toBeNull();
    expect(inferGenderFromFirstName('Jordan')).toBeNull();
    expect(inferGenderFromFirstName('Taylor')).toBeNull();
    expect(inferGenderFromFirstName('Baiko')).toBeNull();
  });
});

describe('resolveClientSalutation', () => {
  it('uses Mr. for David Baiko without highlight flag', () => {
    const r = resolveClientSalutation({ client_contact_name: 'David Baiko' });
    expect(r).toEqual({ text: 'Mr. Baiko', certain: true, gender: 'male' });
  });

  it('uses Ms. for known feminine first names', () => {
    const r = resolveClientSalutation({ client_contact_name: 'Jennifer Smith' });
    expect(r).toEqual({ text: 'Ms. Smith', certain: true, gender: 'female' });
  });

  it('keeps Mr./Ms. and marks uncertain for ambiguous first names', () => {
    const r = resolveClientSalutation({ client_contact_name: 'Alex Rivera' });
    expect(r).toEqual({ text: 'Mr./Ms. Rivera', certain: false, gender: null });
  });

  it('respects explicit client_salutation', () => {
    const r = resolveClientSalutation({
      client_contact_name: 'Alex Rivera',
      client_salutation: 'Ms. Rivera',
    });
    expect(r.certain).toBe(true);
    expect(r.text).toBe('Ms. Rivera');
  });

  it('respects honorific already on the contact name', () => {
    const r = resolveClientSalutation({ client_contact_name: 'Mr. Amir Peleg' });
    expect(r).toEqual({ text: 'Mr. Peleg', certain: true, gender: 'male' });
  });
});

describe('LoT content salutation highlight flag', () => {
  it('marks ambiguous salutation for author highlight', () => {
    const certain = buildLetterOfTransmittalContent({
      property_name: 'Nordic',
      city: 'Peninsula',
      state: 'OH',
      market_type: 'glamping',
      client_contact_name: 'David Baiko',
      unit_mix: [],
    });
    const salutation = certain.blocks.find(
      (b) => b.kind === 'paragraph' && b.text.endsWith(':') && /Baiko/.test(b.text)
    );
    expect(salutation).toMatchObject({
      kind: 'paragraph',
      text: 'Mr. Baiko:',
      authorHighlight: false,
    });

    const uncertain = buildLetterOfTransmittalContent({
      property_name: 'Nordic',
      city: 'Peninsula',
      state: 'OH',
      market_type: 'glamping',
      client_contact_name: 'Alex Rivera',
      unit_mix: [],
    });
    const ambig = uncertain.blocks.find(
      (b) => b.kind === 'paragraph' && /Rivera/.test(b.text)
    );
    expect(ambig).toMatchObject({
      kind: 'paragraph',
      text: 'Mr./Ms. Rivera:',
      authorHighlight: true,
    });
  });
});
