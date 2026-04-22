'use client';

import { useState, useCallback } from 'react';
import { SAGE_AI_CHART_COLORS } from '@/lib/sage-ai/chart-palette';
import { getPyodideCdnBase } from '@/lib/sage-ai/pyodide/pyodide-version';

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (packages: string | string[]) => Promise<void>;
  FS: {
    readFile: (path: string, options?: { encoding: string }) => string | Uint8Array;
    writeFile: (path: string, data: string | Uint8Array) => void;
    readdir: (path: string) => string[];
  };
  globals: {
    get: (name: string) => unknown;
    set: (name: string, value: unknown) => void;
  };
}

/**
 * Top-level packages allowed inside generated Python. Pre-loaded matplotlib,
 * numpy, pandas plus a handful of stdlib modules covers everything Sage AI
 * needs for visualization. Notably absent: `os`, `subprocess`, `socket`,
 * `urllib`, `requests`, `pathlib` — none should be reachable from a sandbox
 * that disclaims network and filesystem access.
 */
const PYTHON_IMPORT_ALLOWLIST = new Set<string>([
  // Pre-installed scientific stack
  'numpy',
  'np',
  'pandas',
  'pd',
  'matplotlib',
  'plt',
  // Standard library helpers used by the runtime wrapper or harmless utilities
  'io',
  'base64',
  'sys',
  'json',
  'math',
  'statistics',
  'datetime',
  're',
  'collections',
  'itertools',
  'functools',
  'typing',
  'random',
  'string',
  'decimal',
  'fractions',
]);

interface ImportCheckResult {
  allowed: boolean;
  blocked: string[];
}

/**
 * Static-scan Python source for `import x` / `from x import ...` statements.
 * Only the top-level module name is checked against the allowlist (so
 * `matplotlib.pyplot` is accepted because `matplotlib` is on the list). This
 * is intentionally conservative — anything reaching `__import__` or
 * `importlib` directly is not allowed by tooling rules and would surface as
 * a runtime ImportError if the package was never preloaded.
 *
 * Lines inside string literals or comments may produce false positives, but
 * since false positives only widen the rejection set and the allowlist
 * already covers all legitimate matplotlib/pandas use cases, that's an
 * acceptable trade-off for safety.
 */
function checkPythonImports(code: string): ImportCheckResult {
  const blocked: string[] = [];
  const seen = new Set<string>();
  // Match `import X` or `import X as Y`, optionally inside multi-import
  // (`import a, b`) and `from X import ...`. Captures the module path.
  const patterns = [
    /^[ \t]*from\s+([A-Za-z_][A-Za-z0-9_.]*)\s+import\s+/gm,
    /^[ \t]*import\s+([A-Za-z0-9_.,\s]+)$/gm,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      const raw = m[1];
      const modules = raw.includes(',') ? raw.split(',') : [raw];
      for (const mod of modules) {
        const cleaned = mod
          .trim()
          .replace(/\s+as\s+.*$/i, '')
          .split('.')[0];
        if (!cleaned) continue;
        if (PYTHON_IMPORT_ALLOWLIST.has(cleaned)) continue;
        if (!seen.has(cleaned)) {
          seen.add(cleaned);
          blocked.push(cleaned);
        }
      }
    }
  }
  return { allowed: blocked.length === 0, blocked };
}

interface LoadPyodide {
  (config?: { indexURL?: string }): Promise<PyodideInstance>;
}

declare global {
  interface Window {
    loadPyodide?: LoadPyodide;
  }
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  charts: string[];
  executionTime: number;
  /** True when the user stopped the run; not a code failure. */
  cancelled?: boolean;
}

export type PyodideRunOptions = {
  signal?: AbortSignal;
};

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

/** Rejects when `signal` is aborted; never resolves. */
function abortPromise(signal: AbortSignal | undefined): Promise<never> {
  if (!signal) {
    return new Promise(() => {});
  }
  if (signal.aborted) {
    return Promise.reject(new DOMException('aborted', 'AbortError'));
  }
  return new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
}

/**
 * Prefer self-hosted Pyodide from `/public/pyodide/` (from `scripts/ensure-pyodide.js`).
 * That folder is gitignored; if assets are missing or wasm fails to fetch, we fall
 * back to the pinned jsDelivr URL so charts still work without manual env setup.
 */
