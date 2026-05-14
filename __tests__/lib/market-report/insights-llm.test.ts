import { parseBullets } from '@/lib/market-report/insights-llm';

describe('parseBullets', () => {
  it('parses dashed bullets and trims surrounding whitespace', () => {
    const raw = `- First bullet text.\n- Second bullet text.\n- Third bullet text.`;
    expect(parseBullets(raw)).toEqual([
      'First bullet text.',
      'Second bullet text.',
      'Third bullet text.',
    ]);
  });

  it('handles asterisk and unicode bullet prefixes', () => {
    const raw = `* Alpha\n• Beta\n- Gamma`;
    expect(parseBullets(raw)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('drops blank lines and markdown headings', () => {
    const raw = `# Heading\n\n- Real bullet one\n\n- Real bullet two\n---\n`;
    expect(parseBullets(raw)).toEqual(['Real bullet one', 'Real bullet two']);
  });

  it('caps output at 5 bullets even if the model returns more', () => {
    const raw = Array.from({ length: 8 }, (_, i) => `- bullet ${i + 1}`).join('\n');
    const out = parseBullets(raw);
    expect(out).toHaveLength(5);
    expect(out[0]).toBe('bullet 1');
    expect(out[4]).toBe('bullet 5');
  });

  it('returns an empty array for an empty or whitespace-only response', () => {
    expect(parseBullets('')).toEqual([]);
    expect(parseBullets('   \n  \n')).toEqual([]);
  });

  it('preserves text after a bullet prefix even with multiple spaces', () => {
    expect(parseBullets('-   Spaced bullet')).toEqual(['Spaced bullet']);
  });
});
