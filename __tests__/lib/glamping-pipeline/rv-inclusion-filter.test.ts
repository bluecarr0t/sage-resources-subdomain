import {
  passesRvPipelineInclusionCriteria,
  passesRvPipelinePostEnrichmentCriteria,
} from '@/lib/glamping-pipeline/rv-inclusion-filter';
import { isPipelineRvSegmentPropertyType } from '@/lib/glamping-pipeline/constants';

describe('isPipelineRvSegmentPropertyType', () => {
  it('includes RV parks, resorts, and campgrounds', () => {
    expect(isPipelineRvSegmentPropertyType('RV Park')).toBe(true);
    expect(isPipelineRvSegmentPropertyType('RV Resort')).toBe(true);
    expect(isPipelineRvSegmentPropertyType('Campground')).toBe(true);
    expect(isPipelineRvSegmentPropertyType('Glamping Resort')).toBe(false);
  });
});

describe('passesRvPipelineInclusionCriteria', () => {
  it('accepts USA RV parks with enough sites', () => {
    expect(
      passesRvPipelineInclusionCriteria({
        property_name: 'Desert Sun RV Park',
        property_type: 'RV Park',
        country: 'United States',
        number_of_units: 40,
      })
    ).toEqual({ pass: true });
  });

  it('accepts proposed campgrounds with at least 20 RV sites', () => {
    expect(
      passesRvPipelineInclusionCriteria({
        property_name: 'River Bend Campground',
        property_type: 'Campground',
        country: 'United States',
        number_of_units: 24,
        unit_type: 'RV Site',
      })
    ).toEqual({ pass: true });
  });

  it('rejects small RV parks and campgrounds', () => {
    expect(
      passesRvPipelineInclusionCriteria({
        property_name: 'Tiny RV Park',
        property_type: 'RV Park',
        country: 'United States',
        number_of_units: 10,
      }).pass
    ).toBe(false);

    expect(
      passesRvPipelineInclusionCriteria({
        property_name: 'Small Campground',
        property_type: 'Campground',
        country: 'United States',
        number_of_units: 12,
      }).reason
    ).toBe('below_min_rv_sites');
  });

  it('rejects tent-only campgrounds', () => {
    expect(
      passesRvPipelineInclusionCriteria({
        property_name: 'Pine Ridge Tent-Only Campground',
        property_type: 'Campground',
        country: 'United States',
        number_of_units: 40,
      }).reason
    ).toBe('tent_only_campground');
  });

  it('rejects non-RV names without RV property type', () => {
    expect(
      passesRvPipelineInclusionCriteria({
        property_name: 'Mountain Dome Resort',
        property_type: 'Glamping Resort',
        country: 'United States',
        number_of_units: 50,
      }).pass
    ).toBe(false);
  });
});

describe('passesRvPipelinePostEnrichmentCriteria', () => {
  it('enforces minimum site count after enrichment', () => {
    expect(
      passesRvPipelinePostEnrichmentCriteria({
        property_name: 'Big Rig Resort',
        number_of_units: 15,
      }).pass
    ).toBe(false);
  });
});
