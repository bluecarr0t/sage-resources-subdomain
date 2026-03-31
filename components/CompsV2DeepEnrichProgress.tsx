'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

type StepDef = {
  id: string;
  minDisplayMs: number;
  tailEstimateSec: number;
};

const DEEP_STEPS: StepDef[] = [
  { id: 'deepPrepare', minDisplayMs: 900, tailEstimateSec: 95 },
  { id: 'deepFetch', minDisplayMs: 4800, tailEstimateSec: 72 },
  { id: 'deepAi', minDisplayMs: 6500, tailEstimateSec: 38 },
  { id: 'finalize', minDisplayMs: 450, tailEstimateSec: 0 },
];

const STEP_ACCENTS: Record<
  string,
  {
    doneText: string;
    doneIcon: string;
    activeText: string;
    activeIcon: string;
    activeRow: string;
    activeRing: string;
    pendingText: string;
    pendingIcon: string;
  }
> = {
  deepPrepare: {
    doneText: 'text-violet-700 dark:text-violet-300',
    doneIcon: 'text-violet-500 dark:text-violet-400',
    activeText: 'text-violet-900 dark:text-violet-100',
    activeIcon: 'text-violet-600 dark:text-violet-400',
    activeRow: 'bg-violet-50/90 dark:bg-violet-950/35',
    activeRing: 'ring-violet-200/90 dark:ring-violet-800/50',
    pendingText: 'text-gray-500 dark:text-gray-500',
    pendingIcon: 'text-violet-200 dark:text-violet-900/50',
  },
  deepFetch: {
    doneText: 'text-teal-700 dark:text-teal-300',
    doneIcon: 'text-teal-500 dark:text-teal-400',
    activeText: 'text-teal-950 dark:text-teal-100',
    activeIcon: 'text-teal-600 dark:text-teal-400',
    activeRow: 'bg-teal-50/90 dark:bg-teal-950/35',
    activeRing: 'ring-teal-200/90 dark:ring-teal-800/50',
    pendingText: 'text-gray-500 dark:text-gray-500',
    pendingIcon: 'text-teal-200 dark:text-teal-900/50',
  },
  deepAi: {
    doneText: 'text-amber-800 dark:text-amber-300',
    doneIcon: 'text-amber-500 dark:text-amber-400',
    activeText: 'text-amber-950 dark:text-amber-100',
    activeIcon: 'text-amber-600 dark:text-amber-400',
    activeRow: 'bg-amber-50/90 dark:bg-amber-950/30',
    activeRing: 'ring-amber-200/90 dark:ring-amber-800/50',
    pendingText: 'text-gray-500 dark:text-gray-500',
    pendingIcon: 'text-amber-200 dark:text-amber-900/50',
  },
  finalize: {
    doneText: 'text-sage-800 dark:text-sage-300',
    doneIcon: 'text-sage-600 dark:text-sage-400',
    activeText: 'text-sage-900 dark:text-sage-50',
    activeIcon: 'text-sage-600 dark:text-sage-400',
    activeRow: 'bg-sage-50/90 dark:bg-sage-900/35',
    activeRing: 'ring-sage-200/90 dark:ring-sage-800/50',
    pendingText: 'text-gray-500 dark:text-gray-500',
    pendingIcon: 'text-sage-200 dark:text-sage-900/50',
  },
};

function accentsForStep(id: string) {
  return STEP_ACCENTS[id] ?? STEP_ACCENTS.finalize;
}

function sleep(ms: number, timers: number[]): Promise<void> {
  return new Promise((resolve) => {
    const id = window.setTimeout(resolve, ms);
    timers.push(id);
  });
}

async function sleepUpTo(
  maxMs: number,
  serverCompleteRef: MutableRefObject<boolean>,
  timers: number[],
  pollMs = 120
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (serverCompleteRef.current) return;
    const elapsed = Date.now() - start;
    const chunk = Math.min(pollMs, maxMs - elapsed);
    await sleep(chunk, timers);
    if (serverCompleteRef.current) return;
  }
}

interface CompsV2DeepEnrichProgressProps {
  runId: number;
  serverComplete: boolean;
  onComplete: () => void;
}

