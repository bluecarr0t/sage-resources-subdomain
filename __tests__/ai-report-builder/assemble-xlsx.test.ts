/**
 * Unit tests for XLSX assembly.
 */

import * as XLSX from 'xlsx';
import { assembleDraftXlsx } from '@/lib/ai-report-builder/assemble-xlsx';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';

/** Create a minimal XLSX with ToT (Intake Form) sheet matching real template layout */
function createMinimalTotXlsx(): Buffer {
  const ws: XLSX.WorkSheet = {};
  const set = (addr: string, val: string | number) => {
    ws[addr] = { t: typeof val === 'number' ? 'n' : 's', v: val };
  };
  ws['!ref'] = 'A1:E50';
  set('B2', 'PROPERTY AND BUSINESS OVERVIEW');
  set('B6', 'Owner Name');
  set('B8', 'Legal Business Name');
  set('B9', 'Owner / Business Address');
  set('B13', 'Resort Name');
  set('B15', 'Resort Full Address');
  set('B16', 'Resort County');
  set('B17', 'Lot Size (Acres)');
  set('B19', 'Parcel Number(s)');
  set('B22', 'Unit A Quantity');
  set('B23', 'Unit A Type');
  set('B25', 'Unit B Quantity');
  set('B26', 'Unit B Type');
  set('B43', 'Total Units / Sites');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ToT (Intake Form)');
  return Buffer.from(
    XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true })
  );
}

const mockEnriched: EnrichedInput = {
  property_name: 'Test RV Resort',
  city: 'St. Augustine',
  state: 'FL',
  zip_code: '32084',
  address_1: '3455 Coastal Hwy',
  acres: 43.86,
  unit_mix: [
    { type: 'RV Standard Back-in Site', count: 100 },
    { type: 'RV Standard Pull Thru Site', count: 50 },
  ],
  client_entity: 'Test Client LLC',
  client_contact_name: 'John Doe',
  client_address: '123 Main St',
  client_city_state_zip: 'Chicago, IL 60601',
};

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    storage: {
      from: () => ({
        download: () => {
          const buf = createMinimalTotXlsx();
          const arrayBuffer = buf.buffer.slice(
            buf.byteOffset,
            buf.byteOffset + buf.byteLength
          );
          return Promise.resolve({
            data: { arrayBuffer: () => Promise.resolve(arrayBuffer) },
            error: null,
          });
        },
      }),
    },
  }),
}));

describe('assembleDraftXlsx', () => {
  it('returns a valid XLSX buffer', async () => {
    const buf = await assembleDraftXlsx(mockEnriched);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('populates ToT sheet with form data', async () => {
    const buf = await assembleDraftXlsx(mockEnriched);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['ToT (Intake Form)'];
    expect(ws).toBeDefined();

    expect(ws['C13']?.v).toBe('Test RV Resort');
    expect(ws['C6']?.v).toBe('John Doe');
    expect(ws['C8']?.v).toBe('Test Client LLC');
    expect(ws['C17']?.v).toBe(43.86);
    expect(ws['C15']?.v).toContain('3455 Coastal Hwy');
    expect(ws['C15']?.v).toContain('St. Augustine');
    expect(ws['C15']?.v).toContain('FL');
    expect(ws['C15']?.v).toContain('32084');
  });

  it('populates unit mix rows', async () => {
    const buf = await assembleDraftXlsx(mockEnriched);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['ToT (Intake Form)'];

    expect(ws['C22']?.v).toBe(100);
    expect(ws['C23']?.v).toBe('RV Standard Back-in Site');
    expect(ws['C25']?.v).toBe(50);
    expect(ws['C26']?.v).toBe('RV Standard Pull Thru Site');
    expect(ws['C43']?.v).toBe(150);
  });

  it('uses glamping template key when market_type is glamping', async () => {
    const buf = await assembleDraftXlsx(
      { ...mockEnriched, market_type: 'glamping' },
      { marketType: 'glamping' }
    );
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['ToT (Intake Form)'];
    expect(ws).toBeDefined();
    expect(ws['C13']?.v).toBe('Test RV Resort');
  });

  it('handles empty unit_mix', async () => {
    const input = { ...mockEnriched, unit_mix: [] };
    const buf = await assembleDraftXlsx(input);
    expect(Buffer.isBuffer(buf)).toBe(true);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['ToT (Intake Form)'];
    expect(ws['C43']?.v).toBe(0);
  });

  it('handles optional fields as undefined', async () => {
    const minimal = {
      property_name: 'Minimal Resort',
      city: 'Austin',
      state: 'TX',
      zip_code: '78701',
      unit_mix: [{ type: 'RV Site', count: 25 }],
    } as EnrichedInput;
    const buf = await assembleDraftXlsx(minimal);
    expect(Buffer.isBuffer(buf)).toBe(true);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['ToT (Intake Form)'];
    expect(ws['C13']?.v).toBe('Minimal Resort');
    expect(ws['C43']?.v).toBe(25);
  });
});
