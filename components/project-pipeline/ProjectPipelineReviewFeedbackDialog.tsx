'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Modal, ModalContent } from '@/components/ui';
import { getReviewStatusDisplayLabel } from '@/lib/project-pipeline/review-status';
import { isProjectPipelineReviewStatusChangesRequested } from '@/lib/project-pipeline/review-workflow';

interface ProjectPipelineReviewFeedbackDialogProps {
  open: boolean;
  reviewStatus: string;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (note: string) => void | Promise<void>;
}

export function ProjectPipelineReviewFeedbackDialog({
  open,
  reviewStatus,
  saving = false,
  error = null,
  onClose,
  onConfirm,
}: ProjectPipelineReviewFeedbackDialogProps) {
  const t = useTranslations('admin.projectPipeline');
  const [note, setNote] = useState('');
  const requiresNote = isProjectPipelineReviewStatusChangesRequested(reviewStatus);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void onConfirm(note);
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-md" ariaLabelledBy="review-feedback-title">
      <ModalContent>
        <form onSubmit={handleSubmit} className="p-6">
          <h2
            id="review-feedback-title"
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {t('reviewFeedbackTitle')}
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {t('reviewFeedbackSubtitle', {
              status: getReviewStatusDisplayLabel(reviewStatus),
            })}
          </p>

          <label
            htmlFor="review-feedback-note"
            className="mt-4 mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {requiresNote ? t('reviewFeedbackNoteRequired') : t('reviewFeedbackNoteOptional')}
          </label>
          <textarea
            id="review-feedback-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            required={requiresNote}
            placeholder={t('reviewFeedbackNotePlaceholder')}
            className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />

          {error ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {t('cancelJobEdit')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || (requiresNote && !note.trim())}
            >
              {saving ? t('savingJobEdit') : t('reviewFeedbackConfirm')}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
