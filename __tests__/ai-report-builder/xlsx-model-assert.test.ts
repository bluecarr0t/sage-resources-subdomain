import { assertXlsxMatchesModel } from '@/lib/ai-report-builder/xlsx-model-assert';
import ExcelJS from 'exceljs';
import type { FeasibilityModelOutput } from '@/lib/feasibility-model';

function stubModel(): FeasibilityModelOutput {
  return {
    costs: {
      siteDev: 40,
      unitCosts: 40,
      addBldg: 0,
      hardCosts: 80,
      softCosts: 10,
      contingency: 5,
      ffe: 3,
      preOpening: 2,
      land: 0,
      totalDevelopmentCost: 1000,
    },
    reTaxes: { assessedValue: 0, annualTax: 0 },
    rates: [],
    occupancy: [],
    proForma: [],
    monthlyProForma: [],
    financing: {
      totalDevelopmentCost: 1000,
      loanAmount: 750,
      equityAmount: 250,
      annualDebtService: 10,
      monthlyPayment: 1,
      mortgageConstant: 0.1,
      dcrByYear: [],
      cashOnCashByYear: [],
      paybackYears: null,
    },
    irr: { equityIrr10Year: 0.1, terminalValue: 0, year10EquityCashFlow: 0 },
    assumptionsUsed: {} as FeasibilityModelOutput['assumptionsUsed'],
  };
}

describe('assertXlsxMatchesModel', () => {
  it('returns no flags when Model Output matches engine', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Model Output');
    ws.getCell('A2').value = 'Total Development Cost';
    ws.getCell('B2').value = 1000;
    ws.getCell('A3').value = 'Loan Amount';
    ws.getCell('B3').value = 750;
    ws.getCell('A4').value = 'Equity';
    ws.getCell('B4').value = 250;
    expect(assertXlsxMatchesModel(wb, stubModel())).toEqual([]);
  });

  it('flags TDC mismatch', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Model Output');
    ws.getCell('A2').value = 'Total Development Cost';
    ws.getCell('B2').value = 9999;
    const flags = assertXlsxMatchesModel(wb, stubModel());
    expect(flags.some((f) => /TDC/i.test(f))).toBe(true);
  });
});
