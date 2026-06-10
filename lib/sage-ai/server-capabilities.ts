/**
 * Server-side Sage AI capability flags (env-driven tool registration).
 * Shared by GET /api/admin/sage-ai/capabilities and ops docs.
 */

/** Show web research toggle in the composer (server still requires SAGE_AI_WEB_RESEARCH_ENABLED). */
export const SAGE_AI_WEB_RESEARCH_UI_ENABLED = true;

/** Client stream resume is disabled until resumable SSE replay exists (see docs/admin/SAGE_AI.md). */
export const SAGE_AI_CLIENT_STREAM_RESUME_ENABLED = false;

export type SageAiCapabilityKey =
  | 'visualization'
  | 'geo'
  | 'semanticSearch'
  | 'composedTools'
  | 'webResearch'
  | 'streamResume';

/** Tool families shown in the config banner (excludes stream resume). */
export const SAGE_AI_TOOL_FAMILY_KEYS: Exclude<SageAiCapabilityKey, 'streamResume'>[] = [
  'visualization',
  'geo',
  'semanticSearch',
  'composedTools',
  'webResearch',
];

export type SageAiCapabilityStatus = {
  key: SageAiCapabilityKey;
  enabled: boolean;
  /** When false, UI may expose a control but the server will ignore it. */
  serverEnforced: boolean;
};

export type SageAiServerCapabilities = {
  capabilities: SageAiCapabilityStatus[];
  /** True when canvas dashboards / map tools are active (Python is fallback). */
  visualizationTools: boolean;
  /** True when Tavily/Firecrawl can run for this deployment. */
  webResearchServer: boolean;
  /** UI may show web research toggle (still requires server flag). */
  webResearchUi: boolean;
  streamResume: boolean;
  /** Repo path (for operators). */
  docsPath: '/docs/admin/SAGE_AI.md';
  /** In-app documentation route. */
  adminDocsHref: '/admin/sage-ai/docs';
};

function envFlag(name: string): boolean {
  return process.env[name] === 'true';
}

export function getSageAiServerCapabilities(): SageAiServerCapabilities {
  const visualizationTools = envFlag('SAGE_AI_VISUALIZATION_TOOLS');
  const geo = envFlag('SAGE_AI_GEO_TOOLS');
  const semanticSearch = envFlag('SAGE_AI_SEMANTIC_SEARCH');
  const composedTools = envFlag('SAGE_AI_COMPOSED_TOOLS');
  const webResearchServer = envFlag('SAGE_AI_WEB_RESEARCH_ENABLED');

  const capabilities: SageAiCapabilityStatus[] = [
    {
      key: 'visualization',
      enabled: visualizationTools,
      serverEnforced: true,
    },
    {
      key: 'geo',
      enabled: geo,
      serverEnforced: true,
    },
    {
      key: 'semanticSearch',
      enabled: semanticSearch,
      serverEnforced: true,
    },
    {
      key: 'composedTools',
      enabled: composedTools,
      serverEnforced: true,
    },
    {
      key: 'webResearch',
      enabled: webResearchServer,
      serverEnforced: true,
    },
    {
      key: 'streamResume',
      enabled: SAGE_AI_CLIENT_STREAM_RESUME_ENABLED,
      serverEnforced: true,
    },
  ];

  return {
    capabilities,
    visualizationTools,
    webResearchServer,
    webResearchUi: SAGE_AI_WEB_RESEARCH_UI_ENABLED && webResearchServer,
    streamResume: SAGE_AI_CLIENT_STREAM_RESUME_ENABLED,
    docsPath: '/docs/admin/SAGE_AI.md',
    adminDocsHref: '/admin/sage-ai/docs',
  };
}
