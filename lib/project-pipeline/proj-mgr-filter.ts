import { fieldMatchesNameAliases } from '@/lib/project-pipeline/name-aliases';

export const PROJECT_PIPELINE_PROJ_MGR_FILTER_OPTIONS = ['Shari', 'Ulyana'] as const;

export type ProjectPipelineProjMgrFilterOption =
  (typeof PROJECT_PIPELINE_PROJ_MGR_FILTER_OPTIONS)[number];

export function jobMatchesProjectPipelineProjMgrFilters(
  projMgr: string | null | undefined,
  selected: readonly string[]
): boolean {
  if (!selected.length) return true;
  return selected.some((name) => fieldMatchesNameAliases(projMgr, [name]));
}
