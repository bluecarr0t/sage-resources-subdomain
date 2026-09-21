import {
  normalizeProjectPipelineProjectStatus,
  type ProjectPipelineProjectStatus,
} from '@/lib/project-pipeline/project-status';

export const CLIENT_PORTAL_STAGES = [
  'Intake',
  'In progress',
  'On hold',
  'Quality review',
  'Delivered',
  'Cancelled',
] as const;

export type ClientPortalStage = (typeof CLIENT_PORTAL_STAGES)[number];

export const CLIENT_PORTAL_TRACKER_STEPS = [
  'Intake',
  'In progress',
  'Quality review',
  'Delivered',
] as const satisfies readonly ClientPortalStage[];

export type ClientPortalTrackerStep = (typeof CLIENT_PORTAL_TRACKER_STEPS)[number];

const STATUS_TO_STAGE: Record<ProjectPipelineProjectStatus, ClientPortalStage> = {
  'Not Started': 'Intake',
  'In-Progress': 'In progress',
  'On Hold': 'On hold',
  'In Review': 'Quality review',
  Completed: 'Delivered',
  Cancelled: 'Cancelled',
};

export function mapProjectStatusToClientPortalStage(
  status: string | null | undefined
): ClientPortalStage {
  const normalized = normalizeProjectPipelineProjectStatus(status);
  switch (normalized) {
    case 'Not Started':
    case 'In-Progress':
    case 'On Hold':
    case 'In Review':
    case 'Completed':
    case 'Cancelled':
      return STATUS_TO_STAGE[normalized];
    default: {
      const _exhaustive: never = normalized;
      return _exhaustive;
    }
  }
}

export function isClientPortalExceptionStage(stage: ClientPortalStage): boolean {
  switch (stage) {
    case 'On hold':
    case 'Cancelled':
      return true;
    case 'Intake':
    case 'In progress':
    case 'Quality review':
    case 'Delivered':
      return false;
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

export function getClientPortalTrackerStepIndex(
  stage: ClientPortalStage
): number {
  switch (stage) {
    case 'Intake':
      return 0;
    case 'In progress':
    case 'On hold':
      return 1;
    case 'Quality review':
      return 2;
    case 'Delivered':
      return 3;
    case 'Cancelled':
      return -1;
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

export function isClientPortalBlocked(openRequestCount: number): boolean {
  return openRequestCount > 0;
}
