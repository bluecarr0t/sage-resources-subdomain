import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CLIENT_PORTAL_ENGAGEMENTS_TABLE,
  CLIENT_PORTAL_FILES_TABLE,
  CLIENT_PORTAL_REQUESTS_TABLE,
  CLIENT_PORTAL_SIGNED_URL_SECONDS,
  CLIENT_PORTAL_STORAGE_BUCKET,
  CLIENT_PORTAL_UPDATES_TABLE,
  type ClientPortalFileRole,
} from '@/lib/client-portal/constants';
import { normalizeClientPortalEmail } from '@/lib/client-portal/eligibility';
import { normalizeClientPortalRequestStatus } from '@/lib/client-portal/request-status';
import type {
  ClientPortalEngagement,
  ClientPortalFile,
  ClientPortalRequest,
  ClientPortalUpdate,
} from '@/lib/client-portal/types';
import { PROJECT_PIPELINE_JOBS_TABLE, projectPipelineJobFromDbRow } from '@/lib/project-pipeline/db-row';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import type { ProjectPipelineJobDbRow } from '@/lib/project-pipeline/db-row';

type EngagementRow = {
  id: string;
  job_number: string;
  enabled: boolean;
  invited_email: string;
  invited_at: string | null;
  welcome_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type UpdateRow = {
  id: string;
  engagement_id: string;
  body: string;
  created_by_email: string;
  created_by_display_name: string;
  created_at: string;
  emailed_at: string | null;
};

type RequestRow = {
  id: string;
  engagement_id: string;
  title: string;
  body: string;
  status: string;
  created_by_email: string;
  created_by_display_name: string;
  created_at: string;
  client_response: string;
  submitted_at: string | null;
  cleared_at: string | null;
  cleared_by_email: string | null;
};

type FileRow = {
  id: string;
  engagement_id: string;
  request_id: string | null;
  label: string;
  storage_path: string | null;
  external_url: string | null;
  uploaded_by_role: string;
  uploaded_by_email: string;
  created_at: string;
};

function mapEngagement(row: EngagementRow): ClientPortalEngagement {
  return {
    id: row.id,
    jobNumber: row.job_number,
    enabled: Boolean(row.enabled),
    invitedEmail: row.invited_email ?? '',
    invitedAt: row.invited_at,
    welcomeSentAt: row.welcome_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUpdate(row: UpdateRow): ClientPortalUpdate {
  return {
    id: row.id,
    engagementId: row.engagement_id,
    body: row.body,
    createdByEmail: row.created_by_email,
    createdByDisplayName: row.created_by_display_name,
    createdAt: row.created_at,
    emailedAt: row.emailed_at,
  };
}

function mapRequest(row: RequestRow): ClientPortalRequest {
  return {
    id: row.id,
    engagementId: row.engagement_id,
    title: row.title,
    body: row.body ?? '',
    status: normalizeClientPortalRequestStatus(row.status),
    createdByEmail: row.created_by_email,
    createdByDisplayName: row.created_by_display_name,
    createdAt: row.created_at,
    clientResponse: row.client_response ?? '',
    submittedAt: row.submitted_at,
    clearedAt: row.cleared_at,
    clearedByEmail: row.cleared_by_email,
  };
}

function mapFile(row: FileRow): ClientPortalFile {
  const role: ClientPortalFileRole =
    row.uploaded_by_role === 'client' ? 'client' : 'staff';
  return {
    id: row.id,
    engagementId: row.engagement_id,
    requestId: row.request_id,
    label: row.label || 'File',
    storagePath: row.storage_path,
    externalUrl: row.external_url,
    uploadedByRole: role,
    uploadedByEmail: row.uploaded_by_email,
    createdAt: row.created_at,
  };
}

export async function fetchLatestProjectPipelineJobByNumber(
  supabase: SupabaseClient,
  jobNumber: string
): Promise<ProjectPipelineJob | null> {
  const trimmed = jobNumber.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from(PROJECT_PIPELINE_JOBS_TABLE)
    .select('*')
    .eq('job_number', trimmed)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return projectPipelineJobFromDbRow(data as ProjectPipelineJobDbRow);
}

export async function fetchClientPortalEngagementByJobNumber(
  supabase: SupabaseClient,
  jobNumber: string
): Promise<ClientPortalEngagement | null> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_ENGAGEMENTS_TABLE)
    .select('*')
    .eq('job_number', jobNumber.trim())
    .maybeSingle();

  if (error || !data) return null;
  return mapEngagement(data as EngagementRow);
}

export async function fetchEnabledClientPortalEngagements(
  supabase: SupabaseClient,
  limit = 50
): Promise<ClientPortalEngagement[]> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_ENGAGEMENTS_TABLE)
    .select('*')
    .eq('enabled', true)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as EngagementRow[]).map(mapEngagement);
}

export async function fetchEnabledClientPortalEngagementsForEmail(
  supabase: SupabaseClient,
  email: string
): Promise<ClientPortalEngagement[]> {
  const normalized = normalizeClientPortalEmail(email);
  if (!normalized) return [];

  const { data, error } = await supabase
    .from(CLIENT_PORTAL_ENGAGEMENTS_TABLE)
    .select('*')
    .eq('enabled', true)
    .ilike('invited_email', normalized)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return (data as EngagementRow[]).map(mapEngagement);
}

