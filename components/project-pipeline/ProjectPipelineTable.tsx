'use client';

import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, AlertTriangle, ChevronLeft, ChevronRight, Eye, EyeOff, LayoutList, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Button, DropdownSelect, Select } from '@/components/ui';
import {
  DEFAULT_PROJECT_PIPELINE_SEGMENT_FILTER,
  getProjectPipelineSegmentDotClassName,
  jobMatchesProjectPipelineSegment,
  PROJECT_PIPELINE_SEGMENTS,
  type ProjectPipelineSegment,
} from '@/lib/project-pipeline/segment';
import { PROJECT_PIPELINE_SERVICES } from '@/lib/project-pipeline/services';
import { isOutdoorJobDueWithin30Days, isOutdoorJobPastDue } from '@/lib/project-pipeline/metrics';
import type { PipelineCurrentWorkloadAuthorInput } from '@/lib/project-pipeline/current-workload';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { ProjectPipelineJobModal } from '@/components/project-pipeline/ProjectPipelineJobModal';
import { ProjectPipelineReviewFeedbackDialog } from '@/components/project-pipeline/ProjectPipelineReviewFeedbackDialog';
import { ReviewStatusSelect } from '@/components/project-pipeline/ReviewStatusSelect';
import {
  getReviewStatusDisplayLabel,
  getReviewStatusStyle,
  normalizeProjectPipelineReviewStatus,
  PROJECT_PIPELINE_REVIEW_STATUSES,
} from '@/lib/project-pipeline/review-status';
import {
  formatProjectPipelineSheetDate,
  getProjectPipelineDueDateEmphasis,
  getProjectPipelineJobRowClassName,
  parseProjectPipelineDueDate,
} from '@/lib/project-pipeline/due-date-emphasis';
import { withDerivedProjectPipelineProjectStatus } from '@/lib/project-pipeline/derive-project-status';
import { canEditProjectPipelineReviewStatus } from '@/lib/project-pipeline/job-edit-permissions';
import { canAddProjectPipelineReviewerFeedback } from '@/lib/project-pipeline/review-workflow';
import type { ProjectPipelineReviewNoteType } from '@/lib/project-pipeline/review-notes';
import { PROJECT_PIPELINE_SHEET_TABS, formatProjectPipelineSheetYearLabel, isProjectPipelineAllSheetsTab } from '@/lib/project-pipeline/sheet-tabs';
import { groupPipelineJobsByConsultant } from '@/lib/project-pipeline/group-jobs-by-consultant';
import { AppraiserConsultantPills } from '@/components/project-pipeline/AppraiserConsultantPills';
import { ProjectStatusPill } from '@/components/project-pipeline/ProjectStatusPill';
import {
  getProjectPipelineFlagWarningIconClassName,
  normalizeProjectPipelineFlag,
  shouldShowProjectPipelineFlagWarning,
} from '@/lib/project-pipeline/project-flag';
import {
  compareProjectPipelineProjectStatus,
  DEFAULT_PROJECT_PIPELINE_TABLE_STATUS_FILTER,
  normalizeProjectPipelineProjectStatus,
  PROJECT_PIPELINE_PROJECT_STATUSES,
} from '@/lib/project-pipeline/project-status';
import { ProjectPipelineConsultantWorkloadTable } from '@/components/project-pipeline/ProjectPipelineConsultantWorkloadTable';
import { ProjectPipelineTableSkeleton } from '@/components/project-pipeline/ProjectPipelineTableSkeleton';
import { jobMatchesProjectPipelineSearchQuery } from '@/lib/project-pipeline/search-jobs';
import {
  createBlankProjectPipelineJob,
  resolveProjectPipelineCreateSheetTab,
} from '@/lib/project-pipeline/create-job';
import { normalizeUiCreatedProjectPipelineJobPayload } from '@/lib/project-pipeline/parse-job-payload';

type SortKey = 'jobNumber' | 'projectStatus' | 'dueDate';
type SortDir = 'asc' | 'desc';

const PROJECT_PIPELINE_PAGE_SIZE = 100;

function formatPipelineDateCell(value: string): string {
  const formatted = formatProjectPipelineSheetDate(value);
  return formatted || '—';
}

function parseSortableDate(value: string): number | null {
  return parseProjectPipelineDueDate(value);
}

function effectiveProjectStatusForFilter(job: ProjectPipelineJob): ProjectPipelineProjectStatus {
  return normalizeProjectPipelineProjectStatus(job.projectStatus);
}

