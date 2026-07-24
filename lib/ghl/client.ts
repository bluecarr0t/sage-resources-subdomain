/**
 * GoHighLevel (Lead Connector) API client for Private Integration Tokens.
 */

export const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com';
export const GHL_API_VERSION = '2021-07-28';

export type GhlConfig = {
  token: string;
  locationId: string;
  pipelineId: string;
};

let missingConfigLogged = false;

export function getGhlConfig(): GhlConfig | null {
  const token = process.env.GHL_TOKEN?.trim() ?? '';
  const locationId = process.env.GHL_LOCATION_ID?.trim() ?? '';
  const pipelineId = process.env.GHL_PIPELINE_ID?.trim() ?? '';

  if (!token || !locationId || !pipelineId) {
    if (!missingConfigLogged) {
      missingConfigLogged = true;
      console.warn(
        '[ghl] Missing GHL_TOKEN, GHL_LOCATION_ID, or GHL_PIPELINE_ID — opportunity sync skipped'
      );
    }
    return null;
  }

  return { token, locationId, pipelineId };
}

/** Reset the one-shot missing-config log (tests only). */
export function resetGhlMissingConfigLogForTests(): void {
  missingConfigLogged = false;
}

export class GhlApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, path: string) {
    super(`GHL API ${status} for ${path}: ${body.slice(0, 300)}`);
    this.name = 'GhlApiError';
    this.status = status;
    this.body = body;
  }
}

export async function ghlFetch<T>(
  config: GhlConfig,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith('http') ? path : `${GHL_API_BASE_URL}${path}`;
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${config.token}`);
  headers.set('Version', GHL_API_VERSION);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new GhlApiError(res.status, text, path);
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
