import type { SupabaseClient } from '@supabase/supabase-js';
import { PROJECT_PIPELINE_JOB_ACTIVITY_TABLE } from '@/lib/project-pipeline/activity/record-activity';
import type {
  ProjectPipelineActivityAction,
  ProjectPipelineActivityChange,
  ProjectPipelineJobActivityEntry,
  ProjectPipelineJobActivityListResult,
} from '@/lib/project-pipeline/activity/types';

type ActivityDbRow = {
  id: number;
  created_at: string;
  sheet_id: string;
  sheet_name: string;
  job_number: string;
  client: string;
  appraiser_consultant: string;
  proj_mgr: string;
  action: ProjectPipelineActivityAction;
  actor_user_id: string | null;
  actor_email: string;
  actor_display_name: string;
  changes: ProjectPipelineActivityChange[] | null;
  metadata: Record<string, unknown> | null;
};

function mapActivityRow(row: ActivityDbRow): ProjectPipelineJobActivityEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    sheetId: row.sheet_id,
    sheetName: row.sheet_name,
    jobNumber: row.job_number,
    client: row.client,
    appraiserConsultant: row.appraiser_consultant,
    projMgr: row.proj_mgr,
    action: row.action,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    actorDisplayName: row.actor_display_name,
    changes: Array.isArray(row.changes) ? row.changes : [],
    metadata: row.metadata ?? {},
  };
}

export async function fetchProjectPipelineJobActivity(input: {
  supabase: SupabaseClient;
  page: number;
  perPage: number;
  pipelineViewAll: boolean;
  viewerEmail: string | null | undefined;
  jobNumber?: string;
  actorQuery?: string;
  sheetName?: string;
}): Promise<ProjectPipelineJobActivityListResult> {
  const page = Math.max(1, input.page);
  const perPage = Math.min(100, Math.max(1, input.perPage));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = input.supabase
    .from(PROJECT_PIPELINE_JOB_ACTIVITY_TABLE)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (!input.pipelineViewAll) {
    const email = input.viewerEmail?.trim().toLowerCase();
    if (!email) {
      return { entries: [], page, perPage, total: 0, totalPages: 0 };
    }
    query = query.contains('visible_to_emails', [email]);
  }

  if (input.jobNumber?.trim()) {
    query = query.ilike('job_number', `%${input.jobNumber.trim()}%`);
  }

  if (input.actorQuery?.trim()) {
    const actor = input.actorQuery.trim().replace(/[%_,]/g, '');
    if (actor) {
      query = query.or(`actor_email.ilike.%${actor}%,actor_display_name.ilike.%${actor}%`);
    }
  }

  if (input.sheetName?.trim()) {
    query = query.eq('sheet_name', input.sheetName.trim());
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);

  return {
    entries: (data as ActivityDbRow[] | null)?.map(mapActivityRow) ?? [],
    page,
    perPage,
    total,
    totalPages,
  };
}
