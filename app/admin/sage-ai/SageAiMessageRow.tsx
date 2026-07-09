'use client';

/**
 * One chat message row (user or assistant), extracted from SageAiClient.tsx.
 *
 * The component is wrapped in `React.memo` with stable props so that, during
 * streaming, only the actively-streaming last assistant message re-renders on
 * each token — previously the whole `messages.map` (including the tool-part
 * bundling IIFE and every ReactMarkdown subtree) re-ran for EVERY message on
 * EVERY token. All callbacks passed in must therefore be referentially stable
 * (the parent uses useCallback + refs for this).
 */

import { memo, useCallback, useMemo } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import { isReasoningUIPart, isToolUIPart } from 'ai';
import { useTranslations } from 'next-intl';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
} from 'lucide-react';
import {
  isDashboardPayload,
  isMapPayload,
} from '@/lib/sage-ai/ui-parts';
import { CanvasDashboard } from './CanvasDashboard';
import { SageAiMap } from './SageAiMap';
import {
  FeasibilitySectionPreview,
  type FeasibilitySectionPreviewPayload,
} from './FeasibilitySectionPreview';
import { isFeasibilityDocxPayload } from '@/lib/sage-ai/feasibility-docx-payload';
import { CollapsibleMarkdownPre } from '@/lib/sage-ai/CollapsibleMarkdownPre';
import { linkifyPastReportRefsInMarkdown } from '@/lib/sage-ai/linkify-past-report-refs';
import {
  downloadCsvFromData,
  downloadXlsxFromData,
  downloadXlsxFromSheets,
  generateExportFilename,
  type SpreadsheetExportSheet,
} from '@/lib/sage-ai/csv-download';
import { PythonCodeBlock } from '@/lib/sage-ai/pyodide/PythonCodeBlock';
import { FeedbackControls } from './FeedbackControls';
import { SageAiMarkdownTable } from './SageAiMarkdownTable';

/**
 * Whitelist of HTML tags / attributes the assistant is allowed to render via
 * `<ReactMarkdown>`. We start from `defaultSchema` (which already strips
 * scripts/iframes/event handlers) and add the few attributes our markdown
 * relies on — `className` for prose styling, `target/rel` so our custom `a`
 * component can produce an external-link affordance.
 *
 * Why this matters: assistant output is partly model-generated and partly
 * scraped (UNTRUSTED_CONTENT) — without sanitization, a model that decides
 * to emit raw `<img onerror>` or `<script>` would execute in the admin UI.
 */
const SAGE_AI_MARKDOWN_SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      'target',
      'rel',
    ],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className'],
    pre: [...(defaultSchema.attributes?.pre ?? []), 'className'],
    table: [...(defaultSchema.attributes?.table ?? []), 'className'],
    th: [...(defaultSchema.attributes?.th ?? []), 'className'],
    td: [...(defaultSchema.attributes?.td ?? []), 'className'],
  },
};

const SAGE_AI_MARKDOWN_REHYPE_PLUGINS: [
  typeof rehypeSanitize,
  typeof SAGE_AI_MARKDOWN_SANITIZE_SCHEMA,
][] = [[rehypeSanitize, SAGE_AI_MARKDOWN_SANITIZE_SCHEMA]];

const SAGE_AI_MARKDOWN_REMARK_PLUGINS = [remarkGfm];

/**
 * Static portion of the ReactMarkdown `components` map, hoisted to module
 * scope so it is never recreated. `table` is added per-row via useMemo since
 * it needs the toast callback for export errors.
 */
const SAGE_AI_MARKDOWN_BASE_COMPONENTS: Components = {
  pre: CollapsibleMarkdownPre,
  a: ({ href, children, ...props }) => {
    const openNew =
      typeof href === 'string' &&
      (href.startsWith('/admin') ||
        href.startsWith('/api/') ||
        href.startsWith('http'));
    return (
      <a
        href={href}
        {...props}
        target={openNew ? '_blank' : undefined}
        rel={openNew ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="m-0 list-none space-y-0.5 p-0">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="m-0 flex list-none items-baseline gap-2 pl-0">
      <span
        className="shrink-0 select-none text-[0.7em] leading-none text-sage-500"
        aria-hidden
      >
        ●
      </span>
      <span className="min-w-0 flex-1 [&>p]:mb-0 [&>p]:mt-0 [&>p+p]:mt-1.5">
        {children}
      </span>
    </li>
  ),
};

function extractExportData(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') return [];

  if ('data' in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: Record<string, unknown>[] }).data;
  }
  if ('aggregates' in data && Array.isArray((data as { aggregates: unknown }).aggregates)) {
    return (data as { aggregates: Record<string, unknown>[] }).aggregates;
  }
  if ('values' in data && Array.isArray((data as { values: unknown }).values)) {
    const values = (data as { values: unknown[]; column?: string }).values;
    const column = (data as { column?: string }).column ?? 'value';
    return values.map((v) => ({ [column]: v }));
  }
  return [];
}

