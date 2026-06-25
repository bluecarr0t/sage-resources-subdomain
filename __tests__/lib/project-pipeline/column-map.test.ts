import { buildFieldColumnMap, columnIndexToLetter } from '@/lib/project-pipeline/column-map';

describe('project-pipeline column-map', () => {
  it('maps standard headers to column indexes', () => {
    const map = buildFieldColumnMap([
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
    ]);

    expect(map.jobNumber).toBe(0);
    expect(map.commercialOutdoor).toBe(8);
    expect(map.clientEmail).toBe(14);
  });

  it('maps legacy and alternate segment header spellings', () => {
    expect(
      buildFieldColumnMap(['Job Number', 'Commerical / Outdoor']).commercialOutdoor
    ).toBe(1);
    expect(
      buildFieldColumnMap(['Job Number', 'Outdoor / Commercial']).commercialOutdoor
    ).toBe(1);
  });

  it('maps Consultant / Appraiser header to appraiserConsultant', () => {
    const map = buildFieldColumnMap(['Job Number', 'Consultant / Appraiser']);
    expect(map.appraiserConsultant).toBe(1);
  });

  it('converts column indexes to letters', () => {
    expect(columnIndexToLetter(0)).toBe('A');
    expect(columnIndexToLetter(8)).toBe('I');
    expect(columnIndexToLetter(14)).toBe('O');
  });
});
