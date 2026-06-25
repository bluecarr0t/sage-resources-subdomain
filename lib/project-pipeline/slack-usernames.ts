export const PROJECT_PIPELINE_SLACK_USERNAMES = [
  'cipriano',
  'marran',
  'reid',
  'greg',
  'garwood',
  'ambriz',
  'heilala',
  'ulyana',
] as const;

export type ProjectPipelineSlackUsername = (typeof PROJECT_PIPELINE_SLACK_USERNAMES)[number];
