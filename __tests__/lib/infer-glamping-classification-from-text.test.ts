import {
  buildGlampingClassificationPrompt,
  parseGlampingClassificationJson,
} from '@/lib/infer-glamping-classification-from-text';

describe('infer-glamping-classification-from-text', () => {
  it('parses valid JSON', () => {
    const raw = JSON.stringify({
      property_type: 'Glamping Resort',
      land_operator_category: 'private_commercial',
    });
    expect(parseGlampingClassificationJson(raw)).toEqual({
      property_type: 'Glamping Resort',
      land_operator_category: 'private_commercial',
    });
  });

  it('extracts JSON from surrounding text', () => {
    const raw = `Here you go:
{"property_type":"State Park Campground","land_operator_category":"state_park"}
`;
    expect(parseGlampingClassificationJson(raw)).toEqual({
      property_type: 'State Park Campground',
      land_operator_category: 'state_park',
    });
  });

  it('nulls invalid land_operator_category', () => {
    const raw = JSON.stringify({
      property_type: 'X',
      land_operator_category: 'State Park',
    });
    expect(parseGlampingClassificationJson(raw)).toEqual({
      property_type: 'X',
      land_operator_category: null,
    });
  });

  it('truncates very long property_type', () => {
    const long = 'A'.repeat(300);
    const raw = JSON.stringify({
      property_type: long,
      land_operator_category: 'other_public',
    });
    const out = parseGlampingClassificationJson(raw);
    expect(out.property_type?.length).toBe(160);
    expect(out.land_operator_category).toBe('other_public');
  });

  it('buildGlampingClassificationPrompt includes name and description', () => {
    const p = buildGlampingClassificationPrompt('Test Ranch', 'A family glamping spot.');
    expect(p).toContain('Test Ranch');
    expect(p).toContain('family glamping');
    expect(p).toContain('private_commercial');
  });
});
