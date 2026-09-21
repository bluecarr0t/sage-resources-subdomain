/**
 * @jest-environment node
 */
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import ExcelJS from 'exceljs';
import { addOccupancyRateHeatmapSheets, heatmapMonthHeader, HEATMAP_DISTANCE_HEADER } from '@/lib/ota-occupancy-rate-xlsx';
import {
  applyCompsWorkbookLayout,
  applyFocusedMonthlyColorScales,
  buildTrailingSummary,
  compsMonthByMonthFileName,
  compsRangeSheetNames,
  compsSheetOrder,
  COMPS_BELL_TENT_SHEET,
  COMPS_DESTINATION_SHEET,
  COMPS_FOCUSED_PROPERTIES_SHEET,
  COMPS_PROPERTY_COLUMNS,
  COMPS_SITE_COLUMNS,
  COMPS_TRAILING_COLUMNS,
  impliedRevpar,
  MARKET_AVERAGE_LABEL,
  mapCompsPropertyRows,
  seasonPropertyRows,
  sortCompsPropertyRowsByName,
  type CompsPropertyRow,
} from '@/lib/ota-comps-month-by-month-xlsx';

function propertyRow(overrides: Partial<CompsPropertyRow>): CompsPropertyRow {
  return {
    comp_set: 'Local 0-25mi RV',
    property_name: 'Frank\'s at Cane Hollow - Sparta, TN',
    property_url: 'https://example.com',
    city: 'Sparta',
    state: 'Tennessee',
    distance_miles: '9.7',
    year: '2025',
    month: '3',
    month_name: 'March',
    median_retail_daily_rate: '100',
    mean_retail_daily_rate: '100',
    avg_occupancy_rate_pct: '40',
    revpar: '40',
    min_price: '80',
    max_price: '120',
    site_count: '30',
    high_month: 'October',
    low_month: 'March',
    ...overrides,
  };
}

function seasonMonths(name: string, occ: string): CompsPropertyRow[] {
  return ['3', '4', '5', '6', '7', '8', '9', '10', '11'].map((month) =>
    propertyRow({
      property_name: name,
      month,
      avg_occupancy_rate_pct: occ,
      revpar: impliedRevpar(occ, '100'),
    }),
  );
}