/**
 * Step list while deep enrichment POST is in flight (scrape + Tavily + OpenAI per property).
 * Pacing mirrors discovery progress: advances until the server responds, then a short finalize step.
 */
export default function CompsV2DeepEnrichProgress({
  runId,
  serverComplete,
  onComplete,
}: CompsV2DeepEnrichProgressProps) {
  const t = useTranslations('admin.compsV2');
  const steps = useMemo(() => DEEP_STEPS, []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const serverCompleteRef = useRef(serverComplete);
  const onCompleteRef = useRef(onComplete);
  const stepsRef = useRef(steps);
  const finishedRef = useRef(false);

  serverCompleteRef.current = serverComplete;
  onCompleteRef.current = onComplete;
  stepsRef.current = steps;

  useEffect(() => {
    finishedRef.current = false;
    const finalizeIdx = steps.length - 1;
    const lastWorkIdx = finalizeIdx - 1;

    setActiveIndex(0);
    setSecondsLeft(steps[0]?.tailEstimateSec ?? 0);

    const timers: number[] = [];
    let cancelled = false;

    void (async () => {
      for (let i = 0; i < finalizeIdx; i++) {
        if (cancelled) return;
        setActiveIndex(i);
        setSecondsLeft(steps[i].tailEstimateSec);
        await sleepUpTo(steps[i].minDisplayMs, serverCompleteRef, timers);
        if (cancelled) return;
        if (serverCompleteRef.current) break;
      }

      if (!serverCompleteRef.current && !cancelled) {
        setActiveIndex(lastWorkIdx);
        setSecondsLeft(steps[lastWorkIdx].tailEstimateSec);
        while (!cancelled && !serverCompleteRef.current) {
          await sleep(500, timers);
          if (cancelled) return;
          setSecondsLeft((s) => Math.max(8, s > 15 ? s - 1 : s));
        }
      }

      if (cancelled) return;

      const fin = stepsRef.current.length - 1;
      setActiveIndex(fin);
      setSecondsLeft(0);
      await sleepUpTo(stepsRef.current[fin].minDisplayMs, serverCompleteRef, timers);
      if (cancelled || finishedRef.current) return;
      finishedRef.current = true;
      onCompleteRef.current();
    })();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [runId, steps]);

  const stepLabel = (id: string) => {
    switch (id) {
      case 'deepPrepare':
        return t('deepStepPrepare');
      case 'deepFetch':
        return t('deepStepFetch');
      case 'deepAi':
        return t('deepStepAi');
      case 'finalize':
        return t('deepStepFinalize');
      default:
        return id;
    }
  };

  return (
    <div
      className="rounded-xl border border-gray-200/90 dark:border-gray-700 bg-gradient-to-b from-white to-gray-50/90 dark:from-gray-900/80 dark:to-gray-950/60 p-4 space-y-3 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy={!serverComplete}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('deepProgressTitle')}</p>
        <p className="text-sm tabular-nums font-medium text-sage-700 dark:text-sage-400">
          {secondsLeft > 0
            ? t('discoveryTimeRemaining', { seconds: Math.max(8, secondsLeft) })
            : t('discoveryAlmostDone')}
        </p>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('deepProgressHint')}</p>
      <ol className="space-y-1.5">
        {steps.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          const a = accentsForStep(step.id);
          const rowClass = done
            ? a.doneText
            : active
              ? `${a.activeText} font-medium ${a.activeRow} ring-1 ${a.activeRing} shadow-sm`
              : a.pendingText;
          return (
            <li
              key={step.id}
              className={`flex gap-3 items-center rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${rowClass}`}
            >
              <span className="shrink-0" aria-hidden>
                {done ? (
                  <CheckCircle2 className={`h-5 w-5 ${a.doneIcon}`} strokeWidth={2.25} />
                ) : active ? (
                  <Loader2 className={`h-5 w-5 animate-spin ${a.activeIcon}`} strokeWidth={2.25} />
                ) : (
                  <Circle className={`h-5 w-5 ${a.pendingIcon}`} strokeWidth={1.75} />
                )}
              </span>
              <span className="min-w-0 leading-snug">{stepLabel(step.id)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
