'use client';

import { useTranslations } from 'next-intl';
import { Input, Select } from '@/components/ui';
import { ReviewStatusSelect } from '@/components/project-pipeline/ReviewStatusSelect';
import { PipelineConsultantMultiSelect } from '@/components/project-pipeline/PipelineConsultantMultiSelect';
import { PROJECT_PIPELINE_SEGMENTS } from '@/lib/project-pipeline/segment';
import { PROJECT_PIPELINE_SERVICES } from '@/lib/project-pipeline/services';
import { DEFAULT_PROJECT_PIPELINE_SENT_TO_CLIENT, getSentToClientSelectTextClassName } from '@/lib/project-pipeline/sent-to-client';
import {
  canEditProjectPipelineReviewStatus,
  canEditProjectPipelineSentToClient,
  getAllowedSentToClientOptions,
} from '@/lib/project-pipeline/job-edit-permissions';
import { canAddProjectPipelineReviewerFeedback, isProjectPipelineReviewStatusChangesRequested } from '@/lib/project-pipeline/review-workflow';
import {
  getReviewStatusDisplayLabel,
  getReviewStatusSelectTextClassName,
  normalizeProjectPipelineReviewStatus,
} from '@/lib/project-pipeline/review-status';
import { PROJECT_PIPELINE_SLACK_USERNAMES } from '@/lib/project-pipeline/slack-usernames';
import {
  getProjectPipelineDueDateEmphasis,
  isProjectPipelineDueDateParseable,
  projectPipelineDueDateFromInputValue,
  projectPipelineDueDateToInputValue,
} from '@/lib/project-pipeline/due-date-emphasis';
import type { PipelineCurrentWorkloadAuthorInput } from '@/lib/project-pipeline/current-workload';
import {
  type ProjectPipelineEditableField,
  type ProjectPipelineJob,
} from '@/lib/project-pipeline/types';
import { buildPipelineConsultantSelectOptions } from '@/lib/project-pipeline/workload-authors';

type ProjectPipelineJobModalField = Exclude<
  ProjectPipelineEditableField,
  'projectStatusManual' | 'uiSourceOfTruth'
>;

const FIELD_LABEL_KEYS: Record<ProjectPipelineJobModalField, string> = {
  jobNumber: 'columnJobNumber',
  client: 'columnClient',
  propertyLocation: 'columnPropertyLocation',
  appraiserConsultant: 'columnAppraiser',
  projMgr: 'jobModalHeaderProjMgrLabel',
  contractStart: 'columnContractStart',
  dueDate: 'columnDueDate',
  dateCompleted: 'columnDateCompleted',
  commercialOutdoor: 'columnCommercialOutdoor',
  propertyType: 'columnPropertyType',
  service: 'columnService',
  reviewStatus: 'columnReviewStatus',
  sentToClient: 'columnSentToClient',
  authorSlackUsername: 'columnAuthorSlack',
  clientEmail: 'columnClientEmail',
};

export const PRIMARY_DETAIL_FIELDS: ProjectPipelineJobModalField[] = [
  'client',
  'propertyLocation',
  'dueDate',
  'service',
  'commercialOutdoor',
  'propertyType',
];

export const WORKFLOW_DETAIL_FIELDS: ProjectPipelineJobModalField[] = [
  'reviewStatus',
  'sentToClient',
];

export const MORE_DETAIL_FIELDS: ProjectPipelineJobModalField[] = [
  'jobNumber',
  'appraiserConsultant',
  'projMgr',
  'contractStart',
  'dateCompleted',
  'authorSlackUsername',
  'clientEmail',
];

type ProjectPipelineJobModalFieldsProps = {
  draft: ProjectPipelineJob;
  fields: readonly ProjectPipelineJobModalField[];
  isCreateMode: boolean;
  viewerDisplayName?: string | null;
  viewerIsAdmin: boolean;
  initialReviewStatus: string;
  reviewFeedbackNote: string;
  onReviewFeedbackNoteChange: (value: string) => void;
  onFieldChange: (field: ProjectPipelineEditableField, value: string) => void;
  pipelineConsultantOptions?: PipelineCurrentWorkloadAuthorInput[];
};

