import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

const FIELD_LABELS: Record<string, string> = {
  jobNumber: 'Job #',
  client: 'Client',
  propertyLocation: 'Property',
  appraiserConsultant: 'Consultant',
  projMgr: 'Project manager',
  contractStart: 'Contract start',
  dueDate: 'Due date',
  dateCompleted: 'Date completed',
  commercialOutdoor: 'Segment',
  propertyType: 'Property type',
  service: 'Service',
  reviewStatus: 'Review status',
  sentToClient: 'Sent to client',
  authorSlackUsername: 'Slack username',
  clientEmail: 'Client email',
  projectStatus: 'Project status',
  flag: 'Flag',
  notes: 'Notes',
};

export function getProjectPipelineActivityFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export const PROJECT_PIPELINE_ACTIVITY_TRACKED_FIELDS = [
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
  'projectStatus',
  'flag',
  'notes',
] as const satisfies readonly (keyof ProjectPipelineJob)[];
