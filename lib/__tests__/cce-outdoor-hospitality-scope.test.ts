import {
  isOutdoorHospitalityOccupancyName,
  isOutdoorHospitalityComponentSection,
  componentSectionExcludeIlikePatterns,
  componentItemExcludeIlikePatterns,
} from '@/lib/cce-outdoor-hospitality-scope';

describe('isOutdoorHospitalityOccupancyName', () => {
  it('includes lodging, camping, RV, marina, and resort-adjacent names', () => {
    expect(isOutdoorHospitalityOccupancyName('Full Service Hotel (701)')).toBe(true);
    expect(isOutdoorHospitalityOccupancyName('RV Park')).toBe(true);
    expect(isOutdoorHospitalityOccupancyName('Campground')).toBe(true);
    expect(isOutdoorHospitalityOccupancyName('Marina')).toBe(true);
    expect(isOutdoorHospitalityOccupancyName('Landscape Hotel')).toBe(true);
    expect(isOutdoorHospitalityOccupancyName('Holiday Inn')).toBe(true);
    expect(isOutdoorHospitalityOccupancyName('Multi-Family')).toBe(true);
    expect(isOutdoorHospitalityOccupancyName('Manufactured Housing')).toBe(true);
  });

  it('excludes medical, institutional, and industrial occupancies', () => {
    expect(isOutdoorHospitalityOccupancyName('General Hospital')).toBe(false);
    expect(isOutdoorHospitalityOccupancyName('Medical Office Building')).toBe(false);
    expect(isOutdoorHospitalityOccupancyName('Elementary School')).toBe(false);
    expect(isOutdoorHospitalityOccupancyName('Warehouse')).toBe(false);
    expect(isOutdoorHospitalityOccupancyName('Manufacturing Plant')).toBe(false);
  });

  it('does not match "inn" inside unrelated words', () => {
    expect(isOutdoorHospitalityOccupancyName('Spinning Facility')).toBe(false);
  });

  it('returns false for empty', () => {
    expect(isOutdoorHospitalityOccupancyName('')).toBe(false);
    expect(isOutdoorHospitalityOccupancyName(null)).toBe(false);
  });
});

describe('isOutdoorHospitalityComponentSection', () => {
  it('keeps typical construction sections', () => {
    expect(isOutdoorHospitalityComponentSection('WALL COSTS')).toBe(true);
    expect(isOutdoorHospitalityComponentSection('DOORS')).toBe(true);
    expect(isOutdoorHospitalityComponentSection(null)).toBe(true);
  });

  it('drops institutional / specialized sections', () => {
    expect(isOutdoorHospitalityComponentSection('HOSPITAL EQUIPMENT')).toBe(false);
    expect(isOutdoorHospitalityComponentSection('PRISON SECURITY')).toBe(false);
    expect(isOutdoorHospitalityComponentSection('DATA CENTER')).toBe(false);
  });

  it('drops aerators, commercial terminal units, and truncated public-building headers', () => {
    expect(isOutdoorHospitalityComponentSection('AERATORS')).toBe(false);
    expect(isOutdoorHospitalityComponentSection('AIR TERMINAL UNITS')).toBe(false);
    expect(isOutdoorHospitalityComponentSection('AND PUBLIC BUILDINGS')).toBe(false);
    expect(isOutdoorHospitalityComponentSection('AND SCHOOL')).toBe(false);
    expect(isOutdoorHospitalityComponentSection('WASTEWATER TREATMENT')).toBe(false);
    expect(isOutdoorHospitalityComponentSection('SEGREGATED COST METHOD')).toBe(false);
  });
});

describe('componentSectionExcludeIlikePatterns', () => {
  it('returns ilike patterns with wildcards', () => {
    const p = componentSectionExcludeIlikePatterns();
    expect(p.length).toBeGreaterThan(5);
    expect(p.some((x) => x.includes('HOSPITAL'))).toBe(true);
    expect(p.some((x) => x.includes('AERATOR'))).toBe(true);
    expect(p.some((x) => x.includes('PUBLIC BUILDINGS'))).toBe(true);
  });
});

describe('componentItemExcludeIlikePatterns', () => {
  it('includes institutional equipment fragments', () => {
    const p = componentItemExcludeIlikePatterns();
    expect(p.some((x) => x.includes('JAIL'))).toBe(true);
    expect(p.some((x) => x.includes('BANK'))).toBe(true);
  });
});
