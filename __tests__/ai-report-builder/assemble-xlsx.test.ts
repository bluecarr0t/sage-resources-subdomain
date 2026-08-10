/**
 * Unit tests for XLSX assembly.
 */

import * as XLSX from 'xlsx';
import { assembleDraftXlsx } from '@/lib/ai-report-builder/assemble-xlsx';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';

/** Create a minimal XLSX with ToT (Intake Form) sheet matching real template layout */
function createMinimalTotXlsx(opts?: { glamping?: boolean }): Buffer {
  const ws: XLSX.WorkSheet = {};
  const set = (addr: string, val: string | number) => {
    ws[addr] = { t: typeof val === 'number' ? 'n' : 's', v: val };
  };
  const setFormula = (addr: string, formula: string, result: number) => {
    ws[addr] = { t: 'n', f: formula, v: result };
  };
  ws['!ref'] = 'A1:E50';
  set('B2', 'PROPERTY AND BUSINESS OVERVIEW');
  set('B6', 'Owner Name');
  set('B7', 'Phone Number');
  set('B8', 'Legal Business Name');
  set('B9', 'Owner / Business Address');
  set('B10', 'Purpose of the report?');
  set('C10', 'Bank financing and internal decision making.');
  set('B13', 'Resort Name');
  set('B14', 'Resort Type');
  set('C14', 'RV Resort');
  set('B15', 'Resort Full Address');
  set('B16', 'Resort County');
  set('B17', 'Lot Size (Acres)');
  set('C17', 10);
  set('B19', 'Parcel Number(s)');

  if (opts?.glamping) {
    set('B23', 'Unit A Type');
    set('C23', 'Mirror Cabin Large');
    set('B24', 'Unit A Quantity');
    set('C24', 15);
    set('B25', 'Unit A Description');
    set('C25', 'Sleeps 3-4 sample');
    set('B26', 'Unit B Type');
    set('C26', 'Mirror Cabin Small');
    set('B27', 'Unit B Quantity');
    set('C27', 10);
    set('B28', 'Unit B Description');
    set('C28', 'Sleeps 5-7 sample');
    set('B44', 'Total Units / Sites');
    setFormula('C44', 'C24+C27+C30+C33+C36+C39+C42', 25);
    set('B47', 'What amenities are planned');
    set('C47', 'Planned amenities include an event area with a bar');
  } else {
    set('B22', 'Unit A Quantity');
    set('C22', 100);
    set('B23', 'Unit A Type');
    set('C23', 'RV Standard Back-in Site-Transient');
    set('B24', 'Unit A Description');
    set('C24', 'Sample description A');
    set('B25', 'Unit B Quantity');
    set('C25', 50);
    set('B26', 'Unit B Type');
    set('C26', 'RV Standard Pull Thru Site-Transient');
    set('B27', 'Unit B Description');
    set('C27', 'Sample description B');
    set('B43', 'Total Units / Sites');
    setFormula('C43', 'SUM(C40,C37,C34,C31,C28,C25,C22)', 150);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ToT (Intake Form)');
  return Buffer.from(
    XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true })
  );
}

let useGlampingFixture = false;

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
  client_phone: '2166500625',
  client_email: 'baikodc@gmail.com',
  client_address: '123 Main St',
  client_city_state_zip: 'Chicago, IL 60601',
  resort_type: 'Glamping- Wellness',
  intended_use_of_study: 'Decision making, Financing and Investor Support.',
  engagement_date: '2026-07-28',
};

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    storage: {
      from: () => ({
        download: () => {
          const buf = createMinimalTotXlsx({ glamping: useGlampingFixture });
          return Promise.resolve({
            data: {
              arrayBuffer: async () => {
                const copy = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
                return copy instanceof ArrayBuffer ? copy : new Uint8Array(buf).buffer;
              },
            },
            error: null,
          });
        },
      }),
    },
  }),
}));

