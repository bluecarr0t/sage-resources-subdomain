'use client';

import { googleSheetsExportOAuthScopeString } from '@/lib/google-sheets-oauth-scopes';

type TokenClientCallbackResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type TokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

type GoogleIdentityServices = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenClientCallbackResponse) => void;
      }) => TokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google OAuth is only available in the browser'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity Services')),
        { once: true }
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Prompt the user to authorize Google Sheets access and return a short-lived token.
 * Requires a Web application OAuth client ID (not a service account key).
 */
export async function requestGoogleSheetsAccessToken(clientId: string): Promise<string> {
  await loadGoogleIdentityServices();

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Google Identity Services did not initialize');
  }

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: googleSheetsExportOAuthScopeString(),
      callback: (response) => {
        if (response.error) {
          reject(
            new Error(
              response.error_description?.trim() ||
                response.error ||
                'Google authorization was denied'
            )
          );
          return;
        }

        const accessToken = response.access_token?.trim();
        if (!accessToken) {
          reject(new Error('Google did not return an access token'));
          return;
        }

        resolve(accessToken);
      },
    });

    client.requestAccessToken({ prompt: '' });
  });
}