function normalizePyodideBase(base: string): string {
  return base.replace(/\/?$/, '/');
}

const PRIMARY_PYODIDE_BASE = normalizePyodideBase(
  process.env.NEXT_PUBLIC_PYODIDE_BASE ?? '/pyodide/'
);
const CDN_PYODIDE_BASE = normalizePyodideBase(getPyodideCdnBase());

function pyodideIndexUrlsToTry(): string[] {
  const urls = [PRIMARY_PYODIDE_BASE, CDN_PYODIDE_BASE];
  return urls.filter((u, i) => urls.indexOf(u) === i);
}

async function injectPyodideScript(base: string): Promise<void> {
  if (typeof window === 'undefined' || window.loadPyodide) return;

  const src = `${base}pyodide.js`;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    try {
      const resolved = new URL(src, window.location.href);
      if (resolved.origin !== window.location.origin) {
        script.crossOrigin = 'anonymous';
      }
    } catch {
      script.crossOrigin = 'anonymous';
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Pyodide script'));
    document.head.appendChild(script);
  });

  if (!window.loadPyodide) {
    throw new Error('Pyodide script loaded but loadPyodide is not defined');
  }
}

const PYTHON_EXEC_TIMEOUT_MS = 30_000;

/** One WASM runtime for the page — `usePyodide` is called per `PythonCodeBlock`, but the interpreter must be shared. */
let sharedPyodide: PyodideInstance | null = null;
let initPromise: Promise<PyodideInstance> | null = null;
/** Serializes `runPythonAsync` so concurrent blocks do not clobber the same `globals` slots. */
let runQueue: Promise<unknown> = Promise.resolve();

function enqueueRun<T>(fn: () => Promise<T>): Promise<T> {
  const out = runQueue.then(() => fn());
  runQueue = out.then(
    () => undefined,
    () => undefined
  );
  return out;
}

/**
 * Idempotent: multiple `PythonCodeBlock` components share one load, one `globals` object.
 */
