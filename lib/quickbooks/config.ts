import {
  QBO_API_BASE_PRODUCTION,
  QBO_API_BASE_SANDBOX,
} from '@/lib/quickbooks/constants';

export type QuickbooksEnvironment = 'production' | 'sandbox';

export type QuickbooksAppConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: QuickbooksEnvironment;
  apiBaseUrl: string;
};

function resolveRedirectUri(env: NodeJS.ProcessEnv): string {
  const explicit = env.QUICKBOOKS_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const site =
    env.NEXT_PUBLIC_SITE_URL?.trim() ||
    env.SITE_URL?.trim() ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL.trim()}` : '');
  if (site) {
    return `${site.replace(/\/$/, '')}/api/admin/quickbooks/oauth/callback`;
  }
  return 'http://localhost:3003/api/admin/quickbooks/oauth/callback';
}

export function getQuickbooksEnvironment(
  env: NodeJS.ProcessEnv = process.env
): QuickbooksEnvironment {
  return env.QUICKBOOKS_ENVIRONMENT?.trim().toLowerCase() === 'sandbox'
    ? 'sandbox'
    : 'production';
}

export function getQuickbooksAppConfig(
  env: NodeJS.ProcessEnv = process.env
): QuickbooksAppConfig | null {
  const clientId = env.QUICKBOOKS_CLIENT_ID?.trim();
  const clientSecret = env.QUICKBOOKS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const environment = getQuickbooksEnvironment(env);
  return {
    clientId,
    clientSecret,
    redirectUri: resolveRedirectUri(env),
    environment,
    apiBaseUrl:
      environment === 'sandbox' ? QBO_API_BASE_SANDBOX : QBO_API_BASE_PRODUCTION,
  };
}

export function isQuickbooksAppConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return getQuickbooksAppConfig(env) !== null;
}
