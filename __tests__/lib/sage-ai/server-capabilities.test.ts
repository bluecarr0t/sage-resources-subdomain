import {
  SAGE_AI_CLIENT_STREAM_RESUME_ENABLED,
  getSageAiServerCapabilities,
} from '@/lib/sage-ai/server-capabilities';

describe('getSageAiServerCapabilities', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.SAGE_AI_VISUALIZATION_TOOLS;
    delete process.env.SAGE_AI_GEO_TOOLS;
    delete process.env.SAGE_AI_SEMANTIC_SEARCH;
    delete process.env.SAGE_AI_COMPOSED_TOOLS;
    delete process.env.SAGE_AI_WEB_RESEARCH_ENABLED;
  });

  afterAll(() => {
    process.env = env;
  });

  it('defaults tool flags to false when env unset', () => {
    const caps = getSageAiServerCapabilities();
    expect(caps.visualizationTools).toBe(false);
    expect(caps.webResearchServer).toBe(false);
    expect(caps.streamResume).toBe(SAGE_AI_CLIENT_STREAM_RESUME_ENABLED);
    expect(caps.capabilities.filter((c) => c.enabled)).toEqual(
      caps.capabilities.filter((c) => c.key === 'streamResume' && SAGE_AI_CLIENT_STREAM_RESUME_ENABLED)
    );
  });

  it('reflects env when set to true', () => {
    process.env.SAGE_AI_VISUALIZATION_TOOLS = 'true';
    const caps = getSageAiServerCapabilities();
    expect(caps.visualizationTools).toBe(true);
    expect(caps.capabilities.find((c) => c.key === 'visualization')?.enabled).toBe(true);
  });

  it('webResearchUi requires server flag', () => {
    delete process.env.SAGE_AI_WEB_RESEARCH_ENABLED;
    expect(getSageAiServerCapabilities().webResearchUi).toBe(false);
    process.env.SAGE_AI_WEB_RESEARCH_ENABLED = 'true';
    expect(getSageAiServerCapabilities().webResearchUi).toBe(true);
  });
});