describe('assembleDraftXlsx', () => {
  beforeEach(() => {
    useGlampingFixture = false;
  });

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
    expect(ws['C7']?.v).toBe('2166500625\nbaikodc@gmail.com');
    expect(ws['C8']?.v).toBe('Test Client LLC');
    expect(ws['C10']?.v).toBe(
      'Decision making, Financing and Investor Support.\nEngagement date: 2026-07-28'
    );
    expect(ws['C14']?.v).toBe('Glamping- Wellness');
    expect(ws['C17']?.v).toBe(43.86);
    expect(ws['C15']?.v).toContain('3455 Coastal Hwy');
    expect(ws['C15']?.v).toContain('St. Augustine');
    expect(ws['C15']?.v).toContain('FL');
    expect(ws['C15']?.v).toContain('32084');
  });

  it('writes phone alone when email is absent', async () => {
    const buf = await assembleDraftXlsx({
      ...mockEnriched,
      client_email: undefined,
    });
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['ToT (Intake Form)'];
    expect(ws['C7']?.v).toBe('2166500625');
  });

  it('writes engagement date alone when purpose is absent', async () => {
    const buf = await assembleDraftXlsx({
      ...mockEnriched,
      intended_use_of_study: undefined,
    });
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['ToT (Intake Form)'];
    expect(ws['C10']?.v).toBe('Engagement date: 2026-07-28');
  });

  it('populates unit mix rows and clears leftover template slots', async () => {
    const buf = await assembleDraftXlsx(mockEnriched);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['ToT (Intake Form)'];

    expect(ws['C22']?.v).toBe(100);
    expect(ws['C23']?.v).toBe('RV Standard Back-in Site');
    expect(ws['C25']?.v).toBe(50);
    expect(ws['C26']?.v).toBe('RV Standard Pull Thru Site');
    expect(ws['C43']?.v).toBe(150);
    // Unused template slots zeroed / cleared
    expect(ws['C28']?.v ?? 0).toBe(0);
    expect(ws['C29']?.v == null || ws['C29']?.v === '').toBe(true);
    expect(ws['C24']?.v == null || ws['C24']?.v === '').toBe(true);
  });

  it('uses glamping template key when market_type is glamping', async () => {
    useGlampingFixture = true;
    const buf = await assembleDraftXlsx(
      { ...mockEnriched, market_type: 'glamping' },
      { marketType: 'glamping' }
    );
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['ToT (Intake Form)'];
    expect(ws).toBeDefined();
    expect(ws['C13']?.v).toBe('Test RV Resort');
    expect(ws['C44']?.v).toBe(150);
  });

  it('clears template unit defaults and preserves total formula when unit_mix is empty', async () => {
    const input = { ...mockEnriched, unit_mix: [] };
    const buf = await assembleDraftXlsx(input);
    expect(Buffer.isBuffer(buf)).toBe(true);
    const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true });
    const ws = wb.Sheets['ToT (Intake Form)'];

    expect(ws['C23']?.v == null || ws['C23']?.v === '').toBe(true);
    expect(ws['C22']?.v).toBe(0);
    expect(ws['C26']?.v == null || ws['C26']?.v === '').toBe(true);
    expect(ws['C25']?.v).toBe(0);
    expect(ws['C24']?.v == null || ws['C24']?.v === '').toBe(true);
    // Must not overwrite SUM with literal 0
    expect(ws['C43']?.f).toBeTruthy();
    expect(ws['C43']?.v).not.toBe(0);
  });

  it('clears glamping Mirror Cabin samples and purpose/amenities defaults when empty', async () => {
    useGlampingFixture = true;
    const input: EnrichedInput = {
      property_name: 'Nordic Wellness Glamping & Christmas Tree Farm',
      city: 'Peninsula',
      state: 'OH',
      unit_mix: [],
      market_type: 'glamping',
    };
    const buf = await assembleDraftXlsx(input, { marketType: 'glamping' });
    const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true });
    const ws = wb.Sheets['ToT (Intake Form)'];

    expect(ws['C23']?.v == null || ws['C23']?.v === '').toBe(true);
    expect(ws['C24']?.v).toBe(0);
    expect(ws['C25']?.v == null || ws['C25']?.v === '').toBe(true);
    expect(ws['C26']?.v == null || ws['C26']?.v === '').toBe(true);
    expect(ws['C27']?.v).toBe(0);
    expect(ws['C10']?.v == null || ws['C10']?.v === '').toBe(true);
    expect(ws['C14']?.v == null || ws['C14']?.v === '').toBe(true);
    expect(ws['C17']?.v == null || ws['C17']?.v === '').toBe(true);
    expect(ws['C47']?.v == null || ws['C47']?.v === '').toBe(true);
    expect(ws['C44']?.f).toBeTruthy();
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