async function getOrInitPyodide(): Promise<PyodideInstance> {
  if (sharedPyodide) {
    return sharedPyodide;
  }
  if (initPromise) {
    return initPromise;
  }

  const runInit = async (): Promise<PyodideInstance> => {
    const indexUrls = pyodideIndexUrlsToTry();

    if (!window.loadPyodide) {
      let lastInjectErr: Error | null = null;
      for (const base of indexUrls) {
        try {
          await injectPyodideScript(base);
          lastInjectErr = null;
          break;
        } catch (e) {
          lastInjectErr = e instanceof Error ? e : new Error(String(e));
        }
      }
      if (!window.loadPyodide) {
        throw lastInjectErr ?? new Error('Failed to load Pyodide script');
      }
    }

    let pyodide: PyodideInstance | null = null;
    let lastInitErr: Error | null = null;
    for (const indexURL of indexUrls) {
      try {
        const candidate = await window.loadPyodide!({ indexURL });
        await candidate.loadPackage(['micropip', 'numpy', 'pandas', 'matplotlib']);
        pyodide = candidate;
        break;
      } catch (e) {
        lastInitErr = e instanceof Error ? e : new Error(String(e));
      }
    }
    if (!pyodide) {
      throw lastInitErr ?? new Error('Failed to initialize Pyodide');
    }

    const earthyPy = SAGE_AI_CHART_COLORS.map((c) => `'${c}'`).join(', ');
    await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
import sys
from io import StringIO
from cycler import cycler

_SAGE_AI_COLORS = [${earthyPy}]
plt.rcParams['axes.prop_cycle'] = cycler(color=_SAGE_AI_COLORS)
plt.rcParams['text.color'] = '#334033'
plt.rcParams['axes.labelcolor'] = '#3d503d'
plt.rcParams['xtick.color'] = '#4a4a45'
plt.rcParams['ytick.color'] = '#4a4a45'
plt.rcParams['grid.color'] = '#e0dbd2'
plt.rcParams['grid.alpha'] = 0.8
plt.rcParams['axes.edgecolor'] = '#c7d2c7'
plt.rcParams['figure.facecolor'] = 'white'
plt.rcParams['axes.facecolor'] = '#faf9f6'

def _capture_output():
    return StringIO()

def _get_output(buffer):
    return buffer.getvalue()

def _save_figure_base64():
    figures = []
    for fig_num in plt.get_fignums():
        fig = plt.figure(fig_num)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        buf.seek(0)
        figures.append(base64.b64encode(buf.read()).decode('utf-8'))
        plt.close(fig)
    return figures
`);

    sharedPyodide = pyodide;
    return pyodide;
  };

  initPromise = runInit().catch((err) => {
    initPromise = null;
    sharedPyodide = null;
    throw err;
  });

  const py = await initPromise;
  return py;
}

export function usePyodide() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPyodide = useCallback(async (options?: PyodideRunOptions) => {
    const { signal } = options ?? {};
    setIsLoading(true);
    setLoadError(null);
    try {
      await Promise.race([getOrInitPyodide(), abortPromise(signal)]);
      setIsReady(true);
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'Failed to load Pyodide');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runCode = useCallback(
    async (code: string, options?: PyodideRunOptions): Promise<ExecutionResult> => {
      const { signal } = options ?? {};
      const startTime = performance.now();

      if (signal?.aborted) {
        return {
          success: false,
          output: '',
          charts: [],
          executionTime: 0,
          cancelled: true,
        };
      }

      let pyodide: PyodideInstance;
      try {
        pyodide = await Promise.race([getOrInitPyodide(), abortPromise(signal)]);
      } catch (err) {
        if (isAbortError(err)) {
          return {
            success: false,
            output: '',
            charts: [],
            executionTime: performance.now() - startTime,
            cancelled: true,
          };
        }
        return {
          success: false,
          output: '',
          error: err instanceof Error ? err.message : 'Failed to load Pyodide',
          charts: [],
          executionTime: performance.now() - startTime,
        };
      }

      const importCheck = checkPythonImports(code);
      if (!importCheck.allowed) {
        return {
          success: false,
          output: '',
          error: `Disallowed Python imports: ${importCheck.blocked.join(', ')}. Only ${[
            ...PYTHON_IMPORT_ALLOWLIST,
          ]
            .filter((m) => !['np', 'pd', 'plt'].includes(m))
            .join(', ')} are available.`,
          charts: [],
          executionTime: performance.now() - startTime,
        };
      }

      const wrappedCode = `
_output_buffer = _capture_output()
_old_stdout = sys.stdout
sys.stdout = _output_buffer

try:
${code.split('\n').map((line) => '    ' + line).join('\n')}
finally:
    sys.stdout = _old_stdout

_result_output = _get_output(_output_buffer)
_result_charts = _save_figure_base64()
`;

      return enqueueRun(async () => {
        const t0 = performance.now();
        if (signal?.aborted) {
          return {
            success: false,
            output: '',
            charts: [],
            executionTime: 0,
            cancelled: true,
          };
        }
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Python execution timed out after ${PYTHON_EXEC_TIMEOUT_MS / 1000}s. The code may contain an infinite loop or be too computationally expensive.`
                  )
                ),
              PYTHON_EXEC_TIMEOUT_MS
            );
          });

          await Promise.race([
            pyodide.runPythonAsync(wrappedCode),
            timeoutPromise,
            abortPromise(signal),
          ]);

          const output = pyodide.globals.get('_result_output') as string;
          const charts = pyodide.globals.get('_result_charts') as string[];
          const executionTime = performance.now() - t0;

          return {
            success: true,
            output: output || '',
            charts: charts || [],
            executionTime,
          };
        } catch (err) {
          const executionTime = performance.now() - t0;
          if (isAbortError(err)) {
            return {
              success: false,
              output: '',
              charts: [],
              executionTime,
              cancelled: true,
            };
          }
          return {
            success: false,
            output: '',
            error: err instanceof Error ? err.message : String(err),
            charts: [],
            executionTime,
          };
        }
      });
    },
    []
  );

  const setGlobal = useCallback((name: string, value: unknown) => {
    sharedPyodide?.globals.set(name, value);
  }, []);

  return {
    isLoading,
    isReady,
    loadError,
    loadPyodide,
    runCode,
    setGlobal,
  };
}
