/**
 * Cost Analysis XLSX export: template styling round-trip (ExcelJS).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import ExcelJS from 'exceljs';
import { exportCostAnalysisToXlsx } from '@/lib/site-builder/export-cost-analysis-xlsx';
import type { ConfigCostResult, SiteBuilderConfig } from '@/lib/site-builder/cost-calculator';

const TEMPLATE_PATH = resolve(process.cwd(), 'templates', 'Cost Analysis Section.xlsx');

function fontFingerprint(font: Partial<ExcelJS.Font> | undefined): Record<string, unknown> {
  if (!font || typeof font !== 'object') return {};
  return {
    name: font.name,
    size: font.size,
    bold: font.bold,
    italic: font.italic,
    color: font.color,
  };
}

describe('exportCostAnalysisToXlsx', () => {
  it('preserves Site Dev Cost cell font on populated cells vs template', async () => {
    if (!existsSync(TEMPLATE_PATH)) {
      throw new Error(`Missing template at ${TEMPLATE_PATH}`);
    }

    const tmplBuf = readFileSync(TEMPLATE_PATH);
    const tmplWb = new ExcelJS.Workbook();
    await tmplWb.xlsx.load(tmplBuf as never);

    const siteDevName = tmplWb.getWorksheet('Site Dev Cost');
    expect(siteDevName).toBeTruthy();
    const tmplC4Font = fontFingerprint(siteDevName!.getCell('C4').font);
    const tmplB39Font = fontFingerprint(siteDevName!.getCell('B39').font);

    const configs: SiteBuilderConfig[] = [
      {
        type: 'glamping',
        unitTypeSlug: 'yurt',
        quantity: 2,
        sqft: 300,
        qualityType: 'Premium',
        amenitySlugs: [],
        catalogUnitId: null,
      },
    ];
    const costResults: ConfigCostResult[] = [
      {
        configIndex: 0,
        type: 'glamping',
        name: 'Yurt',
        qualityTier: 'Premium',
        quantity: 2,
        costPerUnit: 1000,
        subtotal: 2000,
        baseCost: 900,
        amenityCost: 100,
      },
    ];

    const outBuf = await exportCostAnalysisToXlsx({
      configs,
      costResult: { configs: costResults, totalSiteBuild: 2000 },
      amenityBreakdown: [],
    });

    const outWb = new ExcelJS.Workbook();
    await outWb.xlsx.load(outBuf as never);
    const outSheet = outWb.getWorksheet('Site Dev Cost');
    expect(outSheet).toBeTruthy();

    expect(fontFingerprint(outSheet!.getCell('C4').font)).toEqual(tmplC4Font);
    expect(fontFingerprint(outSheet!.getCell('B39').font)).toEqual(tmplB39Font);
  });
});
