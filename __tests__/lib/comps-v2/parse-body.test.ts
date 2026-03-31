/**
 * @jest-environment node
 */

import {
  parseMaxResults,
  parseSourceToggles,
  parseTavilyMaxQueries,
  parseTavilyResultsPerQuery,
  COMPS_V2_MAX_RESULTS_DEFAULT,
  COMPS_V2_MAX_RESULTS_MAX,
  COMPS_V2_MAX_RESULTS_MIN,
  COMPS_V2_TAVILY_MAX_QUERIES_DEFAULT,
  COMPS_V2_TAVILY_MAX_QUERIES_MAX,
  COMPS_V2_TAVILY_RESULTS_PER_QUERY_DEFAULT,
  COMPS_V2_TAVILY_RESULTS_PER_QUERY_MAX,
} from '@/lib/comps-v2/parse-body';

describe('parseSourceToggles', () => {
  it('returns all false when sources missing', () => {
    expect(parseSourceToggles(undefined)).toEqual({
      pastReports: false,
      all_glamping_properties: false,
      hipcamp: false,
      all_roverpass_data_new: false,
      campspot: false,
      web_search: false,
    });
  });

  it('requires explicit true for each flag', () => {
    expect(parseSourceToggles({ hipcamp: true, web_search: false })).toEqual({
      pastReports: false,
      all_glamping_properties: false,
      hipcamp: true,
      all_roverpass_data_new: false,
      campspot: false,
      web_search: false,
    });
  });

  it('treats truthy non-boolean as off', () => {
    expect(parseSourceToggles({ hipcamp: 'yes' as unknown as boolean })).toEqual(
      expect.objectContaining({ hipcamp: false })
    );
  });
});

describe('parseMaxResults', () => {
  it('clamps to allowed range', () => {
    expect(parseMaxResults(0)).toBe(COMPS_V2_MAX_RESULTS_MIN);
    expect(parseMaxResults(99999)).toBe(COMPS_V2_MAX_RESULTS_MAX);
  });

  it('defaults invalid input', () => {
    expect(parseMaxResults('nope')).toBe(COMPS_V2_MAX_RESULTS_DEFAULT);
    expect(parseMaxResults(NaN)).toBe(COMPS_V2_MAX_RESULTS_DEFAULT);
  });

  it('accepts mid-range numbers', () => {
    expect(parseMaxResults(750)).toBe(750);
  });
});

describe('parseTavilyMaxQueries', () => {
  it('clamps to 1–10', () => {
    expect(parseTavilyMaxQueries(0)).toBe(1);
    expect(parseTavilyMaxQueries(99)).toBe(COMPS_V2_TAVILY_MAX_QUERIES_MAX);
  });

  it('defaults invalid input', () => {
    expect(parseTavilyMaxQueries(undefined)).toBe(COMPS_V2_TAVILY_MAX_QUERIES_DEFAULT);
  });
});

describe('parseTavilyResultsPerQuery', () => {
  it('clamps to 1–10', () => {
    expect(parseTavilyResultsPerQuery(0)).toBe(1);
    expect(parseTavilyResultsPerQuery(100)).toBe(COMPS_V2_TAVILY_RESULTS_PER_QUERY_MAX);
  });

  it('defaults invalid input', () => {
    expect(parseTavilyResultsPerQuery(undefined)).toBe(COMPS_V2_TAVILY_RESULTS_PER_QUERY_DEFAULT);
  });
});
