'use client';

import { useCallback, useState } from 'react';
import { googleSheetsPipelineOAuthScopeString } from '@/lib/google-sheets-oauth-scopes';
import { requestGoogleSheetsAccessToken } from '@/lib/google-sheets-oauth-client';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID ?? '';
const SCOPE = googleSheetsPipelineOAuthScopeString();

export default function PipelineOAuthSyncPage() {
  const [status, setStatus] = useState('Ready.');
  const [working, setWorking] = useState(false);

  const runSync = useCallback(async () => {
    if (!CLIENT_ID) {
      setStatus('NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID is not configured.');
      return;
    }

    setWorking(true);
    setStatus('Requesting Google Sheets authorization…');

    try {
      const { accessToken } = await requestGoogleSheetsAccessToken(CLIENT_ID, SCOPE);
      setStatus('Syncing 2026 Jobs tab to Supabase…');

      const res = await fetch('/api/dev/pipeline-oauth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          sheetName: '2026 Jobs',
        }),
      });
      const body = await res.json();
      setStatus(
        res.ok
          ? `Sync complete:\n${JSON.stringify(body, null, 2)}`
          : `Sync failed:\n${JSON.stringify(body, null, 2)}`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'OAuth sync failed');
    } finally {
      setWorking(false);
    }
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-xl font-semibold">Not available</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use the refresh icon on Job Pipeline in production.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Project Pipeline OAuth Sync</h1>
      <p className="mt-2 text-sm text-gray-600">
        Authorize Google Sheets, then sync the 2026 Jobs tab into Supabase.
      </p>
      <button
        type="button"
        className="mt-4 rounded-lg bg-sage-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        onClick={() => void runSync()}
        disabled={working}
      >
        {working ? 'Working…' : 'Authorize & Sync 2026 Jobs'}
      </button>
      <pre className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{status}</pre>
    </main>
  );
}