describe('Sparta / month-by-month comps workbook format', () => {
  it('uses the Sparta filename pattern', () => {
    expect(
      compsMonthByMonthFileName({
        city: 'Sparta',
        state: 'TN',
        zip: '38583',
        includeRv: true,
      }),
    ).toBe('Data — Sparta TN 38583 RV Comps — 2025 Month by Month.xlsx');
  });

  it('names range sheets from the mile radius', () => {
    expect(compsRangeSheetNames(100)).toEqual({
      properties: 'Market Monthly 100mi',
      sites: 'Market Sites 2025 100mi',
    });
  });

  it('keeps every recommended sheet name at 31 characters or less', () => {
    for (const name of compsSheetOrder(100, [2025, 2026])) {
      expect(name.length).toBeLessThanOrEqual(31);
    }
  });

  it('emits Comp Set Monthly first and Market Monthly immediately before Notes', () => {
    expect(compsSheetOrder(100, [2025, 2026])).toEqual([
      COMPS_FOCUSED_PROPERTIES_SHEET,
      COMPS_DESTINATION_SHEET,
      'Comp Rate 2025',
      'Comp Rate 2026',
      'Comp Occupancy 2025',
      'Comp Occupancy 2026',
      'Market Rate 2025',
      'Market Rate 2026',
      'Market Occupancy 2025',
      'Market Occupancy 2026',
      COMPS_BELL_TENT_SHEET,
      'Market Monthly 100mi',
      'Notes',
    ]);
  });

  it('drops the season and yearly rates sheets and renames Properties', () => {
    const wb = new ExcelJS.Workbook();
    const focused = wb.addWorksheet('Properties');
    focused.addRow([...COMPS_PROPERTY_COLUMNS]);
    wb.addWorksheet('9-Month Season Properties');
    wb.addWorksheet('Rates 2023-2025');
    const notes = wb.addWorksheet('Notes');
    notes.addRow(['field', 'value']);
    notes.addRow([
      'Properties / 9-Month Season Properties',
      '2025 and 2026 property-months. Season sheet is March–November of each year.',
    ]);
    notes.addRow([
      'Sites sheets',
      'Use Properties / 9-Month Season Properties for 2025 and 2026 monthly occupancy and ADR.',
    ]);
    applyCompsWorkbookLayout(wb);
    expect(COMPS_FOCUSED_PROPERTIES_SHEET.length).toBeLessThanOrEqual(31);
    expect(wb.worksheets.map((sheet) => sheet.name)).toEqual([
      COMPS_FOCUSED_PROPERTIES_SHEET,
      'Notes',
    ]);
    expect(notes.getCell('A2').value).toBe(COMPS_FOCUSED_PROPERTIES_SHEET);
    expect(String(notes.getCell('B2').value)).toBe('2025 and 2026 property-months.');
    expect(notes.rowCount).toBe(2);
  });

  it('renames and reorders legacy tabs to the recommended names', async () => {
    const wb = new ExcelJS.Workbook();
    const focused = wb.addWorksheet('Monthly Occupancy & Rates');
    focused.addRow([...COMPS_PROPERTY_COLUMNS]);
    wb.addWorksheet('Sites');
    wb.addWorksheet('100 Mile Range Properties');
    wb.addWorksheet('100 Mile Range Sites');
    wb.addWorksheet('9-Month Trailing Summary');
    wb.addWorksheet('Rate 2025');
    wb.addWorksheet('Rate 2026');
    wb.addWorksheet('Occupancy 2025');
    wb.addWorksheet('Occupancy 2026');
    wb.addWorksheet('Notes');
    applyCompsWorkbookLayout(wb, 100);
    expect(wb.worksheets.map((sheet) => sheet.name)).toEqual([
      COMPS_FOCUSED_PROPERTIES_SHEET,
      'Market Rate 2025',
      'Market Rate 2026',
      'Market Occupancy 2025',
      'Market Occupancy 2026',
      'Market Monthly 100mi',
      'Notes',
    ]);
    const dir = await mkdtemp(join(tmpdir(), 'comps-sheet-order-'));
    const path = join(dir, 'order.xlsx');
    try {
      await wb.xlsx.writeFile(path);
      const roundTrip = new ExcelJS.Workbook();
      await roundTrip.xlsx.readFile(path);
      expect(roundTrip.worksheets.map((sheet) => sheet.name)).toEqual([
        COMPS_FOCUSED_PROPERTIES_SHEET,
        'Market Rate 2025',
        'Market Rate 2026',
        'Market Occupancy 2025',
        'Market Occupancy 2026',
        'Market Monthly 100mi',
        'Notes',
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('adds occupancy and rate color scales on Comp Set Monthly', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(COMPS_FOCUSED_PROPERTIES_SHEET);
    ws.addRow([...COMPS_PROPERTY_COLUMNS]);
    applyFocusedMonthlyColorScales(ws);
    applyFocusedMonthlyColorScales(ws);
    const cf = (
      ws as unknown as {
        conditionalFormattings: Array<{
          ref: string;
          rules: Array<{ type: string; cfvo: Array<{ type: string; value?: number }> }>;
        }>;
      }
    ).conditionalFormattings;
    expect(cf.map((item) => item.ref)).toEqual(['J2:J1000', 'K2:K1000', 'L2:L1000']);
    expect(cf[0]?.rules[0]?.cfvo.map((stop) => stop.type)).toEqual(['min', 'percentile', 'max']);
    expect(cf[2]?.rules[0]?.cfvo).toEqual([
      { type: 'formula', value: 0 },
      { type: 'percentile', value: 50 },
      { type: 'formula', value: 100 },
    ]);
  });

  it('keeps the Sparta property / trailing column sets', () => {
    expect([...COMPS_PROPERTY_COLUMNS]).toEqual([
      'comp_set',
      'property_name',
      'property_url',
      'city',
      'state',
      'distance_miles',
      'year',
      'month',
      'month_name',
      'median_retail_daily_rate',
      'mean_retail_daily_rate',
      'avg_occupancy_rate_pct',
      'revpar',
      'min_price',
      'max_price',
      'site_count',
      'high_month',
      'low_month',
    ]);
    expect(COMPS_TRAILING_COLUMNS[0]).toBe('comp_set');
    expect(COMPS_SITE_COLUMNS).toContain('rate_january');
    expect(COMPS_SITE_COLUMNS).toContain('occupancy_december');
  });

  it('sorts Comp Set Monthly by property_name A–Z, then year and month', () => {
    const sorted = sortCompsPropertyRowsByName([
      propertyRow({ property_name: 'Whispering Falls at Burgess RV Park - Sparta, TN', month: '3' }),
      propertyRow({ property_name: "Frank's at Cane Hollow - Sparta, TN", year: '2026', month: '3' }),
      propertyRow({ property_name: "Frank's at Cane Hollow - Sparta, TN", year: '2025', month: '11' }),
      propertyRow({ property_name: "Frank's at Cane Hollow - Sparta, TN", year: '2025', month: '3' }),
    ]);
    expect(sorted.map((row) => `${row.property_name}|${row.year}|${row.month}`)).toEqual([
      "Frank's at Cane Hollow - Sparta, TN|2025|3",
      "Frank's at Cane Hollow - Sparta, TN|2025|11",
      "Frank's at Cane Hollow - Sparta, TN|2026|3",
      'Whispering Falls at Burgess RV Park - Sparta, TN|2025|3',
    ]);
  });

  it('sorts an existing Comp Set Monthly worksheet A–Z by property_name', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(COMPS_FOCUSED_PROPERTIES_SHEET);
    ws.addRow([...COMPS_PROPERTY_COLUMNS]);
    ws.addRow(COMPS_PROPERTY_COLUMNS.map((col) => propertyRow({ property_name: 'Whispering Falls at Burgess RV Park - Sparta, TN' })[col]));
    ws.addRow(COMPS_PROPERTY_COLUMNS.map((col) => propertyRow({ property_name: "Frank's at Cane Hollow - Sparta, TN" })[col]));
    applyCompsWorkbookLayout(wb);
    const focused = wb.getWorksheet(COMPS_FOCUSED_PROPERTIES_SHEET)!;
    expect(focused.getCell('B2').value).toBe("Frank's at Cane Hollow - Sparta, TN");
    expect(focused.getCell('B3').value).toBe('Whispering Falls at Burgess RV Park - Sparta, TN');
  });

  it('limits trailing season rows to March–November', () => {
    const rows = [
      propertyRow({ month: '2', month_name: 'February' }),
      propertyRow({ month: '3', month_name: 'March' }),
      propertyRow({ month: '11', month_name: 'November' }),
      propertyRow({ month: '12', month_name: 'December' }),
    ];
    expect(seasonPropertyRows(rows).map((r) => r.month)).toEqual(['3', '11']);
  });

  it('rebuilds RevPAR as occupancy × median rate after blanking', () => {
    const [row] = mapCompsPropertyRows([
      {
        name: 'Test Park',
        link: 'https://example.com',
        city: 'Sparta',
        state: 'TN',
        year: '2025',
        month: '7',
        month_name: 'July',
        avg_occupancy_rate_pct: '50',
        median_retail_daily_rate: '80',
        mean_retail_daily_rate: '80',
        revpar: '0',
        min_price: '70',
        max_price: '90',
        site_count: '10',
        sites_with_occ_above_5: '10',
        high_month: 'July',
        low_month: 'March',
      },
    ]);
    expect(row?.revpar).toBe('40.00');
  });

  it('puts eligible MARKET AVERAGE rows first and excludes thin coverage', () => {
    const trailing = buildTrailingSummary({
      years: [2025],
      sets: [
        { label: 'Local 0-25mi RV', seasonRows: seasonMonths("Frank's at Cane Hollow - Sparta, TN", '40') },
        {
          label: '25-80 site FHU',
          seasonRows: [
            ...seasonMonths('Stillwaters Creek -  Spencer, TN', '60'),
            propertyRow({
              property_name: 'Full Throttle Campground - Robbins, TN',
              month: '10',
              month_name: 'October',
              avg_occupancy_rate_pct: '8',
            }),
            propertyRow({
              property_name: 'Full Throttle Campground - Robbins, TN',
              month: '11',
              month_name: 'November',
              avg_occupancy_rate_pct: '9',
            }),
          ],
        },
      ],
      milesByName: new Map([
        ["Frank's at Cane Hollow - Sparta, TN", '9.7'],
        ['Stillwaters Creek -  Spencer, TN', '14.9'],
        ['Full Throttle Campground - Robbins, TN', '58.5'],
      ]),
      marketCity: 'Sparta',
      marketState: 'TN',
    });
    expect(trailing[0]).toMatchObject({
      comp_set: 'Local 0-25mi RV',
      property_name: MARKET_AVERAGE_LABEL,
      city: 'Sparta',
      season_avg_occupancy: '40.00',
    });
    const fhuAverage = trailing.find(
      (row) => row.comp_set === '25-80 site FHU' && row.property_name === MARKET_AVERAGE_LABEL,
    );
    expect(fhuAverage?.season_avg_occupancy).toBe('60.00');
    expect(trailing.some((row) => row.property_name.includes('Full Throttle'))).toBe(true);
  });
});

describe('heatmap distance column', () => {
  it('uses JAN–DEC month headers instead of numbers', () => {
    expect(heatmapMonthHeader(1)).toBe('JAN');
    expect(heatmapMonthHeader(12)).toBe('DEC');
  });

  it('places numeric miles after property_name and shifts months to column C', () => {
    const wb = new ExcelJS.Workbook();
    addOccupancyRateHeatmapSheets(
      wb,
      [
        {
          property_name: 'Elm Hill RV Resort',
          year: '2025',
          month: '3',
          avg_occupancy_rate_pct: '42.4',
          median_retail_daily_rate: '114.71',
          distance_miles: '66.5',
        },
      ],
      [2025],
      { order: 'rate-first' },
    );
    const ws = wb.getWorksheet('Market Rate 2025');
    expect(ws).toBeDefined();
    expect(ws!.getCell('A2').value).toBe('property_name');
    expect(ws!.getCell('B2').value).toBe(HEATMAP_DISTANCE_HEADER);
    expect(ws!.getCell('C1').value).toBe('month');
    expect(ws!.getCell('C2').value).toBe('MAR');
    expect(ws!.getCell('A3').value).toBe('Elm Hill RV Resort');
    expect(ws!.getCell('B3').value).toBe(66.5);
    expect(ws!.getCell('C3').value).toBe(114.71);
    const cf = (ws as unknown as { conditionalFormattings: Array<{ ref: string }> })
      .conditionalFormattings;
    expect(cf[0]?.ref.startsWith('C3:')).toBe(true);
  });
});
