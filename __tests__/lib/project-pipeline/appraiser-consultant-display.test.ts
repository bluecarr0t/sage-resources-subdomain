import { parseAppraiserConsultantValues } from '@/lib/project-pipeline/appraiser-consultant-display';

describe('parseAppraiserConsultantValues', () => {
  it('returns empty array for blank values', () => {
    expect(parseAppraiserConsultantValues('')).toEqual([]);
    expect(parseAppraiserConsultantValues('   ')).toEqual([]);
    expect(parseAppraiserConsultantValues(null)).toEqual([]);
    expect(parseAppraiserConsultantValues(undefined)).toEqual([]);
  });

  it('returns a single name unchanged', () => {
    expect(parseAppraiserConsultantValues('Greg')).toEqual(['Greg']);
    expect(parseAppraiserConsultantValues('Mary Claire')).toEqual(['Mary Claire']);
    expect(parseAppraiserConsultantValues('Multiple')).toEqual(['Multiple']);
  });

  it('splits slash-separated names', () => {
    expect(parseAppraiserConsultantValues('Wendy / Shari')).toEqual(['Wendy', 'Shari']);
  });

  it('splits comma-separated names', () => {
    expect(parseAppraiserConsultantValues('Greg, Luke')).toEqual(['Greg', 'Luke']);
  });

  it('deduplicates repeated names case-insensitively', () => {
    expect(parseAppraiserConsultantValues('Greg / greg')).toEqual(['Greg']);
    expect(parseAppraiserConsultantValues('Luke, Luke')).toEqual(['Luke']);
  });
});
