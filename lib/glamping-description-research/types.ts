export type DescriptionPipelineStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'skipped';

export type DescriptionPipelineFailureCode =
  | 'no_url'
  | 'unsafe_url'
  | 'fetch_failed'
  | 'llm_failed'
  | 'validation_failed';

export interface DescriptionPipelineSuccess {
  ok: true;
  description: string;
  sourceUrls: string[];
  evidenceChars: number;
  model: string;
  promptVersion: string;
  validationWarnings: string[];
}

export interface DescriptionPipelineFailure {
  ok: false;
  code: DescriptionPipelineFailureCode;
  message: string;
  sourceUrls: string[];
  evidenceChars: number;
  model: string | null;
  promptVersion: string;
  validationWarnings: string[];
}

export type DescriptionPipelineResult =
  | DescriptionPipelineSuccess
  | DescriptionPipelineFailure;
