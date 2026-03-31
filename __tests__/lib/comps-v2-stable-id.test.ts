import { stableCandidateId } from '@/lib/comps-v2/stable-id';
import { parsePropertyKinds, parseQualityTiers } from '@/lib/comps-v2/parse-body';

describe('comps-v2 stable id', () => {
  it('is deterministic for same inputs', () => {
    const a = stableCandidateId('all_glamping_properties', '12', 'Foo Resort');
    const b = stableCandidateId('all_glamping_properties', '12', 'Foo Resort');
    expect(a).toBe(b);
    expect(a.length).toBe(20);
  });

  it('differs when source changes', () => {
    const a = stableCandidateId('hipcamp', null, 'Foo');
    const b = stableCandidateId('campspot', null, 'Foo');
    expect(a).not.toBe(b);
  });
});

describe('comps-v2 parse-body', () => {
  it('parsePropertyKinds defaults to all kinds when empty', () => {
    const k = parsePropertyKinds([]);
    expect(k.length).toBe(5);
  });

  it('parseQualityTiers returns null for empty', () => {
    expect(parseQualityTiers([])).toBeNull();
  });
});
