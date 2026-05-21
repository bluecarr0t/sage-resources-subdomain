import {
  formatPropertyMailingLine,
  splitPropertyMailingAddress,
} from '@/lib/format-property-mailing-line';

describe('formatPropertyMailingLine', () => {
  it('joins address with city, state, zip when city is not in address', () => {
    expect(
      formatPropertyMailingLine({
        address: '100 Main St',
        city: 'Moab',
        state: 'UT',
        zip_code: '84532',
      })
    ).toBe('100 Main St, Moab, UT, 84532');
  });

  it('skips duplicate city when address already includes it', () => {
    expect(
      formatPropertyMailingLine({
        address: '418 Amicalola Falls State Park Rd, Dawsonville',
        city: 'Dawsonville',
        state: 'GA',
        zip_code: '30534',
      })
    ).toBe('418 Amicalola Falls State Park Rd, Dawsonville, GA, 30534');
  });

  it('returns null for empty property', () => {
    expect(formatPropertyMailingLine({})).toBeNull();
  });
});

describe('splitPropertyMailingAddress', () => {
  it('puts street and city/state/zip on separate lines', () => {
    expect(
      splitPropertyMailingAddress({
        address: '418 Amicalola Falls State Park Rd, Dawsonville',
        city: 'Dawsonville',
        state: 'GA',
        zip_code: '30534',
      })
    ).toEqual({
      streetLine: '418 Amicalola Falls State Park Rd',
      cityStateZipLine: 'Dawsonville, GA, 30534',
    });
  });

  it('keeps full street when city is not embedded in address', () => {
    expect(
      splitPropertyMailingAddress({
        address: '100 Main St',
        city: 'Moab',
        state: 'UT',
        zip_code: '84532',
      })
    ).toEqual({
      streetLine: '100 Main St',
      cityStateZipLine: 'Moab, UT, 84532',
    });
  });
});
