'use client';

import { Modal, ModalContent } from '@/components/ui/Modal';
import { useTranslations } from 'next-intl';

export type SageAiConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function SageAiConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  busy = false,
  onConfirm,
  onClose,
}: SageAiConfirmDialogProps) {
  const t = useTranslations('admin.sageAi');

  return (
    <Modal open={open} onClose={onClose} className="max-w-[400px]" ariaLabelledBy="sage-ai-confirm-title">
      <ModalContent className="p-5">
        <h2
          id="sage-ai-confirm-title"
          className="text-base font-semibold text-gray-900 dark:text-gray-100"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50"
          >
            {cancelLabel ?? t('confirmCancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-sage-600 hover:bg-sage-700'
            }`}
          >
            {confirmLabel ?? t('confirmDelete')}
          </button>
        </div>
      </ModalContent>
    </Modal>
  );
}
