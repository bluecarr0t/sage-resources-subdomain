/**
 * @jest-environment node
 */

import ExcelJS from 'exceljs';
import {
  executeGenerateDraft,
  REPORT_HOT_PATH_LLM_SECTIONS,
} from '@/lib/ai-report-builder/execute-generate-draft';

const mockUpdate = jest.fn();
const mockInsert = jest.fn();
const xlsxHolder: { buf: Buffer } = { buf: Buffer.alloc(0) };

jest.mock('@/lib/ai-report-builder/enrich', () => ({
  enrichReportInput: jest.fn(async (input: unknown) => input),
}));

jest.mock('@/lib/ai-report-builder/development-costs', () => ({
  deriveDevelopmentCosts: jest.fn(async () => ({
    data: {
      siteDevCosts: {
        totalRVSites: 0,
        totalGlampingUnits: 0,
        rvTotal: 0,
        glampingTotal: 0,
        lineItems: [],
      },
      unitCosts: { items: [], total: 0 },
      addBldgImprovements: { items: [], total: 0 },
      totalProjectCost: {
        siteDev: 0,
        unitCosts: 0,
        addBldg: 0,
        hardCosts: 0,
        softCosts: 0,
        land: 0,
        total: 0,
      },
    },
    configs: [],
    costResult: { configs: [], totalSiteBuild: 0 },
    unmappedTypes: [],
  })),
}));

jest.mock('@/lib/ai-report-builder/generate', () => ({
  generateExecutiveSummary: jest.fn(async () => ({
    executive_summary: 'Exec',
    citations: [],
  })),
  generateSWOTAnalysis: jest.fn(async () => 'SWOT'),
  generateSiteAnalysis: jest.fn(async () => 'Site'),
  generateDemandIndicators: jest.fn(async () => 'Demand'),
  generateLetterOfTransmittal: jest.fn(async () => {
    throw new Error('LoT LLM must not run on the hot path');
  }),
}));

jest.mock('@/lib/ai-report-builder/sections/area-supply-industry', () => ({
  generateAreaAnalysis: jest.fn(async () => 'Area'),
  generateSupplyCompetition: jest.fn(async () => 'Supply'),
  generateIndustryOverview: jest.fn(async () => 'Industry'),
}));

jest.mock('@/lib/ai-report-builder/assemble-docx', () => ({
  assembleDraftDocx: jest.fn(async () => ({
    buffer: Buffer.from('docx'),
    diagnostics: {
      sectionHits: {},
      identityReplacements: 0,
      imagesKept: 0,
      imagesPlaceholdered: 0,
      sampleFingerprintsRemaining: [],
      layoutChromeSkipped: 0,
      tourismPlaceholdersInjected: 0,
      tourismDrawingsStripped: 0,
    },
  })),
}));

jest.mock('@/lib/ai-report-builder/assemble-xlsx', () => ({
  assembleDraftXlsx: jest.fn(async () => xlsxHolder.buf),
}));

jest.mock('@/lib/ai-report-builder/qa-gates', () => ({
  runReportQaGates: () => ({ passed: true, flags: [], analystTasks: [] }),
}));

jest.mock('@/lib/ai-report-builder/xlsx-model-assert', () => ({
  assertXlsxBufferMatchesModel: async () => [],
}));

jest.mock('@/lib/ai-report-builder/shadow-draft', () => ({
  generateShadowDraftBundle: async () => null,
  uploadShadowDraftBundle: async () => undefined,
}));

jest.mock('@/lib/ai-report-builder/stdb-import', () => ({
  applyStdbToWorkbook: jest.fn(),
}));

jest.mock('@/lib/admin-audit', () => ({
  logAdminAudit: jest.fn(async () => undefined),
}));

jest.mock('@/lib/site-builder/export-cost-analysis-xlsx', () => ({
  exportCostAnalysisToXlsx: jest.fn(async () => Buffer.from('cost')),
}));

jest.mock('@/lib/feasibility-model', () => ({
  proposeAssumptions: jest.fn(() => ({
    units: [],
    realMarketAdj: { value: 1, state: 'proposed' },
    landCost: { value: 0, state: 'proposed' },
    loanToCost: { value: 0.75, state: 'proposed' },
  })),
  runFeasibilityModel: jest.fn(() => ({
    costs: {
      siteDev: 0,
      unitCosts: 0,
      addBldg: 0,
      hardCosts: 0,
      softCosts: 0,
      contingency: 0,
      ffe: 0,
      preOpening: 0,
      land: 0,
      totalDevelopmentCost: 0,
    },
    reTaxes: { assessedValue: 0, annualTax: 0 },
    rates: [],
    occupancy: [],
    proForma: [],
    monthlyProForma: [],
    financing: {
      totalDevelopmentCost: 0,
      loanAmount: 0,
      equityAmount: 0,
      annualDebtService: 0,
      monthlyPayment: 0,
      mortgageConstant: 0,
      dcrByYear: [],
      cashOnCashByYear: [],
      paybackYears: null,
    },
    irr: { equityIrr10Year: 0.12, terminalValue: 0, year10EquityCashFlow: 0 },
    assumptionsUsed: { units: [] },
  })),
  formatModelMetricsForPrompt: jest.fn(() => ''),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    from: () => ({
      update: (payload: unknown) => {
        mockUpdate(payload);
        return { eq: () => Promise.resolve({ error: null }) };
      },
      insert: (payload: unknown) => {
        mockInsert(payload);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'new-report-id' }, error: null }),
          }),
        };
      },
      delete: () => ({ eq: () => Promise.resolve({}) }),
      select: () => ({
        eq: () => ({
          is: () => ({
            maybeSingle: () => Promise.resolve({ data: null }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        createSignedUrl: () => Promise.resolve({ data: { signedUrl: 'https://example.test/file' } }),
      }),
    },
  }),
}));

const draftInput = {
  property_name: 'Pine Ridge',
  city: 'Bend',
  state: 'OR',
  address_1: '10 Trail Rd',
  unit_mix: [] as Array<{ type: string; count: number }>,
  study_id: '26-100A-01',
  market_type: 'glamping',
};

describe('REPORT_HOT_PATH_LLM_SECTIONS', () => {
  it('does not include letter of transmittal', () => {
    expect(REPORT_HOT_PATH_LLM_SECTIONS).not.toContain('letter_of_transmittal');
    expect([...REPORT_HOT_PATH_LLM_SECTIONS]).toHaveLength(7);
  });
});

describe('executeGenerateDraft existingReportId', () => {
  beforeAll(async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('ToT (Intake Form)');
    xlsxHolder.buf = Buffer.from(await wb.xlsx.writeBuffer());
  });

  beforeEach(() => {
    mockUpdate.mockClear();
    mockInsert.mockClear();
  });

  it('updates the existing row and does not insert', async () => {
    const result = await executeGenerateDraft({
      input: draftInput,
      userId: 'owner-1',
      draftMode: true,
      stdbWaiver: true,
      format: 'xlsx',
      existingReportId: 'existing-report-id',
    });

    expect(result.reportId).toBe('existing-report-id');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
    const firstUpdate = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(firstUpdate.user_id).toBeUndefined();
  });

  it('inserts a new row when existingReportId is omitted', async () => {
    const result = await executeGenerateDraft({
      input: draftInput,
      userId: 'owner-1',
      draftMode: true,
      stdbWaiver: true,
      format: 'xlsx',
    });

    expect(result.reportId).toBe('new-report-id');
    expect(mockInsert).toHaveBeenCalled();
    const inserted = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.user_id).toBe('owner-1');
  });
});
