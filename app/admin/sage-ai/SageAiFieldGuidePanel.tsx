'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, X } from 'lucide-react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import {
  fieldGuideByCategory,
  GLAMPING_FIELD_GUIDE,
  searchFieldGuide,
  type FieldGuideCategory,
  type FieldGuideEntry,
} from '@/lib/sage-ai/glamping-field-guide';

const CATEGORY_ORDER: FieldGuideCategory[] = [
  'unit',
  'property',
  'activities',
  'setting',
  'rv',
  'geo_status',
];

function buildFieldGuideChatSnippet(t: (key: string, values?: Record<string, string>) => string, row: FieldGuideEntry) {
  const aliasesBlock =
    row.aliases.length > 0
      ? t('fieldGuideChatSnippetAliases', { list: row.aliases.slice(0, 5).join(', ') })
      : '';
  return t('fieldGuideChatSnippet', {
    column: row.column,
    label: row.label,
    toolTip: row.tool_tip,
    aliasesBlock,
  });
}

type SageAiFieldGuidePanelProps = {
  /** Same as the main Sage AI composer; avoids callback props that can be undefined with HMR. */
  setInput: Dispatch<SetStateAction<string>>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

function refocusComposer(
  el: RefObject<HTMLTextAreaElement | null>,
) {
  window.setTimeout(() => {
    const node = el.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
    node.focus();
  }, 0);
}

export function SageAiFieldGuidePanel({ setInput, inputRef }: SageAiFieldGuidePanelProps) {
  const t = useTranslations('admin.sageAi');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const matches = useMemo(() => {
    if (!q.trim()) {
      return fieldGuideByCategory(GLAMPING_FIELD_GUIDE);
    }
    const found = searchFieldGuide(q, 200);
    return fieldGuideByCategory(found);
  }, [q]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        aria-label={t('fieldGuideButtonAria')}
      >
        <BookOpen className="h-3.5 w-3.5" />
        {t('fieldGuideButton')}
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        className="max-w-3xl w-[min(100vw,42rem)]"
      >
        <ModalContent className="p-5 max-h-[min(85vh,720px)] flex flex-col">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t('fieldGuideTitle')}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('fieldGuideIntro')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={t('cancel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('fieldGuideSearchPlaceholder')}
            className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            autoFocus
            aria-label={t('fieldGuideSearchPlaceholder')}
          />
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {CATEGORY_ORDER.map((cat) => {
              const rows = (matches.get(cat) ?? []).filter(Boolean);
              if (rows.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t(`fieldGuideCategory_${cat}`)}
                  </h3>
                  <ul className="space-y-1.5">
                    {rows.map((row) => (
                      <li key={row.column} className="list-none">
                        <button
                          type="button"
                          onClick={() => {
                            const next = buildFieldGuideChatSnippet(t, row).trim();
                            if (next) {
                              setInput((prev) => {
                                const p = prev.trim();
                                if (!p) return next;
                                return `${p}\n\n${next}`;
                              });
                              refocusComposer(inputRef);
                            }
                            setOpen(false);
                          }}
                          className="w-full cursor-pointer rounded-md border border-gray-100 bg-gray-50/80 px-2.5 py-2 text-left text-sm transition-colors hover:border-sage-200 hover:bg-sage-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-sage-500 dark:border-gray-700/80 dark:bg-gray-900/50 dark:hover:border-sage-700 dark:hover:bg-sage-900/30"
                          aria-label={t('fieldGuideRowInsertAria', { column: row.column })}
                        >
                          <div className="font-mono text-xs text-sage-700 dark:text-sage-400">
                            {row.column}
                          </div>
                          <div className="text-gray-900 dark:text-gray-100">{row.label}</div>
                          {row.aliases.length > 0 ? (
                            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {t('fieldGuideAlsoKnown', {
                                list: row.aliases.slice(0, 5).join(', '),
                              })}
                            </div>
                          ) : null}
                          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                            {row.tool_tip}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {q.trim() && CATEGORY_ORDER.every((c) => (matches.get(c) ?? []).length === 0) ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('fieldGuideNoResults')}</p>
            ) : null}
          </div>
          <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-500">
            {t('fieldGuideFooterHint')}
          </p>
        </ModalContent>
      </Modal>
    </>
  );
}
