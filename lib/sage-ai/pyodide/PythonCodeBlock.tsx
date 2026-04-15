'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw, Copy, Check, Download, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { usePyodide, type ExecutionResult } from './use-pyodide';

interface PythonCodeBlockProps {
  code: string;
  onDataInject?: () => Record<string, unknown>[] | null;
  autoRun?: boolean;
  onError?: (error: string, code: string) => void;
  retryCount?: number;
}

export function PythonCodeBlock({ code, onDataInject, autoRun = true, onError, retryCount = 0 }: PythonCodeBlockProps) {
  const { isLoading, isReady, loadError, loadPyodide, runCode, setGlobal } = usePyodide();
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isRequestingFix, setIsRequestingFix] = useState(false);
  const hasStartedRef = useRef(false);
  const errorReportedRef = useRef(false);

  useEffect(() => {
    setIsRequestingFix(false);
    errorReportedRef.current = false;
  }, [code]);

  const handleRun = useCallback(async () => {
    if (isRunning) return;

    if (!isReady && !isLoading) {
      await loadPyodide();
    }

    setIsRunning(true);
    setResult(null);
    setIsRequestingFix(false);
    errorReportedRef.current = false;

    try {
      let finalCode = code;

      if (onDataInject) {
        const data = onDataInject();
        if (data) {
          setGlobal('_injected_data_json', JSON.stringify(data));
          finalCode = `import json\ndata = json.loads(_injected_data_json)\n\n${code}`;
        }
      }

      const execResult = await runCode(finalCode);
      setResult(execResult);

      if (execResult.error && onError && !errorReportedRef.current && retryCount < 2) {
        errorReportedRef.current = true;
        setIsRequestingFix(true);
        onError(execResult.error, code);
      }
    } finally {
      setIsRunning(false);
    }
  }, [code, isReady, isLoading, loadPyodide, runCode, onDataInject, isRunning, onError, retryCount, setGlobal]);

  useEffect(() => {
    if (autoRun && !hasStartedRef.current) {
      hasStartedRef.current = true;
      void handleRun();
    }
  }, [autoRun, handleRun]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleDownloadChart = useCallback((base64: string, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = `chart-${index + 1}.png`;
    link.click();
  }, []);

  return (
    <div className="my-3 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
      {/* Loading State */}
      {(isLoading || isRunning) && !result && (
        <div className="px-4 py-8 flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-sm">
            {isLoading ? 'Loading Python runtime...' : 'Generating visualization...'}
          </span>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load Python runtime: {loadError}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Charts - Show prominently at the top */}
          {result.charts.length > 0 && (
            <div className="p-4 space-y-4">
              {result.charts.map((chart, index) => (
                <div key={index} className="relative group">
                  <img
                    src={`data:image/png;base64,${chart}`}
                    alt={`Chart ${index + 1}`}
                    className="w-full rounded-lg"
                  />
                  <button
                    onClick={() => handleDownloadChart(chart, index)}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text Output */}
          {result.output && (
            <div className={`px-4 py-3 ${result.charts.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {result.output}
              </pre>
            </div>
          )}

          {/* Error Output */}
          {result.error && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20">
              <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono">
                {result.error}
              </pre>
              {isRequestingFix && (
                <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing error and generating fix...</span>
                </div>
              )}
            </div>
          )}

          {/* Footer with code toggle and actions */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {showCode ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              {showCode ? 'Hide code' : 'Show code'}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {result.success ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Completed in {(result.executionTime / 1000).toFixed(2)}s</span>
                ) : (
                  <span className="text-red-500">Failed</span>
                )}
              </span>
              <button
                onClick={() => void handleRun()}
                disabled={isRunning}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                Rerun
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Collapsible Code */}
          {showCode && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              <pre className="p-4 bg-gray-50 dark:bg-gray-950 overflow-x-auto text-sm">
                <code className="text-gray-700 dark:text-gray-300 font-mono">{code}</code>
              </pre>
            </div>
          )}
        </>
      )}

      {/* No results yet and not loading */}
      {!result && !isLoading && !isRunning && !loadError && (
        <div className="px-4 py-4">
          <pre className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg overflow-x-auto text-sm mb-3">
            <code className="text-gray-700 dark:text-gray-300 font-mono">{code}</code>
          </pre>
          <button
            onClick={() => void handleRun()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors"
          >
            <Loader2 className="w-4 h-4" />
            Run Code
          </button>
        </div>
      )}
    </div>
  );
}