function filterProjectPipelineJobs(
  jobs: readonly ProjectPipelineJob[],
  filters: {
    search: string;
    serviceFilter: string;
    projectStatusFilter?: string;
    segmentFilter?: string;
    dueWithin30DaysOnly?: boolean;
    outdoorPastDueOnly?: boolean;
  }
): ProjectPipelineJob[] {
  return jobs.filter((job) => {
    if (!jobMatchesProjectPipelineSearchQuery(job, filters.search)) return false;
    if (filters.serviceFilter && job.service !== filters.serviceFilter) return false;
    if (
      filters.projectStatusFilter &&
      normalizeProjectPipelineProjectStatus(effectiveProjectStatusForFilter(job)) !==
        normalizeProjectPipelineProjectStatus(filters.projectStatusFilter)
    ) {
      return false;
    }
    if (
      filters.segmentFilter &&
      !jobMatchesProjectPipelineSegment(
        job.commercialOutdoor,
        filters.segmentFilter as ProjectPipelineSegment
      )
    ) {
      return false;
    }
    if (filters.dueWithin30DaysOnly && !isOutdoorJobDueWithin30Days(job)) return false;
    if (filters.outdoorPastDueOnly && !isOutdoorJobPastDue(job)) return false;
    return true;
  });
}

interface ProjectPipelineTableProps {
  jobs: ProjectPipelineJob[];
  canViewAll: boolean;
  missingDisplayName: boolean;
  sheetName: string;
  onSheetNameChange: (value: string) => void;
  availableSheetTabs: { sheetName: string; sheetYear?: number | null }[];
  segmentFilter: string;
  onSegmentFilterChange: (value: string) => void;
  dueWithin30DaysOnly: boolean;
  onDueWithin30DaysOnlyChange: (value: boolean) => void;
  outdoorPastDueOnly: boolean;
  onOutdoorPastDueOnlyChange: (value: boolean) => void;
  showAuthorPreviewToggle?: boolean;
  authorPreviewActive?: boolean;
  onAuthorPreviewToggle?: () => void;
  authorPreviewDisplayName?: string;
  showConsultantWorkloadToggle?: boolean;
  consultantWorkloadToggleAfterAuthorPreview?: boolean;
  consultantWorkloadActive?: boolean;
  onConsultantWorkloadToggle?: () => void;
  consultantWorkloadAuthors?: PipelineCurrentWorkloadAuthorInput[];
  pipelineConsultantOptions?: PipelineCurrentWorkloadAuthorInput[];
  viewerDisplayName?: string | null;
  viewerIsAdmin?: boolean;
  onJobUpdated: (job: ProjectPipelineJob) => void;
  onSaveJob: (
    job: ProjectPipelineJob,
    options?: { reviewFeedbackNote?: string }
  ) => Promise<ProjectPipelineJob | void>;
  onDeleteJob?: (job: ProjectPipelineJob) => Promise<void>;
  onJobDeleted?: (job: ProjectPipelineJob) => void;
  onReviewAction?: (
    job: ProjectPipelineJob,
    action: ProjectPipelineReviewNoteType,
    note: string,
    reviewStatus?: string
  ) => Promise<ProjectPipelineJob | void>;
  onAddJobNote?: (job: ProjectPipelineJob, note: string) => Promise<ProjectPipelineJob | void>;
  onSaveProjectStatus: (
    job: ProjectPipelineJob,
    projectStatus: string,
    manualOverride?: boolean
  ) => Promise<ProjectPipelineJob>;
  onSaveResult?: (result: { success: boolean; message: string }) => void;
  showAddJob?: boolean;
  onCreateJob?: (job: ProjectPipelineJob) => Promise<ProjectPipelineJob | void>;
  onJobCreated?: (job: ProjectPipelineJob) => void;
  syncingFromSheet?: boolean;
  /** When true, refresh uses server-side service account sync (no Google OAuth popup). */
  cronSyncEnabled?: boolean;
  onSyncFromSheet?: () => void | Promise<void>;
  lastSyncedAt?: string | null;
  jobsLoading?: boolean;
  metricTableFilterVersion?: number;
  defaultProjectStatusFilter?: string;
}

