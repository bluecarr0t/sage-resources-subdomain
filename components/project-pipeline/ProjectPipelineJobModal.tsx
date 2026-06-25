'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, FieldTooltip, Input, Modal, ModalContent, Select } from '@/components/ui';
import { AppraiserConsultantPills } from '@/components/project-pipeline/AppraiserConsultantPills';
import { ProjMgrPill } from '@/components/project-pipeline/ProjMgrPill';
import { ProjectFlagPill } from '@/components/project-pipeline/ProjectFlagPill';
import { ProjectStatusPill } from '@/components/project-pipeline/ProjectStatusPill';
import {
  MORE_DETAIL_FIELDS,
  PRIMARY_DETAIL_FIELDS,
  ProjectPipelineJobModalFields,
  WORKFLOW_DETAIL_FIELDS,
} from '@/components/project-pipeline/ProjectPipelineJobModalFields';
import { ProjectPipelineReviewNotesThread } from '@/components/project-pipeline/ProjectPipelineReviewNotesThread';
import { ReviewStatusSelect } from '@/components/project-pipeline/ReviewStatusSelect';
import { DEFAULT_PROJECT_PIPELINE_SENT_TO_CLIENT } from '@/lib/project-pipeline/sent-to-client';
import {
  canAddProjectPipelineReviewerFeedback,
  canResubmitProjectPipelineForReview,
  canRespondToProjectPipelineReview,
  canSubmitProjectPipelineForReview,
  canViewProjectPipelineReviewNotes,
  isProjectPipelineReviewStatusChangesRequested,
  PROJECT_PIPELINE_REVIEWER_RESPONSE_STATUSES,
} from '@/lib/project-pipeline/review-workflow';
import type { ProjectPipelineReviewNoteType } from '@/lib/project-pipeline/review-notes';
import {
  getReviewStatusDisplayLabel,
  getReviewStatusStyle,
  getShortReviewStatusLabel,
  normalizeProjectPipelineReviewStatus,
} from '@/lib/project-pipeline/review-status';
import {
  getProjectStatusSelectTextClassName,
  PROJECT_PIPELINE_PROJECT_STATUSES,
} from '@/lib/project-pipeline/project-status';
import { withDerivedProjectPipelineProjectStatus } from '@/lib/project-pipeline/derive-project-status';
import {
  getProjectPipelineFlagSelectTextClassName,
  normalizeProjectPipelineFlag,
  PROJECT_PIPELINE_FLAG_VALUES,
} from '@/lib/project-pipeline/project-flag';
import type { ProjectPipelineEditableField, ProjectPipelineJob } from '@/lib/project-pipeline/types';
import {
  isProjectPipelineAllSheetsTab,
  PROJECT_PIPELINE_SHEET_TABS,
} from '@/lib/project-pipeline/sheet-tabs';
import {
  formatProjectPipelineSheetDate,
  getProjectPipelineDueDateEmphasis,
} from '@/lib/project-pipeline/due-date-emphasis';

type JobModalMobileTab = 'review' | 'details';

interface ProjectPipelineJobModalProps {
  job: ProjectPipelineJob | null;
  open: boolean;
  mode?: 'create' | 'edit';
  availableSheetTabs?: { sheetName: string; sheetYear?: number | null }[];
  saving?: boolean;
  saveError?: string | null;
  viewerDisplayName?: string | null;
  viewerIsAdmin?: boolean;
  onClose: () => void;
  onSave: (
    job: ProjectPipelineJob,
    options?: { manualProjectStatus?: boolean; reviewFeedbackNote?: string }
  ) => void | Promise<void>;
  onReviewAction?: (
    action: ProjectPipelineReviewNoteType,
    note: string,
    reviewStatus?: string
  ) => void | Promise<void>;
  reviewActionSaving?: boolean;
  reviewActionError?: string | null;
}

function formatDueDateLabel(value: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '—';
  return formatProjectPipelineSheetDate(trimmed) || trimmed;
}

