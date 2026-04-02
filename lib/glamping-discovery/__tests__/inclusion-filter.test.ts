/**
 * Unit tests for discovery pipeline inclusion filter
 */

import {
  passesInclusionCriteria,
  passesPostEnrichmentUnitCriteria,
} from '../inclusion-filter';

describe('passesInclusionCriteria', () => {
  it('rejects RV in name', () => {
    expect(passesInclusionCriteria({ property_name: 'RV Park Resort', number_of_units: 10 })).toEqual({
      pass: false,
      reason: 'rv_in_name',
    });
  });

  it('rejects unknown units when no glamping type signal', () => {
    expect(passesInclusionCriteria({ property_name: 'Sweet Glamping' })).toEqual({
      pass: false,
      reason: 'unknown_units',
    });
  });

  it('allows null units when unit_type signals glamping (unit count verified after enrichment)', () => {
    expect(
      passesInclusionCriteria({
        property_name: 'Ridge Yurts',
        unit_type: 'yurts',
      })
    ).toEqual({ pass: true });
  });

  it('allows null units when property_type signals glamping', () => {
    expect(
      passesInclusionCriteria({
        property_name: 'Alpine Retreat',
        property_type: 'Glamping Resort',
      })
    ).toEqual({ pass: true });
  });

  it('rejects fewer than 4 units', () => {
    expect(
      passesInclusionCriteria({
        property_name: 'Mountain Glamping',
        number_of_units: 3,
        unit_type: 'tents',
      })
    ).toEqual({ pass: false, reason: '< 4 units' });
  });

  it('accepts property with 8 units and glamping unit type', () => {
    expect(
      passesInclusionCriteria({
        property_name: 'Luxury Tents Co',
        number_of_units: 8,
        unit_type: 'tents',
      })
    ).toEqual({ pass: true });
  });

  it('rejects tent site unit type', () => {
    expect(
      passesInclusionCriteria({
        property_name: 'Basic Campground',
        number_of_units: 20,
        unit_type: 'tent sites',
      })
    ).toEqual({ pass: false, reason: 'tent_site' });
  });

  it('rejects RV unit type without glamping', () => {
    expect(
      passesInclusionCriteria({
        property_name: 'Sunny Trails Park',
        number_of_units: 50,
        unit_type: 'rv sites',
      })
    ).toEqual({ pass: false, reason: 'rv_unit_type' });
  });

  it('accepts property with exactly 4 units', () => {
    expect(
      passesInclusionCriteria({
        property_name: 'Boutique Glamping',
        number_of_units: 4,
        unit_type: 'yurts',
      })
    ).toEqual({ pass: true });
  });
});

describe('passesPostEnrichmentUnitCriteria', () => {
  it('rejects when unit count still unknown', () => {
    expect(
      passesPostEnrichmentUnitCriteria({
        property_name: 'Test',
        unit_type: 'yurts',
      })
    ).toEqual({ pass: false, reason: 'post_enrich_unknown_units' });
  });

  it('rejects when enriched count is below minimum', () => {
    expect(
      passesPostEnrichmentUnitCriteria({
        property_name: 'Test',
        number_of_units: 3,
        unit_type: 'cabins',
      })
    ).toEqual({ pass: false, reason: 'post_enrich_insufficient_units' });
  });

  it('accepts when enriched count meets minimum', () => {
    expect(
      passesPostEnrichmentUnitCriteria({
        property_name: 'Test',
        number_of_units: 6,
      })
    ).toEqual({ pass: true });
  });
});
