import type { ManagedUser } from '@/lib/auth-helpers';
import { isManagedUserAdmin } from '@/lib/project-pipeline/job-edit-permissions';
import {
  DEFAULT_PROJECT_PIPELINE_SEGMENT_FILTER,
  type ProjectPipelineSegment,
} from '@/lib/project-pipeline/segment';

export type { ManagedUserDivision } from '@/lib/managed-users/division';
export {
  fromManagedUserDivisionSelectValue,
  isBothManagedUserDivision,
  managedUserDivisionMatchesSegmentFilter,
  toManagedUserDivisionSelectValue,
} from '@/lib/managed-users/division';

export type ManagedUserPipelineFields = Pick<
  ManagedUser,
  'pipeline_view_all' | 'division' | 'role'
>;

export function canViewAllPipelineJobs(
  user: ManagedUserPipelineFields | null | undefined
): boolean {
  if (!user) return false;
  return isManagedUserAdmin(user) || Boolean(user.pipeline_view_all);
}

/** Null means show both Outdoor and Commercial segments. */
export function resolvePipelineSegmentDefault(
  user: ManagedUserPipelineFields | null | undefined,
  _email?: string | null
): ProjectPipelineSegment | null {
  if (user?.division === 'commercial') return 'Commercial';
  if (user?.division === 'outdoor') return 'Outdoor';
  if (user?.division === 'both' || user?.division == null) return null;

  return DEFAULT_PROJECT_PIPELINE_SEGMENT_FILTER;
}
