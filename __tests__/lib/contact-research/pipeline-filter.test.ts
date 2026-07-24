/**
 * @jest-environment node
 */

import { isOutdoorPipelineRowForTest } from '@/lib/contact-research/seed-filters';

describe('contact-research outdoor pipeline filter', () => {
  it('keeps Outdoor commercial flag and glamping/RV property types', () => {
    expect(
      isOutdoorPipelineRowForTest({
        commercial_outdoor: 'Outdoor',
        property_type: 'Office',
      })
    ).toBe(true);
    expect(
      isOutdoorPipelineRowForTest({
        commercial_outdoor: 'Commercial',
        property_type: 'Glamping Resort',
      })
    ).toBe(true);
    expect(
      isOutdoorPipelineRowForTest({
        commercial_outdoor: 'Commercial',
        property_type: 'RV Park',
      })
    ).toBe(true);
  });

  it('rejects unrelated commercial jobs', () => {
    expect(
      isOutdoorPipelineRowForTest({
        commercial_outdoor: 'Commercial',
        property_type: 'Auto Dealership',
      })
    ).toBe(false);
  });
});
