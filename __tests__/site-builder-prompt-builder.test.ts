import {
  buildBatchSceneReferenceAfterCatalog,
  buildGlobalStyleBlock,
  buildImagePrompt,
  buildReferenceImagePromptPrefix,
  DEFAULT_REFERENCE_VARIATION,
  FRAMING_AND_COMPOSITION,
  inferRoadSurfaceFromImageDescription,
  isValidImagePromptConfig,
  REFERENCE_IMAGE_PROMPT_PREFIX,
} from '@/lib/site-builder/prompt-builder';

describe('inferRoadSurfaceFromImageDescription', () => {
  it('returns undefined when empty or no road cues', () => {
    expect(inferRoadSurfaceFromImageDescription('')).toBeUndefined();
    expect(inferRoadSurfaceFromImageDescription('Red door, white fence')).toBeUndefined();
  });

  it('detects gravel and dirt from common phrases', () => {
    expect(inferRoadSurfaceFromImageDescription('Internal roads are gravel')).toBe('gravel');
    expect(inferRoadSurfaceFromImageDescription('Gravel access road')).toBe('gravel');
    expect(inferRoadSurfaceFromImageDescription('Unpaved dirt lane to site')).toBe('dirt');
    expect(inferRoadSurfaceFromImageDescription('Dirt roads throughout')).toBe('dirt');
  });

  it('detects aggregate, DG, and unimproved circulation cues', () => {
    expect(
      inferRoadSurfaceFromImageDescription('Internal circulation is decomposed granite')
    ).toBe('gravel');
    expect(inferRoadSurfaceFromImageDescription('Unimproved access road to pads')).toBe('dirt');
    expect(inferRoadSurfaceFromImageDescription('Stone dust lanes between sites')).toBe('gravel');
  });
});

describe('isValidImagePromptConfig', () => {
  it('rejects empty glamping unit name', () => {
    expect(
      isValidImagePromptConfig({
        type: 'glamping',
        unitTypeName: '',
        qualityType: 'Premium',
        amenityNames: [],
      })
    ).toBe(false);
    expect(
      isValidImagePromptConfig({
        type: 'glamping',
        unitTypeName: '  ',
        qualityType: 'Premium',
        amenityNames: [],
      })
    ).toBe(false);
  });

  it('rejects empty RV site name', () => {
    expect(
      isValidImagePromptConfig({
        type: 'rv',
        siteTypeName: '',
        qualityType: 'Premium',
        amenityNames: [],
      })
    ).toBe(false);
  });

  it('accepts non-empty names', () => {
    expect(
      isValidImagePromptConfig({
        type: 'glamping',
        unitTypeName: 'Yurt',
        qualityType: 'Premium',
        amenityNames: [],
      })
    ).toBe(true);
    expect(
      isValidImagePromptConfig({
        type: 'rv',
        siteTypeName: 'Pull-through',
        qualityType: 'Premium',
        amenityNames: [],
      })
    ).toBe(true);
  });
});

describe('buildGlobalStyleBlock', () => {
  it('includes aspect ratio, lens, negatives, and time-of-day variants', () => {
    const mid = buildGlobalStyleBlock({ aspectRatio: '3:2', timeOfDay: 'midday' });
    expect(mid).toContain('3:2 landscape aspect ratio');
    expect(mid).toContain('50mm full-frame equivalent');
    expect(mid).toMatch(/no people/i);
    expect(mid).toMatch(/no logos/i);
    expect(mid).toMatch(/no overlaid text/i);
    expect(mid).toContain('midday neutral daylight');

    const wide = buildGlobalStyleBlock({ aspectRatio: '16:9', timeOfDay: 'golden_hour' });
    expect(wide).toContain('16:9 widescreen landscape aspect ratio');
    expect(wide).toContain('golden-hour sunlight');

    const classic = buildGlobalStyleBlock({ aspectRatio: '4:3', timeOfDay: 'midday' });
    expect(classic).toContain('4:3 landscape aspect ratio');
  });
});

