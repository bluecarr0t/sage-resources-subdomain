import {
  SYSTEM_PROMPT_FULL,
  buildSageAiSystemPrompt,
} from '@/lib/sage-ai/system-prompt';

describe('buildSageAiSystemPrompt', () => {
  it('matches full prompt when all optional families enabled', () => {
    const built = buildSageAiSystemPrompt({
      webResearchEnabled: true,
      geoToolsEnabled: true,
      semanticSearchEnabled: true,
      composedToolsEnabled: true,
      visualizationToolsEnabled: true,
    });
    expect(built).toBe(SYSTEM_PROMPT_FULL);
  });

  it('omits optional sections when flags are off (smaller than full)', () => {
    const built = buildSageAiSystemPrompt({
      webResearchEnabled: false,
      geoToolsEnabled: false,
      semanticSearchEnabled: false,
      composedToolsEnabled: false,
      visualizationToolsEnabled: false,
    });
    expect(built.length).toBeLessThan(SYSTEM_PROMPT_FULL.length);
    expect(built).not.toContain('## Semantic search\n\nWhen registered');
    expect(built).not.toContain('## Composed tools\n\n- **competitor_comparison**');
    expect(built).toContain('Semantic search (unavailable)');
    expect(built).toContain('Web research (disabled)');
  });

  it('routes RV questions to the merged query_ota tool (no stale tool names)', () => {
    expect(SYSTEM_PROMPT_FULL).toContain('query_ota');
    expect(SYSTEM_PROMPT_FULL).not.toContain('query_hipcamp');
    expect(SYSTEM_PROMPT_FULL).not.toContain('query_campspot');
    expect(SYSTEM_PROMPT_FULL).not.toContain('query_roverpass');
  });

  it('keeps the core behavioral contracts in the always-on prompt', () => {
    const minimal = buildSageAiSystemPrompt({
      webResearchEnabled: false,
      geoToolsEnabled: false,
      semanticSearchEnabled: false,
      composedToolsEnabled: false,
      visualizationToolsEnabled: false,
    });
    // Data-integrity + unit-math hard rules.
    expect(minimal).toContain('Data Integrity');
    expect(minimal).toContain('quantity_of_units');
    expect(minimal).toContain('count_unique_properties');
    // UI behavioral contracts.
    expect(minimal).toContain('UNTRUSTED_CONTENT');
    expect(minimal).toContain('suggest_followups');
    expect(minimal).toContain('clarifying_question');
  });
});
