'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button, Card, Modal, ModalContent, Select } from '@/components/ui';
import {
  adminBodyMuted,
  adminPageDescription,
  adminPageHeadingMargin,
  adminPageTitle,
  adminSurface,
} from '@/lib/admin-ui';
import { quickbooksInvoiceUiUrl } from '@/lib/quickbooks/constants';
import type { RemapInvoicesSummary } from '@/lib/quickbooks/qbo-types';
import type {
  QuickbooksRemapHistoryAction,
  QuickbooksRemapHistoryRow,
  QuickbooksRemapHistorySource,
} from '@/lib/quickbooks/history';

type StatusResponse = {
  configured: boolean;
  connected: boolean;
  environment: 'production' | 'sandbox';
  redirectUri: string | null;
  connection: {
    realmId: string;
    source: 'database' | 'env';
    connectedAt: string | null;
    updatedAt: string | null;
    hasAccessToken: boolean;
  } | null;
  remapRules: {
    docNumberPrefix: string;
    sourceItemName: string;
    targetItemName: string;
  };
  error?: string;
};

type HistoryResponse = {
  entries: QuickbooksRemapHistoryRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  error?: string;
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function QuickbooksRemapClient() {
  const t = useTranslations('admin.quickbooks');
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<RemapInvoicesSummary | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [oauthBanner, setOauthBanner] = useState<{
    variant: 'success' | 'error';
    message: string;
  } | null>(null);

  const [history, setHistory] = useState<QuickbooksRemapHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyAction, setHistoryAction] = useState<
    QuickbooksRemapHistoryAction | 'all'
  >('all');
  const [historySource, setHistorySource] = useState<
    QuickbooksRemapHistorySource | 'all'
  >('all');
  const [selectedHistory, setSelectedHistory] =
    useState<QuickbooksRemapHistoryRow | null>(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch('/api/admin/quickbooks/status', { credentials: 'include' });
      const body = (await res.json()) as StatusResponse;
      if (!res.ok) {
        throw new Error(body.error || t('statusError'));
      }
      setStatus(body);
    } catch (err) {
      setStatus(null);
      setStatusError(err instanceof Error ? err.message : t('statusError'));
    } finally {
      setStatusLoading(false);
    }
  }, [t]);

  const loadHistory = useCallback(
    async (overrides?: {
      page?: number;
      action?: QuickbooksRemapHistoryAction | 'all';
      source?: QuickbooksRemapHistorySource | 'all';
    }) => {
      const page = overrides?.page ?? historyPage;
      const action = overrides?.action ?? historyAction;
      const source = overrides?.source ?? historySource;
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          perPage: '25',
          action,
          source,
        });
        const res = await fetch(`/api/admin/quickbooks/history?${params}`, {
          credentials: 'include',
        });
        const body = (await res.json()) as HistoryResponse;
        if (!res.ok) {
          throw new Error(body.error || t('historyError'));
        }
        setHistory(body.entries);
        setHistoryTotalPages(body.totalPages);
        setHistoryTotal(body.total);
      } catch (err) {
        setHistory([]);
        setHistoryError(err instanceof Error ? err.message : t('historyError'));
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyPage, historyAction, historySource, t]
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    if (!oauth) return;
    if (oauth === 'connected') {
      setOauthBanner({ variant: 'success', message: t('oauthConnected') });
      void loadStatus();
      return;
    }
    if (oauth === 'error') {
      setOauthBanner({
        variant: 'error',
        message: searchParams.get('message') || t('oauthError'),
      });
    }
  }, [searchParams, t, loadStatus]);

  const runRemap = async (dryRun: boolean) => {
    setRunning(true);
    setRunError(null);
    setSummary(null);
    try {
      const res = await fetch('/api/admin/quickbooks/remap-invoices', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const body = (await res.json()) as RemapInvoicesSummary & { error?: string };
      if (!res.ok) {
        throw new Error(body.error || t('runError'));
      }
      setSummary(body);
      setHistoryPage(1);
      await loadHistory({ page: 1 });
    } catch (err) {
      setRunError(err instanceof Error ? err.message : t('runError'));
    } finally {
      setRunning(false);
    }
  };

  const actionLabel = (action: QuickbooksRemapHistoryAction) => {
    switch (action) {
      case 'updated':
        return t('historyActionUpdated');
      case 'matched_dry_run':
        return t('historyActionDryRun');
      case 'error':
        return t('historyActionError');
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  };

  const sourceLabel = (source: QuickbooksRemapHistorySource) => {
    switch (source) {
      case 'admin':
        return t('historySourceAdmin');
      case 'cron':
        return t('historySourceCron');
      case 'webhook':
        return t('historySourceWebhook');
      case 'script':
        return t('historySourceScript');
      default: {
        const _exhaustive: never = source;
        return _exhaustive;
      }
    }
  };

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className={adminPageHeadingMargin}>
          <h1 className={`${adminPageTitle} mb-1`}>{t('title')}</h1>
          <p className={adminPageDescription}>{t('subtitle')}</p>
        </div>

        {oauthBanner ? (
          <div
            className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              oauthBanner.variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
            }`}
            role="status"
          >
            {oauthBanner.variant === 'success' ? (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <span>{oauthBanner.message}</span>
          </div>
        ) : null}

        <Card padding="none" className={`${adminSurface} mb-4 p-4 sm:p-5`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {t('connectionHeading')}
              </h2>
              <p className={`${adminBodyMuted} mt-1`}>{t('connectionHelp')}</p>
              {statusLoading ? (
                <p className={`${adminBodyMuted} mt-3 inline-flex items-center gap-2`}>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t('loadingStatus')}
                </p>
              ) : statusError ? (
                <p className="mt-3 text-sm text-red-700 dark:text-red-300">{statusError}</p>
              ) : status ? (
                <dl className="mt-3 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                  <div>
                    <dt className="inline text-neutral-500 dark:text-neutral-400">
                      {t('configuredLabel')}:{' '}
                    </dt>
                    <dd className="inline">
                      {status.configured ? t('yes') : t('no')}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-neutral-500 dark:text-neutral-400">
                      {t('connectedLabel')}:{' '}
                    </dt>
                    <dd className="inline">
                      {status.connected ? t('yes') : t('no')}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-neutral-500 dark:text-neutral-400">
                      {t('environmentLabel')}:{' '}
                    </dt>
                    <dd className="inline">{status.environment}</dd>
                  </div>
                  {status.connection ? (
                    <div>
                      <dt className="inline text-neutral-500 dark:text-neutral-400">
                        {t('realmLabel')}:{' '}
                      </dt>
                      <dd className="inline font-mono text-xs">{status.connection.realmId}</dd>
                    </div>
                  ) : null}
                  {status.redirectUri ? (
                    <div className="pt-1">
                      <dt className="text-neutral-500 dark:text-neutral-400">
                        {t('redirectUriLabel')}
                      </dt>
                      <dd className="break-all font-mono text-xs">{status.redirectUri}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => void loadStatus()}
                disabled={statusLoading || running}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                {t('refreshStatus')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-2"
                disabled={!status?.configured || running}
                onClick={() => {
                  window.location.href = '/api/admin/quickbooks/oauth/start';
                }}
              >
                <Link2 className="h-4 w-4" aria-hidden />
                {t('connect')}
              </Button>
            </div>
          </div>
        </Card>

        <Card padding="none" className={`${adminSurface} mb-4 p-4 sm:p-5`}>
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t('rulesHeading')}
          </h2>
          <ul className={`${adminBodyMuted} mt-2 list-disc space-y-1 pl-5`}>
            <li>
              {t('ruleDocPrefix', {
                prefix: status?.remapRules.docNumberPrefix ?? 'INV-',
              })}
            </li>
            <li>
              {t('ruleSourceItem', {
                name: status?.remapRules.sourceItemName ?? 'Appraisal Review',
              })}
            </li>
            <li>
              {t('ruleTargetItem', {
                name:
                  status?.remapRules.targetItemName ??
                  'Feasibility Study - Outdoor Report',
              })}
            </li>
          </ul>
          <p className={`${adminBodyMuted} mt-3`}>{t('rulesNote')}</p>
        </Card>

        <Card padding="none" className={`${adminSurface} mb-4 p-4 sm:p-5`}>
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t('actionsHeading')}
          </h2>
          <p className={`${adminBodyMuted} mt-1`}>{t('actionsHelp')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={!status?.connected || running}
              onClick={() => void runRemap(true)}
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t('dryRun')}
            </Button>
            <Button
              type="button"
              disabled={!status?.connected || running}
              onClick={() => {
                if (window.confirm(t('liveConfirm'))) {
                  void runRemap(false);
                }
              }}
            >
              {t('liveRun')}
            </Button>
          </div>

          {runError ? (
            <p className="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">
              {runError}
            </p>
          ) : null}

          {summary ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-neutral-800 dark:text-neutral-200">
                {summary.dryRun ? t('dryRunComplete') : t('liveRunComplete')}{' '}
                {t('summaryCounts', {
                  scanned: summary.scanned,
                  matched: summary.matched,
                  updated: summary.updated,
                  errors: summary.errors,
                })}
              </p>
              {summary.results.length > 0 ? (
                <div className="overflow-x-auto rounded-md border border-neutral-200/70 dark:border-neutral-800">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/50 dark:text-neutral-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">{t('colDocNumber')}</th>
                        <th className="px-3 py-2 font-medium">{t('colDate')}</th>
                        <th className="px-3 py-2 font-medium">{t('colLines')}</th>
                        <th className="px-3 py-2 font-medium">{t('colStatus')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.results.map((row) => (
                        <tr
                          key={row.invoiceId}
                          className="border-t border-neutral-200/70 dark:border-neutral-800"
                        >
                          <td className="px-3 py-2 font-mono text-xs">{row.docNumber}</td>
                          <td className="px-3 py-2">{row.txnDate ?? '—'}</td>
                          <td className="px-3 py-2">{row.matchedLineIds.length || '—'}</td>
                          <td className="px-3 py-2">
                            {row.error
                              ? row.error
                              : row.updated
                                ? t('statusUpdated')
                                : t('statusMatched')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={adminBodyMuted}>{t('noMatches')}</p>
              )}
            </div>
          ) : null}
        </Card>

        <Card padding="none" className={`${adminSurface} p-4 sm:p-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {t('historyHeading')}
              </h2>
              <p className={`${adminBodyMuted} mt-1`}>{t('historyHelp')}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => void loadHistory()}
              disabled={historyLoading}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {t('historyRefresh')}
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t('historyFilterAction')}
              <Select
                value={historyAction}
                onChange={(e) => {
                  setHistoryPage(1);
                  setHistoryAction(e.target.value as QuickbooksRemapHistoryAction | 'all');
                }}
                className="h-9 text-sm"
              >
                <option value="all">{t('historyFilterAll')}</option>
                <option value="updated">{t('historyActionUpdated')}</option>
                <option value="matched_dry_run">{t('historyActionDryRun')}</option>
                <option value="error">{t('historyActionError')}</option>
              </Select>
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t('historyFilterSource')}
              <Select
                value={historySource}
                onChange={(e) => {
                  setHistoryPage(1);
                  setHistorySource(e.target.value as QuickbooksRemapHistorySource | 'all');
                }}
                className="h-9 text-sm"
              >
                <option value="all">{t('historyFilterAll')}</option>
                <option value="admin">{t('historySourceAdmin')}</option>
                <option value="cron">{t('historySourceCron')}</option>
                <option value="webhook">{t('historySourceWebhook')}</option>
                <option value="script">{t('historySourceScript')}</option>
              </Select>
            </label>
          </div>

          {historyLoading ? (
            <p className={`${adminBodyMuted} mt-4 inline-flex items-center gap-2`}>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('historyLoading')}
            </p>
          ) : historyError ? (
            <p className="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">
              {historyError}
            </p>
          ) : history.length === 0 ? (
            <p className={`${adminBodyMuted} mt-4`}>{t('historyEmpty')}</p>
          ) : (
            <div className="mt-4 space-y-3">
              <p className={adminBodyMuted}>
                {t('historyCount', { total: historyTotal })}
              </p>
              <div className="overflow-x-auto rounded-md border border-neutral-200/70 dark:border-neutral-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/50 dark:text-neutral-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t('historyColWhen')}</th>
                      <th className="px-3 py-2 font-medium">{t('historyColSource')}</th>
                      <th className="px-3 py-2 font-medium">{t('historyColAction')}</th>
                      <th className="px-3 py-2 font-medium">{t('colDocNumber')}</th>
                      <th className="px-3 py-2 font-medium">{t('historyColFromTo')}</th>
                      <th className="px-3 py-2 font-medium">{t('historyColActor')}</th>
                      <th className="px-3 py-2 font-medium">{t('colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => {
                      const docLabel = row.doc_number || row.invoice_id;
                      return (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t border-neutral-200/70 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/40"
                        tabIndex={0}
                        role="button"
                        aria-label={t('historyRowOpen', { docNumber: docLabel })}
                        onClick={() => setSelectedHistory(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedHistory(row);
                          }
                        }}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          {formatWhen(row.created_at)}
                        </td>
                        <td className="px-3 py-2">{sourceLabel(row.source)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.action === 'updated'
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                                : row.action === 'error'
                                  ? 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200'
                                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                            }`}
                          >
                            {actionLabel(row.action)}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-[#006b5f]">
                          {docLabel}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {row.source_item_name} → {row.target_item_name || '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {row.actor_email || '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {row.error_message ||
                            (row.matched_line_ids.length
                              ? t('historyLinesChanged', {
                                  count: row.matched_line_ids.length,
                                })
                              : '—')}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {historyTotalPages > 1 ? (
                <div className="flex items-center justify-between gap-2">
                  <p className={adminBodyMuted}>
                    {t('historyPagination', {
                      page: historyPage,
                      pages: historyTotalPages,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={historyPage <= 1 || historyLoading}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      {t('historyPrevious')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={historyPage >= historyTotalPages || historyLoading}
                      onClick={() =>
                        setHistoryPage((p) => Math.min(historyTotalPages, p + 1))
                      }
                      className="gap-1"
                    >
                      {t('historyNext')}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Modal
          open={selectedHistory != null}
          onClose={() => setSelectedHistory(null)}
          className="max-w-lg"
          ariaLabelledBy="qbo-history-detail-title"
        >
          {selectedHistory ? (
            <ModalContent className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="qbo-history-detail-title"
                    className="text-base font-medium text-neutral-900 dark:text-neutral-100"
                  >
                    {t('historyDetailTitle')}
                  </h2>
                  <p className={`${adminBodyMuted} mt-1 font-mono text-xs`}>
                    {selectedHistory.doc_number || selectedHistory.invoice_id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistory(null)}
                  className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                  aria-label={t('historyDetailClose')}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <dl className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    {t('historyDetailDocNumber')}
                  </dt>
                  <dd className="font-mono text-xs">
                    {selectedHistory.doc_number || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    {t('historyDetailInvoiceId')}
                  </dt>
                  <dd className="font-mono text-xs">{selectedHistory.invoice_id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    {t('historyDetailTxnDate')}
                  </dt>
                  <dd>{selectedHistory.txn_date || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    {t('historyDetailWhen')}
                  </dt>
                  <dd>{formatWhen(selectedHistory.created_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    {t('historyDetailAction')}
                  </dt>
                  <dd>{actionLabel(selectedHistory.action)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    {t('historyDetailSource')}
                  </dt>
                  <dd>{sourceLabel(selectedHistory.source)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    {t('historyDetailChange')}
                  </dt>
                  <dd className="text-right text-xs">
                    {selectedHistory.source_item_name} →{' '}
                    {selectedHistory.target_item_name || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    {t('historyDetailActor')}
                  </dt>
                  <dd className="text-right text-xs">
                    {selectedHistory.actor_email || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    {t('historyDetailStatus')}
                  </dt>
                  <dd className="text-right text-xs">
                    {selectedHistory.error_message ||
                      (selectedHistory.matched_line_ids.length
                        ? t('historyLinesChanged', {
                            count: selectedHistory.matched_line_ids.length,
                          })
                        : '—')}
                  </dd>
                </div>
                {selectedHistory.matched_line_ids.length > 0 ? (
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400">
                      {t('historyDetailLines')}
                    </dt>
                    <dd className="mt-1 font-mono text-xs">
                      {selectedHistory.matched_line_ids.join(', ')}
                    </dd>
                  </div>
                ) : null}
                {selectedHistory.matched_descriptions.length > 0 ? (
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400">
                      {t('historyDetailDescriptions')}
                    </dt>
                    <dd className="mt-1 text-xs">
                      {selectedHistory.matched_descriptions.join(' · ')}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedHistory(null)}
                >
                  {t('historyDetailClose')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const environment = status?.environment ?? 'sandbox';
                    window.open(
                      quickbooksInvoiceUiUrl(environment, selectedHistory.invoice_id),
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  {t('historyDetailOpenQbo')}
                </Button>
              </div>
            </ModalContent>
          ) : null}
        </Modal>
      </div>
    </main>
  );
}
