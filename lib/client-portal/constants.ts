import { PROJECT_PIPELINE_SERVICES } from '@/lib/project-pipeline/services';

export const CLIENT_PORTAL_PATH = '/client-portal';

/** Gated magic-link slug. Must stay in sync with `lib/gated-access.ts`. */
export const CLIENT_PORTAL_PAGE_SLUG = 'client-portal';

export const CLIENT_PORTAL_STORAGE_BUCKET = 'client-portal-files';

export const CLIENT_PORTAL_MAX_FILE_BYTES = 25 * 1024 * 1024;

export const CLIENT_PORTAL_SIGNED_URL_SECONDS = 10 * 60;

export const CLIENT_PORTAL_SERVICES = [
  'Feasibility Study',
  'Appraisal',
] as const satisfies readonly (typeof PROJECT_PIPELINE_SERVICES)[number][];

export type ClientPortalService = (typeof CLIENT_PORTAL_SERVICES)[number];

export const CLIENT_PORTAL_REQUEST_STATUSES = [
  'open',
  'submitted',
  'cleared',
] as const;

export type ClientPortalRequestStatus =
  (typeof CLIENT_PORTAL_REQUEST_STATUSES)[number];

export const CLIENT_PORTAL_FILE_ROLES = ['staff', 'client'] as const;

export type ClientPortalFileRole = (typeof CLIENT_PORTAL_FILE_ROLES)[number];

export const CLIENT_PORTAL_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const CLIENT_PORTAL_ENGAGEMENTS_TABLE = 'client_portal_engagements';
export const CLIENT_PORTAL_UPDATES_TABLE = 'client_portal_updates';
export const CLIENT_PORTAL_REQUESTS_TABLE = 'client_portal_requests';
export const CLIENT_PORTAL_FILES_TABLE = 'client_portal_files';
