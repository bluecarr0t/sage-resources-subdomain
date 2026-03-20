/**
 * Site Builder cost calculation: glamping (Catalog/CCE-based) and RV (base cost + amenities).
 * Glamping: prefers Walden catalog costs by unit type + quality tier; falls back to CCE.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { expandQualityTypeForFilter, mapSiteBuilderQualityToCce } from '@/lib/cce-quality-types';
import { getLatestCceExtractionDate } from '@/lib/cce-latest-extraction';
import { getCatalogDerivedGlampingCosts } from '@/lib/site-builder/catalog-unit-costs';
import { getFeasibilityDerivedRVCosts } from '@/lib/site-builder/feasibility-costs';


export interface GlampingConfig {
  type: 'glamping';
  unitTypeSlug: string;
  quantity: number;
  sqft: number;
  qualityType: string;
  amenitySlugs: string[];
  /** When set, use catalog unit price instead of CCE-derived cost */
  catalogUnitId?: string | null;
}

export interface RVConfig {
  type: 'rv';
  siteTypeSlug: string;
  quantity: number;
  qualityType: string;
  amenitySlugs: string[];
}

export type SiteBuilderConfig = GlampingConfig | RVConfig;

export interface ConfigCostResult {
  configIndex: number;
  type: 'glamping' | 'rv';
  name: string;
  qualityTier: string | null;
  quantity: number;
  costPerUnit: number;
  subtotal: number;
  baseCost: number;
  amenityCost: number;
}

export interface CostCalculationResult {
  configs: ConfigCostResult[];
  totalSiteBuild: number;
}

export async function calculateSiteBuilderCosts(
  supabase: SupabaseClient,
  configs: SiteBuilderConfig[]
): Promise<CostCalculationResult> {
  const results: ConfigCostResult[] = [];
  let totalSiteBuild = 0;

  const glampingConfigs = configs.filter((c): c is GlampingConfig => c.type === 'glamping');
  const rvSlugs = configs.filter((c): c is RVConfig => c.type === 'rv').map((c) => c.siteTypeSlug);

  const [catalogCosts, feasibilityCosts] = await Promise.all([
    glampingConfigs.length > 0
      ? getCatalogDerivedGlampingCosts(
          supabase,
          [...new Set(glampingConfigs.map((c) => c.unitTypeSlug))],
          [...new Set(glampingConfigs.map((c) => c.qualityType))]
        )
      : Promise.resolve({ bySlugAndQuality: {}, sampleCount: {} }),
    rvSlugs.length > 0
      ? (async () => {
          const rvTypes = await supabase
            .from('site_builder_rv_site_types')
            .select('slug, name')
            .in('slug', [...new Set(rvSlugs)]);
          return rvTypes.data?.length
            ? getFeasibilityDerivedRVCosts(supabase, rvTypes.data)
            : { bySlug: {} };
        })()
      : Promise.resolve({ bySlug: {} }),
  ]);

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    if (config.type === 'glamping') {
      const result = await calculateGlampingCost(supabase, config, i, catalogCosts);
      results.push(result);
      totalSiteBuild += result.subtotal;
    } else {
      const result = await calculateRVCost(supabase, config, i, feasibilityCosts);
      results.push(result);
      totalSiteBuild += result.subtotal;
    }
  }

  return { configs: results, totalSiteBuild };
}

