import { finalizeGlampingChartTransparencyAccum } from '@/lib/glamping-industry-overview/glamping-chart-transparency';
import { createChartTransparencyAccum } from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

describe('finalizeGlampingChartTransparencyAccum', () => {
  it('uses properties for state ADR choropleth and units for trends', () => {
    const accum = createChartTransparencyAccum();
    accum.stateAdrChoropleth.campspot = 10;
    accum.stateAdrChoropleth.campspotPropertyKeys.add('x|ca|');
    accum.stateAdrChoropleth.campspotPropertyKeys.add('y|ca|');
    accum.trends.campspot = 5;

    const map = finalizeGlampingChartTransparencyAccum(accum);
    expect(map.stateAdrChoropleth.countKind).toBe('properties');
    expect(map.stateAdrChoropleth.propertiesUsed).toBe(2);
    expect(map.stateAdrChoropleth.rowsUsed).toBe(10);
    expect(map.trends.countKind).toBe('units');
    expect(map.trends.rowsUsed).toBe(5);
  });
});
