/**
 * Shared unit_type instructions for LLM extraction / enrichment.
 * Forces structural tent types; never default ambiguous tents to Safari Tent or Canvas Tent.
 */

import { STRUCTURAL_TENT_TYPES_LLM_DISTINCTION } from '@/lib/glamping-structural-tent-types';

/** Canonical examples — structural tent types; no Canvas Tent catch-all. */
export const GLAMPING_UNIT_TYPE_LLM_EXAMPLES =
  '"Yurt", "Bell Tent", "Dome", "Cabin", "A-Frame", "Jupe", "Safari Tent", "Cabin Tent", "Canvas Cabin", "Tipi"';

/**
 * Rules block for prompts that ask for a single canonical unit_type.
 * Prefer interpolating this after the unit_type field description.
 */
export const GLAMPING_UNIT_TYPE_LLM_RULES = `unit_type rules (HARD):
- Use a **single** singular Title Case label (${GLAMPING_UNIT_TYPE_LLM_EXAMPLES}).
- Do **not** return a comma-separated list; if the property has multiple products, pick the primary / best-documented offering.
${STRUCTURAL_TENT_TYPES_LLM_DISTINCTION}
- Bubble tents → Bubble Tent when named.
- BYO tent pads / campsites → Tent Site (not a furnished glamping unit).`;

/** One-line field description for compact bullet lists. */
export const GLAMPING_UNIT_TYPE_LLM_FIELD_LINE = `unit_type: **Single** singular Title Case product label (e.g. ${GLAMPING_UNIT_TYPE_LLM_EXAMPLES}) — not a comma list. Furnished canvas: Bell Tent, Safari Tent, Cabin Tent (portable), Canvas Cabin (hardwall+canvas hybrid), or Tipi; Canvas Cabin ≠ Cabin Tent; ambiguous “glamping/luxury/deluxe/canvas tent(s)” → omit unit_type (do not use Canvas Tent or invent Safari).`;