export function ProjectPipelineTable({
  jobs,
  canViewAll,
  missingDisplayName,
  sheetName,
  onSheetNameChange,
  availableSheetTabs,
  segmentFilter,
  onSegmentFilterChange,
  dueWithin30DaysOnly,
  onDueWithin30DaysOnlyChange,
  outdoorPastDueOnly,
  onOutdoorPastDueOnlyChange,
  showAuthorPreviewToggle = false,
  authorPreviewActive = false,
  onAuthorPreviewToggle,
  authorPreviewDisplayName,
  showConsultantWorkloadToggle = false,
  consultantWorkloadToggleAfterAuthorPreview = false,
  consultantWorkloadActive = false,
  onConsultantWorkloadToggle,
  consultantWorkloadAuthors,
  pipelineConsultantOptions = [],
  viewerDisplayName,
  viewerIsAdmin = false,
  onJobUpdated,
  onSaveJob,
  onDeleteJob,
  onJobDeleted,
  onReviewAction,
  onAddJobNote,
  onSaveProjectStatus,
  onSaveResult,
  showAddJob = false,
  onCreateJob,
  onJobCreated,
  syncingFromSheet = false,
  cronSyncEnabled = false,
  onSyncFromSheet,
  lastSyncedAt = null,
  jobsLoading = false,
  metricTableFilterVersion = 0,
  defaultProjectStatusFilter = DEFAULT_PROJECT_PIPELINE_TABLE_STATUS_FILTER,
}: ProjectPipelineTableProps) {
  const t = useTranslations('admin.projectPipeline');
  const format = useFormatter();
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState(
    () => defaultProjectStatusFilter || DEFAULT_PROJECT_PIPELINE_TABLE_STATUS_FILTER
  );
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedJob, setSelectedJob] = useState<ProjectPipelineJob | null>(null);
  const [createJobDraft, setCreateJobDraft] = useState<ProjectPipelineJob | null>(null);
  const [savingJob, setSavingJob] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reviewActionSaving, setReviewActionSaving] = useState(false);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);
  const [jobNoteSaving, setJobNoteSaving] = useState(false);
  const [jobNoteError, setJobNoteError] = useState<string | null>(null);
  const [pendingInlineReview, setPendingInlineReview] = useState<{
    job: ProjectPipelineJob;
    newStatus: string;
  } | null>(null);
  const [inlineReviewError, setInlineReviewError] = useState<string | null>(null);
  const [inlineSavingRowKey, setInlineSavingRowKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    serviceFilter,
    projectStatusFilter,
    segmentFilter,
    dueWithin30DaysOnly,
    outdoorPastDueOnly,
    sheetName,
    consultantWorkloadActive,
  ]);

  useEffect(() => {
    if (!metricTableFilterVersion) return;
    setSearch('');
    setServiceFilter('');
    setProjectStatusFilter('');
    setPage(1);
  }, [metricTableFilterVersion]);

  const lastSyncedLabel = useMemo(() => {
    if (!lastSyncedAt) return t('lastSyncedNever');
    const syncedAt = new Date(lastSyncedAt);
    if (Number.isNaN(syncedAt.getTime())) return t('lastSyncedNever');
    return t('lastSynced', {
      time: format.relativeTime(syncedAt, { now: new Date() }),
    });
  }, [format, lastSyncedAt, t]);

  const serviceOptions = PROJECT_PIPELINE_SERVICES;
  const isAllYearsView = isProjectPipelineAllSheetsTab(sheetName);
  const pageSize = PROJECT_PIPELINE_PAGE_SIZE;

  const sheetTabOptions =
    availableSheetTabs.length > 0
      ? availableSheetTabs.map((tab) => tab.sheetName)
      : [...PROJECT_PIPELINE_SHEET_TABS];

  const getJobRowKey = (job: ProjectPipelineJob) => {
    const tab = job.pipelineSheetName ?? sheetName;
    const jobNumber = job.jobNumber.trim();
    return jobNumber ? `${tab}-${jobNumber}` : `${tab}-row-${job.sheetRowIndex}`;
  };

  const filteredJobs = useMemo(
    () =>
      filterProjectPipelineJobs(jobs, {
        search,
        serviceFilter,
        projectStatusFilter,
        segmentFilter,
        dueWithin30DaysOnly,
        outdoorPastDueOnly,
      }),
    [
      jobs,
      search,
      serviceFilter,
      projectStatusFilter,
      segmentFilter,
      dueWithin30DaysOnly,
      outdoorPastDueOnly,
    ]
  );

  const workloadFilteredJobs = useMemo(
    () =>
      filterProjectPipelineJobs(jobs, {
        search,
        serviceFilter,
      }),
    [jobs, search, serviceFilter]
  );

  const sortedJobs = useMemo(() => {
    const copy = [...filteredJobs];
    copy.sort((a, b) => {
      if (sortKey === 'jobNumber') {
        const cmp = a.jobNumber.localeCompare(b.jobNumber, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        return sortDir === 'asc' ? cmp : -cmp;
      }

      if (sortKey === 'projectStatus') {
        const cmp = compareProjectPipelineProjectStatus(
          effectiveProjectStatusForFilter(a),
          effectiveProjectStatusForFilter(b)
        );
        return sortDir === 'asc' ? cmp : -cmp;
      }

      const aDate = parseSortableDate(a.dueDate);
      const bDate = parseSortableDate(b.dueDate);
      if (aDate == null && bDate == null) return 0;
      if (aDate == null) return 1;
      if (bDate == null) return -1;
      return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
    });
    return copy;
  }, [filteredJobs, sortKey, sortDir]);

  const filteredJobCount = sortedJobs.length;
  const totalPages = Math.max(1, Math.ceil(filteredJobCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = (currentPage - 1) * pageSize;
  const paginatedJobs = useMemo(
    () => sortedJobs.slice(pageStartIndex, pageStartIndex + pageSize),
    [sortedJobs, pageStartIndex, pageSize]
  );
  const pageRangeFrom = filteredJobCount === 0 ? 0 : pageStartIndex + 1;
  const pageRangeTo = Math.min(pageStartIndex + pageSize, filteredJobCount);
  const showPagination = !consultantWorkloadActive && filteredJobCount > pageSize;

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const consultantGroups = useMemo(() => {
    if (consultantWorkloadActive && consultantWorkloadAuthors?.length) {
      return groupPipelineJobsByConsultant(workloadFilteredJobs, {
        authors: consultantWorkloadAuthors,
        segmentFilter,
      });
    }
    return groupPipelineJobsByConsultant(workloadFilteredJobs, { segmentFilter });
  }, [consultantWorkloadActive, consultantWorkloadAuthors, workloadFilteredJobs, segmentFilter]);

  const consultantWorkloadJobCount = useMemo(() => {
    const uniqueJobNumbers = new Set<string>();
    for (const group of consultantGroups) {
      for (const job of group.jobs) {
        uniqueJobNumbers.add(job.jobNumber);
      }
    }
    return uniqueJobNumbers.size;
  }, [consultantGroups]);

  const isFilteredEmpty =
    !jobsLoading &&
    jobs.length > 0 &&
    (consultantWorkloadActive ? consultantGroups.length === 0 : sortedJobs.length === 0);

  const consultantWorkloadToggleButton =
    showConsultantWorkloadToggle && onConsultantWorkloadToggle ? (
      <button
        type="button"
        onClick={onConsultantWorkloadToggle}
        aria-pressed={consultantWorkloadActive}
        aria-label={
          consultantWorkloadActive ? t('consultantWorkloadExit') : t('consultantWorkloadEnter')
        }
        title={consultantWorkloadActive ? t('consultantWorkloadExit') : t('consultantWorkloadEnter')}
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
          consultantWorkloadActive
            ? 'border-sage-600 bg-sage-50 text-sage-800 dark:border-sage-500 dark:bg-sage-950/50 dark:text-sage-200'
            : 'border-gray-300 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-gray-600 dark:bg-gray-700 dark:text-neutral-300 dark:hover:bg-gray-600'
        }`}
      >
        <LayoutList className="h-4 w-4" aria-hidden />
      </button>
    ) : null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-neutral-400" aria-hidden />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" aria-hidden />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" aria-hidden />
    );
  };

  const clearFilters = () => {
    setSearch('');
    setServiceFilter('');
    setProjectStatusFilter(defaultProjectStatusFilter);
    onSegmentFilterChange(DEFAULT_PROJECT_PIPELINE_SEGMENT_FILTER);
    onDueWithin30DaysOnlyChange(false);
    onOutdoorPastDueOnlyChange(false);
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() ||
    serviceFilter ||
    projectStatusFilter !== defaultProjectStatusFilter ||
    dueWithin30DaysOnly ||
    outdoorPastDueOnly ||
    segmentFilter !== DEFAULT_PROJECT_PIPELINE_SEGMENT_FILTER;

  const paginationControls = showPagination ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t('paginationPage', { page: currentPage, pages: totalPages })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          aria-label={t('paginationPrevious')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t('paginationPrevious')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          aria-label={t('paginationNext')}
        >
          {t('paginationNext')}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  ) : null;

  const openCreateJob = () => {
    if (!onCreateJob) return;
    setSaveError(null);
    setCreateJobDraft(
      createBlankProjectPipelineJob({
        pipelineSheetName: resolveProjectPipelineCreateSheetTab(sheetName),
        appraiserConsultant: viewerDisplayName ?? undefined,
      })
    );
  };

  const closeCreateJobModal = () => {
    if (savingJob) return;
    setCreateJobDraft(null);
    setSaveError(null);
  };

  const handleCreateJob = async (
    job: ProjectPipelineJob,
    _options?: { manualProjectStatus?: boolean; reviewFeedbackNote?: string }
  ) => {
    if (!onCreateJob) return;

    setSavingJob(true);
    setSaveError(null);
    try {
      const savedJob =
        (await onCreateJob(normalizeUiCreatedProjectPipelineJobPayload(job))) ?? job;
      onJobCreated?.(savedJob);
      setCreateJobDraft(null);
      onSaveResult?.({ success: true, message: t('createJobSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('createJobError');
      setSaveError(message);
      onSaveResult?.({ success: false, message });
    } finally {
      setSavingJob(false);
    }
  };

  const openJob = (job: ProjectPipelineJob) => {
    setSaveError(null);
    setJobNoteError(null);
    setSelectedJob(job);
  };

  const closeJobModal = () => {
    if (savingJob || deletingJob) return;
    setSelectedJob(null);
    setSaveError(null);
    setJobNoteError(null);
  };

  const handleDeleteJob = async (job: ProjectPipelineJob) => {
    if (!onDeleteJob) return;

    setDeletingJob(true);
    setSaveError(null);
    try {
      await onDeleteJob(job);
      onJobDeleted?.(job);
      setSelectedJob(null);
      onSaveResult?.({ success: true, message: t('deleteJobSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('deleteJobError');
      setSaveError(message);
      onSaveResult?.({ success: false, message });
    } finally {
      setDeletingJob(false);
    }
  };

  const handleSaveJob = async (
    job: ProjectPipelineJob,
    options?: { manualProjectStatus?: boolean; reviewFeedbackNote?: string }
  ) => {
    setSavingJob(true);
    setSaveError(null);
    try {
      const manualProjectStatus = Boolean(options?.manualProjectStatus);
      const normalizedJob = normalizeUiCreatedProjectPipelineJobPayload(job);
      const jobWithStatus =
        manualProjectStatus || normalizedJob.projectStatusManual
          ? {
              ...normalizedJob,
              projectStatusManual: manualProjectStatus || Boolean(normalizedJob.projectStatusManual),
            }
          : withDerivedProjectPipelineProjectStatus(normalizedJob);

      let savedJob = jobWithStatus;

      if (manualProjectStatus) {
        savedJob = await onSaveProjectStatus(
          jobWithStatus,
          jobWithStatus.projectStatus,
          true
        );
      }

      const putResponse = await onSaveJob(savedJob, {
        reviewFeedbackNote: options?.reviewFeedbackNote,
      });
      savedJob = putResponse ?? savedJob;

      if (!manualProjectStatus) {
        savedJob = await onSaveProjectStatus(savedJob, savedJob.projectStatus, false);
      } else if (!savedJob.projectStatusManual) {
        savedJob = {
          ...savedJob,
          projectStatusManual: true,
          uiSourceOfTruth: true,
        };
      }

      onJobUpdated(savedJob);
      setSelectedJob(null);
      onSaveResult?.({ success: true, message: t('saveJobSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('saveJobError');
      setSaveError(message);
      onSaveResult?.({ success: false, message });
    } finally {
      setSavingJob(false);
    }
  };

  const persistSheetFieldUpdate = async (
    job: ProjectPipelineJob,
    value: string
  ) => {
    const rowKey = getJobRowKey(job);
    if (inlineSavingRowKey === rowKey) return;

    const fieldValue = normalizeProjectPipelineReviewStatus(value);
    const updated = withDerivedProjectPipelineProjectStatus({
      ...job,
      reviewStatus: fieldValue,
      pipelineSheetName: job.pipelineSheetName ?? sheetName,
    });

    setInlineSavingRowKey(rowKey);
    try {
      let savedJob = (await onSaveJob(updated)) ?? updated;
      savedJob = (await onSaveProjectStatus(savedJob, savedJob.projectStatus)) ?? savedJob;
      onJobUpdated(savedJob);
      onSaveResult?.({ success: true, message: t('saveInlineSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('saveJobError');
      onSaveResult?.({ success: false, message });
    } finally {
      setInlineSavingRowKey(null);
    }
  };

  const handleReviewAction = async (
    action: ProjectPipelineReviewNoteType,
    note: string,
    reviewStatus?: string
  ) => {
    if (!selectedJob || !onReviewAction) return;

    setReviewActionSaving(true);
    setReviewActionError(null);
    try {
      const savedJob =
        (await onReviewAction(selectedJob, action, note, reviewStatus)) ?? selectedJob;
      onJobUpdated(savedJob);
      setSelectedJob(savedJob);
      onSaveResult?.({
        success: true,
        message:
          action === 'review_feedback'
            ? t('reviewResponseSuccess')
            : action === 'resubmit'
              ? t('submitResubmissionSuccess')
              : t('submitForReviewSuccess'),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('reviewActionError');
      setReviewActionError(message);
      onSaveResult?.({ success: false, message });
    } finally {
      setReviewActionSaving(false);
    }
  };

  const handleAddJobNote = async (note: string): Promise<ProjectPipelineJob | void> => {
    if (!selectedJob || !onAddJobNote) return;

    setJobNoteSaving(true);
    setJobNoteError(null);
    try {
      const savedJob = (await onAddJobNote(selectedJob, note)) ?? selectedJob;
      onJobUpdated(savedJob);
      setSelectedJob(savedJob);
      onSaveResult?.({ success: true, message: t('jobNoteAddedSuccess') });
      return savedJob;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('jobNoteAddError');
      setJobNoteError(message);
      onSaveResult?.({ success: false, message });
    } finally {
      setJobNoteSaving(false);
    }
  };

  const handleInlineReviewFeedbackConfirm = async (note: string) => {
    if (!pendingInlineReview || !onReviewAction) return;

    setInlineReviewError(null);
    setReviewActionSaving(true);
    const rowKey = getJobRowKey(pendingInlineReview.job);
    setInlineSavingRowKey(rowKey);
    try {
      const savedJob =
        (await onReviewAction(
          pendingInlineReview.job,
          'review_feedback',
          note,
          pendingInlineReview.newStatus
        )) ?? pendingInlineReview.job;
      onJobUpdated(savedJob);
      setPendingInlineReview(null);
      onSaveResult?.({ success: true, message: t('saveInlineSuccess') });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('reviewActionError');
      setInlineReviewError(message);
      onSaveResult?.({ success: false, message });
    } finally {
      setReviewActionSaving(false);
      setInlineSavingRowKey(null);
    }
  };

  const handleInlineFieldUpdate = async (job: ProjectPipelineJob, value: string) => {
    const fieldValue = normalizeProjectPipelineReviewStatus(value);
    const currentStatus = normalizeProjectPipelineReviewStatus(job.reviewStatus);
    if (fieldValue === currentStatus) return;

    if (
      canAddProjectPipelineReviewerFeedback(job, viewerDisplayName, {
        isAdmin: viewerIsAdmin,
      })
    ) {
      setInlineReviewError(null);
      setPendingInlineReview({ job, newStatus: fieldValue });
      return;
    }

    await persistSheetFieldUpdate(job, value);
  };

  const stopRowActivation = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const filteredEmptyState = (
    <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-neutral-600 dark:text-neutral-400">{t('emptyFilteredState')}</p>
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="mt-3 text-sm font-medium text-sage-700 hover:text-sage-800 dark:text-sage-400 dark:hover:text-sage-300"
        >
          {t('clearFilters')}
        </button>
      ) : null}
    </div>
  );

  if (missingDisplayName) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="font-medium">{t('missingDisplayNameTitle')}</p>
        <p className="mt-1 text-sm">{t('missingDisplayNameBody')}</p>
      </div>
    );
  }

  if (!jobs.length && !jobsLoading && !showAddJob) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        {t('emptyState')}
      </div>
    );
  }

  const isDatasetEmpty = !jobsLoading && jobs.length === 0;

  return (
    <div className="space-y-4">
      <ProjectPipelineJobModal
        job={selectedJob}
        open={Boolean(selectedJob)}
        saving={savingJob}
        saveError={saveError}
        viewerDisplayName={viewerDisplayName}
        viewerIsAdmin={viewerIsAdmin}
        pipelineConsultantOptions={pipelineConsultantOptions}
        onClose={closeJobModal}
        onSave={handleSaveJob}
        onDelete={viewerIsAdmin && onDeleteJob ? handleDeleteJob : undefined}
        deleting={deletingJob}
        onReviewAction={onReviewAction ? handleReviewAction : undefined}
        reviewActionSaving={reviewActionSaving}
        reviewActionError={reviewActionError}
        onAddJobNote={onAddJobNote ? handleAddJobNote : undefined}
        jobNoteSaving={jobNoteSaving}
        jobNoteError={jobNoteError}
      />

      <ProjectPipelineJobModal
        job={createJobDraft}
        mode="create"
        open={Boolean(createJobDraft)}
        availableSheetTabs={availableSheetTabs}
        saving={savingJob}
        saveError={saveError}
        viewerDisplayName={viewerDisplayName}
        viewerIsAdmin={viewerIsAdmin}
        pipelineConsultantOptions={pipelineConsultantOptions}
        onClose={closeCreateJobModal}
        onSave={handleCreateJob}
      />

      <ProjectPipelineReviewFeedbackDialog
        open={Boolean(pendingInlineReview)}
        reviewStatus={pendingInlineReview?.newStatus ?? ''}
        saving={reviewActionSaving}
        error={inlineReviewError}
        onClose={() => {
          setPendingInlineReview(null);
          setInlineReviewError(null);
        }}
        onConfirm={handleInlineReviewFeedbackConfirm}
      />

      {authorPreviewActive && authorPreviewDisplayName ? (
        <div className="rounded-lg border border-sage-200 bg-sage-50 px-4 py-2.5 text-sm text-sage-900 dark:border-sage-800 dark:bg-sage-950/40 dark:text-sage-100">
          {t('authorPreviewBanner', { name: authorPreviewDisplayName })}
        </div>
      ) : null}

      {!canViewAll ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('viewingAssigned', { count: jobs.length })}
        </p>
      ) : null}

      <div className="admin-toolbar-row flex flex-wrap items-end gap-2 rounded-lg px-4 py-3 xl:flex-nowrap">
        <div className="relative w-full min-w-[11rem] shrink-0 sm:w-56 xl:w-52">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2 xl:flex-nowrap">
          <div className="w-full sm:w-28">
            <Select
              value={sheetName}
              onChange={(e) => onSheetNameChange(e.target.value)}
              aria-label={t('filterSheetYear')}
              className="h-10 text-sm"
            >
              {sheetTabOptions.map((tab) => (
                <option key={tab} value={tab}>
                  {formatProjectPipelineSheetYearLabel(tab)}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-36">
            <Select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              aria-label={t('filterService')}
              className="h-10 text-sm"
            >
              <option value="">{t('filterServiceAll')}</option>
              {serviceOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-36">
            <DropdownSelect
              value={segmentFilter}
              onChange={(value) => {
                onSegmentFilterChange(value);
                if (value !== 'Outdoor') {
                  onDueWithin30DaysOnlyChange(false);
                  onOutdoorPastDueOnlyChange(false);
                }
              }}
              aria-label={t('filterCommercialOutdoor')}
              options={[
                ...PROJECT_PIPELINE_SEGMENTS.map((segment) => ({
                  value: segment,
                  label: segment,
                })),
                { value: '', label: t('filterCommercialOutdoorAll') },
              ]}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={projectStatusFilter}
              onChange={(e) => setProjectStatusFilter(e.target.value)}
              aria-label={t('filterProjectStatus')}
              className="h-10 text-sm"
            >
              <option value="">{t('filterProjectStatusAll')}</option>
              {PROJECT_PIPELINE_PROJECT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          {!consultantWorkloadToggleAfterAuthorPreview ? consultantWorkloadToggleButton : null}
          {showAuthorPreviewToggle && onAuthorPreviewToggle ? (
            <button
              type="button"
              onClick={onAuthorPreviewToggle}
              aria-pressed={authorPreviewActive}
              aria-label={
                authorPreviewActive
                  ? t('authorPreviewExit', { name: authorPreviewDisplayName ?? '' })
                  : t('authorPreviewEnter', { name: authorPreviewDisplayName ?? '' })
              }
              title={
                authorPreviewActive
                  ? t('authorPreviewExit', { name: authorPreviewDisplayName ?? '' })
                  : t('authorPreviewEnter', { name: authorPreviewDisplayName ?? '' })
              }
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                authorPreviewActive
                  ? 'border-sage-600 bg-sage-50 text-sage-800 dark:border-sage-500 dark:bg-sage-950/50 dark:text-sage-200'
                  : 'border-gray-300 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-gray-600 dark:bg-gray-700 dark:text-neutral-300 dark:hover:bg-gray-600'
              }`}
            >
              {authorPreviewActive ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          ) : null}
          {consultantWorkloadToggleAfterAuthorPreview ? consultantWorkloadToggleButton : null}
          {onSyncFromSheet ? (
            <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
              <button
                type="button"
                onClick={() => void onSyncFromSheet()}
                disabled={syncingFromSheet}
                aria-label={
                  cronSyncEnabled ? t('refreshSyncServiceAccountAria') : t('refreshSyncAria')
                }
                title={
                  syncingFromSheet
                    ? t('refreshSyncWorking')
                    : lastSyncedLabel ??
                      (cronSyncEnabled
                        ? t('refreshSyncServiceAccountAria')
                        : t('refreshSyncAria'))
                }
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-neutral-200 dark:hover:bg-gray-600"
              >
                <RefreshCw
                  className={`h-4 w-4 shrink-0 ${syncingFromSheet ? 'animate-spin' : ''}`}
                  aria-hidden
                />
              </button>
            </div>
          ) : null}
        </div>
        {showAddJob && onCreateJob ? (
          <Button
            type="button"
            variant="primary"
            className="ml-auto inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap"
            onClick={openCreateJob}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t('addJob')}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {consultantWorkloadActive
            ? t('consultantWorkloadSummary', {
                jobs: consultantWorkloadJobCount,
                consultants: consultantGroups.length,
              })
            : showPagination
              ? t('showingPaginatedCount', {
                  from: pageRangeFrom,
                  to: pageRangeTo,
                  filtered: filteredJobCount,
                  total: jobs.length,
                })
              : t('showingCount', { shown: filteredJobCount, total: jobs.length })}
        </p>
        <div className="flex items-center gap-3">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-sage-700 hover:text-sage-800 dark:text-sage-400 dark:hover:text-sage-300"
            >
              {t('clearFilters')}
            </button>
          ) : null}
        </div>
      </div>

      {jobsLoading ? (
        <ProjectPipelineTableSkeleton />
      ) : isDatasetEmpty ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          {t('emptyState')}
        </div>
      ) : isFilteredEmpty ? (
        filteredEmptyState
      ) : consultantWorkloadActive ? (
        <ProjectPipelineConsultantWorkloadTable groups={consultantGroups} onOpenJob={openJob} />
      ) : (
      <>
      {isAllYearsView && paginationControls}
      <div className="admin-surface overflow-x-auto">
        <table className="w-full min-w-[70rem] table-fixed divide-y divide-neutral-200 dark:divide-neutral-800">
          <colgroup>
            <col className="w-[8.5rem]" />
            <col className="w-[6.75rem]" />
            <col className="w-[11rem]" />
            <col className="w-[9rem]" />
            <col className="w-[10.5rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-[10rem]" />
            <col className="w-[7.5rem]" />
          </colgroup>
          <thead className="admin-table-head">
            <tr>
              <th className="overflow-hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wide">
                <button
                  type="button"
                  onClick={() => toggleSort('jobNumber')}
                  className="inline-flex max-w-full items-center gap-1 truncate hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  {t('columnJobNumber')}
                  <SortIcon column="jobNumber" />
                </button>
              </th>
              <th className="w-[6.75rem] max-w-[6.75rem] overflow-hidden px-2 py-3 text-left text-xs font-medium uppercase tracking-wide">
                <button
                  type="button"
                  onClick={() => toggleSort('projectStatus')}
                  className="inline-flex max-w-full items-center gap-1 truncate hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  {t('columnProjectStatus')}
                  <SortIcon column="projectStatus" />
                </button>
              </th>
              <th className="overflow-hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wide">
                <span className="block truncate" title={t('columnClient')}>
                  {t('columnClient')}
                </span>
              </th>
              <th className="overflow-hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wide">
                <span className="block truncate" title={t('columnPropertyLocation')}>
                  {t('columnPropertyLocation')}
                </span>
              </th>
              <th className="overflow-hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wide">
                <span className="block truncate" title={t('columnAppraiser')}>
                  {t('columnAppraiser')}
                </span>
              </th>
              <th className="overflow-hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wide">
                <button
                  type="button"
                  onClick={() => toggleSort('dueDate')}
                  className="inline-flex max-w-full items-center gap-1 truncate hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  {t('columnDueDate')}
                  <SortIcon column="dueDate" />
                </button>
              </th>
              <th className="overflow-hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wide">
                <span className="block truncate" title={t('columnService')}>
                  {t('columnService')}
                </span>
              </th>
              <th className="w-[7.5rem] max-w-[7.5rem] overflow-hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wide">
                <span className="block truncate" title={t('columnReviewStatus')}>
                  {t('columnReviewStatus')}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {paginatedJobs.map((job) => {
              const segmentDotClass = getProjectPipelineSegmentDotClassName(job.commercialOutdoor);
              const rowKey = getJobRowKey(job);
              const dueEmphasis = getProjectPipelineDueDateEmphasis(job);
              const dueDateCellClass =
                dueEmphasis === 'past-due'
                  ? 'font-semibold text-red-700 dark:text-red-400'
                  : dueEmphasis === 'due-soon'
                    ? 'font-medium text-amber-800 dark:text-amber-300'
                    : '';
              const inlineSaving = inlineSavingRowKey === rowKey;

              return (
              <tr
                key={rowKey}
                onClick={() => openJob(job)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openJob(job);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={t('openJobRow', {
                  jobNumber: job.jobNumber || job.client || t('editJobTitle'),
                })}
                aria-busy={inlineSaving}
                className={`cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage-500 ${getProjectPipelineJobRowClassName(job, dueEmphasis)} ${inlineSaving ? 'pointer-events-none opacity-60' : ''} ${isAllYearsView ? '[content-visibility:auto] [contain-intrinsic-size:auto_3rem]' : ''}`}
              >
                <td className="overflow-hidden text-ellipsis whitespace-nowrap px-3 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  <span className="inline-flex max-w-full items-center gap-2">
                    {inlineSaving ? (
                      <Loader2
                        className="h-3.5 w-3.5 shrink-0 animate-spin text-sage-600 dark:text-sage-400"
                        aria-hidden
                      />
                    ) : segmentDotClass ? (
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${segmentDotClass}`}
                        aria-hidden
                      />
                    ) : null}
                    <span className="truncate" title={job.jobNumber || undefined}>
                      {job.jobNumber || '—'}
                    </span>
                  </span>
                </td>
                <td className="w-[6.75rem] max-w-[6.75rem] px-2 py-3 text-sm">
                  <span className="inline-flex max-w-full items-center gap-1">
                    {shouldShowProjectPipelineFlagWarning(job.flag) ? (
                      <span
                        className="inline-flex shrink-0 cursor-help"
                        title={normalizeProjectPipelineFlag(job.flag)}
                        aria-label={t('flaggedProjectAria', {
                          flag: normalizeProjectPipelineFlag(job.flag),
                        })}
                      >
                        <AlertTriangle
                          className={`h-3.5 w-3.5 shrink-0 ${getProjectPipelineFlagWarningIconClassName(job.flag)}`}
                          aria-hidden
                        />
                      </span>
                    ) : null}
                    <ProjectStatusPill status={effectiveProjectStatusForFilter(job)} />
                  </span>
                </td>
                <td
                  className="truncate px-3 py-3 text-sm text-neutral-800 dark:text-neutral-200"
                  title={job.client || undefined}
                >
                  {job.client || '—'}
                </td>
                <td
                  className="truncate px-3 py-3 text-sm text-neutral-800 dark:text-neutral-200"
                  title={job.propertyLocation || undefined}
                >
                  {job.propertyLocation || '—'}
                </td>
                <td className="px-3 py-3 text-sm">
                  <AppraiserConsultantPills value={job.appraiserConsultant} />
                </td>
                <td className={`whitespace-nowrap px-3 py-3 text-sm text-neutral-700 dark:text-neutral-300 ${dueDateCellClass}`}>
                  {formatPipelineDateCell(job.dueDate)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                  {job.service || '—'}
                </td>
                <td
                  className="w-[7.5rem] max-w-[7.5rem] overflow-hidden px-3 py-3 text-sm"
                  onClick={stopRowActivation}
                  onKeyDown={stopRowActivation}
                >
                  {canEditProjectPipelineReviewStatus(job, viewerDisplayName, {
                    isAdmin: viewerIsAdmin,
                  }) ? (
                    <ReviewStatusSelect
                      key={`${getJobRowKey(job)}-${normalizeProjectPipelineReviewStatus(job.reviewStatus)}`}
                      value={normalizeProjectPipelineReviewStatus(job.reviewStatus)}
                      onChange={(e) =>
                        void handleInlineFieldUpdate(job, e.target.value)
                      }
                      disabled={inlineSaving}
                      aria-label={t('columnReviewStatus')}
                      emptyOptionLabel={t('fieldEmptyOption')}
                      className="h-8 max-w-[7.5rem] text-[11px]"
                    />
                  ) : (
                    <span
                      className={`inline-block max-w-full truncate px-2 py-0.5 text-[11px] ${getReviewStatusStyle(job.reviewStatus)}`}
                      title={normalizeProjectPipelineReviewStatus(job.reviewStatus) || undefined}
                    >
                      {getReviewStatusDisplayLabel(job.reviewStatus)}
                    </span>
                  )}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      {paginationControls}
      </>
      )}
    </div>
  );
}