export async function upsertClientPortalEngagement(
  supabase: SupabaseClient,
  input: {
    jobNumber: string;
    enabled: boolean;
    invitedEmail: string;
    markInvited?: boolean;
    markWelcomeSent?: boolean;
  }
): Promise<ClientPortalEngagement> {
  const now = new Date().toISOString();
  const invitedEmail = normalizeClientPortalEmail(input.invitedEmail);
  const existing = await fetchClientPortalEngagementByJobNumber(
    supabase,
    input.jobNumber
  );

  const payload: Record<string, unknown> = {
    job_number: input.jobNumber.trim(),
    enabled: input.enabled,
    invited_email: invitedEmail,
    updated_at: now,
  };
  if (input.markInvited) payload.invited_at = now;
  if (input.markWelcomeSent) payload.welcome_sent_at = now;

  if (existing) {
    const { data, error } = await supabase
      .from(CLIENT_PORTAL_ENGAGEMENTS_TABLE)
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update client portal engagement');
    }
    return mapEngagement(data as EngagementRow);
  }

  const { data, error } = await supabase
    .from(CLIENT_PORTAL_ENGAGEMENTS_TABLE)
    .insert(payload)
    .select('*')
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create client portal engagement');
  }
  return mapEngagement(data as EngagementRow);
}

export async function fetchClientPortalUpdates(
  supabase: SupabaseClient,
  engagementId: string
): Promise<ClientPortalUpdate[]> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_UPDATES_TABLE)
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as UpdateRow[]).map(mapUpdate);
}

export async function insertClientPortalUpdate(
  supabase: SupabaseClient,
  input: {
    engagementId: string;
    body: string;
    createdByEmail: string;
    createdByDisplayName: string;
    emailedAt?: string | null;
  }
): Promise<ClientPortalUpdate> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_UPDATES_TABLE)
    .insert({
      engagement_id: input.engagementId,
      body: input.body.trim(),
      created_by_email: input.createdByEmail,
      created_by_display_name: input.createdByDisplayName,
      emailed_at: input.emailedAt ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save client portal update');
  }
  return mapUpdate(data as UpdateRow);
}

export async function fetchClientPortalRequests(
  supabase: SupabaseClient,
  engagementId: string
): Promise<ClientPortalRequest[]> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_REQUESTS_TABLE)
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as RequestRow[]).map(mapRequest);
}

export async function insertClientPortalRequest(
  supabase: SupabaseClient,
  input: {
    engagementId: string;
    title: string;
    body: string;
    createdByEmail: string;
    createdByDisplayName: string;
  }
): Promise<ClientPortalRequest> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_REQUESTS_TABLE)
    .insert({
      engagement_id: input.engagementId,
      title: input.title.trim(),
      body: input.body.trim(),
      status: 'open',
      created_by_email: input.createdByEmail,
      created_by_display_name: input.createdByDisplayName,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save client portal request');
  }
  return mapRequest(data as RequestRow);
}

export async function updateClientPortalRequest(
  supabase: SupabaseClient,
  requestId: string,
  patch: Record<string, unknown>
): Promise<ClientPortalRequest> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_REQUESTS_TABLE)
    .update(patch)
    .eq('id', requestId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update client portal request');
  }
  return mapRequest(data as RequestRow);
}

export async function fetchClientPortalFiles(
  supabase: SupabaseClient,
  engagementId: string
): Promise<ClientPortalFile[]> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_FILES_TABLE)
    .select('*')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as FileRow[]).map(mapFile);
}

export async function insertClientPortalFile(
  supabase: SupabaseClient,
  input: {
    engagementId: string;
    requestId?: string | null;
    label: string;
    storagePath?: string | null;
    externalUrl?: string | null;
    uploadedByRole: ClientPortalFileRole;
    uploadedByEmail: string;
  }
): Promise<ClientPortalFile> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_FILES_TABLE)
    .insert({
      engagement_id: input.engagementId,
      request_id: input.requestId ?? null,
      label: input.label.trim() || 'File',
      storage_path: input.storagePath ?? null,
      external_url: input.externalUrl ?? null,
      uploaded_by_role: input.uploadedByRole,
      uploaded_by_email: input.uploadedByEmail,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save client portal file');
  }
  return mapFile(data as FileRow);
}

export async function fetchClientPortalFileById(
  supabase: SupabaseClient,
  fileId: string
): Promise<ClientPortalFile | null> {
  const { data, error } = await supabase
    .from(CLIENT_PORTAL_FILES_TABLE)
    .select('*')
    .eq('id', fileId)
    .maybeSingle();

  if (error || !data) return null;
  return mapFile(data as FileRow);
}

export function buildClientPortalStoragePath(input: {
  jobNumber: string;
  fileName: string;
}): string {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${input.jobNumber.trim()}/${randomUUID()}-${safeName}`;
}

export async function createClientPortalSignedUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CLIENT_PORTAL_STORAGE_BUCKET)
    .createSignedUrl(storagePath, CLIENT_PORTAL_SIGNED_URL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadClientPortalStorageFile(
  supabase: SupabaseClient,
  input: { storagePath: string; body: Buffer; contentType: string }
): Promise<void> {
  const { error } = await supabase.storage
    .from(CLIENT_PORTAL_STORAGE_BUCKET)
    .upload(input.storagePath, input.body, {
      contentType: input.contentType,
      upsert: false,
    });
  if (error) {
    throw new Error(error.message);
  }
}