function extractExportSheets(data: unknown): SpreadsheetExportSheet[] {
  if (!data || typeof data !== 'object') return [];
  if ('export_sheets' in data && Array.isArray((data as { export_sheets: unknown }).export_sheets)) {
    return (data as { export_sheets: SpreadsheetExportSheet[] }).export_sheets;
  }
  return [];
}

function otaExportFilenameStem(data: unknown, toolName: string): string {
  if (toolName === 'export_ota_property_monthly_rates' && data && typeof data === 'object') {
    const o = data as {
      location_label?: string;
      zip?: string | null;
      radius_miles?: number;
    };
    const location = o.location_label || o.zip || 'export';
    const radius = o.radius_miles ?? 50;
    const slug = String(location)
      .replace(/[^\w]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `ota-monthly-${slug}-${radius}mi`;
  }
  return generateExportFilename(`sage-ai-${toolName}`);
}

async function resolveDownloadPayload(
  data: unknown,
): Promise<{ rows: Record<string, unknown>[]; sheets: SpreadsheetExportSheet[] }> {
  if (data && typeof data === 'object' && 'export_fetch' in data) {
    const fetchParams = (data as { export_fetch: unknown }).export_fetch;
    if (fetchParams && typeof fetchParams === 'object') {
      const res = await fetch('/api/admin/sage-ai/ota-monthly-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fetchParams),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? 'Failed to load export data');
      }
      const full = (await res.json()) as {
        data?: Record<string, unknown>[];
        export_sheets?: SpreadsheetExportSheet[];
      };
      return {
        rows: full.data ?? [],
        sheets: full.export_sheets ?? [],
      };
    }
  }

  return {
    rows: extractExportData(data),
    sheets: extractExportSheets(data),
  };
}

function hasExportableData(output: unknown): boolean {
  if (!output || typeof output !== 'object') return false;
  if ('export_fetch' in output && (output as { export_fetch?: unknown }).export_fetch) return true;
  if (
    'total_row_count' in output &&
    typeof (output as { total_row_count: unknown }).total_row_count === 'number' &&
    (output as { total_row_count: number }).total_row_count > 0
  ) {
    return true;
  }
  if ('data' in output && Array.isArray((output as { data: unknown }).data) && (output as { data: unknown[] }).data.length > 0) return true;
  if ('aggregates' in output && Array.isArray((output as { aggregates: unknown }).aggregates) && (output as { aggregates: unknown[] }).aggregates.length > 0) return true;
  if ('values' in output && Array.isArray((output as { values: unknown }).values) && (output as { values: unknown[] }).values.length > 0) return true;
  return false;
}

export type SageAiMessageRowProps = {
  message: UIMessage;
  isLoading: boolean;
  currentSessionId: string | null;
  /** Resolved gateway model id, for the feedback payload. */
  feedbackModel: string;
  /** Feedback entry for this message only, so other rows keep a stable prop. */
  feedback: { rating: 1 | -1 } | undefined;
  onFeedbackChange: (messageId: string, next: { rating: 1 | -1 } | null) => void;
  copiedId: string | null;
  onCopyText: (text: string, id: string) => void;
  onSendMessage: (text: string) => void;
  onToast: (msg: string) => void;
  onOpenSaveQueryDialog: (query: string) => void;
  /** Registers/unregisters the DOM node for user rows (sticky-prompt tracking). */
  onUserMessageElement: (id: string, el: HTMLDivElement | null) => void;
  /** Editing state: only the row being edited receives isEditing/editingDraft changes. */
  isEditing: boolean;
  editingDraft: string;
  onEditingDraftChange: (draft: string) => void;
  onBeginEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onSubmitEdit: () => void;
  /** Python execution wiring. */
  getInjectedQueryData: () => Record<string, unknown>[] | null;
  onPythonError: (error: string, code: string) => void;
  pythonRetryCount: number;
};

function SageAiMessageRowInner({
  message,
  isLoading,
  currentSessionId,
  feedbackModel,
  feedback,
  onFeedbackChange,
  copiedId,
  onCopyText,
  onSendMessage,
  onToast,
  onOpenSaveQueryDialog,
  onUserMessageElement,
  isEditing,
  editingDraft,
  onEditingDraftChange,
  onBeginEdit,
  onCancelEdit,
  onSubmitEdit,
  getInjectedQueryData,
  onPythonError,
  pythonRetryCount,
}: SageAiMessageRowProps) {
  const t = useTranslations('admin.sageAi');

  const markdownComponents = useMemo<Components>(
    () => ({
      ...SAGE_AI_MARKDOWN_BASE_COMPONENTS,
      table: (props) => (
        <SageAiMarkdownTable {...props} onExportError={onToast} />
      ),
    }),
    [onToast]
  );

  const handleDownloadCsv = useCallback(
    async (data: unknown, toolName: string) => {
      try {
        const { rows } = await resolveDownloadPayload(data);
        if (rows.length > 0) {
          downloadCsvFromData(rows, `${otaExportFilenameStem(data, toolName)}.csv`);
        }
      } catch (err) {
        onToast(err instanceof Error ? err.message : t('toastFailedExportXlsx'));
      }
    },
    [onToast, t]
  );

  const handleDownloadXlsx = useCallback(
    async (data: unknown, toolName: string) => {
      try {
        const { rows, sheets } = await resolveDownloadPayload(data);
        if (sheets.length === 0 && rows.length === 0) return;

        const stem = otaExportFilenameStem(data, toolName);
        if (sheets.length > 0) {
          await downloadXlsxFromSheets(sheets, `${stem}.xlsx`);
        } else {
          await downloadXlsxFromData(rows, `${stem}.xlsx`);
        }
      } catch (err) {
        onToast(err instanceof Error ? err.message : t('toastFailedExportXlsx'));
      }
    },
    [onToast, t]
  );

  return (
    // content-visibility lets the browser skip layout/paint for rows scrolled
    // out of view (cheap windowing for long threads without unmounting rows —
    // so scroll position, edit state and streaming all keep working). The
    // `auto` intrinsic size remembers each row's real height once rendered to
    // avoid scrollbar jumps.
    <div className="mb-6 [content-visibility:auto] [contain-intrinsic-size:auto_320px]">
      {message.role === 'user' ? (
        <div
          ref={(el) => onUserMessageElement(message.id, el)}
          className="group relative"
        >
          <div className="rounded-lg border border-gray-200/90 bg-gray-100 px-4 py-3 shadow-sm dark:border-neutral-800/90 dark:bg-gray-800/95">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editingDraft}
                  onChange={(e) => onEditingDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      onSubmitEdit();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      onCancelEdit();
                    }
                  }}
                  autoFocus
                  rows={Math.min(8, Math.max(2, editingDraft.split('\n').length))}
                  className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-[15px] text-gray-900 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-gray-100"
                  disabled={isLoading}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                    disabled={isLoading}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={onSubmitEdit}
                    disabled={!editingDraft.trim() || isLoading}
                    className="px-3 py-1.5 text-sm rounded-md bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-40"
                  >
                    {t('editResend')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[15px] leading-relaxed text-gray-900 dark:text-gray-100">
                {message.parts.map((part, partIndex) => {
                  if (part.type === 'text') {
                    return (
                      <div key={partIndex} className="whitespace-pre-wrap">
                        {part.text}
                        <span className="ml-2 inline-flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => onBeginEdit(message.id)}
                            title={t('editMessage')}
                            disabled={isLoading}
                            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40"
                          >
                            <Pencil className="h-4 w-4 text-gray-500 hover:text-sage-600 dark:text-gray-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenSaveQueryDialog(part.text)}
                            title={t('saveQuery')}
                            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            <BookmarkPlus className="h-4 w-4 text-gray-500 hover:text-sage-600 dark:text-gray-400" />
                          </button>
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed group/response">
          {(() => {
            // Tools that have their own custom renderer (CanvasDashboard,
            // SageAiMap, clarifying-question card, etc.) render inline as
            // before. Every other tool falls through to the generic
            // "data tile" — and a single research turn often emits 3-5
            // of those in a row (count + a few aggregations). To keep
            // the chat scannable we collapse runs of ≥ 2 consecutive
            // generic data tiles into one `<details>` group.
            const CUSTOM_RENDERED_TOOL_NAMES = new Set([
              'clarifying_question',
              'suggest_followups',
              'generate_dashboard',
              'visualize_on_map',
              'competitor_comparison',
              'build_feasibility_brief',
              'generate_python_code',
            ]);
            const isEmptyRetryOutput = (output: unknown): boolean =>
              typeof output === 'object' &&
              output !== null &&
              '_emptyRetry' in output &&
              (output as { _emptyRetry: unknown })._emptyRetry === true;
            const isBundleableDataTool = (
              part: typeof message.parts[number]
            ): boolean => {
              if (!isToolUIPart(part)) return false;
              const name =
                'toolName' in part
                  ? (part as { toolName: string }).toolName
                  : part.type.replace(/^tool-/, '');
              if (CUSTOM_RENDERED_TOOL_NAMES.has(name)) return false;
              if (
                part.state === 'output-available' &&
                isEmptyRetryOutput(part.output)
              ) {
                return false;
              }
              return true;
            };
            /** Whitespace-only assistant `text` parts sit between tool results in some streams; they should not split Supabase query groups. */
            const doesNotBreakDataToolBundle = (
              p: typeof message.parts[number]
            ): boolean =>
              p.type === 'text' &&
              !(p as { type: 'text'; text: string }).text.trim();
            const skipIndexes = new Set<number>();
            const bundleStarts = new Map<number, number[]>();
            let activeBundle: number[] | null = null;
            for (let i = 0; i < message.parts.length; i++) {
              const p = message.parts[i];
              if (isBundleableDataTool(p)) {
                if (!activeBundle) {
                  activeBundle = [i];
                  bundleStarts.set(i, activeBundle);
                } else {
                  activeBundle.push(i);
                  skipIndexes.add(i);
                }
              } else if (doesNotBreakDataToolBundle(p)) {
                // keep activeBundle
              } else {
                activeBundle = null;
              }
            }
            const renderDefaultDataTile = (
              innerPart: typeof message.parts[number],
              innerIndex: number
            ) => {
              if (!isToolUIPart(innerPart)) return null;
              const innerToolName =
                'toolName' in innerPart
                  ? (innerPart as { toolName: string }).toolName
                  : innerPart.type.replace(/^tool-/, '');
              const innerOutput =
                innerPart.state === 'output-available'
                  ? innerPart.output
                  : undefined;
              return (
                <div
                  key={innerIndex}
                  className="rounded-lg border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {innerToolName.replace(/_/g, ' ')}
                    </span>
                    {innerPart.state === 'input-streaming' && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    )}
                    {innerPart.state === 'input-available' && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">{t('toolRunning')}</span>
                    )}
                    {innerPart.state === 'output-available' && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('toolDone')}</span>
                    )}
                  </div>
                  {innerPart.state === 'output-available' && innerOutput != null && (
                    <div className="px-3 py-2">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {typeof innerOutput === 'object' && innerOutput !== null && 'error' in innerOutput ? (
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span>{String((innerOutput as { error: string }).error)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              {typeof innerOutput === 'object' && 'total_count' in (innerOutput as object) && (
                                <span>
                                  {t('toolFoundResults', { total: (innerOutput as { total_count: number }).total_count })}
                                  {typeof innerOutput === 'object' && 'returned_count' in (innerOutput as object) &&
                                    ` · ${t('toolShowingResults', { count: (innerOutput as { returned_count: number }).returned_count })}`}
                                </span>
                              )}
                              {typeof innerOutput === 'object' && 'count' in (innerOutput as object) && !('total_count' in (innerOutput as object)) && (() => {
                                const co = innerOutput as {
                                  count: number;
                                  scope?: 'whole_table' | 'filtered';
                                  filters?: Record<string, string>;
                                  table?: string;
                                };
                                const filterEntries = co.filters
                                  ? Object.entries(co.filters)
                                  : [];
                                const scopeText =
                                  co.scope === 'whole_table'
                                    ? t('toolCountUnfiltered')
                                    : filterEntries.length > 0
                                      ? t('toolCountFiltered', {
                                          filters: filterEntries
                                            .map(([k, v]) => `${k}=${v}`)
                                            .join(', '),
                                        })
                                      : null;
                                return (
                                  <span>
                                    {t('toolCount', { count: co.count })}
                                    {scopeText && (
                                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                        {scopeText}
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}
                              {typeof innerOutput === 'object' && 'total_groups' in (innerOutput as object) && (
                                <span>{t('toolGroups', { count: (innerOutput as { total_groups: number }).total_groups })}</span>
                              )}
                            </div>
                            {hasExportableData(innerOutput) && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => void handleDownloadCsv(innerOutput, innerToolName)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                  CSV
                                </button>
                                <button
                                  onClick={() => void handleDownloadXlsx(innerOutput, innerToolName)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                >
                                  <FileSpreadsheet className="w-3 h-3" />
                                  Excel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            };
            return message.parts.map((part, partIndex) => {
            if (skipIndexes.has(partIndex)) return null;
            if (isReasoningUIPart(part)) {
              if (!part.text.trim()) {
                return null;
              }
              return (
                <details
                  key={partIndex}
                  open={part.state !== 'done'}
                  className="my-3 rounded-lg border border-gray-200 bg-gray-50/80 dark:border-neutral-800 dark:bg-neutral-900/50"
                >
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('thinking')}
                  </summary>
                  <div className="border-t border-gray-200 px-3 py-2 text-xs leading-relaxed text-gray-700 dark:border-neutral-800 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {part.text}
                  </div>
                </details>
              );
            }

            if (part.type === 'text') {
              if (!part.text.trim()) {
                return null;
              }
              const copyId = `${message.id}-${partIndex}`;
              return (
                <div key={partIndex} className="relative pr-9">
                  <button
                    onClick={() => onCopyText(part.text, copyId)}
                    className="absolute right-0 top-0 z-10 p-1.5 rounded-md opacity-0 group-hover/response:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    title="Copy to clipboard"
                  >
                    {copiedId === copyId ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                  <div
                    className="prose prose-sm prose-gray dark:prose-invert max-w-none
                      prose-p:my-1.5 prose-p:leading-normal
                      prose-ul:my-2 prose-ul:pl-0 prose-ul:list-none
                      prose-ol:my-2 prose-ol:pl-5
                      prose-li:my-0.5 prose-li:leading-normal
                      prose-headings:my-3 prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                      prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-200 dark:prose-h2:border-gray-700
                      prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1.5
                      prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
                      prose-code:text-xs prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto
                      prose-a:text-sage-600 prose-a:no-underline hover:prose-a:underline
                      prose-table:w-full prose-table:border-collapse prose-table:text-sm prose-table:my-3
                      prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                      prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2
                      dark:prose-th:border-gray-700 dark:prose-th:bg-gray-800 dark:prose-td:border-gray-700
                      prose-hr:my-5 prose-hr:border-gray-200 dark:prose-hr:border-gray-700
                      prose-blockquote:border-l-4 prose-blockquote:border-sage-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400"
                  >
                    <ReactMarkdown
                      remarkPlugins={SAGE_AI_MARKDOWN_REMARK_PLUGINS}
                      rehypePlugins={SAGE_AI_MARKDOWN_REHYPE_PLUGINS}
                      components={markdownComponents}
                    >
                      {linkifyPastReportRefsInMarkdown(part.text)}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            }

            if (isToolUIPart(part)) {
              const toolName = 'toolName' in part 
                ? (part as { toolName: string }).toolName 
                : part.type.replace(/^tool-/, '');
              const toolOutput = part.state === 'output-available' ? part.output : undefined;

              // Hide intermediate empty-result tiles. The tool layer
              // returns `{ _emptyRetry: true }` when a query yielded
              // 0 rows but we want the model to retry with different
              // params — rendering that tile is just noise. The
              // model will produce a follow-up tool call (or, after
              // burning the retry budget, a `_emptyRetryExhausted`
              // payload that flows through the existing error path).
              if (
                part.state === 'output-available' &&
                typeof toolOutput === 'object' &&
                toolOutput !== null &&
                '_emptyRetry' in toolOutput &&
                (toolOutput as { _emptyRetry: unknown })._emptyRetry === true
              ) {
                return null;
              }

              // Render `clarifying_question` as a question card with
              // clickable answer pills. Clicking an option sends that
              // exact text back as the next user message — saves the
              // user from typing the answer.
              if (toolName === 'clarifying_question') {
                if (part.state !== 'output-available') return null;
                const cqOutput = toolOutput as
                  | { type?: string; question?: unknown; options?: unknown }
                  | undefined;
                const question =
                  typeof cqOutput?.question === 'string'
                    ? cqOutput.question.trim()
                    : '';
                const options = Array.isArray(cqOutput?.options)
                  ? (cqOutput.options as unknown[]).filter(
                      (o): o is string => typeof o === 'string' && o.trim().length > 0
                    )
                  : [];
                if (!question || options.length === 0) return null;
                return (
                  <div
                    key={partIndex}
                    className="my-3 rounded-lg border border-sage-200 bg-sage-50/60 px-4 py-3 dark:border-sage-800 dark:bg-sage-900/20"
                    role="group"
                    aria-label={t('clarifyingQuestionAria')}
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {question}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {options.map((option, i) => (
                        <button
                          key={`${partIndex}-${i}`}
                          type="button"
                          disabled={isLoading}
                          onClick={() => onSendMessage(option)}
                          className="rounded-full border border-sage-400 bg-white px-3 py-1.5 text-sm font-medium text-sage-800 hover:bg-sage-100 hover:border-sage-500 dark:border-sage-600 dark:bg-sage-900/60 dark:text-sage-100 dark:hover:bg-sage-900/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              // Render `suggest_followups` as a chip row, not a tool card.
              if (toolName === 'suggest_followups') {
                if (part.state !== 'output-available') return null;
                const followupOutput = toolOutput as
                  | { type?: string; suggestions?: unknown }
                  | undefined;
                const suggestions = Array.isArray(followupOutput?.suggestions)
                  ? (followupOutput.suggestions as unknown[]).filter(
                      (s): s is string => typeof s === 'string' && s.trim().length > 0
                    )
                  : [];
                if (suggestions.length === 0) return null;
                return (
                  <div
                    key={partIndex}
                    className="my-3 flex flex-wrap gap-2"
                    aria-label="Follow-up suggestions"
                  >
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={`${partIndex}-${i}`}
                        type="button"
                        disabled={isLoading}
                        onClick={() => onSendMessage(suggestion)}
                        className="rounded-full border border-sage-300 bg-sage-50 px-3 py-1.5 text-sm text-sage-700 hover:bg-sage-100 hover:border-sage-400 dark:border-sage-700 dark:bg-sage-900/40 dark:text-sage-200 dark:hover:bg-sage-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                );
              }

              // Custom success renderer for generate_dashboard:
              // pass the payload to the Recharts canvas.
              if (
                toolName === 'generate_dashboard' &&
                part.state === 'output-available' &&
                isDashboardPayload(toolOutput)
              ) {
                return (
                  <CanvasDashboard
                    key={partIndex}
                    payload={toolOutput}
                  />
                );
              }

              // Custom success renderer for visualize_on_map:
              // hand off GeoJSON to the Leaflet map.
              if (
                toolName === 'visualize_on_map' &&
                part.state === 'output-available' &&
                isMapPayload(toolOutput)
              ) {
                return (
                  <SageAiMap key={partIndex} payload={toolOutput} />
                );
              }

              // Custom success renderer for generate_feasibility_section:
              // styled inline preview + "Download .docx" button that
              // POSTs the same payload to the section builder route.
              if (
                toolName === 'generate_feasibility_section' &&
                part.state === 'output-available' &&
                isFeasibilityDocxPayload(toolOutput)
              ) {
                const previewPayload = toolOutput as FeasibilitySectionPreviewPayload;
                return (
                  <FeasibilitySectionPreview
                    key={partIndex}
                    payload={previewPayload}
                  />
                );
              }

              // Custom success renderer for competitor_comparison:
              // show a compact summary; the model synthesizes the
              // narrative from the tool payload in its follow-up text.
              if (
                toolName === 'competitor_comparison' &&
                part.state === 'output-available' &&
                typeof toolOutput === 'object' &&
                toolOutput !== null &&
                'type' in toolOutput &&
                (toolOutput as { type: string }).type ===
                  'competitor_comparison'
              ) {
                const cmpOut = toolOutput as unknown as {
                  competitors: Array<{
                    name: string;
                    place?: { website: string | null } | null;
                    scrape?: { url: string } | null;
                    errors: string[];
                  }>;
                };
                const withPlace = cmpOut.competitors.filter(
                  (c) => c.place
                ).length;
                const withScrape = cmpOut.competitors.filter(
                  (c) => c.scrape
                ).length;
                return (
                  <div
                    key={partIndex}
                    className="my-4 rounded-lg border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-3"
                  >
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Competitor comparison
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {cmpOut.competitors.length} competitors ·{' '}
                      {withPlace} with Google Places data ·{' '}
                      {withScrape} with scraped homepage
                    </div>
                  </div>
                );
              }

              // Custom success renderer for build_feasibility_brief:
              // show a link to the newly created draft report.
              if (
                toolName === 'build_feasibility_brief' &&
                part.state === 'output-available' &&
                typeof toolOutput === 'object' &&
                toolOutput !== null &&
                'type' in toolOutput &&
                (toolOutput as { type: string }).type ===
                  'feasibility_brief_draft'
              ) {
                const briefOut = toolOutput as unknown as {
                  report_id: string;
                  template: string;
                  sections_written: number;
                  view_url: string;
                };
                return (
                  <div
                    key={partIndex}
                    className="my-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3"
                  >
                    <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      Draft feasibility brief created
                    </div>
                    <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                      Template: {briefOut.template} ·{' '}
                      {briefOut.sections_written} section
                      {briefOut.sections_written === 1 ? '' : 's'} written
                    </div>
                    <a
                      href={briefOut.view_url}
                      className="mt-2 inline-flex items-center text-sm font-medium text-emerald-700 dark:text-emerald-200 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open draft in reports →
                    </a>
                  </div>
                );
              }

              // Inline `generate_python_code` tiles (chunky python
              // editor + chart output) keep their own card so the user
              // can run / inspect them without expanding a group.
              if (
                toolName === 'generate_python_code' &&
                part.state === 'output-available' &&
                typeof toolOutput === 'object' &&
                toolOutput !== null &&
                'type' in toolOutput &&
                (toolOutput as { type: string }).type === 'python_code'
              ) {
                const pyOutput = toolOutput as unknown as {
                  code: string;
                  description: string;
                  uses_query_data?: boolean;
                };
                return (
                  <div
                    key={partIndex}
                    className="my-4 rounded-lg border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                      <Database className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {toolName.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('toolDone')}</span>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {pyOutput.description}
                      </p>
                      <PythonCodeBlock
                        code={pyOutput.code}
                        onDataInject={
                          pyOutput.uses_query_data
                            ? getInjectedQueryData
                            : undefined
                        }
                        onError={onPythonError}
                        retryCount={pythonRetryCount}
                      />
                    </div>
                  </div>
                );
              }

              // Generic data tile. If this index is the start of a
              // ≥ 2 tile bundle, collapse the whole run behind a
              // single `<details>` toggle; otherwise render solo.
              const bundle = bundleStarts.get(partIndex);
              if (bundle && bundle.length > 1) {
                const allDone = bundle.every((i) => {
                  const bp = message.parts[i];
                  return (
                    isToolUIPart(bp) && bp.state === 'output-available'
                  );
                });
                return (
                  <details
                    key={partIndex}
                    className="my-4 rounded-lg border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden group/bundle"
                  >
                    <summary className="cursor-pointer select-none flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 list-none [&::-webkit-details-marker]:hidden">
                      <Database className="w-4 h-4 shrink-0 text-gray-400" />
                      <span>{t('toolBundle', { count: bundle.length })}</span>
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        {t('toolBundleExpand')}
                      </span>
                      {allDone ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('toolDone')}</span>
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-gray-400" />
                      )}
                    </summary>
                    <div className="border-t border-neutral-200/75 dark:border-neutral-800 px-3 py-2 space-y-2">
                      {bundle.map((i) =>
                        renderDefaultDataTile(message.parts[i], i)
                      )}
                    </div>
                  </details>
                );
              }

              return (
                <div key={partIndex} className="my-4">
                  {renderDefaultDataTile(part, partIndex)}
                </div>
              );
            }

            return null;
            });
          })()}
          {message.role === 'assistant' &&
            !isLoading &&
            currentSessionId && (
              <FeedbackControls
                sessionId={currentSessionId}
                messageId={message.id}
                model={feedbackModel}
                initial={feedback}
                onChange={(next) => onFeedbackChange(message.id, next)}
                onError={onToast}
              />
            )}
        </div>
      )}
    </div>
  );
}

export const SageAiMessageRow = memo(SageAiMessageRowInner);
