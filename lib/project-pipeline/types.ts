import type { ProjectPipelineSegment } from './segment';
import type { ProjectPipelineProjectStatus } from './project-status';
import type { PipelineCurrentWorkloadAuthorInput } from './current-workload';

import type { ProjectPipelineReviewNote } from './review-notes';

export interface ProjectPipelineJob {
  jobNumber: string;
  client: string;
  propertyLocation: string;
  appraiserConsultant: string;
  projMgr: string;
  contractStart: string;
  dueDate: string;
  dateCompleted: string;
  commercialOutdoor: string;
  propertyType: string;
  service: string;
  reviewStatus: string;
  sentToClient: string;
  authorSlackUsername: string;
  clientEmail: string;
  /** Supabase-only workflow status (not stored in Google Sheets). */
  projectStatus: string;
  /** When true, project status was manually set by an admin and skips auto-derivation. */
  projectStatusManual?: boolean;
  /** When true, this job was saved from the UI and Supabase is authoritative over the sheet. */
  uiSourceOfTruth?: boolean;
  /** Supabase-only admin flag (not stored in Google Sheets). */
  flag?: string;
  /** Supabase-only notes (not stored in Google Sheets). */
  notes?: string;
  /** Supabase-only review workflow thread (author + admins only). */
  reviewNotes?: ProjectPipelineReviewNote[];
  /** 1-based row number in the Google Sheet (header is row 1). */
  sheetRowIndex: number;
  /** Sheet tab name when loaded from Supabase mirror (e.g. "2026 Jobs"). */
  pipelineSheetName?: string;
  /** Parsed year from the sheet tab name. */
  sheetYear?: number | null;
}

export type ProjectPipelineEditableField = Exclude<
  keyof ProjectPipelineJob,
  'sheetRowIndex' | 'pipelineSheetName' | 'sheetYear' | 'projectStatus' | 'flag' | 'notes' | 'reviewNotes'
>;

export type ProjectPipelineSupabaseOnlyField = 'projectStatus' | 'flag' | 'notes' | 'reviewNotes';

export type ProjectPipelineFieldColumnMap = Partial<
  Record<ProjectPipelineEditableField, number>
>;

export const PROJECT_PIPELINE_JOB_FIELDS = [
  'jobNumber',
  'client',
  'propertyLocation',
  'appraiserConsultant',
  'projMgr',
  'contractStart',
  'dueDate',
  'dateCompleted',
  'commercialOutdoor',
  'propertyType',
  'service',
  'reviewStatus',
  'sentToClient',
  'authorSlackUsername',
  'clientEmail',
] as const satisfies readonly ProjectPipelineEditableField[];

/** String fields mapped from Google Sheet columns (subset of editable fields). */
export type ProjectPipelineSheetField = (typeof PROJECT_PIPELINE_JOB_FIELDS)[number];

export type ProjectPipelineAuthMode = 'service_account' | 'oauth';

export interface ProjectPipelineApiResponse {
  configured: boolean;
  authMode: ProjectPipelineAuthMode | null;
  oauthClientId?: string | null;
  requiresOAuth?: boolean;
  jobs: ProjectPipelineJob[];
  total: number;
  canViewAll: boolean;
  viewerIsAdmin?: boolean;
  missingDisplayName?: boolean;
  defaultSegmentFilter?: ProjectPipelineSegment | null;
  defaultProjectStatusFilter?: ProjectPipelineProjectStatus;
  fieldColumnMap?: ProjectPipelineFieldColumnMap;
  viewerEmail?: string | null;
  viewerDisplayName?: string | null;
  viewerDivision?: string | null;
  canAuthorPreview?: boolean;
  consultantWorkloadAuthors?: PipelineCurrentWorkloadAuthorInput[];
  dataSource?: 'supabase' | 'sheets';
  /** True when hourly service-account cron sync can run server-side. */
  cronSyncEnabled?: boolean;
  sheetName?: string;
  sheetYear?: number | null;
  availableSheetTabs?: { sheetName: string; sheetYear: number | null }[];
  /** ISO timestamp of the last successful sheet → Supabase sync for the current tab. */
  lastSyncedAt?: string | null;
  /** True when the Supabase mirror exists but has fewer rows than the last successful sync. */
  mirrorIncomplete?: boolean;
}
