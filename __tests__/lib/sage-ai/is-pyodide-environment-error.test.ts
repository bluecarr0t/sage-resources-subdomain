import { isPyodideEnvironmentError } from '@/lib/sage-ai/pyodide/is-pyodide-environment-error';

describe('isPyodideEnvironmentError', () => {
  it('detects load/runtime messages that should not trigger LLM auto-fix', () => {
    expect(isPyodideEnvironmentError('Pyodide not loaded')).toBe(true);
    expect(isPyodideEnvironmentError('Failed to load Pyodide script')).toBe(true);
    expect(isPyodideEnvironmentError('failed to load pyodide')).toBe(true);
  });

  it('returns false for ordinary Python exceptions', () => {
    expect(isPyodideEnvironmentError('NameError: name x is not defined')).toBe(false);
    expect(isPyodideEnvironmentError('KeyError: quantity_of_units')).toBe(false);
  });
});
