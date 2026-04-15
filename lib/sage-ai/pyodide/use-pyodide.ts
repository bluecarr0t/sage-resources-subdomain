'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackagesFromImports: (code: string) => Promise<void>;
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
}

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const PYTHON_EXEC_TIMEOUT_MS = 30_000;

export function usePyodide() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pyodideRef = useRef<PyodideInstance | null>(null);
  const loadingRef = useRef(false);

  const loadPyodide = useCallback(async () => {
    if (pyodideRef.current || loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);
    setLoadError(null);

    try {
      if (!window.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `${PYODIDE_CDN}pyodide.js`;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Pyodide script'));
          document.head.appendChild(script);
        });
      }

      const pyodide = await window.loadPyodide!({
        indexURL: PYODIDE_CDN,
      });

      // Load micropip first, then use it to install other packages
      await pyodide.loadPackage('micropip');
      await pyodide.runPythonAsync(`
import micropip
await micropip.install(['matplotlib', 'numpy', 'pandas'])
`);

      await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
import sys
from io import StringIO

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

      pyodideRef.current = pyodide;
      setIsReady(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load Pyodide');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const runCode = useCallback(async (code: string): Promise<ExecutionResult> => {
    if (!pyodideRef.current) {
      return {
        success: false,
        output: '',
        error: 'Pyodide not loaded',
        charts: [],
        executionTime: 0,
      };
    }

    const startTime = performance.now();
    const pyodide = pyodideRef.current;

    try {
      await pyodide.loadPackagesFromImports(code);

      const wrappedCode = `
_output_buffer = _capture_output()
_old_stdout = sys.stdout
sys.stdout = _output_buffer

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
finally:
    sys.stdout = _old_stdout

_result_output = _get_output(_output_buffer)
_result_charts = _save_figure_base64()
`;

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Python execution timed out after ${PYTHON_EXEC_TIMEOUT_MS / 1000}s. The code may contain an infinite loop or be too computationally expensive.`)),
          PYTHON_EXEC_TIMEOUT_MS
        );
      });

      await Promise.race([pyodide.runPythonAsync(wrappedCode), timeoutPromise]);

      const output = pyodide.globals.get('_result_output') as string;
      const charts = pyodide.globals.get('_result_charts') as string[];

      const executionTime = performance.now() - startTime;

      return {
        success: true,
        output: output || '',
        charts: charts || [],
        executionTime,
      };
    } catch (err) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        charts: [],
        executionTime,
      };
    }
  }, []);

  useEffect(() => {
    return () => {
      pyodideRef.current = null;
    };
  }, []);

  const setGlobal = useCallback((name: string, value: unknown) => {
    pyodideRef.current?.globals.set(name, value);
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
