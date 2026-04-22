'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Check, ChevronDown, DollarSign, Globe } from 'lucide-react';
import {
  SAGE_AI_CHAT_MODELS,
  type SageAiChatGatewayModelId,
  type SageAiModelSelection,
  isAllowedSageAiChatModel,
  migrateLegacySageAiChatModelId,
} from '@/lib/sage-ai/sage-ai-chat-models';

export const SAGE_AI_MODEL_STORAGE_KEY = 'sage-ai-model-selection-v1';
/**
 * When the user opts in via the Premium Models toggle, we persist that choice
 * locally so it survives reloads. We deliberately keep this separate from the
 * model selection itself (which is server-validated against the allowlist) —
 * unlocking just removes the UI gate; the server still validates the model id.
 */
export const SAGE_AI_PREMIUM_MODELS_STORAGE_KEY = 'sage-ai-premium-models-unlocked-v1';

/** When true, the Web Research toggle becomes interactive; backend wiring can follow. */
export const SAGE_AI_WEB_RESEARCH_UI_ENABLED = false;

/** Legacy `{ k: 'auto' | 'premium' | 'm', id? }` or current `{ modelId }`. */
type StoredSelection =
  | { k: 'auto' }
  | { k: 'premium' }
  | { k: 'm'; id: string }
  | { modelId: string };

export function sageAiSelectionToStorage(s: SageAiModelSelection): Pick<SageAiModelSelection, 'modelId'> {
  return { modelId: s.modelId };
}

export function sageAiSelectionFromStorage(raw: unknown): SageAiModelSelection | null {
  if (!raw || typeof raw !== 'object') return null;
  if ('modelId' in raw && typeof (raw as { modelId: unknown }).modelId === 'string') {
    const id = migrateLegacySageAiChatModelId((raw as { modelId: string }).modelId);
    if (isAllowedSageAiChatModel(id)) return { modelId: id };
    return null;
  }
  const o = raw as StoredSelection;
  if ('k' in o && o.k === 'auto') return { modelId: 'anthropic/claude-haiku-4.5' };
  if ('k' in o && o.k === 'premium') return { modelId: 'anthropic/claude-haiku-4.5' };
  if ('k' in o && o.k === 'm' && typeof o.id === 'string') {
    const id = migrateLegacySageAiChatModelId(o.id);
    if (isAllowedSageAiChatModel(id)) return { modelId: id };
  }
  return null;
}

const MODEL_LABEL_KEYS: Record<SageAiChatGatewayModelId, string> = {
  'openai/gpt-5.4-nano': 'modelOpenaiGpt54Nano',
  'anthropic/claude-sonnet-4.5': 'modelAnthropicSonnet45',
  'anthropic/claude-haiku-4.5': 'modelAnthropicHaiku45',
  'anthropic/claude-opus-4.7': 'modelAnthropicOpus47',
};

const TIER_LABEL_KEYS = {
  fast: 'modelTierFast',
  medium: 'modelTierMedium',
  high: 'modelTierHigh',
} as const;

const MODEL_UI_DISABLED_REASON: Partial<Record<SageAiChatGatewayModelId, string>> = {
  'anthropic/claude-opus-4.7': 'modelOpusUiDisabled',
  'anthropic/claude-sonnet-4.5': 'modelSonnetUiDisabled',
};

/**
 * Models flagged as "premium" — hidden by default, surfaced (with a `$$`
 * cost indicator) when the user enables the Premium Models toggle. Keep this
 * in sync with the `uiDisabled` flag in `SAGE_AI_CHAT_MODELS`; we use this
 * set as the canonical UI gate so we can decorate rows that are *currently*
 * unlocked but still cost more.
 */
const PREMIUM_MODEL_IDS: ReadonlySet<SageAiChatGatewayModelId> = new Set([
  'anthropic/claude-opus-4.7',
  'anthropic/claude-sonnet-4.5',
]);

export function sageAiTriggerLabel(
  selection: SageAiModelSelection,
  t: (key: string) => string
): string {
  return t(MODEL_LABEL_KEYS[selection.modelId]);
}

type SageAiModelPickerProps = {
  selection: SageAiModelSelection;
  onSelectionChange: (next: SageAiModelSelection) => void;
  /** Controlled Web Research toggle (default off in parent). */
  webResearchEnabled: boolean;
  onWebResearchChange: (next: boolean) => void;
  /**
   * When true, the picker reveals premium models (Claude Opus 4.7, Sonnet 4.5)
   * as selectable rows decorated with a `$$` cost indicator. When false, those
   * rows render disabled with a tooltip — current behavior.
   */
  premiumModelsUnlocked: boolean;
  onPremiumModelsUnlockedChange: (next: boolean) => void;
  disabled?: boolean;
};

