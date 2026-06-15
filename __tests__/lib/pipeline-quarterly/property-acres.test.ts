import {
  formatPipelinePropertyAcres,
  propertyAcresFromSageFields,
} from '@/lib/pipeline-quarterly/property-acres';

describe('propertyAcresFromSageFields', () => {
  it('parses acreage from description', () => {
    expect(
      propertyAcresFromSageFields({
        description: 'Nature-first micro-resort on ~42 acres in Pittsylvania County.',
      })
    ).toBe(42);
  });

  it('parses hyphenated acreage from address', () => {
    expect(
      propertyAcresFromSageFields({
        description: null,
        address: '544-acre parcel at US-191 & UT-313 corridor',
      })
    ).toBe(544);
  });

  it('parses decimal acreage', () => {
    expect(
      propertyAcresFromSageFields({
        address: '12.5-acre Silverado Trail / Milliken Creek area parcel (proposed)',
      })
    ).toBe(12.5);
  });

  it('prefers the operator parcel over adjacent lake acreage', () => {
    expect(
      propertyAcresFromSageFields({
        description:
          'Glamping within the serene 75-acre Wildwood Park. Access to the vast 72,000-acre Clarks Hill Lake for boating.',
      })
    ).toBe(75);
  });

  it('ignores adjacent wilderness acreage when a property footprint is present', () => {
    expect(
      propertyAcresFromSageFields({
        description:
          'Treetopia Campground sits on ~225 acres in Catskill, NY, steps away from the expansive 700,000-acre Catskill Park.',
      })
    ).toBe(225);
  });

  it('ignores sprawling parent-ranch acreage without a parcel size', () => {
    expect(
      propertyAcresFromSageFields({
        description:
          'Exclusive glamping retreat within a sprawling 15,000-acre fly-fishing paradise.',
      })
    ).toBeNull();
  });

  it('returns null when no acreage is present', () => {
    expect(
      propertyAcresFromSageFields({
        description: 'Luxury glamping near the national park.',
        notes: 'Verify opening date.',
      })
    ).toBeNull();
  });
});

describe('formatPipelinePropertyAcres', () => {
  it('formats whole and fractional acres', () => {
    expect(formatPipelinePropertyAcres(42)).toBe('42');
    expect(formatPipelinePropertyAcres(12.5)).toBe('12.5');
    expect(formatPipelinePropertyAcres(15000)).toBe('15,000');
    expect(formatPipelinePropertyAcres(null)).toBe('—');
  });
});
