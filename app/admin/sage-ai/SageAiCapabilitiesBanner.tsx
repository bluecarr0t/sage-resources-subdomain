'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type {
  SageAiCapabilityKey,
  SageAiServerCapabilities,
} from '@/lib/sage-ai/server-capabilities';
import { SAGE_AI_TOOL_FAMILY_KEYS } from '@/lib/sage-ai/server-capabilities';

const CAPABILITY_LABEL_KEYS: Record<SageAiCapabilityKey, string> = {
  visualization: 'capabilitiesVisualization',
  geo: 'capabilitiesGeo',
  semanticSearch: 'capabilitiesSemanticSearch',
  composedTools: 'capabilitiesComposedTools',
  webResearch: 'capabilitiesWebResearch',
  streamResume: 'capabilitiesStreamResume',
};

export function SageAiCapabilitiesBanner() {
  const t = useTranslations('admin.sageAi');
  const [data, setData] = useState<SageAiServerCapabilities | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/sage-ai/capabilities');
        if (!res.ok) return;
        const json = (await res.json()) as SageAiServerCapabilities;
        if (!cancelled) setData(json);
      } catch {
        /* banner is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const toolFamilies = data.capabilities.filter((c) =>
    SAGE_AI_TOOL_FAMILY_KEYS.includes(c.key as (typeof SAGE_AI_TOOL_FAMILY_KEYS)[number])
  );
  const offCount = toolFamilies.filter((c) => !c.enabled).length;

  return (
    <div
      className={`border-b px-4 py-2 ${
        offCount > 0
          ? 'border-amber-200/80 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/40'
          : 'border-neutral-200/75 bg-neutral-50/90 dark:border-neutral-800 dark:bg-neutral-900/40'
      }`}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('capabilitiesConfigLabel')}
          </span>
          {toolFamilies.map((cap) => (
            <span
              key={cap.key}
              title={
                cap.enabled
                  ? t('capabilitiesOn')
                  : t('capabilitiesOffEnvHint', { name: t(CAPABILITY_LABEL_KEYS[cap.key]) })
              }
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                cap.enabled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                  : 'bg-gray-200/80 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  cap.enabled ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'
                }`}
                aria-hidden
              />
              {t(CAPABILITY_LABEL_KEYS[cap.key])}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {offCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100/80 dark:text-amber-100 dark:hover:bg-amber-900/40"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  {t('capabilitiesShowLess')}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  {t('capabilitiesOffCount', { count: offCount })}
                </>
              )}
            </button>
          ) : null}
          <Link
            href={data.adminDocsHref}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-sage-700 hover:bg-sage-100/80 dark:text-sage-300 dark:hover:bg-sage-900/40"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {t('capabilitiesDocsLink')}
          </Link>
        </div>
      </div>
      {expanded && offCount > 0 ? (
        <p className="mx-auto mt-2 max-w-3xl text-xs text-amber-800/90 dark:text-amber-200/80">
          {t('capabilitiesBannerHint')}
        </p>
      ) : null}
    </div>
  );
}