export function SageAiModelPicker({
  selection,
  onSelectionChange,
  webResearchEnabled,
  onWebResearchChange,
  premiumModelsUnlocked,
  onPremiumModelsUnlockedChange,
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
    (id: SageAiChatGatewayModelId) => selection.modelId === id,
    [selection.modelId]
  );

  return (
    <div className="flex min-w-0 items-center gap-1" ref={rootRef}>
      <div className="relative min-w-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 max-w-[200px] items-center gap-1 rounded-lg px-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:text-gray-100 dark:hover:bg-gray-800 min-w-0"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={t('modelTriggerAria')}
        >
          <span className="truncate">{sageAiTriggerLabel(selection, t)}</span>
          <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            className="absolute bottom-full left-0 z-[100] mb-1.5 w-[min(calc(100vw-2rem),320px)] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-900 dark:ring-white/10"
          >
            <div
              className={`border-b border-gray-200 px-2 pb-2 pt-1 dark:border-gray-700 ${
                SAGE_AI_WEB_RESEARCH_UI_ENABLED ? '' : 'cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Globe className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
                  <span
                    className={`text-sm font-medium ${
                      SAGE_AI_WEB_RESEARCH_UI_ENABLED
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {t('webResearchLabel')}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={webResearchEnabled}
                  disabled={!SAGE_AI_WEB_RESEARCH_UI_ENABLED}
                  aria-label={
                    SAGE_AI_WEB_RESEARCH_UI_ENABLED
                      ? t('webResearchAria')
                      : t('webResearchAriaDisabled')
                  }
                  title={
                    SAGE_AI_WEB_RESEARCH_UI_ENABLED ? undefined : t('webResearchAriaDisabled')
                  }
                  onClick={() => {
                    if (SAGE_AI_WEB_RESEARCH_UI_ENABLED) onWebResearchChange(!webResearchEnabled);
                  }}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
                    webResearchEnabled && SAGE_AI_WEB_RESEARCH_UI_ENABLED
                      ? 'bg-sage-600 dark:bg-sage-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform dark:ring-white/10 ${
                      webResearchEnabled && SAGE_AI_WEB_RESEARCH_UI_ENABLED ? 'translate-x-4' : 'translate-x-0'
                    }`}
                    aria-hidden
                  />
                </button>
              </div>
            </div>
            <div className="border-b border-gray-200 px-2 pb-2 pt-1 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t('premiumModelsLabel')}
                  </span>
                  <span
                    className="flex-shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400"
                    aria-hidden
                  >
                    $$
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={premiumModelsUnlocked}
                  aria-label={t('premiumModelsAria')}
                  title={t('premiumModelsHint')}
                  onClick={() => onPremiumModelsUnlockedChange(!premiumModelsUnlocked)}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
                    premiumModelsUnlocked
                      ? 'bg-amber-500 dark:bg-amber-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform dark:ring-white/10 ${
                      premiumModelsUnlocked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                    aria-hidden
                  />
                </button>
              </div>
            </div>
            <div className="max-h-[min(50vh,360px)] overflow-y-auto px-1 py-1" role="listbox">
              {SAGE_AI_CHAT_MODELS.map((m) => {
                const check = rowSelected(m.id);
                const isPremium = PREMIUM_MODEL_IDS.has(m.id);
                // Premium models are gated unless the user has flipped the
                // toggle. We still keep the existing `uiDisabled` flag in the
                // model definition as the source of truth for what counts as
                // "premium" via PREMIUM_MODEL_IDS.
                const uiDisabled = isPremium && !premiumModelsUnlocked;

                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={check}
                    aria-disabled={uiDisabled}
                    disabled={uiDisabled}
                    title={
                      uiDisabled
                        ? t(MODEL_UI_DISABLED_REASON[m.id] ?? 'modelOpusUiDisabled')
                        : isPremium
                          ? t('premiumModelsHint')
                          : undefined
                    }
                    onClick={() => {
                      if (uiDisabled) return;
                      onSelectionChange({ modelId: m.id });
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm ${
                      uiDisabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className={`truncate font-medium ${
                          uiDisabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {t(MODEL_LABEL_KEYS[m.id])}
                      </span>
                      {isPremium && (
                        <span
                          className={`flex-shrink-0 rounded px-1 text-[10px] font-semibold leading-4 ${
                            uiDisabled
                              ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                          aria-label={t('premiumModelsCostAria')}
                        >
                          $$
                        </span>
                      )}
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
