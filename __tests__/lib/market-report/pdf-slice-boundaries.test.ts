import { nextPdfSliceEnd } from '@/lib/market-report/pdf-slice-boundaries';

describe('nextPdfSliceEnd', () => {
  it('ends the slice before a keep region when the default cut would bisect it', () => {
    const regions = [{ top: 400, bottom: 800 }];
    const maxSlice = 600;
    const end = nextPdfSliceEnd(0, maxSlice, 2000, regions);
    expect(end).toBe(400);
  });

  it('uses the full page height when no regions apply', () => {
    expect(nextPdfSliceEnd(0, 500, 1200, [])).toBe(500);
    expect(nextPdfSliceEnd(500, 500, 1200, [])).toBe(1000);
    expect(nextPdfSliceEnd(1000, 500, 1200, [])).toBe(1200);
  });

  it('extends through a small keep region that fits entirely in the slice budget', () => {
    const regions = [{ top: 400, bottom: 450 }];
    const maxSlice = 600;
    const end = nextPdfSliceEnd(0, maxSlice, 2000, regions);
    expect(end).toBe(600);
  });

  it('still ends before a keep region when that leaves a short trailing strip (heading snap)', () => {
    const y = 370;
    const maxSlice = 100;
    const regions = [{ top: 400, bottom: 500 }];
    const end = nextPdfSliceEnd(y, maxSlice, 2000, regions);
    expect(end).toBe(400);
  });
});
