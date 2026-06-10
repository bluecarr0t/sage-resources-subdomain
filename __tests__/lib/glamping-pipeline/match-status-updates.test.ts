import { matchStatusUpdatesToProperties } from '@/lib/glamping-pipeline/match-status-updates';

describe('matchStatusUpdatesToProperties', () => {
  const tracked = [
    {
      id: 1,
      slug: 'alpha-camp',
      property_name: 'Alpha Glamping Camp',
      is_open: 'Proposed Development',
    },
    {
      id: 2,
      slug: 'beta-resort',
      property_name: 'Beta Resort',
      is_open: 'Under Construction',
    },
  ];

  it('matches high-confidence updates by normalized property name', () => {
    const matched = matchStatusUpdatesToProperties(
      [
        {
          property_name: 'Alpha Glamping Camp',
          is_open: 'Under Construction',
          confidence: 'high',
        },
        {
          property_name: 'Beta Resort',
          is_open: 'Yes',
          confidence: 'high',
        },
      ],
      tracked
    );

    expect(matched).toHaveLength(2);
    expect(matched[0].property.id).toBe(1);
    expect(matched[1].update.is_open).toBe('Yes');
  });

  it('matches high-confidence cancellation updates', () => {
    const matched = matchStatusUpdatesToProperties(
      [
        {
          property_name: 'Alpha Glamping Camp',
          is_open: 'Cancelled',
          confidence: 'high',
          evidence: 'Developer pulled out of the project.',
        },
      ],
      tracked
    );

    expect(matched).toHaveLength(1);
    expect(matched[0].update.is_open).toBe('Cancelled');
    expect(matched[0].property.id).toBe(1);
  });

  it('skips low-confidence and unchanged updates', () => {
    const matched = matchStatusUpdatesToProperties(
      [
        {
          property_name: 'Alpha Glamping Camp',
          is_open: 'Under Construction',
          confidence: 'low',
        },
        {
          property_name: 'Beta Resort',
          is_open: 'Under Construction',
          confidence: 'high',
        },
      ],
      tracked
    );

    expect(matched).toHaveLength(0);
  });
});