describe('buildBatchSceneReferenceAfterCatalog', () => {
  it('labels second attachment and supports variation copy', () => {
    const base = buildBatchSceneReferenceAfterCatalog();
    expect(base).toContain('Second attached image');
    const v = buildBatchSceneReferenceAfterCatalog('subtle_camera_shift');
    expect(v).toContain('Second attached image');
    expect(v).toContain('camera position');
    const combined = buildBatchSceneReferenceAfterCatalog(DEFAULT_REFERENCE_VARIATION);
    expect(combined).toContain('hero subject');
    expect(combined).toMatch(/camera position|viewing angle/i);
  });
});

describe('buildReferenceImagePromptPrefix', () => {
  it('includes base prefix and variation copy', () => {
    expect(buildReferenceImagePromptPrefix()).toBe(REFERENCE_IMAGE_PROMPT_PREFIX);
    const subj = buildReferenceImagePromptPrefix('same_property_new_subject');
    expect(subj.startsWith(REFERENCE_IMAGE_PROMPT_PREFIX)).toBe(true);
    expect(subj).toContain('Variation intent:');
    expect(subj).toContain('hero subject');

    const cam = buildReferenceImagePromptPrefix('subtle_camera_shift');
    expect(cam).toContain('camera position');

    const def = buildReferenceImagePromptPrefix(DEFAULT_REFERENCE_VARIATION);
    expect(def).toContain('hero subject');
    expect(def).toMatch(/camera position|viewing angle/i);
  });
});

