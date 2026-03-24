import {
  deriveClientMapPropertyHeadline,
  isLikelyInternalCategoryPropertyName,
  isLikelyMisextractedPropertyName,
  stripStudyIdSuffixFromTitle,
} from '@/lib/client-map-display-name';

describe('stripStudyIdSuffixFromTitle', () => {
  it('removes trailing job number when it matches study_id', () => {
    expect(
      stripStudyIdSuffixFromTitle(
        'Cheyenne RV Resort Feasibility Study - 23-202A-07',
        '23-202A-07'
      )
    ).toBe('Cheyenne RV Resort Feasibility Study');
  });

  it('is case-insensitive on study id', () => {
    expect(stripStudyIdSuffixFromTitle('Report - 23-202a-07', '23-202A-07')).toBe('Report');
  });

  it('returns null when suffix does not match study id', () => {
    expect(
      stripStudyIdSuffixFromTitle('Cheyenne RV Resort Feasibility Study - 99-999A-99', '23-202A-07')
    ).toBeNull();
  });
});

describe('isLikelyInternalCategoryPropertyName', () => {
  it('flags dot-prefixed spreadsheet-style labels', () => {
    expect(isLikelyInternalCategoryPropertyName('development. Attractions')).toBe(true);
  });

  it('does not flag normal property names', () => {
    expect(isLikelyInternalCategoryPropertyName('Cheyenne RV Resort')).toBe(false);
    expect(isLikelyInternalCategoryPropertyName('St. Mary Glamping')).toBe(false);
  });
});

describe('isLikelyMisextractedPropertyName', () => {
  it('flags marketing / narrative fragments', () => {
    expect(
      isLikelyMisextractedPropertyName('in a world class dual waterfront access s')
    ).toBe(true);
  });

  it('does not flag normal short names', () => {
    expect(isLikelyMisextractedPropertyName('WildFlower')).toBe(false);
    expect(isLikelyMisextractedPropertyName('Cheyenne RV Resort')).toBe(false);
  });
});

describe('deriveClientMapPropertyHeadline', () => {
  it('uses title-derived name when property_name is a truncated sentence', () => {
    expect(
      deriveClientMapPropertyHeadline(
        'in a world class dual waterfront access s',
        'WildFlower Restricted Narrative Feasibility Study - 25-206A-05',
        '25-206A-05'
      )
    ).toBe('WildFlower Restricted Narrative Feasibility Study');
  });

  it('uses title-derived name when property_name is a category label', () => {
    expect(
      deriveClientMapPropertyHeadline(
        'development. Attractions',
        'Cheyenne RV Resort Feasibility Study - 23-202A-07',
        '23-202A-07'
      )
    ).toBe('Cheyenne RV Resort Feasibility Study');
  });

  it('keeps real property_name when present', () => {
    expect(
      deriveClientMapPropertyHeadline(
        'Sunset Ranch Glamping',
        'Sunset Ranch Glamping - 25-101A-01',
        '25-101A-01'
      )
    ).toBe('Sunset Ranch Glamping');
  });
});
