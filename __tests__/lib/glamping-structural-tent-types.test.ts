import {
  BELL_TENT_CLASSIFICATION_DESCRIPTION,
  CABIN_TENT_CLASSIFICATION_DESCRIPTION,
  CANVAS_CABIN_CLASSIFICATION_DESCRIPTION,
  SAFARI_TENT_CLASSIFICATION_DESCRIPTION,
  STRUCTURAL_TENT_TYPES_LLM_DISTINCTION,
  STRUCTURAL_TENT_TYPES_SUMMARY,
  TIPI_CLASSIFICATION_DESCRIPTION,
} from '@/lib/glamping-structural-tent-types';
import { findGlampingUnitSubtype } from '@/lib/glamping-unit-type-classification';
import { GLAMPING_UNIT_TYPE_LLM_RULES } from '@/lib/glamping-unit-type-llm-guidance';

describe('glamping-structural-tent-types', () => {
  it('summarizes structural types including Canvas Cabin and retires Canvas Tent catch-all', () => {
    expect(STRUCTURAL_TENT_TYPES_SUMMARY).toMatch(/Bell Tent/);
    expect(STRUCTURAL_TENT_TYPES_SUMMARY).toMatch(/Safari Tent/);
    expect(STRUCTURAL_TENT_TYPES_SUMMARY).toMatch(/Cabin Tent/);
    expect(STRUCTURAL_TENT_TYPES_SUMMARY).toMatch(/Canvas Cabin/);
    expect(STRUCTURAL_TENT_TYPES_SUMMARY).toMatch(/Tipi/);
    expect(STRUCTURAL_TENT_TYPES_SUMMARY).toMatch(/Canvas Cabin ≠ Cabin Tent|Do not use Canvas Tent/i);
  });

  it('defines Safari, Cabin Tent (portable), and Canvas Cabin (hardwall hybrid)', () => {
    expect(SAFARI_TENT_CLASSIFICATION_DESCRIPTION).toMatch(/rigid/i);
    expect(CABIN_TENT_CLASSIFICATION_DESCRIPTION).toMatch(/portable|lighter/i);
    expect(CABIN_TENT_CLASSIFICATION_DESCRIPTION).toMatch(/Distinct from Canvas Cabin/i);
    expect(CANVAS_CABIN_CLASSIFICATION_DESCRIPTION).toMatch(/hard.?framed|hardwall/i);
    expect(BELL_TENT_CLASSIFICATION_DESCRIPTION).toMatch(/central pole|center pole/i);
    expect(TIPI_CLASSIFICATION_DESCRIPTION).toMatch(/cone|teepee/i);
  });

  it('wires taxonomy descriptions from the shared definition', () => {
    expect(findGlampingUnitSubtype('Safari Tent')?.subtype.description).toBe(
      SAFARI_TENT_CLASSIFICATION_DESCRIPTION
    );
    expect(findGlampingUnitSubtype('Cabin Tent')?.subtype.description).toBe(
      CABIN_TENT_CLASSIFICATION_DESCRIPTION
    );
    expect(findGlampingUnitSubtype('Canvas Cabin')?.subtype.description).toBe(
      CANVAS_CABIN_CLASSIFICATION_DESCRIPTION
    );
    expect(findGlampingUnitSubtype('Bell Tent')?.subtype.description).toBe(
      BELL_TENT_CLASSIFICATION_DESCRIPTION
    );
    expect(findGlampingUnitSubtype('Tipi')?.subtype.description).toBe(
      TIPI_CLASSIFICATION_DESCRIPTION
    );
    expect(findGlampingUnitSubtype('Canvas Tent')?.subtype.excludedFromMarketSnapshot).toBe(true);
    expect(findGlampingUnitSubtype('Canvas Tent')?.subtype.inReportPicklist).toBe(false);
  });

  it('embeds the distinction in LLM unit_type rules', () => {
    expect(GLAMPING_UNIT_TYPE_LLM_RULES).toContain(STRUCTURAL_TENT_TYPES_LLM_DISTINCTION);
    expect(STRUCTURAL_TENT_TYPES_LLM_DISTINCTION).toMatch(/omit unit_type|null/i);
    expect(STRUCTURAL_TENT_TYPES_LLM_DISTINCTION).toMatch(/Wall Tent → Safari Tent/);
    expect(STRUCTURAL_TENT_TYPES_LLM_DISTINCTION).toMatch(/Canvas Cabin/);
  });

  it('maps wall tent and canvas cabin aliases to the correct canonicals', () => {
    expect(findGlampingUnitSubtype('wall tent')?.subtype.canonical).toBe('Safari Tent');
    expect(findGlampingUnitSubtype('canvas cabin')?.subtype.canonical).toBe('Canvas Cabin');
    expect(findGlampingUnitSubtype('tentalow')?.subtype.canonical).toBe('Cabin Tent');
  });
});
