import {
  getGoogleSheetsOAuthClientIdFromEnv,
  isGoogleSheetsServiceAccountConfigured,
} from '@/lib/google-sheets-export';

export type ProjectPipelineAuthMode = 'service_account' | 'oauth';

export function getProjectPipelineAuthMode(
  env: NodeJS.ProcessEnv = process.env
): ProjectPipelineAuthMode | null {
  if (isGoogleSheetsServiceAccountConfigured(env)) return 'service_account';
  if (getGoogleSheetsOAuthClientIdFromEnv(env)) return 'oauth';
  return null;
}

export function isProjectPipelineConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return getProjectPipelineAuthMode(env) !== null;
}

export function getProjectPipelineOAuthClientId(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  if (getProjectPipelineAuthMode(env) !== 'oauth') return null;
  return getGoogleSheetsOAuthClientIdFromEnv(env);
}
