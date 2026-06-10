import {
  ADMIN_COMPS_COHORT_PROPERTY_TYPE,
  withAdminCompsCohortFilters,
} from '@/lib/comps-unified/admin-comps-cohort';
import type { UnifiedFilterOptions } from '@/lib/comps-unified/apply-filters';

const baseOpts: UnifiedFilterOptions = {
  sources: ['all_sage_data'],
  expandedStateValues: [],
  expandedCountryValues: ['USA'],
  unitCategories: [],
  propertyTypes: [],
  isGlampingProperty: [],
  sageResearchStatus: null,
  openStatuses: [],
  keywordFilters: [],
  parsedMinAdr: null,
  parsedMaxAdr: null,
  searchTerms: [],
};

describe('admin-comps-cohort', () => {
  it('forces published Glamping + is_glamping Yes on filter options', () => {
    const out = withAdminCompsCohortFilters(baseOpts);
    expect(out.propertyTypes).toEqual([ADMIN_COMPS_COHORT_PROPERTY_TYPE]);
    expect(out.isGlampingProperty).toEqual(['Yes']);
    expect(out.sageResearchStatus).toBe('published');
    expect(out.exemptReportsFromPropertyTypeFilter).toBe(true);
  });
});
