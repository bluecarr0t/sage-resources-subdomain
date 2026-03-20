import {
  csvLocationToGeocodeParts,
  parseLocationStringField,
  bestCityStateForReportGeocode,
} from '../parse-csv-location';

describe('parseLocationStringField', () => {
  it('uses penultimate segment as city when there are 3+ parts and last is a state', () => {
    expect(parseLocationStringField('North of Seminole Road, Cabazon, CA')).toEqual({
      city: 'Cabazon',
      stateRaw: 'CA',
    });
  });

  it('parses two-part City, ST', () => {
    expect(parseLocationStringField('Grants Pass, OR')).toEqual({
      city: 'Grants Pass',
      stateRaw: 'OR',
    });
  });

  it('strips trailing USA', () => {
    expect(parseLocationStringField('Austin, TX, USA')).toEqual({
      city: 'Austin',
      stateRaw: 'TX',
    });
  });
});

describe('csvLocationToGeocodeParts', () => {
  it('falls back to State column when middle segment is not a state', () => {
    const r = csvLocationToGeocodeParts('North of Seminole Road, Cabazon, CA', 'CA');
    expect(r.city).toBe('Cabazon');
    expect(r.stateAbbr).toBe('CA');
  });
});

describe('bestCityStateForReportGeocode', () => {
  it('replaces address-fragment city from DB when location parses cleanly', () => {
    const r = bestCityStateForReportGeocode({
      city: 'North of Seminole Road',
      state: 'CA',
      location: 'North of Seminole Road, Cabazon, CA',
    });
    expect(r).toEqual({ city: 'Cabazon', abbr: 'CA' });
  });
});
