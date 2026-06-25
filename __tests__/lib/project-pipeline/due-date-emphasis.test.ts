import {
  formatProjectPipelineSheetDate,
  getProjectPipelineDueDateEmphasis,
  getProjectPipelineDueDateRowClassName,
  getProjectPipelineJobRowClassName,
  isProjectPipelineDueDateParseable,
  projectPipelineDueDateFromInputValue,
  projectPipelineDueDateToInputValue,
} from '@/lib/project-pipeline/due-date-emphasis';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function job(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Client',
    propertyLocation: 'Location',
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
    authorSlackUsername: '',
    clientEmail: '',
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    ...overrides,
  };
}

const now = new Date('2026-06-23T12:00:00.000Z');

describe('getProjectPipelineDueDateEmphasis', () => {
  it('returns null for completed jobs', () => {
    expect(
      getProjectPipelineDueDateEmphasis(
        job({ dateCompleted: '06/01/2026', dueDate: '05/01/2026' }),
        now
      )
    ).toBeNull();
  });

  it('returns null when project status is Completed even without date completed', () => {
    expect(
      getProjectPipelineDueDateEmphasis(
        job({ projectStatus: 'Completed', dueDate: '03/12/2026' }),
        now
      )
    ).toBeNull();
  });

  it('flags past-due incomplete jobs', () => {
    expect(getProjectPipelineDueDateEmphasis(job({ dueDate: '06/01/2026' }), now)).toBe(
      'past-due'
    );
  });

  it('flags due-soon within 30 days', () => {
    expect(getProjectPipelineDueDateEmphasis(job({ dueDate: '07/10/2026' }), now)).toBe(
      'due-soon'
    );
  });

  it('returns null when due date is beyond 30 days', () => {
    expect(getProjectPipelineDueDateEmphasis(job({ dueDate: '08/15/2026' }), now)).toBeNull();
  });
});

describe('formatProjectPipelineSheetDate', () => {
  it('formats dates as m/d/yy without a leading zero on the month', () => {
    expect(formatProjectPipelineSheetDate('01/14/2026')).toBe('1/14/26');
    expect(formatProjectPipelineSheetDate('03/04/2026')).toBe('3/4/26');
    expect(formatProjectPipelineSheetDate('5/13/26')).toBe('5/13/26');
    expect(formatProjectPipelineSheetDate('6/8/2026')).toBe('6/8/26');
  });

  it('returns non-date values unchanged', () => {
    expect(formatProjectPipelineSheetDate('CANCELLED')).toBe('CANCELLED');
    expect(formatProjectPipelineSheetDate('')).toBe('');
  });
});

describe('getProjectPipelineJobRowClassName', () => {
  it('returns green row classes for completed project status', () => {
    expect(
      getProjectPipelineJobRowClassName({ projectStatus: 'Completed' }, 'past-due')
    ).toMatch(/green/);
  });

  it('uses due-date emphasis when project status is not completed', () => {
    expect(getProjectPipelineJobRowClassName({ projectStatus: 'In-Progress' }, 'past-due')).toMatch(
      /red/
    );
  });
});

describe('getProjectPipelineDueDateRowClassName', () => {
  it('returns emphasis-specific row classes', () => {
    expect(getProjectPipelineDueDateRowClassName('past-due')).toMatch(/red/);
    expect(getProjectPipelineDueDateRowClassName('due-soon')).toMatch(/amber/);
    expect(getProjectPipelineDueDateRowClassName(null)).toMatch(/neutral/);
  });
});

describe('due date picker helpers', () => {
  it('detects non-date sheet values', () => {
    expect(isProjectPipelineDueDateParseable('CANCELLED')).toBe(false);
    expect(isProjectPipelineDueDateParseable('3/4/26')).toBe(true);
    expect(isProjectPipelineDueDateParseable('')).toBe(true);
  });

  it('round-trips through the HTML date input format', () => {
    expect(projectPipelineDueDateToInputValue('3/4/26')).toBe('2026-03-04');
    expect(projectPipelineDueDateFromInputValue('2026-03-04')).toBe('3/4/26');
    expect(projectPipelineDueDateToInputValue('CANCELLED')).toBe('');
  });
});
