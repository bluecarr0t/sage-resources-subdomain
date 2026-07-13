/**
 * @deprecated Use `lib/glamping-structural-tent-types.ts` — Canvas Tent catch-all retired.
 * Re-exports kept for older imports during migration.
 */

export {
  BELL_TENT_CLASSIFICATION_DESCRIPTION,
  CABIN_TENT_CLASSIFICATION_DESCRIPTION,
  SAFARI_TENT_CLASSIFICATION_DESCRIPTION,
  STRUCTURAL_TENT_TYPES_LLM_DISTINCTION as CANVAS_VS_SAFARI_TENT_LLM_DISTINCTION,
  STRUCTURAL_TENT_TYPES_SUMMARY as CANVAS_TENTED_FAMILY_SUMMARY,
  STRUCTURAL_TENT_TYPES_SUMMARY as SAFARI_VS_CANVAS_TENT_SUMMARY,
  TIPI_CLASSIFICATION_DESCRIPTION,
} from '@/lib/glamping-structural-tent-types';

/** @deprecated Canvas Tent is retired — prefer structural types. */
export const CANVAS_TENT_CLASSIFICATION_DESCRIPTION =
  'Deprecated catch-all — retired. Prefer Bell Tent, Safari Tent, Cabin Tent, or Tipi.';
