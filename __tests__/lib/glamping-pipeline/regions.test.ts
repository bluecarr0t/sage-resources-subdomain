import {
  CA_PIPELINE_REGIONS,
  US_PIPELINE_REGIONS,
  extractedStateMatchesRegion,
  findPipelineRegion,
  parsePipelineCountry,
  pipelineDiscoverySourceForRegion,
} from '@/lib/glamping-pipeline/regions';
import { buildRegionPipelineQueries } from '@/lib/glamping-pipeline/region-queries';
import { isExtractedCountryAllowed } from '@/lib/glamping-pipeline/extract-from-article';
import {
  sageDataEditorHrefForRegion,
  selectPendingRegionsForRotation,
} from '@/lib/glamping-pipeline/state-coverage';

describe('pipeline regions', () => {
  it('covers all 50 US states and 13 Canadian provinces/territories', () => {
    expect(US_PIPELINE_REGIONS).toHaveLength(50);
    expect(CA_PIPELINE_REGIONS).toHaveLength(13);
  });

  it('maps Modern Campground archive slugs', () => {
    expect(findPipelineRegion('United States', 'NC')?.archiveSlug).toBe(
      'north-carolina'
    );
    expect(findPipelineRegion('Canada', 'BC')?.archiveSlug).toBe(
      'british-columbia'
    );
    expect(findPipelineRegion('Canada', 'PE')?.archiveSlug).toBe(
      'prince-edward-island'
    );
  });

  it('parses country labels', () => {
    expect(parsePipelineCountry('USA')).toBe('United States');
    expect(parsePipelineCountry('United States')).toBe('United States');
    expect(parsePipelineCountry('ca')).toBe('Canada');
    expect(parsePipelineCountry('Mexico')).toBeNull();
  });

  it('matches extracted state names to region codes', () => {
    expect(extractedStateMatchesRegion('TX', 'United States', 'TX')).toBe(true);
    expect(extractedStateMatchesRegion('Texas', 'United States', 'TX')).toBe(true);
    expect(extractedStateMatchesRegion('Quebec', 'Canada', 'QC')).toBe(true);
    expect(extractedStateMatchesRegion('QC', 'Canada', 'QC')).toBe(true);
    expect(extractedStateMatchesRegion('ON', 'Canada', 'QC')).toBe(false);
  });

  it('builds discovery source tags', () => {
    expect(pipelineDiscoverySourceForRegion('United States', 'tx')).toBe(
      'weekly_pipeline_sync_state_TX'
    );
    expect(pipelineDiscoverySourceForRegion('Canada', 'qc')).toBe(
      'weekly_pipeline_sync_province_QC'
    );
  });
});

describe('region Tavily queries', () => {
  it('includes Modern Campground archive queries for a US state', () => {
    const region = findPipelineRegion('United States', 'TX');
    expect(region).not.toBeNull();
    const queries = buildRegionPipelineQueries(region!);
    expect(queries.some((q) => q.includes('site:moderncampground.com/usa/texas'))).toBe(
      true
    );
    expect(queries.some((q) => q.includes('"Texas" proposed glamping'))).toBe(true);
  });

  it('includes Canada archive path for provinces', () => {
    const region = findPipelineRegion('Canada', 'QC');
    const queries = buildRegionPipelineQueries(region!, ['A']);
    expect(
      queries.some((q) => q.includes('site:moderncampground.com/canada/quebec'))
    ).toBe(true);
  });
});

describe('extracted country allow-list', () => {
  it('accepts USA aliases for United States sweeps', () => {
    expect(isExtractedCountryAllowed('USA', 'United States')).toBe(true);
    expect(isExtractedCountryAllowed('United States', 'United States')).toBe(true);
    expect(isExtractedCountryAllowed('Canada', 'United States')).toBe(false);
  });

  it('accepts Canada aliases for Canada sweeps', () => {
    expect(isExtractedCountryAllowed('Canada', 'Canada')).toBe(true);
    expect(isExtractedCountryAllowed('CA', 'Canada')).toBe(true);
    expect(isExtractedCountryAllowed('USA', 'Canada')).toBe(false);
  });
});

describe('sage data editor href', () => {
  it('pre-fills in_progress + region filters', () => {
    expect(sageDataEditorHrefForRegion('United States', 'IL')).toBe(
      '/admin/sage-data/editor?country=United+States&state=IL&research_status=in_progress'
    );
  });
});

describe('Tuesday rotation pending order', () => {
  it('takes the next 5 pending P0 US regions when the coverage table is empty', () => {
    const next = selectPendingRegionsForRotation(new Map(), 5);
    expect(next.map((r) => r.code)).toEqual(['FL', 'NC', 'NM', 'OK', 'SC']);
    expect(next.every((r) => r.country === 'United States' && r.priority === 0)).toBe(
      true
    );
  });

  it('skips in_progress and no_projects_found so a hand P0 does not get re-queued', () => {
    const statusByKey = new Map<string, 'complete' | 'pending' | 'in_progress' | 'no_projects_found'>();
    statusByKey.set('United States:FL', 'in_progress');
    statusByKey.set('United States:NC', 'complete');
    statusByKey.set('United States:NM', 'no_projects_found');
    const next = selectPendingRegionsForRotation(statusByKey, 5);
    expect(next.map((r) => r.code)).toEqual(['OK', 'SC', 'TX', 'MB', 'NL']);
  });

  it('rides P1 US after P0 US and Canada are marked complete', () => {
    const statusByKey = new Map<string, 'complete' | 'pending'>();
    for (const code of ['TX', 'FL', 'NC', 'SC', 'NM', 'OK']) {
      statusByKey.set(`United States:${code}`, 'complete');
    }
    for (const code of ['QC', 'MB', 'PE', 'NL']) {
      statusByKey.set(`Canada:${code}`, 'complete');
    }
    const next = selectPendingRegionsForRotation(statusByKey, 5);
    expect(next.map((r) => `${r.country}:${r.code}`)).toEqual([
      'United States:IL',
      'United States:IN',
      'United States:MN',
      'United States:MO',
      'United States:OH',
    ]);
    const sixth = selectPendingRegionsForRotation(statusByKey, 6).at(-1);
    expect(sixth).toMatchObject({ country: 'United States', code: 'WI', priority: 1 });
  });
});
