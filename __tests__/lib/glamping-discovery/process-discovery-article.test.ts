/**
 * Integration-style tests: discovery article pipeline → all_glamping_properties or candidates.
 * Mocks OpenAI + Supabase (no network). Uses fake timers to skip enrichment delay.
 *
 * @jest-environment node
 */

import type { OpenAI } from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { processDiscoveryArticle } from '@/lib/glamping-discovery/process-discovery-article';

const ALL_GLAMPING = 'all_glamping_properties';
const CANDIDATES = 'glamping_discovery_candidates';

type InsertCall = { table: string; rows: unknown[] };

function createRecordingSupabase(): {
  supabase: SupabaseClient;
  insertCalls: InsertCall[];
  upsertCalls: { table: string; payload: unknown }[];
} {
  const insertCalls: InsertCall[] = [];
  const upsertCalls: { table: string; payload: unknown }[] = [];

  const supabase = {
    from(table: string) {
      return {
        insert(data: unknown) {
          const rows = Array.isArray(data) ? data : [data];
          insertCalls.push({ table, rows });
          return Promise.resolve({ error: null });
        },
        upsert(payload: unknown) {
          upsertCalls.push({ table, payload });
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;

  return { supabase, insertCalls, upsertCalls };
}

/** Each call to chat.completions.create returns the next JSON body string (message content). */
function createSequentialOpenAI(contents: string[]): OpenAI {
  let i = 0;
  return {
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async () => {
          const content = contents[i] ?? contents[contents.length - 1];
          i += 1;
          return {
            choices: [{ message: { content } }],
          };
        }),
      },
    },
  } as unknown as OpenAI;
}

async function flushEnrichmentDelay(): Promise<void> {
  await jest.advanceTimersByTimeAsync(5000);
}

describe('processDiscoveryArticle', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('inserts a new North American glamping resort into all_glamping_properties with discovery_source', async () => {
    const { supabase, insertCalls } = createRecordingSupabase();
    const openai = createSequentialOpenAI([
      JSON.stringify({
        properties: [
          {
            property_name: 'Willow Creek Glamping Resort 2026',
            city: 'Boulder',
            state: 'CO',
            country: 'USA',
            unit_type: 'yurts',
            property_type: 'Glamping Resort',
            description: 'New glamping resort opening in 2026.',
          },
        ],
      }),
      JSON.stringify({
        number_of_units: 8,
        city: 'Boulder',
        state: 'CO',
        country: 'USA',
      }),
    ]);

    const dbPropertyNames = new Set<string>();
    const resultPromise = processDiscoveryArticle({
      content: 'Article about Willow Creek Glamping Resort 2026 opening near Boulder with luxury yurts.',
      articleUrl: 'https://example.com/news/willow-creek',
      discoverySource: 'Tavily Search',
      dryRun: false,
      openai,
      supabase,
      dbPropertyNames,
    });

    await flushEnrichmentDelay();
    const result = await resultPromise;

    expect(result.propertiesExtracted).toBe(1);
    expect(result.propertiesNew).toBe(1);
    expect(result.propertiesInserted).toBe(1);
    expect(result.queuedInsertRows).toHaveLength(1);

    const mainInserts = insertCalls.filter((c) => c.table === ALL_GLAMPING);
    expect(mainInserts).toHaveLength(1);
    const row = mainInserts[0].rows[0] as Record<string, unknown>;
    expect(row.property_name).toBe('Willow Creek Glamping Resort 2026');
    expect(row.discovery_source).toBe('Tavily Search');
    expect(row.source).toBe('Sage');
    expect(row.research_status).toBe('new');
    expect(row.is_glamping_property).toBe('Yes');
    expect(dbPropertyNames.has('willow creek glamping resort 2026')).toBe(true);
  });

  it('does not insert into all_glamping_properties on dry run but still returns queued rows', async () => {
    const { supabase, insertCalls } = createRecordingSupabase();
    const openai = createSequentialOpenAI([
      JSON.stringify({
        properties: [
          {
            property_name: 'Dry Run Dome Park',
            state: 'UT',
            unit_type: 'domes',
            property_type: 'Glamping Resort',
          },
        ],
      }),
      JSON.stringify({ number_of_units: 6, state: 'UT', country: 'USA' }),
    ]);

    const resultPromise = processDiscoveryArticle({
      content: 'Dry run article text.',
      discoverySource: 'Manual Article',
      dryRun: true,
      openai,
      supabase,
      dbPropertyNames: new Set(),
    });

    await flushEnrichmentDelay();
    const result = await resultPromise;

    expect(result.propertiesInserted).toBe(0);
    expect(result.queuedInsertRows.length).toBeGreaterThan(0);
    expect(insertCalls.filter((c) => c.table === ALL_GLAMPING)).toHaveLength(0);
  });

  it('routes to glamping_discovery_candidates when enrichment does not yield unit count ≥ 4', async () => {
    const { supabase, insertCalls } = createRecordingSupabase();
    const openai = createSequentialOpenAI([
      JSON.stringify({
        properties: [
          {
            property_name: 'No Unit Count Resort',
            state: 'TX',
            unit_type: 'cabins',
            property_type: 'Glamping Resort',
          },
        ],
      }),
      JSON.stringify({ description: 'Still researching.', state: 'TX' }),
    ]);

    const resultPromise = processDiscoveryArticle({
      content: 'Article about No Unit Count Resort.',
      articleUrl: 'https://example.com/a',
      discoverySource: 'Tavily Search',
      dryRun: false,
      openai,
      supabase,
      dbPropertyNames: new Set(),
    });

    await flushEnrichmentDelay();
    const result = await resultPromise;

    expect(result.propertiesInserted).toBe(0);
    expect(insertCalls.filter((c) => c.table === ALL_GLAMPING)).toHaveLength(0);

    const candidateInserts = insertCalls.filter((c) => c.table === CANDIDATES);
    expect(candidateInserts.length).toBeGreaterThanOrEqual(1);
    const cand = candidateInserts[0].rows[0] as Record<string, unknown>;
    expect(cand.rejection_reason).toBe('post_enrich_unknown_units');
    expect(cand.discovery_source).toBe('Tavily Search');
    expect(cand.status).toBe('pending');
  });

  it('skips insert when property is already in dbPropertyNames (dedupe)', async () => {
    const { supabase, insertCalls } = createRecordingSupabase();
    const openai = createSequentialOpenAI([
      JSON.stringify({
        properties: [
          {
            property_name: 'Existing Place',
            state: 'CA',
            number_of_units: 10,
            unit_type: 'tents',
          },
        ],
      }),
    ]);

    const dbPropertyNames = new Set<string>(['existing place']);

    const resultPromise = processDiscoveryArticle({
      content: 'Article.',
      discoverySource: 'Google News RSS',
      dryRun: false,
      openai,
      supabase,
      dbPropertyNames,
    });

    const result = await resultPromise;

    expect(result.propertiesExtracted).toBe(1);
    expect(result.propertiesNew).toBe(0);
    expect(result.propertiesInserted).toBe(0);
    expect(insertCalls.filter((c) => c.table === ALL_GLAMPING)).toHaveLength(0);
    expect(openai.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});
