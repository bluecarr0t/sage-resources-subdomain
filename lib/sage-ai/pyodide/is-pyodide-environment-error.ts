/**
 * True when the failure is missing/broken Pyodide in the browser — not a bug in
 * the user's Python. Auto-asking the LLM to "fix" the code would loop forever.
 */
export function isPyodideEnvironmentError(error: string): boolean {
  const e = error.toLowerCase();
  return (
    e.includes('pyodide not loaded') ||
    e.includes('failed to load pyodide') ||
    e.includes('failed to load pyodide script')
  );
}
