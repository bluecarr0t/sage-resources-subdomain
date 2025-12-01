# Glossary Refactoring Recommendations

## Current Problem

The `lib/glossary.ts` file is **2,679 lines** and contains:
- Type definitions (interface)
- All glossary terms (~59 terms)
- Helper functions

This makes it:
- ❌ Hard to navigate
- ❌ Difficult for multiple developers to work on
- ❌ Slow to load in editors
- ❌ Hard to find specific terms
- ❌ Risk of merge conflicts

## Recommended Solution

### File Structure

```
lib/
  glossary/
    ├── types.ts                    # Interface & type definitions (~20 lines)
    ├── utils.ts                   # Helper functions (~40 lines)
    ├── index.ts                   # Main export (combines everything)
    └── terms/
        ├── feasibility-appraisal.ts  # ~8 terms (~400 lines)
        ├── glamping.ts              # ~16 terms (~800 lines)
        ├── financial.ts             # ~15 terms (~750 lines)
        ├── rv-campground.ts        # ~8 terms (~400 lines)
        ├── general.ts              # ~2 terms (~100 lines)
        └── real-estate.ts          # ~0 terms (placeholder)
```

### Benefits

1. **Maintainability**: Each file is 100-800 lines (vs 2,679)
2. **Organization**: Terms grouped by logical category
3. **Collaboration**: Multiple developers can work on different categories
4. **Performance**: Better IDE performance, faster file loading
5. **Scalability**: Easy to add new categories or terms
6. **Backward Compatibility**: Existing imports continue to work

### Implementation Steps

#### Step 1: Create Directory Structure
```bash
mkdir -p lib/glossary/terms
```

#### Step 2: Extract Types
- Move `GlossaryTerm` interface to `lib/glossary/types.ts`
- Already created ✅

#### Step 3: Extract Helper Functions
- Move helper functions to `lib/glossary/utils.ts`
- Already created ✅

#### Step 4: Split Terms by Category

For each category, create a file like:

```typescript
// lib/glossary/terms/feasibility-appraisal.ts
import type { GlossaryTerm } from "../types";

export const feasibilityAppraisalTerms: Record<string, GlossaryTerm> = {
  "feasibility-study": { /* ... */ },
  "appraisal": { /* ... */ },
  // ... all Feasibility & Appraisal terms
};
```

**Categories to create:**
1. `feasibility-appraisal.ts` - Terms: feasibility-study, appraisal, market-analysis, competitive-analysis, revenue-projections, income-approach, comparable-sales, cost-approach, dcf
2. `glamping.ts` - Terms: glamping, glamping-resort, a-frame, airstream, bell-tent, cabin, canvas-tent, covered-wagon, dome, safari-tent, tiny-home, tipi, treehouse, vintage-trailer, yurt, mirror-cabin
3. `financial.ts` - Terms: adr, ardr, occupancy-rate, revpar, noi, cap-rate, roi, irr, cash-on-cash-return, debt-service-coverage-ratio, pro-forma, ebitda, loan-to-value-ratio, break-even-analysis, payback-period, gross-revenue, operating-margin, cash-flow
4. `rv-campground.ts` - Terms: rv-resort, rv-park, campground, full-hookup, pull-through-site, back-in-site, rv-pad, shore-power, dump-station, 30-amp-service, 50-amp-service
5. `general.ts` - Terms: seasonality, outdoor-hospitality, operating-expenses
6. `real-estate.ts` - Empty for now (category exists but no terms yet)

#### Step 5: Create Main Index

```typescript
// lib/glossary/index.ts
import type { GlossaryTerm } from "./types";
import { feasibilityAppraisalTerms } from "./terms/feasibility-appraisal";
import { glampingTerms } from "./terms/glamping";
import { financialTerms } from "./terms/financial";
import { rvCampgroundTerms } from "./terms/rv-campground";
import { generalTerms } from "./terms/general";
import { realEstateTerms } from "./terms/real-estate";

// Combine all terms
export const glossaryTerms: Record<string, GlossaryTerm> = {
  ...feasibilityAppraisalTerms,
  ...glampingTerms,
  ...financialTerms,
  ...rvCampgroundTerms,
  ...generalTerms,
  ...realEstateTerms,
};

// Re-export types
export type { GlossaryTerm } from "./types";

// Re-export helpers
export {
  getGlossaryTerm,
  getAllGlossaryTerms,
  getGlossaryTermsByCategory,
  getRelatedTerms,
  searchGlossaryTerms,
} from "./utils";
```

#### Step 6: Update Imports (Optional)

Existing imports like `import { ... } from "@/lib/glossary"` will continue to work if `lib/glossary.ts` is updated to re-export from `lib/glossary/index.ts`:

```typescript
// lib/glossary.ts (temporary bridge file)
export * from "./glossary/index";
```

Or update all imports to use `@/lib/glossary/index` (or just `@/lib/glossary` if using index as default).

#### Step 7: Test & Remove Old File

1. Test all glossary pages work
2. Test search functionality
3. Test category filtering
4. Test individual term pages
5. Remove `lib/glossary.ts` if using bridge approach

### Migration Script (Optional)

You could create a script to help with the migration:

```typescript
// scripts/split-glossary.ts
// Reads lib/glossary.ts and splits terms by category
// This would automate the extraction process
```

### Alternative: Gradual Migration

If you want to migrate gradually:

1. Create new structure alongside old file
2. Update imports one by one
3. Once all imports updated, remove old file

### File Size Comparison

| File | Current | After Refactor |
|------|---------|----------------|
| Main file | 2,679 lines | ~50 lines (index) |
| Largest category | - | ~800 lines (glamping) |
| Average category | - | ~400 lines |

### Next Steps

1. ✅ Review this plan
2. ⏳ Create category files (extract terms from current file)
3. ⏳ Create main index.ts
4. ⏳ Test all functionality
5. ⏳ Update imports if needed
6. ⏳ Remove old glossary.ts

### Questions to Consider

1. **Do you want to maintain backward compatibility?**
   - Yes: Keep `lib/glossary.ts` as a re-export
   - No: Update all imports to new structure

2. **Should we create a migration script?**
   - Could automate extracting terms by category

3. **Any other categories needed?**
   - Current categories seem comprehensive

4. **Timeline?**
   - Can be done incrementally or all at once

