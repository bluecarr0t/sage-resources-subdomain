'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Check, ChevronDown, Globe } from 'lucide-react';
import {
  SAGE_AI_CHAT_FAST_MODEL,
  SAGE_AI_CHAT_MODELS,
  type SageAiChatGatewayModelId,
  type SageAiModelSelection,
  isAllowedSageAiChatModel,
  migrateLegacySageAiChatModelId,
  sageAiModelForChatRequest,
} from '@/lib/sage-ai/sage-ai-chat-models';

export const SAGE_AI_MODEL_STORAGE_KEY = 'sage-ai-model-selection-v1';

import { SAGE_AI_WEB_RESEARCH_UI_ENABLED } from '@/lib/sage-ai/server-capabilities';

/** When true, the Web Research toggle is interactive; server also requires `SAGE_AI_WEB_RESEARCH_ENABLED=true`. */
export { SAGE_AI_WEB_RESEARCH_UI_ENABLED };

/** Legacy `{ k: 'auto' | 'premium' | 'm', id? }`, `{ modelId }`, or current `{ mode }`. */
type StoredSelection =
  | { k: 'auto' }
  | { k: 'premium' }
  | { k: 'm'; id: string }
  | { modelId: string }
  | { mode: 'auto' }
  | { mode: 'fixed'; modelId: string };

export function sageAiSelectionToStorage(s: SageAiModelSelection): StoredSelection {
  if (s.mode === 'auto') return { mode: 'fixed', modelId: SAGE_AI_CHAT_FAST_MODEL };
  return { mode: 'fixed', modelId: s.modelId };
}

export function sageAiSelectionFromStorage(raw: unknown): SageAiModelSelection | null {
  if (!raw || typeof raw !== 'object') return null;

  if ('mode' in raw) {
    const mode = (raw as { mode: unknown }).mode;
    if (mode === 'auto') return { mode: 'fixed', modelId: SAGE_AI_CHAT_FAST_MODEL };
    if (mode === 'fixed' && typeof (raw as { modelId?: unknown }).modelId === 'string') {
      const modelId = (raw as unknown as { modelId: string }).modelId;
      const id = migrateLegacySageAiChatModelId(modelId);
      if (isAllowedSageAiChatModel(id)) return { mode: 'fixed', modelId: id };
    }
    return null;
  }

  if ('modelId' in raw && typeof (raw as { modelId: unknown }).modelId === 'string') {
    const id = migrateLegacySageAiChatModelId((raw as { modelId: string }).modelId);
    if (isAllowedSageAiChatModel(id)) return { mode: 'fixed', modelId: id };
    return null;
  }

  const o = raw as StoredSelection;
  if ('k' in o && o.k === 'auto') return { mode: 'fixed', modelId: SAGE_AI_CHAT_FAST_MODEL };
  if ('k' in o && o.k === 'premium') return { mode: 'fixed', modelId: 'anthropic/claude-sonnet-5' };
  if ('k' in o && o.k === 'm' && typeof o.id === 'string') {
    const id = migrateLegacySageAiChatModelId(o.id);
    if (isAllowedSageAiChatModel(id)) return { mode: 'fixed', modelId: id };
  }
  return null;
}

const MODEL_LABEL_KEYS: Record<SageAiChatGatewayModelId, string> = {
  'anthropic/claude-haiku-4.5': 'modelAnthropicHaiku45',
  'anthropic/claude-sonnet-5': 'modelAnthropicSonnet5',
};

const TIER_LABEL_KEYS = {
  fast: 'modelTierFast',
  medium: 'modelTierMedium',
  high: 'modelTierHigh',
} as const;

export function sageAiTriggerLabel(
  selection: SageAiModelSelection,
  t: (key: string) => string
): string {
  if (selection.mode === 'auto') return t(MODEL_LABEL_KEYS[SAGE_AI_CHAT_FAST_MODEL]);
  return t(MODEL_LABEL_KEYS[selection.modelId]);
}

/** Re-export for transport body wiring. */
export { sageAiModelForChatRequest };

type SageAiModelPickerProps = {
  selection: SageAiModelSelection;
  onSelectionChange: (next: SageAiModelSelection) => void;
  /** When false, the web research row is hidden (server env not enabled). */
  webResearchServerEnabled?: boolean;
  /** Controlled Web Research toggle (default off in parent). */
  webResearchEnabled: boolean;
  onWebResearchChange: (next: boolean) => void;
  disabled?: boolean;
};

export function SageAiModelPicker({
  selection,
  onSelectionChange,
  webResearchServerEnabled = false,
  webResearchEnabled,
  onWebResearchChange,
  disabled,
}: SageAiModelPickerProps) {
  const t = useTranslations('admin.sageAi');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const rowSelected = useCallback(
    (next: SageAiModelSelection) => {
      if (selection.mode === 'fixed' && next.mode === 'fixed') {
        return selection.modelId === next.modelId;
      }
      return false;
    },
    [selection]
  );

  return (
    <div className="flex min-w-0 items-center gap-1" ref={rootRef}>
      <div className="relative min-w-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 max-w-[220px] items-center gap-1 rounded-lg px-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:text-gray-100 dark:hover:bg-gray-800 min-w-0"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={t('modelTriggerAria')}
        >
          <span className="truncate">{sageAiTriggerLabel(selection, t)}</span>
          <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            className="absolute bottom-full left-0 z-[100] mb-1.5 w-[min(calc(100vw-2rem),320px)] overflow-hidden rounded-xl border border-neutral-200/70 bg-white py-1 shadow-xl ring-1 ring-black/5 dark:border-neutral-800 dark:bg-neutral-950 dark:ring-white/10"
          >
            {webResearchServerEnabled ? (
              <div className="border-b border-gray-200 px-2 pb-2 pt-1 dark:border-neutral-800">
                <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Globe className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t('webResearchLabel')}
                    </span>
                    <span
                      className="flex-shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400"
                      aria-label={t('webResearchCostAria')}
                    >
                      $$$$
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={webResearchEnabled}
                    aria-label={t('webResearchAria')}
                    onClick={() => onWebResearchChange(!webResearchEnabled)}
                    className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                      webResearchEnabled
                        ? 'bg-sage-600 dark:bg-sage-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform dark:ring-white/10 ${
                        webResearchEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                      aria-hidden
                    />
                  </button>
                </div>
              </div>
            ) : null}
            <div className="max-h-[min(50vh,360px)] overflow-y-auto px-1 py-1" role="listbox">
              {SAGE_AI_CHAT_MODELS.map((m) => {
                const option: SageAiModelSelection = { mode: 'fixed', modelId: m.id };
                const check = rowSelected(option);

                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={check}
                    onClick={() => {
                      onSelectionChange(option);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-neutral-50/90 dark:hover:bg-neutral-900/40"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                        {t(MODEL_LABEL_KEYS[m.id])}
                      </span>
                      <Brain className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden />
                      <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                        {t(TIER_LABEL_KEYS[m.tier])}
                      </span>
                    </div>
                    {check ? <Check className="h-4 w-4 flex-shrink-0 text-gray-700 dark:text-gray-200" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
