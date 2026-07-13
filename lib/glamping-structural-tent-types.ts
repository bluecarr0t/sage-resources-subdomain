/**
 * Internal Sage taxonomy for furnished canvas / tent structures.
 *
 * Canvas Tent is retired as a catch-all. Prefer structural types:
 * Bell Tent, Safari Tent (wall/safari frame), Cabin Tent (portable soft-wall),
 * Canvas Cabin (hardwall+canvas hybrid), or Tipi.
 */

export const STRUCTURAL_TENT_TYPES_SUMMARY =
  'Furnished canvas inventory: Bell Tent, Safari Tent (wall/safari frame), Cabin Tent (portable soft-wall cabin tent), Canvas Cabin (hardwall bath/porch + canvas hybrid), or Tipi. Do not use Canvas Tent as a catch-all. Canvas Cabin ≠ Cabin Tent.';

export const BELL_TENT_CLASSIFICATION_DESCRIPTION =
  'Circular canvas tent with a single tall center pole and typically an A-frame door. Quick to set up with strong wind resistance, though sloped walls reduce headroom at the edges.';

export const SAFARI_TENT_CLASSIFICATION_DESCRIPTION =
  'Straight-walled canvas lodge tent on a rigid internal frame with a peaked roof (also called a wall tent). Room-like floor space for furniture; often semi-permanent on a deck.';

export const CABIN_TENT_CLASSIFICATION_DESCRIPTION =
  'Portable soft-wall cabin-style tent with vertical walls on a lighter frame. Includes tent-cabin and tentalow products; distinct from Canvas Cabin hardwall hybrids.';

export const CANVAS_CABIN_CLASSIFICATION_DESCRIPTION =
  'Canvas sleeping envelope joined to hard-framed modules such as a bathroom or porch. Heated resort hybrid, distinct from portable Cabin Tent and solid Cabin.';

export const TIPI_CLASSIFICATION_DESCRIPTION =
  'Cone-shaped pole structure (also spelled teepee) with strong rain and snow shedding. Natural heat convection, with limited standing space along the steep walls.';


/**
 * LLM / enrichment rules for structural tent classification (HARD).
 */
export const STRUCTURAL_TENT_TYPES_LLM_DISTINCTION = `Structural tent / canvas types (HARD — Canvas Tent is retired as a catch-all):
- ${STRUCTURAL_TENT_TYPES_SUMMARY}
- **Bell Tent**: circular base, single tall center pole, A-frame door; quick setup; sloped walls / center pole obstruct floor. Use when source says bell tent / lotus belle / circular center-pole tent.
- **Safari Tent** (wall tent): four straight vertical walls, peaked roof, rigid internal frame; room-like floor space; semi-permanent / heavy. Use for safari tent, wall tent, safari-style lodge tent, or known safari operators (e.g. Under Canvas). Wall Tent → Safari Tent.
- **Cabin Tent**: portable soft-wall cabin-style tent (tent-cabin, tentalow). No hardwall bath/porch core.
- **Canvas Cabin**: hardwall+canvas hybrid (hard bath/porch/kitchen modules + canvas envelope; stove/HVAC). Use for “canvas cabin” / Rock Creek–style hybrids — **not** Cabin Tent.
- **Tipi**: cone / teepee pole structure (normalize teepee → Tipi).
- Ambiguous “tent”, “tents”, “glamping tent”, “luxury tent”, “deluxe tent”, “canvas tent” with **no** structural cue → omit unit_type (null). Do **not** invent Bell / Safari / Cabin Tent / Canvas Cabin / Tipi.`;

/** Phrases that must not invent a structural tent type on storage normalize. */
export const AMBIGUOUS_FURNISHED_TENT_PHRASES = new Set([
  'tent',
  'tents',
  'glamping tent',
  'glamping tents',
  'luxury tent',
  'luxury tents',
  'deluxe tent',
  'deluxe tents',
  'canvas tent',
  'canvas tents',
]);
