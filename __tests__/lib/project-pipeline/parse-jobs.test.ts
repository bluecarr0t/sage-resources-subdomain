import { parseProjectPipelineRows } from '@/lib/project-pipeline/parse-jobs';

describe('parseProjectPipelineRows', () => {
  it('maps header row to typed job objects', () => {
    const rows = [
      [
        'Job Number',
        'Client',
        'Property Location',
        'Appraiser / Consultant',
        'Proj Mgr',
        'Contract Start',
        'Due Date',
        'Date Completed',
        'Commercial / Outdoor',
        'Property Type',
        'Service',
        'Review Status',
        'Sent to Client',
        'Author Slack Username',
        'Client Email',
      ],
      [
        '26-100A-01',
        'John Veno',
        'Hopewell Junction, NY',
        'Greg',
        'Shari',
        '01/21/2026',
        '03/20/2026',
        '',
        'Outdoor',
        'Glamping',
        'Feasibility Study',
        'Not Started',
        'No',
        'greg',
        'john@example.com',
      ],
    ];

    const jobs = parseProjectPipelineRows(rows, {
      getRowSegment: () => 'Outdoor',
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual({
      jobNumber: '26-100A-01',
      client: 'John Veno',
      propertyLocation: 'Hopewell Junction, NY',
      appraiserConsultant: 'Greg',
      projMgr: 'Shari',
      contractStart: '01/21/2026',
      dueDate: '03/20/2026',
      dateCompleted: '',
      commercialOutdoor: 'Outdoor',
      propertyType: 'Glamping',
      service: 'Feasibility Study',
      reviewStatus: '',
      sentToClient: 'No',
      authorSlackUsername: 'greg',
      clientEmail: 'john@example.com',
      projectStatus: 'In-Progress',
      flag: 'None',
      notes: '',
      sheetRowIndex: 2,
    });
  });

  it('skips empty rows', () => {
    const rows = [
      ['Job Number', 'Client'],
      ['', ''],
      ['26-101A-01', 'Fifth Third Bank'],
    ];

    const jobs = parseProjectPipelineRows(rows);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].jobNumber).toBe('26-101A-01');
  });

  it('uses row highlight only when the Commercial / Outdoor column is empty', () => {
    const rows = [
      ['Job Number', 'Client', 'Commerical / Outdoor'],
      ['26-200A-05', 'Gary Peterson', ''],
      ['26-200A-06', 'Other Client', 'Commercial'],
    ];

    const jobs = parseProjectPipelineRows(rows, {
      getRowSegment: (dataRowIndex) => (dataRowIndex === 1 ? 'Outdoor' : 'Commercial'),
    });

    expect(jobs[0].commercialOutdoor).toBe('Outdoor');
    expect(jobs[1].commercialOutdoor).toBe('Commercial');
  });

  it('prefers row highlight over Outdoor or Commercial column labels', () => {
    const rows = [
      ['Job Number', 'Client', 'Commerical / Outdoor'],
      ['26-200A-07', 'Client A', 'Outdoor'],
    ];

    const jobs = parseProjectPipelineRows(rows, {
      getRowSegment: () => 'Commercial',
    });

    expect(jobs[0].commercialOutdoor).toBe('Commercial');
  });

  it('maps non-outdoor column values like Appraisal to Commercial', () => {
    const rows = [
      ['Job Number', 'Client', 'Commercial / Outdoor', 'Service'],
      ['26-200A-08', 'Client B', 'Appraisal', 'Appraisal'],
    ];

    const jobs = parseProjectPipelineRows(rows, {
      getRowSegment: () => 'Outdoor',
    });

    expect(jobs[0].commercialOutdoor).toBe('Commercial');
  });

  it('reclassifies appraisal jobs when the column and highlight say Outdoor', () => {
    const rows = [
      ['Job Number', 'Client', 'Commercial / Outdoor', 'Service'],
      ['26-203A-05', 'Client C', 'Outdoor', 'Appraisal'],
    ];

    const jobs = parseProjectPipelineRows(rows, {
      getRowSegment: () => 'Outdoor',
    });

    expect(jobs[0].commercialOutdoor).toBe('Commercial');
  });

  it('normalizes Sent to Client timestamps from the sheet to Yes', () => {
    const rows = [
      [
        'Job Number',
        'Client',
        'Appraiser / Consultant',
        'Sent to Client',
      ],
      [
        '26-107A-01',
        'Spencer RV Park',
        'Luke',
        'Yes — Sent at 03/02/26 08:57AM',
      ],
    ];

    const jobs = parseProjectPipelineRows(rows);
    expect(jobs[0].sentToClient).toBe('Yes');
    expect(jobs[0].projectStatus).toBe('Completed');
  });

  it('normalizes Not Started review status from the sheet to empty', () => {
    const rows = [
      ['Job Number', 'Client', 'Appraiser / Consultant', 'Review Status'],
      ['26-200A-01', 'Client A', 'Greg', 'Not Started'],
    ];

    const jobs = parseProjectPipelineRows(rows);
    expect(jobs[0].reviewStatus).toBe('');
  });
});
