import { consultantPillSurfaceClasses } from '@/lib/project-pipeline/consultant-pill-styles';

describe('consultantPillSurfaceClasses', () => {
  it('is stable for the same name', () => {
    expect(consultantPillSurfaceClasses('Greg')).toBe(consultantPillSurfaceClasses('Greg'));
  });

  it('treats casing and outer whitespace as the same color', () => {
    expect(consultantPillSurfaceClasses('  Greg  ')).toBe(consultantPillSurfaceClasses('greg'));
  });

  it('returns neutral for empty input', () => {
    const classes = consultantPillSurfaceClasses('');
    expect(classes).toContain('neutral-100');
    expect(classes).toContain('neutral-700');
  });

  it('uses an orange theme for Greg (override)', () => {
    expect(consultantPillSurfaceClasses('Greg')).toContain('orange-100');
    expect(consultantPillSurfaceClasses('greg')).toContain('orange-100');
    expect(consultantPillSurfaceClasses('Greg')).not.toContain('red-100');
  });

  it('uses a purple theme for Aidan (override)', () => {
    expect(consultantPillSurfaceClasses('Aidan')).toContain('purple-100');
    expect(consultantPillSurfaceClasses('aidan')).toContain('purple-100');
  });

  it('usually differs across distinct names', () => {
    const greg = consultantPillSurfaceClasses('Greg');
    const luke = consultantPillSurfaceClasses('Luke');
    expect(greg).not.toBe(luke);
  });
});
