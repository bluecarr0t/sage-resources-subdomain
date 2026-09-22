import { describe, expect, it } from '@jest/globals';
import { acceptUnitTypeFinding } from '@/lib/glamping-unit-type-research/accept';
import {
  classifyMissingUnitRow,
  unitTypeFromSiteName,
} from '@/lib/glamping-unit-type-research/classify';

const page = 'Lagom Retreat rents one cabin beside the creek.';

describe('unitTypeFromSiteName', () => {
  it('maps a canonical site name and refuses a retired tent phrase', () => {
    expect(unitTypeFromSiteName('Cabin')).toBe('Cabin');
    expect(unitTypeFromSiteName('Canvas Tent')).toBeNull();
    expect(unitTypeFromSiteName('Glamping tent')).toBeNull();
    expect(unitTypeFromSiteName('FAMILY---H 42')).toBeNull();
  });
});

describe('classifyMissingUnitRow', () => {
  it('keeps state parks out of the site-name fill', () => {
    expect(
      classifyMissingUnitRow({
        siteName: 'Allaire State Park',
        propertyName: 'Allaire State Park',
        landOperatorCategory: 'state_park',
      })
    ).toBe('state_park_placeholder');
  });

  it('treats a blank site name as a property shell', () => {
    expect(
      classifyMissingUnitRow({
        siteName: null,
        propertyName: 'Huttopia Berkshires',
        landOperatorCategory: 'private_commercial',
      })
    ).toBe('property_shell');
  });
});

describe('acceptUnitTypeFinding', () => {
  it('accepts a quoted cabin and drops a quantity that is not in the quote', () => {
    const decision = acceptUnitTypeFinding({
      propertyName: 'Lagom Retreat',
      markdown: page,
      products: [
        {
          unitType: 'Cabin',
          siteName: 'Cabin',
          quantity: 4,
          quote: 'Lagom Retreat rents one cabin beside the creek.',
        },
      ],
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.units[0]?.unitType).toBe('Cabin');
      expect(decision.units[0]?.quantity).toBeNull();
    }
  });

  it('rejects a quote that only shares a generic landscape word', () => {
    const quote =
      'Enjoy our mountain getaway in a luxury Explorer canvas Cabin Tent with deck, at your secluded, private campsite.';
    const decision = acceptUnitTypeFinding({
      propertyName: 'Bliss Camps Glamping (Rocky Mountain Glamping)',
      markdown: quote,
      products: [
        { unitType: 'Cabin Tent', siteName: 'Cabin Tent', quantity: null, quote },
      ],
    });
    expect(decision).toEqual({ ok: false, reason: 'no_quoted_unit_type' });
  });

  it('rejects a quote that only shares a generic place word', () => {
    const quote =
      'Cabins: Rustic Cabins (3 night minimum) Base Rate: $58.00 per night Out of State Fee: $7.00 per night';
    const decision = acceptUnitTypeFinding({
      propertyName: 'Watkins Glen State Park',
      markdown: quote,
      products: [
        { unitType: 'Cabin', siteName: 'Cabin', quantity: null, quote },
      ],
    });
    expect(decision).toEqual({ ok: false, reason: 'no_quoted_unit_type' });
  });

  it('rejects a canvas tent catch-all', () => {
    const decision = acceptUnitTypeFinding({
      propertyName: 'Huckleberry Tent & Breakfast',
      markdown: 'Huckleberry Tent & Breakfast offers a canvas tent.',
      products: [
        {
          unitType: 'Canvas Tent',
          siteName: 'Canvas Tent',
          quantity: null,
          quote: 'Huckleberry Tent & Breakfast offers a canvas tent.',
        },
      ],
    });
    expect(decision).toEqual({ ok: false, reason: 'no_quoted_unit_type' });
  });
});
