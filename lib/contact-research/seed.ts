import { tavily } from '@tavily/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import {
  type ContactCategory,
  type ContactSeedCandidate,
  type SeedMode,
} from '@/lib/contact-research/types';
import { domainFromUrl, normalizeCompanyKey } from '@/lib/contact-research/validate';
import { isOutdoorPipelineRow } from '@/lib/contact-research/seed-filters';

const TAVILY_DELAY_MS = 600;

const WEB_QUERIES: Array<{ query: string; category: ContactCategory }> = [
  {
    query: 'glamping outdoor hospitality private equity investor contact email',
    category: 'outdoor_hospitality_investor',
  },
  {
    query: 'glamping resort developer United States contact email',
    category: 'outdoor_hospitality_developer',
  },
  {
    query: 'safari tent geodesic dome glamping unit manufacturer contact email',
    category: 'unit_manufacturer',
  },
  {
    query: 'glamping cabin manufacturer USA "contact us" email',
    category: 'unit_manufacturer',
  },
  {
    query: 'Conestoga tent OR yurt manufacturer glamping contact email',
    category: 'unit_manufacturer',
  },
  {
    query: 'outdoor hospitality lender campground glamping financing contact',
    category: 'outdoor_hospitality_lender',
  },
  {
    query: 'family office outdoor hospitality RV resort investment contact',
    category: 'outdoor_hospitality_investor',
  },
  {
    query: 'RV park developer United States "feasibility" contact email',
    category: 'outdoor_hospitality_developer',
  },
];

type SageRow = {
  property_name: string | null;
  url: string | null;
  is_open: string | null;
  research_status: string | null;
  is_glamping_property: string | null;
  country: string | null;
};

type PipelineRow = {
  client: string | null;
  client_email: string | null;
  commercial_outdoor: string | null;
  property_type: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function categoryForInventory(isOpen: string | null): ContactCategory {
  const open = (isOpen ?? '').toLowerCase();
  if (open.includes('proposed') || open.includes('under construction')) {
    return 'outdoor_hospitality_developer';
  }
  return 'glamping_property_owner';
}

function pushUnique(
  out: ContactSeedCandidate[],
  seen: Set<string>,
  candidate: ContactSeedCandidate
): void {
  const domain = domainFromUrl(candidate.official_url);
  const key = `${normalizeCompanyKey(candidate.company_name)}|${domain ?? ''}`;
  if (!candidate.company_name.trim() || seen.has(key)) return;
  seen.add(key);
  out.push({ ...candidate, seed_key: key });
}

/**
 * Domains / business names already covered by Web Research contacts — skip re-scrape.
 */
export async function loadResearchedSkipSets(
  supabase: SupabaseClient
): Promise<{ domains: Set<string>; businessNames: Set<string> }> {
  const domains = new Set<string>();
  const businessNames = new Set<string>();
  let offset = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from('contacts')
      .select('business_name,evidence_url,email')
      .eq('source', 'Web Research')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.warn(`Could not load researched contacts for skip: ${error.message}`);
      return { domains, businessNames };
    }
    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows as Array<{
      business_name: string | null;
      evidence_url: string | null;
      email: string | null;
    }>) {
      const evidenceDomain = domainFromUrl(row.evidence_url);
      if (evidenceDomain) domains.add(evidenceDomain);
      if (row.email?.includes('@')) {
        const emailDomain = row.email.split('@')[1]?.toLowerCase().replace(/^www\./, '');
        if (emailDomain) domains.add(emailDomain);
      }
      const name = normalizeCompanyKey(row.business_name ?? '');
      if (name) businessNames.add(name);
    }

    offset += pageSize;
    if (rows.length < pageSize) break;
  }

  return { domains, businessNames };
}

