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
});
