import {
  projectPipelineJobFromDbRow,
  projectPipelineJobToDbRow,
  resolveProjectPipelineStoredStatusFromDbFields,
  type ProjectPipelineJobDbRow,
} from '@/lib/project-pipeline/db-row';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

const sampleJob: ProjectPipelineJob = {
  jobNumber: '23-050A-01',
  client: 'Client',
  propertyLocation: 'Austin, TX',
  appraiserConsultant: 'Luke',
  projMgr: 'Shari',
  contractStart: '03/01/2023',
  dueDate: '05/01/2023',
  dateCompleted: '',
  commercialOutdoor: 'Commercial',
  propertyType: 'RV Resort',
  service: 'Appraisal',
  reviewStatus: 'In Progress',
  sentToClient: 'Yes',
  authorSlackUsername: 'luke',
  clientEmail: 'client@example.com',
  projectStatus: 'Not Started',
  flag: 'None',
  jobNotes: [],
  sheetRowIndex: 42,
  pipelineSheetName: '2023 Vanessa Only',
  sheetYear: 2023,
};

describe('projectPipelineJob db row roundtrip', () => {
  it('roundtrips through toDbRow and fromDbRow', () => {
    const dbRow = projectPipelineJobToDbRow(sampleJob, {
      sheetId: 'sheet-id',
      sheetName: '2023 Vanessa Only',
      syncRunId: 'sync-1',
      syncedAt: '2026-06-23T00:00:00.000Z',
    });

    const restored = projectPipelineJobFromDbRow(dbRow as ProjectPipelineJobDbRow);

    expect(restored.jobNumber).toBe(sampleJob.jobNumber);
    expect(restored.pipelineSheetName).toBe('2023 Vanessa Only');
    expect(restored.sheetYear).toBe(2023);
    expect(restored.sentToClient).toBe('Yes');
  });

  it('normalizes legacy commercial_outdoor values on read', () => {
    const restored = projectPipelineJobFromDbRow({
      ...(projectPipelineJobToDbRow(sampleJob, {
        sheetId: 'sheet-id',
        sheetName: '2023 Vanessa Only',
        syncRunId: 'sync-1',
      }) as ProjectPipelineJobDbRow),
      commercial_outdoor: 'Appraisal',
    });

    expect(restored.commercialOutdoor).toBe('Commercial');
  });

  it('reclassifies appraisal jobs stored as Outdoor using the service column', () => {
    const restored = projectPipelineJobFromDbRow({
      ...(projectPipelineJobToDbRow(sampleJob, {
        sheetId: 'sheet-id',
        sheetName: '2023 Vanessa Only',
        syncRunId: 'sync-1',
      }) as ProjectPipelineJobDbRow),
      commercial_outdoor: 'Outdoor',
      service: 'Appraisal',
    });

    expect(restored.commercialOutdoor).toBe('Commercial');
  });

  it('migrates legacy On Hold flags to project status on read', () => {
    const restored = projectPipelineJobFromDbRow({
      ...(projectPipelineJobToDbRow(sampleJob, {
        sheetId: 'sheet-id',
        sheetName: '2023 Vanessa Only',
        syncRunId: 'sync-1',
      }) as ProjectPipelineJobDbRow),
      project_status: 'In-Progress',
      project_status_manual: false,
      flag: 'On Hold',
    });

    expect(restored.projectStatus).toBe('On Hold');
    expect(restored.projectStatusManual).toBe(true);
    expect(restored.flag).toBe('None');
  });

  it('derives sheet_year from tab name when omitted', () => {
    const dbRow = projectPipelineJobToDbRow(
      { ...sampleJob, sheetYear: undefined },
      {
        sheetId: 'sheet-id',
        sheetName: '2022',
        syncRunId: 'sync-1',
      }
    );

    expect(dbRow.sheet_year).toBe(2022);
  });

  it('migrates legacy text notes into jobNotes on read', () => {
    const restored = projectPipelineJobFromDbRow({
      ...(projectPipelineJobToDbRow(sampleJob, {
        sheetId: 'sheet-id',
        sheetName: '2023 Vanessa Only',
        syncRunId: 'sync-1',
      }) as ProjectPipelineJobDbRow),
      job_notes: [],
      notes: 'Kevin Gallagher is a contact in GHL but no Opportunity.',
    });

    expect(restored.jobNotes).toHaveLength(1);
    expect(restored.jobNotes?.[0]?.note).toBe(
      'Kevin Gallagher is a contact in GHL but no Opportunity.'
    );
    expect(restored.jobNotes?.[0]?.createdByDisplayName).toBe('Imported');
  });
});

describe('resolveProjectPipelineStoredStatusFromDbFields', () => {
  it('migrates legacy On Hold flags', () => {
    expect(
      resolveProjectPipelineStoredStatusFromDbFields({
        project_status: 'In-Progress',
        project_status_manual: false,
        flag: 'On Hold',
      })
    ).toEqual({
      projectStatus: 'On Hold',
      projectStatusManual: true,
    });
  });

  it('treats stored On Hold as manual even when the manual flag was not set', () => {
    expect(
      resolveProjectPipelineStoredStatusFromDbFields({
        project_status: 'On Hold',
        project_status_manual: false,
        flag: 'None',
      })
    ).toEqual({
      projectStatus: 'On Hold',
      projectStatusManual: true,
    });
  });
});
