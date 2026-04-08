import {
  hasValidClientMapCity,
  isGarbageReportCity,
  isGarbageReportLocationLine,
  isLikelyUsablePropertyForGeocoding,
} from '@/lib/report-location-quality';

describe('report-location-quality', () => {
  it('flags known DOCX garbage cities', () => {
    expect(isGarbageReportCity('term. In particular')).toBe(true);
    expect(isGarbageReportCity('Term. In particular')).toBe(true);
    expect(isGarbageReportCity('industry is positive in most major metric')).toBe(true);
    expect(isGarbageReportCity('development. Attractions')).toBe(true);
    expect(isGarbageReportCity('Denver')).toBe(false);
    expect(isGarbageReportCity('Cañon City')).toBe(false);
    expect(isGarbageReportCity('')).toBe(false);
    expect(isGarbageReportCity(null)).toBe(false);
  });

  it('flags location lines whose first segment is garbage', () => {
    expect(isGarbageReportLocationLine('term. In particular, CO')).toBe(true);
    expect(isGarbageReportLocationLine('Denver, CO')).toBe(false);
  });

  it('rejects property names that are only a study id', () => {
    expect(isLikelyUsablePropertyForGeocoding('25-107A-01', '25-107A-01')).toBe(false);
    expect(isLikelyUsablePropertyForGeocoding('Sky Diamonds Glamping/RV Resort', '25-169A-04')).toBe(
      true
    );
  });

  it('hasValidClientMapCity requires a real locality', () => {
    expect(hasValidClientMapCity(null)).toBe(false);
    expect(hasValidClientMapCity('')).toBe(false);
    expect(hasValidClientMapCity('CO')).toBe(false);
    expect(hasValidClientMapCity('Denver')).toBe(true);
    expect(hasValidClientMapCity('term. In particular')).toBe(false);
  });
});