function getModalDueDateTextClasses(
  emphasis: ReturnType<typeof getProjectPipelineDueDateEmphasis>
): string {
  if (emphasis === 'past-due') {
    return 'font-medium text-red-700 dark:text-red-300';
  }
  if (emphasis === 'due-soon') {
    return 'font-medium text-amber-800 dark:text-amber-200';
  }
  return 'text-neutral-600 dark:text-neutral-400';
}

export function ProjectPipelineJobModal({
  job,
  open,
  mode = 'edit',
  availableSheetTabs = [],
  saving = false,
  saveError = null,
  viewerDisplayName,
  viewerIsAdmin = false,
  onClose,
  onSave,
  onReviewAction,
  reviewActionSaving = false,
  reviewActionError = null,
}: ProjectPipelineJobModalProps) {
  const t = useTranslations('admin.projectPipeline');
  const [draft, setDraft] = useState<ProjectPipelineJob | null>(job);
  const [manualProjectStatusEdit, setManualProjectStatusEdit] = useState(false);
  const [reviewFeedbackNote, setReviewFeedbackNote] = useState('');
  const [reviewActionNote, setReviewActionNote] = useState('');
  const [reviewerResponseStatus, setReviewerResponseStatus] = useState('');
  const [reviewerResponseNote, setReviewerResponseNote] = useState('');
  const [initialReviewStatus, setInitialReviewStatus] = useState('');
  const [reviewValidationError, setReviewValidationError] = useState<string | null>(null);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [notesEditorOpen, setNotesEditorOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<JobModalMobileTab>('details');

  useEffect(() => {
    if (open && job) {
      const normalizedReviewStatus = normalizeProjectPipelineReviewStatus(job.reviewStatus);
      setManualProjectStatusEdit(Boolean(job.projectStatusManual));
      setReviewFeedbackNote('');
      setReviewActionNote('');
      setReviewerResponseStatus('');
      setReviewerResponseNote('');
      setReviewValidationError(null);
      setMoreDetailsOpen(false);
      setNotesEditorOpen(Boolean(job.notes?.trim()));
      setInitialReviewStatus(normalizedReviewStatus);
      setDraft(
        job.projectStatusManual
          ? {
              ...job,
              flag: normalizeProjectPipelineFlag(job.flag),
              notes: job.notes ?? '',
              reviewStatus: normalizedReviewStatus,
              sentToClient: job.sentToClient.trim() || DEFAULT_PROJECT_PIPELINE_SENT_TO_CLIENT,
            }
          : withDerivedProjectPipelineProjectStatus({
              ...job,
              flag: normalizeProjectPipelineFlag(job.flag),
              notes: job.notes ?? '',
              reviewStatus: normalizedReviewStatus,
              sentToClient: job.sentToClient.trim() || DEFAULT_PROJECT_PIPELINE_SENT_TO_CLIENT,
            })
      );

      const canSubmit = canSubmitProjectPipelineForReview(job, viewerDisplayName, {
        isAdmin: viewerIsAdmin,
      });
      const canResubmit = canResubmitProjectPipelineForReview(job, viewerDisplayName, {
        isAdmin: viewerIsAdmin,
      });
      const canRespondToReview = canRespondToProjectPipelineReview(job, viewerDisplayName, {
        isAdmin: viewerIsAdmin,
      });
      setMobileTab(canSubmit || canResubmit || canRespondToReview ? 'review' : 'details');
    }
  }, [open, job, viewerDisplayName, viewerIsAdmin]);

  if (!open || !job || !draft) return null;

  const isCreateMode = mode === 'create';
  const sheetTabOptions =
    availableSheetTabs.length > 0
      ? availableSheetTabs
          .map((tab) => tab.sheetName)
          .filter((name) => !isProjectPipelineAllSheetsTab(name))
      : [...PROJECT_PIPELINE_SHEET_TABS];

  const shouldPreserveManualStatus =
    !isCreateMode && viewerIsAdmin && (manualProjectStatusEdit || draft.projectStatusManual);

  const canViewNotes = canViewProjectPipelineReviewNotes(draft, {
    displayName: viewerDisplayName,
    isAdmin: viewerIsAdmin,
  });
  const canSubmit = canSubmitProjectPipelineForReview(draft, viewerDisplayName, {
    isAdmin: viewerIsAdmin,
  });
  const canResubmit = canResubmitProjectPipelineForReview(draft, viewerDisplayName, {
    isAdmin: viewerIsAdmin,
  });
  const canRespondToReview = canRespondToProjectPipelineReview(draft, viewerDisplayName, {
    isAdmin: viewerIsAdmin,
  });
  const showReviewPanel =
    !isCreateMode &&
    Boolean(onReviewAction) &&
    (canViewNotes || canSubmit || canResubmit || canRespondToReview);
  const showReviewComposer = canSubmit || canResubmit;
  const showReviewerComposer = canRespondToReview;
  const hasReviewNotes = (draft.reviewNotes ?? []).length > 0;

  const headerSubtitle = (() => {
    const parts = draft.jobNumber
      ? [draft.client, draft.propertyLocation]
      : [draft.propertyLocation];
    return parts.map((part) => part?.trim()).filter(Boolean).join(' · ');
  })();
  const dueDateEmphasis = getProjectPipelineDueDateEmphasis(draft);

  const updateField = (field: ProjectPipelineEditableField, value: string) => {
    setDraft((current) => {
      if (!current) return current;

      const nextValue =
        field === 'reviewStatus' ? normalizeProjectPipelineReviewStatus(value) : value;
      const next = { ...current, [field]: nextValue };
      return shouldPreserveManualStatus
        ? next
        : withDerivedProjectPipelineProjectStatus(next);
    });
  };

  const updateProjectStatus = (value: string) => {
    setManualProjectStatusEdit(true);
    setDraft((current) =>
      current ? { ...current, projectStatus: value, projectStatusManual: true } : current
    );
  };

  const updateFlag = (value: string) => {
    setDraft((current) =>
      current ? { ...current, flag: normalizeProjectPipelineFlag(value) } : current
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (isCreateMode && !draft.jobNumber.trim()) {
      setReviewValidationError(t('createJobNumberRequired'));
      return;
    }

    const normalizedReviewStatus = normalizeProjectPipelineReviewStatus(draft.reviewStatus);
    const reviewStatusChanged = normalizedReviewStatus !== initialReviewStatus;
    const canAddReviewerFeedback = canAddProjectPipelineReviewerFeedback(draft, viewerDisplayName, {
      isAdmin: viewerIsAdmin,
    });

    if (
      reviewStatusChanged &&
      canAddReviewerFeedback &&
      isProjectPipelineReviewStatusChangesRequested(normalizedReviewStatus) &&
      !reviewFeedbackNote.trim()
    ) {
      setReviewValidationError(t('reviewFeedbackNoteRequiredError'));
      return;
    }

    setReviewValidationError(null);

    void onSave(draft, {
      manualProjectStatus: viewerIsAdmin && (manualProjectStatusEdit || Boolean(draft.projectStatusManual)),
      reviewFeedbackNote:
        reviewStatusChanged && canAddReviewerFeedback ? reviewFeedbackNote.trim() : undefined,
    });
  };

  const handleReviewAction = async () => {
    if (!onReviewAction) return;
    if (!reviewActionNote.trim()) {
      setReviewValidationError(t('jobModalSubmitHint'));
      return;
    }
    setReviewValidationError(null);
    const action: ProjectPipelineReviewNoteType = canResubmit ? 'resubmit' : 'submit_for_review';
    await onReviewAction(action, reviewActionNote.trim());
    setReviewActionNote('');
  };

  const handleReviewerResponse = async () => {
    if (!onReviewAction) return;

    const normalizedStatus = normalizeProjectPipelineReviewStatus(reviewerResponseStatus);
    if (!normalizedStatus) {
      setReviewValidationError(t('jobModalReviewerStatusRequired'));
      return;
    }

    if (
      isProjectPipelineReviewStatusChangesRequested(normalizedStatus) &&
      !reviewerResponseNote.trim()
    ) {
      setReviewValidationError(t('reviewFeedbackNoteRequiredError'));
      return;
    }

    setReviewValidationError(null);
    await onReviewAction('review_feedback', reviewerResponseNote.trim(), normalizedStatus);
    setReviewerResponseNote('');
    setReviewerResponseStatus('');
  };

  const fieldProps = {
    draft,
    isCreateMode,
    viewerDisplayName,
    viewerIsAdmin,
    initialReviewStatus,
    reviewFeedbackNote,
    onReviewFeedbackNoteChange: setReviewFeedbackNote,
    onFieldChange: updateField,
  };

  const detailsPanel = (
    <div className="space-y-4">
      {isCreateMode ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="pipeline-job-create-job-number"
            label={t('columnJobNumber')}
            value={draft.jobNumber}
            onChange={(e) => updateField('jobNumber', e.target.value)}
            required
          />
          <Select
            id="pipeline-job-create-sheet-name"
            label={t('filterSheetYear')}
            value={draft.pipelineSheetName ?? ''}
            onChange={(e) =>
              setDraft((current) =>
                current ? { ...current, pipelineSheetName: e.target.value } : current
              )
            }
          >
            {sheetTabOptions.map((tabName) => (
              <option key={tabName} value={tabName}>
                {tabName}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {!isCreateMode && viewerIsAdmin ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('columnProjectStatus')}
              <FieldTooltip content={t('projectStatusAdminManual')} />
            </p>
            <Select
              id="pipeline-job-project-status"
              value={draft.projectStatus}
              onChange={(e) => updateProjectStatus(e.target.value)}
              className={getProjectStatusSelectTextClassName(draft.projectStatus)}
            >
              {PROJECT_PIPELINE_PROJECT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('columnFlag')}
              <FieldTooltip content={t('flagAdminHint')} />
            </p>
            <Select
              id="pipeline-job-flag"
              value={normalizeProjectPipelineFlag(draft.flag)}
              onChange={(e) => updateFlag(e.target.value)}
              className={getProjectPipelineFlagSelectTextClassName(draft.flag)}
            >
              {PROJECT_PIPELINE_FLAG_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : null}

      <ProjectPipelineJobModalFields {...fieldProps} fields={PRIMARY_DETAIL_FIELDS} />

      {!isCreateMode ? (
        <>
          <ProjectPipelineJobModalFields {...fieldProps} fields={WORKFLOW_DETAIL_FIELDS} />

          <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setMoreDetailsOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-neutral-800 dark:text-neutral-200"
              aria-expanded={moreDetailsOpen}
            >
              {t('jobModalMoreDetails')}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${
                  moreDetailsOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </button>
            {moreDetailsOpen ? (
              <div className="mt-4">
                <ProjectPipelineJobModalFields {...fieldProps} fields={MORE_DETAIL_FIELDS} />
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <ProjectPipelineJobModalFields
          {...fieldProps}
          fields={[...WORKFLOW_DETAIL_FIELDS, ...MORE_DETAIL_FIELDS]}
        />
      )}
    </div>
  );

  const reviewPanel = (
    <div className="flex flex-col">
      <div className="shrink-0 space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {t('jobModalNotesSectionTitle')}
        </h3>
        {notesEditorOpen ? (
          <>
            <textarea
              id="pipeline-job-notes"
              value={draft.notes ?? ''}
              onChange={(e) =>
                setDraft((current) => (current ? { ...current, notes: e.target.value } : current))
              }
              rows={3}
              placeholder={t('notesPlaceholder')}
              aria-label={t('jobModalInternalNotesLabel')}
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setNotesEditorOpen(true)}
            className="text-sm font-medium text-sage-700 hover:text-sage-800 hover:underline dark:text-sage-400 dark:hover:text-sage-300"
          >
            {t('jobModalAddNoteLink')}
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-700">
        <h3 className="shrink-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {t('jobModalTabReview')}
        </h3>

        {canViewNotes ? (
          hasReviewNotes ? (
            <div className="max-h-56 min-h-[5.5rem] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950/40">
              <ProjectPipelineReviewNotesThread notes={draft.reviewNotes ?? []} />
            </div>
          ) : (
            <ProjectPipelineReviewNotesThread notes={draft.reviewNotes ?? []} />
          )
        ) : null}

        {showReviewComposer ? (
          <div className="shrink-0 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <label
              htmlFor="pipeline-review-action-note"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('reviewActionNoteLabel')}
            </label>
            <textarea
              id="pipeline-review-action-note"
              value={reviewActionNote}
              onChange={(e) => setReviewActionNote(e.target.value)}
              rows={5}
              placeholder={
                canResubmit ? t('jobModalResubmitPlaceholder') : t('reviewActionNotePlaceholder')
              }
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('jobModalReviewComposerHint', { pm: draft.projMgr?.trim() || t('columnProjMgr') })}
            </p>
            {onReviewAction ? (
              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={saving || reviewActionSaving || !reviewActionNote.trim()}
                onClick={() => void handleReviewAction()}
              >
                {reviewActionSaving
                  ? t('reviewActionSubmitting')
                  : canResubmit
                    ? t('submitResubmission')
                    : t('submitForReview')}
              </Button>
            ) : null}
          </div>
        ) : null}

        {showReviewerComposer ? (
          <div className="shrink-0 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <ReviewStatusSelect
              id="pipeline-reviewer-response-status"
              label={t('jobModalReviewerDecisionLabel')}
              value={reviewerResponseStatus}
              onChange={(e) => setReviewerResponseStatus(e.target.value)}
              emptyOptionLabel={t('jobModalReviewerDecisionPlaceholder')}
              statuses={PROJECT_PIPELINE_REVIEWER_RESPONSE_STATUSES}
              showChevron
              className="rounded-lg text-sm"
            />
            <div className="space-y-2">
              <label
                htmlFor="pipeline-reviewer-response-note"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {isProjectPipelineReviewStatusChangesRequested(reviewerResponseStatus)
                  ? t('reviewFeedbackNoteRequired')
                  : t('reviewFeedbackNoteOptional')}
              </label>
              <textarea
                id="pipeline-reviewer-response-note"
                value={reviewerResponseNote}
                onChange={(e) => setReviewerResponseNote(e.target.value)}
                rows={5}
                placeholder={t('reviewFeedbackNotePlaceholder')}
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t('jobModalReviewerResponseHint')}
              </p>
              {onReviewAction ? (
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={
                    saving ||
                    reviewActionSaving ||
                    !reviewerResponseStatus ||
                    (isProjectPipelineReviewStatusChangesRequested(reviewerResponseStatus) &&
                      !reviewerResponseNote.trim())
                  }
                  onClick={() => void handleReviewerResponse()}
                >
                  {reviewActionSaving ? t('reviewActionSubmitting') : t('jobModalReviewerResponseSubmit')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      className={isCreateMode ? 'max-w-2xl' : 'max-w-5xl'}
      ariaLabelledBy="project-pipeline-job-title"
    >
      <ModalContent
        className={`flex flex-col overflow-hidden ${
          isCreateMode ? 'max-h-[min(90vh,48rem)]' : 'max-h-[90vh]'
        }`}
      >
        <div className="border-b border-neutral-200 px-6 py-3 dark:border-neutral-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {isCreateMode ? (
                <>
                  <h2
                    id="project-pipeline-job-title"
                    className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {t('createJobTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {t('createJobSubtitle')}
                  </p>
                </>
              ) : (
                <>
                  <h2
                    id="project-pipeline-job-title"
                    className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    <span className="truncate">{draft.jobNumber || draft.client || t('editJobTitle')}</span>
                    <ProjectStatusPill status={draft.projectStatus} />
                    {normalizeProjectPipelineReviewStatus(draft.reviewStatus) ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getReviewStatusStyle(draft.reviewStatus)}`}
                        title={getReviewStatusDisplayLabel(draft.reviewStatus)}
                      >
                        {getShortReviewStatusLabel(draft.reviewStatus)}
                      </span>
                    ) : null}
                    {normalizeProjectPipelineFlag(draft.flag) !== 'None' ? (
                      <ProjectFlagPill flag={draft.flag} />
                    ) : null}
                    {headerSubtitle ? (
                      <>
                        <span
                          className="text-sm font-normal text-neutral-400 dark:text-neutral-500"
                          aria-hidden
                        >
                          ·
                        </span>
                        <span className="truncate text-sm font-normal text-neutral-600 dark:text-neutral-400">
                          {headerSubtitle}
                        </span>
                      </>
                    ) : null}
                    {draft.dueDate?.trim() ? (
                      <>
                        <span
                          className="text-sm font-normal text-neutral-400 dark:text-neutral-500"
                          aria-hidden
                        >
                          ·
                        </span>
                        <span
                          className={`truncate text-sm font-normal ${getModalDueDateTextClasses(dueDateEmphasis)}`}
                        >
                          {t('columnDueDate')}: {formatDueDateLabel(draft.dueDate)}
                        </span>
                      </>
                    ) : null}
                  </h2>
                  <div
                    className="mt-2 border-t border-neutral-200 dark:border-neutral-700"
                    aria-hidden
                  />
                  {draft.appraiserConsultant?.trim() || draft.projMgr?.trim() ? (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {draft.appraiserConsultant?.trim() ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {t('columnAppraiser')}
                          </span>
                          <AppraiserConsultantPills value={draft.appraiserConsultant} />
                        </div>
                      ) : null}
                      {draft.projMgr?.trim() ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {t('jobModalHeaderProjMgrLabel')}
                          </span>
                          <ProjMgrPill value={draft.projMgr} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label={t('closeJobModal')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {showReviewPanel ? (
            <div
              className="mt-4 flex gap-2 border-t border-neutral-200 pt-4 lg:hidden dark:border-neutral-700"
              role="tablist"
              aria-label={t('jobModalMobileTabsLabel')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'review'}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  mobileTab === 'review'
                    ? 'bg-sage-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
                onClick={() => setMobileTab('review')}
              >
                {t('jobModalTabReview')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'details'}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  mobileTab === 'details'
                    ? 'bg-sage-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
                onClick={() => setMobileTab('details')}
              >
                {t('jobModalTabDetails')}
              </button>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            className={`grid min-h-0 flex-1 ${
              showReviewPanel ? 'lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]' : ''
            }`}
          >
            <div
              className={`min-h-0 overflow-y-auto px-6 py-4 ${
                showReviewPanel && mobileTab !== 'details' ? 'hidden lg:block' : ''
              }`}
            >
              {detailsPanel}
            </div>

            {showReviewPanel ? (
              <div
                className={`min-h-0 overflow-y-auto border-neutral-200 bg-neutral-50/60 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-900/30 lg:border-l ${
                  mobileTab !== 'review' ? 'hidden lg:block' : ''
                }`}
              >
                {reviewPanel}
              </div>
            ) : null}
          </div>

          {(reviewValidationError || saveError || reviewActionError) && (
            <div className="space-y-2 border-t border-neutral-200 px-6 py-3 dark:border-neutral-700">
              {reviewValidationError ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {reviewValidationError}
                </p>
              ) : null}
              {reviewActionError ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {reviewActionError}
                </p>
              ) : null}
              {saveError ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {saveError}
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-700">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving || reviewActionSaving}>
              {t('cancelJobEdit')}
            </Button>
            <Button
              type="submit"
              variant={showReviewComposer || showReviewerComposer ? 'secondary' : 'primary'}
              disabled={saving || reviewActionSaving}
            >
              {saving
                ? isCreateMode
                  ? t('creatingJob')
                  : t('savingJobEdit')
                : isCreateMode
                  ? t('createJobSubmit')
                  : t('saveJobEdit')}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
