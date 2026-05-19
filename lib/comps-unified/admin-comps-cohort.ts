/**
 * Default Sage cohort for /admin/glamping-properties: published glamping properties only.
 * Enforced server-side on list, geo, and aggregate RPCs.
 */

import type { UnifiedFilterOptions } from '@/lib/comps-unified/apply-filters';

/** Canonical `all_glamping_properties.property_type` for the public glamping map cohort. */
export const ADMIN_COMPS_COHORT_PROPERTY_TYPE = 'Glamping';

export const ADMIN_COMPS_COHORT_IS_GLAMPING = 'Yes';

export const ADMIN_COMPS_COHORT_SAGE_RESEARCH_STATUS = 'published';

/** RPC flag: apply published + Glamping + is_glamping filters. */
export const ADMIN_COMPS_COHORT_RPC_FLAG = true;

export function withAdminCompsCohortFilters(opts: UnifiedFilterOptions): UnifiedFilterOptions {
  return {
    ...opts,
    propertyTypes: [ADMIN_COMPS_COHORT_PROPERTY_TYPE],
    isGlampingProperty: [ADMIN_COMPS_COHORT_IS_GLAMPING],
    sageResearchStatus: ADMIN_COMPS_COHORT_SAGE_RESEARCH_STATUS,
  };
}

export function adminCompsCohortRpcParams(): { p_apply_admin_cohort: boolean } {
  return { p_apply_admin_cohort: ADMIN_COMPS_COHORT_RPC_FLAG };
}
