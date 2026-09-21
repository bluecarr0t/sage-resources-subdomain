'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Card, Input } from '@/components/ui';
import { ClientPortalStatusTracker } from '@/components/client-portal/ClientPortalStatusTracker';
import { CLIENT_PORTAL_PATH } from '@/lib/client-portal/constants';
import { supabase } from '@/lib/supabase';
import type { ClientPortalWorkspace } from '@/lib/client-portal/types';

function requestStatusLabel(
  t: ReturnType<typeof useTranslations<'clientPortal'>>,
  status: string
): string {
  switch (status) {
    case 'open':
      return t('requestOpen');
    case 'submitted':
      return t('requestSubmitted');
    case 'cleared':
      return t('requestCleared');
    default:
      return status;
  }
}

export function ClientPortalWorkspaceView({
  jobNumber,
  initialWorkspace,
  isStaff,
}: {
  jobNumber: string;
  initialWorkspace: ClientPortalWorkspace;
  isStaff: boolean;
}) {
  const t = useTranslations('clientPortal');
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [responseById, setResponseById] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitRequest(event: FormEvent, requestId: string) {
    event.preventDefault();
    setSubmittingId(requestId);
    setError(null);
    try {
      const res = await fetch(
        `/api/client-portal/engagements/${encodeURIComponent(jobNumber)}/requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId,
            response: responseById[requestId] ?? '',
          }),
        }
      );
      const data = (await res.json()) as { workspace?: ClientPortalWorkspace; error?: string };
      if (!res.ok || !data.workspace) {
        setError(data.error || t('requestError'));
        return;
      }
      setWorkspace(data.workspace);
    } catch {
      setError(t('requestError'));
    } finally {
      setSubmittingId(null);
    }
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('file');
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) return;
    const body = new FormData();
    body.append('file', fileInput.files[0]);
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/client-portal/engagements/${encodeURIComponent(jobNumber)}/files`,
        { method: 'POST', body }
      );
      const data = (await res.json()) as { workspace?: ClientPortalWorkspace; error?: string };
      if (!res.ok || !data.workspace) {
        setError(data.error || t('requestError'));
        return;
      }
      setWorkspace(data.workspace);
      form.reset();
    } catch {
      setError(t('requestError'));
    } finally {
      setUploading(false);
    }
  }

  const { job } = workspace;

  return (
    <div className="space-y-8">
      <Link
        href={CLIENT_PORTAL_PATH}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-800 hover:text-sage-900 hover:underline dark:text-sage-200 dark:hover:text-sage-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('backToEngagements')}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-sage-800 dark:text-sage-200">{job.service}</p>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {job.jobNumber}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300">
            {job.client}
            {job.propertyLocation ? ` · ${job.propertyLocation}` : ''}
          </p>
          {job.dueDate ? (
            <p className="text-sm text-neutral-500">{t('dueDate', { date: job.dueDate })}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.assign('/client-portal');
          }}
        >
          {t('signOut')}
        </Button>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {t('statusHeading')}
        </h2>
        <ClientPortalStatusTracker stage={job.stage} blocked={job.blocked} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {t('notesHeading')}
        </h2>
        {workspace.updates.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('notesEmpty')}</p>
        ) : (
          <ul className="space-y-3">
            {workspace.updates.map((update) => (
              <li key={update.id}>
                <Card>
                  <p className="whitespace-pre-wrap text-neutral-800 dark:text-neutral-100">
                    {update.body}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {update.createdByDisplayName} · {new Date(update.createdAt).toLocaleString()}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {t('requestsHeading')}
        </h2>
        {workspace.requests.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('requestsEmpty')}</p>
        ) : (
          <ul className="space-y-3">
            {workspace.requests.map((item) => (
              <li key={item.id}>
                <Card className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-50">
                        {item.title}
                      </p>
                      {item.body ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">
                          {item.body}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      {requestStatusLabel(t, item.status)}
                    </span>
                  </div>
                  {item.clientResponse ? (
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">
                      {item.clientResponse}
                    </p>
                  ) : null}
                  {item.status === 'open' && !isStaff ? (
                    <form className="space-y-2" onSubmit={(event) => void submitRequest(event, item.id)}>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {t('responseLabel')}
                      </label>
                      <textarea
                        value={responseById[item.id] ?? ''}
                        onChange={(event) =>
                          setResponseById((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder={t('responsePlaceholder')}
                        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <Button type="submit" disabled={submittingId === item.id}>
                        {submittingId === item.id ? t('submitting') : t('submitRequest')}
                      </Button>
                    </form>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {t('filesHeading')}
        </h2>
        {workspace.files.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('filesEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {workspace.files.map((file) => (
              <li key={file.id}>
                <a
                  href={`/api/client-portal/engagements/${encodeURIComponent(jobNumber)}/files/${file.id}`}
                  className="text-sm font-medium text-sage-800 hover:underline dark:text-sage-200"
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.label || t('downloadFile')}
                </a>
              </li>
            ))}
          </ul>
        )}
        {!isStaff && workspace.engagement?.enabled ? (
          <form className="space-y-3" onSubmit={(event) => void uploadFile(event)}>
            <Input type="file" name="file" label={t('uploadLabel')} required />
            <Button type="submit" disabled={uploading}>
              {uploading ? t('uploading') : t('uploadLabel')}
            </Button>
          </form>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
