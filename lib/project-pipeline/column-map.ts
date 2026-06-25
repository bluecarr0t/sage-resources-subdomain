import type { ProjectPipelineEditableField, ProjectPipelineFieldColumnMap } from './types';

export function normalizePipelineHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '_')
    .replace(/\s+/g, '_');
}

export const PIPELINE_HEADER_TO_FIELD: Record<string, ProjectPipelineEditableField> = {
  job_number: 'jobNumber',
  client: 'client',
  property_location: 'propertyLocation',
  appraiser_consultant: 'appraiserConsultant',
  consultant_appraiser: 'appraiserConsultant',
  proj_mgr: 'projMgr',
  contract_start: 'contractStart',
  due_date: 'dueDate',
  date_completed: 'dateCompleted',
  commercial_outdoor: 'commercialOutdoor',
  commerical_outdoor: 'commercialOutdoor',
  outdoor_commercial: 'commercialOutdoor',
  property_type: 'propertyType',
  service: 'service',
  review_status: 'reviewStatus',
  sent_to_client: 'sentToClient',
  author_slack_username: 'authorSlackUsername',
  client_email: 'clientEmail',
};

export function buildFieldColumnMap(
  headerRow: readonly string[]
): ProjectPipelineFieldColumnMap {
  const map: ProjectPipelineFieldColumnMap = {};

  headerRow.forEach((header, index) => {
    const field = PIPELINE_HEADER_TO_FIELD[normalizePipelineHeader(header)];
    if (field) {
      map[field] = index;
    }
  });

  return map;
}

/** 0-based column index → A1 notation column letter(s). */
export function columnIndexToLetter(index: number): string {
  let remaining = index;
  let label = '';

  while (remaining >= 0) {
    label = String.fromCharCode((remaining % 26) + 65) + label;
    remaining = Math.floor(remaining / 26) - 1;
  }

  return label;
}