export function ProjectPipelineJobModalFields({
  draft,
  fields,
  isCreateMode,
  viewerDisplayName,
  viewerIsAdmin,
  initialReviewStatus,
  reviewFeedbackNote,
  onReviewFeedbackNoteChange,
  onFieldChange,
  pipelineConsultantOptions = [],
}: ProjectPipelineJobModalFieldsProps) {
  const t = useTranslations('admin.projectPipeline');
  const showWorkflowRow =
    fields.includes('reviewStatus') && fields.includes('sentToClient');

  const renderSentToClientField = () => {
    const sentToClientLabel = t(FIELD_LABEL_KEYS.sentToClient);
    const sentToClientId = 'pipeline-job-sentToClient';
    const canEdit = canEditProjectPipelineSentToClient(draft, viewerDisplayName, {
      isAdmin: viewerIsAdmin,
    });

    return (
      <div className="sm:col-span-1">
        <Select
          id={sentToClientId}
          label={sentToClientLabel}
          value={draft.sentToClient}
          onChange={(e) => onFieldChange('sentToClient', e.target.value)}
          disabled={!canEdit}
          className={getSentToClientSelectTextClassName(draft.sentToClient)}
        >
          {getAllowedSentToClientOptions(draft, viewerDisplayName, {
            isAdmin: viewerIsAdmin,
          }).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>
    );
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        if (isCreateMode && field === 'jobNumber') {
          return null;
        }

        const label = t(FIELD_LABEL_KEYS[field]);
        const id = `pipeline-job-${field}`;

        if (field === 'commercialOutdoor') {
          return (
            <div key={field} className="sm:col-span-1">
              <Select
                id={id}
                label={label}
                value={draft.commercialOutdoor}
                onChange={(e) => onFieldChange(field, e.target.value)}
              >
                <option value="">{t('fieldEmptyOption')}</option>
                {PROJECT_PIPELINE_SEGMENTS.map((segment) => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </Select>
            </div>
          );
        }

        if (field === 'reviewStatus') {
          const canEdit = canEditProjectPipelineReviewStatus(draft, viewerDisplayName, {
            isAdmin: viewerIsAdmin,
          });
          const canAddFeedback = canAddProjectPipelineReviewerFeedback(draft, viewerDisplayName, {
            isAdmin: viewerIsAdmin,
          });
          const reviewStatusChanged =
            normalizeProjectPipelineReviewStatus(draft.reviewStatus) !== initialReviewStatus;

          return (
            <div key={field} className="contents">
              <div className="space-y-3 sm:col-span-1">
                {canEdit ? (
                  <ReviewStatusSelect
                    id={id}
                    label={label}
                    value={normalizeProjectPipelineReviewStatus(draft.reviewStatus)}
                    onChange={(e) => onFieldChange(field, e.target.value)}
                    emptyOptionLabel={t('fieldEmptyOption')}
                    showChevron
                    className="rounded-lg text-sm"
                  />
                ) : (
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {label}
                    </p>
                    <span
                      className={`inline-flex text-sm ${getReviewStatusSelectTextClassName(draft.reviewStatus)}`}
                    >
                      {getReviewStatusDisplayLabel(draft.reviewStatus)}
                    </span>
                  </div>
                )}
              </div>
              {showWorkflowRow ? renderSentToClientField() : null}
              {canAddFeedback && reviewStatusChanged ? (
                <div className="sm:col-span-2">
                  <label
                    htmlFor="pipeline-reviewer-feedback-note"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {isProjectPipelineReviewStatusChangesRequested(draft.reviewStatus)
                      ? t('reviewFeedbackNoteRequired')
                      : t('reviewFeedbackNoteOptional')}
                  </label>
                  <textarea
                    id="pipeline-reviewer-feedback-note"
                    value={reviewFeedbackNote}
                    onChange={(e) => onReviewFeedbackNoteChange(e.target.value)}
                    rows={3}
                    required={isProjectPipelineReviewStatusChangesRequested(draft.reviewStatus)}
                    placeholder={t('reviewFeedbackNotePlaceholder')}
                    className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              ) : null}
            </div>
          );
        }

        if (field === 'service') {
          return (
            <div key={field} className="sm:col-span-1">
              <Select
                id={id}
                label={label}
                value={draft.service}
                onChange={(e) => onFieldChange(field, e.target.value)}
              >
                <option value="">{t('fieldEmptyOption')}</option>
                {PROJECT_PIPELINE_SERVICES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          );
        }

        if (field === 'authorSlackUsername') {
          return (
            <div key={field} className="sm:col-span-1">
              <Select
                id={id}
                label={label}
                value={draft.authorSlackUsername}
                onChange={(e) => onFieldChange(field, e.target.value)}
              >
                <option value="">{t('fieldEmptyOption')}</option>
                {PROJECT_PIPELINE_SLACK_USERNAMES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          );
        }

        if (field === 'sentToClient') {
          if (showWorkflowRow) {
            return null;
          }

          return <div key={field} className="contents">{renderSentToClientField()}</div>;
        }

        if (field === 'dueDate') {
          const dueDateInvalid =
            Boolean(draft.dueDate.trim()) && !isProjectPipelineDueDateParseable(draft.dueDate);
          const dueEmphasis = getProjectPipelineDueDateEmphasis(draft);
          const dueDateInputClass =
            dueEmphasis === 'past-due'
              ? 'border-red-300 dark:border-red-600'
              : dueEmphasis === 'due-soon'
                ? 'border-amber-300 dark:border-amber-600'
                : '';

          return (
            <div key={field} className="sm:col-span-1">
              <Input
                id={id}
                type="date"
                label={label}
                className={dueDateInputClass}
                value={projectPipelineDueDateToInputValue(draft.dueDate)}
                onChange={(e) =>
                  onFieldChange(field, projectPipelineDueDateFromInputValue(e.target.value))
                }
              />
              {dueDateInvalid ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300" role="status">
                  {t('dueDateInvalidWarning', { value: draft.dueDate })}
                </p>
              ) : null}
            </div>
          );
        }

        if (field === 'appraiserConsultant') {
          const consultantOptions = buildPipelineConsultantSelectOptions(
            pipelineConsultantOptions,
            draft.appraiserConsultant
          );

          return (
            <PipelineConsultantMultiSelect
              key={field}
              id={id}
              label={label}
              value={draft.appraiserConsultant}
              options={consultantOptions}
              onChange={(next) => onFieldChange(field, next)}
            />
          );
        }

        if (field === 'client' || field === 'propertyLocation' || field === 'clientEmail') {
          return (
            <div key={field} className="sm:col-span-2">
              <Input
                id={id}
                label={label}
                value={draft[field]}
                onChange={(e) => onFieldChange(field, e.target.value)}
              />
            </div>
          );
        }

        return (
          <div key={field} className="sm:col-span-1">
            <Input
              id={id}
              label={label}
              value={draft[field] as string}
              onChange={(e) => onFieldChange(field, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}

export { FIELD_LABEL_KEYS };
