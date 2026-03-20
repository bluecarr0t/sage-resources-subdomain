/**
 * Derive Development Costs data from Report Builder unit_mix for feasibility reports.
 * Maps unit_mix to Site Builder configs, runs cost calculation, returns structured data
 * for DOCX section and Cost Analysis XLSX.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EnrichedInput } from './types';
import type { DevelopmentCostsData } from './types';
import { unitMixToCostConfigs } from './unit-mix-to-cost-config';
import {
  calculateSiteBuilderCosts,
  type ConfigCostResult,
  type SiteBuilderConfig,
} from '@/lib/site-builder/cost-calculator';

export interface DeriveDevelopmentCostsResult {
  data: DevelopmentCostsData;
  configs: SiteBuilderConfig[];
  costResult: { configs: ConfigCostResult[]; totalSiteBuild: number };
}

/**
 * Build DevelopmentCostsData from enriched report input.
 * When unit_mix is empty, returns placeholder data with zeros and "Unit mix to be confirmed".
 * Also returns configs and costResult for Cost Analysis XLSX export.
 */
export async function deriveDevelopmentCosts(
  supabase: SupabaseClient,
  input: EnrichedInput
): Promise<DeriveDevelopmentCostsResult> {
  const configs = unitMixToCostConfigs(input.unit_mix);

  if (configs.length === 0) {
    return {
      data: buildPlaceholderDevelopmentCosts(),
      configs: [],
      costResult: { configs: [], totalSiteBuild: 0 },
    };
  }

  const costResult = await calculateSiteBuilderCosts(supabase, configs);
  const glampingConfigs = costResult.configs.filter((c) => c.type === 'glamping');
  const rvConfigs = costResult.configs.filter((c) => c.type === 'rv');

  const totalRVSites = rvConfigs.reduce((s, c) => s + c.quantity, 0);
  const totalGlampingUnits = glampingConfigs.reduce((s, c) => s + c.quantity, 0);
  const rvTotal = rvConfigs.reduce((s, c) => s + c.subtotal, 0);
  const glampingTotal = glampingConfigs.reduce((s, c) => s + c.subtotal, 0);

  const lineItems = costResult.configs.map((c) => ({
    name: c.name,
    quantity: c.quantity,
    costPerUnit: c.costPerUnit,
    subtotal: c.subtotal,
  }));

  const unitCostItems = glampingConfigs.map((c) => ({
    name: c.name,
    qty: c.quantity,
    costPerUnit: c.costPerUnit,
    subtotal: c.subtotal,
  }));

  // Report Builder: no amenity breakdown from unit_mix; addBldg = 0 for now
  const addBldgTotal = 0;
  const hardCosts = costResult.totalSiteBuild + addBldgTotal;
  const softCosts = Math.round(hardCosts * 0.15); // 15% soft costs placeholder
  const land = 0;

  return {
    data: {
      siteDevCosts: {
        totalRVSites,
        totalGlampingUnits,
        rvTotal,
        glampingTotal,
        lineItems,
      },
      unitCosts: {
        items: unitCostItems,
        total: glampingTotal,
      },
      addBldgImprovements: {
        items: [],
        total: addBldgTotal,
      },
      totalProjectCost: {
        siteDev: rvTotal,
        unitCosts: glampingTotal,
        addBldg: addBldgTotal,
        hardCosts,
        softCosts,
        land,
        total: hardCosts + softCosts + land,
      },
    },
    configs,
    costResult,
  };
}

function buildPlaceholderDevelopmentCosts(): DevelopmentCostsData {
  return {
    siteDevCosts: {
      totalRVSites: 0,
      totalGlampingUnits: 0,
      rvTotal: 0,
      glampingTotal: 0,
      lineItems: [{ name: 'Unit mix to be confirmed', quantity: 0, costPerUnit: 0, subtotal: 0 }],
    },
    unitCosts: {
      items: [{ name: 'Unit mix to be confirmed', qty: 0, costPerUnit: 0, subtotal: 0 }],
      total: 0,
    },
    addBldgImprovements: {
      items: [],
      total: 0,
    },
    totalProjectCost: {
      siteDev: 0,
      unitCosts: 0,
      addBldg: 0,
      hardCosts: 0,
      softCosts: 0,
      land: 0,
      total: 0,
    },
  };
}
