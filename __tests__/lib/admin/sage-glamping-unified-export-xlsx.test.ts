import ExcelJS from 'exceljs';
import {
  buildUnifiedExportXlsxBuffer,
  cellValueForXlsx,
  XLSX_MAX_CELL_TEXT,
} from '@/lib/admin/sage-glamping-unified-export-xlsx';

describe('sage-glamping-unified-export-xlsx', () => {
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
});
