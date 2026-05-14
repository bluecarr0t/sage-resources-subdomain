import { unitTypePillSurfaceClasses } from '@/lib/market-report/unit-type-pill-styles';

describe('unitTypePillSurfaceClasses', () => {
  it('is stable for the same key', () => {
    expect(unitTypePillSurfaceClasses('rv_site')).toBe(unitTypePillSurfaceClasses('rv_site'));
  });

  it('treats casing and outer whitespace as the same color', () => {
    expect(unitTypePillSurfaceClasses('  RV_SITE  ')).toBe(unitTypePillSurfaceClasses('rv_site'));
  });

  it('returns neutral for empty input', () => {
    const c = unitTypePillSurfaceClasses('');
    expect(c).toContain('neutral-200');
    expect(c).toContain('neutral-50');
  });

  it('uses a dedicated indigo theme for cabin (override)', () => {
    expect(unitTypePillSurfaceClasses('Cabin')).toContain('indigo-300');
    expect(unitTypePillSurfaceClasses('cabins')).toContain('indigo-300');
  });

  it('uses distinct fixed themes for yurt vs treehouse', () => {
    const yurt = unitTypePillSurfaceClasses('Yurt');
    const tree = unitTypePillSurfaceClasses('treehouse');
    expect(yurt).toContain('cyan-300');
    expect(tree).toContain('amber-300');
    expect(yurt).not.toBe(tree);
  });

  it('usually differs across distinct types', () => {
    const a = unitTypePillSurfaceClasses('cabin');
    const b = unitTypePillSurfaceClasses('yurt');
    expect(a).not.toBe(b);
  });
});
