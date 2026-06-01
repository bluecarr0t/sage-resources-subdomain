import {
  CHART_TRANSPARENCY_TO_SOURCE_SCOPE,
  RV_OVERVIEW_CHART_SOURCE_SCOPE_KEYS,
} from '@/lib/rv-industry-overview/rv-overview-chart-source-scope';
import { RV_OVERVIEW_CHART_TRANSPARENCY_KEYS } from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

describe('rv-overview-chart-source-scope', () => {
  it('maps every transparency chart key to a scope message key', () => {
    for (const key of RV_OVERVIEW_CHART_TRANSPARENCY_KEYS) {
      expect(CHART_TRANSPARENCY_TO_SOURCE_SCOPE[key]).toBeDefined();
      expect(RV_OVERVIEW_CHART_SOURCE_SCOPE_KEYS).toContain(
        CHART_TRANSPARENCY_TO_SOURCE_SCOPE[key]
      );
    }
  });
});
