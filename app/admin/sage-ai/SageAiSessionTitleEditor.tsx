'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Pencil, X } from 'lucide-react';

type Props = {
  sessionId: string;
  title: string;
  onRenamed: (title: string) => void;
  showToast: (msg: string) => void;
  compact?: boolean;
};

export function SageAiSessionTitleEditor({
  sessionId,
  title,
  onRenamed,
  showToast,
  compact = false,
}: Props) {
  const t = useTranslations('admin.sageAi');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  const save = useCallback(async () => {
    const next = draft.trim();
    if (!next || next === title) {
      setEditing(false);
      setDraft(title);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sage-ai/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: next }),
      });
      if (res.ok) {
        const data = await res.json();
        onRenamed(data.session?.title ?? next);
        setEditing(false);
      } else {
        showToast(t('toastRenameSessionFailed'));
      }
    } catch {
      showToast(t('toastRenameSessionFailed'));
    } finally {
      setSaving(false);
    }
  }, [draft, onRenamed, sessionId, showToast, t, title]);

  if (editing) {
    return (
      <div className={`flex items-center gap-1 ${compact ? 'min-w-0 flex-1' : 'w-full px-2 py-1'}`}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
            if (e.key === 'Escape') {
              setDraft(title);
              setEditing(false);
            }
          }}
          disabled={saving}
          maxLength={200}
          className={`min-w-0 flex-1 rounded border border-neutral-200 bg-white px-2 py-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sage-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-100 ${
            compact ? 'text-xs' : 'text-sm'
          }`}
          aria-label={t('renameSessionAria')}
          autoFocus
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !draft.trim()}
          className="p-1 text-sage-600 hover:text-sage-700 disabled:opacity-40"
          aria-label={t('renameSessionSave')}
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(title);
            setEditing(false);
          }}
          disabled={saving}
          className="p-1 text-gray-500 hover:text-gray-700"
          aria-label={t('renameSessionCancel')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-1 ${compact ? 'min-w-0' : 'px-2 py-1'}`}>
      <span
        className={`truncate text-gray-900 dark:text-gray-100 ${
          compact ? 'text-sm font-medium' : 'text-[13px]'
        }`}
      >
        {title}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`rounded p-0.5 text-gray-400 hover:text-sage-600 focus:opacity-100 ${
          compact ? 'opacity-70' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
        }`}
        aria-label={t('renameSessionAria')}
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}
