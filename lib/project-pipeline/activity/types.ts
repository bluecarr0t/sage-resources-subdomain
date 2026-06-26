export type ProjectPipelineActivityAction =
  | 'job_created'
  | 'job_updated'
  | 'job_deleted'
  | 'review_action'
  | 'project_status_updated'
  | 'sheet_sync_created'
  | 'sheet_sync_updated'
  | 'sheet_sync_removed';

export type ProjectPipelineActivityChange = {
  field: string;
  label: string;
  previousValue: string;
  newValue: string;
};

export type ProjectPipelineJobActivityEntry = {
  id: number;
  createdAt: string;
  sheetId: string;
  sheetName: string;
  jobNumber: string;
  client: string;
  appraiserConsultant: string;
  projMgr: string;
  action: ProjectPipelineActivityAction;
  actorUserId: string | null;
  actorEmail: string;
  actorDisplayName: string;
  changes: ProjectPipelineActivityChange[];
  metadata: Record<string, unknown>;
};

export type ProjectPipelineJobActivityListResult = {
  entries: ProjectPipelineJobActivityEntry[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};
