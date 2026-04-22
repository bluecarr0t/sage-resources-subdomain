'use client';

import { useCallback, useRef, type ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  downloadCsvFromRows,
  downloadXlsxFromRows,
  generateExportFilename,
} from '@/lib/sage-ai/csv-download';

function extractRowsFromTable(table: HTMLTableElement): string[][] {
  const trs = table.querySelectorAll('tr');
  const raw: string[][] = [];
  for (const tr of trs) {
    const cells: string[] = [];
    for (const cell of tr.querySelectorAll('th, td')) {
      cells.push((cell.textContent ?? '').replace(/\s+/g, ' ').trim());
    }
    if (cells.length) raw.push(cells);
  }
  if (raw.length === 0) return [];
  const maxCols = Math.max(...raw.map((r) => r.length));
  return raw.map((r) =>
    r.length >= maxCols ? r : [...r, ...Array.from({ length: maxCols - r.length }, () => '')]
  );
}

export type SageAiMarkdownTableProps = ComponentProps<'table'> & {
  /** mdast node from react-markdown — not a DOM prop */
  node?: unknown;
  onExportError?: (message: string) => void;
};

export function SageAiMarkdownTable({
  children,
  className,
  onExportError,
  node: _mdastNode,
  ...rest
}: SageAiMarkdownTableProps) {
  const t = useTranslations('admin.sageAi');
  const tableRef = useRef<HTMLTableElement>(null);

  const runExport = useCallback(
    async (format: 'csv' | 'xlsx') => {
      const el = tableRef.current;
      if (!el) return;
      const rows = extractRowsFromTable(el);
      if (rows.length === 0) return;
      const stem = generateExportFilename('sage-ai-table');
      const name = format === 'csv' ? `${stem}.csv` : `${stem}.xlsx`;
      try {
        if (format === 'csv') {
          downloadCsvFromRows(rows, name);
        } else {
          await downloadXlsxFromRows(rows, name);
        }
      } catch (e) {
        console.error(e);
        onExportError?.(t('tableExportFailed'));
      }
    },
    [onExportError, t]
  );

  return (
    <div className="my-4 w-full min-w-0 max-w-full">
      <div className="not-prose mb-1.5 flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => void runExport('csv')}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label={t('tableDownloadCsvAria')}
        >
          <FileText className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {t('tableDownloadCsv')}
        </button>
        <button
          type="button"
          onClick={() => void runExport('xlsx')}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label={t('tableDownloadXlsxAria')}
        >
          <FileSpreadsheet className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {t('tableDownloadXlsx')}
        </button>
      </div>
      <div className="max-w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table
          ref={tableRef}
          className={className}
          {...rest}
        >
          {children}
        </table>
      </div>
    </div>
  );
}
