'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SageAiSessionUsageSummary } from '@/lib/sage-ai/session-usage';
import { formatSageAiModelLabel, formatTokenCount } from '@/lib/sage-ai/format-usage';

type Props = {
  sessionId: string | null;
  /** When this increments, usage is refetched (e.g. after a chat turn completes). */
  refreshKey: number;
};

export function SageAiThreadUsageBar({ sessionId, refreshKey }: Props) {
  const t = useTranslations('admin.sageAi');
  const [usage, setUsage] = useState<SageAiSessionUsageSummary | null>(null);
  const fetchGenRef = useRef(0);

  const loadUsage = useCallback(async (id: string) => {
    const gen = ++fetchGenRef.current;
    try {
      const res = await fetch(`/api/admin/sage-ai/sessions/${encodeURIComponent(id)}/usage`);
      if (!res.ok) {
        if (gen === fetchGenRef.current) setUsage(null);
        return;
      }
      const json = (await res.json()) as SageAiSessionUsageSummary;
      if (gen === fetchGenRef.current) setUsage(json);
    } catch {
      if (gen === fetchGenRef.current) setUsage(null);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setUsage(null);
      return;
    }
    void loadUsage(sessionId);
  }, [sessionId, refreshKey, loadUsage]);

  if (!sessionId || !usage?.lastTurn) return null;

  const { lastTurn, threadTotal } = usage;
  const lastTotal =
    lastTurn.totalTokens ??
    (lastTurn.inputTokens ?? 0) + (lastTurn.outputTokens ?? 0);

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400"
      aria-live="polite"
    >
      <span>
        {t('usageLastTurn', {
          tokens: formatTokenCount(lastTotal),
          model: formatSageAiModelLabel(lastTurn.model),
        })}
      </span>
      {threadTotal.turnCount > 1 ? (
        <span>
          {t('usageThreadTotal', {
            tokens: formatTokenCount(threadTotal.totalTokens),
            turns: threadTotal.turnCount,
          })}
        </span>
      ) : null}
    </div>
  );
}
