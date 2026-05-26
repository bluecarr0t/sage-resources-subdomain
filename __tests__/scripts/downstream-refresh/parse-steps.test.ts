/**
 * Mirrors CLI step parsing in run-downstream-refresh.ts
 */
type DownstreamStep = 'unified_comps' | 'facets_cache' | 'rv_overview';

function parseSteps(argv: string[]): DownstreamStep[] {
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const defaultSteps: DownstreamStep[] = ['unified_comps', 'facets_cache', 'rv_overview'];

  let steps = [...defaultSteps];
  if (argv.includes('--skip-unified-comps')) {
    steps = steps.filter((s) => s !== 'unified_comps');
  }
  if (argv.includes('--skip-facets-cache')) {
    steps = steps.filter((s) => s !== 'facets_cache');
  }
  if (argv.includes('--skip-rv-overview')) {
    steps = steps.filter((s) => s !== 'rv_overview');
  }

  if (onlyArg) {
    const raw = onlyArg
      .slice(7)
      .split(',')
      .map((s) => s.trim()) as DownstreamStep[];
    const valid: DownstreamStep[] = [];
    for (const s of raw) {
      if (s === 'unified_comps' || s === 'facets_cache' || s === 'rv_overview') {
        valid.push(s);
      }
    }
    if (valid.length === 0) {
      throw new Error('--only must list unified_comps, facets_cache, and/or rv_overview');
    }
    steps = valid;
  }

  if (steps.length === 0) {
    throw new Error('No downstream steps selected');
  }
  return steps;
}

describe('downstream refresh CLI steps', () => {
  it('defaults to all steps', () => {
    expect(parseSteps([])).toEqual(['unified_comps', 'facets_cache', 'rv_overview']);
  });

  it('honors --only', () => {
    expect(parseSteps(['--only=unified_comps,rv_overview'])).toEqual([
      'unified_comps',
      'rv_overview',
    ]);
  });

  it('honors skip flags', () => {
    expect(parseSteps(['--skip-rv-overview'])).toEqual(['unified_comps', 'facets_cache']);
  });
});
