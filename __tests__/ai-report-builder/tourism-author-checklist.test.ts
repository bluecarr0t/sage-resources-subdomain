import {
  TOURISM_FIGURE_SLOTS,
  buildTourismAuthorChecklistMarkdown,
  buildTourismSlotPlaceholderTexts,
  findTnTourismFingerprintsInText,
  resolveStateTourismSourceHints,
} from '@/lib/ai-report-builder/tourism-author-checklist';

describe('tourism-author-checklist', () => {
  it('exposes six canonical TOUR slots', () => {
    expect(TOURISM_FIGURE_SLOTS.map((s) => s.id)).toEqual([
      'TOUR-01',
      'TOUR-02',
      'TOUR-03',
      'TOUR-04',
      'TOUR-05',
      'TOUR-06',
    ]);
  });

  it('builds Ohio-specific source hints and checklist markdown', () => {
    const hints = resolveStateTourismSourceHints('OH');
    expect(hints.stateName).toBe('Ohio');
    expect(hints.agencyGuess).toMatch(/TourismOhio|Ohio/i);
    expect(hints.urls.length).toBeGreaterThan(0);

    const md = buildTourismAuthorChecklistMarkdown({
      studyId: 'DRAFT-test',
      propertyName: 'Nordic Wellness',
      city: 'Peninsula',
      state: 'OH',
      county: 'Summit County',
      companionDocxFileName: 'DRAFT-test-report.docx',
      companionXlsxFileName: 'DRAFT-test-template.xlsx',
    });
    expect(md).toContain('TOUR-01');
    expect(md).toContain('TOUR-06');
    expect(md).toContain('Peninsula');
    expect(md).toContain('TourismOhio');
    expect(md).toContain('No Tennessee');
    expect(md).toContain('Exact slots');
    expect(md).toContain('DRAFT-test-report.docx');
  });

  it('builds cyan placeholder texts referencing checklist IDs', () => {
    const notes = buildTourismSlotPlaceholderTexts('OH');
    expect(notes).toHaveLength(6);
    expect(notes[0]).toMatch(/^\[TOUR-01\]/);
    expect(notes[0]).toContain('Ohio');
    expect(notes[0]).toContain('author-checklist.md');
  });

  it('detects TN tourism fingerprints', () => {
    const hits = findTnTourismFingerprintsInText(
      'SOURCE: 2022 TN DEPARTMENT OF TOURIST DEVELOPMENT — Overnight Tennessee Visitors'
    );
    expect(hits).toEqual(
      expect.arrayContaining(['TN DEPARTMENT OF TOURIST', 'Overnight Tennessee'])
    );
  });
});
