/**
 * @jest-environment node
 */

import { compsV2FriendlySourceTable } from '@/lib/comps-v2/source-table-display';

describe('compsV2FriendlySourceTable', () => {
  it('maps all_glamping_properties to Sage Glamping Data', () => {
    expect(compsV2FriendlySourceTable('all_glamping_properties')).toBe('Sage Glamping Data');
  });

  it('title-cases unknown snake_case', () => {
    expect(compsV2FriendlySourceTable('some_future_source')).toBe('Some Future Source');
  });

  it('maps web_research legend key and gap-fill source_tables to Web Research', () => {
    expect(compsV2FriendlySourceTable('web_research')).toBe('Web Research');
    expect(compsV2FriendlySourceTable('tavily_gap_fill')).toBe('Web Research');
    expect(compsV2FriendlySourceTable('firecrawl_gap_fill')).toBe('Web Research');
  });
});
