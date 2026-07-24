import { ghlFetch, type GhlConfig } from '@/lib/ghl/client';

export const GHL_JOB_NUMBER_CUSTOM_FIELD_KEY = 'job_number';
export const GHL_REPORT_SENT_TO_CLIENT_STAGE_NAME = 'Report Sent to Client';

export type GhlCustomField = {
  id?: string;
  key?: string;
  fieldKey?: string;
  fieldValue?: unknown;
  field_value?: unknown;
};

export type GhlOpportunity = {
  id: string;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  customFields?: GhlCustomField[];
};

export type GhlPipelineStage = {
  id: string;
  name: string;
};

export type GhlPipeline = {
  id: string;
  name?: string;
  stages?: GhlPipelineStage[];
};

function stringifyFieldValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(stringifyFieldValue).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('value' in record) return stringifyFieldValue(record.value);
    return '';
  }
  return '';
}

/** Normalize GHL opportunity custom-field keys (`job_number` / `opportunity.job_number`). */
export function normalizeGhlOpportunityFieldKey(key: string | null | undefined): string {
  const trimmed = (key ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/^opportunity\./i, '').toLowerCase();
}

export function getOpportunityJobNumber(opportunity: GhlOpportunity): string | null {
  const fields = opportunity.customFields ?? [];
  for (const field of fields) {
    const rawKey = field.key ?? field.fieldKey ?? '';
    if (normalizeGhlOpportunityFieldKey(rawKey) !== GHL_JOB_NUMBER_CUSTOM_FIELD_KEY) {
      continue;
    }
    const value = stringifyFieldValue(field.fieldValue ?? field.field_value);
    return value || null;
  }
  return null;
}

export function opportunityMatchesJobNumber(
  opportunity: GhlOpportunity,
  jobNumber: string
): boolean {
  const expected = jobNumber.trim();
  if (!expected) return false;
  const actual = getOpportunityJobNumber(opportunity);
  return actual != null && actual === expected;
}

export function findStageIdByName(
  pipelines: readonly GhlPipeline[],
  pipelineId: string,
  stageName: string
): string | null {
  const pipeline = pipelines.find((p) => p.id === pipelineId);
  if (!pipeline?.stages?.length) return null;

  const target = stageName.trim().toLowerCase();
  const match = pipeline.stages.find((stage) => stage.name.trim().toLowerCase() === target);
  return match?.id ?? null;
}

type SearchOpportunitiesResponse = {
  opportunities?: GhlOpportunity[];
};

type GetPipelinesResponse = {
  pipelines?: GhlPipeline[];
};

type GetOpportunityResponse = {
  opportunity?: GhlOpportunity;
} & GhlOpportunity;

async function searchOpportunitiesPage(
  config: GhlConfig,
  jobNumber: string,
  page: number
): Promise<GhlOpportunity[]> {
  const params = new URLSearchParams({
    location_id: config.locationId,
    pipeline_id: config.pipelineId,
    q: jobNumber,
    status: 'all',
    limit: '100',
    page: String(page),
  });

  const data = await ghlFetch<SearchOpportunitiesResponse>(
    config,
    `/opportunities/search?${params.toString()}`
  );
  return data.opportunities ?? [];
}

async function getOpportunityById(
  config: GhlConfig,
  opportunityId: string
): Promise<GhlOpportunity | null> {
  const data = await ghlFetch<GetOpportunityResponse>(
    config,
    `/opportunities/${encodeURIComponent(opportunityId)}`
  );
  if (data.opportunity?.id) return data.opportunity;
  if (data.id) {
    return {
      id: data.id,
      name: data.name,
      pipelineId: data.pipelineId,
      pipelineStageId: data.pipelineStageId,
      customFields: data.customFields,
    };
  }
  return null;
}

/**
 * Find opportunities whose custom field `job_number` exactly matches.
 * Searches by query + pipeline, then verifies the custom field (GET if search omits keys).
 */
export async function findOpportunitiesByJobNumber(
  config: GhlConfig,
  jobNumber: string
): Promise<GhlOpportunity[]> {
  const expected = jobNumber.trim();
  if (!expected) return [];

  const seenIds = new Set<string>();
  const candidates: GhlOpportunity[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const pageRows = await searchOpportunitiesPage(config, expected, page);
    if (pageRows.length === 0) break;

    for (const row of pageRows) {
      if (!row.id || seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      candidates.push(row);
    }

    if (pageRows.length < 100) break;
  }

  const matches: GhlOpportunity[] = [];

  for (const candidate of candidates) {
    if (opportunityMatchesJobNumber(candidate, expected)) {
      matches.push(candidate);
      continue;
    }

    // Search payloads sometimes omit custom field keys — load full opportunity.
    if (!candidate.customFields?.length || getOpportunityJobNumber(candidate) == null) {
      const full = await getOpportunityById(config, candidate.id);
      if (full && opportunityMatchesJobNumber(full, expected)) {
        matches.push(full);
      }
    }
  }

  return matches;
}

export async function resolveReportSentToClientStageId(
  config: GhlConfig
): Promise<string | null> {
  const params = new URLSearchParams({ locationId: config.locationId });
  const data = await ghlFetch<GetPipelinesResponse>(
    config,
    `/opportunities/pipelines?${params.toString()}`
  );
  return findStageIdByName(
    data.pipelines ?? [],
    config.pipelineId,
    GHL_REPORT_SENT_TO_CLIENT_STAGE_NAME
  );
}

export async function updateOpportunityStage(
  config: GhlConfig,
  opportunityId: string,
  pipelineStageId: string
): Promise<void> {
  await ghlFetch(config, `/opportunities/${encodeURIComponent(opportunityId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      pipelineId: config.pipelineId,
      pipelineStageId,
    }),
  });
}

export type MoveOpportunityToReportSentResult =
  | { status: 'updated'; opportunityId: string }
  | { status: 'already_on_stage'; opportunityId: string }
  | { status: 'not_found' }
  | { status: 'ambiguous'; opportunityIds: string[] }
  | { status: 'stage_missing' };

/**
 * Move the opportunity matching `jobNumber` to "Report Sent to Client".
 */
export async function moveOpportunityToReportSentToClient(
  config: GhlConfig,
  jobNumber: string
): Promise<MoveOpportunityToReportSentResult> {
  const matches = await findOpportunitiesByJobNumber(config, jobNumber);

  if (matches.length === 0) {
    return { status: 'not_found' };
  }
  if (matches.length > 1) {
    return {
      status: 'ambiguous',
      opportunityIds: matches.map((m) => m.id),
    };
  }

  const opportunity = matches[0];
  const stageId = await resolveReportSentToClientStageId(config);
  if (!stageId) {
    return { status: 'stage_missing' };
  }

  if (opportunity.pipelineStageId === stageId) {
    return { status: 'already_on_stage', opportunityId: opportunity.id };
  }

  await updateOpportunityStage(config, opportunity.id, stageId);
  return { status: 'updated', opportunityId: opportunity.id };
}
