import {
  chainLabelFromPropertyName,
  SAGE_CHAIN_LABEL_PREFIXES,
} from '@/lib/brand-chain-label';

describe('chainLabelFromPropertyName', () => {
  it('maps Bliss Camps long name to bliss camps (legacy_chain_key)', () => {
    expect(chainLabelFromPropertyName('Bliss Camps Glamping (Rocky Mountain Glamping)')).toBe(
      'bliss camps'
    );
  });

  it('maps Westgate full name to westgate river ranch', () => {
    expect(chainLabelFromPropertyName('Westgate River Ranch Resort & Rodeo')).toBe(
      'westgate river ranch'
    );
  });

  it('maps Timberline at-sites to timberline glamping at', () => {
    expect(chainLabelFromPropertyName('Timberline Glamping at Birmingham')).toBe(
      'timberline glamping at'
    );
  });

  it('keeps ulum before under canvas', () => {
    const ulumIdx = SAGE_CHAIN_LABEL_PREFIXES.indexOf('ulum');
    const ucIdx = SAGE_CHAIN_LABEL_PREFIXES.indexOf('under canvas');
    expect(ulumIdx).toBeGreaterThan(-1);
    expect(ucIdx).toBeGreaterThan(-1);
    expect(ulumIdx).toBeLessThan(ucIdx);
    expect(chainLabelFromPropertyName('ULUM Moab')).toBe('ulum');
  });
});
