import type { ProjectPipelineAuthMode } from '@/lib/project-pipeline/types';

export function projectPipelineRequiresOAuthConnect(input: {
  authMode: ProjectPipelineAuthMode | null;
  mirroredCount: number;
  allowOAuthSheets: boolean;
}): boolean {
  return (
    input.authMode === 'oauth' &&
    input.mirroredCount === 0 &&
    !input.allowOAuthSheets
  );
}
