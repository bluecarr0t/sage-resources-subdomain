'use client';

/**
 * Per-message thumbs-up / thumbs-down controls for Sage AI assistant
 * responses. Posts to `/api/admin/sage-ai/feedback` and notifies the parent
 * via `onChange` so the surrounding `messageMeta` cache stays in sync.
 *
 * Extracted from SageAiClient.tsx to start chipping away at that monolith;
 * the component owns no chat state, so it ports cleanly with just the props
 * already in use.
 */

import { useCallback, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface FeedbackControlsProps {
  sessionId: string;
  messageId: string;
  model: string;
  initial?: { rating: 1 | -1 };
  onChange: (value: { rating: 1 | -1 } | null) => void;
  onError: (msg: string) => void;
}

export function FeedbackControls({
  sessionId,
  messageId,
  model,
  initial,
  onChange,
  onError,
}: FeedbackControlsProps) {
  const t = useTranslations('admin.sageAi');
  const [pending, setPending] = useState<0 | 1 | -1>(0);
  const current = initial?.rating ?? 0;

  const submit = useCallback(
    async (next: 1 | -1) => {
      // Tapping the already-active rating clears it (rating: 0 server-side).
      const nextValue = current === next ? 0 : next;
      setPending(nextValue === 0 ? next : nextValue);
      try {
        const res = await fetch('/api/admin/sage-ai/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            messageId,
            rating: nextValue,
            model,
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        onChange(nextValue === 0 ? null : { rating: nextValue });
      } catch (err) {
        console.error('[sage-ai] feedback submit failed', err);
        onError(t('toastFailedSaveFeedback'));
      } finally {
        setPending(0);
      }
    },
    [current, messageId, model, onChange, onError, sessionId, t]
  );

  return (
    <div className="mt-3 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
      <button
        type="button"
        aria-label={t('feedbackHelpfulAria')}
        aria-pressed={current === 1}
        disabled={pending !== 0}
        onClick={() => submit(1)}
        className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
          current === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        aria-label={t('feedbackUnhelpfulAria')}
        aria-pressed={current === -1}
        disabled={pending !== 0}
        onClick={() => submit(-1)}
        className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
          current === -1 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