describe('buildImagePrompt', () => {
  it('includes fixed framing (aspect ratio, focal length, centered subject)', () => {
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Yurt',
        sqft: 400,
        qualityType: 'Premium',
        amenityNames: [],
      },
      undefined,
      undefined
    );
    expect(g).toContain('Global look (fixed for this batch):');
    expect(g).toContain('4:3 landscape aspect ratio');
    expect(g).toContain('50mm full-frame equivalent');
    expect(g).toMatch(/centered in the frame/i);
    expect(g).toContain(FRAMING_AND_COMPOSITION);
    expect(g).toContain('paved internal roads');
  });

  it('uses gravel infrastructure when Additional details imply gravel roads', () => {
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Yurt',
        sqft: 400,
        qualityType: 'Premium',
        amenityNames: [],
      },
      undefined,
      'Gravel circulation roads; sagebrush nearby'
    );
    expect(g).toContain('compacted gravel internal roads');
    expect(g).not.toContain('paved internal roads');
  });

  it('uses 16:9 and golden hour when options request them', () => {
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Yurt',
        qualityType: 'Premium',
        amenityNames: [],
      },
      undefined,
      undefined,
      { aspectRatio: '16:9', timeOfDay: 'golden_hour' }
    );
    expect(g).toContain('16:9 widescreen landscape aspect ratio');
    expect(g).toContain('golden-hour sunlight');
  });

  it('defaults to Sage marketing brand look in the prompt', () => {
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Yurt',
        sqft: 200,
        qualityType: 'Premium',
        amenityNames: [],
      },
      undefined,
      undefined
    );
    expect(g).toContain('Brand look:');
    expect(g).toContain('greens and earth tones');
    const idxStyle = g.indexOf('Style: genuine photograph');
    const idxBrand = g.indexOf('Brand look:');
    expect(idxBrand).toBeGreaterThan(idxStyle);
  });

  it('omits brand look line when stylePreset is none', () => {
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Yurt',
        sqft: 200,
        qualityType: 'Premium',
        amenityNames: [],
      },
      undefined,
      undefined,
      { stylePreset: 'none' }
    );
    expect(g).not.toContain('Brand look:');
  });

  it('uses unified quality sentence for glamping and RV', () => {
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Yurt',
        sqft: 400,
        qualityType: 'Premium',
        amenityNames: [],
      },
      'Colorado',
      'Red trim'
    );
    expect(g).toContain('Visual quality tier: Premium —');
    expect(g).toContain('Setting: Colorado.');
    expect(g).toContain('Additional details to include: Red trim.');

    const r = buildImagePrompt(
      {
        type: 'rv',
        siteTypeName: 'Standard back-in',
        qualityType: 'Premium',
        amenityNames: [],
      },
      'Colorado',
      'Red trim'
    );
    expect(r).toContain('Visual quality tier: Premium —');
    expect(r).toContain('Setting: Colorado.');
    expect(r).not.toMatch(/accommodations with premium touches/);
    expect(r).toMatch(/polished pads|cohesive outdoor|RV/);
  });

  it('omits per-prompt location and global description when shared landscape is set', () => {
    const shared = 'one cohesive property-wide landscape; grounded in Utah';
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Dome',
        qualityType: 'Mid-Range',
        amenityNames: ['Fire pit'],
      },
      'Utah',
      'Aspen trees nearby',
      { sharedLandscapeContext: shared, batchPosition: 0, batchTotal: 2 }
    );
    expect(g).toContain(shared);
    expect(g).not.toContain('Setting: Utah.');
    expect(g).not.toContain('Additional details to include: Aspen trees nearby.');
  });

  it('applies road surface to glamping and RV', () => {
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Pod',
        qualityType: 'Economy',
        amenityNames: [],
      },
      undefined,
      undefined,
      { roadSurface: 'gravel' }
    );
    expect(g).toContain('Infrastructure:');
    expect(g).toContain('compacted gravel internal roads');

    const r = buildImagePrompt(
      {
        type: 'rv',
        siteTypeName: 'Pull-through',
        qualityType: 'Economy',
        amenityNames: [],
      },
      undefined,
      undefined,
      { roadSurface: 'gravel' }
    );
    expect(r).toContain('Infrastructure:');
    expect(r).toContain('compacted gravel internal roads');
  });

  it('adds house boat subject constraint when unit name indicates house boat', () => {
    const p = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'House Boat',
        sqft: 450,
        qualityType: 'Luxury',
        amenityNames: [],
      },
      undefined,
      undefined
    );
    expect(p).toContain('floating houseboat');
    expect(p).toContain('calm water');
  });

  it('uses propertySceneArchetype in the scene opener when provided', () => {
    const m = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Safari tent',
        qualityType: 'Premium',
        amenityNames: [],
      },
      undefined,
      undefined,
      { propertySceneArchetype: 'marina' }
    );
    expect(m).toMatch(/Scene: photorealistic .*marina/i);
    expect(m).not.toMatch(/Scene: photorealistic glamping resort/i);

    const generic = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Safari tent',
        qualityType: 'Premium',
        amenityNames: [],
      },
      undefined,
      undefined,
      { propertySceneArchetype: 'mixed_outdoor_hospitality' }
    );
    expect(generic).toContain('outdoor hospitality property combining lodging and RV-oriented facilities');

    const r = buildImagePrompt(
      {
        type: 'rv',
        siteTypeName: 'Back-in',
        qualityType: 'Premium',
        amenityNames: [],
      },
      undefined,
      undefined,
      { propertySceneArchetype: 'traditional_campground' }
    );
    expect(r.toLowerCase()).toContain('traditional campground');
  });

  it('uses RV-specific quality vocabulary for RV configs', () => {
    const r = buildImagePrompt(
      {
        type: 'rv',
        siteTypeName: 'Basic site',
        qualityType: 'Budget',
        amenityNames: [],
      },
      undefined,
      undefined
    );
    expect(r).toContain('Visual quality tier: Budget —');
    expect(r).toContain('basic campground infrastructure');
    expect(r).not.toContain('affordable accommodations');
  });

  it('orders clauses: catalog reference and setting after style block (glamping)', () => {
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Safari tent',
        qualityType: 'Luxury',
        amenityNames: ['Deck'],
        productLink: 'https://example.com/unit/123',
      },
      'Montana',
      'Morning mist'
    );
    const idxScene = g.indexOf('Scene:');
    const idxSubject = g.indexOf('Subject:');
    const idxQuality = g.indexOf('Visual quality tier:');
    const idxAmenities = g.indexOf('Amenities:');
    const idxStyle = g.indexOf('Style: genuine photograph');
    const idxBrand = g.indexOf('Brand look:');
    const idxCatalog = g.indexOf('Catalog reference:');
    const idxSetting = g.indexOf('Setting: Montana');
    const idxDetails = g.indexOf('Additional details to include: Morning mist');

    expect(idxScene).toBeLessThan(idxSubject);
    expect(idxSubject).toBeLessThan(idxQuality);
    expect(idxQuality).toBeLessThan(idxAmenities);
    expect(idxAmenities).toBeLessThan(idxStyle);
    expect(idxStyle).toBeLessThan(idxBrand);
    expect(idxBrand).toBeLessThan(idxCatalog);
    expect(idxCatalog).toBeLessThan(idxSetting);
    expect(idxSetting).toBeLessThan(idxDetails);
  });

  it('orders brand preset after style before catalog (glamping, default preset)', () => {
    const g = buildImagePrompt(
      {
        type: 'glamping',
        unitTypeName: 'Safari tent',
        qualityType: 'Luxury',
        amenityNames: ['Deck'],
        productLink: 'https://example.com/unit/123',
      },
      'Montana',
      'Morning mist'
    );
    const idxStyle = g.indexOf('Style: genuine photograph');
    const idxBrand = g.indexOf('Brand look:');
    const idxCatalog = g.indexOf('Catalog reference:');
    expect(idxStyle).toBeLessThan(idxBrand);
    expect(idxBrand).toBeLessThan(idxCatalog);
  });

  it('orders clauses: setting after style block (RV)', () => {
    const r = buildImagePrompt(
      {
        type: 'rv',
        siteTypeName: 'Back-in 50 amp',
        qualityType: 'Mid-Range',
        amenityNames: [],
      },
      'Texas Hill Country',
      undefined
    );
    const idxStyle = r.indexOf('Style: genuine photograph');
    const idxSetting = r.indexOf('Setting: Texas Hill Country');
    expect(idxStyle).toBeGreaterThan(-1);
    expect(idxSetting).toBeGreaterThan(idxStyle);
  });

  it('matches snapshot for representative glamping prompt', () => {
    expect(
      buildImagePrompt(
        {
          type: 'glamping',
          unitTypeName: 'Geodesic dome',
          diameterFt: 24,
          qualityType: 'Premium',
          amenityNames: ['Hot tub', 'Deck'],
          productLink: 'https://catalog.example/dome',
        },
        'High desert, New Mexico',
        'Sagebrush and distant mesas',
        { roadSurface: 'gravel', batchPosition: 1, batchTotal: 3, sharedLandscapeContext: 'shared test context' }
      )
    ).toMatchSnapshot();
  });

  it('matches snapshot for representative RV prompt', () => {
    expect(
      buildImagePrompt(
        {
          type: 'rv',
          siteTypeName: 'Deluxe back-in',
          qualityType: 'Luxury',
          amenityNames: ['Concrete pad'],
        },
        'Florida Gulf Coast',
        undefined,
        { roadSurface: 'paved', batchPosition: 0, batchTotal: 2, sharedLandscapeContext: 'coastal pines; late afternoon' }
      )
    ).toMatchSnapshot();
  });
});

describe('REFERENCE_IMAGE_PROMPT_PREFIX constant', () => {
  it('is non-empty and describes continuity', () => {
    expect(REFERENCE_IMAGE_PROMPT_PREFIX.length).toBeGreaterThan(40);
    expect(REFERENCE_IMAGE_PROMPT_PREFIX.toLowerCase()).toContain('reference');
  });
});
