import { isDeepEnrichMapsUrl } from '@/components/CompsV2DeepEnrichRichText';

describe('isDeepEnrichMapsUrl', () => {
  it('treats maps.google.com with cid as Maps', () => {
    expect(
      isDeepEnrichMapsUrl('https://maps.google.com/?cid=16342717605719215261&g_mp=test')
    ).toBe(true);
  });

  it('treats property sites as non-Maps', () => {
    expect(isDeepEnrichMapsUrl('https://losthorizontx.com/')).toBe(false);
    expect(isDeepEnrichMapsUrl('http://liveoaklake.com/')).toBe(false);
  });
});