async function calculateGlampingCost(
  supabase: SupabaseClient,
  config: GlampingConfig,
  configIndex: number,
  catalogCosts: { bySlugAndQuality: Record<string, number> }
): Promise<ConfigCostResult> {
  // When catalog unit is selected, use its price as base cost (Walden Insights PDF data)
  if (config.catalogUnitId) {
    const { data: catalogUnit } = await supabase
      .from('cce_catalog_units')
      .select('manufacturer, product_model, price')
      .eq('id', config.catalogUnitId)
      .maybeSingle();

    const name = catalogUnit
      ? [catalogUnit.manufacturer, catalogUnit.product_model].filter(Boolean).join(' ') || config.unitTypeSlug
      : config.unitTypeSlug;
    const baseCost = catalogUnit?.price != null ? Number(catalogUnit.price) : 0;
    const amenityCost = await getAmenityCost(supabase, config.amenitySlugs, 'glamping');
    const costPerUnit = baseCost + amenityCost;
    const subtotal = costPerUnit * config.quantity;

    return {
      configIndex,
      type: 'glamping',
      name,
      qualityTier: config.qualityType,
      quantity: config.quantity,
      costPerUnit,
      subtotal,
      baseCost,
      amenityCost,
    };
  }

  // 1. Get glamping type (name, cce_occupancy_code, default_quality)
  const { data: glampingType } = await supabase
    .from('site_builder_glamping_types')
    .select('name, cce_occupancy_code, default_quality_type')
    .eq('slug', config.unitTypeSlug)
    .maybeSingle();

  const name = glampingType?.name ?? config.unitTypeSlug;

  // 2. Prefer catalog-derived cost (Walden) by unit type + quality tier
  const catalogKey = `${config.unitTypeSlug}:${config.qualityType}`;
  const catalogBaseCost = catalogCosts.bySlugAndQuality[catalogKey];
  if (catalogBaseCost != null && catalogBaseCost > 0) {
    const amenityCost = await getAmenityCost(supabase, config.amenitySlugs, 'glamping');
    const costPerUnit = catalogBaseCost + amenityCost;
    const subtotal = costPerUnit * config.quantity;
    return {
      configIndex,
      type: 'glamping',
      name,
      qualityTier: config.qualityType,
      quantity: config.quantity,
      costPerUnit,
      subtotal,
      baseCost: catalogBaseCost,
      amenityCost,
    };
  }

  // 3. Fallback: CCE (cost_sq_ft × sqft)
  let costSqFt: number | null = null;
  const cceQuality = mapSiteBuilderQualityToCce(config.qualityType);
  const qualityVariants = expandQualityTypeForFilter(cceQuality);

  const latestExtractionDate = await getLatestCceExtractionDate(supabase);

  if (glampingType?.cce_occupancy_code != null) {
    const { data: occ } = await supabase
      .from('cce_occupancies')
      .select('id')
      .eq('occupancy_code', glampingType.cce_occupancy_code)
      .maybeSingle();
    if (occ?.id) {
      let costQuery = supabase
        .from('cce_cost_rows')
        .select('cost_sq_ft')
        .eq('occupancy_id', occ.id)
        .in('quality_type', qualityVariants)
        .not('cost_sq_ft', 'is', null)
        .order('cost_sq_ft', { ascending: true })
        .limit(1);
      if (latestExtractionDate) costQuery = costQuery.eq('extraction_date', latestExtractionDate);
      const { data: costRow } = await costQuery.maybeSingle();
      if (costRow?.cost_sq_ft != null) costSqFt = Number(costRow.cost_sq_ft);
    }
  }

  if (costSqFt == null) {
    let qualityQuery = supabase
      .from('cce_cost_rows')
      .select('cost_sq_ft')
      .in('quality_type', qualityVariants)
      .not('cost_sq_ft', 'is', null)
      .order('cost_sq_ft', { ascending: true })
      .limit(1);
    if (latestExtractionDate) qualityQuery = qualityQuery.eq('extraction_date', latestExtractionDate);
    const { data: qualityRow } = await qualityQuery.maybeSingle();
    costSqFt = qualityRow?.cost_sq_ft != null ? Number(qualityRow.cost_sq_ft) : 0;
  }

  const baseCost = (costSqFt ?? 0) * config.sqft;

  // 4. Amenity add-ons (glamping or both)
  const amenityCost = await getAmenityCost(supabase, config.amenitySlugs, 'glamping');

  const costPerUnit = baseCost + amenityCost;
  const subtotal = costPerUnit * config.quantity;

  return {
    configIndex,
    type: 'glamping',
    name,
    qualityTier: config.qualityType,
    quantity: config.quantity,
    costPerUnit,
    subtotal,
    baseCost,
    amenityCost,
  };
}

/** Quality tier → multiplier for RV site base cost (Premium = 1.0 baseline) */
const RV_QUALITY_MULTIPLIER: Record<string, number> = {
  Budget: 0.85,
  Economy: 0.9,
  'Mid-Range': 0.95,
  Premium: 1.0,
  Luxury: 1.08,
  'Ultra Luxury': 1.15,
};

/** Fallback base cost per site when no feasibility data (industry-typical development costs) */
const FALLBACK_RV_COST_BY_SLUG: Record<string, number> = {
  'back-in-deluxe': 34900,
  'back-in-standard': 28000,
  'full-hookup-back-in': 32000,
  'full-hookup-pull-thru': 38000,
};

async function calculateRVCost(
  supabase: SupabaseClient,
  config: RVConfig,
  configIndex: number,
  feasibilityCosts: { bySlug: Record<string, number> }
): Promise<ConfigCostResult> {
  // 1. Get RV site type base cost (prefer feasibility-derived, else fallback by site type)
  const { data: rvType } = await supabase
    .from('site_builder_rv_site_types')
    .select('name, base_cost_per_site')
    .eq('slug', config.siteTypeSlug)
    .maybeSingle();

  const name = rvType?.name ?? config.siteTypeSlug;
  const feasibilityCost = feasibilityCosts.bySlug[config.siteTypeSlug];
  const rawBaseCost = feasibilityCost ?? FALLBACK_RV_COST_BY_SLUG[config.siteTypeSlug] ?? 0;
  const qualityMultiplier = RV_QUALITY_MULTIPLIER[config.qualityType] ?? 1.0;
  const baseCost = Math.round(rawBaseCost * qualityMultiplier);

  // 2. Amenity add-ons (rv or both)
  const amenityCost = await getAmenityCost(supabase, config.amenitySlugs, 'rv');

  const costPerUnit = baseCost + amenityCost;
  const subtotal = costPerUnit * config.quantity;

  return {
    configIndex,
    type: 'rv',
    name,
    qualityTier: config.qualityType,
    quantity: config.quantity,
    costPerUnit,
    subtotal,
    baseCost,
    amenityCost,
  };
}

async function getAmenityCost(
  supabase: SupabaseClient,
  slugs: string[],
  configType: 'glamping' | 'rv'
): Promise<number> {
  if (slugs.length === 0) return 0;

  const appliesFilter = configType === 'glamping' ? ['glamping', 'both'] : ['rv', 'both'];
  const { data: amenities } = await supabase
    .from('site_builder_amenity_costs')
    .select('slug, cost_per_unit, applies_to')
    .in('slug', slugs)
    .in('applies_to', appliesFilter);

  if (!amenities?.length) return 0;
  return amenities.reduce((sum, a) => sum + Number(a.cost_per_unit), 0);
}
