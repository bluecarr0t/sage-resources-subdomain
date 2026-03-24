import {
  humanizeKebabSlug,
  resolveAmenityNamesForPrompt,
  resolveGlampingUnitTypeNameForPrompt,
  resolveRvSiteTypeNameForPrompt,
} from '@/lib/site-builder/prompt-display-names';

describe('humanizeKebabSlug', () => {
  it('title-cases hyphenated slugs', () => {
    expect(humanizeKebabSlug('safari-tent')).toBe('Safari Tent');
    expect(humanizeKebabSlug('a-frame')).toBe('A Frame');
  });
});

describe('resolveAmenityNamesForPrompt', () => {
  it('uses DB name when slug matches', () => {
    expect(
      resolveAmenityNamesForPrompt(['fire-pit'], [{ slug: 'fire-pit', name: 'Fire pit' }])
    ).toEqual(['Fire pit']);
  });

  it('matches slug case-insensitively', () => {
    expect(
      resolveAmenityNamesForPrompt(['Fire-Pit'], [{ slug: 'fire-pit', name: 'Fire pit' }])
    ).toEqual(['Fire pit']);
  });

  it('falls back to humanized slug when row missing', () => {
    expect(resolveAmenityNamesForPrompt(['outdoor-kitchen'], [])).toEqual(['Outdoor Kitchen']);
  });
});

describe('resolveGlampingUnitTypeNameForPrompt', () => {
  it('prefers catalog manufacturer + model', () => {
    expect(
      resolveGlampingUnitTypeNameForPrompt({
        unitTypeSlug: 'safari-tent',
        catalogUnit: { manufacturer: 'Acme', product_model: 'XL' },
        glampingTypes: [{ slug: 'safari-tent', name: 'Safari Tent' }],
      })
    ).toBe('Acme XL');
  });

  it('falls back to type name then humanized slug', () => {
    expect(
      resolveGlampingUnitTypeNameForPrompt({
        unitTypeSlug: 'safari-tent',
        catalogUnit: null,
        glampingTypes: [{ slug: 'safari-tent', name: 'Safari Tent' }],
      })
    ).toBe('Safari Tent');
    expect(
      resolveGlampingUnitTypeNameForPrompt({
        unitTypeSlug: 'unknown-slug',
        catalogUnit: null,
        glampingTypes: [],
      })
    ).toBe('Unknown Slug');
  });
});

describe('resolveRvSiteTypeNameForPrompt', () => {
  it('uses type table or humanizes slug', () => {
    expect(
      resolveRvSiteTypeNameForPrompt('pull-through', [{ slug: 'pull-through', name: 'Pull-through' }])
    ).toBe('Pull-through');
    expect(resolveRvSiteTypeNameForPrompt('deluxe-site', [])).toBe('Deluxe Site');
  });
});
