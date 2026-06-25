import { parseAppraiserConsultantValues } from '@/lib/project-pipeline/appraiser-consultant-display';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textIncludesQuery(text: string, query: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes(query);
}

/** Match a search token against one consultant/appraiser display name. */
function consultantNameMatchesQuery(name: string, query: string): boolean {
  const normalizedName = name.trim();
  if (!normalizedName) return false;

  if (textIncludesQuery(normalizedName, query)) return true;

  const pattern = new RegExp(`\\b${escapeRegExp(query)}`, 'i');
  return pattern.test(normalizedName);
}

export function jobAppraiserConsultantMatchesSearchQuery(
  appraiserConsultant: string | null | undefined,
  query: string
): boolean {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return true;

  const consultants = parseAppraiserConsultantValues(appraiserConsultant);
  if (consultants.some((name) => consultantNameMatchesQuery(name, trimmedQuery))) {
    return true;
  }

  return textIncludesQuery(appraiserConsultant ?? '', trimmedQuery);
}

export function jobMatchesProjectPipelineSearchQuery(
  job: Pick<ProjectPipelineJob, 'jobNumber' | 'client' | 'propertyLocation' | 'appraiserConsultant'>,
  query: string
): boolean {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return true;

  if (
    textIncludesQuery(job.jobNumber, trimmedQuery) ||
    textIncludesQuery(job.client, trimmedQuery) ||
    textIncludesQuery(job.propertyLocation, trimmedQuery)
  ) {
    return true;
  }

  return jobAppraiserConsultantMatchesSearchQuery(job.appraiserConsultant, trimmedQuery);
}
