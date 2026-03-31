import { resolveCompsV2EnrichCorrelationId } from '@/lib/comps-v2/resolve-enrich-correlation-id';

describe('resolveCompsV2EnrichCorrelationId', () => {
  it('prefers body over header', () => {
    expect(
      resolveCompsV2EnrichCorrelationId('hdr-1', 'body-2')
    ).toEqual({ correlationId: 'body-2', source: 'body' });
  });

  it('uses header when body empty', () => {
    expect(resolveCompsV2EnrichCorrelationId('  run-abc  ', '')).toEqual({
      correlationId: 'run-abc',
      source: 'header',
    });
  });

  it('returns undefined when neither set', () => {
    expect(resolveCompsV2EnrichCorrelationId(null, undefined)).toEqual({
      correlationId: undefined,
      source: null,
    });
  });
});
