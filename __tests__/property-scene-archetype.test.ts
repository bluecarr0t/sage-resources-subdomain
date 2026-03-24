import {
  defaultPropertySceneArchetypeForConfigType,
  defaultPropertySceneArchetypeFromConfigTypes,
  parsePropertySceneArchetypeFromBody,
  resolveSceneFramingToArchetype,
  scenePhraseForPropertyArchetype,
} from '@/lib/site-builder/property-scene-archetype';

describe('resolveSceneFramingToArchetype', () => {
  it('maps explicit framing choices to archetype phrases', () => {
    expect(resolveSceneFramingToArchetype('glamping', [{ type: 'rv' }])).toBe('glamping_resort');
    expect(resolveSceneFramingToArchetype('rv', [{ type: 'glamping' }])).toBe('rv_resort');
    expect(
      resolveSceneFramingToArchetype('generic_outdoor_hospitality', [{ type: 'glamping' }])
    ).toBe('mixed_outdoor_hospitality');
    expect(resolveSceneFramingToArchetype('marina', [{ type: 'rv' }])).toBe('marina');
    expect(resolveSceneFramingToArchetype('campground', [{ type: 'glamping' }])).toBe(
      'traditional_campground'
    );
  });

  it('auto resolves from row types', () => {
    expect(resolveSceneFramingToArchetype('auto', [{ type: 'glamping' }])).toBe('glamping_resort');
    expect(resolveSceneFramingToArchetype('auto', [{ type: 'rv' }])).toBe('rv_resort');
    expect(
      resolveSceneFramingToArchetype('auto', [
        { type: 'glamping' },
        { type: 'rv' },
      ])
    ).toBe('mixed_outdoor_hospitality');
  });
});

describe('defaultPropertySceneArchetypeFromConfigTypes', () => {
  it('matches auto resolution for non-empty lists', () => {
    expect(defaultPropertySceneArchetypeFromConfigTypes([{ type: 'glamping' }])).toBe('glamping_resort');
    expect(defaultPropertySceneArchetypeFromConfigTypes([{ type: 'rv' }])).toBe('rv_resort');
    expect(
      defaultPropertySceneArchetypeFromConfigTypes([{ type: 'glamping' }, { type: 'rv' }])
    ).toBe('mixed_outdoor_hospitality');
  });
});

describe('defaultPropertySceneArchetypeForConfigType', () => {
  it('falls back per row type', () => {
    expect(defaultPropertySceneArchetypeForConfigType('glamping')).toBe('glamping_resort');
    expect(defaultPropertySceneArchetypeForConfigType('rv')).toBe('rv_resort');
  });
});

describe('parsePropertySceneArchetypeFromBody', () => {
  it('accepts resolved ids only', () => {
    expect(parsePropertySceneArchetypeFromBody('marina')).toBe('marina');
    expect(parsePropertySceneArchetypeFromBody('auto')).toBeUndefined();
    expect(parsePropertySceneArchetypeFromBody('nope')).toBeUndefined();
    expect(parsePropertySceneArchetypeFromBody(null)).toBeUndefined();
  });
});

describe('scenePhraseForPropertyArchetype', () => {
  it('returns non-empty phrases', () => {
    expect(scenePhraseForPropertyArchetype('marina').length).toBeGreaterThan(20);
    expect(scenePhraseForPropertyArchetype('traditional_campground')).toContain('tent');
  });
});