async function seedFromInventory(
  supabase: SupabaseClient,
  limit: number,
  options?: {
    startOffset?: number;
    skipDomains?: Set<string>;
    skipBusinessNames?: Set<string>;
  }
): Promise<ContactSeedCandidate[]> {
  const out: ContactSeedCandidate[] = [];
  const seen = new Set<string>();
  let offset = options?.startOffset ?? 0;
  const pageSize = 500;
  const skipDomains = options?.skipDomains ?? new Set<string>();
  const skipBusinessNames = options?.skipBusinessNames ?? new Set<string>();

  while (out.length < limit) {
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select('property_name,url,is_open,research_status,is_glamping_property,country')
      .eq('is_glamping_property', 'Yes')
      .in('research_status', ['published', 'in_progress'])
      .ilike('country', '%United States%')
      .not('property_name', 'is', null)
      .not('url', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Inventory seed failed: ${error.message}`);
    const rows = (data ?? []) as SageRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      const name = (row.property_name ?? '').trim();
      const url = row.url?.trim() || null;
      if (!name || !url) continue;
      const domain = domainFromUrl(url);
      if (domain && skipDomains.has(domain)) continue;
      if (skipBusinessNames.has(normalizeCompanyKey(name))) continue;

      pushUnique(out, seen, {
        company_name: name,
        official_url: url,
        suggested_category: categoryForInventory(row.is_open),
        seed_source: 'inventory',
        seed_key: '',
        notes: `is_open=${row.is_open ?? ''}; research_status=${row.research_status ?? ''}`,
      });
      if (out.length >= limit) break;
    }

    offset += pageSize;
    if (rows.length < pageSize) break;
  }

  return out.slice(0, limit);
}

async function seedFromPipeline(
  supabase: SupabaseClient,
  limit: number,
  options?: { skipBusinessNames?: Set<string> }
): Promise<ContactSeedCandidate[]> {
  const out: ContactSeedCandidate[] = [];
  const seen = new Set<string>();
  const skipBusinessNames = options?.skipBusinessNames ?? new Set<string>();

  const { data, error } = await supabase
    .from('project_pipeline_jobs')
    .select('client,client_email,commercial_outdoor,property_type')
    .neq('client', '')
    .limit(3000);

  if (error) {
    console.warn(`Pipeline seed skipped: ${error.message}`);
    return out;
  }

  for (const row of (data ?? []) as PipelineRow[]) {
    const client = (row.client ?? '').trim();
    const email = (row.client_email ?? '').trim();
    if (!client) continue;
    // Already have an email on the job — do not re-research.
    if (email) continue;
    if (!isOutdoorPipelineRow(row)) continue;
    if (skipBusinessNames.has(normalizeCompanyKey(client))) continue;

    const propertyType = (row.property_type ?? '').toLowerCase();
    const suggested: ContactCategory = /lender|bank|credit union|financing/i.test(client)
      ? 'outdoor_hospitality_lender'
      : propertyType.includes('glamping') || propertyType.includes('rv')
        ? 'outdoor_hospitality_developer'
        : 'glamping_property_owner';

    pushUnique(out, seen, {
      company_name: client,
      official_url: null,
      suggested_category: suggested,
      seed_source: 'pipeline',
      seed_key: '',
      notes: `pipeline outdoor; property_type=${row.property_type ?? ''}; commercial_outdoor=${row.commercial_outdoor ?? ''}`,
    });
    if (out.length >= limit) break;
  }

  return out;
}

async function seedFromWeb(
  tavilyApiKey: string,
  limit: number,
  options?: { skipDomains?: Set<string> }
): Promise<ContactSeedCandidate[]> {
  const client = tavily({ apiKey: tavilyApiKey });
  const out: ContactSeedCandidate[] = [];
  const seen = new Set<string>();
  const skipDomains = options?.skipDomains ?? new Set<string>();

  for (const { query, category } of WEB_QUERIES) {
    if (out.length >= limit) break;
    try {
      const response = await client.search(query, {
        searchDepth: 'advanced',
        maxResults: 8,
        includeAnswer: false,
      });

      for (const r of response.results || []) {
        const url = r.url?.trim();
        if (!url || !url.startsWith('http')) continue;
        const domain = domainFromUrl(url);
        if (domain && skipDomains.has(domain)) continue;
        const title = (r.title ?? '').trim() || domain || url;
        pushUnique(out, seen, {
          company_name: title.slice(0, 200),
          official_url: url,
          suggested_category: category,
          seed_source: 'web',
          seed_key: '',
          notes: `tavily_query=${query}`,
        });
        if (out.length >= limit) break;
      }
    } catch (err) {
      console.warn(
        `Tavily web seed failed for "${query}":`,
        err instanceof Error ? err.message : err
      );
    }
    await sleep(TAVILY_DELAY_MS);
  }

  return out.slice(0, limit);
}

/**
 * Build a deduped seed queue from inventory, pipeline jobs, and/or open-web Tavily.
 */
export async function buildContactSeedQueue(options: {
  supabase: SupabaseClient;
  tavilyApiKey: string | null;
  mode: SeedMode;
  limit: number;
  inventoryOffset?: number;
}): Promise<ContactSeedCandidate[]> {
  const { supabase, tavilyApiKey, mode, limit, inventoryOffset = 0 } = options;
  const seen = new Set<string>();
  const merged: ContactSeedCandidate[] = [];
  const { domains: skipDomains, businessNames: skipBusinessNames } =
    await loadResearchedSkipSets(supabase);

  const take = (items: ContactSeedCandidate[]) => {
    for (const item of items) {
      if (merged.length >= limit) return;
      if (seen.has(item.seed_key)) continue;
      seen.add(item.seed_key);
      merged.push(item);
    }
  };

  if (mode === 'inventory' || mode === 'all') {
    const perSource = mode === 'all' ? Math.ceil(limit * 0.55) : limit;
    take(
      await seedFromInventory(supabase, perSource, {
        startOffset: inventoryOffset,
        skipDomains,
        skipBusinessNames,
      })
    );
    take(
      await seedFromPipeline(supabase, Math.ceil(limit * 0.2), {
        skipBusinessNames,
      })
    );
  }

  if (mode === 'web' || mode === 'all') {
    if (!tavilyApiKey) {
      console.warn('Tavily API key missing; skipping web seed');
    } else {
      const remaining = Math.max(1, limit - merged.length);
      const webLimit = mode === 'web' ? limit : remaining;
      take(await seedFromWeb(tavilyApiKey, webLimit, { skipDomains }));
    }
  }

  return merged.slice(0, limit);
}

export async function searchContactPagesForCompany(
  tavilyApiKey: string,
  companyName: string,
  category: ContactCategory
): Promise<string[]> {
  const client = tavily({ apiKey: tavilyApiKey });
  const queries = [
    `"${companyName}" contact email`,
    `"${companyName}" ${category.replace(/_/g, ' ')} email`,
  ];
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const response = await client.search(query, {
        searchDepth: 'basic',
        maxResults: 5,
        includeAnswer: false,
      });
      for (const r of response.results || []) {
        const url = r.url?.trim();
        if (!url || !url.startsWith('http') || seen.has(url)) continue;
        seen.add(url);
        urls.push(url);
      }
    } catch (err) {
      console.warn(
        `Tavily contact search failed for "${query}":`,
        err instanceof Error ? err.message : err
      );
    }
    await sleep(TAVILY_DELAY_MS);
  }

  return urls;
}
