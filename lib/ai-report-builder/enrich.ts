/**
 * Enrich report draft input with DB benchmarks and geocoding
 * Runs benchmarks, comparables, and geocode in parallel for performance
 */

import { createServerClient } from '@/lib/supabase';
import { geocodeAddress } from '@/lib/geocode';
import { normaliseUnitCategory } from '@/lib/csv/feasibility-parser';
import type { ReportDraftInput, EnrichedInput, BenchmarkRow } from './types';

export async function enrichReportInput(input: ReportDraftInput): Promise<EnrichedInput> {
  const enriched: EnrichedInput = { ...input };
  const supabase = createServerClient();

  const unitCategories = [
    ...new Set(input.unit_mix.map((u) => normaliseUnitCategory(u.type))),
  ].filter(Boolean);

  const state = input.state?.trim();

  // Run benchmarks, comparables, and geocode in parallel
  const [benchResult, compsResult, coords] = await Promise.all([
    // Benchmarks: aggregate feasibility_comp_units by unit_category
    unitCategories.length > 0
      ? supabase
          .from('feasibility_comp_units')
          .select('unit_category, low_adr, peak_adr')
          .in('unit_category', unitCategories)
          .not('low_adr', 'is', null)
          .not('peak_adr', 'is', null)
          .limit(5000)
      : Promise.resolve({ data: [] }),
    // Comparables from same state
    state
      ? supabase
          .from('feasibility_comparables')
          .select('comp_name')
          .eq('state', state)
          .not('comp_name', 'is', null)
          .limit(5)
      : Promise.resolve({ data: [] }),
    // Geocode (includes address_1 for better accuracy)
    geocodeAddress(
      input.address_1 || '',
      input.city,
      input.state,
      input.zip_code || '',
      'USA'
    ),
  ]);

  const benchData = benchResult.data;
  if (benchData && benchData.length > 0) {
    const byCategory = new Map<string, { low: number[]; peak: number[] }>();
    for (const row of benchData) {
      const cat = row.unit_category || 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, { low: [], peak: [] });
      const arr = byCategory.get(cat)!;
      if (typeof row.low_adr === 'number') arr.low.push(row.low_adr);
      if (typeof row.peak_adr === 'number') arr.peak.push(row.peak_adr);
    }
    enriched.benchmarks = Array.from(byCategory.entries()).map(
      ([unit_category, { low, peak }]) => ({
        unit_category,
        avg_low_adr: low.length ? low.reduce((a, b) => a + b, 0) / low.length : 0,
        avg_peak_adr: peak.length ? peak.reduce((a, b) => a + b, 0) / peak.length : 0,
        sample_count: Math.max(low.length, peak.length),
      })
    ) as BenchmarkRow[];
  }

  const comps = compsResult.data;
  if (comps && comps.length > 0) {
    enriched.comparables_summary = comps
      .map((c) => c.comp_name)
      .filter(Boolean)
      .join(', ');
  }

  if (coords) {
    enriched.latitude = coords.lat;
    enriched.longitude = coords.lng;
  }

  return enriched;
}
