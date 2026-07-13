import {
  GLAMPING_UNIT_TYPE_LLM_EXAMPLES,
  GLAMPING_UNIT_TYPE_LLM_FIELD_LINE,
  GLAMPING_UNIT_TYPE_LLM_RULES,
} from '@/lib/glamping-unit-type-llm-guidance';

describe('glamping-unit-type-llm-guidance', () => {
  it('lists structural tent types and omits Canvas Tent catch-all from examples', () => {
    expect(GLAMPING_UNIT_TYPE_LLM_EXAMPLES).toMatch(/Bell Tent/);
    expect(GLAMPING_UNIT_TYPE_LLM_EXAMPLES).toMatch(/Safari Tent/);
    expect(GLAMPING_UNIT_TYPE_LLM_EXAMPLES).toMatch(/Cabin Tent/);
    expect(GLAMPING_UNIT_TYPE_LLM_EXAMPLES).toMatch(/Canvas Cabin/);
    expect(GLAMPING_UNIT_TYPE_LLM_EXAMPLES).toMatch(/Tipi/);
    expect(GLAMPING_UNIT_TYPE_LLM_EXAMPLES).toMatch(/A-Frame/);
    expect(GLAMPING_UNIT_TYPE_LLM_EXAMPLES).toMatch(/Jupe/);
    expect(GLAMPING_UNIT_TYPE_LLM_EXAMPLES).not.toMatch(/Canvas Tent/);
  });

  it('tells models not to invent Safari or use Canvas Tent for ambiguous tents', () => {
    expect(GLAMPING_UNIT_TYPE_LLM_RULES).toMatch(/Canvas Tent is retired/i);
    expect(GLAMPING_UNIT_TYPE_LLM_RULES).toMatch(/omit unit_type|null/i);
    expect(GLAMPING_UNIT_TYPE_LLM_RULES).toMatch(/Cabin Tent/);
    expect(GLAMPING_UNIT_TYPE_LLM_FIELD_LINE).toMatch(/omit unit_type/i);
    expect(GLAMPING_UNIT_TYPE_LLM_FIELD_LINE).toMatch(/do not use Canvas Tent/i);
  });
});
