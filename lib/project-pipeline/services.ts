export const PROJECT_PIPELINE_SERVICES = [
  'Feasibility Study',
  'Appraisal',
  'Market Analysis',
  'Revenue Projection',
  'Update',
] as const;

export type ProjectPipelineService = (typeof PROJECT_PIPELINE_SERVICES)[number];
