import ExcelJS from 'exceljs';
import {
  buildUnifiedExportXlsxBuffer,
  cellValue,
  cellValueForXlsx,
  csvCell,
  xlsxNumFmtForColumn,
  XLSX_MAX_CELL_TEXT,
} from '@/lib/admin/sage-glamping-unified-export-xlsx';

describe('sage-glamping-unified-export-xlsx', () => {
  it('writes negative longitude without a leading apostrophe', () => {
    expect(csvCell('-120.1746')).toBe('-120.1746');
    expect(csvCell(-88.5915)).toBe('-88.5915');
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(
      `"'=HYPERLINK(""http://evil"")"`
    );
    expect(csvCell('-not-a-coordinate')).toBe("'-not-a-coordinate");
  });

  it('truncates oversized cell text for Excel', () => {
    const long = 'x'.repeat(XLSX_MAX_CELL_TEXT + 100);
    const out = cellValueForXlsx(long);
    expect(typeof out).toBe('string');
    expect((out as string).length).toBeLessThanOrEqual(XLSX_MAX_CELL_TEXT);
    expect((out as string).endsWith('\u2026')).toBe(true);
  });

  it('builds a readable workbook from streamed rows', async () => {
    const buf = await buildUnifiedExportXlsxBuffer(
      ['id', 'name'],
      [
        ['1', 'Alpha'],
        ['2', 'Beta'],
      ]
    );
    expect(buf.length).toBeGreaterThan(100);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const sheet = wb.getWorksheet('Combined');
    expect(sheet).toBeDefined();
    expect(sheet!.getRow(1).values).toEqual(expect.arrayContaining(['id', 'name']));
    expect(sheet!.getRow(2).getCell(1).value).toBe('1');
    expect(sheet!.getRow(3).getCell(2).value).toBe('Beta');
  });

  it('writes calendar dates and timestamps as Excel dates', async () => {
    const added = cellValueForXlsx('2026-02-23', 'date_added');
    const created = cellValueForXlsx('2026-02-23T19:04:39.324397+00:00', 'created_at');
    expect(added).toBeInstanceOf(Date);
    expect(created).toBeInstanceOf(Date);
    expect(cellValueForXlsx('', 'planned_open_date')).toBeNull();
    expect(cellValueForXlsx('not a date', 'date_updated')).toBe('not a date');
    expect(xlsxNumFmtForColumn('date_updated')).toBe('yyyy-mm-dd');
    expect(xlsxNumFmtForColumn('updated_at')).toBe('yyyy-mm-dd hh:mm');

    const buf = await buildUnifiedExportXlsxBuffer(
      ['date_added', 'created_at'],
      [[added, created]],
      ['yyyy-mm-dd', 'yyyy-mm-dd hh:mm']
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const sheet = wb.getWorksheet('Combined');
    const dateCell = sheet!.getRow(2).getCell(1);
    const timeCell = sheet!.getRow(2).getCell(2);
    expect(dateCell.value).toBeInstanceOf(Date);
    expect(dateCell.numFmt).toBe('yyyy-mm-dd');
    const date = dateCell.value as Date;
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(1);
    expect(date.getUTCDate()).toBe(23);
    expect(timeCell.value).toBeInstanceOf(Date);
    expect(timeCell.numFmt).toBe('yyyy-mm-dd hh:mm');
    const timestamp = timeCell.value as Date;
    expect(timestamp.getUTCDate()).toBe(23);
    expect(timestamp.getUTCHours()).toBe(19);
    expect(timestamp.getUTCMinutes()).toBe(4);
  });

  it('writes Sage seasonal rate text and RoverPass numbers as the same Excel type', async () => {
    const columns = [
      'rate_winter_weekday',
      'rate_winter_weekend',
      'rate_spring_weekday',
      'rate_spring_weekend',
      'rate_summer_weekday',
      'rate_summer_weekend',
      'rate_fall_weekday',
      'rate_fall_weekend',
    ] as const;
    const sage = columns.map((column) => cellValueForXlsx('175', column));
    const rover = columns.map((column) => cellValueForXlsx(70, column));
    const blank = columns.map((column) => cellValueForXlsx(null, column));
    expect(sage.every((value) => value === 175)).toBe(true);
    expect(rover.every((value) => value === 70)).toBe(true);
    expect(blank.every((value) => value === null)).toBe(true);

    const buf = await buildUnifiedExportXlsxBuffer(
      [...columns],
      [sage, rover, blank],
      columns.map(() => null)
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const sheet = wb.getWorksheet('Combined');
    for (let col = 1; col <= columns.length; col++) {
      expect(sheet!.getRow(2).getCell(col).value).toBe(175);
      expect(typeof sheet!.getRow(2).getCell(col).value).toBe('number');
      expect(sheet!.getRow(3).getCell(col).value).toBe(70);
      expect(sheet!.getRow(4).getCell(col).value).toBeNull();
    }
  });

  it('writes rate text as currency numbers and leaves blanks empty', async () => {
    expect(cellValueForXlsx('1,250.50', 'rate_summer_weekend')).toBe(1250.5);
    expect(cellValueForXlsx('$226', 'rate_avg_retail_daily_rate')).toBe(226);
    expect(cellValueForXlsx('', 'rate_summer_weekday')).toBeNull();
    expect(cellValueForXlsx('varies', 'rate_summer_weekday')).toBe('varies');
    expect(cellValueForXlsx('No data', 'rate_winter_weekday')).toBeNull();
    expect(cellValueForXlsx('no data', 'unit_wifi')).toBeNull();
    expect(cellValue('No data')).toBe('');
    expect(cellValue('Notes: no data on winter rates')).toBe(
      'Notes: no data on winter rates'
    );
    expect(xlsxNumFmtForColumn('rate_fall_weekend')).toBe('$#,##0.00');

    const buf = await buildUnifiedExportXlsxBuffer(
      ['property_name', 'rate_summer_weekday', 'rate_avg_retail_daily_rate'],
      [
        ['Cabin', 150, null],
        ['Dome', cellValueForXlsx('226.5', 'rate_summer_weekday'), 300],
      ],
      [null, '$#,##0.00', '$#,##0.00']
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const sheet = wb.getWorksheet('Combined');
    const rate = sheet!.getRow(2).getCell(2);
    const blank = sheet!.getRow(2).getCell(3);
    expect(rate.value).toBe(150);
    expect(typeof rate.value).toBe('number');
    expect(rate.numFmt).toBe('$#,##0.00');
    expect(blank.value).toBeNull();
    expect(sheet!.getRow(3).getCell(2).value).toBe(226.5);
  });
});
