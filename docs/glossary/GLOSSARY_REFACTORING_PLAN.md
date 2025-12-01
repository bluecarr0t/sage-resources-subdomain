# Glossary Refactoring Plan

## Current State
- Single large file: `lib/glossary.ts` (~2,679 lines)
- Contains: interface, all terms, helper functions
- Hard to navigate and maintain

## Proposed Structure

```
lib/
  glossary/
    types.ts                    # Interface definitions
    terms/
      feasibility-appraisal.ts  # Feasibility & Appraisal terms
      glamping.ts               # Glamping terms (largest category)
      financial.ts              # Financial terms
      rv-campground.ts          # RV & Campground terms
      general.ts                # General terms
      real-estate.ts            # Real Estate terms (if any)
    utils.ts                    # Helper functions
    index.ts                    # Main export file (maintains backward compatibility)
```

## Benefits

1. **Maintainability**: Each category in its own file (~200-500 lines each)
2. **Collaboration**: Multiple developers can work on different categories
3. **Performance**: Better tree-shaking potential
4. **Organization**: Easier to find and update specific terms
5. **Backward Compatibility**: Main index.ts re-exports everything

## Migration Strategy

1. Create new directory structure
2. Split terms by category into separate files
3. Move helper functions to utils.ts
4. Create index.ts that combines everything
5. Update imports (or maintain backward compatibility)
6. Test all functionality
7. Remove old glossary.ts

## Category Distribution

Based on current terms:
- **Feasibility & Appraisal**: ~8 terms
- **Glamping**: ~16 terms (includes all unit types)
- **Financial**: ~15 terms
- **RV & Campground**: ~8 terms
- **General**: ~2 terms
- **Real Estate**: ~0 terms (category exists but no terms yet)

## Implementation Notes

- All files import from `types.ts` for the GlossaryTerm interface
- `index.ts` re-exports everything to maintain existing imports
- Helper functions remain in utils.ts or index.ts
- Each category file exports a `Record<string, GlossaryTerm>`

