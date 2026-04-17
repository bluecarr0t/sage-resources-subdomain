import { arrayToCsv } from '@/lib/sage-ai/csv-download';

describe('arrayToCsv', () => {
  it('returns empty string for empty data', () => {
    expect(arrayToCsv([])).toBe('');
  });

  it('serializes simple primitive rows', () => {
    const csv = arrayToCsv([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ]);
    expect(csv).toBe('id,name\r\n1,Alpha\r\n2,Beta');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = arrayToCsv([
      { v: 'a,b' },
      { v: 'has "quotes"' },
      { v: 'line1\nline2' },
    ]);
    expect(csv).toBe('v\r\n"a,b"\r\n"has ""quotes"""\r\n"line1\nline2"');
  });

  it('serializes nested objects as JSON (JSONB-safe)', () => {
    const csv = arrayToCsv([
      { id: 1, amenities: { wifi: true, pets: false } },
    ]);
    expect(csv).toContain('"{""wifi"":true,""pets"":false}"');
    expect(csv).not.toContain('[object Object]');
  });

  it('serializes arrays as JSON', () => {
    const csv = arrayToCsv([{ tags: ['cabin', 'yurt'] }]);
    expect(csv).toContain('"[""cabin"",""yurt""]"');
  });

  it('renders null and undefined as empty cells', () => {
    const csv = arrayToCsv([{ a: null, b: undefined, c: 'x' }]);
    expect(csv).toBe('a,b,c\r\n,,x');
  });

  it('unions keys across heterogeneous rows', () => {
    const csv = arrayToCsv([
      { a: 1 },
      { b: 2 },
      { a: 3, b: 4 },
    ]);
    expect(csv).toBe('a,b\r\n1,\r\n,2\r\n3,4');
  });
});
