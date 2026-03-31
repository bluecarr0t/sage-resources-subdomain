/**
 * @jest-environment node
 */

import { compsV2SourceTableLabel, compsV2SourceTableFallbackLabel } from '@/lib/comps-v2/source-table-i18n';

const t = (key: string) => {
  const map: Record<string, string> = {
    sourceGlamping: 'GL',
    resultsMapLegendWebResearch: 'WR',
    sourceTableDeepEnrich: 'DE',
  };
  return map[key] ?? key;
};

describe('compsV2SourceTableLabel', () => {
  it('maps known tables to i18n', () => {
    expect(compsV2SourceTableLabel('all_glamping_properties', t)).toBe('GL');
    expect(compsV2SourceTableLabel('web_search', t)).toBe('WR');
    expect(compsV2SourceTableLabel('comps_v2_deep_enrich', t)).toBe('DE');
  });

  it('fallback title-cases unknown', () => {
    expect(compsV2SourceTableFallbackLabel('foo_bar')).toBe('Foo Bar');
  });
});
