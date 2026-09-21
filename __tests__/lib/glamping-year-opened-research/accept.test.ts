import { describe, expect, it } from '@jest/globals';
import { acceptYearOpenedFinding } from '@/lib/glamping-year-opened-research/accept';

const markdown =
  'Ponderosa Pines opened to guests in June 2024. The ranch was founded in 1954.';

describe('acceptYearOpenedFinding', () => {
  it('accepts a quoted opening year that names the property', () => {
    const decision = acceptYearOpenedFinding({
      propertyName: 'Ponderosa Pines Resort',
      markdown,
      year: 2024,
      openedOn: null,
      quote: 'Ponderosa Pines opened to guests in June 2024.',
      confidence: 'high',
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.finding.year).toBe(2024);
      expect(decision.finding.openedOn).toBeNull();
    }
  });

  it('keeps a full date only when the quote states the day', () => {
    const page = 'Ponderosa Pines opened on June 14, 2024.';
    const decision = acceptYearOpenedFinding({
      propertyName: 'Ponderosa Pines Resort',
      markdown: page,
      year: 2024,
      openedOn: '2024-06-14',
      quote: 'Ponderosa Pines opened on June 14, 2024.',
      confidence: 'high',
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.finding.openedOn).toBe('2024-06-14');
  });

  it('drops an invented day and still keeps the year', () => {
    const decision = acceptYearOpenedFinding({
      propertyName: 'Ponderosa Pines Resort',
      markdown,
      year: 2024,
      openedOn: '2024-06-01',
      quote: 'Ponderosa Pines opened to guests in June 2024.',
      confidence: 'high',
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.finding.openedOn).toBeNull();
  });

  it('rejects a predecessor founding even when the property is named', () => {
    const page = 'Ponderosa Pines was founded in 1954.';
    const decision = acceptYearOpenedFinding({
      propertyName: 'Ponderosa Pines Resort',
      markdown: page,
      year: 1954,
      openedOn: null,
      quote: 'Ponderosa Pines was founded in 1954.',
      confidence: 'high',
    });
    expect(decision).toEqual({
      ok: false,
      reason: 'predecessor_founding_not_opening',
    });
  });

  it('rejects a campground opening that is not the glamping start', () => {
    const page =
      'Camp Dakota opened with the first 10 unimproved campsites in October 1998.';
    const decision = acceptYearOpenedFinding({
      propertyName: 'Camp Dakota',
      markdown: page,
      year: 1998,
      openedOn: null,
      quote: page,
      confidence: 'high',
    });
    expect(decision).toEqual({
      ok: false,
      reason: 'campground_opening_not_glamping',
    });
  });

  it('rejects a quote that is not on the page', () => {
    const decision = acceptYearOpenedFinding({
      propertyName: 'Ponderosa Pines Resort',
      markdown,
      year: 2024,
      openedOn: null,
      quote: 'Ponderosa Pines opened in 2024 after a quiet build.',
      confidence: 'high',
    });
    expect(decision).toEqual({ ok: false, reason: 'quote_not_on_page' });
  });

  it('rejects a missing quote', () => {
    const decision = acceptYearOpenedFinding({
      propertyName: 'Ponderosa Pines Resort',
      markdown,
      year: 2024,
      openedOn: null,
      quote: '',
      confidence: 'high',
    });
    expect(decision).toEqual({ ok: false, reason: 'missing_quote' });
  });
});
