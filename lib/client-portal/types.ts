import type {
  ClientPortalFileRole,
  ClientPortalRequestStatus,
} from '@/lib/client-portal/constants';
import type { ClientPortalEligibilityReason } from '@/lib/client-portal/eligibility';
import type { ClientPortalStage } from '@/lib/client-portal/stages';

export type ClientPortalEngagement = {
  id: string;
  jobNumber: string;
  enabled: boolean;
  invitedEmail: string;
  invitedAt: string | null;
  welcomeSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientPortalUpdate = {
  id: string;
  engagementId: string;
  body: string;
  createdByEmail: string;
  createdByDisplayName: string;
  createdAt: string;
  emailedAt: string | null;
};

export type ClientPortalRequest = {
  id: string;
  engagementId: string;
  title: string;
  body: string;
  status: ClientPortalRequestStatus;
  createdByEmail: string;
  createdByDisplayName: string;
  createdAt: string;
  clientResponse: string;
  submittedAt: string | null;
  clearedAt: string | null;
  clearedByEmail: string | null;
};

export type ClientPortalFile = {
  id: string;
  engagementId: string;
  requestId: string | null;
  label: string;
  storagePath: string | null;
  externalUrl: string | null;
  uploadedByRole: ClientPortalFileRole;
  uploadedByEmail: string;
  createdAt: string;
};

export type ClientPortalSafeJob = {
  jobNumber: string;
  client: string;
  propertyLocation: string;
  service: string;
  dueDate: string;
  contractStart: string;
  projectStatus: string;
  stage: ClientPortalStage;
  blocked: boolean;
};

export type ClientPortalWorkspace = {
  job: ClientPortalSafeJob;
  engagement: ClientPortalEngagement | null;
  updates: ClientPortalUpdate[];
  requests: ClientPortalRequest[];
  files: ClientPortalFile[];
  openRequestCount: number;
};

export type ClientPortalStaffWorkspace = ClientPortalWorkspace & {
  eligible: boolean;
  eligibilityReasons: ClientPortalEligibilityReason[];
  invitedEmail: string;
};
