import {
  findUnsourcedNumericClaims,
  scoreStyleRubric,
  extractNumericClaims,
} from '@/lib/ai-report-builder/eval-number-fidelity';
import {
  isReportClaudeEnabled,
  resolveReportLlmModel,
  resolveReportLlmFallbackModel,
} from '@/lib/ai-report-builder/llm-provider';
import { SAGE_STYLE_SYSTEM_PROMPT_VERSION } from '@/lib/ai-report-builder/sage-style-system-prompt';

describe('eval-number-fidelity', () => {
  it('extracts dollar and percent claims', () => {
    const claims = extractNumericClaims('ADR of $245 with 68% occupancy and 12,500 visitors.');
    expect(claims).toEqual(expect.arrayContaining(['$245', '68%', '12,500']));
  });

  it('flags unsourced claims not in facts', () => {
    const unsourced = findUnsourcedNumericClaims(
      'The subject achieves ADR of $999 with 99% occupancy.',
      'FACTS: ADR $245 occupancy 68%'
    );
    expect(unsourced.some((c) => c.includes('999') || c.includes('99%'))).toBe(true);
  });

  it('passes when claims appear in facts', () => {
    const unsourced = findUnsourcedNumericClaims(
      'ADR of $245 and occupancy of 68%.',
      'Regional ADR $245; occupancy 68%'
    );
    expect(unsourced).toEqual([]);
  });

  it('scores style rubric higher for Sage phrasing', () => {
    const good = scoreStyleRubric(
      'Overall, the demand indicators for the subject are a positive demand indicator. It is concluded to be feasible.\n\nFurther analysis of ownership goals is recommended.'
    );
    const bad = scoreStyleRubric('Check this out!!! **amazing** deal — https://example.com');
    expect(good.overall).toBeGreaterThanOrEqual(bad.overall);
  });
});

describe('llm-provider model resolution', () => {
  it('defaults to Claude Opus 5 when USE_REPORT_CLAUDE and gateway auth', () => {
    const env = {
      USE_REPORT_CLAUDE: 'true',
      AI_GATEWAY_API_KEY: 'test-key',
    } as NodeJS.ProcessEnv;
    expect(isReportClaudeEnabled(env)).toBe(true);
    expect(resolveReportLlmModel(env)).toBe('anthropic/claude-opus-5');
    expect(resolveReportLlmFallbackModel(env)).toBe('anthropic/claude-sonnet-4.5');
  });

  it('honors REPORT_LLM_MODEL override', () => {
    const env = {
      REPORT_LLM_MODEL: 'anthropic/claude-sonnet-4.5',
      AI_GATEWAY_API_KEY: 'test-key',
    } as NodeJS.ProcessEnv;
    expect(resolveReportLlmModel(env)).toBe('anthropic/claude-sonnet-4.5');
  });

  it('disables Claude when USE_REPORT_CLAUDE=false', () => {
    const env = {
      USE_REPORT_CLAUDE: 'false',
      AI_GATEWAY_API_KEY: 'test-key',
    } as NodeJS.ProcessEnv;
    expect(isReportClaudeEnabled(env)).toBe(false);
    expect(resolveReportLlmModel(env)).toBe('openai/gpt-4o');
  });
});

describe('sage style system prompt', () => {
  it('has a version stamp', () => {
    expect(SAGE_STYLE_SYSTEM_PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});
