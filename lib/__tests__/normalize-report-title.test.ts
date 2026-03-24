import { normalizeReportTitle } from '@/lib/normalize-report-title';

describe('normalizeReportTitle', () => {
  const prevLlm = process.env.REPORT_TITLE_LLM_ENABLED;

  beforeAll(() => {
    process.env.REPORT_TITLE_LLM_ENABLED = 'false';
  });

  afterAll(() => {
    process.env.REPORT_TITLE_LLM_ENABLED = prevLlm;
  });

  it('treats marketing sentence fragments as garbage and falls back to study id', async () => {
    const r = await normalizeReportTitle(
      {
        studyId: '26-105A-01',
        documentTitle: null,
        resortName: 'in a world-class dual waterfront access s',
      },
      { useLLM: false }
    );
    expect(r.title).toBe('26-105A-01');
    expect(r.propertyName).toBe('26-105A-01');
  });

  it('still accepts a normal resort name', async () => {
    const r = await normalizeReportTitle(
      {
        studyId: '26-105A-01',
        documentTitle: null,
        resortName: 'Pine Ridge Glamping',
      },
      { useLLM: false }
    );
    expect(r.title).toBe('Pine Ridge Glamping - 26-105A-01');
    expect(r.propertyName).toBe('Pine Ridge Glamping');
  });
});
