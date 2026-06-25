import { projectPipelineJobToDbRow, projectPipelineJobToSheetSyncDbRow } from '@/lib/project-pipeline/db-row';
import {
  assertProjectPipelineCronSyncConfigured,
} from '@/lib/project-pipeline/sync-to-supabase';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Greg',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '03/20/2026',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'Not Started',
    sentToClient: 'No',
    authorSlackUsername: 'greg',
    clientEmail: 'client@example.com',
    projectStatus: 'Not Started',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('projectPipelineJobToDbRow', () => {
  it('maps camelCase job fields to snake_case db columns', () => {
    const row = projectPipelineJobToDbRow(sampleJob(), {
      sheetId: 'sheet-abc',
      sheetName: '2026 Jobs',
      syncRunId: 'run-123',
      syncedAt: '2026-06-23T12:00:00.000Z',
    });

    expect(row).toEqual({
      job_number: '26-100A-01',
      client: 'Test Client',
      property_location: 'Hopewell Junction, NY',
      appraiser_consultant: 'Greg',
      proj_mgr: 'Shari',
      contract_start: '01/21/2026',
      due_date: '03/20/2026',
      date_completed: '',
      commercial_outdoor: 'Outdoor',
      property_type: 'Glamping',
      service: 'Feasibility Study',
      review_status: 'Not Started',
      sent_to_client: 'No',
      author_slack_username: 'greg',
      client_email: 'client@example.com',
      project_status: 'Not Started',
      project_status_manual: false,
      flag: 'None',
      notes: '',
      ui_source_of_truth: false,
      sheet_row_index: 2,
      sheet_id: 'sheet-abc',
      sheet_name: '2026 Jobs',
      sheet_year: 2026,
      last_sync_run_id: 'run-123',
      synced_at: '2026-06-23T12:00:00.000Z',
      updated_at: '2026-06-23T12:00:00.000Z',
    });
  });

  it('includes derived project_status in sheet sync rows', () => {
    const row = projectPipelineJobToSheetSyncDbRow(
      sampleJob({ appraiserConsultant: 'Greg', projectStatus: 'Not Started' }),
      {
      sheetId: 'sheet-abc',
      sheetName: '2026 Jobs',
      syncRunId: 'run-123',
    });

    expect(row.project_status).toBe('In-Progress');
    expect(row.project_status_manual).toBe(false);
    expect(row.job_number).toBe('26-100A-01');
  });

  it('persists manual project status flags on db rows', () => {
    const row = projectPipelineJobToDbRow(
      sampleJob({ projectStatus: 'Cancelled', projectStatusManual: true }),
      {
        sheetId: 'sheet-abc',
        sheetName: '2026 Jobs',
        syncRunId: 'run-123',
      }
    );

    expect(row.project_status).toBe('Cancelled');
    expect(row.project_status_manual).toBe(true);
  });
});

describe('assertProjectPipelineCronSyncConfigured', () => {
  it('throws when only OAuth is configured', () => {
    expect(() =>
      assertProjectPipelineCronSyncConfigured({
        NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID: 'client-id.apps.googleusercontent.com',
      })
    ).toThrow(/service account/i);
  });

  it('allows service account configuration', () => {
    expect(() =>
      assertProjectPipelineCronSyncConfigured({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: 'svc@project.iam.gserviceaccount.com',
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
      })
    ).not.toThrow();
  });
});
