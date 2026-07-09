/**
 * @jest-environment node
 */
import {
  buildPropertyEmbeddingText,
  hashEmbeddingContent,
} from '@/lib/sage-ai/embeddings';

describe('buildPropertyEmbeddingText — real amenity flags', () => {
  it('lists only "Yes" flag columns as amenities, humanized and sorted', () => {
    const text = buildPropertyEmbeddingText({
      id: 1,
      property_name: 'Cedar Ridge',
      city: 'Boone',
      state: 'NC',
      unit_type: 'Cabin',
      unit_private_bathroom: 'Yes',
      unit_hot_tub: 'Yes',
      unit_wifi: 'No',
      property_pool: 'Yes',
      activities_hiking: 'Yes',
      setting_forest: 'Yes',
      setting_desert: 'No',
    });

    const amenitiesLine = text
      .split('\n')
      .find((l) => l.startsWith('Amenities:'));
    expect(amenitiesLine).toBeDefined();
    // Present ("Yes") flags only, prefixes stripped, alphabetically sorted.
    expect(amenitiesLine).toBe(
      'Amenities: forest, hiking, hot tub, pool, private bathroom'
    );
    // "No" flags are excluded.
    expect(amenitiesLine).not.toContain('wifi');
    expect(amenitiesLine).not.toContain('desert');
  });

  it('does not treat descriptive prefixed columns as amenity flags', () => {
    const text = buildPropertyEmbeddingText({
      id: 2,
      property_name: 'Ridgeline',
      property_type: 'Resort',
      unit_type: 'Yurt',
      property_total_sites: 40 as unknown as string,
      unit_description: 'Spacious',
    });
    expect(text).not.toContain('Amenities:');
  });

  it('includes unstructured raw text as "Other features"', () => {
    const text = buildPropertyEmbeddingText({
      id: 3,
      property_name: 'Lakeside',
      amenities_raw: 'Kayak rentals',
      lifestyle_raw: 'Pet friendly',
    });
    const line = text.split('\n').find((l) => l.startsWith('Other features:'));
    expect(line).toBe('Other features: Kayak rentals | Pet friendly');
  });

  it('omits empty/null scalar fields and trims', () => {
    const text = buildPropertyEmbeddingText({
      id: 4,
      property_name: '  Camp Example  ',
      description: 'Hot tub cabins in the woods',
      unit_type: 'Cabin',
      property_type: null,
      city: 'Austin',
      state: 'TX',
    });
    expect(text).toContain('Name: Camp Example');
    expect(text).toContain('Location: Austin, TX');
    expect(text).toContain('Unit type: Cabin');
    expect(text).not.toContain('Property type');
  });

  it('produces a stable hash for identical content', () => {
    const input = {
      id: 5,
      property_name: 'Stable',
      state: 'CO',
      property_pool: 'Yes',
    };
    expect(hashEmbeddingContent(buildPropertyEmbeddingText(input))).toBe(
      hashEmbeddingContent(buildPropertyEmbeddingText(input))
    );
  });
});
