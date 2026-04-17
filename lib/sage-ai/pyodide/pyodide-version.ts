/**
 * Pinned Pyodide release. Keep in sync with `PYODIDE_VERSION` in
 * `scripts/ensure-pyodide.js` when upgrading.
 */
export const PYODIDE_VERSION = '0.26.4';

export function getPyodideCdnBase(): string {
  return `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
}
