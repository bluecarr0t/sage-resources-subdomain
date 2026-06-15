'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { requestGoogleSheetsAccessToken } from '@/lib/google-sheets-oauth-client';
import {
  arrayToCsv,
  downloadCsvFromData,
  downloadCsvText,
  downloadXlsxFromSheets,
} from '@/lib/sage-ai/csv-download';
import {
  buildPipelineQuarterlyExportBundle,
  PIPELINE_QUARTERLY_EXPORT_PROPERTY_SHEET_NAME,
  PIPELINE_QUARTERLY_EXPORT_UNIT_MIX_SHEET_NAME,
} from '@/lib/pipeline-quarterly/export-rows';
import type { GoogleSheetsExportAuthMode } from '@/lib/google-sheets-export';
import type { PipelineQuarterlyPropertyRow } from '@/lib/pipeline-quarterly/fetch-status-breakdown';

type Props = {
  rows: readonly PipelineQuarterlyPropertyRow[];
  filenamePrefix: string;
  disabled?: boolean;
  hidePlannedOpenDate?: boolean;
};

type SheetsExportStatus = {
  configured: boolean;
  authMode: GoogleSheetsExportAuthMode | null;
  oauthClientId: string | null;
};

type SheetsExportResponse = {
  url?: string;
  error?: string;
};

async function fetchSheetsExportStatus(): Promise<SheetsExportStatus> {
  const response = await fetch('/api/pipeline-quarterly/export-to-sheets', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) {
    return { configured: false, authMode: null, oauthClientId: null };
  }
  const payload = (await response.json().catch(() => null)) as Partial<SheetsExportStatus> | null;
  return {
    configured: payload?.configured === true,
    authMode: payload?.authMode ?? null,
    oauthClientId: payload?.oauthClientId ?? null,
  };
}

async function openInGoogleSheets(
  bundle: ReturnType<typeof buildPipelineQuarterlyExportBundle>,
  title: string,
  options: {
    authMode: GoogleSheetsExportAuthMode;
    oauthClientId: string | null;
  }
): Promise<string> {
  let accessToken: string | undefined;
  if (options.authMode === 'oauth') {
    if (!options.oauthClientId) {
      throw new Error('Google OAuth client ID is not configured');
    }
    accessToken = await requestGoogleSheetsAccessToken(options.oauthClientId);
  }

  const response = await fetch('/api/pipeline-quarterly/export-to-sheets', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      tabs: [
        {
          title: PIPELINE_QUARTERLY_EXPORT_PROPERTY_SHEET_NAME,
          rows: bundle.properties,
          columns: bundle.propertyColumns,
        },
        {
          title: PIPELINE_QUARTERLY_EXPORT_UNIT_MIX_SHEET_NAME,
          rows: bundle.unitMix,
          columns: bundle.unitMixColumns,
        },
      ],
      ...(accessToken ? { accessToken } : {}),
    }),
  });

  const payload = (await response.json().catch(() => null)) as SheetsExportResponse | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error ?? 'Failed to create Google Sheet');
  }

  const opened = window.open(payload.url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    return payload.url;
  }

  return payload.url;
}

async function openSheetsFallback(csv: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(csv);
  }
  window.open('https://sheets.new', '_blank', 'noopener,noreferrer');
}

export function PipelineQuarterlyExportDropdown({
  rows,
  filenamePrefix,
  disabled,
  hidePlannedOpenDate = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetsStatus, setSheetsStatus] = useState<SheetsExportStatus | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    void fetchSheetsExportStatus().then((status) => {
      if (!cancelled) setSheetsStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const exportOptions = useMemo(
    () => ({ hidePlannedOpenDate }),
    [hidePlannedOpenDate]
  );
  const exportBundle = useMemo(
    () => buildPipelineQuarterlyExportBundle(rows, exportOptions),
    [rows, exportOptions]
  );
  const dateStamp = new Date().toISOString().slice(0, 10);
  const baseFilename = `${filenamePrefix}-${dateStamp}`;

  async function runExport(action: 'csv' | 'xlsx' | 'sheets') {
    if (!rows.length || disabled) return;
    setBusy(action);
    setNotice(null);
    setSheetUrl(null);
    try {
      if (action === 'csv') {
        downloadCsvFromData(exportBundle.properties, `${baseFilename}-properties.csv`);
        if (exportBundle.unitMix.length > 0) {
          downloadCsvFromData(exportBundle.unitMix, `${baseFilename}-unit-mix.csv`);
        } else {
          downloadCsvText(
            exportBundle.unitMixColumns.join(','),
            `${baseFilename}-unit-mix.csv`
          );
        }
        setNotice('Downloaded Properties and Unit mix CSV files.');
      } else if (action === 'xlsx') {
        await downloadXlsxFromSheets(
          [
            { name: PIPELINE_QUARTERLY_EXPORT_PROPERTY_SHEET_NAME, data: exportBundle.properties },
            { name: PIPELINE_QUARTERLY_EXPORT_UNIT_MIX_SHEET_NAME, data: exportBundle.unitMix },
          ],
          `${baseFilename}.xlsx`
        );
      } else {
        const csv = arrayToCsv(exportBundle.properties);

        if (!sheetsStatus?.configured || !sheetsStatus.authMode) {
          await openSheetsFallback(csv);
          setNotice(
            'Opened a blank Google Sheet and copied the Properties CSV to your clipboard. Import Unit mix from the second CSV file if needed.'
          );
          return;
        }

        try {
          const url = await openInGoogleSheets(exportBundle, baseFilename, {
            authMode: sheetsStatus.authMode,
            oauthClientId: sheetsStatus.oauthClientId,
          });
          setNotice(
            sheetsStatus.authMode === 'oauth'
              ? 'Created a Google Sheet with Properties and Unit mix tabs…'
              : 'Opening your export in Google Sheets…'
          );
          setSheetUrl(url);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create Google Sheet';
          if (
            message.includes('not configured') ||
            message.includes('authorization') ||
            message.includes('Enable the Google Drive API')
          ) {
            await openSheetsFallback(csv);
            setNotice(
              `${message} Opened a blank sheet and copied the Properties CSV to your clipboard. Use File → Import for Unit mix.`
            );
            return;
          }
          throw error;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setNotice(
        action === 'sheets' ? `${message} Try CSV instead.` : 'Export failed. Please try again.'
      );
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || rows.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 border border-sage-200 bg-white px-3 py-2 text-[11px] uppercase tracking-widest text-neutral-700 transition-colors hover:border-sage-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Export data
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[12rem] border border-sage-200 bg-white py-1 shadow-md"
        >
          {(
            [
              ['csv', 'Export as CSV'],
              ['xlsx', 'Export as XLSX'],
              ['sheets', 'Open with Google Sheets'],
            ] as const
          ).map(([action, label]) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              disabled={busy !== null}
              onClick={() => void runExport(action)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-light text-neutral-700 transition-colors hover:bg-[#faf9f3] hover:text-neutral-900 disabled:opacity-60"
            >
              {busy === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {notice ? (
        <p className="absolute right-0 top-full z-10 mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-500">
          {notice}{' '}
          {sheetUrl ? (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sage-700 underline-offset-2 hover:text-sage-900 hover:underline"
            >
              Open sheet
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
